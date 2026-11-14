import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, Search, Download, CheckCircle2, XCircle, Clock, 
  AlertTriangle, Filter, RefreshCw, Check, X, ShieldAlert, 
  FileSpreadsheet, ArrowUpDown, ChevronDown, User, Calendar, 
  Hash, DollarSign, Layers, ExternalLink, HelpCircle, Eye
} from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import { useAuth } from '@/app/context/AuthContext';
import subscriptionService from '@/services/api/subscriptionService';
import logService from '@/services/api/logService';

export default function AdminPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [alert, setAlert] = useState(null); // { message, type: 'success' | 'error' }

  // Modal for Confirm / Decline
  const [activeModal, setActiveModal] = useState(null); // { payment, action: 'CONFIRM' | 'DECLINE' }
  const [adminUtr, setAdminUtr] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchPayments = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await subscriptionService.getAdminPayments();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!isBackground) {
        console.error('Failed to load admin payments:', err);
        setAlert({
          message: err.message || 'Unable to load payment history. Make sure you are logged in as admin.',
          type: 'error'
        });
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // Live auto-polling every 5 seconds so incoming and hold payments update automatically
    const pollTimer = setInterval(() => {
      fetchPayments(true);
    }, 5000);
    return () => clearInterval(pollTimer);
  }, []);

  const [viewModalPayment, setViewModalPayment] = useState(null);

  // Direct action execution (Accept & Not Received execute without extra popup modal)
  const handleDirectAction = async (payment, action) => {
    if (!payment) return;
    setVerifying(true);
    try {
      const defaultNote = action === 'CONFIRM'
        ? 'Verified and approved by admin.'
        : 'Payment not received in bank statement.';
      const res = await subscriptionService.verifyAdminPayment(payment.id, action, payment.utr || '', defaultNote);

      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: action === 'CONFIRM' ? 'INFO' : 'WARN',
        action: `ADMIN_PAYMENT_${action}`,
        actorEmail: user?.email || 'admin@zyndex.com',
        details: `Administrator ${action === 'CONFIRM' ? 'approved & confirmed' : 'marked as not received'} payment: ${payment.id} for user ${payment.user_email || payment.user_name} (Plan: ${payment.plan_id}, UTR: ${payment.utr || 'N/A'})`,
        status: 'SUCCESS'
      }).catch(() => {});

      setAlert({
        message: res.message || `Payment ${action === 'CONFIRM' ? 'confirmed and activated' : 'marked as not received'} successfully.`,
        type: 'success'
      });
      await fetchPayments();
    } catch (err) {
      setAlert({
        message: err.message || 'Action failed. Please try again.',
        type: 'error'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenActionModal = (payment, action) => {
    setActiveModal({ payment, action });
    setAdminUtr(payment.utr || '');
    setAdminNote('');
  };

  const handleExecuteVerification = async () => {
    if (!activeModal) return;
    setVerifying(true);
    try {
      const { payment, action } = activeModal;
      const res = await subscriptionService.verifyAdminPayment(payment.id, action, adminUtr, adminNote);

      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: action === 'CONFIRM' ? 'INFO' : 'WARN',
        action: `ADMIN_PAYMENT_${action}`,
        actorEmail: user?.email || 'admin@zyndex.com',
        details: `Administrator ${action === 'CONFIRM' ? 'approved & confirmed' : 'declined'} payment: ${payment.id} for user ${payment.user_email || payment.user_name} (Plan: ${payment.plan_id}, UTR: ${adminUtr || payment.utr || 'N/A'})`,
        status: 'SUCCESS'
      }).catch(() => {});

      setAlert({
        message: res.message || `Payment ${action === 'CONFIRM' ? 'confirmed and activated' : 'declined'} successfully.`,
        type: 'success'
      });
      setActiveModal(null);
      await fetchPayments();
    } catch (err) {
      setAlert({
        message: err.message || 'Verification action failed. Please try again.',
        type: 'error'
      });
    } finally {
      setVerifying(false);
    }
  };

  // Export to Excel (CSV with UTF-8 BOM, opens natively in MS Excel)
  const handleExportExcel = () => {
    if (!filteredPayments.length) {
      setAlert({ message: 'No payments to export.', type: 'error' });
      return;
    }

    const headers = [
      'Sl No',
      'User Name',
      'User Email',
      'Date and Time',
      'UTR Number',
      'Present Plan (Paid)',
      'Previous Plan',
      'Amount Paid (INR)',
      'Status',
      'Payment ID',
      'Order ID',
      'Payment Method',
      'Review Reason / Failure Note'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredPayments.map((p, idx) => [
      idx + 1,
      p.user_name || 'N/A',
      p.user_email || 'N/A',
      p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A',
      p.utr || 'N/A',
      (p.plan_id || 'N/A').replace(/_/g, ' '),
      (p.previous_plan || 'FREE').replace(/_/g, ' '),
      ((p.amount_paise || 0) / 100).toFixed(2),
      p.status,
      p.id,
      p.order_id || 'N/A',
      p.payment_method || 'UPI',
      p.review_reason || p.failure_reason || ''
    ]);

    const csvContent = '\uFEFF' + [
      headers.map(escapeCsv).join(','),
      ...rows.map(r => r.map(escapeCsv).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    link.setAttribute('download', `Zyndex_Payments_Export_${timestampStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setAlert({ message: 'Payments data exported with timestamps successfully!', type: 'success' });
  };

  // Status priority order for custom sorting
  const statusPriority = {
    'REVIEW_REQUIRED': 1,
    'PROCESSING': 2,
    'PAYMENT_INITIATED': 3,
    'PENDING': 4,
    'SUCCESS': 5,
    'FAILED': 6,
    'CANCELLED': 7,
    'EXPIRED': 8
  };

  const filteredPayments = useMemo(() => {
    let result = [...payments];

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(p => (p.status || '').toUpperCase() === statusFilter);
    }

    // Text search (User Name, Email, UTR, Payment ID, Order ID, Plan)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p => 
        (p.user_name && p.user_name.toLowerCase().includes(q)) ||
        (p.user_email && p.user_email.toLowerCase().includes(q)) ||
        (p.utr && p.utr.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.order_id && p.order_id.toLowerCase().includes(q)) ||
        (p.plan_id && p.plan_id.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      let valA, valB;
      if (sortField === 'status') {
        valA = statusPriority[a.status] || 99;
        valB = statusPriority[b.status] || 99;
      } else if (sortField === 'amount') {
        valA = a.amount_paise || 0;
        valB = b.amount_paise || 0;
      } else if (sortField === 'created_at') {
        valA = new Date(a.created_at || 0).getTime();
        valB = new Date(b.created_at || 0).getTime();
      } else if (sortField === 'name') {
        valA = (a.user_name || '').toLowerCase();
        valB = (b.user_name || '').toLowerCase();
      } else {
        valA = a[sortField] || '';
        valB = b[sortField] || '';
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [payments, search, statusFilter, sortField, sortAsc]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs"><CheckCircle2 className="size-3.5" /> Success</span>;
      case 'REVIEW_REQUIRED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-950 border border-amber-500 shadow-xs animate-pulse"><AlertTriangle className="size-3.5" /> In Hold</span>;
      case 'PROCESSING':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-xs"><Clock className="size-3.5" /> Processing</span>;
      case 'PAYMENT_INITIATED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-600 text-white shadow-xs"><Clock className="size-3.5" /> Initiated</span>;
      case 'FAILED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs"><XCircle className="size-3.5" /> Failed</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-600 text-white shadow-xs"><X className="size-3.5" /> Cancelled</span>;
      case 'EXPIRED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-500 text-white shadow-xs"><Clock className="size-3.5" /> Expired</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500 text-white shadow-xs">{status || 'Initiated'}</span>;
    }
  };

  // Summary counts
  const counts = useMemo(() => {
    const total = payments.length;
    const hold = payments.filter(p => p.status === 'REVIEW_REQUIRED').length;
    const success = payments.filter(p => p.status === 'SUCCESS').length;
    const failed = payments.filter(p => p.status === 'FAILED').length;
    const totalRevenue = payments
      .filter(p => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + ((p.amount_paise || 0) / 100), 0);
    return { total, hold, success, failed, totalRevenue };
  }, [payments]);

  return (
    <AdminLayout>
      <div className="space-y-6 min-h-screen pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Payments & Subscriptions Manager
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                View all initiated, pending, successful, failed, and hold payments. Verify customer UTR references to approve or decline memberships.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchPayments}
                disabled={loading}
                className="p-2.5 bg-white border border-slate-200 text-slate-700 hover:text-orange-600 rounded-xl hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                title="Refresh payments list"
              >
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleExportExcel}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                title="Download Payments with Timestamp (CSV/Excel)"
              >
                <Download className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Alert notification */}
        <AnimatePresence>
          {alert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
                alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-red-50 text-red-800 border border-red-300'
              }`}
            >
              <span>{alert.message}</span>
              <button onClick={() => setAlert(null)} className="text-slate-500 hover:text-slate-800 font-bold">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Transactions</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{counts.total}</p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">All states recorded</span>
          </div>
          <div className="bg-amber-50/60 border border-amber-300 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">Pending Hold (UTR)</span>
              {counts.hold > 0 && <span className="size-2 rounded-full bg-amber-500 animate-ping" />}
            </div>
            <p className="text-2xl font-black text-amber-900 mt-1">{counts.hold}</p>
            <span className="text-[10px] text-amber-700 mt-0.5 block">Requires Manual Review</span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-300 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">Completed Payments</span>
            <p className="text-2xl font-black text-emerald-900 mt-1">{counts.success}</p>
            <span className="text-[10px] text-emerald-700 mt-0.5 block">Active Subscriptions</span>
          </div>
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Paid Revenue</span>
            <p className="text-2xl font-black text-white mt-1">₹{counts.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Net Verified Earnings</span>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by User Name, Email, UTR, Order ID, or Plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Filter className="size-3.5 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses ({counts.total})</option>
                <option value="REVIEW_REQUIRED">Hold / Review Required ({counts.hold})</option>
                <option value="SUCCESS">Success ({counts.success})</option>
                <option value="PAYMENT_INITIATED">Payment Initiated</option>
                <option value="PROCESSING">Processing</option>
                <option value="FAILED">Failed ({counts.failed})</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <ArrowUpDown className="size-3.5 text-slate-500" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="status">Sort: Status Priority</option>
                <option value="created_at">Sort: Date & Time</option>
                <option value="amount">Sort: Amount Paid</option>
                <option value="name">Sort: User Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">Sl No</th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('name')}>
                    User Name
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('email')}>
                    Email Address
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('created_at')}>
                    Date & Time
                  </th>
                  <th className="py-3.5 px-4">UTR Number</th>
                  <th className="py-3.5 px-4">Present Plan (Paid)</th>
                  <th className="py-3.5 px-4">Previous Plan</th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('amount')}>
                    Amount Paid
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('status')}>
                    Status
                  </th>
                  <th className="py-3.5 px-4 text-center">Admin Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading && payments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                      <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-orange-500" />
                      Loading payments history...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                      No payments found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p, idx) => {
                    const isHold = p.status === 'REVIEW_REQUIRED';
                    const amountRupees = ((p.amount_paise || 0) / 100).toFixed(2);
                    return (
                      <tr 
                        key={p.id} 
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isHold ? 'bg-amber-50/30 font-medium' : ''
                        }`}
                      >
                        {/* Sl No */}
                        <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* User Name */}
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {p.user_name || 'N/A'}
                        </td>

                        {/* Email Address */}
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {p.user_email || 'N/A'}
                        </td>

                        {/* Date & Time */}
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {p.created_at ? new Date(p.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </td>

                        {/* UTR Number */}
                        <td className="py-3 px-4">
                          {p.utr ? (
                            <span className="font-mono font-bold text-orange-950 bg-orange-100/70 border border-orange-200 px-2 py-0.5 rounded text-[11px] select-all">
                              {p.utr}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Not Submitted</span>
                          )}
                        </td>

                        {/* Present Plan */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                            {(p.plan_id || 'N/A').replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Previous Plan */}
                        <td className="py-3 px-4 text-slate-600">
                          <span className="text-slate-500 text-[11px]">
                            {(p.previous_plan || 'FREE').replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Amount Paid */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₹{amountRupees}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(p.status)}
                        </td>

                        {/* Verification Action */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {p.status === 'SUCCESS' ? (
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                                <CheckCircle2 className="size-3 text-emerald-500" /> Active
                              </span>
                              <button
                                onClick={() => setViewModalPayment(p)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="View payment details"
                              >
                                <Eye className="size-3.5 text-slate-600" />
                              </button>
                            </div>
                          ) : p.status === 'CANCELLED' || !p.utr ? (
                            /* Cancelled by user in QR page, or UTR not entered yet: Show Eye icon only */
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewModalPayment(p)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                                title="View details"
                              >
                                <Eye className="size-3.5 text-slate-600" />
                                <span>Details</span>
                              </button>
                            </div>
                          ) : (
                            /* User entered UTR: Accept & Not Received are direct one-click; Decline opens reason popup */
                            <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-xs mx-auto">
                              {/* Accept directly */}
                              <button
                                disabled={verifying}
                                onClick={() => handleDirectAction(p, 'CONFIRM')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                                title="Accept payment directly and activate subscription"
                              >
                                <Check className="size-3" />
                                <span>Accept</span>
                              </button>

                              {/* Decline with reason modal */}
                              <button
                                disabled={verifying}
                                onClick={() => handleOpenActionModal(p, 'DECLINE')}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                                title="Decline payment with comment and email notification"
                              >
                                <X className="size-3" />
                                <span>Decline</span>
                              </button>

                              {/* Not Received directly */}
                              <button
                                disabled={verifying}
                                onClick={() => handleDirectAction(p, 'NOT_RECEIVED')}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                                title="Mark as Not Received directly"
                              >
                                <AlertTriangle className="size-3" />
                                <span>Not Received</span>
                              </button>

                              {/* View Info */}
                              <button
                                onClick={() => setViewModalPayment(p)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all cursor-pointer"
                                title="View details"
                              >
                                <Eye className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Action Modal */}
        <AnimatePresence>
          {/* Eye Icon Info Details Modal */}
          {viewModalPayment && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs"
                onClick={() => setViewModalPayment(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                        <CreditCard className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">Payment Details</h3>
                        <p className="text-xs text-slate-500 font-mono">{viewModalPayment.id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setViewModalPayment(null)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 block">User Name</span>
                      <span className="font-bold text-slate-800">{viewModalPayment.user_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">User Email</span>
                      <span className="font-bold text-slate-800">{viewModalPayment.user_email || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Plan</span>
                      <span className="font-bold text-slate-800">{(viewModalPayment.plan_id || 'N/A').replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Amount</span>
                      <span className="font-bold text-slate-800">₹{((viewModalPayment.amount_paise || 0) / 100).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Status</span>
                      <span className="font-bold">{getStatusBadge(viewModalPayment.status)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">UTR Reference</span>
                      <span className="font-mono font-bold text-slate-900">{viewModalPayment.utr || 'Not Submitted'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Order ID</span>
                      <span className="font-mono text-slate-700">{viewModalPayment.order_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Created At</span>
                      <span className="text-slate-700">{viewModalPayment.created_at ? new Date(viewModalPayment.created_at).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>

                  {viewModalPayment.review_reason && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                      <span className="font-bold block mb-0.5">Admin Note / Review Reason:</span>
                      <p>{viewModalPayment.review_reason}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setViewModalPayment(null)}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {activeModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs"
                onClick={() => !verifying && setActiveModal(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl z-50 border border-slate-200"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      {activeModal.action === 'CONFIRM' ? (
                        <div className="size-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">✓</div>
                      ) : activeModal.action === 'NOT_RECEIVED' ? (
                        <div className="size-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">!</div>
                      ) : activeModal.action === 'DELETE' ? (
                        <div className="size-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">🗑</div>
                      ) : activeModal.action === 'CANCEL' ? (
                        <div className="size-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold">✕</div>
                      ) : (
                        <div className="size-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">✕</div>
                      )}
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">
                          {activeModal.action === 'CONFIRM' && 'Accept Payment & Activate Subscription'}
                          {activeModal.action === 'DECLINE' && 'Decline Payment'}
                          {activeModal.action === 'NOT_RECEIVED' && 'Mark as Not Received'}
                          {activeModal.action === 'CANCEL' && 'Cancel Payment Transaction'}
                          {activeModal.action === 'DELETE' && 'Permanently Delete Payment Record'}
                        </h3>
                        <p className="text-[11px] text-slate-500">Payment ID: {activeModal.payment.id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveModal(null)}
                      disabled={verifying}
                      className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </div>

                  {/* Summary of payment details */}
                  <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-200 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer Name:</span>
                      <span className="font-bold text-slate-900">{activeModal.payment.user_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer Email:</span>
                      <span className="font-mono font-bold text-slate-800">{activeModal.payment.user_email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Plan:</span>
                      <span className="font-bold text-slate-900">{(activeModal.payment.plan_id || '').replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Amount Paid / Cost:</span>
                      <span className="font-bold text-emerald-700 font-mono">₹{((activeModal.payment.amount_paise || 0) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Submitted UTR:</span>
                      <span className="font-mono font-bold text-slate-900">{activeModal.payment.utr || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Admin UTR Input */}
                  {activeModal.action === 'CONFIRM' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Verified Bank Reference / UTR Number
                      </label>
                      <input
                        type="text"
                        placeholder="Enter verified UTR from Union Bank / UPI app"
                        value={adminUtr}
                        onChange={(e) => setAdminUtr(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  )}

                  {/* Admin Note / Reason Box */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      {activeModal.action === 'CONFIRM'
                        ? 'Admin Verification Note (Optional)'
                        : activeModal.action === 'NOT_RECEIVED'
                        ? 'Reason for Not Received (Sent directly to customer email) *'
                        : activeModal.action === 'DELETE'
                        ? 'Reason for Record Deletion (e.g. duplicate user payment) *'
                        : 'Reason for Decision (Sent directly to customer email) *'}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={
                        activeModal.action === 'CONFIRM'
                          ? 'Verified in Union Bank statement'
                          : activeModal.action === 'NOT_RECEIVED'
                          ? 'Explain why payment was not received (e.g. UTR not matching statement, transaction reversed, incorrect amount)...'
                          : activeModal.action === 'DELETE'
                          ? 'Explain why payment record is being permanently removed (e.g. duplicate checkout, test transaction)...'
                          : 'Provide clear reason for declining payment...'
                      }
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      required={activeModal.action === 'NOT_RECEIVED' || activeModal.action === 'DECLINE' || activeModal.action === 'DELETE'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none leading-relaxed"
                    />
                    {(activeModal.action === 'NOT_RECEIVED' || activeModal.action === 'DECLINE' || activeModal.action === 'CANCEL') && (
                      <p className="text-[10px] text-slate-500 mt-1 italic">
                        * This reason along with the payment status will be dispatched via email to {activeModal.payment.user_email || 'the user'}.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={verifying}
                      onClick={() => setActiveModal(null)}
                      className="flex-1 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      disabled={verifying || ((activeModal.action === 'NOT_RECEIVED' || activeModal.action === 'DECLINE' || activeModal.action === 'DELETE') && !adminNote.trim())}
                      onClick={handleExecuteVerification}
                      className={`flex-1 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        activeModal.action === 'CONFIRM' 
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' 
                          : activeModal.action === 'NOT_RECEIVED'
                          ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                          : activeModal.action === 'CANCEL'
                          ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-700/30'
                          : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                      }`}
                    >
                      {verifying ? (
                        <RefreshCw className="size-3.5 animate-spin" />
                      ) : activeModal.action === 'CONFIRM' ? (
                        <>
                          <Check className="size-3.5" />
                          <span>Approve & Activate</span>
                        </>
                      ) : activeModal.action === 'NOT_RECEIVED' ? (
                        <>
                          <AlertTriangle className="size-3.5" />
                          <span>Submit & Send Email</span>
                        </>
                      ) : activeModal.action === 'DELETE' ? (
                        <>
                          <X className="size-3.5" />
                          <span>Delete Permanently</span>
                        </>
                      ) : activeModal.action === 'CANCEL' ? (
                        <>
                          <X className="size-3.5" />
                          <span>Cancel & Notify</span>
                        </>
                      ) : (
                        <>
                          <X className="size-3.5" />
                          <span>Decline & Send Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
