import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router';
import { motion } from 'motion/react';
import { User, Mail, Settings, Save, Heart, Edit, X, GraduationCap, Building, CreditCard, Hash, FileText, Download, Receipt, Printer, Trash2, Shield, Laptop, Smartphone, Globe, LogOut, CheckCircle2, Info, ChevronDown, ChevronUp, History, Clock } from 'lucide-react';
import UserLayout from '@/app/components/UserLayout';
import InvoiceModal from '@/app/components/InvoiceModal';
import StatementModal from '@/app/components/StatementModal';
import DeleteAccountModal from '@/app/components/DeleteAccountModal';
import { generateSingleInvoiceHtml, openPrintableDocument } from '@/utils/invoiceGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAuth } from '@/app/context/AuthContext';
import userService from '@/services/api/userService';
import subscriptionService from '@/services/api/subscriptionService';
import PasswordChangePanel from '@/app/components/PasswordChangePanel';
import { getOrCreateDeviceToken, getDeviceInfo, fetchClientPublicIp, getCachedClientIp, formatSessionDuration, formatDateTime, formatDateOnly, formatTimeOnly } from '@/utils/deviceHelper';

export default function UserProfile() {
  const { user, updateProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [favourites, setFavourites] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [billingError, setBillingError] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [sessionsData, setSessionsData] = useState({ currentIp: '127.0.0.1', devices: [] });
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState(null);
  const [expandedDeviceKey, setExpandedDeviceKey] = useState(null);

  const [profileData, setProfileData] = useState({ 
    name: '', 
    email: '', 
    bio: '', 
    collegeName: '', 
    universityName: '',
    registrationNo: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        collegeName: user.collegeName || '',
        universityName: user.universityName || '',
        registrationNo: user.registrationNo || '',
      });
    }
  }, [user]);

  useEffect(() => {
    async function loadFavorites() {
      try {
        const response = await userService.getFavorites();
        setFavourites(response.resources || []);
      } catch (error) {
        console.error('Failed to load favorites:', error);
      }
    }

    loadFavorites();
  }, []);

  useEffect(() => {
    async function loadSessionData() {
      if (!user?.id) return;
      try {
        // Resolve real device public IP asynchronously if needed
        let publicIp = getCachedClientIp();
        if (!publicIp) {
          fetchClientPublicIp().then(ip => {
            if (ip) {
              setSessionsData(prev => ({
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

          setSessionsData({
            ...sessRes,
            currentIp: resolvedCurrentIp,
            devices: (sessRes.devices || []).map(d => ({
              ...d,
              ip_address: normalizeIp(d.ip_address)
            }))
          });
        }
      } catch (e) {
        console.error('Failed to load session data:', e);
      }
    }
    loadSessionData();
    const interval = window.setInterval(loadSessionData, 5000);
    return () => window.clearInterval(interval);
  }, [user?.id]);

  const handleRevokeOtherSessions = async () => {
    if (!window.confirm('Log out from all other devices?\n\nYou will remain logged in on this browser, but all other active logins and recognized sessions will be immediately signed out.')) {
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
    // Optimistically update UI so device card immediately disappears
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

  const loadBillingData = async () => {
    setLoadingBilling(true);
    setBillingError(null);
    try {
      const [subRes, pmtsRes] = await Promise.all([
        subscriptionService.getMe(),
        subscriptionService.getPayments()
      ]);
      setActiveSub(subRes);
      setPayments(pmtsRes || []);
    } catch (error) {
      console.error('Failed to load billing data:', error);
      setBillingError('Failed to fetch current subscription details. Please retry.');
    } finally {
      setLoadingBilling(false);
    }
  };

  useEffect(() => {
    if (getActiveTabFromPath() === 'billing') {
      loadBillingData();
    }
  }, [location.pathname]);

  const handleCancelSub = async () => {
    setCancelLoading(true);
    try {
      await subscriptionService.cancelSubscription();
      setCancelModalOpen(false);
      await loadBillingData();
    } catch (err) {
      alert(err.message || "Failed to cancel subscription.");
    } finally {
      setCancelLoading(false);
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

  // Base profile URL components
  const userName = user?.name ? encodeURIComponent(user.name.replace(/\s+/g, '-')) : 'user';
  const userEmail = user?.email ? encodeURIComponent(user.email) : 'email';
  const profileBaseUrl = `/Zyndex/User/${userName}/${userEmail}/Profile`;

  // Get active tab from path URL
  const getActiveTabFromPath = () => {
    if (location.pathname.endsWith('/My-Favorites')) return 'favourites';
    if (location.pathname.endsWith('/Account-Settings')) return 'settings';
    if (location.pathname.endsWith('/Security-and-Devices') || location.pathname.endsWith('/Sessions')) return 'sessions';
    if (location.pathname.endsWith('/Billing')) return 'billing';
    return 'favourites'; // fallback/default
  };

  // Sync tab clicks to router navigation
  const handleTabChange = (val) => {
    if (val === 'favourites') navigate(`${profileBaseUrl}/My-Favorites`);
    else if (val === 'settings') navigate(`${profileBaseUrl}/Account-Settings`);
    else if (val === 'sessions') navigate(`${profileBaseUrl}/Security-and-Devices`);
    else if (val === 'billing') navigate(`${profileBaseUrl}/Billing`);
  };

  // Check if user is subscribed to student or university plan
  const isStudentOrUnivPlan = user?.subscriptionPlan && 
    (user.subscriptionPlan.includes('STUDENT') || user.subscriptionPlan.includes('UNIVERSITY'));

  const getPlanPrice = (plan) => {
    if (!plan || plan === 'FREE') return '₹0';
    if (plan.includes('BASIC')) return '₹99';
    if (plan.includes('PLUS')) return '₹199';
    if (plan.includes('PRO') || plan.includes('RESEARCHER')) return '₹499';
    if (plan.includes('UNIVERSITY') || plan.includes('FACULTY') || plan.includes('EDUCATOR')) return '₹999';
    return '₹1,999';
  };

  const getPlanDuration = (plan) => {
    if (!plan || plan === 'FREE') return 'Forever';
    return '30 Days';
  };

  const handleCollegeUnivChange = (val) => {
    setProfileData({ ...profileData, collegeName: val, universityName: val });
  };

  return (
    <UserLayout>
      <div className="py-12 px-6 min-h-[calc(100vh+80px)] pb-32">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 text-center h-fit">
              <div className="size-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-3xl font-semibold mx-auto mb-4">
                {profileData.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{profileData.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{profileData.email}</p>
              {isStudentOrUnivPlan && profileData.collegeName && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full inline-flex items-center gap-1 mb-4">
                  ✓ Verified Student
                </span>
              )}

              {/* Current Session Telemetry */}
              <div className="mt-4 pt-4 border-t border-gray-100 text-left space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                  </span>
                  <h4 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider">Current Session Telemetry</h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Authenticated IP Address</span>
                    <span className="font-mono font-bold text-gray-800">{sessionsData.currentIp || '127.0.0.1'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Token Issuance Status</span>
                    <span className="font-mono font-bold text-emerald-700">Active (HMAC-SHA256 &bull; v{sessionsData.sessionTokenVersion || 1})</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Client Runtime Fingerprint</span>
                    <span className="text-gray-700 font-medium">
                      {navigator.userAgent.includes('Chrome') ? 'Google Chrome' : navigator.userAgent.includes('Firefox') ? 'Mozilla Firefox' : 'Standard Web Browser'} ({navigator.platform || 'Desktop/Mobile'})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 bg-white rounded-xl shadow-md">
              <Tabs value={getActiveTabFromPath()} onValueChange={handleTabChange} className="w-full">
                <div className="border-b border-gray-100 px-3 sm:px-6 pt-3 sm:pt-4 overflow-x-auto no-scrollbar">
                  <TabsList className="bg-orange-50/60 p-1 rounded-xl inline-flex flex-nowrap min-w-full sm:min-w-0">
                    <TabsTrigger
                      value="favourites"
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all whitespace-nowrap shrink-0"
                    >
                      <Heart className="size-3.5 sm:size-4 mr-1.5" />
                      My Favourites
                    </TabsTrigger>
                    <TabsTrigger
                      value="settings"
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all whitespace-nowrap shrink-0"
                    >
                      <Settings className="size-3.5 sm:size-4 mr-1.5" />
                      Account Settings
                    </TabsTrigger>
                    <TabsTrigger
                      value="sessions"
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all whitespace-nowrap shrink-0"
                    >
                      <Shield className="size-3.5 sm:size-4 mr-1.5" />
                      Security & Devices
                    </TabsTrigger>
                    <TabsTrigger
                      value="billing"
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all whitespace-nowrap shrink-0"
                    >
                      <CreditCard className="size-3.5 sm:size-4 mr-1.5" />
                      Billing & Plans
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="favourites" className="p-6">
                  {favourites.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <Heart className="size-16 mx-auto mb-4 text-orange-200" />
                      <p className="text-lg font-medium mb-2">No favourites yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {favourites.map((favourite) => (
                        <div key={favourite.id} className="border border-gray-200 rounded-lg p-4">
                          <p className="font-semibold text-gray-900">{favourite.title}</p>
                          <p className="text-sm text-gray-500">{favourite.category} | Author of Resource: {favourite.subject}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="settings" className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium"><Edit className="size-4" />Edit Profile</button>
                    ) : (
                      <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium"><X className="size-4" />Cancel</button>
                    )}
                  </div>

                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <input type="text" name="name" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} disabled={!isEditing} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-50" />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <input type="email" name="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} disabled={!isEditing} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-50" />
                    </div>

                    {isStudentOrUnivPlan && (
                      <>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                          <input 
                            type="text" 
                            name="collegeName" 
                            value={profileData.collegeName} 
                            onChange={(e) => handleCollegeUnivChange(e.target.value)} 
                            disabled={!isEditing} 
                            placeholder="College / University Name" 
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-50" 
                            required 
                          />
                        </div>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                          <input 
                            type="text" 
                            name="registrationNo" 
                            value={profileData.registrationNo} 
                            onChange={(e) => setProfileData({ ...profileData, registrationNo: e.target.value })} 
                            disabled={!isEditing} 
                            placeholder="Student ID / Registration Number" 
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-50" 
                            required 
                          />
                        </div>
                      </>
                    )}

                    {isEditing && <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium"><Save className="size-4" />Save Changes</button>}
                  </form>
                  <PasswordChangePanel user={user} />

                  {/* Danger Zone: Self-Delete User Account */}
                  <div className="mt-8 pt-6 border-t border-red-200">
                    <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-red-900">Delete Account</h4>
                        <p className="text-xs text-red-700 mt-0.5">
                          Permanently delete your scholar account, reading history, and saved data with feedback and 4-digit OTP verification.
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
                </TabsContent>

                {/* Security & Trusted Devices Tab */}
                <TabsContent value="sessions" className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Where You're Logged In</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Check your current active device and manage logins across browsers</p>
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
                                <h3 className="text-sm font-bold text-gray-900">
                                  {currentInfo.os || 'Personal Device'} &bull; {currentInfo.browser || 'Browser'}
                                </h3>
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
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                      Login Activity on Other Browsers & Devices
                    </h3>

                    {(() => {
                      const currentToken = localStorage.getItem('zyndex_device_token') || localStorage.getItem('device_token') || '';
                      // Exclude the current device token from other devices
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
                              const isExpanded = expandedDeviceKey === group.key;
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
                                      {/* Info Button to expand session history logs */}
                                      <button
                                        type="button"
                                        onClick={() => setExpandedDeviceKey(isExpanded ? null : group.key)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
                                          isExpanded 
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                        title="View device login session history"
                                      >
                                        <Info className="size-3.5 text-indigo-600" />
                                        <span className="hidden sm:inline">Info ({group.sessions.length})</span>
                                        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
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

                                  {/* Expandable Session Logs Drawer */}
                                  {isExpanded && (
                                    <div className="bg-slate-50/90 border-t border-slate-200/80 p-4 sm:p-5">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <History className="size-4 text-indigo-600" />
                                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                            Session History & Activity Logs ({group.sessions.length} Recorded {group.sessions.length === 1 ? 'Login' : 'Logins'})
                                          </h4>
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-medium">Accurate live hardware telemetry</span>
                                      </div>

                                      <div className="space-y-2.5">
                                        {group.sessions.map((sess, idx) => {
                                          const isCurrentRowActive = Boolean(sess.is_active !== false && sess.is_active !== 0 && !sess.logged_out_at);
                                          const startFormatted = formatTimeOnly(sess.trusted_at);
                                          const endFormatted = isCurrentRowActive ? 'Active Now' : (sess.logged_out_at ? formatTimeOnly(sess.logged_out_at) : 'Expired');
                                          const dateFormatted = formatDateOnly(sess.trusted_at);
                                          const durationFormatted = formatSessionDuration(sess.total_active_seconds || (sess.trusted_at ? Math.max(0, Math.floor(((sess.logged_out_at ? new Date(sess.logged_out_at).getTime() : Date.now()) - new Date(sess.trusted_at).getTime()) / 1000)) : 0));

                                          return (
                                            <div
                                              key={sess.id || idx}
                                              className="bg-white border border-slate-200/70 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
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

                                              <div className="flex sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 text-[11px] gap-1">
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
                                  )}
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

                  {/* Device Trust & Account Protection Policy Note */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                    <Shield className="size-5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">24-Hour Trusted Device Policy</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        When you select "This is a trusted device" during login, Zyndex remembers your device securely for 24 hours. At midnight IST, all active trust sessions automatically renew verification requirements to safeguard your scholar account.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="billing" className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Billing & Subscriptions</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Authoritative subscription status, payment receipts, and tax invoices</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setStatementModalOpen(true)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors text-xs flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                        title="View and Download Consolidated Billing Statement"
                      >
                        <Receipt className="size-4 text-slate-600" /> Total Billing Statement
                      </button>
                      <Link 
                        to={`/Zyndex/User/${userName}/${userEmail}/Profile/Billing/Pricing`} 
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-colors text-xs shadow-xs"
                      >
                        Change / Upgrade Plan
                      </Link>
                    </div>
                  </div>

                  {loadingBilling ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="size-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-medium text-slate-600">Retrieving authoritative subscription status...</p>
                    </div>
                  ) : billingError ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-red-700 text-sm">
                        <p className="font-semibold">Unable to fetch live subscription status</p>
                        <p className="text-xs text-red-600 mt-0.5">{billingError}</p>
                      </div>
                      <button 
                        onClick={loadBillingData}
                        className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors shrink-0"
                      >
                        Retry Fetch
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Subscription Plan</p>
                          <p className="text-xl font-bold text-slate-800 mt-1">
                            {activeSub?.planName || activeSub?.plan_name || 'Free / Demo'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pricing / Interval</p>
                          <p className="text-base text-slate-700 mt-1">
                            {activeSub?.pricePaise !== undefined && activeSub.pricePaise > 0
                              ? `₹${activeSub.pricePaise / 100}`
                              : activeSub?.price_paise !== undefined && activeSub.price_paise > 0
                              ? `₹${activeSub.price_paise / 100}`
                              : getPlanPrice(activeSub?.planId || user?.subscriptionPlan)} / {activeSub?.billingInterval || activeSub?.billing_interval || 'Forever'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Status</p>
                          <div className="mt-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              activeSub?.status === 'ACTIVE' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : activeSub?.status === 'CANCELLED'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              <span className={`size-2 rounded-full ${
                                activeSub?.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' :
                                activeSub?.status === 'CANCELLED' ? 'bg-amber-500' : 'bg-slate-400'
                              }`} />
                              {activeSub?.status === 'ACTIVE' 
                                ? 'Active' 
                                : activeSub?.status === 'CANCELLED'
                                ? 'Cancelled (Active until expiry)'
                                : 'Free Tier'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subscription Validity</p>
                          <p className="text-base text-slate-700 mt-1">
                            {activeSub?.endDate || activeSub?.end_date 
                              ? `Expires on ${new Date(activeSub.endDate || activeSub.end_date).toLocaleDateString()}` 
                              : 'Lifetime / Free Tier Access'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!loadingBilling && activeSub?.status === 'ACTIVE' && activeSub?.planId !== 'FREE' && (
                    <div className="flex items-center justify-between p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Subscription Expiration & Renewal Policy</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Zyndex never automatically charges your payment method. When your plan period expires, your account will automatically revert to the Free plan. A reminder email will be sent 1 day before your plan ends.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Billing History & Invoices</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                      {payments.length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center">No payment transactions recorded.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left min-w-[640px]">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4 font-semibold text-slate-600">Date</th>
                              <th className="py-3 px-4 font-semibold text-slate-600">Payment ID</th>
                              <th className="py-3 px-4 font-semibold text-slate-600">UTR Number</th>
                              <th className="py-3 px-4 font-semibold text-slate-600">Amount</th>
                              <th className="py-3 px-4 font-semibold text-slate-600">Status</th>
                              <th className="py-3 px-4 font-semibold text-slate-600 text-right">Tax Invoice</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map((pmt) => (
                              <tr key={pmt.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-4 text-slate-500 text-xs">
                                  {new Date(pmt.created_at || pmt.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3.5 px-4 text-slate-800 font-mono text-xs">
                                  {pmt.gateway_payment_id || pmt.id}
                                </td>
                                <td className="py-3.5 px-4">
                                  {pmt.utr ? (
                                    <span className="font-mono text-xs font-bold text-orange-900 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded select-all">
                                      {pmt.utr}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-xs">Pending</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-slate-800 font-bold">
                                  ₹{pmt.amount_paise / 100}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border uppercase ${
                                    pmt.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                    pmt.status === 'PAYMENT_INITIATED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                    pmt.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                    pmt.status === 'FAILED' ? 'bg-red-100 text-red-800 border-red-300' :
                                    pmt.status === 'DECLINED' ? 'bg-red-100 text-red-800 border-red-300' :
                                    pmt.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border-red-300' :
                                    pmt.status === 'REVIEW_REQUIRED' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                    pmt.status === 'EXPIRED' ? 'bg-gray-800 text-gray-100 border-gray-900' :
                                    'bg-slate-200 text-slate-800 border-slate-300'
                                  }`}>
                                    {pmt.status === 'FAILED' && pmt.failure_reason?.includes('DECLINE') ? 'DECLINED' : pmt.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedInvoice({
                                          id: pmt.id,
                                          paymentId: pmt.gateway_payment_id || pmt.id,
                                          orderId: pmt.gateway_order_id || 'ORD_HIST',
                                          date: new Date(pmt.created_at || pmt.createdAt).toLocaleString(),
                                          planName: pmt.plan_id ? pmt.plan_id.replace(/_/g, ' ') : (activeSub?.planName || 'Student Plus'),
                                          amount: (pmt.amount_paise / 100).toFixed(2),
                                          customerName: user?.name,
                                          customerEmail: user?.email,
                                          paymentMethod: pmt.payment_method || 'UPI',
                                          status: pmt.status || 'PAID'
                                        });
                                        setInvoiceModalOpen(true);
                                      }}
                                      className="inline-flex items-center justify-center p-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-semibold transition-all shadow-xs"
                                      title="Tax Invoice"
                                      aria-label="Tax Invoice"
                                    >
                                      <FileText className="size-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Single Tax Invoice Viewer & Downloader Modal */}
      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        invoiceData={selectedInvoice}
      />

      {/* Total Consolidated Billing Statement Modal */}
      <StatementModal
        isOpen={statementModalOpen}
        onClose={() => setStatementModalOpen(false)}
        userData={user}
        payments={payments}
        activeSub={activeSub}
      />

      <DeleteAccountModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        user={user}
      />
    </UserLayout>
  );
}
