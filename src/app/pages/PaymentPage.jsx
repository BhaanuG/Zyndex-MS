import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowLeft, 
  Check, 
  ShieldCheck, 
  HelpCircle, 
  Loader2,
  Receipt,
  BookOpen,
  CreditCard,
  Landmark,
  Wallet,
  QrCode,
  Smartphone,
  Lock,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import subscriptionService from '@/services/api/subscriptionService';

export default function PaymentPage() {
  const { name, email, amount, orderId } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect whether current URL is on the UTR page or QR page
  const isUtrRoute = location.pathname.includes('/UTR');

  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Timer: 5 minutes (300s) for QR page, 10 minutes (600s) for UTR page
  const [qrTimeLeft, setQrTimeLeft] = useState(300);
  const [utrTimeLeft, setUtrTimeLeft] = useState(600); // 10 minutes minimum
  
  // Payment Method Selection: 'upi' (default) | 'card' | 'netbanking' | 'wallet'
  const [selectedMethod, setSelectedMethod] = useState('upi');

  // Credit / Debit Card Form state
  const [cardData, setCardData] = useState({
    number: '',
    name: user?.name || '',
    expiry: '',
    cvv: ''
  });
  const [processingCard, setProcessingCard] = useState(false);
  const [cardError, setCardError] = useState('');

  // Net Banking state
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [processingBank, setProcessingBank] = useState(false);
  const [bankError, setBankError] = useState('');

  // Digital Wallet state
  const [selectedWallet, setSelectedWallet] = useState('paytm');
  const [processingWallet, setProcessingWallet] = useState(false);
  const [walletPhone, setWalletPhone] = useState('');
  const [walletError, setWalletError] = useState('');

  // UTR Form state
  const [utrNumber, setUtrNumber] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrError, setUtrError] = useState('');

  // Cancelling state
  const [cancelling, setCancelling] = useState(false);

  const safeUserName = encodeURIComponent(user?.name ? user.name.replace(/\s+/g, '-') : name || 'Scholar');
  const safeUserEmail = encodeURIComponent(user?.email || email || 'user@zyndex.com');
  const billingProfilePath = `/Zyndex/User/${safeUserName}/${safeUserEmail}/Profile/Billing`;
  const utrPageUrl = `/Zyndex/User/${safeUserName}/${safeUserEmail}/Profile/Billing/${amount || '199'}/Payment/${orderId}/UTR/:::::::::::::::::::`;
  const qrPageUrl = `/Zyndex/User/${safeUserName}/${safeUserEmail}/Profile/Billing/${amount || '199'}/Payment/${orderId}/:::::::::`;

  // Fetch initial payment / order status
  useEffect(() => {
    let isMounted = true;
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await subscriptionService.getOrderStatus(orderId);
        if (!isMounted) return;
        setPaymentData(res);

        const currentStatus = (res.status || '').toUpperCase();
        if (currentStatus === 'EXPIRED') {
          setQrTimeLeft(0);
          setUtrTimeLeft(0);
        } else if (res.expiresAt) {
          const nowSec = Math.floor(Date.now() / 1000);
          const remaining = Math.max(0, res.expiresAt - nowSec);
          setQrTimeLeft(remaining > 0 ? remaining : 0);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Unable to load payment order.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
    return () => { isMounted = false; };
  }, [orderId]);

  // QR 5-Minute Timer Countdown Tick
  useEffect(() => {
    if (isUtrRoute) return;
    if (paymentData?.status && ['SUCCESS', 'CANCELLED', 'FAILED', 'EXPIRED'].includes(paymentData.status.toUpperCase())) return;

    if (qrTimeLeft <= 0) {
      if (paymentData && paymentData.status !== 'EXPIRED') {
        setPaymentData(prev => prev ? ({ ...prev, status: 'EXPIRED' }) : null);
      }
      return;
    }

    const interval = setInterval(() => {
      setQrTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPaymentData(p => p ? ({ ...p, status: 'EXPIRED' }) : null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isUtrRoute, qrTimeLeft, paymentData?.status]);

  // UTR 10-Minute Timer Countdown Tick
  useEffect(() => {
    if (!isUtrRoute) return;
    if (paymentData?.status && ['SUCCESS', 'CANCELLED', 'FAILED', 'EXPIRED'].includes(paymentData.status.toUpperCase())) return;

    if (utrTimeLeft <= 0) {
      if (paymentData && paymentData.status !== 'EXPIRED') {
        setPaymentData(prev => prev ? ({ ...prev, status: 'EXPIRED' }) : null);
      }
      return;
    }

    const interval = setInterval(() => {
      setUtrTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPaymentData(p => p ? ({ ...p, status: 'EXPIRED' }) : null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isUtrRoute, utrTimeLeft, paymentData?.status]);

  // Polling payment status while waiting
  useEffect(() => {
    const currentSt = (paymentData?.status || '').toUpperCase();
    if (['SUCCESS', 'CANCELLED', 'FAILED', 'EXPIRED'].includes(currentSt)) return;
    if (!paymentData?.paymentId) return;

    const poll = setInterval(async () => {
      try {
        const res = await subscriptionService.getPaymentStatus(paymentData.paymentId);
        const st = (res.status || '').toUpperCase();
        if (st === 'SUCCESS') {
          clearInterval(poll);
          setPaymentData(res);
          await refreshUser();
        } else if (st === 'CANCELLED' || st === 'FAILED' || st === 'EXPIRED') {
          clearInterval(poll);
          setPaymentData(res);
        } else if (st === 'REVIEW_REQUIRED') {
          setPaymentData(res);
        }
      } catch (e) {
        console.warn('Status poll warning:', e);
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [paymentData?.paymentId, paymentData?.status, refreshUser]);

  const handleCardPayment = async (e) => {
    if (e) e.preventDefault();
    const cleanNum = cardData.number.replace(/\s+/g, '');
    if (cleanNum.length < 15 || cleanNum.length > 16) {
      setCardError('Please enter a valid 15 or 16-digit card number.');
      return;
    }
    if (!cardData.name.trim()) {
      setCardError('Cardholder name is required.');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
      setCardError('Expiry format must be MM/YY.');
      return;
    }
    if (cardData.cvv.length < 3 || cardData.cvv.length > 4) {
      setCardError('Please enter a valid 3 or 4-digit CVV.');
      return;
    }

    setProcessingCard(true);
    setCardError('');
    try {
      // Simulate secure 3D-Secure gateway redirect & card settlement
      await new Promise(r => setTimeout(r, 2200));
      const res = await subscriptionService.confirmSimulatedPayment(paymentData.paymentId);
      setPaymentData(res);
      await refreshUser();
    } catch (err) {
      setCardError(err.message || 'Card authorization failed. Please try another card or UPI.');
    } finally {
      setProcessingCard(false);
    }
  };

  const handleNetBankingPayment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedBank) {
      setBankError('Please select your preferred banking partner.');
      return;
    }

    setProcessingBank(true);
    setBankError('');
    try {
      // Simulate secure bank net-banking redirect and instant clearance
      await new Promise(r => setTimeout(r, 2400));
      const res = await subscriptionService.confirmSimulatedPayment(paymentData.paymentId);
      setPaymentData(res);
      await refreshUser();
    } catch (err) {
      setBankError(err.message || 'Net banking processing failed. Please try another bank or UPI.');
    } finally {
      setProcessingBank(false);
    }
  };

  const handleWalletPayment = async (e) => {
    if (e) e.preventDefault();
    const cleanPhone = walletPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setWalletError('Please enter a valid 10-digit registered mobile number.');
      return;
    }

    setProcessingWallet(true);
    setWalletError('');
    try {
      // Simulate wallet debit & instant token clearance
      await new Promise(r => setTimeout(r, 2000));
      const res = await subscriptionService.confirmSimulatedPayment(paymentData.paymentId);
      setPaymentData(res);
      await refreshUser();
    } catch (err) {
      setWalletError(err.message || 'Wallet debit failed. Please check wallet balance or try UPI.');
    } finally {
      setProcessingWallet(false);
    }
  };

  const handleIHavePaid = () => {
    navigate(utrPageUrl);
  };

  const handleSubmitUtr = async (e) => {
    if (e) e.preventDefault();
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      setUtrError('Please enter the 12-digit UTR / UPI Reference Number.');
      return;
    }
    if (!/^\d{12}$/.test(cleanUtr)) {
      setUtrError('A standard UTR number consists of exactly 12 numeric digits.');
      return;
    }

    setSubmittingUtr(true);
    setUtrError('');
    try {
      const res = await subscriptionService.submitUtr(paymentData.paymentId, cleanUtr);
      setPaymentData(prev => ({
        ...prev,
        status: 'REVIEW_REQUIRED',
        utr: cleanUtr,
        reviewReason: 'UTR submitted. Awaiting administrator verification.'
      }));
    } catch (err) {
      setUtrError(err.message || 'Failed to submit UTR. Please try again.');
    } finally {
      setSubmittingUtr(false);
    }
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Circular clock SVG variables
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const activeSeconds = isUtrRoute ? utrTimeLeft : qrTimeLeft;
  const totalDuration = isUtrRoute ? 600 : 300;
  const strokeDashoffset = circumference - (activeSeconds / totalDuration) * circumference;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading secure payment order...</p>
      </div>
    );
  }

  if (error && !paymentData) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="size-16 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Payment Order Unavailable</h2>
        <p className="text-sm text-slate-600">{error}</p>
        <button
          type="button"
          onClick={() => navigate(billingProfilePath)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Back to User Portal</span>
        </button>
      </div>
    );
  }

  const effectiveStatus = (paymentData?.status || 'PENDING').toUpperCase();
  const isTerminal = ['SUCCESS', 'CANCELLED', 'FAILED', 'EXPIRED'].includes(effectiveStatus);
  const isReview = effectiveStatus === 'REVIEW_REQUIRED';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-orange-500 selection:text-white">
      {/* MINIMAL TOP HEADER: Only Zyndex Logo (Non-clickable, no redirect, no back button) */}
      <header className="w-full bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-2xs select-none">
        <div className="flex items-center gap-2.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center text-white shadow-md">
            <BookOpen className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent tracking-tight leading-tight">
              Zyndex
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none mt-0.5">
              Educational Excellence
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <ShieldCheck className="size-3.5 text-orange-600" />
            <span>Secure Checkout</span>
          </span>
        </div>
      </header>

      {/* MAIN PAYMENT WORKSPACE (No footer links, no other header links) */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex items-center justify-center">
        {/* REPLAY PROTECTION / COMPLETED VIEW */}
        {isTerminal ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 md:p-10 space-y-6 text-center"
          >
            <div className="size-20 rounded-full mx-auto flex items-center justify-center shadow-sm">
              {effectiveStatus === 'SUCCESS' && (
                <div className="size-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="size-10" />
                </div>
              )}
              {effectiveStatus === 'CANCELLED' && (
                <div className="size-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <XCircle className="size-10" />
                </div>
              )}
              {effectiveStatus === 'FAILED' && (
                <div className="size-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <XCircle className="size-10" />
                </div>
              )}
              {effectiveStatus === 'EXPIRED' && (
                <div className="size-20 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center">
                  <Clock className="size-10" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {effectiveStatus === 'SUCCESS' && 'Payment Completed Successfully'}
                {effectiveStatus === 'CANCELLED' && 'Payment Cancelled'}
                {effectiveStatus === 'FAILED' && 'Payment Declined / Failed'}
                {effectiveStatus === 'EXPIRED' && 'Payment Order Expired'}
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                {effectiveStatus === 'SUCCESS' && 'Your subscription plan has been activated. Thank you for your payment.'}
                {effectiveStatus === 'CANCELLED' && 'This transaction was cancelled. No charges have been deducted.'}
                {effectiveStatus === 'FAILED' && (paymentData?.failureReason || 'Your payment was declined by administrator or bank.')}
                {effectiveStatus === 'EXPIRED' && 'The payment timer for this QR/UTR session has elapsed. Please start a new checkout session.'}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="font-bold uppercase tracking-wider text-slate-500">Transaction Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  effectiveStatus === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  effectiveStatus === 'CANCELLED' ? 'bg-red-100 text-red-800 border border-red-300' :
                  effectiveStatus === 'FAILED' ? 'bg-red-100 text-red-800 border border-red-300' :
                  effectiveStatus === 'EXPIRED' ? 'bg-slate-900 text-slate-100 border border-slate-950' :
                  'bg-slate-200 text-slate-800'
                }`}>
                  {effectiveStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block">Plan</span>
                  <span className="font-bold text-slate-800 text-sm">{paymentData?.planId || 'Student Plus'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Amount</span>
                  <span className="font-bold text-slate-800 text-sm">₹{amount || paymentData?.amountRupees || '199'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Order ID</span>
                  <span className="font-mono text-slate-700">{orderId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment ID</span>
                  <span className="font-mono text-slate-700">{paymentData?.paymentId || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => navigate(billingProfilePath)}
                className="px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="size-4" />
                <span>Return to User Portal</span>
              </button>
            </div>
          </motion.div>
        ) : isReview ? (
          /* PAYMENT ON HOLD / UTR REVIEW STATE */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white rounded-3xl border border-amber-200 shadow-xl p-8 md:p-10 space-y-6 text-center"
          >
            <div className="size-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <Receipt className="size-10" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wide">
                Under Admin Verification
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                Payment Verification On Hold
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your 12-digit UTR (<span className="font-mono font-bold text-slate-900">{paymentData?.utr || utrNumber}</span>) has been securely registered and an automated notification has been dispatched to <strong className="text-slate-800">Bhaanugali@gmail.com</strong>.
              </p>
            </div>

            <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl max-w-md mx-auto text-left text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                <CheckCircle2 className="size-4 text-amber-600" />
                <span>What happens next?</span>
              </div>
              <p className="leading-relaxed">1. The administrator audits bank statement credit against your UTR.</p>
              <p className="leading-relaxed">2. Upon confirmation, your plan status and access entitlements automatically activate.</p>
              <p className="leading-relaxed">3. An automated status email with timestamps and comments will be delivered.</p>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => navigate(billingProfilePath)}
                className="px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Return to User Portal</span>
              </button>
            </div>
          </motion.div>
        ) : isUtrRoute ? (
          /* =========================================================================
             UTR ENTERING PAGE (10 MIN TIMER, CANCEL & VERIFY BUTTONS)
             ========================================================================= */
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 md:p-10 space-y-6"
          >
            {/* Top Row with 10-Min Timer Indicator */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Step 2: Verification</span>
                <h2 className="text-2xl font-black text-slate-900 mt-0.5">Submit UTR Reference</h2>
              </div>
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Clock className={`size-4 ${utrTimeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-slate-600'}`} />
                <span className="font-mono text-xs font-bold text-slate-800">
                  {formatTimer(utrTimeLeft)} remaining (10 min)
                </span>
              </div>
            </div>

            {/* Educational Info: What is UTR & Where to find it */}
            <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <HelpCircle className="size-5 text-orange-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-orange-950">What is a UTR Number?</h4>
                  <p className="text-xs text-orange-900/80 leading-relaxed">
                    UTR stands for <strong>Unique Transaction Reference</strong>. It is a 12-digit numeric identifier generated by your bank / UPI app for every payment. It uniquely proves that your money reached Zyndex.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs">
                  <span className="font-bold text-slate-900 block mb-1">Google Pay</span>
                  <span className="text-slate-600">Look for <strong>"UPI transaction ID"</strong> (12 digits).</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs">
                  <span className="font-bold text-slate-900 block mb-1">PhonePe</span>
                  <span className="text-slate-600">Look for <strong>"UTR"</strong> under Transfer Details (12 digits).</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs">
                  <span className="font-bold text-slate-900 block mb-1">Paytm / Cred / Others</span>
                  <span className="text-slate-600">Look for <strong>"UPI Ref No"</strong> or <strong>"Ref No"</strong> (12 digits).</span>
                </div>
              </div>
            </div>

            {/* UTR Submission Form */}
            <form onSubmit={handleSubmitUtr} className="space-y-6 max-w-lg mx-auto pt-2">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800 text-center">
                  Enter 12-Digit UTR Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={utrNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setUtrNumber(val);
                      setUtrError('');
                    }}
                    placeholder="e.g. 425619842109"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xl font-black text-slate-900 tracking-wider text-center focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-4 text-xs font-mono text-slate-400">
                    {utrNumber.length}/12
                  </span>
                </div>
                {utrError && (
                  <p className="text-xs font-semibold text-red-600 flex items-center justify-center gap-1.5 mt-1">
                    <AlertCircle className="size-3.5" />
                    <span>{utrError}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons: Cancel and Verify UTR */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={submittingUtr || utrNumber.length !== 12}
                  className="flex-1 py-3.5 px-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submittingUtr ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Verifying UTR...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      <span>Verify & Submit UTR</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelPayment}
                  disabled={cancelling}
                  className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Payment'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* =========================================================================
             PAYMENT SELECTION & ORDER PROCESSING PAGE
             - Supports UPI QR (default), Credit/Debit Card, Net Banking & Wallets
             - Features active security clock and countdown
             - Includes immediate simulated gateway verification or UTR submission
             ========================================================================= */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 md:p-10 space-y-8"
          >
            {/* Top Order Summary & Timer Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Step 1: Select Payment Method</span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  Complete Payment for {paymentData?.planId ? paymentData.planId.replace(/_/g, ' ') : 'Subscription'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order ID: <span className="font-mono font-semibold text-slate-700">{orderId}</span> &bull; Total Amount: <span className="font-bold text-slate-900">₹{amount || paymentData?.amountRupees || '199'}</span>
                </p>
              </div>

              {/* Digital countdown pill */}
              <div className="flex items-center gap-2 bg-orange-50/80 border border-orange-200/80 px-3.5 py-1.5 rounded-xl self-start sm:self-auto shrink-0">
                <Clock className={`size-4 ${qrTimeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`} />
                <span className="font-mono text-xs font-bold text-orange-950">
                  {formatTimer(qrTimeLeft)} remaining
                </span>
              </div>
            </div>

            {/* Payment Method Switcher Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  selectedMethod === 'upi'
                    ? 'bg-white text-orange-600 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="size-4" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  selectedMethod === 'card'
                    ? 'bg-white text-orange-600 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="size-4" />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('netbanking')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  selectedMethod === 'netbanking'
                    ? 'bg-white text-orange-600 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Landmark className="size-4" />
                <span>Net Banking</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('wallet')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  selectedMethod === 'wallet'
                    ? 'bg-white text-orange-600 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wallet className="size-4" />
                <span>Wallets</span>
              </button>
            </div>

            {/* TAB CONTENT: UPI / QR CODE */}
            {selectedMethod === 'upi' && (
              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-around gap-8">
                  {/* Left Side: QR Code */}
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 relative group">
                      <img
                        src={paymentData?.qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3D918897337687%40waaxis%26am%3D${amount || 199}`}
                        alt="Payment QR Code"
                        className="size-52 md:size-60 object-contain rounded-xl"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Scan with any UPI App &bull; ₹{amount || paymentData?.amountRupees || '199'}
                    </span>
                  </div>

                  {/* Right Side: Medium Clock with live minutes/seconds hands + Digital Clock underneath */}
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative size-32 md:size-36 flex items-center justify-center">
                      {/* Outer circle progress */}
                      <svg className="size-32 md:size-36 -rotate-90 transform" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          className="text-slate-200"
                          strokeWidth="6"
                          stroke="currentColor"
                          fill="transparent"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          className={qrTimeLeft < 60 ? 'text-red-500' : 'text-orange-500'}
                          strokeWidth="6"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                      </svg>

                      {/* Analog Clock Face with animated lively minutes & seconds hand */}
                      <svg className="absolute size-24 transform pointer-events-none" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="3.5" className="fill-slate-800" />
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                          <line
                            key={deg}
                            x1="50"
                            y1="12"
                            x2="50"
                            y2="17"
                            stroke="#94a3b8"
                            strokeWidth="2"
                            strokeLinecap="round"
                            transform={`rotate(${deg} 50 50)`}
                          />
                        ))}
                        <line
                          x1="50"
                          y1="50"
                          x2="50"
                          y2="24"
                          stroke="#334155"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          transform={`rotate(${((300 - qrTimeLeft) / 60) * 360 / 60} 50 50)`}
                          style={{ transition: 'transform 1s linear' }}
                        />
                        <line
                          x1="50"
                          y1="56"
                          x2="50"
                          y2="16"
                          stroke={qrTimeLeft < 60 ? '#dc2626' : '#ea580c'}
                          strokeWidth="2"
                          strokeLinecap="round"
                          transform={`rotate(${(300 - qrTimeLeft) * 6} 50 50)`}
                          style={{ transition: 'transform 1s linear' }}
                        />
                        <circle cx="50" cy="50" r="1.5" className={qrTimeLeft < 60 ? 'fill-red-600' : 'fill-orange-600'} />
                      </svg>
                    </div>

                    <div className="text-center">
                      <span className={`font-mono text-3xl font-black tracking-wider ${
                        qrTimeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-slate-900'
                      }`}>
                        {formatTimer(qrTimeLeft)}
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Session Validity</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Cancel and "I Have Paid" */}
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button
                    type="button"
                    onClick={handleIHavePaid}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="size-4" />
                    <span>I Have Paid & Enter UTR</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    disabled={cancelling}
                    className="py-4 px-8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Cancelling...</span>
                      </>
                    ) : (
                      <span>Cancel</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CREDIT / DEBIT CARDS */}
            {selectedMethod === 'card' && (
              <form onSubmit={handleCardPayment} className="space-y-6 max-w-xl mx-auto">
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute right-4 top-4 opacity-10">
                    <CreditCard className="size-32" />
                  </div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="size-10 rounded-lg bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
                      <div className="size-6 rounded bg-amber-400/50" />
                    </div>
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Debit / Credit</span>
                  </div>
                  <div className="font-mono text-lg sm:text-xl tracking-widest mb-4">
                    {cardData.number || '•••• •••• •••• ••••'}
                  </div>
                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Cardholder</span>
                      <span className="font-semibold uppercase truncate block max-w-44">{cardData.name || 'SCHOLAR NAME'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Expires</span>
                      <span className="font-mono font-semibold">{cardData.expiry || 'MM/YY'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Card Number</label>
                    <input
                      type="text"
                      maxLength={19}
                      value={cardData.number}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                        setCardData(prev => ({ ...prev, number: val }));
                        setCardError('');
                      }}
                      placeholder="4532 •••• •••• 8892"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-semibold focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardData.name}
                      onChange={(e) => {
                        setCardData(prev => ({ ...prev, name: e.target.value }));
                        setCardError('');
                      }}
                      placeholder="Name as printed on card"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Expiry Date</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={cardData.expiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length >= 3) {
                            val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                          }
                          setCardData(prev => ({ ...prev, expiry: val }));
                          setCardError('');
                        }}
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-semibold focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">CVV / CVC</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardData.cvv}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setCardData(prev => ({ ...prev, cvv: val }));
                          setCardError('');
                        }}
                        placeholder="•••"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-semibold focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-center"
                      />
                    </div>
                  </div>

                  {cardError && (
                    <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="size-3.5" />
                      <span>{cardError}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={processingCard}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {processingCard ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Authorizing with Bank 3DS...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="size-4" />
                        <span>Pay ₹{amount || paymentData?.amountRupees || '199'} Securely</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    disabled={cancelling || processingCard}
                    className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* TAB CONTENT: NET BANKING */}
            {selectedMethod === 'netbanking' && (
              <form onSubmit={handleNetBankingPayment} className="space-y-6 max-w-xl mx-auto">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Popular Indian Banks</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'HDFC', name: 'HDFC Bank' },
                      { id: 'SBI', name: 'State Bank of India' },
                      { id: 'ICICI', name: 'ICICI Bank' },
                      { id: 'AXIS', name: 'Axis Bank' },
                      { id: 'KOTAK', name: 'Kotak Mahindra' },
                      { id: 'PNB', name: 'Punjab National' }
                    ].map(bank => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBank(bank.id)}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                          selectedBank === bank.id
                            ? 'bg-orange-50 border-orange-500 text-orange-950 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{bank.name}</span>
                        {selectedBank === bank.id && <Check className="size-3.5 text-orange-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">All Other Banks</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-orange-500 outline-none"
                  >
                    <option value="HDFC">HDFC Bank</option>
                    <option value="SBI">State Bank of India</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="AXIS">Axis Bank</option>
                    <option value="KOTAK">Kotak Mahindra Bank</option>
                    <option value="PNB">Punjab National Bank</option>
                    <option value="BOB">Bank of Baroda</option>
                    <option value="CANARA">Canara Bank</option>
                    <option value="UNION">Union Bank of India</option>
                    <option value="IDBI">IDBI Bank</option>
                    <option value="YES">Yes Bank</option>
                    <option value="INDUSIND">IndusInd Bank</option>
                  </select>
                </div>

                {bankError && (
                  <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="size-3.5" />
                    <span>{bankError}</span>
                  </p>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    <span>Direct Bank Gateway Authorization</span>
                  </div>
                  <p>You will be securely routed through your bank’s official payment portal to approve the transaction.</p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={processingBank}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {processingBank ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Connecting to Bank Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Landmark className="size-4" />
                        <span>Proceed to Pay ₹{amount || paymentData?.amountRupees || '199'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    disabled={cancelling || processingBank}
                    className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* TAB CONTENT: DIGITAL WALLETS */}
            {selectedMethod === 'wallet' && (
              <form onSubmit={handleWalletPayment} className="space-y-6 max-w-xl mx-auto">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Select Wallet</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'paytm', name: 'Paytm Wallet' },
                      { id: 'phonepe', name: 'PhonePe Wallet' },
                      { id: 'mobikwik', name: 'MobiKwik' },
                      { id: 'amazonpay', name: 'Amazon Pay' }
                    ].map(w => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setSelectedWallet(w.id)}
                        className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          selectedWallet === w.id
                            ? 'bg-orange-50 border-orange-500 text-orange-950 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{w.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-sm font-bold text-slate-500 font-mono">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={walletPhone}
                      onChange={(e) => {
                        setWalletPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                        setWalletError('');
                      }}
                      placeholder="98765 43210"
                      className="w-full pl-14 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                    />
                  </div>
                  {walletError && (
                    <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1">
                      <AlertCircle className="size-3.5" />
                      <span>{walletError}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={processingWallet || walletPhone.length !== 10}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {processingWallet ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Sending Debit Request to Wallet...</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="size-4" />
                        <span>Pay ₹{amount || paymentData?.amountRupees || '199'} with Wallet</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    disabled={cancelling || processingWallet}
                    className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </main>

      {/* MINIMAL BOTTOM BAR: Only copyright, absolutely no links */}
      <footer className="w-full bg-white border-t border-slate-200/60 py-3 text-center text-[11px] text-slate-400">
        Zyndex Secure Checkout & Payment Processing
      </footer>
    </div>
  );
}
