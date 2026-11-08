import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import userService from '@/services/api/userService';

/**
 * MaintenanceCountdownBar
 * Renders:
 * - for user: top-right corner countdown timer + an automatic 10-second auto-closing notification popup
 * - for admin: bottom of profile sidebar with rich status message and countdown timer
 */
export default function MaintenanceCountdownBar({ isPrimaryAdmin, mode = 'user' }) {
  const [scheduledAt, setScheduledAt] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await userService.getMaintenanceMode();
        if (res?.maintenanceMode && res?.scheduledAt) {
          const startTime = new Date(res.scheduledAt).getTime();
          const targetTime = startTime + 15 * 60 * 1000; // 15 minutes in ms
          const now = Date.now();
          const remainingSecs = Math.max(0, Math.floor((targetTime - now) / 1000));
          
          if (!scheduledAt || scheduledAt !== res.scheduledAt) {
            setScheduledAt(res.scheduledAt);
            // Trigger 10-second popup for user when maintenance is newly detected
            if (mode === 'user') {
              setShowPopup(true);
            }
          }
          setSecondsRemaining(remainingSecs);

          if (remainingSecs <= 0 && res?.isOfficiallyActive && !isPrimaryAdmin) {
            userService.finalizeMaintenanceActive().catch(() => {});
          }
        } else {
          setScheduledAt(null);
          setSecondsRemaining(null);
          setShowPopup(false);
        }
      } catch (err) {}
    };

    checkMaintenance();
    const pollInterval = setInterval(checkMaintenance, 3000);
    return () => clearInterval(pollInterval);
  }, [isPrimaryAdmin, mode, scheduledAt]);

  // Local second ticker
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;
    const ticker = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          if (!isPrimaryAdmin) {
            userService.finalizeMaintenanceActive().catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [secondsRemaining, isPrimaryAdmin]);

  // Auto-close user popup after 10 seconds
  useEffect(() => {
    if (!showPopup) return;
    const closeTimer = setTimeout(() => {
      setShowPopup(false);
    }, 10000); // 10 seconds auto-close
    return () => clearTimeout(closeTimer);
  }, [showPopup]);

  if (secondsRemaining === null || isPrimaryAdmin) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Admin Portal Sidebar Display (positioned at bottom of profile sidebar)
  if (mode === 'admin-sidebar') {
    return (
      <div className="p-3 mx-3 my-2 bg-gradient-to-br from-amber-500/10 via-orange-500/15 to-red-500/10 border border-amber-300 rounded-xl shadow-xs text-slate-800">
        <div className="flex items-center gap-2 mb-1.5 text-amber-800 font-bold text-xs">
          <AlertTriangle className="size-4 text-amber-600 animate-pulse shrink-0" />
          <span>Scheduled Maintenance</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-snug mb-2 font-medium">
          The platform will enter maintenance mode. Services will temporarily go offline.
        </p>
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-amber-200">
          <div className="flex items-center gap-1.5 text-xs text-amber-900 font-semibold">
            <Clock className="size-3.5 text-amber-600" />
            <span>Time Left:</span>
          </div>
          <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
            {formattedTime}
          </span>
        </div>
      </div>
    );
  }

  // User Portal Top-Right Corner Timer + 10s Auto-Close Popup
  return (
    <>
      {/* 10-Second Auto-Closing Modal Popup for User */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-20 right-6 z-[9999] max-w-sm w-full bg-white rounded-2xl shadow-2xl border-2 border-orange-500/40 p-4 overflow-hidden"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-md shrink-0">
                <AlertTriangle className="size-5 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">Platform Maintenance Alert</h4>
                  <button
                    onClick={() => setShowPopup(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Scheduled system maintenance is starting soon. The platform will go to maintenance mode in 15 minutes.
                </p>
                <div className="mt-2.5 flex items-center justify-between bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 text-xs">
                  <span className="font-semibold text-amber-900">Going offline in:</span>
                  <span className="font-mono font-bold text-orange-700 bg-white px-2 py-0.5 rounded shadow-xs border border-orange-200">
                    {formattedTime}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 text-right font-medium">
                  Auto-closing in 10s • Timer remains visible at top right
                </p>
              </div>
            </div>
            {/* 10s visual progress bar */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 10, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Timer Badge at Top-Right Corner */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white rounded-full text-xs font-semibold shadow-md animate-pulse border border-white/20 select-none">
        <Clock className="size-3.5 text-amber-100" />
        <span className="font-medium text-amber-50 hidden sm:inline">Maintenance in:</span>
        <span className="font-mono font-bold tracking-wider text-white bg-black/25 px-1.5 py-0.5 rounded text-[11px]">
          {formattedTime}
        </span>
      </div>
    </>
  );
}

