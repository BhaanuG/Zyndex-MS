import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  Receipt,
  Building2,
  Calendar,
  CreditCard,
  BookOpen
} from 'lucide-react';
import { 
  generateTotalStatementHtml, 
  openPrintableDocument, 
  downloadDocumentAsHtml 
} from '@/utils/invoiceGenerator';

export default function StatementModal({ isOpen, onClose, userData, payments = [], activeSub = null }) {
  if (!isOpen) return null;

  const successfulPayments = payments.filter(p => p.status === 'SUCCESS');
  const totalPaidRupees = successfulPayments.reduce((sum, p) => sum + ((p.amount_paise || p.amountPaise || 0) / 100), 0);
  const statementId = `STMT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const handlePrint = () => {
    const html = generateTotalStatementHtml(userData, payments, activeSub);
    openPrintableDocument(html, `Zyndex-Statement-${statementId}`);
  };

  const handleDownloadHtml = () => {
    const html = generateTotalStatementHtml(userData, payments, activeSub);
    downloadDocumentAsHtml(html, `Zyndex-Statement-${statementId}.html`);
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
          className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden z-10 border border-slate-200 my-8"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action Bar */}
          <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Receipt className="size-5 text-blue-400" />
              <span className="font-bold text-sm">Consolidated Billing & Payments Statement</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Print Statement PDF"
              >
                <Printer className="size-3.5" /> Print / Save PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                title="Download Statement Document"
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

          {/* Statement UI Body */}
          <div className="p-8 sm:p-10 space-y-6 bg-white text-slate-900 max-h-[75vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="text-orange-600">
                    <BookOpen className="size-7 stroke-[2.5]" />
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">ZYNDEX</h1>
                    <p className="text-[9px] text-orange-600 font-extrabold uppercase tracking-wider mt-1">A SCHOLARSPHERE DIGITAL COMPANY</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">ScholarSphere Digital Private Limited • GSTIN: 36AAACS1234F1Z5</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold uppercase tracking-wider">
                  Consolidated Statement
                </span>
                <p className="text-xs text-slate-400 font-mono mt-1.5">Issued: {new Date().toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Account & Plan Summary */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Payments Paid</span>
                <p className="text-2xl font-black text-orange-600 mt-1">₹{totalPaidRupees.toFixed(2)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{successfulPayments.length} Completed Invoices</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Account Holder</span>
                <p className="text-sm font-bold text-slate-800 mt-1 truncate">{userData?.name || 'Scholar User'}</p>
                <p className="text-xs text-slate-500 truncate">{userData?.email}</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Active Entitlement</span>
                <p className="text-sm font-bold text-emerald-700 mt-1">{activeSub?.planName || activeSub?.plan_name || 'Active'}</p>
                <p className="text-xs text-slate-500">Auto-Renewal: {activeSub?.status === 'ACTIVE' ? 'Enabled' : 'Off'}</p>
              </div>
            </div>

            {/* Transaction Log Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">All Recorded Transactions</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-slate-500 uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Transaction ID</th>
                      <th className="py-2.5 px-3">Plan Tier</th>
                      <th className="py-2.5 px-3">Payment Method</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-slate-500">{new Date(p.created_at || p.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-800">{p.gateway_payment_id || p.id}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{p.plan_id ? p.plan_id.replace(/_/g, ' ') : 'Student Plus'}</td>
                        <td className="py-3 px-3 text-slate-600">{p.payment_method || 'UPI / Gateway'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            p.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            p.status === 'FAILED' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          ₹{((p.amount_paise || 0) / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Zyndex Official Customer Billing Division</span>
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
