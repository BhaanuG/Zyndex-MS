import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { motion } from 'motion/react';
import { 
  FileText, 
  AlertCircle, 
  ArrowLeft, 
  Clock, 
  Download, 
  Printer, 
  ShieldCheck, 
  Lock,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import subscriptionService from '@/services/api/subscriptionService';
import { 
  generateSingleInvoiceHtml, 
  openPrintableDocument, 
  downloadDocumentAsHtml 
} from '@/utils/invoiceGenerator';

export default function InvoiceViewPage() {
  const { paymentId } = useParams();
  const { user, authReady, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(60); // 60 seconds redirect countdown if unauthorized
  const [unauthorized, setUnauthorized] = useState(false);

  // Check login authentication
  useEffect(() => {
    if (!authReady) return;

    // Check if user is logged in on this browser
    const token = localStorage.getItem('auth_token');
    if (!token || !isAuthenticated || !user) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }

    // Fetch payment and invoice details
    const loadInvoice = async () => {
      try {
        setLoading(true);
        const res = await subscriptionService.getPaymentStatus(paymentId);
        if (!res) {
          throw new Error('Invoice record not found.');
        }
        setInvoice(res);
      } catch (err) {
        setInvoice(null);
      } finally {
        setLoading(false);
      }
    };

    if (paymentId) {
      loadInvoice();
    }
  }, [paymentId, authReady, isAuthenticated, user]);

  // 60 seconds countdown to redirect to login if not logged in on this browser
  useEffect(() => {
    if (!unauthorized) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/Zyndex/User/Log-In', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [unauthorized, navigate]);

  // Render 404 / Unauthorized Not Found Screen if not logged in on this browser
  if (unauthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:32px_32px]" />
        <div className="absolute size-96 rounded-full bg-red-600/10 blur-3xl -top-20 -left-20 pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl text-center space-y-6"
        >
          <div className="size-20 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="size-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-400">
              404 • Resource Not Found / Unauthorized Access
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Tax Invoice Not Found
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Invoices are strictly protected and can only be accessed by the authenticated account holder on their active browser session.
            </p>
          </div>

          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-orange-400 animate-pulse" />
              <span>Redirecting to Login portal in:</span>
            </div>
            <span className="font-mono text-base font-bold text-orange-400">
              {countdown}s
            </span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate('/Zyndex/User/Log-In', { replace: true })}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to Login Immediately</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Verifying authorized access and loading invoice...</p>
      </div>
    );
  }

  // Invoice Data Formatting
  const id = invoice?.paymentId || paymentId || 'PAY_SAMPLE';
  const orderId = invoice?.orderId || 'ORD_SAMPLE';
  const date = invoice?.paidAt || invoice?.createdAt || new Date().toLocaleString();
  const planName = invoice?.planId ? invoice.planId.replace(/_/g, ' ') : 'Student Plus';
  const amount = (invoice?.amountRupees || (invoice?.amount ? (invoice.amount / 100) : 199)).toFixed(2);
  const customerName = user?.name || 'Valued Scholar';
  const customerEmail = user?.email || 'user@zyndex.com';
  const paymentMethod = invoice?.paymentMethod || 'UPI Direct';
  const status = invoice?.status || 'SUCCESS';
  const invoiceNumber = `INV-${new Date().getFullYear()}-${id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;

  const numAmount = parseFloat(amount) || 0;
  const baseAmount = (numAmount / 1.18).toFixed(2);
  const gstAmount = (numAmount - parseFloat(baseAmount)).toFixed(2);
  const cgstAmount = (parseFloat(gstAmount) / 2).toFixed(2);
  const sgstAmount = (parseFloat(gstAmount) / 2).toFixed(2);

  const handlePrint = () => {
    const html = generateSingleInvoiceHtml({
      id,
      orderId,
      date,
      planName,
      amount,
      customerName,
      customerEmail,
      paymentMethod,
      status
    });
    openPrintableDocument(html, invoiceNumber);
  };

  const handleDownload = () => {
    const html = generateSingleInvoiceHtml({
      id,
      orderId,
      date,
      planName,
      amount,
      customerName,
      customerEmail,
      paymentMethod,
      status
    });
    downloadDocumentAsHtml(html, `zyndex-invoice-${invoiceNumber}.html`);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200">
          <Link
            to={`/Zyndex/User/${encodeURIComponent(user?.name ? user.name.replace(/\s+/g, '-') : 'Scholar')}/${encodeURIComponent(user?.email || '')}/Profile/Billing`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Profile & Billing</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200 cursor-pointer"
            >
              <Printer className="size-4" />
              <span>Print Invoice</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 transition-all cursor-pointer"
            >
              <Download className="size-4" />
              <span>Download HTML</span>
            </button>
          </div>
        </div>

        {/* Invoice Paper Document */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-slate-200 gap-6">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                Z
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Zyndex</h2>
                <p className="text-xs text-slate-500 font-semibold">ScholarSphere Digital Library Network</p>
              </div>
            </div>

            <div className="text-left md:text-right space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 block">Original Tax Invoice</span>
              <p className="font-mono text-sm font-bold text-slate-900">{invoiceNumber}</p>
              <p className="text-xs text-slate-500">Date: {new Date(date).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Customer & Billing Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            <div className="space-y-1.5 p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-2">Billed To (Customer)</span>
              <p className="text-sm font-bold text-slate-900">{customerName}</p>
              <p className="text-slate-600">{customerEmail}</p>
              <p className="text-slate-500 font-mono">Customer ID: {user?.id || 'AUTH-VERIFIED'}</p>
            </div>

            <div className="space-y-1.5 p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-2">Transaction Particulars</span>
              <p><span className="font-semibold text-slate-500">Payment ID:</span> <span className="font-mono font-bold text-slate-900">{id}</span></p>
              <p><span className="font-semibold text-slate-500">Order ID:</span> <span className="font-mono text-slate-700">{orderId}</span></p>
              <p><span className="font-semibold text-slate-500">Payment Method:</span> <span className="font-bold text-slate-800">{paymentMethod}</span></p>
              <p><span className="font-semibold text-slate-500">Payment Status:</span> <span className="font-bold text-emerald-700">{status}</span></p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Item & Description</th>
                  <th className="py-3 px-4 text-center">HSN / SAC</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Taxable Value</th>
                  <th className="py-3 px-4 text-right">GST (18%)</th>
                  <th className="py-3 px-4 text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr>
                  <td className="py-4 px-4">
                    <p className="font-bold text-sm text-slate-900">{planName} Membership</p>
                    <p className="text-slate-500 mt-0.5">Full academic digital repository & verified access entitlement</p>
                  </td>
                  <td className="py-4 px-4 text-center font-mono">998431</td>
                  <td className="py-4 px-4 text-center font-bold">1</td>
                  <td className="py-4 px-4 text-right font-mono">₹{baseAmount}</td>
                  <td className="py-4 px-4 text-right font-mono">₹{gstAmount}</td>
                  <td className="py-4 px-4 text-right font-bold font-mono text-sm">₹{amount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Calculation Summary */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 pt-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl max-w-sm text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Digitally Verified & Authenticated</span>
              </div>
              <p className="text-emerald-700 leading-relaxed">
                This document is an electronically generated and digitally validated tax invoice. No signature is required.
              </p>
            </div>

            <div className="w-full md:w-72 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Taxable Amount</span>
                <span className="font-mono font-semibold">₹{baseAmount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>CGST (9%)</span>
                <span className="font-mono">₹{cgstAmount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>SGST (9%)</span>
                <span className="font-mono">₹{sgstAmount}</span>
              </div>
              <div className="flex justify-between py-2 text-base font-extrabold text-slate-900 border-t-2 border-slate-900">
                <span>Total Amount Paid</span>
                <span className="font-mono text-orange-600">₹{amount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
