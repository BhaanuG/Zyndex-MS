import { useState, useEffect } from 'react';
import { BookOpen, Mail, User, Lock, Shield, CheckCircle, Sparkles, ArrowLeft, KeyRound } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import authService from '@/services/api/authService';
import apiClient from '@/services/api/apiClient';

function SubmissionLoader({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50"
    >
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        {/* Additional floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
            style={{
              left: `${15 + i * 10}%`,
              top: `${25 + i * 8}%`,
            }}
            animate={{
              y: [0, -40, 0],
              x: [0, Math.sin(i) * 30, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative text-center space-y-6 max-w-md px-6">
        {/* Logo Animation */}
        <motion.div className="flex justify-center">
          <div className="relative">
            {/* Glow Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur-2xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Icon Container */}
            <div className="relative bg-gradient-to-br from-orange-600 to-red-600 p-6 rounded-2xl shadow-2xl">
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <BookOpen className="size-12 text-white" />
              </motion.div>
            </div>

            {/* Orbiting dots */}
            {[0, 120, 240].map((angle, i) => (
              <motion.div
                key={i}
                className="absolute w-2.5 h-2.5 bg-blue-500 rounded-full shadow-lg"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  x: [
                    Math.cos((angle * Math.PI) / 180) * 60,
                    Math.cos(((angle + 360) * Math.PI) / 180) * 60,
                  ],
                  y: [
                    Math.sin((angle * Math.PI) / 180) * 60,
                    Math.sin(((angle + 360) * Math.PI) / 180) * 60,
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Brand */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Zyndex
          </h1>
          <div className="space-y-2">
            <p className="text-slate-700 font-semibold text-base leading-relaxed">{message}</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-slate-600 font-medium text-sm">Processing admin request</p>
              {/* Moving dots */}
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-orange-600 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{
                duration: 15,
                ease: "easeInOut"
              }}
            />
          </div>
          <motion.p
            className="text-xs text-slate-500 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Submitting your admin account request...
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminRequest() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    displayName: '',
    email: '',
    password: '',
  });
  const [sending, setSending] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);

  // OTP Verification States
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');

  // Countdown timer for resend OTP
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  useEffect(() => {
    apiClient.get('/users/maintenance-mode')
      .then(res => {
        // Only block admin request if maintenance has officially commenced (after the 15-minute countdown)
        if (res?.isOfficiallyActive || (res?.maintenanceMode && !res?.scheduledAt)) {
          setIsMaintenanceActive(true);
        } else {
          setIsMaintenanceActive(false);
        }
      })
      .catch(() => {});
  }, []);

  const formatTitleCase = (str) => {
    return str.replace(/\b([a-zA-Z])([a-zA-Z]*)/g, (_, first, rest) => {
      return first.toUpperCase() + rest.toLowerCase();
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedValue = name === 'fullName' ? formatTitleCase(value) : value;
    setFormData({
      ...formData,
      [name]: updatedValue,
    });
    setError('');
    setOtpSuccessMessage('');

    if (name === 'email' && otpVerified) {
      setOtpVerified(false);
      setOtpSent(false);
      setOtpCode('');
      setOtpSuccessMessage('');
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setOtpSuccessMessage('');
    const trimmedEmail = formData.email.trim();
    const trimmedName = formData.fullName.trim();

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
      await apiClient.post('/send-otp', {
        email: trimmedEmail,
        role: 'admin',
        purpose: 'SIGNUP',
        name: trimmedName,
        displayName: formData.displayName.trim(),
        force: true,
      });
      setOtpSent(true);
      setOtpCountdown(120);
      setOtpSuccessMessage(`Security OTP has been sent to ${trimmedEmail}. It will expire in 120 seconds.`);
    } catch (err) {
      setError(err.message || 'Failed to send verification OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify) => {
    const code = (codeToVerify || otpCode).trim();
    if (code.length !== 4) {
      setError('Please enter all 4 digits of the OTP.');
      return;
    }

    setVerifyingOtp(true);
    setError('');
    try {
      await apiClient.post('/verify-otp', {
        email: formData.email.trim().toLowerCase(),
        otp: code,
        role: 'admin',
      });
      setOtpVerified(true);
      setOtpSuccessMessage('Email verified successfully! You can now submit your request.');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please check and try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOtpSuccessMessage('');

    if (!otpVerified) {
      setError('Please verify your email address with the OTP before submitting your request.');
      return;
    }

    setSending(true);

    try {
      // Validate form data
      if (!formData.fullName || !formData.displayName || !formData.email || !formData.password) {
        throw new Error('All fields are required');
      }

      // Password complexity validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        throw new Error('Password must be at least 8 characters long, contain at least one uppercase letter, one digit, and one special character.');
      }

      // Submit verified admin request directly
      await authService.requestAdminAccess({
        fullName: formData.fullName.trim(),
        displayName: formData.displayName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/Zyndex/Admin/Log-In', {
          replace: true,
          state: {
            requestSuccess: `Thank you ${formData.displayName.trim()}! Your verified admin request has been submitted successfully.`,
          },
        });
      }, 3000);
    } catch (err) {
      console.error('Admin request error:', err);
      let errorMessage = 'Failed to send request. ';
      if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += 'Please check your internet connection and try again.';
      }
      setError(errorMessage);
      setSending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-orange-50/20 flex items-center justify-center p-6">
        <motion.div
          className="max-w-md w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative bg-white rounded-3xl shadow-2xl p-10 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-green-100 rounded-full blur-3xl opacity-40" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-100 rounded-full blur-3xl opacity-40" />
            
            <div className="relative">
              <motion.div
                className="size-24 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <CheckCircle className="size-12 text-white" />
              </motion.div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Request Sent Successfully!
              </h1>
              <p className="text-gray-600 mb-6 text-lg">
                Your admin account request has been sent. You will be notified once your request is reviewed and approved.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to login...
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] bg-[size:32px_32px]" />
        
        {/* Floating Orbs */}
        <motion.div
          className="absolute top-20 left-20 w-72 h-72 bg-orange-400/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-red-400/20 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <motion.header 
        className="relative z-10 py-6 px-8 backdrop-blur-sm border-b border-orange-200/50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-orange-600/20 rounded-xl blur-xl" />
              <div className="relative bg-gradient-to-br from-orange-600 to-red-600 p-2.5 rounded-xl shadow-lg">
                <BookOpen className="size-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Zyndex
              </h1>
              <p className="text-xs text-slate-500 font-medium">Educational Excellence</p>
            </div>
          </motion.div>

          <Link 
            to="/Zyndex/Admin/Log-In"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
          >
            <ArrowLeft className="size-4" />
            Back to Login
          </Link>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="max-w-md mx-auto min-h-[calc(100vh-200px)] flex items-center justify-center">
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Card Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur-3xl opacity-10" />
            
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-200/50 p-8 lg:p-10">
              {/* Icon */}
              <motion.div
                className="size-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/30"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: 'spring' }}
              >
                <Shield className="size-10 text-white" />
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8 text-center"
              >
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  Request Admin Access
                </h2>
                <p className="text-slate-600">
                  Fill out the form below to request admin privileges
                </p>
              </motion.div>

              {/* Form */}
              <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="space-y-5"
              >
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl opacity-0 group-focus-within:opacity-10 blur transition-opacity" />
                    <div className="relative flex items-center">
                      <User className="absolute left-4 size-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-orange-600 rounded-xl focus:bg-white focus:border-orange-700 focus:ring-4 focus:ring-orange-600/15 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Display Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl opacity-0 group-focus-within:opacity-10 blur transition-opacity" />
                    <div className="relative flex items-center">
                      <Sparkles className="absolute left-4 size-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                      <input
                        type="text"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        placeholder="Enter your display name"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-orange-600 rounded-xl focus:bg-white focus:border-orange-700 focus:ring-4 focus:ring-orange-600/15 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl opacity-0 group-focus-within:opacity-10 blur transition-opacity" />
                      <div className="relative flex items-center">
                        <Mail className="absolute left-4 size-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter your email"
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-orange-600 rounded-xl focus:bg-white focus:border-orange-700 focus:ring-4 focus:ring-orange-600/15 outline-none transition-all"
                          required
                          disabled={otpVerified}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendOtp}
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
                  </div>
                </div>

                {/* Inline OTP verification block */}
                {otpSent && !otpVerified && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-orange-950 uppercase tracking-wider">
                        Enter 4-Digit Security OTP
                      </label>
                      <span className="text-[11px] text-orange-700 font-medium">Sent to {formData.email}</span>
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
                              handleVerifyOtp(val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (otpCode.length === 4) {
                                handleVerifyOtp(otpCode);
                              }
                            }
                          }}
                          placeholder="••••"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-mono text-center tracking-[0.4em] font-bold text-lg text-slate-800 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleVerifyOtp()}
                        disabled={verifyingOtp || otpCode.length !== 4}
                        className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold rounded-xl hover:from-orange-700 hover:to-red-700 disabled:opacity-50 transition-all shadow-sm"
                      >
                        {verifyingOtp ? 'Checking...' : 'Verify OTP'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {otpVerified && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                    <CheckCircle className="size-4 text-emerald-600 shrink-0" />
                    <span>Email verified successfully. You can now submit your admin request.</span>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl opacity-0 group-focus-within:opacity-10 blur transition-opacity" />
                    <div className="relative flex items-center">
                      <Lock className="absolute left-4 size-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-orange-600 rounded-xl focus:bg-white focus:border-orange-700 focus:ring-4 focus:ring-orange-600/15 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Feedback Messages */}
                {otpSuccessMessage && !otpVerified && (
                  <motion.div
                    className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-xs text-emerald-700 font-medium">{otpSuccessMessage}</p>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    className="p-4 bg-red-50 border border-red-200 rounded-xl"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-sm text-red-600">{error}</p>
                  </motion.div>
                )}

                {/* Submit Button */}
                {isMaintenanceActive && (
                  <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 mb-3 text-center font-medium">
                    Platform is under scheduled maintenance. Admin registration requests are temporarily unavailable.
                  </p>
                )}
                <motion.button
                  type="submit"
                  disabled={sending || isMaintenanceActive || !otpVerified}
                  className={`w-full relative group ${isMaintenanceActive || !otpVerified ? 'opacity-50 cursor-not-allowed' : ''}`}
                  whileHover={{ scale: !sending && !isMaintenanceActive && otpVerified ? 1.02 : 1 }}
                  whileTap={{ scale: !sending && !isMaintenanceActive && otpVerified ? 0.98 : 1 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/30 disabled:opacity-50 disabled:cursor-not-allowed">
                    {sending ? 'Sending Request...' : 'Submit Request'}
                  </div>
                </motion.button>
              </motion.form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-orange-200/50 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              © 2026 Zyndex. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="/Zyndex/Legal/Privacy" className="text-sm text-slate-600 hover:text-orange-600 transition-colors">
                Privacy
              </Link>
              <Link to="/Zyndex/Legal/Terms" className="text-sm text-slate-600 hover:text-orange-600 transition-colors">
                Terms
              </Link>
              <Link to="/Zyndex/Support/Frequently-Asked-Questions" className="text-sm text-slate-600 hover:text-orange-600 transition-colors">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Submission Loader */}
      <AnimatePresence>
        {showLoader && <SubmissionLoader message={loaderMessage} />}
      </AnimatePresence>
    </div>
  );
}
