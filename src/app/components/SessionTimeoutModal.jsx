import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Clock, LogIn, ShieldAlert } from 'lucide-react';

/**
 * Global Session Timeout & Inactivity Modal
 * Listens for 30-minute idle timeouts and JWT expiration events,
 * and displays a clear, informative modal directing users or admins back to their login page.
 */
export default function SessionTimeoutModal() {
  const [modalData, setModalData] = useState(null); // { role, reason }

  useEffect(() => {
    const handleSessionExpired = (e) => {
      setModalData(e.detail || {
        role: 'user',
        reason: 'Your session has expired due to 30 minutes of inactivity. Please log in again to continue.'
      });
    };

    window.addEventListener('zyndex:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('zyndex:session-expired', handleSessionExpired);
    };
  }, []);

  if (!modalData) return null;

  const isAdmin = modalData.role === 'admin';
  const loginPath = isAdmin ? '/Zyndex/Admin/Log-In' : '/Zyndex/User/Log-In';

  const handleRedirect = () => {
    setModalData(null);
    window.location.href = loginPath;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-center"
        >
          {/* Header Banner */}
          <div className={`p-6 ${isAdmin ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-gradient-to-r from-orange-500 to-amber-500'} text-white`}>
            <div className="size-16 rounded-2xl bg-white/20 mx-auto flex items-center justify-center mb-3 shadow-inner">
              {isAdmin ? <ShieldAlert className="size-8 text-white" /> : <Clock className="size-8 text-white" />}
            </div>
            <h3 className="text-xl font-black tracking-tight">Session Time-Out</h3>
            <p className="text-xs text-orange-100 font-medium mt-1">
              30-Minute Inactivity Protection Triggered
            </p>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-left flex items-start gap-3">
              <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed font-medium">
                <p className="font-bold mb-1">Why was I logged out?</p>
                <p>
                  To secure your academic account and data, sessions automatically terminate after{' '}
                  <span className="font-bold underline">30 minutes</span> without active interactions or upon token expiration.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {modalData.reason || 'Please log in again to resume your research and continue browsing Zyndex.'}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleRedirect}
                className={`w-full py-3.5 px-5 rounded-2xl text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isAdmin
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                    : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/30'
                }`}
              >
                <LogIn className="size-4" />
                <span>Return to {isAdmin ? 'Admin' : 'User'} Log In</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

