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
            // Trigger 10-second popup only once per maintenance cycle (persisted in sessionStorage)
            if (mode === 'user') {
              const popupSeenKey = `zyndex_maint_popup_seen_${res.scheduledAt}`;
              if (!sessionStorage.getItem(popupSeenKey)) {
                sessionStorage.setItem(popupSeenKey, 'true');
                setShowPopup(true);
              }
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

  // User Portal Top-Right Corner Timer + Centered Modal Popup
  return (
    <>
      {/* 10-Second Auto-Closing Modal Popup for User - Centered in middle of screen */}
      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.25 }}
              className="max-w-md w-full bg-white rounded-2xl shadow-2xl border-2 border-orange-500/40 p-5 overflow-hidden relative"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-md shrink-0">
                  <AlertTriangle className="size-6 animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-slate-900">Platform Maintenance Alert</h4>
                    <button
                      onClick={() => setShowPopup(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      aria-label="Close"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Scheduled system maintenance is starting soon. The platform will enter maintenance mode in 15 minutes.
                  </p>
                  <div className="mt-3 flex items-center justify-between bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 text-xs">
                    <span className="font-semibold text-amber-900">Going offline in:</span>
                    <span className="font-mono font-bold text-orange-700 bg-white px-2.5 py-1 rounded shadow-xs border border-orange-200 text-sm">
                      {formattedTime}
                    </span>
                  </div>
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
          </div>
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

