import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowLeft, Mail, RefreshCw, ShieldCheck, CheckCircle2, XCircle, Info, Laptop } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import apiClient from '@/services/api/apiClient';
import authService from '@/services/api/authService';
import logService from '@/services/api/logService';
import { resolveAuthRedirectPath } from '@/utils/redirectHelper';
import { getOrCreateDeviceToken, getDeviceInfo, fetchClientPublicIp, getCachedClientIp } from '@/utils/deviceHelper';

const OTP_EXPIRY_SECONDS = 120;
const OTP_REQUEST_SESSION_KEY = 'mail_otp_request_state';

// 10 Distinct geometric shapes for verification formation:
const BASE_SHAPES = [
  'circle',
  'triangle',
  'square',
  'rectangle',
  'diamond',
  'hexagon',
  'cross',
  'hourglass',
  'oval',
  'trapezoid'
];

function generateJumbledSequence() {
  // Fisher-Yates shuffle to guarantee completely different order every time
  const array = [...BASE_SHAPES];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default function MailOtpVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [status, setStatus] = useState('Preparing your mail OTP...');
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(OTP_EXPIRY_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);

  // Animation phase: false until user clicks "Verify OTP" (or auto-triggers after 4th digit)
  const [isAnimatingShapes, setIsAnimatingShapes] = useState(false);

  // Verification state: null | 'success' | 'error'
  const [verifyState, setVerifyState] = useState(null);
  const [trustDevice, setTrustDevice] = useState(true);
  const [showTrustInfo, setShowTrustInfo] = useState(false);

  // Dynamic jumbled sequence of 3 unique shapes generated fresh on each verification attempt
  const [shapeSequence, setShapeSequence] = useState(() => generateJumbledSequence());
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const inputRefs = useRef([]);
  const isAdminOtp = location.pathname.includes('/Admin/');
  const loginPath = isAdminOtp ? '/Zyndex/Admin/Log-In' : '/Zyndex/User/Log-In';

  const filledCount = digits.filter((d) => d !== '').length;
  const isAllFilled = filledCount === 4;

  // Step through shapes continuously while verifying or navigating
  useEffect(() => {
    if (!isAnimatingShapes) {
      setCurrentShapeIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentShapeIndex((prev) => (prev + 1) % shapeSequence.length);
    }, 700);

    return () => clearInterval(interval);
  }, [isAnimatingShapes, shapeSequence.length]);

  useEffect(() => {
    const pendingAuth = sessionStorage.getItem('pending_auth');
    const humanVerified = sessionStorage.getItem('human_verification_passed') === 'true';

    if (!pendingAuth || !humanVerified) {
      navigate(loginPath, { replace: true });
      return;
    }

    const authData = JSON.parse(pendingAuth);
    if ((isAdminOtp && authData.role !== 'admin') || (!isAdminOtp && authData.role !== 'user')) {
      navigate(authData.role === 'admin' ? '/Zyndex/Admin/Log-In' : '/Zyndex/User/Log-In', { replace: true });
      return;
    }

    async function requestOtp() {
      setSending(true);
      setError('');

      try {
        const requestKey = `${authData.role}:${String(authData.email || '').toLowerCase()}`;
        let existingRequest = null;
        try {
          existingRequest = JSON.parse(sessionStorage.getItem(OTP_REQUEST_SESSION_KEY) || 'null');
        } catch (e) {}

        const now = Date.now();

        if (existingRequest?.key === requestKey && existingRequest.expiresAt > now) {
          const secondsLeft = Math.max(1, Math.ceil((existingRequest.expiresAt - now) / 1000));
          setRemainingSeconds(secondsLeft);
          setStatus(`A 4-digit OTP was already sent to ${authData.email}. It expires in ${secondsLeft} seconds.`);
          return;
        }

        sessionStorage.setItem(
          OTP_REQUEST_SESSION_KEY,
          JSON.stringify({
            key: requestKey,
            requestedAt: now,
            expiresAt: now + OTP_EXPIRY_SECONDS * 1000,
          })
        );

        const response = await apiClient.post('/send-otp', {
          email: authData.email,
          role: authData.role,
          purpose: authData.isSignUp ? 'SIGNUP' : 'LOGIN',
          name: authData.name || authData.fullName || '',
          userType: authData.userType || '',
          force: false,
        });

        const expiresInSeconds = response.expiresInSeconds || OTP_EXPIRY_SECONDS;
        sessionStorage.setItem(
          OTP_REQUEST_SESSION_KEY,
          JSON.stringify({
            key: requestKey,
            requestedAt: Date.now(),
            expiresAt: Date.now() + expiresInSeconds * 1000,
          })
        );
        setRemainingSeconds(expiresInSeconds);

        const isEmailSent = response.emailSent;
        setStatus(
          isEmailSent
            ? `A 4-digit OTP was sent to ${authData.email}. It expires in 2 minutes.`
            : `A 4-digit OTP was generated (Development Mode). Check backend console.`
        );
      } catch (requestError) {
        sessionStorage.removeItem(OTP_REQUEST_SESSION_KEY);
        setStatus('');
        setError(requestError?.message || 'Could not generate OTP. Please try again.');
      } finally {
        setSending(false);
      }
    }

    requestOtp();
  }, [isAdminOtp, loginPath, navigate]);

  // Focus the first input on initial load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((current) => {
        const next = Math.max(0, current - 1);
        if (next === 0) {
          setError('Security code has expired. Please click Resend OTP to receive a fresh 4-digit verification code.');
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const resendOtp = async () => {
    const pendingAuth = sessionStorage.getItem('pending_auth');
    if (!pendingAuth) {
      navigate(loginPath, { replace: true });
      return;
    }

    const authData = JSON.parse(pendingAuth);
    setDigits(['', '', '', '']);
    setVerifyState(null);
    setIsAnimatingShapes(false);
    setStatus('');
    setError('');
    setSending(true);

    try {
      const requestKey = `${authData.role}:${String(authData.email || '').toLowerCase()}`;
      sessionStorage.setItem(
        OTP_REQUEST_SESSION_KEY,
        JSON.stringify({
          key: requestKey,
          requestedAt: Date.now(),
          expiresAt: Date.now() + OTP_EXPIRY_SECONDS * 1000,
        })
      );

      const response = await apiClient.post('/send-otp', {
        email: authData.email,
        role: authData.role,
        purpose: authData.isSignUp ? 'SIGNUP' : 'LOGIN',
        name: authData.name || authData.fullName || '',
        userType: authData.userType || '',
        force: true,
      });

      const expiresInSeconds = response.expiresInSeconds || OTP_EXPIRY_SECONDS;
      sessionStorage.setItem(
        OTP_REQUEST_SESSION_KEY,
        JSON.stringify({
          key: requestKey,
          requestedAt: Date.now(),
          expiresAt: Date.now() + expiresInSeconds * 1000,
        })
      );
      setRemainingSeconds(expiresInSeconds);

      const isEmailSent = response.emailSent;
      setStatus(
        isEmailSent
          ? `A new OTP was sent to ${authData.email}. It expires in 2 minutes.`
          : `A new OTP was generated (Development Mode). Check backend console.`
      );

      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 50);
    } catch (requestError) {
      sessionStorage.removeItem(OTP_REQUEST_SESSION_KEY);
      setError(requestError?.message || 'Could not resend OTP. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDigitChange = (index, value) => {
    if (verifyState === 'success') return;
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      setVerifyState(null);
      setIsAnimatingShapes(false);
      setError('');
      return;
    }

    const char = cleanVal[cleanVal.length - 1];
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);
    setVerifyState(null);
    setIsAnimatingShapes(false);
    setError('');

    // Automatically advance to the next diamond box without needing arrow keys
    if (index < 3) {
      setTimeout(() => {
        if (inputRefs.current[index + 1]) {
          inputRefs.current[index + 1].focus();
        }
      }, 30);
    } else if (index === 3) {
      // All 4 digits entered: automatically trigger senior UI shape morphing constellation
      setTimeout(() => {
        executeVerification(nextDigits);
      }, 150);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeVerification();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const nextDigits = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setDigits(nextDigits);
    setIsAnimatingShapes(false);
    if (pasted.length === 4) {
      setTimeout(() => {
        executeVerification(nextDigits);
      }, 150);
      return;
    }
    const targetIdx = Math.min(3, pasted.length);
    setTimeout(() => {
      if (inputRefs.current[targetIdx]) {
        inputRefs.current[targetIdx].focus();
      }
    }, 20);
  };

  const executeVerification = async (explicitDigits = null) => {
    const targetDigits = explicitDigits || digits;
    const fullOtp = targetDigits.join('');
    if (fullOtp.length !== 4) {
      setError('Please enter all 4 digits of the OTP before verifying.');
      setVerifyState('error');
      return;
    }

    // Refresh dynamic jumbled sequence of 3 unique shapes for this verification run
    const newSeq = generateJumbledSequence();
    setShapeSequence(newSeq);
    setCurrentShapeIndex(0);

    // Trigger dynamic geometric shape constellation animation
    setIsAnimatingShapes(true);
    setSubmitting(true);
    setError('');
    setVerifyState(null);

    const startTime = Date.now();
    // Guarantee at least 3 distinct shape transitions (3 * 700ms = 2100ms)
    const MINIMUM_SHAPE_CYCLES_MS = 2100;

    try {
      const pendingAuth = JSON.parse(sessionStorage.getItem('pending_auth') || 'null');
      if (!pendingAuth) {
        throw new Error('OTP session is missing. Please log in again.');
      }

      const verifyPromise = apiClient.post('/verify-otp', {
        email: pendingAuth.email,
        role: pendingAuth.role,
        otp: fullOtp,
      });

      // Await network verification while the shapes continue morphing
      await verifyPromise;

      // Ensure minimum 3 full shape transformations occur before turning green
      const elapsed = Date.now() - startTime;
      if (elapsed < MINIMUM_SHAPE_CYCLES_MS) {
        await new Promise((resolve) => setTimeout(resolve, MINIMUM_SHAPE_CYCLES_MS - elapsed));
      }

      // Turn numbers green upon success; DO NOT stop isAnimatingShapes - let it keep morphing until redirect
      setVerifyState('success');

      if (pendingAuth.isSignUp) {
        if (pendingAuth.role === 'admin') {
          await authService.requestAdminAccess({
            fullName: pendingAuth.fullName,
            displayName: pendingAuth.displayName,
            email: pendingAuth.email,
            password: pendingAuth.password,
          });

          sessionStorage.removeItem('pending_auth');
          sessionStorage.removeItem('human_verification_passed');
          sessionStorage.removeItem(OTP_REQUEST_SESSION_KEY);

          setTimeout(() => {
            navigate('/Zyndex/Admin/Log-In', {
              replace: true,
              state: {
                requestSuccess: `Thank you ${pendingAuth.displayName}! Your verified admin request has been submitted successfully.`,
              },
            });
          }, 900);
          return;
        }

        // User signup
        await authService.register({
          name: pendingAuth.name,
          email: pendingAuth.email,
          password: pendingAuth.password,
          role: 'user',
          userType: pendingAuth.userType,
          profession: pendingAuth.profession,
          collegeName: pendingAuth.collegeName,
        });

        sessionStorage.removeItem('pending_auth');
        sessionStorage.removeItem('human_verification_passed');
        sessionStorage.removeItem(OTP_REQUEST_SESSION_KEY);

        setTimeout(() => {
          navigate('/Zyndex/User/Log-In', {
            replace: true,
            state: {
              signupSuccess: 'Your account has been created and verified successfully. Please sign in.',
            },
          });
        }, 900);
        return;
      }

      // Existing login flow
      const userData = await login(pendingAuth.email, pendingAuth.password, pendingAuth.role);

      if (pendingAuth.role === 'admin') {
        logService.createLog({
          service: 'AUTH-SERVICE',
          level: 'INFO',
          action: 'ADMIN_OTP_VERIFIED',
          actorEmail: (pendingAuth.email || '').trim().toLowerCase(),
          details: `Administrator successfully entered and verified security OTP`,
          status: 'SUCCESS'
        }).catch(() => {});
      }

      // Register this login device in the database so it appears in Security & Devices login activity
      const deviceToken = getOrCreateDeviceToken();
      try {
        const info = getDeviceInfo();
        let clientIp = getCachedClientIp();
        if (!clientIp) {
          try {
            clientIp = await fetchClientPublicIp();
          } catch (e) {}
        }
        await authService.trustDevice({
          email: (pendingAuth.email || '').trim().toLowerCase(),
          deviceToken,
          deviceName: info.deviceName,
          browser: info.browser,
          os: info.os,
          clientIp: clientIp || undefined,
          isTrusted: Boolean(trustDevice),
        });

        if (trustDevice && pendingAuth.role === 'admin') {
          logService.createLog({
            service: 'AUTH-SERVICE',
            level: 'INFO',
            action: 'ADMIN_DEVICE_TRUSTED',
            actorEmail: (pendingAuth.email || '').trim().toLowerCase(),
            details: `Administrator elected to trust device (${info.browser} on ${info.os}) for 24 hours`,
            status: 'SUCCESS'
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Failed to record device session:', e);
      }

      sessionStorage.removeItem('pending_auth');
      sessionStorage.removeItem('human_verification_passed');
      sessionStorage.removeItem(OTP_REQUEST_SESSION_KEY);
      sessionStorage.setItem('show_auth_transition', 'true');

      setTimeout(() => {
        const targetDestination = resolveAuthRedirectPath(userData);
        navigate(targetDestination, { replace: true });
      }, 1000);
    } catch (submitError) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
      }
      setVerifyState('error');
      setIsAnimatingShapes(false);
      setError(submitError?.message || 'Invalid OTP. Please check the code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    sessionStorage.removeItem('human_verification_passed');
    sessionStorage.removeItem(OTP_REQUEST_SESSION_KEY);
    navigate(loginPath, { replace: true });
  };

  // Get responsive, mathematically accurate pixel coordinates for the 4 digits
  const getShapeCoordinates = (index, shape) => {
    switch (shape) {
      case 'square':
        if (index === 0) return { x: -38, y: -38 };
        if (index === 1) return { x: 38, y: -38 };
        if (index === 2) return { x: 38, y: 38 };
        return { x: -38, y: 38 };

      case 'rectangle':
        if (index === 0) return { x: -48, y: -24 };
        if (index === 1) return { x: 48, y: -24 };
        if (index === 2) return { x: 48, y: 24 };
        return { x: -48, y: 24 };

      case 'circle': {
        const angle = (index * 90) * (Math.PI / 180);
        return { x: Math.round(48 * Math.cos(angle)), y: Math.round(48 * Math.sin(angle)) };
      }

      case 'diamond':
        if (index === 0) return { x: 0, y: -52 };
        if (index === 1) return { x: 52, y: 0 };
        if (index === 2) return { x: 0, y: 52 };
        return { x: -52, y: 0 };

      case 'triangle':
        if (index === 0) return { x: 0, y: -48 }; // Top apex
        if (index === 1) return { x: 48, y: 36 };  // Bottom Right
        if (index === 2) return { x: -48, y: 36 }; // Bottom Left
        return { x: 0, y: 0 }; // 4th digit centered in the triangle

      case 'hexagon':
        if (index === 0) return { x: -44, y: -26 };
        if (index === 1) return { x: 44, y: -26 };
        if (index === 2) return { x: 44, y: 26 };
        return { x: -44, y: 26 };

      case 'cross':
        if (index === 0) return { x: 0, y: -50 };
        if (index === 1) return { x: 50, y: 0 };
        if (index === 2) return { x: 0, y: 50 };
        return { x: -50, y: 0 };

      case 'hourglass':
        if (index === 0) return { x: -42, y: -42 };
        if (index === 1) return { x: 42, y: -42 };
        if (index === 2) return { x: -42, y: 42 };
        return { x: 42, y: 42 };

      case 'oval':
        if (index === 0) return { x: -56, y: 0 };
        if (index === 1) return { x: -18, y: -36 };
        if (index === 2) return { x: 18, y: 36 };
        return { x: 56, y: 0 };

      case 'trapezoid':
        if (index === 0) return { x: -26, y: -38 };
        if (index === 1) return { x: 26, y: -38 };
        if (index === 2) return { x: 50, y: 38 };
        return { x: -50, y: 38 };

      default:
        return { x: (index - 1.5) * 54, y: 0 };
    }
  };

  const activeShape = shapeSequence[currentShapeIndex] || 'square';

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-6">
        <motion.div className="w-full max-w-md sm:max-w-lg" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-200/60 p-6 sm:p-10">
            {/* Top Brand Logo */}
            <div className="size-16 sm:size-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5 sm:mb-6 shadow-xl shadow-orange-500/30">
              <Mail className="size-8 sm:size-10 text-white" />
            </div>

            <div className="text-center mb-5 sm:mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1.5">Mail OTP Verification</h1>
              <p className="text-slate-600 text-xs sm:text-sm">Enter the 4-digit security code sent to your registered email.</p>
              <p className="text-xs text-orange-700 mt-2 font-semibold">Time remaining: {remainingSeconds}s</p>
            </div>

            {status && (
              <div className="mb-4 flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">
                <ShieldCheck className="size-4.5 mt-0.5 shrink-0" />
                <span>{status}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                <AlertCircle className="size-4.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* DYNAMIC SHAPE-MORPHING DIGIT CONSTELLATION CONTAINER */}
            <div className="py-4 flex flex-col items-center justify-center min-h-[170px] sm:min-h-[190px]">
              {isAnimatingShapes ? (
                /* Dynamic Fast-Rotating & Shape Morphing Constellation of 4 Digits */
                <div className="relative w-56 sm:w-64 h-44 sm:h-48 flex items-center justify-center select-none overflow-hidden">
                  {/* Subtle orbital path ring with dual glowing rings */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute size-38 sm:size-46 rounded-full border border-dashed border-orange-400/50 pointer-events-none"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    className="absolute size-46 sm:size-54 rounded-full border border-orange-200/30 pointer-events-none"
                  />

                  {[0, 1, 2, 3].map((index) => {
                    const coords = getShapeCoordinates(index, activeShape);
                    const isSuccess = verifyState === 'success';
                    const isError = verifyState === 'error';

                    return (
                      <motion.div
                        key={index}
                        animate={{
                          x: coords.x,
                          y: coords.y,
                          scale: [1, 1.12, 1],
                        }}
                        transition={{
                          x: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
                          y: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
                          scale: { duration: 0.3 }
                        }}
                        className="absolute size-12 sm:size-14 flex items-center justify-center"
                      >
                        {/* Circle Node with Brand Gradient Glow */}
                        <div
                          className={`size-full rounded-full flex items-center justify-center text-lg sm:text-xl font-black text-white shadow-lg transition-colors duration-200 ${
                            isSuccess
                              ? 'bg-gradient-to-tr from-emerald-500 to-green-400 shadow-emerald-500/40 ring-4 ring-emerald-500/20'
                              : isError
                              ? 'bg-gradient-to-tr from-rose-500 to-red-400 shadow-rose-500/40 ring-4 ring-rose-500/20'
                              : 'bg-gradient-to-tr from-orange-500 to-amber-500 shadow-orange-500/30 ring-4 ring-orange-500/15'
                          }`}
                        >
                          {digits[index]}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* Progressive Entry: 1st diamond appears -> morphs into circle upon entering digit -> reveals 2nd diamond... */
                <div className="flex justify-center items-center gap-3.5 sm:gap-6 my-2">
                  {[0, 1, 2, 3].map((index) => {
                    const isFilled = digits[index] !== '';
                    const isCurrent = index === filledCount;
                    const isVisible = index <= filledCount; // Only reveal up to the current active diamond box

                    if (!isVisible) {
                      return null;
                    }

                    return (
                      <motion.div
                        key={index}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                        className="relative flex items-center justify-center size-12 sm:size-15"
                      >
                        {/* Dynamic Shape Morph: If empty = Diamond (rotate-45); Once filled = Smooth Circle (rounded-full) */}
                        <motion.div
                          animate={{
                            rotate: isFilled ? 0 : 45,
                            borderRadius: isFilled ? '50%' : '12px',
                            scale: isCurrent ? [1, 1.06, 1] : 1,
                          }}
                          transition={{
                            duration: 0.3,
                            ease: 'easeInOut',
                            repeat: isCurrent ? Infinity : 0,
                            repeatDelay: 1.5,
                          }}
                          className={`absolute inset-0 shadow-md transition-colors duration-250 ${
                            isFilled
                              ? 'bg-gradient-to-tr from-orange-500 to-amber-500 border-2 border-orange-400 shadow-orange-500/25'
                              : 'bg-white border-2 border-orange-500 ring-4 ring-orange-500/10 shadow-orange-500/10'
                          }`}
                        />

                        {/* Direct Native Keyboard Input */}
                        <input
                          ref={(el) => (inputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digits[index]}
                          disabled={submitting || verifyState === 'success'}
                          onChange={(e) => handleDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={handlePaste}
                          className={`relative z-10 w-full h-full text-center text-lg sm:text-2xl font-black outline-none bg-transparent transition-colors ${
                            isFilled ? 'text-white' : 'text-slate-800'
                          }`}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ERROR FEEDBACK BADGE */}
            <AnimatePresence>
              {verifyState === 'error' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center flex items-center justify-center gap-2 text-rose-700 text-xs font-semibold"
                >
                  <XCircle className="size-4 shrink-0 text-rose-600" />
                  <span>{error || 'Invalid security code. Please check your email and try again.'}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TRUST THIS DEVICE FOR 24 HOURS (WITH INFO INDICATION TOOLTIP/PANEL) */}
            <div className="my-4 p-3 rounded-2xl bg-orange-50/70 border border-orange-200/60 transition-all">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="size-4.5 rounded text-orange-600 focus:ring-orange-500 border-gray-300 transition-colors cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Laptop className="size-3.5 text-orange-600" />
                    Trust this device
                  </span>
                </label>

                {/* Indication Symbol (ⓘ) Button */}
                <button
                  type="button"
                  onClick={() => setShowTrustInfo(!showTrustInfo)}
                  className="size-6 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center justify-center transition-all cursor-pointer"
                  title="What happens if I enable 'Trust this device'?"
                >
                  <Info className="size-3.5" />
                </button>
              </div>

              {/* Collapsible / Clickable Indication Explainer */}
              <AnimatePresence>
                {showTrustInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2.5 pt-2.5 border-t border-orange-200/50 text-[11px] leading-relaxed text-slate-600 space-y-1.5">
                      <p className="font-bold text-orange-950 flex items-center gap-1">
                        <ShieldCheck className="size-3.5 text-emerald-600 inline" />
                        What happens when you enable "Trust this device"?
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li>
                          <b>Skip Repeated OTPs Today:</b> If you log in again on this same browser before midnight (12:00 AM IST), you will <b>only solve the captcha verification</b> and avoid entering an email OTP.
                        </li>
                        <li>
                          <b>Midnight (12:00 AM IST) Daily Reset:</b> Once the calendar day completes and the clock reaches 12:00 AM IST, all active and closed sessions expire and fresh OTP verification will be required for the first login of that new day.
                        </li>
                        <li>
                          <b>New / Another Devices Protected:</b> If someone tries to log in with your credentials on a different device, browser, or private window, <b>Mail OTP will still strictly be required</b>.
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SUBMIT BUTTON: Only enabled when all 4 digits are completed */}
            <button
              type="button"
              onClick={() => executeVerification()}
              disabled={!isAllFilled || submitting || sending || remainingSeconds === 0 || verifyState === 'success'}
              className="w-full py-3.5 sm:py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-[0.98] text-sm sm:text-base"
            >
              {submitting ? 'Validating Security Code...' : verifyState === 'success' ? 'Verified ✓' : 'Verify OTP'}
            </button>

            {/* FOOTER ACTIONS */}
            <div className="flex items-center justify-between gap-3 mt-5 sm:mt-6">
              <button
                type="button"
                onClick={handleBack}
                disabled={verifyState === 'success'}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-600 font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                Back to login
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={sending || verifyState === 'success'}
                className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${sending ? 'animate-spin' : ''}`} />
                Resend OTP
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
