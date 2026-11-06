import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Printer, 
  ShieldCheck, 
  FileText,
  BookOpen
} from 'lucide-react';
import { 
  generateSingleInvoiceHtml, 
  openPrintableDocument, 
  downloadDocumentAsHtml 
} from '@/utils/invoiceGenerator';

export default function InvoiceModal({ isOpen, onClose, invoiceData }) {
  if (!isOpen || !invoiceData) return null;

  const {
    id = invoiceData.paymentId || 'PAY_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    orderId = invoiceData.orderId || 'ORD_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    date = invoiceData.date || new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    planName = invoiceData.planName || invoiceData.plan_name || 'Student Plus',
    amount = invoiceData.amount || (invoiceData.amount_paise ? (invoiceData.amount_paise / 100).toFixed(2) : '199.00'),
    customerName = invoiceData.customerName || invoiceData.userName || 'Valued Scholar',
    customerEmail = invoiceData.customerEmail || invoiceData.userEmail || 'subscriber@scholarsphere.com',
    paymentMethod = invoiceData.paymentMethod || invoiceData.paymentMethodName || 'UPI / Instant Gateway',
    status = invoiceData.status || 'PAID',
  } = invoiceData;

  const numAmount = parseFloat(amount) || 0;
  const baseAmount = (numAmount / 1.18).toFixed(2);
  const gstAmount = (numAmount - parseFloat(baseAmount)).toFixed(2);
  const cgstAmount = (parseFloat(gstAmount) / 2).toFixed(2);
  const sgstAmount = (parseFloat(gstAmount) / 2).toFixed(2);
  const invoiceNumber = `INV-${new Date().getFullYear()}-${id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;

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
    // Open in clean print dialog to save as PDF or download file
    openPrintableDocument(html, invoiceNumber);
  };

  const handleDownloadFile = () => {
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
    downloadDocumentAsHtml(html, `${invoiceNumber}.html`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden z-10 border border-slate-200 my-8"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action Bar */}
          <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-orange-400" />
              <span className="font-bold text-sm">Tax Invoice Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Print Clean PDF"
              >
                <Printer className="size-3.5" /> Print / Save PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadFile}
                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                title="Download Clean HTML File"
              >
                <Download className="size-3.5" /> Download File
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors ml-2"
                title="Close"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Clean Invoice UI Display */}
          <div className="p-8 sm:p-10 space-y-8 bg-white text-slate-900 max-h-[75vh] overflow-y-auto">
            
            {/* Top Brand & Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-8">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="text-orange-600">
                    <BookOpen className="size-8 stroke-[2.5]" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">ZYNDEX</h1>
                    <p className="text-[9px] text-orange-600 font-extrabold uppercase tracking-wider mt-1">A SCHOLARSPHERE DIGITAL COMPANY</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 max-w-xs mt-3 leading-relaxed">
                  ScholarSphere Digital Private Limited<br />
                  Knowledge & Research Tech Park, Block B<br />
                  Hyderabad, Telangana 500081, India<br />
                  <span className="font-semibold text-slate-700">GSTIN:</span> 36AAACS1234F1Z5
                </p>
              </div>

              <div className="text-right space-y-1">
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-extrabold uppercase tracking-wider">
                  {status === 'SUCCESS' || status === 'PAID' ? 'PAID / TAX INVOICE' : status}
                </span>
                <p className="text-xs text-slate-400 font-mono mt-2">Invoice No:</p>
                <p className="text-sm font-black text-slate-800 font-mono">{invoiceNumber}</p>
                <p className="text-xs text-slate-500 font-medium">Date: {date}</p>
              </div>
            </div>

            {/* Bill To & Payment Info */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1.5">Billed To</span>
                <p className="font-bold text-slate-900 text-sm">{customerName}</p>
                <p className="text-slate-600 mt-0.5">{customerEmail}</p>
                <p className="text-slate-500 mt-0.5">India (Domestic Digital Services)</p>
              </div>
              <div className="border-l border-slate-200 pl-6 space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1.5">Payment Details</span>
                <p className="text-slate-600"><span className="font-semibold text-slate-700">Method:</span> {paymentMethod}</p>
                <p className="text-slate-600 font-mono text-[11px]"><span className="font-semibold font-sans text-slate-700">Ref ID:</span> {id}</p>
                <p className="text-slate-600 font-mono text-[11px]"><span className="font-semibold font-sans text-slate-700">Order ID:</span> {orderId}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-2">Description / Subscription Plan</th>
                    <th className="py-3 px-2 text-center">SAC Code</th>
                    <th className="py-3 px-2 text-center">Period</th>
                    <th className="py-3 px-2 text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-4 px-2">
                      <p className="font-bold text-slate-900 text-sm">{planName} Digital Subscription</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Unlimited digital library access, academic research documents, & PDF reading</p>
                    </td>
                    <td className="py-4 px-2 text-center text-slate-600 font-mono">998431</td>
                    <td className="py-4 px-2 text-center text-slate-600 font-medium">30 Days</td>
                    <td className="py-4 px-2 text-right font-bold text-slate-800">₹{baseAmount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tax & Total Calculation */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Base Value</span>
                  <span className="font-mono">₹{baseAmount}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (9%)</span>
                  <span className="font-mono">₹{cgstAmount}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (9%)</span>
                  <span className="font-mono">₹{sgstAmount}</span>
                </div>
                <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-sm font-extrabold text-slate-900">
                  <span>Total Paid</span>
                  <span className="text-orange-600 font-black text-base font-mono">₹{numAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Seal & Verification Footer */}
            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 justify-center sm:justify-start">
                  <ShieldCheck className="size-4 text-emerald-600" /> Digitally Generated & Verified Invoice
                </p>
                <p className="text-[10px] text-slate-400">
                  This is a computer-generated tax invoice and requires no physical signature.
                </p>
              </div>
              <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-center">
                <span className="text-[10px] font-extrabold text-orange-700 uppercase tracking-widest block">Zyndex Digital Auth</span>
                <span className="text-[9px] font-mono text-slate-500">AUTH-STAMP-{new Date().getFullYear()}</span>
              </div>
            </div>

          </div>

          {/* Bottom Footer Action Bar */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Need billing support? Email billing@scholarsphere.com</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Printer className="size-3.5" /> Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
