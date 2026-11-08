import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { motion } from 'motion/react';
import { BookOpen, Mail, Lock, ArrowRight, Menu, X, Eye, EyeOff, Shield, User, AlertCircle, GraduationCap, KeyRound, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import authService, { validateLogin as validateLoginRequest } from '@/services/api/authService';
import apiClient from '@/services/api/apiClient';
import logService from '@/services/api/logService';
import { resolveAuthRedirectPath, setRedirectIntent } from '@/utils/redirectHelper';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authReady, isAuthenticated, role, user } = useAuth();
  const [activeTab, setActiveTab] = useState(() =>
    location.pathname.includes('/Admin/') ? 'admin' : 'user'
  );
  const isUserSignUpRoute = location.pathname.includes('/User/Sign-Up');
  const isSignUpMode = activeTab === 'user' && isUserSignUpRoute;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userType, setUserType] = useState('Student');
  const [otherDescription, setOtherDescription] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Inline OTP states for Signup
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Terminated user detection & maintenance mode check
  const [isTerminatedUser, setIsTerminatedUser] = useState(false);
  const [terminatedMessage, setTerminatedMessage] = useState('');
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(true);

  useEffect(() => {
    // Check maintenance status
    apiClient.get('/users/maintenance-mode')
      .then(res => {
        // Only consider maintenance active if officially active (after 15-min timer)
        if (res?.isOfficiallyActive || (res?.maintenanceMode && !res?.scheduledAt)) {
          setIsMaintenanceActive(true);
        } else {
          setIsMaintenanceActive(false);
        }
      })
      .catch(() => {});
  }, []);

  const handleEmailBlur = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@') || isSignUpMode) return;
    try {
      const res = await authService.checkUserStatus(trimmed);
      if (res?.terminated) {
        setIsTerminatedUser(true);
        setTerminatedMessage('The given email ID has been terminated by an administrator. Please contact administrator.');
        setError('The given email ID has been terminated by an administrator. Please contact administrator.');
      } else {
        setIsTerminatedUser(false);
        setTerminatedMessage('');
        if (error.includes('terminated')) setError('');
      }
    } catch (err) {
      // Ignored
    }
  };

  // Capture incoming redirect intentions from location state or query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectParam = params.get('redirect') || params.get('returnTo');
    const fromState = location.state?.from;

    if (redirectParam) {
      setRedirectIntent(redirectParam, { type: 'query_param' });
    } else if (fromState) {
      const fromPath = typeof fromState === 'string' ? fromState : (fromState.pathname + (fromState.search || ''));
      setRedirectIntent(fromPath, { type: 'protected_route' });
    }
  }, [location]);

  useEffect(() => {
    setActiveTab(location.pathname.includes('/Admin/') ? 'admin' : 'user');
  }, [location.pathname]);

  useEffect(() => {
    const path = location.pathname;
    const targetPath = activeTab === 'user'
      ? (path.includes('/User/Sign-Up') ? '/Zyndex/User/Sign-Up' : '/Zyndex/User/Log-In')
      : '/Zyndex/Admin/Log-In';
    if (path !== targetPath && (path.includes('/Log-In') || path.includes('/Sign-In') || path.includes('/Sign-Up'))) {
      navigate(targetPath, { replace: true });
    }
  }, [activeTab, navigate, location.pathname]);

  useEffect(() => {
    if (!authReady) return;
    sessionStorage.removeItem('pending_auth');
  }, [authReady]);

  useEffect(() => {
    if (location.state?.signupSuccess) {
      setSuccessMessage(location.state.signupSuccess);
    }
    if (location.state?.errorMessage) {
      setError(location.state.errorMessage);
      if (location.state.errorMessage.includes('terminated')) {
        setIsTerminatedUser(true);
        setTerminatedMessage(location.state.errorMessage);
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (!authReady || !isAuthenticated || !user) return;

    const targetPath = resolveAuthRedirectPath(user);

    if (location.pathname.includes('/Log-In') || location.pathname.includes('/Sign-In')) {
      navigate(targetPath, { replace: true });
    }
  }, [authReady, isAuthenticated, role, user, location.pathname, navigate]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const handleSendSignupOtp = async () => {
    setError('');
    setOtpSuccessMessage('');
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Please enter your full name first.');
      return;
    }
    if (!trimmedEmail) {
      setError('Please enter your email address to receive the verification OTP.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSendingOtp(true);
    try {
      const effectiveRoleLabel = userType === 'Other' && otherDescription.trim() ? otherDescription.trim() : userType;
      await apiClient.post('/send-otp', {
        email: trimmedEmail,
        role: 'user',
        purpose: 'SIGNUP',
        name: trimmedName,
        userType: effectiveRoleLabel,
        force: true,
      });
      setOtpSent(true);
      setOtpCountdown(120);
      setOtpSuccessMessage(`Security OTP has been sent to ${trimmedEmail}. It will expire in 120 seconds. Please enter the 4-digit code.`);
    } catch (err) {
      setError(err.message || 'Failed to send verification OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifySignupOtp = async (codeToVerify) => {
    const code = (codeToVerify || otpCode).trim();
    if (code.length !== 4) {
      setError('Please enter all 4 digits of the OTP.');
      return;
    }

    setVerifyingOtp(true);
    setError('');
    try {
      await apiClient.post('/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: code,
        role: 'user',
      });
      setOtpVerified(true);
      setOtpSuccessMessage('Email verified successfully! You can now create your account.');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please check and try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isSignUpMode) {
        if (!otpVerified) {
          setError('Please verify your email address with the OTP before creating your account.');
          setSubmitting(false);
          return;
        }

        if (!agreedToTerms) {
          setError('Please review and agree to the Terms of Service and Privacy Policy to create your account.');
          setSubmitting(false);
          return;
        }

        const trimmedName = name.trim();
        const trimmedEmail = email.trim();

        // Password complexity validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(password)) {
          setError('Password must be at least 8 characters long, contain at least one uppercase letter, one digit, and one special character.');
          setSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match. Please ensure both passwords match identically.');
          setSubmitting(false);
          return;
        }

        const effectiveRoleLabel = userType === 'Other' && otherDescription.trim() ? otherDescription.trim() : userType;

        // Register directly since OTP is verified on page!
        await authService.register({
          name: trimmedName,
          email: trimmedEmail,
          password,
          role: 'user',
          userType: effectiveRoleLabel,
          profession: otherDescription.trim(),
          collegeName: institutionName.trim(),
        });

        sessionStorage.removeItem('pending_auth');
        sessionStorage.removeItem('human_verification_passed');
        sessionStorage.removeItem('mail_otp_request_state');

        setSuccessMessage('Your account has been created and verified successfully! Please sign in with your password.');
        setName('');
        setEmail('');
        setPassword('');
        setOtpCode('');
        setOtpSent(false);
        setOtpVerified(false);
        setSubmitting(false);

        setTimeout(() => {
          navigate('/Zyndex/User/Log-In', {
            replace: true,
            state: {
              signupSuccess: 'Your account has been created and verified successfully. Please sign in.',
            },
          });
        }, 1200);
        return;
      }

      const loginValidator =
        typeof authService?.validateLogin === 'function'
          ? authService.validateLogin
          : validateLoginRequest;

      await loginValidator({
        email: email.trim(),
        password,
        role: activeTab,
      });

      if (activeTab === 'admin') {
        logService.createLog({
          service: 'AUTH-SERVICE',
          level: 'INFO',
          action: 'ADMIN_CREDENTIALS_ENTERED',
          actorEmail: email.trim(),
          details: `Administrator entered ID and password on login page`,
          status: 'SUCCESS'
        }).catch(() => {});
      }

      sessionStorage.setItem('pending_auth', JSON.stringify({
        name: '',
        email: email.trim(),
        password,
        role: activeTab,
        isLogin: true,
      }));
      sessionStorage.removeItem('mail_otp_request_state');

      navigate(activeTab === 'admin' 
        ? '/Zyndex/Admin/Authenticator-Verification-Page' 
        : '/Zyndex/User/Authenticator-Verification-Page');
    } catch (err) {
      const errMsg = err.message || '';
      if (isSignUpMode && (errMsg.includes('OTP verification is required') || errMsg.includes('OTP') || errMsg.includes('expired'))) {
        setOtpVerified(false);
        setOtpSent(false);
        setOtpCode('');
        setError('Your verification session has expired. Please verify your email again.');
      } else {
        setError(errMsg || (isSignUpMode ? 'Registration failed.' : 'Login failed.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Centered Modal Popup for Login page during active maintenance mode (No auto-closing period) */}
      {isMaintenanceActive && showMaintenanceModal && activeTab !== 'admin' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white rounded-[28px] max-w-md w-full shadow-2xl border border-slate-200/80 overflow-hidden text-center relative"
          >
            {/* Header Banner: Gradient from red to vibrant orange with soft radial glow */}
            <div className="bg-gradient-to-b from-[#e61919] via-[#f43f14] to-[#f95716] p-7 text-white text-center relative overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="size-5" />
              </button>
              <div className="size-16 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-3.5 shadow-inner ring-4 ring-white/10">
                <ShieldAlert className="size-8 text-white" />
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight text-white">
                Platform Under Maintenance
              </h3>
              <p className="text-xs text-orange-100 font-semibold mt-1">
                Scheduled System Maintenance in Progress
              </p>
            </div>

            {/* Body Content */}
            <div className="p-6 pt-5 space-y-4">
              {/* Callout box */}
              <div className="p-4 bg-[#fffbeb] border border-[#fef3c7] rounded-2xl text-left flex items-start gap-3 shadow-xs">
                <AlertCircle className="size-5 text-[#d97706] shrink-0 mt-0.5" />
                <div className="text-xs text-[#92400e] leading-relaxed">
                  <p className="font-bold text-sm text-[#78350f] mb-1">
                    Maintenance Notice
                  </p>
                  <p>The Zyndex platform is currently undergoing scheduled maintenance. Sign in and account registration are temporarily suspended.</p>
                  <p className="mt-2 text-slate-600 font-medium">
                    If you have any inquiries, please visit our contact page and submit your message to our support team.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  to="/Zyndex/Contact/Contact-Us"
                  className="w-full py-3 px-5 rounded-2xl text-sm font-bold text-white bg-[#e50914] hover:bg-[#c70812] shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="size-4" />
                  <span>Go to Contact Page</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="w-full sm:w-auto py-3 px-5 rounded-2xl text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] bg-[size:32px_32px]" />
      </div>

      <motion.header className="relative z-10 py-6 px-8 backdrop-blur-sm border-b border-orange-200/50 depth-3d-elevated glass-3d" initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-600/20 rounded-xl blur-xl" />
              <div className="relative bg-gradient-to-br from-orange-600 to-red-600 p-2.5 rounded-xl shadow-lg">
                <BookOpen className="size-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Zyndex</h1>
              <p className="text-xs text-slate-500 font-medium">Educational Excellence</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 flex-wrap">
            <Link to="/Zyndex/About/About-Us" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">About Us</Link>
            <Link to="/Zyndex/About/Contact" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Contact</Link>
            <Link to="/Zyndex/About/Pricing" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Pricing</Link>
            <span className="text-slate-300 px-1">|</span>
            <Link to="/Zyndex/Resources/Browse" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Browse</Link>
            <Link to="/Zyndex/Resources/Categories" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Categories</Link>
            <span className="text-slate-300 px-1">|</span>
            <Link to="/Zyndex/Support/Help-Center" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Help Center</Link>
            <Link to="/Zyndex/Support/Frequently-Asked-Questions" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">FAQ</Link>
            <span className="text-slate-300 px-1">|</span>
            <Link to="/Zyndex/Legal/Privacy" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Privacy</Link>
            <Link to="/Zyndex/Legal/Terms" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Terms</Link>
          </nav>

        </div>

        {/* Mobile Navigation Dropdown Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mt-4 pt-4 border-t border-orange-200/60 flex flex-col gap-1 overflow-hidden"
            >
              <Link to="/Zyndex/About/About-Us" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50/80 rounded-xl transition-all">About Us</Link>
              <Link to="/Zyndex/About/Contact" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50/80 rounded-xl transition-all">Contact</Link>
              <Link to="/Zyndex/About/Pricing" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50/80 rounded-xl transition-all">Pricing</Link>
              <Link to="/Zyndex/Resources/Browse" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50/80 rounded-xl transition-all">Browse</Link>
              <Link to="/Zyndex/Resources/Categories" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50/80 rounded-xl transition-all">Categories</Link>
              <Link to="/Zyndex/Support/Help-Center" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50/80 rounded-xl transition-all">Help Center</Link>
              <Link to="/Zyndex/Support/Frequently-Asked-Questions" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50/80 rounded-xl transition-all">FAQ</Link>
              <Link to="/Zyndex/Legal/Privacy" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50/80 rounded-xl transition-all">Privacy Policy</Link>
              <Link to="/Zyndex/Legal/Terms" onClick={() => setShowMobileMenu(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50/80 rounded-xl transition-all">Terms of Service</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-200px)]">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-slate-900">Educational Resource</span>
                <br />
                <span className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 bg-clip-text text-transparent">Library Platform</span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Create your account, explore educational resources, and access uploaded PDFs and articles from the Zyndex library.
              </p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur-3xl opacity-10" />
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-200/50 p-8 lg:p-10 depth-3d-float glass-3d surface-highlight">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">{isSignUpMode ? 'Create Account' : 'Welcome Back'}</h2>
                <p className="text-slate-600">
                  {isSignUpMode ? 'Create your Zyndex user account with your name, email, and password.' : 'Sign in with your Zyndex account.'}
                </p>
              </div>

              <div className="relative mb-8 p-1 bg-slate-100 rounded-2xl">
                <motion.div className={`absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-xl shadow-md ${activeTab === 'user' ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`} animate={{ x: activeTab === 'user' ? '0.25rem' : 'calc(100% + 0.25rem)' }} transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
                <div className="relative flex gap-2">
                  <button type="button" onClick={() => setActiveTab('user')} className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold z-10 flex items-center justify-center gap-2 ${activeTab === 'user' ? 'text-white' : 'text-slate-600'}`}>
                    <User className="size-4" />User Access
                  </button>
                  <button type="button" onClick={() => setActiveTab('admin')} className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold z-10 flex items-center justify-center gap-2 ${activeTab === 'admin' ? 'text-white' : 'text-slate-600'}`}>
                    <Shield className="size-4" />Admin Access
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {isSignUpMode && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                      <div className="relative flex items-center">
                        <User className="absolute left-4 size-5 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Automatically capitalize the first letter of each word
                            const formatted = val.replace(/(?:^|\s)\S/g, (match) => match.toUpperCase());
                            setName(formatted);
                            setError('');
                            setSuccessMessage('');
                          }}
                          placeholder="Enter your full name"
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">I am a</label>
                      <div className="relative flex items-center">
                        <GraduationCap className="absolute left-4 size-5 text-slate-400" />
                        <select value={userType} onChange={(e) => { setUserType(e.target.value); setError(''); setSuccessMessage(''); }} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input">
                          <option>Student</option>
                          <option>Teacher / Educator</option>
                          <option>Researcher</option>
                          <option>Professional</option>
                          <option>General Reader</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                    {userType === 'Other' && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">What best describes you?</label>
                        <input type="text" value={otherDescription} onChange={(e) => { setOtherDescription(e.target.value); setError(''); setSuccessMessage(''); }} placeholder="Tell us what best describes you" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input" required />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">University / College name <span className="font-normal text-slate-400">(optional)</span></label>
                      <input type="text" value={institutionName} onChange={(e) => { setInstitutionName(e.target.value); setError(''); setSuccessMessage(''); }} placeholder="Enter your university or college name" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input" />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1 flex items-center">
                      <Mail className="absolute left-4 size-5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError('');
                          setSuccessMessage('');
                          if (isTerminatedUser) {
                            setIsTerminatedUser(false);
                            setTerminatedMessage('');
                          }
                          if (isSignUpMode && otpVerified) {
                            setOtpVerified(false);
                            setOtpSent(false);
                            setOtpCode('');
                            setOtpSuccessMessage('');
                          }
                        }}
                        onBlur={handleEmailBlur}
                        placeholder="Enter your email"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input"
                        required
                        disabled={isSignUpMode && otpVerified}
                      />
                    </div>
                    {isSignUpMode && (
                      <button
                        type="button"
                        onClick={handleSendSignupOtp}
                        disabled={sendingOtp || (otpSent && otpCountdown > 0) || otpVerified}
                        className={`px-4 py-3.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all shadow-sm ${
                          otpVerified
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default'
                            : 'bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60'
                        }`}
                      >
                        {sendingOtp
                          ? 'Sending...'
                          : otpVerified
                          ? '✓ Verified'
                          : otpSent
                          ? otpCountdown > 0
                            ? `Resend (${otpCountdown}s)`
                            : 'Resend OTP'
                          : 'Send OTP'}
                      </button>
                    )}
                  </div>
                </div>

                {isSignUpMode && otpSent && !otpVerified && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-orange-950 uppercase tracking-wider">
                        Enter 4-Digit Security OTP
                      </label>
                      <span className="text-[11px] text-orange-700 font-medium">Sent to {email}</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1 flex items-center">
                        <KeyRound className="absolute left-3.5 size-4 text-orange-500" />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={otpCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setOtpCode(val);
                            setError('');
                            if (val.length === 4) {
                              handleVerifySignupOtp(val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (otpCode.length === 4) {
                                handleVerifySignupOtp(otpCode);
                              }
                            }
                          }}
                          placeholder="••••"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-mono text-center tracking-[0.4em] font-bold text-lg text-slate-800 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleVerifySignupOtp()}
                        disabled={verifyingOtp || otpCode.length !== 4}
                        className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold rounded-xl hover:from-orange-700 hover:to-red-700 disabled:opacity-50 transition-all shadow-sm"
                      >
                        {verifyingOtp ? 'Checking...' : 'Verify OTP'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {isSignUpMode && otpVerified && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="size-4 text-emerald-600 flex-shrink-0" />
                    <span>Email {email} successfully verified with OTP.</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 size-5 text-slate-400 z-10" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); setSuccessMessage(''); }} placeholder={isSignUpMode ? 'Create your password' : 'Enter your password'} className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 p-1 text-slate-400 hover:text-orange-600 transition-colors z-10">
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>

                {isSignUpMode && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Re-enter Password</label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-4 size-5 text-slate-400 z-10" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setError('');
                          setSuccessMessage('');
                        }}
                        placeholder="Re-enter your password to confirm"
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 p-1 text-slate-400 hover:text-orange-600 transition-colors z-10"
                      >
                        {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500 font-medium mt-1">Passwords do not match.</p>
                    )}
                    {confirmPassword && password === confirmPassword && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">✓ Passwords match perfectly.</p>
                    )}
                  </div>
                )}

                {isSignUpMode && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50/60 border border-orange-100 rounded-xl">
                    <input
                      type="checkbox"
                      id="terms-checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked);
                        if (e.target.checked) setError('');
                      }}
                      className="mt-1 size-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      required
                    />
                    <label htmlFor="terms-checkbox" className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none">
                      I have read, understood, and agree to the{' '}
                      <Link
                        to="/Zyndex/Legal/Terms"
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-600 font-semibold underline underline-offset-2 hover:text-orange-700"
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        to="/Zyndex/Legal/Privacy"
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-600 font-semibold underline underline-offset-2 hover:text-orange-700"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </label>
                  </div>
                )}

                {otpSuccessMessage && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-semibold">
                    <span>{otpSuccessMessage}</span>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                    {isSignUpMode && error.includes('expired') && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleSendSignupOtp}
                          disabled={sendingOtp}
                          className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                        >
                          {sendingOtp ? 'Sending...' : 'Request New OTP'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                    <span>{successMessage}</span>
                  </div>
                )}

                {isSignUpMode && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-slate-600 font-medium">Email verification:</span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      otpVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {otpVerified ? '✓ Verified' : 'OTP verification required'}
                    </span>
                  </div>
                )}

                {isTerminatedUser && (
                  <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-sm font-medium shadow-xs">
                    <AlertCircle className="size-5 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-900">Account Terminated</p>
                      <p className="mt-0.5 text-xs text-rose-800 leading-relaxed">
                        {terminatedMessage || 'The given email ID has been terminated by an administrator. Please contact administrator.'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="relative group">
                  <button
                    type="submit"
                    disabled={submitting || (isSignUpMode && !otpVerified) || isTerminatedUser || (isMaintenanceActive && activeTab !== 'admin')}
                    className={`w-full relative group transition-all ${
                      (isSignUpMode && !otpVerified) || isTerminatedUser || (isMaintenanceActive && activeTab !== 'admin') ? 'opacity-60 cursor-not-allowed' : 'disabled:opacity-70'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/30">
                      {submitting ? (
                        isSignUpMode ? 'Creating account...' : 'Checking...'
                      ) : isSignUpMode ? (
                        'Create Account'
                      ) : (
                        'Sign In'
                      )}
                      <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                  {isSignUpMode && !otpVerified && (
                    <p className="text-center text-xs text-slate-500 mt-2 font-medium">
                      Please verify email OTP to enable account creation.
                    </p>
                  )}
                </div>

                <div className="text-center pt-4">
                  {isSignUpMode ? (
                    <div className="mt-3">
                      <Link to="/Zyndex/User/Log-In" className="text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors">
                        Already have an account? Sign in
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 flex flex-col gap-2">
                        <Link to="/Zyndex/Auth/Forgot-Password" className="text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors">
                          Reset or Forgot your password?
                        </Link>
                        {activeTab === 'user' && (
                          <Link to="/Zyndex/User/Sign-Up" className="text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors">
                            Need a new user account? <span className="text-orange-600 font-semibold">Create Account</span>
                          </Link>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {activeTab === 'admin' && (
                  <div className="text-center pt-2">
                    <Link to="/Zyndex/Admin/Sign-Up" className="text-sm text-slate-600 hover:text-orange-600 font-medium transition-colors">
                      Need admin access? <span className="text-orange-600 font-semibold">Request Here</span>
                    </Link>
                  </div>
                )}
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 border-t border-orange-200/30 text-center text-xs text-slate-500 bg-white/20 backdrop-blur-sm mt-8">
        © 2026 Zyndex • A ScholarSphere Digital Company • All rights reserved.
      </footer>
    </div>
  );
}



