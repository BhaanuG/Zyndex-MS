import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Save, Shield, Edit, X, Trash2, Laptop, Smartphone, Globe, LogOut, Check, Radio, Info, ChevronDown, ChevronUp, History, Clock } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import { useAuth } from '@/app/context/AuthContext';
import userService from '@/services/api/userService';
import PasswordChangePanel from '@/app/components/PasswordChangePanel';
import DeleteAccountModal from '@/app/components/DeleteAccountModal';
import DeviceInfoModal from '@/app/components/DeviceInfoModal';
import { getOrCreateDeviceToken, getDeviceInfo, fetchClientPublicIp, getCachedClientIp, formatSessionDuration, formatDateTime, formatDateOnly, formatTimeOnly } from '@/utils/deviceHelper';

export default function AdminProfile() {
  const { user, updateProfile, isPrimaryAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '', bio: '', role: 'Administrator' });

  const [sessionsData, setSessionsData] = useState({ currentIp: '127.0.0.1', devices: [], sessionTokenVersion: 1 });
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState(null);
  const [selectedDeviceInfo, setSelectedDeviceInfo] = useState(null);

  const [sessionTelemetry, setSessionTelemetry] = useState({
    currentIp: '127.0.0.1',
    tokenIssuedAt: '',
    browserFingerprint: 'Chrome on Windows (V8 Engine)',
    securityVersion: 'v1'
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        role: isPrimaryAdmin ? 'Main Administrator' : 'Operations Administrator',
      });
    }
  }, [user, isPrimaryAdmin]);

  useEffect(() => {
    async function loadAdminData() {
      try {
        let publicIp = getCachedClientIp();
        if (!publicIp) {
          fetchClientPublicIp().then(ip => {
            if (ip) {
              setSessionsData(prev => ({
                ...prev,
                currentIp: (!prev.currentIp || prev.currentIp === '127.0.0.1' || prev.currentIp === '0:0:0:0:0:0:0:1' || prev.currentIp === '::1') ? ip : prev.currentIp
              }));
              setSessionTelemetry(prev => ({
                ...prev,
                currentIp: (!prev.currentIp || prev.currentIp === '127.0.0.1' || prev.currentIp === '0:0:0:0:0:0:0:1' || prev.currentIp === '::1') ? ip : prev.currentIp
              }));
            }
          }).catch(() => {});
        }

        const sessRes = await userService.getActiveSessions();
        if (sessRes) {
          const normalizeIp = (ip) => {
            if (!ip || ip === '0:0:0:0:0:0:0:1' || ip === '::1') return publicIp || '127.0.0.1';
            return ip;
          };
          const resolvedCurrentIp = (sessRes.currentIp && sessRes.currentIp !== '127.0.0.1' && sessRes.currentIp !== '0:0:0:0:0:0:0:1' && sessRes.currentIp !== '::1')
            ? sessRes.currentIp
            : (publicIp || sessRes.currentIp || '127.0.0.1');

          const cleanSessions = {
            ...sessRes,
            currentIp: resolvedCurrentIp,
            devices: (sessRes.devices || []).map(d => ({
              ...d,
              ip_address: normalizeIp(d.ip_address)
            }))
          };
          setSessionsData(cleanSessions);
          setSessionTelemetry({
            currentIp: cleanSessions.currentIp,
            tokenIssuedAt: new Date().toLocaleTimeString(),
            browserFingerprint: `${navigator.userAgent.includes('Chrome') ? 'Google Chrome' : 'Standard Web Browser'} (${navigator.platform || 'Desktop'})`,
            securityVersion: `v${sessRes.sessionTokenVersion || 1}`
          });
        }
      } catch (e) {
        console.error('Failed to load admin profile telemetry:', e);
      }
    }
    loadAdminData();
  }, []);

  const handleRevokeOtherSessions = async () => {
    if (!window.confirm('Log out from all other devices?\n\nYou will remain logged in on this browser, but all other active admin logins and recognized sessions will be immediately signed out.')) {
      return;
    }
    setRevokingSessions(true);
    try {
      const currentToken = localStorage.getItem('zyndex_device_token') || localStorage.getItem('device_token') || '';
      const res = await userService.revokeOtherSessions(currentToken);
      if (res?.token) {
        localStorage.setItem('auth_token', res.token);
      }
      setSessionsData((prev) => ({
        ...prev,
        devices: (prev?.devices || []).filter((d) => d.device_token === currentToken),
      }));
      const refreshedSess = await userService.getActiveSessions();
      if (refreshedSess) {
        setSessionsData(refreshedSess);
      }
    } catch (err) {
      alert(err.message || 'Failed to log out from other devices.');
    } finally {
      setRevokingSessions(false);
    }
  };

  const handleRevokeDevice = async (deviceId, deviceName) => {
    if (!window.confirm(`Log out ${deviceName || 'this device'}?\n\nThis will immediately terminate the session and require OTP verification for any future sign-in.`)) {
      return;
    }
    setRevokingDeviceId(deviceId);
    setSessionsData((prev) => ({
      ...prev,
      devices: (prev?.devices || []).filter((d) => d.id !== deviceId),
    }));
    try {
      await userService.revokeDeviceSession(deviceId);
      const refreshedSess = await userService.getActiveSessions();
      if (refreshedSess) {
        setSessionsData(refreshedSess);
      }
    } catch (err) {
      alert(err.message || 'Failed to revoke device session.');
      const refreshedSess = await userService.getActiveSessions();
      if (refreshedSess) {
        setSessionsData(refreshedSess);
      }
    } finally {
      setRevokingDeviceId(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(profileData);
      setIsEditing(false);
    } catch (error) {
      alert(error.message || 'Failed to update profile.');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Administrator Profile & Security</h1>
              <p className="text-xs text-gray-500 mt-0.5">Authoritative governance credentials, active device monitoring, and security telemetry</p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-xs font-bold">
              <Shield className="size-4 text-orange-600" />
              {isPrimaryAdmin ? 'Primary Root Authority' : 'Operations Admin'}
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Admin Avatar, Authority Details & Current Session Telemetry */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
              <div className="size-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-3xl font-semibold mx-auto mb-4 shadow-lg shadow-orange-500/20">
                {profileData.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-0.5">{profileData.name}</h3>
              <p className="text-xs text-gray-500 mb-3 font-mono">{profileData.email}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">
                <Shield className="size-3.5" />
                {profileData.role}
              </div>
            </div>

            {/* Current Session Telemetry (Position retained down of name/email) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Radio className="size-4 text-emerald-600 animate-pulse" />
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Current Session Telemetry</h4>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Authenticated IP Address</span>
                  <span className="font-mono font-bold text-gray-800">{sessionTelemetry.currentIp}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Token Issuance Status</span>
                  <span className="font-mono font-bold text-emerald-700">Active (HMAC-SHA256 &bull; {sessionTelemetry.securityVersion})</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Client Runtime Fingerprint</span>
                  <span className="text-gray-700 font-medium">{sessionTelemetry.browserFingerprint}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Credentials, Devices & Logins, and Security */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Administrator Credentials</h3>
                  <p className="text-xs text-gray-500">Official platform maintainer identity details</p>
                </div>
                {!isEditing ? (
                  <button type="button" onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-600/20 cursor-pointer">
                    <Edit className="size-3.5" />Edit Profile
                  </button>
                ) : (
                  <button type="button" onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer">
                    <X className="size-3.5" />Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    disabled={!isEditing}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-gray-200 rounded-xl disabled:bg-gray-50"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    disabled={!isEditing}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-gray-200 rounded-xl disabled:bg-gray-50 font-mono"
                  />
                </div>
                {isEditing && (
                  <div className="flex justify-end pt-2">
                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-600/20 cursor-pointer">
                      <Save className="size-3.5" />Save Changes
                    </button>
                  </div>
                )}
              </form>

              <PasswordChangePanel user={user} />
            </div>

            {/* Devices & Sessions Management */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="size-4 text-orange-600" />
                    Security & Recognized Devices
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Active administrator sessions and logged-in hardware browsers</p>
                </div>
                {sessionsData.devices && sessionsData.devices.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRevokeOtherSessions}
                    disabled={revokingSessions}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <LogOut className="size-4 text-rose-600" />
                    {revokingSessions ? 'Signing Out Other Devices...' : 'Log out of all other sessions'}
                  </button>
                )}
              </div>

              {/* Current Device Session */}
              {(() => {
                const currentInfo = getDeviceInfo();
                const isMobileCurrent = String(currentInfo.os || '').toLowerCase().includes('android') || 
                                       String(currentInfo.os || '').toLowerCase().includes('ios') ||
                                       String(currentInfo.browser || '').toLowerCase().includes('mobile');
                return (
                  <div className="border border-emerald-200/80 bg-emerald-50/30 rounded-2xl p-5 shadow-2xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-3 flex items-center gap-1.5">
                      <span className="relative flex size-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
                      </span>
                      This Device &bull; Active Now
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="p-3 bg-emerald-100/70 text-emerald-700 rounded-2xl shrink-0 mt-0.5">
                          {isMobileCurrent ? <Smartphone className="size-6 text-emerald-700" /> : <Laptop className="size-6 text-emerald-700" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-gray-900">
                              {currentInfo.os || 'Personal Device'} &bull; {currentInfo.browser || 'Browser'}
                            </h4>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                              Current Session
                            </span>
                          </div>

                          <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5 font-medium">
                            <span>Near IP: <span className="font-mono text-gray-800">{sessionsData.currentIp}</span></span>
                            <span className="text-gray-300">•</span>
                            <span className="text-emerald-700 font-semibold">Active now</span>
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 mt-2 font-mono">
                            <span>Session Start: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-amber-700 font-semibold">Auto-Reset: Midnight IST (00:00)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Other Recognized Devices / Logins */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Login Activity on Other Browsers & Devices
                </h4>

                {(() => {
                  const currentToken = localStorage.getItem('zyndex_device_token') || localStorage.getItem('device_token') || '';
                  const otherRaw = (sessionsData.devices || []).filter((d) => !currentToken || d.device_token !== currentToken);

                  // Group other sessions by device identity (operating_system + browser + device_token)
                  const groupsMap = new Map();
                  otherRaw.forEach((sess) => {
                    const key = sess.device_token || `${sess.operating_system}_${sess.browser}_${sess.device_name}`;
                    if (!groupsMap.has(key)) {
                      groupsMap.set(key, {
                        key,
                        deviceToken: sess.device_token,
                        deviceName: sess.device_name || 'Recognized Device',
                        browser: sess.browser || 'Browser',
                        os: sess.operating_system || 'Device',
                        latestSession: sess,
                        sessions: []
                      });
                    }
                    groupsMap.get(key).sessions.push(sess);
                  });

                  const deviceGroups = Array.from(groupsMap.values());

                  return (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-gray-100">
                      {deviceGroups.length > 0 ? (
                        deviceGroups.map((group) => {
                          const d = group.latestSession;
                          const isMobile = String(d.operating_system || '').toLowerCase().includes('android') ||
                                           String(d.operating_system || '').toLowerCase().includes('ios') ||
                                           String(d.operating_system || '').toLowerCase().includes('phone') ||
                                           String(d.device_name || '').toLowerCase().includes('mobile') ||
                                           String(d.browser || '').toLowerCase().includes('mobile');
                          const isActiveSession = Boolean(d.is_active !== false && d.is_active !== 0 && !d.logged_out_at);

                          return (
                            <div key={group.key} className="transition-colors">
                              <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70">
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className={`p-3 rounded-2xl shrink-0 ${isActiveSession ? 'bg-emerald-100/70 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {isMobile ? (
                                      <Smartphone className={`size-6 ${isActiveSession ? 'text-emerald-700' : 'text-slate-700'}`} />
                                    ) : (
                                      <Laptop className={`size-6 ${isActiveSession ? 'text-emerald-700' : 'text-slate-700'}`} />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-bold text-gray-900 truncate">
                                        {d.operating_system || 'Device'} &bull; {d.browser || 'Browser'}
                                      </p>
                                      {isActiveSession ? (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                          Active Now
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                                          Logged Out
                                        </span>
                                      )}
                                      {d.is_trusted && (
                                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full shrink-0">
                                          Trusted 24h
                                        </span>
                                      )}
                                    </div>

                                    <p className="text-xs text-gray-500 font-medium mt-1">
                                      IP: <span className="font-mono text-gray-700">{d.ip_address || '127.0.0.1'}</span> &bull; {d.device_name || 'Personal Device'}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 font-medium mt-1.5">
                                      <span className="inline-flex items-center gap-1">
                                        <span className="text-slate-400 font-semibold">Latest Login:</span>
                                        <span className="font-mono text-slate-800">
                                          {formatDateTime(d.trusted_at)}
                                        </span>
                                      </span>
                                      <span className="text-slate-300">•</span>
                                      <span className="inline-flex items-center gap-1">
                                        <span className="text-slate-400 font-semibold">Active Duration:</span>
                                        <span className="font-mono text-indigo-700 font-semibold">
                                          {formatSessionDuration(d.total_active_seconds || (d.trusted_at ? Math.max(0, Math.floor((Date.now() - new Date(d.trusted_at).getTime()) / 1000)) : 0))}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Info Button to open detailed telemetry & session history modal */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDeviceInfo(group)}
                                    className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-indigo-600 hover:border-indigo-200"
                                    title="View device telemetry & security information"
                                  >
                                    <Info className="size-3.5 text-indigo-600" />
                                    <span className="hidden sm:inline">Info ({group.sessions.length})</span>
                                  </button>

                                  {isActiveSession && (
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeDevice(d.id, `${d.operating_system} (${d.browser})`)}
                                      disabled={revokingDeviceId === d.id}
                                      className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                                      title="Log out this device"
                                    >
                                      <Trash2 className="size-3.5" />
                                      <span className="hidden sm:inline">{revokingDeviceId === d.id ? 'Logging out...' : 'Log out'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-gray-400">
                          <Globe className="size-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-xs font-semibold text-gray-600">No other recognized sessions</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">You are currently logged in only on this active browser.</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Danger Zone: Delete Regular Admin Account */}
            {!isPrimaryAdmin && (
              <div className="pt-2">
                <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-red-900">Delete Administrator Account</h4>
                    <p className="text-xs text-red-700 mt-0.5">
                      Permanently revoke administrative access and delete your account credentials after feedback and OTP verification.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 shrink-0 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        user={user}
      />

      {/* Hardware Telemetry & Security Information Modal */}
      <DeviceInfoModal
        isOpen={Boolean(selectedDeviceInfo)}
        onClose={() => setSelectedDeviceInfo(null)}
        deviceGroup={selectedDeviceInfo}
      />
    </AdminLayout>
  );
}
