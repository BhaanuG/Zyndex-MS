import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Clock, LogIn, ShieldAlert, ArrowRight } from 'lucide-react';

/**
 * Global Session Timeout & Inactivity Modal
 * Accurately renders the official Session Time-Out notification design matching the screenshot:
 * - Gradient red-orange top header banner with shield-alert icon
 * - "Session Time-Out" heading
 * - "2 hr 30 min Inactivity Protection Triggered"
 * - Styled alert callout explaining why session was terminated
 * - Solid red direct action button: "-> Return to Admin/User Log In"
 */
export default function SessionTimeoutModal() {
  const [modalData, setModalData] = useState(null); // { role, reason }
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const handleSessionExpired = (e) => {
      setModalData(e.detail || {
        role: 'user',
        reason: 'Your session has expired due to 2 hours and 30 minutes of inactivity. Please log in again to continue.'
      });
      setCountdown(15);
    };

    window.addEventListener('zyndex:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('zyndex:session-expired', handleSessionExpired);
    };
  }, []);

  // 15 seconds auto logout countdown timer
  useEffect(() => {
    if (!modalData) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const isAdmin = modalData.role === 'admin';
          const loginPath = isAdmin ? '/Zyndex/Admin/Log-In' : '/Zyndex/User/Log-In';
          setModalData(null);
          window.location.href = loginPath;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [modalData]);

  if (!modalData) return null;

  const isAdmin = modalData.role === 'admin';
  const loginPath = isAdmin ? '/Zyndex/Admin/Log-In' : '/Zyndex/User/Log-In';

  const handleRedirect = () => {
    setModalData(null);
    window.location.href = loginPath;
  };

  const isMaintenance = modalData.reason && modalData.reason.toLowerCase().includes('maintenance');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-[28px] max-w-sm w-full shadow-2xl border border-slate-200/80 overflow-hidden text-center"
        >
          {/* Header Banner: Gradient from red to vibrant orange with soft radial glow */}
          <div className="bg-gradient-to-b from-[#e61919] via-[#f43f14] to-[#f95716] p-7 text-white text-center relative overflow-hidden">
            <div className="size-16 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-3.5 shadow-inner ring-4 ring-white/10">
              <ShieldAlert className="size-8 text-white" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight text-white">
              {isMaintenance ? 'Platform Under Maintenance' : 'Session Terminated'}
            </h3>
            <p className="text-xs text-orange-100 font-semibold mt-1">
              {isMaintenance ? 'Scheduled System Maintenance in Progress' : 'Administrator / Inactivity Action'}
            </p>
          </div>

          {/* Body Content */}
          <div className="p-6 pt-5 space-y-4">
            {/* Callout box */}
            <div className="p-4 bg-[#fffbeb] border border-[#fef3c7] rounded-2xl text-left flex items-start gap-3 shadow-xs">
              <AlertCircle className="size-5 text-[#d97706] shrink-0 mt-0.5" />
              <div className="text-xs text-[#92400e] leading-relaxed">
                <p className="font-bold text-sm text-[#78350f] mb-1">
                  {isMaintenance ? 'Maintenance Notice' : 'Session Notification'}
                </p>
                <p>{modalData.reason}</p>
                <p className="mt-1 text-slate-500 font-medium">We apologize for the inconvenience.</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-normal px-1 text-center font-normal">
              {modalData.reason?.includes('another device') 
                ? `Automatic logout in ${countdown}s for account security.`
                : isMaintenance ? 'The platform is currently undergoing maintenance. Please check back shortly.' : `Automatic redirect in ${countdown}s. Please authenticate again when ready.`}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleRedirect}
                className="w-full py-3.5 px-5 rounded-2xl text-sm font-bold text-white bg-[#e50914] hover:bg-[#c70812] shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowRight className="size-4" />
                <span>Return to {isAdmin ? 'Admin' : 'User'} Log In ({countdown}s)</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

