import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import userService from '@/services/api/userService';

/**
 * MaintenanceCountdownBar
 * Renders a timer beside the Zyndex logo on user & admin portals when platform maintenance is scheduled in 15 minutes.
 */
export default function MaintenanceCountdownBar({ isPrimaryAdmin, inline = false }) {
  const [scheduledAt, setScheduledAt] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(null);

  useEffect(() => {
    let timerId = null;

    const checkMaintenance = async () => {
      try {
        const res = await userService.getMaintenanceMode();
        // If maintenanceMode is false or scheduledAt was removed (cancelled), immediately clear the timer
        if (res?.maintenanceMode && res?.scheduledAt) {
          const startTime = new Date(res.scheduledAt).getTime();
          const targetTime = startTime + 15 * 60 * 1000; // 15 minutes in ms
          const now = Date.now();
          const remainingSecs = Math.max(0, Math.floor((targetTime - now) / 1000));
          setScheduledAt(res.scheduledAt);
          setSecondsRemaining(remainingSecs);

          // If time reached 0, trigger official active maintenance
          if (remainingSecs <= 0 && !isPrimaryAdmin) {
            userService.finalizeMaintenanceActive().catch(() => {});
          }
        } else {
          // Immediately disable the timer bar
          setScheduledAt(null);
          setSecondsRemaining(null);
        }
      } catch (err) {}
    };

    checkMaintenance();
    // Poll every 3 seconds so cancellation reflects immediately on client screens
    const pollInterval = setInterval(checkMaintenance, 3000);

    return () => clearInterval(pollInterval);
  }, [isPrimaryAdmin]);

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

  if (secondsRemaining === null || isPrimaryAdmin) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (inline) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full text-xs font-semibold shadow-xs animate-pulse border border-amber-400/40 select-none">
        <Clock className="size-3.5 text-amber-100" />
        <span className="font-medium text-amber-50">Maintenance in:</span>
        <span className="font-mono font-bold tracking-wider text-white bg-black/25 px-1.5 py-0.5 rounded text-[11px]">
          {formattedTime}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between z-[9990] sticky top-0">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 animate-bounce shrink-0" />
        <span>Platform Scheduled Maintenance: Service temporarily offline in</span>
      </div>
      <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-full font-mono text-xs tracking-wider border border-white/20">
        <Clock className="size-3.5 text-amber-200" />
        <span className="font-bold text-amber-100">{formattedTime}</span>
      </div>
    </div>
  );
}

