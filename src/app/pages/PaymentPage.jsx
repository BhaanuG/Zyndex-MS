import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Copy, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  HelpCircle, 
  Loader2,
  ExternalLink,
  ChevronRight,
  Receipt,
  RotateCcw
} from 'lucide-react';
import UserLayout from '@/app/components/UserLayout';
import { useAuth } from '@/app/context/AuthContext';
import subscriptionService from '@/services/api/subscriptionService';

export default function PaymentPage() {
  const { name, email, amount, orderId } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState('qr'); // 'qr' | 'utr' | 'review' | 'details'
  
  // 5 minutes (300 seconds) countdown
  const [timeLeft, setTimeLeft] = useState(300);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedUtrHint, setCopiedUtrHint] = useState(false);
  
  // UTR Form state
  const [utrNumber, setUtrNumber] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrError, setUtrError] = useState('');

  // Cancelling state
  const [cancelling, setCancelling] = useState(false);

  // Fetch initial payment / order status
  useEffect(() => {
    let isMounted = true;
    const fetchOrder = async () => {
      try {
        setLoading(true);
        // Use orderStatus or paymentStatus
        const res = await subscriptionService.getOrderStatus(orderId);
        if (!isMounted) return;
        setPaymentData(res);

        const currentStatus = (res.status || '').toUpperCase();
        if (['SUCCESS', 'CANCELLED', 'FAILED', 'EXPIRED'].includes(currentStatus)) {
          // If already in a terminal state, directly display Order Details (replay protection)
          setStep('details');
        } else if (currentStatus === 'REVIEW_REQUIRED') {
          setStep('review');
        } else {
          setStep('qr');
          if (res.expiresAt) {
            const nowSec = Math.floor(Date.now() / 1000);
            const remaining = Math.max(0, res.expiresAt - nowSec);
            setTimeLeft(remaining > 0 ? remaining : 0);
          }
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

  // Circular timer and countdown tick
  useEffect(() => {
    if (step !== 'qr' && step !== 'utr') return;
    if (timeLeft <= 0) {
      // Mark as expired in UI and trigger status check
      if (paymentData?.status !== 'EXPIRED') {
        setPaymentData(prev => prev ? ({ ...prev, status: 'EXPIRED' }) : null);
        setStep('details');
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPaymentData(p => p ? ({ ...p, status: 'EXPIRED' }) : null);
          setStep('details');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, timeLeft, paymentData?.status]);

  // Polling payment status while waiting
  useEffect(() => {
    if (step === 'details') return;
    if (!paymentData?.paymentId) return;

    const poll = setInterval(async () => {
      try {
        const res = await subscriptionService.getPaymentStatus(paymentData.paymentId);
        const st = (res.status || '').toUpperCase();
        if (st === 'SUCCESS') {
          clearInterval(poll);
          setPaymentData(res);
          await refreshUser();
          setStep('details');
        } else if (st === 'CANCELLED' || st === 'FAILED' || st === 'EXPIRED') {
          clearInterval(poll);
          setPaymentData(res);
          setStep('details');
        } else if (st === 'REVIEW_REQUIRED') {
          setPaymentData(res);
          setStep('review');
        }
      } catch (e) {
        console.warn('Status poll warning:', e);
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [step, paymentData?.paymentId, refreshUser]);

  const handleCancelPayment = async () => {
    if (!paymentData?.paymentId) return;
    setCancelling(true);
    try {
      await subscriptionService.cancelPayment(paymentData.paymentId);
      setPaymentData(prev => ({ ...prev, status: 'CANCELLED' }));
      setStep('details');
    } catch (err) {
      setError(err.message || 'Failed to cancel payment.');
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmToUtrStep = () => {
    setStep('utr');
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
      setStep('review');
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

  // SVG Circular Clock dimensions
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / 300) * circumference;

  const safeUserName = encodeURIComponent(user?.name ? user.name.replace(/\s+/g, '-') : name || 'Scholar');
  const safeUserEmail = encodeURIComponent(user?.email || email || 'user@zyndex.com');
  const billingProfilePath = `/Zyndex/User/${safeUserName}/${safeUserEmail}/Profile/Billing`;

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-[75vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="size-10 text-orange-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Initializing secure payment order...</p>
        </div>
      </UserLayout>
    );
  }

  if (error && !paymentData) {
    return (
      <UserLayout>
        <div className="min-h-[75vh] max-w-xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="size-16 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="size-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Payment Order Unavailable</h2>
          <p className="text-sm text-slate-600">{error}</p>
          <div className="pt-4">
            <Link
              to={billingProfilePath}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-md transition-all"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Billing & Plans</span>
            </Link>
          </div>
        </div>
      </UserLayout>
    );
  }

  const effectiveStatus = (paymentData?.status || 'PENDING').toUpperCase();
  const isTerminal = ['SUCCESS', 'CANCELLED', 'FAILED', 'EXPIRED'].includes(effectiveStatus);

  return (
    <UserLayout>
      <div className="min-h-[calc(100vh+80px)] pb-32 max-w-4xl mx-auto px-4 py-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <Link
            to={billingProfilePath}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Plans & Billing</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Order #{orderId}</span>
          </div>
        </div>

        {/* REPLAY PROTECTION / COMPLETED VIEW */}
        {step === 'details' || isTerminal ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden p-8 md:p-10 space-y-8"
          >
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center size-20 rounded-full mx-auto shadow-sm">
                {effectiveStatus === 'SUCCESS' && (
                  <div className="size-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="size-10" />
                  </div>
                )}
                {effectiveStatus === 'CANCELLED' && (
                  <div className="size-20 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                    <XCircle className="size-10" />
                  </div>
                )}
                {effectiveStatus === 'FAILED' && (
                  <div className="size-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <XCircle className="size-10" />
                  </div>
                )}
                {effectiveStatus === 'EXPIRED' && (
                  <div className="size-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Clock className="size-10" />
                  </div>
                )}
              </div>

              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {effectiveStatus === 'SUCCESS' && 'Payment Completed Successfully'}
                {effectiveStatus === 'CANCELLED' && 'Payment Order Cancelled'}
                {effectiveStatus === 'FAILED' && 'Payment Declined / Failed'}
                {effectiveStatus === 'EXPIRED' && 'Payment Session Expired'}
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                {effectiveStatus === 'SUCCESS' && 'Your subscription plan has been activated. Thank you for your payment.'}
                {effectiveStatus === 'CANCELLED' && 'This payment order was cancelled by you. No charges have been deducted.'}
                {effectiveStatus === 'FAILED' && (paymentData?.failureReason || 'Your payment was declined or could not be completed.')}
                {effectiveStatus === 'EXPIRED' && 'The 5-minute payment window for this QR code has elapsed. Please start a new checkout session if you wish to upgrade.'}
              </p>
            </div>

            {/* Order Details Receipt Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Transaction Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  effectiveStatus === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                  effectiveStatus === 'CANCELLED' ? 'bg-slate-200 text-slate-800' :
                  effectiveStatus === 'EXPIRED' ? 'bg-amber-100 text-amber-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {effectiveStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Plan Requested</span>
                  <span className="font-bold text-slate-800">{paymentData?.planId || 'Student Plus'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Amount</span>
                  <span className="font-bold text-slate-800">₹{amount || paymentData?.amountRupees || '199.00'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Order ID</span>
                  <span className="font-mono text-xs text-slate-700">{orderId}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Payment ID</span>
                  <span className="font-mono text-xs text-slate-700">{paymentData?.paymentId || 'N/A'}</span>
                </div>
                {paymentData?.utr && (
                  <div className="md:col-span-2">
                    <span className="text-xs text-slate-500 block">Submitted UTR Reference</span>
                    <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                      {paymentData.utr}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={billingProfilePath}
                className="px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl text-center shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="size-4" />
                <span>Return to Billing & Plans</span>
              </Link>
            </div>
          </motion.div>
        ) : step === 'review' ? (
          /* PAYMENT ON HOLD / UTR REVIEW STATE */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-blue-200/80 shadow-xl overflow-hidden p-8 md:p-10 space-y-6 text-center"
          >
            <div className="size-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
              <Receipt className="size-10" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                Under Admin Verification
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                Payment Verification On Hold
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Thank you! Your 12-digit UTR (<span className="font-mono font-bold text-slate-900">{paymentData?.utr || utrNumber}</span>) has been securely registered and an automated notification has been dispatched to <strong className="text-slate-800">Bhaanugali@gmail.com</strong>.
              </p>
            </div>

            <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-2xl max-w-md mx-auto text-left text-xs text-blue-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-950">
                <CheckCircle2 className="size-4 text-blue-600" />
                <span>What happens next?</span>
              </div>
              <p className="leading-relaxed text-blue-800">
                1. Our administrator checks the bank credit against your submitted UTR reference.
              </p>
              <p className="leading-relaxed text-blue-800">
                2. Upon confirmation, your plan status and access entitlements will automatically update.
              </p>
              <p className="leading-relaxed text-blue-800">
                3. A formal confirmation email with timestamp will be sent to your inbox.
              </p>
            </div>

            <div className="pt-4 flex justify-center">
              <Link
                to={billingProfilePath}
                className="px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <span>Go to User Billing Profile</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </motion.div>
        ) : step === 'utr' ? (
          /* STEP 2: UTR NUMBER SUBMISSION */
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden p-8 md:p-10 space-y-8"
          >
            <div className="flex items-center justify-between pb-6 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Step 2 of 2</span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">Submit Transaction Reference (UTR)</h2>
              </div>
              <button
                type="button"
                onClick={() => setStep('qr')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="size-3.5" />
                <span>View QR Code Again</span>
              </button>
            </div>

            {/* Educational Info: What is UTR & Where to find it */}
            <div className="bg-orange-50/60 border border-orange-200/70 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="size-5 text-orange-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-orange-950">What is a UTR Number?</h4>
                  <p className="text-xs text-orange-900/80 leading-relaxed">
                    UTR stands for <strong>Unique Transaction Reference</strong>. It is a 12-digit numeric identifier generated by Indian banking systems and UPI rails for every payment. It uniquely verifies that your money reached the destination.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white p-3 rounded-xl border border-orange-200/60 shadow-xs">
                  <span className="font-bold text-slate-900 block mb-1">Google Pay</span>
                  <span className="text-slate-600">Look for <strong>"UPI transaction ID"</strong> in payment details (12 digits).</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-orange-200/60 shadow-xs">
                  <span className="font-bold text-slate-900 block mb-1">PhonePe</span>
                  <span className="text-slate-600">Look for <strong>"UTR"</strong> under Transfer Details (12 digits).</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-orange-200/60 shadow-xs">
                  <span className="font-bold text-slate-900 block mb-1">Paytm / Cred / Others</span>
                  <span className="text-slate-600">Look for <strong>"UPI Ref No"</strong> or <strong>"Ref No"</strong> (12 digits).</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitUtr} className="space-y-6 max-w-lg mx-auto pt-2">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800">
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
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-lg font-bold text-slate-900 tracking-wider text-center focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-4 text-xs font-mono text-slate-400">
                    {utrNumber.length}/12
                  </span>
                </div>
                {utrError && (
                  <p className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1">
                    <AlertCircle className="size-3.5" />
                    <span>{utrError}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={submittingUtr || utrNumber.length !== 12}
                  className="flex-1 py-3.5 px-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submittingUtr ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Verifying & Submitting...</span>
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
                  className="py-3.5 px-5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Payment'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* STEP 1: ACTIVE PAYMENT QR SCREEN WITH 5-MIN CLOCK TIMER */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden p-6 md:p-10"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Left Column: QR Code + Dual Timer */}
              <div className="md:col-span-6 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-5">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600">Scan UPI QR Code</span>
                  <p className="text-xs text-slate-500">Pay using Google Pay, PhonePe, Paytm or any UPI app</p>
                </div>

                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 relative group">
                  <img
                    src={paymentData?.qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3D918897337687%40waaxis%26am%3D${amount || 199}`}
                    alt="UPI Payment QR Code"
                    className="size-56 md:size-60 object-contain rounded-xl"
                  />
                  <div className="absolute inset-0 bg-orange-600/5 rounded-xl pointer-events-none" />
                </div>

                {/* Circular Clock Timer with Digital Countdown underneath */}
                <div className="flex flex-col items-center space-y-2 pt-2">
                  <div className="relative size-32 flex items-center justify-center">
                    <svg className="size-32 -rotate-90 transform" viewBox="0 0 120 120">
                      {/* Background circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        className="text-slate-200"
                        strokeWidth="7"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        className={timeLeft < 60 ? 'text-red-500' : 'text-orange-500'}
                        strokeWidth="7"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>

                    {/* Clock Icon inside circle */}
                    <div className="absolute flex flex-col items-center justify-center">
                      <Clock className={`size-6 ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Timer</span>
                    </div>
                  </div>

                  {/* Medium digital clock indicator right underneath circular clock */}
                  <div className="text-center">
                    <span className={`font-mono text-2xl font-black tracking-wider ${
                      timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-slate-900'
                    }`}>
                      {formatTimer(timeLeft)}
                    </span>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                      QR code expires in 5 minutes
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Details + Action Buttons */}
              <div className="md:col-span-6 space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected Plan</span>
                  <h3 className="text-3xl font-black text-slate-900 mt-1">
                    ₹{amount || paymentData?.amountRupees || '199'}
                  </h3>
                  <p className="text-sm font-semibold text-orange-600 mt-0.5">
                    {paymentData?.planId || 'Student Plus'} Membership
                  </p>
                </div>

                {/* Receiver UPI Info Box */}
                <div className="p-4 bg-orange-50/50 border border-orange-200/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Receiver UPI ID</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentData?.receiverUpiId || '918897337687@waaxis');
                        setCopiedUpi(true);
                        setTimeout(() => setCopiedUpi(false), 2000);
                      }}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedUpi ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-800 bg-white px-3.5 py-2.5 rounded-xl border border-orange-200 select-all">
                    {paymentData?.receiverUpiId || '918897337687@waaxis'}
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="size-4 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">1</span>
                    <span>Scan the QR code above with any UPI app on your mobile device.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="size-4 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">2</span>
                    <span>Complete the transfer of ₹{amount || 199}.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="size-4 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">3</span>
                    <span>Click <strong>Confirm Payment</strong> below to provide your 12-digit UTR reference.</span>
                  </div>
                </div>

                {/* Two Explicit Actions: Cancel Payment or Confirm Payment */}
                <div className="pt-4 space-y-3">
                  <button
                    type="button"
                    onClick={handleConfirmToUtrStep}
                    className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Confirm Payment (I have paid)</span>
                    <ArrowRight className="size-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    disabled={cancelling}
                    className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Cancelling Order...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="size-4 text-slate-500" />
                        <span>Cancel Payment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </UserLayout>
  );
}
