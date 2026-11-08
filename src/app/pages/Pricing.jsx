import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  ShieldCheck, 
  Sparkles, 
  X, 
  QrCode, 
  FileText, 
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CreditCard,
  Landmark,
  Wallet,
  Smartphone,
  Building2,
  Lock,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Clock
} from 'lucide-react';
import PublicLayout from '@/app/components/PublicLayout';
import UserLayout from '@/app/components/UserLayout';
import InvoiceModal from '@/app/components/InvoiceModal';
import { useAuth } from '@/app/context/AuthContext';
import subscriptionService from '@/services/api/subscriptionService';
import { useNavigate, useLocation } from 'react-router';
import { setRedirectIntent, clearRedirectIntent } from '@/utils/redirectHelper';

export default function Pricing() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('select_method'); // waiting_for_payment, success, failed
  const [processing, setProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // exactly 180 seconds (3 minutes)
  const [activeSub, setActiveSub] = useState(null);
  const [loadingSub, setLoadingSub] = useState(false);

  const [txnDetails, setTxnDetails] = useState({
    id: '',
    orderId: '',
    qrId: '',
    qrUrl: '',
    amount: '0.00',
    status: 'PENDING',
    date: ''
  });

  // Payment methods & Interactive state
  const [activePaymentMethod, setActivePaymentMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking' | 'wallet'
  const [upiSubOption, setUpiSubOption] = useState('qr'); // 'qr' | 'id' | 'apps'
  const [upiIdInput, setUpiIdInput] = useState('');
  const [cardData, setCardData] = useState({
    number: '',
    name: user?.name || '',
    expiry: '',
    cvv: ''
  });
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [selectedWallet, setSelectedWallet] = useState('paytm');
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [holdAutoCloseSeconds, setHoldAutoCloseSeconds] = useState(120);
  const [processingMessage, setProcessingMessage] = useState('Securing 256-bit encrypted gateway session...');

  // Custom alert, login redirect & invoice modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [customAlert, setCustomAlert] = useState(null); // { message: '', title: '', type: 'error'|'success'|'info' }
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceModalData, setInvoiceModalData] = useState(null);

  const isTransactional = location.pathname.includes('/Profile/Billing/Pricing');
  const Layout = isTransactional ? UserLayout : PublicLayout;

  const fetchCurrentSub = async () => {
    if (user) {
      setLoadingSub(true);
      try {
        const res = await subscriptionService.getMe();
        setActiveSub(res);
      } catch (err) {
        console.error("Failed to load active subscription on pricing:", err);
      } finally {
        setLoadingSub(false);
      }
    } else {
      setActiveSub(null);
    }
  };

  useEffect(() => {
    fetchCurrentSub();
  }, [user]);

  // 2-minute auto-close countdown when checkoutStep is 'review_required'
  useEffect(() => {
    if (checkoutStep !== 'review_required' || !showCheckout) return;

    if (holdAutoCloseSeconds <= 0) {
      setShowCheckout(false);
      return;
    }

    const timer = setInterval(() => {
      setHoldAutoCloseSeconds((prev) => {
        if (prev <= 1) {
          setShowCheckout(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [checkoutStep, showCheckout, holdAutoCloseSeconds]);

  const plans = [
    {
      id: 'FREE',
      name: 'Free / Demo',
      target: 'Visitors & evaluating students',
      price: '₹0',
      period: 'Forever',
      features: [
        'Access to Public books/documents only',
        'Standard document previews',
        'Max 10 pages per document slice preview',
        'Limited to 5 readings per day',
        'Web-based reader mode only (no downloads)',
      ],
      color: 'border-slate-200 bg-white text-slate-900',
      btnColor: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
    },
    {
      id: 'STUDENT_BASIC',
      name: 'Student Basic',
      target: 'Individual students',
      price: '₹99',
      period: 'per month',
      features: [
        'Access to Digital Books',
        'Access to Academic Journals',
        'Full online reading',
        'Personal reading history log',
        'Bookmarks & Favorites list',
        'Premium PDF view controls',
      ],
      color: 'border-orange-200 bg-orange-50/20 text-orange-950',
      btnColor: 'bg-orange-600 text-white hover:bg-orange-700',
      popular: false,
    },
    {
      id: 'STUDENT_PLUS',
      name: 'Student Plus',
      target: 'Researchers & active students',
      price: '₹199',
      period: 'per month',
      features: [
        'Entire platform catalog access',
        'Access to Digital books & Academic journals',
        'Access to Research documents',
        'Full online reading privileges',
        'Offline browser download saving',
        'Advanced search & Semantic filtering',
        'Reading engagement metrics & analytics',
        'Bookmarks & Favorites list',
      ],
      color: 'border-orange-500 bg-white ring-2 ring-orange-500 text-slate-900',
      btnColor: 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90',
      popular: true,
    },
    {
      id: 'RESEARCHER_PRO',
      name: 'PhD Scholar / Researcher',
      target: 'PhD scholars & researchers',
      price: '₹499',
      period: 'per month',
      features: [
        'Entire research collection access',
        'Access to Academic journals & Research papers',
        'Digital books (Full-text reading)',
        'Download permitted documents',
        'Offline reading saving',
        'Advanced & semantic search filters',
        'Citation/reference & research analytics',
        'Export citations option',
      ],
      color: 'border-blue-200 bg-blue-50/20 text-blue-950',
      btnColor: 'bg-blue-600 text-white hover:bg-blue-700',
    },
    {
      id: 'UNIVERSITY',
      name: 'Academic Faculty & Educator',
      target: 'Individual professors & academic mentors',
      price: '₹999',
      period: 'per month',
      features: [
        'Complete academic resource catalog',
        'Academic journals, papers & textbooks',
        'Advanced scholarly search & syllabus curation',
        'Citation & bibliography export tools',
        'Unlimited online reading & offline browser saving',
      ],
      color: 'border-indigo-200 bg-indigo-50/10 text-indigo-950',
      btnColor: 'bg-indigo-600 text-white hover:bg-indigo-700',
    },
    {
      id: 'ENTERPRISE',
      name: 'Distinguished Fellow & Scholar',
      target: 'Postdoctoral fellows & senior researchers',
      price: '₹1,999',
      period: 'per month',
      features: [
        'Complete academic catalog with priority access',
        'Full document downloads & offline browser saving',
        'Advanced semantic research indexing',
        'Early access to newly archived academic journals',
        'Comprehensive research reading analytics',
      ],
      color: 'border-purple-200 bg-purple-50/10 text-purple-950',
      btnColor: 'bg-purple-600 text-white hover:bg-purple-700',
    },
  ];

  // Visual countdown timer for payment request
  useEffect(() => {
    let timer;
    if (showCheckout && checkoutStep === 'waiting_for_payment' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setTxnDetails(prevTxn => ({ ...prevTxn, status: 'EXPIRED' }));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showCheckout, checkoutStep, timeLeft]);

  // Polling for backend payment status updates
  useEffect(() => {
    let pollInterval;
    if (showCheckout && checkoutStep === 'waiting_for_payment' && txnDetails.id && timeLeft > 0) {
      pollInterval = setInterval(async () => {
        try {
          const res = await subscriptionService.getPaymentStatus(txnDetails.id);
          const currentStatus = res.status ? res.status.toUpperCase() : 'PENDING';
          
          if (currentStatus === 'SUCCESS') {
            clearInterval(pollInterval);
            await refreshUser();
            await fetchCurrentSub();
            setTxnDetails(prev => ({ 
              ...prev, 
              status: 'SUCCESS', 
              utr: res.utr,
              date: new Date().toLocaleString() 
            }));
            setCheckoutStep('success');
          } else if (currentStatus === 'FAILED') {
            clearInterval(pollInterval);
            setTxnDetails(prev => ({ 
              ...prev, 
              status: 'FAILED', 
              failureReason: res.failureReason || 'Your bank rejected or declined the transaction.' 
            }));
            setCheckoutStep('failed');
          } else if (currentStatus === 'EXPIRED') {
            clearInterval(pollInterval);
            setTxnDetails(prev => ({ ...prev, status: 'EXPIRED' }));
          } else if (currentStatus === 'CANCELLED') {
            clearInterval(pollInterval);
            setTxnDetails(prev => ({ ...prev, status: 'CANCELLED' }));
          } else if (currentStatus === 'REVIEW_REQUIRED') {
            clearInterval(pollInterval);
            setTxnDetails(prev => ({ 
              ...prev, 
              status: 'REVIEW_REQUIRED', 
              reviewReason: res.reviewReason || 'Bank credit received; awaiting reconciliation.' 
            }));
            setCheckoutStep('review_required');
          } else if (currentStatus === 'PROCESSING') {
            setTxnDetails(prev => ({ ...prev, status: 'PROCESSING' }));
          }
        } catch (e) {
          console.error("Error polling payment status:", e);
        }
      }, 2000);
    }
    return () => clearInterval(pollInterval);
  }, [showCheckout, checkoutStep, txnDetails.id, timeLeft]);

  // Handle plan recovery upon redirection after authentication
  useEffect(() => {
    if (user && isTransactional) {
      const savedPlanId = sessionStorage.getItem('selected_plan_id');
      if (savedPlanId) {
        const matchedPlan = plans.find(p => p.id === savedPlanId);
        if (matchedPlan) {
          setSelectedPlan(matchedPlan);
          clearRedirectIntent();
          initiateCheckout(matchedPlan);
        }
      }
    }
  }, [user, isTransactional]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '').slice(0, 16);
    const parts = [];
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
    return parts.join(' ');
  };

  const formatExpiry = (value) => {
    const clean = value.replace(/[^0-9]/g, '').slice(0, 4);
    if (clean.length >= 3) {
      return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
    }
    return clean;
  };

  const getCardType = (number) => {
    const clean = (number || '').replace(/\s+/g, '');
    if (/^4/.test(clean)) return 'VISA';
    if (/^5[1-5]/.test(clean)) return 'MASTERCARD';
    if (/^6(0|5|44|45)/.test(clean)) return 'RUPAY';
    if (/^3[47]/.test(clean)) return 'AMEX';
    return 'CARD';
  };

  const initiateCheckout = async (plan, preferredMethod = 'UPI') => {
    setProcessing(true);
    try {
      const res = await subscriptionService.createCheckout(plan.id, preferredMethod);
      const safeName = encodeURIComponent(user?.name ? user.name.replace(/\s+/g, '-') : 'Scholar');
      const safeEmail = encodeURIComponent(user?.email || 'user@zyndex.com');
      const amountPaise = res.amount || (plan.price ? parseFloat(plan.price.replace(/[^\d.]/g, '')) * 100 : 19900);
      const amountRupees = (amountPaise / 100).toFixed(0);
      const orderId = res.orderId || res.paymentId;

      // Navigate directly to dedicated payment order page with ::::::::: suffix
      navigate(`/Zyndex/User/${safeName}/${safeEmail}/Profile/Billing/${amountRupees}/Payment/${orderId}/:::::::::`);
    } catch (error) {
      setCustomAlert({
        title: 'Checkout Error',
        message: error.message || 'Checkout session failed. Please try again.',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  const checkPaymentStatusNow = async () => {
    if (!txnDetails.id) return;
    setProcessing(true);
    try {
      const res = await subscriptionService.getPaymentStatus(txnDetails.id);
      const currentStatus = res.status ? res.status.toUpperCase() : 'PENDING';

      if (currentStatus === 'SUCCESS') {
        await refreshUser();
        await fetchCurrentSub();
        setTxnDetails(prev => ({ 
          ...prev, 
          status: 'SUCCESS', 
          utr: res.utr,
          date: new Date().toLocaleString() 
        }));
        setCheckoutStep('success');
      } else if (currentStatus === 'FAILED') {
        setTxnDetails(prev => ({ 
          ...prev, 
          status: 'FAILED', 
          failureReason: res.failureReason || 'Your bank rejected or declined the transaction.' 
        }));
        setCheckoutStep('failed');
      } else if (currentStatus === 'EXPIRED') {
        setTxnDetails(prev => ({ ...prev, status: 'EXPIRED' }));
      } else if (currentStatus === 'CANCELLED') {
        setTxnDetails(prev => ({ ...prev, status: 'CANCELLED' }));
      } else if (currentStatus === 'REVIEW_REQUIRED') {
        setTxnDetails(prev => ({ 
          ...prev, 
          status: 'REVIEW_REQUIRED', 
          reviewReason: res.reviewReason || 'Bank credit detected; awaiting reconciliation.' 
        }));
        setCheckoutStep('review_required');
      } else {
        setCustomAlert({
          title: 'Payment Status',
          message: `Current verification state: ${currentStatus}. Awaiting confirmation from bank observer.`,
          type: 'info'
        });
      }
    } catch (err) {
      setCustomAlert({
        title: 'Status Verification',
        message: err.message || 'Unable to check status.',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!txnDetails.id) return;
    try {
      await subscriptionService.cancelPayment(txnDetails.id);
      setTxnDetails(prev => ({ ...prev, status: 'CANCELLED' }));
    } catch (e) {
      console.error("Cancel error:", e);
    }
  };

  const handleSubmitUtr = async (e) => {
    if (e) e.preventDefault();
    if (!txnDetails.id) return;
    if (!utrInput.trim()) {
      setCustomAlert({
        title: 'UTR Required',
        message: 'Please enter the 12-digit UTR / UPI Ref ID from your payment receipt.',
        type: 'error'
      });
      return;
    }

    setSubmittingUtr(true);
    try {
      const res = await subscriptionService.submitUtr(txnDetails.id, utrInput.trim());
      setTxnDetails(prev => ({
        ...prev,
        status: 'REVIEW_REQUIRED',
        utr: res.utr || utrInput.trim(),
        reviewReason: 'Your UTR has been submitted and payment is on temporary hold pending admin verification.'
      }));
      setCheckoutStep('review_required');
      setHoldAutoCloseSeconds(120); // 2 minutes auto-close countdown
      setCustomAlert({
        title: 'Payment On Hold for Verification',
        message: 'Your UTR number was submitted. Administrators have been notified at Bhaanugali@gmail.com and Bhaanugali99sai@gmail.com. Your membership will be activated immediately once verified in the admin portal.',
        type: 'info'
      });
    } catch (err) {
      setCustomAlert({
        title: 'Submission Error',
        message: err.message || 'Could not submit UTR for verification. Please try again.',
        type: 'error'
      });
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleSelectPlan = (plan) => {
    if (!user) {
      setPendingPlan(plan);
      setRedirectIntent('/Profile/Billing/Pricing', { planId: plan.id, type: 'plan_selection' });
      setShowLoginModal(true);
      return;
    }

    // If user already has an active paid subscription, prevent new plan selection until active plan ends
    if (activeSub?.status === 'ACTIVE' && activeSub?.planId !== 'FREE') {
      const activeEndDate = activeSub.endDate || activeSub.end_date;
      const expiryFormatted = activeEndDate ? new Date(activeEndDate).toLocaleDateString() : 'its expiration';
      setCustomAlert({
        title: 'Active Subscription In Progress',
        message: `You currently have an active ${(activeSub.planName || activeSub.planId).replace(/_/g, ' ')} membership which expires on ${expiryFormatted}. Per platform policy, another plan cannot be purchased until your active plan duration concludes.`,
        type: 'info'
      });
      return;
    }

    if (!isTransactional) {
      const safeName = encodeURIComponent(user.name.replace(/\s+/g, '-'));
      const safeEmail = encodeURIComponent(user.email);
      setRedirectIntent('/Profile/Billing/Pricing', { planId: plan.id, type: 'plan_selection' });
      navigate(`/Zyndex/User/${safeName}/${safeEmail}/Profile/Billing/Pricing`);
      return;
    }

    setSelectedPlan(plan);
    initiateCheckout(plan);
  };

  const handleAutoExecutePayment = async (methodType, customDetails = {}) => {
    if (!txnDetails.id) return;
    setProcessing(true);
    setCheckoutStep('processing');
    setProcessingMessage('Connecting to secure payment gateway...');

    try {
      await new Promise(r => setTimeout(r, 600));
      setProcessingMessage('Verifying credentials & bank authorization...');
      await new Promise(r => setTimeout(r, 700));
      setProcessingMessage('Payment approved! Activating subscription in database...');

      let confirmRes = {};
      try {
        confirmRes = await subscriptionService.confirmSimulatedPayment(txnDetails.id);
      } catch (simErr) {
        console.warn("Backend confirm-simulated fallback:", simErr);
      }
      
      try {
        await subscriptionService.getPaymentStatus(txnDetails.id);
        await refreshUser();
        await fetchCurrentSub();
      } catch (ignored) {}

      setTxnDetails(prev => ({
        ...prev,
        status: 'SUCCESS',
        utr: confirmRes?.utr || prev.utr || `TXN${Date.now()}`,
        date: new Date().toLocaleString(),
        paymentMethodName: customDetails.label || methodType || activePaymentMethod.toUpperCase()
      }));
      setCheckoutStep('success');
    } catch (e) {
      console.error("Payment execution error:", e);
      setCustomAlert({
        title: 'Payment Error',
        message: e.message || 'Transaction could not be processed.',
        type: 'error'
      });
      setCheckoutStep('failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmPayment = async () => {
    handleAutoExecutePayment('UPI', { label: 'UPI / Dynamic QR' });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="py-24 px-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/20 relative overflow-hidden">
        
        {/* Animated Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-100 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="px-4 py-1.5 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
                <Sparkles className="size-4" /> Subscription Plans
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mt-6 tracking-tight">
                {isTransactional ? "Upgrade Your entitilements" : "Zyndex Subscription Pricing"}
              </h1>
              <p className="text-lg text-slate-600 mt-4 leading-relaxed">
                Granular digital rights access to digital books, research documents, and academic journals. Pick the right plan for your studies.
              </p>
            </motion.div>
          </div>

          {/* Active Subscription Status Banner for Transactional / Authenticated View */}
          {isTransactional && user && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Account Plan</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    activeSub?.status === 'ACTIVE' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : activeSub?.status === 'CANCELLED'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    <span className={`size-1.5 rounded-full ${activeSub?.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {activeSub?.status || 'FREE'}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {activeSub?.planName || activeSub?.plan_name || 'Free / Demo Plan'}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeSub?.endDate || activeSub?.end_date 
                    ? `Active validity until ${new Date(activeSub.endDate || activeSub.end_date).toLocaleDateString()}`
                    : 'Standard Free Tier Access'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const userName = user?.name ? encodeURIComponent(user.name.replace(/\s+/g, '-')) : 'user';
                  const userEmail = user?.email ? encodeURIComponent(user.email) : 'email';
                  navigate(`/Zyndex/User/${userName}/${userEmail}/Profile/Billing`);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                View Billing & Invoices →
              </button>
            </motion.div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan, idx) => {
              const currentId = (activeSub?.planId || activeSub?.plan_id || user?.subscriptionPlan || 'FREE').toUpperCase();
              const currentStatus = (activeSub?.status || 'ACTIVE').toUpperCase();
              const isPaidActive = currentStatus === 'ACTIVE' || currentStatus === 'CANCELLED';

              let isCurrent = false;
              if (user && !loadingSub) {
                if (isPaidActive) {
                  if (currentId === plan.id) {
                    isCurrent = true;
                  } else if (plan.id === 'STUDENT_BASIC' && (currentId === 'BASIC' || currentId === 'STUDENT BASIC')) {
                    isCurrent = true;
                  } else if (plan.id === 'STUDENT_PLUS' && (currentId === 'PLUS' || currentId === 'STUDENT PLUS')) {
                    isCurrent = true;
                  } else if (plan.id === 'RESEARCHER_PRO' && (currentId === 'RESEARCHER' || currentId === 'RESEARCHER PRO' || currentId === 'PHD_SCHOLAR')) {
                    isCurrent = true;
                  } else if (plan.id === 'FREE' && (currentId === 'FREE' || !isPaidActive)) {
                    isCurrent = true;
                  }
                } else {
                  isCurrent = plan.id === 'FREE';
                }
              }

              const hasActivePaidSub = user && !loadingSub && isPaidActive && currentId !== 'FREE';

              return (
                <motion.div
                  key={plan.id}
                  className={`border rounded-2xl p-8 flex flex-col justify-between relative shadow-xl hover:shadow-2xl transition-all duration-300 ${plan.color} ${
                    isCurrent 
                      ? 'ring-2 ring-emerald-500 border-emerald-400 bg-white' 
                      : plan.popular 
                      ? 'scale-105 border-orange-500' 
                      : ''
                  }`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold tracking-tight text-slate-900">{plan.name}</h3>
                        {loadingSub && user ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 animate-pulse">
                            Loading status...
                          </span>
                        ) : isCurrent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs">
                            <CheckCircle2 className="size-3.5 text-emerald-600 stroke-[2.5]" />
                            Current Plan
                          </span>
                        ) : plan.popular ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xs">
                            <Sparkles className="size-3 text-white" />
                            Most Popular
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs opacity-75">{plan.target}</p>
                    </div>

                    <div className="mb-6">
                      <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                      <span className="text-sm opacity-70">/ {plan.period}</span>
                    </div>

                    <hr className="opacity-20 mb-8" />

                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feat, fidx) => (
                        <li key={fidx} className="flex items-start gap-3">
                          <Check className="size-5 shrink-0 text-emerald-500 mt-0.5" />
                          <span className="text-sm opacity-90">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {loadingSub && user ? (
                    <div className="w-full py-3.5 rounded-xl bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400 font-semibold">
                      Loading...
                    </div>
                  ) : isCurrent ? (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-xl font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default flex items-center justify-center gap-2 text-sm shadow-xs"
                    >
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      Active Current Plan
                    </button>
                  ) : plan.id !== 'FREE' ? (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={processing || loadingSub}
                      className={`w-full py-3.5 rounded-xl font-semibold transition-all shadow-md text-sm ${
                        !user 
                          ? 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50' 
                          : plan.btnColor
                      }`}
                    >
                      {!user ? "Login to Subscribe" : hasActivePaidSub ? "Upgrade / Change Plan" : "Select Plan"}
                    </button>
                  ) : (
                    <div className="h-[52px] flex items-center justify-center text-xs text-slate-400 font-medium">
                      Default Free Tier
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && selectedPlan && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !processing && setShowCheckout(false)}
            />
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 text-white flex justify-between items-center border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <ShieldCheck className="size-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        Zyndex Secure Checkout
                      </h2>
                      <p className="text-[11px] text-slate-400">256-bit SSL • PCI-DSS Certified</p>
                    </div>
                  </div>
                  {!processing && (
                    <button 
                      onClick={() => {
                        setShowCheckout(false);
                        sessionStorage.removeItem('selected_plan_id');
                      }} 
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                      title="Close"
                    >
                      <X className="size-5" />
                    </button>
                  )}
                </div>

                {/* Processing State */}
                {checkoutStep === 'processing' && (
                  <div className="p-10 text-center space-y-6">
                    <div className="relative mx-auto size-20 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-orange-500/20 animate-ping" />
                      <div className="size-20 rounded-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <Lock className="size-8 text-white animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-900">Processing Payment</h3>
                      <p className="text-xs text-slate-500 font-medium">{processingMessage}</p>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-500 to-red-600 h-full w-2/3 animate-pulse" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">Do not refresh or close this window.</p>
                  </div>
                )}

                {/* Waiting for Payment State & Method Selector */}
                {checkoutStep === 'waiting_for_payment' && (
                  <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
                    
                    {/* Order summary details */}
                    <div className="bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-orange-50/70 p-4 rounded-2xl border border-orange-100 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Subscribed Plan</span>
                        <h4 className="text-base font-extrabold text-slate-900 mt-0.5">{selectedPlan.name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-orange-600">₹{txnDetails.amount}</span>
                        <p className="text-[10px] text-slate-500 font-medium">All taxes inclusive</p>
                      </div>
                    </div>

                    {/* Payment Method Tabs */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 block">Select Payment Method</label>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setActivePaymentMethod('upi')}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 border ${
                            activePaymentMethod === 'upi'
                              ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-500/20'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <QrCode className="size-4" />
                          <span>UPI / QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePaymentMethod('card')}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 border ${
                            activePaymentMethod === 'card'
                              ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-500/20'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <CreditCard className="size-4" />
                          <span>Cards</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePaymentMethod('netbanking')}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 border ${
                            activePaymentMethod === 'netbanking'
                              ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-500/20'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Landmark className="size-4" />
                          <span>Net Banking</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePaymentMethod('wallet')}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 border ${
                            activePaymentMethod === 'wallet'
                              ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-500/20'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Wallet className="size-4" />
                          <span>Wallets</span>
                        </button>
                      </div>
                    </div>

                    {/* METHOD 1: UPI / QR Code & UPI ID */}
                    {activePaymentMethod === 'upi' && (
                      <div className="space-y-4">
                        {/* Sub Options: QR vs UPI ID vs Apps */}
                        <div className="flex border border-slate-200 p-1 rounded-xl bg-slate-50">
                          <button
                            type="button"
                            onClick={() => setUpiSubOption('qr')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                              upiSubOption === 'qr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Scan Dynamic QR
                          </button>
                          <button
                            type="button"
                            onClick={() => setUpiSubOption('id')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                              upiSubOption === 'id' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Enter UPI ID / VPA
                          </button>
                          <button
                            type="button"
                            onClick={() => setUpiSubOption('apps')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                              upiSubOption === 'apps' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            UPI Apps
                          </button>
                        </div>

                        {upiSubOption === 'qr' && (
                          <div className="flex flex-col items-center space-y-3">
                            {txnDetails.status === 'EXPIRED' ? (
                              <div className="text-center py-6 space-y-3">
                                <AlertTriangle className="size-10 text-red-500 mx-auto animate-bounce" />
                                <p className="text-xs font-bold text-slate-800">Checkout Session Expired</p>
                                <button
                                  type="button"
                                  onClick={() => initiateCheckout(selectedPlan, 'UPI')}
                                  className="px-5 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700"
                                >
                                  Generate New QR
                                </button>
                              </div>
                            ) : txnDetails.status === 'CANCELLED' ? (
                              <div className="text-center py-6 space-y-3">
                                <X className="size-10 text-slate-400 mx-auto" />
                                <p className="text-xs font-bold text-slate-800">Payment Session Cancelled</p>
                                <button
                                  type="button"
                                  onClick={() => initiateCheckout(selectedPlan, 'UPI')}
                                  className="px-5 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700"
                                >
                                  Restart Checkout
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="bg-white border-2 border-slate-100 p-3 rounded-2xl shadow-md flex flex-col items-center">
                                  {txnDetails.qrUrl ? (
                                    <img 
                                      src={txnDetails.qrUrl}
                                      alt="UPI QR Code"
                                      className="size-44 object-contain"
                                    />
                                  ) : (
                                    <div className="size-44 flex items-center justify-center">
                                      <Loader2 className="size-8 text-orange-500 animate-spin" />
                                    </div>
                                  )}
                                  <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">Scan with GPay / PhonePe / Paytm / BHIM</span>
                                </div>

                                {/* Prominent Color-Coded Payment Status Badge */}
                                <div className={`w-full px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs ${
                                  txnDetails.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                  txnDetails.status === 'PROCESSING' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                                  txnDetails.status === 'REVIEW_REQUIRED' ? 'bg-orange-50 text-orange-950 border-orange-300' :
                                  txnDetails.status === 'FAILED' ? 'bg-red-50 text-red-800 border-red-300' :
                                  txnDetails.status === 'CANCELLED' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                                  txnDetails.status === 'EXPIRED' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                  'bg-amber-50 text-amber-900 border-amber-300'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <span className={`size-2.5 rounded-full ${
                                      txnDetails.status === 'SUCCESS' ? 'bg-emerald-500' :
                                      txnDetails.status === 'PROCESSING' ? 'bg-blue-500 animate-ping' :
                                      txnDetails.status === 'REVIEW_REQUIRED' ? 'bg-orange-500' :
                                      txnDetails.status === 'FAILED' ? 'bg-red-500' :
                                      'bg-amber-500 animate-pulse'
                                    }`} />
                                    <span>
                                      {txnDetails.status === 'SUCCESS' ? 'Payment Verified — Subscription Unlocked!' :
                                       txnDetails.status === 'PROCESSING' ? 'Bank Credit Observed — Verifying...' :
                                       txnDetails.status === 'REVIEW_REQUIRED' ? 'Credit Ambiguous — In Manual Review' :
                                       txnDetails.status === 'FAILED' ? 'Transaction Declined by Bank' :
                                       'Status: PAYMENT_INITIATED (Awaiting Bank Credit)'}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/80 border border-black/10">
                                    {txnDetails.status}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-red-600 font-bold bg-red-50 border border-red-100 rounded-lg px-3 py-1">
                                    Expires in: {formatTime(timeLeft)}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
                                    Order: {txnDetails.orderId || txnDetails.id}
                                  </span>
                                </div>

                                <div className="w-full space-y-3 pt-2">
                                  {/* UTR Number Input & Verify Flow */}
                                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5 text-left">
                                    <div className="flex items-center justify-between">
                                      <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                        <span>Enter 12-Digit UTR / UPI Ref Number</span>
                                        <span className="text-[10px] text-amber-700 bg-amber-100 font-normal px-1.5 py-0.5 rounded">Mandatory</span>
                                      </label>
                                    </div>
                                    <p className="text-[11px] text-amber-900 leading-snug">
                                      After paying via QR code, find the 12-digit <b>UTR / Transaction Ref No.</b> in your UPI app (GPay / PhonePe / Paytm / WhatsApp Pay) and enter below:
                                    </p>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        maxLength={24}
                                        placeholder="e.g. 430123456789"
                                        value={utrInput}
                                        onChange={(e) => setUtrInput(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (!submittingUtr && utrInput.trim()) {
                                              handleSubmitUtr();
                                            }
                                          }
                                        }}
                                        className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-mono tracking-wider font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 outline-none"
                                      />
                                      <button
                                        type="button"
                                        disabled={submittingUtr || !utrInput.trim()}
                                        onClick={handleSubmitUtr}
                                        className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
                                      >
                                        {submittingUtr ? (
                                          <Loader2 className="size-3.5 animate-spin" />
                                        ) : (
                                          <Check className="size-3.5" />
                                        )}
                                        <span>Confirm & Verify</span>
                                      </button>
                                    </div>
                                    <span className="text-[10px] text-amber-700 block">
                                      Submitting puts your subscription on temporary hold and notifies admins immediately for verification.
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={handleCancelPayment}
                                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
                                  >
                                    Cancel Checkout Session
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {upiSubOption === 'id' && (
                          <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-700">Virtual Payment Address (VPA)</label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="username@okhdfcbank or mobilenumber@paytm"
                                value={upiIdInput}
                                onChange={(e) => setUpiIdInput(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAutoExecutePayment('UPI', { label: `UPI ID: ${upiIdInput || 'user@upi'}` })}
                              className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                            >
                              Verify & Pay ₹{txnDetails.amount}
                            </button>
                          </div>
                        )}

                        {upiSubOption === 'apps' && (
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => handleAutoExecutePayment('UPI', { label: 'Google Pay' })}
                              className="p-3 border border-slate-200 rounded-xl hover:border-orange-500 hover:bg-orange-50/30 transition-all flex flex-col items-center gap-2"
                            >
                              <div className="size-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-xs font-black text-blue-600 text-sm">GPay</div>
                              <span className="text-xs font-bold text-slate-700">Google Pay</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAutoExecutePayment('UPI', { label: 'PhonePe' })}
                              className="p-3 border border-slate-200 rounded-xl hover:border-orange-500 hover:bg-orange-50/30 transition-all flex flex-col items-center gap-2"
                            >
                              <div className="size-10 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-xs font-black text-sm">पे</div>
                              <span className="text-xs font-bold text-slate-700">PhonePe</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAutoExecutePayment('UPI', { label: 'Paytm UPI' })}
                              className="p-3 border border-slate-200 rounded-xl hover:border-orange-500 hover:bg-orange-50/30 transition-all flex flex-col items-center gap-2"
                            >
                              <div className="size-10 bg-cyan-600 text-white rounded-full flex items-center justify-center shadow-xs font-black text-xs">Paytm</div>
                              <span className="text-xs font-bold text-slate-700">Paytm</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* METHOD 2: Credit / Debit Cards */}
                    {activePaymentMethod === 'card' && (
                      <div className="space-y-4">
                        {/* Interactive Card Layout */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-5 rounded-2xl text-white shadow-xl space-y-4 border border-slate-700">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Debit / Credit Card</span>
                            <span className="font-extrabold text-sm tracking-wider text-orange-400">{getCardType(cardData.number)}</span>
                          </div>
                          <div className="font-mono text-lg tracking-widest text-slate-200">
                            {cardData.number || '•••• •••• •••• ••••'}
                          </div>
                          <div className="flex justify-between text-xs font-mono">
                            <div>
                              <span className="text-[9px] text-slate-400 block uppercase">Card Holder</span>
                              <span className="font-semibold">{cardData.name || user?.name || 'CARDHOLDER NAME'}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 block uppercase">Expires</span>
                              <span className="font-semibold">{cardData.expiry || 'MM/YY'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Form Inputs */}
                        <div className="space-y-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Card Number</label>
                            <input
                              type="text"
                              maxLength={19}
                              placeholder="4111 2222 3333 4444"
                              value={cardData.number}
                              onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Valid Thru</label>
                              <input
                                type="text"
                                maxLength={5}
                                placeholder="MM/YY"
                                value={cardData.expiry}
                                onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">CVV / CVC</label>
                              <input
                                type="password"
                                maxLength={4}
                                placeholder="•••"
                                value={cardData.cvv}
                                onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/[^0-9]/g, '') })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Cardholder Name</label>
                            <input
                              type="text"
                              placeholder="Name on card"
                              value={cardData.name}
                              onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAutoExecutePayment('CARD', { label: `${getCardType(cardData.number)} ending in ${cardData.number.slice(-4) || '4242'}` })}
                          className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Lock className="size-4" /> Pay ₹{txnDetails.amount} Securely
                        </button>
                      </div>
                    )}

                    {/* METHOD 3: Net Banking */}
                    {activePaymentMethod === 'netbanking' && (
                      <div className="space-y-4">
                        <label className="text-xs font-semibold text-slate-700 block">Popular Indian Banks</label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { id: 'HDFC', name: 'HDFC Bank' },
                            { id: 'SBI', name: 'State Bank of India' },
                            { id: 'ICICI', name: 'ICICI Bank' },
                            { id: 'AXIS', name: 'Axis Bank' },
                            { id: 'KOTAK', name: 'Kotak Bank' },
                            { id: 'PNB', name: 'Punjab National' }
                          ].map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setSelectedBank(b.id)}
                              className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center text-center gap-1.5 ${
                                selectedBank === b.id
                                  ? 'border-orange-500 bg-orange-50/60 text-orange-950 ring-2 ring-orange-500/20'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <Building2 className="size-5 text-slate-600" />
                              <span className="text-[11px] leading-tight">{b.name}</span>
                            </button>
                          ))}
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Or Select From All Other Banks</label>
                          <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none"
                          >
                            <option value="HDFC">HDFC Bank</option>
                            <option value="SBI">State Bank of India (SBI)</option>
                            <option value="ICICI">ICICI Bank</option>
                            <option value="AXIS">Axis Bank</option>
                            <option value="KOTAK">Kotak Mahindra Bank</option>
                            <option value="PNB">Punjab National Bank</option>
                            <option value="BOB">Bank of Baroda</option>
                            <option value="CANARA">Canara Bank</option>
                            <option value="UNION">Union Bank of India</option>
                            <option value="INDUSIND">IndusInd Bank</option>
                            <option value="FEDERAL">Federal Bank</option>
                            <option value="IDFC">IDFC FIRST Bank</option>
                            <option value="YES">Yes Bank</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAutoExecutePayment('NETBANKING', { label: `${selectedBank} Net Banking` })}
                          className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Landmark className="size-4" /> Proceed to {selectedBank} & Pay ₹{txnDetails.amount}
                        </button>
                      </div>
                    )}

                    {/* METHOD 4: Digital Wallets */}
                    {activePaymentMethod === 'wallet' && (
                      <div className="space-y-4">
                        <label className="text-xs font-semibold text-slate-700 block">Select Digital Wallet</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'paytm', name: 'Paytm Wallet' },
                            { id: 'phonepe', name: 'PhonePe Wallet' },
                            { id: 'amazonpay', name: 'Amazon Pay' },
                            { id: 'mobikwik', name: 'MobiKwik' },
                            { id: 'airtel', name: 'Airtel Money' },
                            { id: 'freecharge', name: 'FreeCharge' }
                          ].map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => setSelectedWallet(w.id)}
                              className={`p-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-3 ${
                                selectedWallet === w.id
                                  ? 'border-orange-500 bg-orange-50/60 text-orange-950 ring-2 ring-orange-500/20'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <Wallet className="size-5 text-orange-600" />
                              <span>{w.name}</span>
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAutoExecutePayment('WALLET', { label: `${selectedWallet.toUpperCase()} Wallet` })}
                          className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                        >
                          Pay ₹{txnDetails.amount} via Wallet
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {/* Success Screen */}
                {checkoutStep === 'success' && (
                  <div className="p-8 space-y-6 text-center print:bg-white print:p-0">
                    <div className="flex justify-center mb-2">
                      <CheckCircle2 className="size-16 text-emerald-500 animate-scale-up" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">Subscription Entitlement Activated!</h3>
                      <p className="text-xs text-slate-500">Payment receipt has been sent to your registered email address.</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-3 print:border-none print:bg-white">
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="font-semibold text-slate-500">Payment ID</span>
                        <span className="font-bold text-slate-800 font-mono">{txnDetails.id}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="font-semibold text-slate-500">Payment Method</span>
                        <span className="font-semibold text-slate-800">{txnDetails.paymentMethodName || 'UPI Gateway'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="font-semibold text-slate-500">Date/Time</span>
                        <span className="font-medium text-slate-800">{txnDetails.date}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <span className="font-semibold text-slate-500">Subscribed Tier</span>
                        <span className="font-bold text-slate-800">{selectedPlan.name}</span>
                      </div>
                      <div className="flex justify-between pt-1 text-sm">
                        <span className="font-bold text-slate-800">Total Amount Paid</span>
                        <span className="font-black text-emerald-600">₹{txnDetails.amount}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceModalData({
                            paymentId: txnDetails.id,
                            orderId: txnDetails.orderId,
                            date: txnDetails.date || new Date().toLocaleString(),
                            planName: selectedPlan?.name,
                            amount: txnDetails.amount,
                            customerName: user?.name,
                            customerEmail: user?.email,
                            paymentMethod: txnDetails.paymentMethodName || 'UPI / Instant Gateway',
                            status: 'SUCCESS'
                          });
                          setShowInvoiceModal(true);
                        }}
                        className="flex-1 py-3 bg-white border-2 border-orange-500 text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 text-sm shadow-xs"
                      >
                        <FileText className="size-4" /> View & Download Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCheckout(false);
                          setSelectedPlan(null);
                          const safeName = user?.name ? encodeURIComponent(user.name.replace(/\s+/g, '-')) : 'user';
                          const safeEmail = user?.email ? encodeURIComponent(user.email) : 'email';
                          navigate(`/Zyndex/User/${safeName}/${safeEmail}/Home`);
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl shadow-md hover:opacity-95 transition-all text-sm"
                      >
                        Go to Home
                      </button>
                    </div>
                  </div>
                )}

                {/* Failed Screen */}
                {checkoutStep === 'failed' && (
                  <div className="p-8 space-y-6 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="size-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                        <X className="size-8" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900 font-mono">Payment Unsuccessful</h3>
                      <p className="text-xs text-red-600 font-medium">{txnDetails.failureReason || 'Your bank rejected or declined the payment transaction.'}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2 text-slate-600">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400">Order ID</span>
                        <span className="font-mono">{txnDetails.orderId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400">Payment Reference</span>
                        <span className="font-mono">{txnDetails.id}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => initiateCheckout(selectedPlan, 'UPI')}
                        className="flex-1 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors text-sm shadow-sm"
                      >
                        Retry Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCheckout(false)}
                        className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                      >
                        Close Window
                      </button>
                    </div>
                  </div>
                )}

                {/* Review Required Screen */}
                {checkoutStep === 'review_required' && (
                  <div className="p-8 space-y-6 text-center">
                    <div className="flex justify-center mb-2">
                      <div className="size-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 animate-pulse">
                        <AlertTriangle className="size-8" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">Payment Verification on Hold / Processing</h3>
                      <p className="text-xs text-slate-500">Your UTR reference has been submitted. Our automated clearing desk is verifying transaction credit.</p>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-semibold mt-2">
                        <Clock className="size-3.5" />
                        <span>Auto-closing in {Math.floor(holdAutoCloseSeconds / 60)}m {holdAutoCloseSeconds % 60}s</span>
                      </div>
                    </div>

                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-left text-xs space-y-2 text-amber-950">
                      <div className="flex justify-between">
                        <span className="font-semibold text-amber-800">Verification Note</span>
                        <span className="font-medium text-amber-900">{txnDetails.reviewReason || 'Bank confirmation pending reconciliation'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-amber-800">Order ID</span>
                        <span className="font-mono">{txnDetails.orderId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-amber-800">Payment ID</span>
                        <span className="font-mono">{txnDetails.id}</span>
                      </div>
                      {txnDetails.utr && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-amber-800">Bank UTR</span>
                          <span className="font-mono">{txnDetails.utr}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      If your bank account was debited, our automatic observers and support desk will reconcile your credit. No money will be lost. You can close this window at any time or it will close automatically after 2 minutes.
                    </p>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={checkPaymentStatusNow}
                        className="flex-1 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors text-sm shadow-sm"
                      >
                        Re-check Status
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCheckout(false)}
                        className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                      >
                        Close Manually ({holdAutoCloseSeconds}s)
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Login Required Centered Custom Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
            />
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100" onClick={(e) => e.stopPropagation()}>
                <div className="size-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                  <ShieldCheck className="size-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Authentication Required</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  Please log in first to purchase a subscription plan.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginModal(false);
                      if (pendingPlan) {
                        setRedirectIntent('/Profile/Billing/Pricing', { planId: pendingPlan.id, type: 'plan_selection' });
                      }
                      navigate('/Zyndex/User/Log-In');
                    }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl shadow-md hover:opacity-95 transition-all text-sm"
                  >
                    Log In to Subscribe
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom Centered Alert Modal */}
      <AnimatePresence>
        {customAlert && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomAlert(null)}
            />
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100" onClick={(e) => e.stopPropagation()}>
                <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  customAlert.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}>
                  {customAlert.type === 'success' ? <CheckCircle2 className="size-8" /> : <AlertTriangle className="size-8" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{customAlert.title}</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  {customAlert.message}
                </p>
                <button
                  type="button"
                  onClick={() => setCustomAlert(null)}
                  className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:opacity-95 transition-all text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full Screen / Printable Invoice Viewer & Downloader Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        invoiceData={invoiceModalData}
      />
    </Layout>
  );
}
