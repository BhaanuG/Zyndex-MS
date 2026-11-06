import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, AlertCircle, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';

/**
 * Session Expiry Warning Modal (Prompted after 2 hours of inactivity)
 * Notifies users/admins that their session will close in 30 minutes.
 * Offers "Continue Working" or "Logout Now".
 */
export default function SessionWarningModal() {
  const [warningData, setWarningData] = useState(null); // { role }

  useEffect(() => {
    const handleWarning = (e) => {
      setWarningData(e.detail || { role: 'user' });
    };

    window.addEventListener('zyndex:session-warning', handleWarning);
    return () => {
      window.removeEventListener('zyndex:session-warning', handleWarning);
    };
  }, []);

  if (!warningData) return null;

  const isAdmin = warningData.role === 'admin';

  const handleContinue = () => {
    setWarningData(null);
    window.dispatchEvent(new CustomEvent('zyndex:session-continue'));
  };

  const handleLogout = () => {
    setWarningData(null);
    window.dispatchEvent(new CustomEvent('zyndex:session-force-logout'));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-orange-200 overflow-hidden text-center"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-6 text-white text-center relative overflow-hidden">
            <div className="size-16 rounded-2xl bg-white/20 mx-auto flex items-center justify-center mb-3 shadow-inner">
              <ShieldAlert className="size-8 text-white" />
            </div>
            <h3 className="text-xl font-black tracking-tight">Session Expiring Soon</h3>
            <p className="text-xs text-orange-100 font-medium mt-1">
              Your session will close within 30 minutes
            </p>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4">
            <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-left flex items-start gap-3">
              <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 leading-relaxed font-medium">
                <p className="font-bold mb-1">Inactivity Notice</p>
                <p>
                  Your session will expire soon due to inactivity. Would you like to continue working?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              If no action is taken, your session will automatically terminate in 30 minutes to protect your academic account and stored records.
            </p>

            {/* Actions: Continue or Logout */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleContinue}
                className="py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="size-4" />
                <span>Continue Working</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-3 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="size-4 text-slate-500" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
