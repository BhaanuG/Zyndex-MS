import { X, Shield, Smartphone, Laptop, Globe, Clock, History, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatSessionDuration, formatDateTime, formatDateOnly, formatTimeOnly } from '@/utils/deviceHelper';

export default function DeviceInfoModal({ isOpen, onClose, deviceGroup }) {
  if (!isOpen || !deviceGroup) return null;

  const d = deviceGroup.device || (deviceGroup.sessions && deviceGroup.sessions[0]) || {};
  const sessions = deviceGroup.sessions || [d];
  const isMobile = /mobile|iphone|android|ipad/i.test(d.operating_system || d.device_name || '');
  const isActive = Boolean(d.is_active !== false && d.is_active !== 0 && !d.logged_out_at);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200/90 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isActive 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {isMobile ? <Smartphone className="size-5" /> : <Laptop className="size-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {d.operating_system || 'Unknown OS'} • {d.browser || 'Browser'}
                </h3>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active Now
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    Logged Out
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentic Hardware Telemetry & Security Audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Hardware & Network Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Public IP Address
              </span>
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-indigo-500" />
                <span className="font-mono text-xs font-bold text-slate-900">
                  {d.ip_address || '127.0.0.1'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Client Platform / OS
              </span>
              <div className="flex items-center gap-2">
                {isMobile ? <Smartphone className="size-4 text-sky-500" /> : <Laptop className="size-4 text-sky-500" />}
                <span className="text-xs font-bold text-slate-900">
                  {d.operating_system || 'Unknown'} ({d.device_name || 'Standard Device'})
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Browser & Rendering Engine
              </span>
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-900">
                  {d.browser || 'Web Browser'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Device Token Fingerprint
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                  {d.device_token ? `${d.device_token.slice(0, 16)}...` : 'SECURE_TOKEN_ACTIVE'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Cumulative Active Time
              </span>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-indigo-600" />
                <span className="font-mono text-xs font-bold text-indigo-700">
                  {formatSessionDuration(d.total_active_seconds || (d.trusted_at ? Math.max(0, Math.floor((Date.now() - new Date(d.trusted_at).getTime()) / 1000)) : 0))}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Security Trust Classification
              </span>
              <div className="flex items-center gap-1.5">
                {d.is_trusted ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">Trusted 24-Hour Session</span>
                  </>
                ) : (
                  <>
                    <Shield className="size-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-700">Standard Protected Session</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Session History & Recorded Logins */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="size-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Session History & Activity Logs ({sessions.length} Recorded {sessions.length === 1 ? 'Login' : 'Logins'})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Live recorded timestamps</span>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {sessions.map((sess, idx) => {
                const isCurrentRowActive = Boolean(sess.is_active !== false && sess.is_active !== 0 && !sess.logged_out_at);
                const startFormatted = formatTimeOnly(sess.trusted_at);
                const endFormatted = isCurrentRowActive ? 'Active Now' : (sess.logged_out_at ? formatTimeOnly(sess.logged_out_at) : 'Expired');
                const dateFormatted = formatDateOnly(sess.trusted_at);
                const durationFormatted = formatSessionDuration(sess.total_active_seconds || (sess.trusted_at ? Math.max(0, Math.floor(((sess.logged_out_at ? new Date(sess.logged_out_at).getTime() : Date.now()) - new Date(sess.trusted_at).getTime()) / 1000)) : 0));

                return (
                  <div
                    key={sess.id || idx}
                    className="bg-white border border-slate-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${isCurrentRowActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                        <Clock className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{dateFormatted}</span>
                          {isCurrentRowActive ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Active Now
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              Logged Out
                            </span>
                          )}
                          {sess.is_trusted && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                              Trusted 24h
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          IP: <span className="font-mono text-slate-700">{sess.ip_address || '127.0.0.1'}</span> &bull; {sess.browser} on {sess.operating_system}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 text-[11px] gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">Session:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {startFormatted} &rarr; {endFormatted}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">Total Active:</span>
                        <span className="font-mono font-bold text-indigo-600">
                          {durationFormatted}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
