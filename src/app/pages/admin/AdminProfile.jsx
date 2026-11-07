import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Save, Shield, Edit, X, Trash2, Activity, MessageSquare, BookOpen, Laptop, Bell, Check, Clock, Radio, AlertTriangle } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import { useAuth } from '@/app/context/AuthContext';
import userService from '@/services/api/userService';
import PasswordChangePanel from '@/app/components/PasswordChangePanel';
import DeleteAccountModal from '@/app/components/DeleteAccountModal';

export default function AdminProfile() {
  const { user, updateProfile, isPrimaryAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '', bio: '', role: 'Administrator' });

  // Admin Activity Metrics & Security Hardening State
  const [activityMetrics, setActivityMetrics] = useState({
    actionsThisMonth: 0,
    resolvedFeedbackCount: 0,
    totalFeedbackCount: 0,
    resolutionRate: 100,
    contentCurated: 0
  });

  const [sessionTelemetry, setSessionTelemetry] = useState({
    currentIp: '127.0.0.1',
    tokenIssuedAt: '',
    browserFingerprint: 'Chrome on Windows (V8 Engine)',
    securityVersion: 'v1'
  });

  const [alertPreferences, setAlertPreferences] = useState({
    adminNotifyAccessRequests: true,
    adminNotifyBankUtr: true,
    adminNotifyRateLimitSpikes: true,
    adminNotifyAccountDeletions: true
  });
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);

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
        const [metricsRes, sessRes, prefRes] = await Promise.allSettled([
          userService.getAdminActivityMetrics(),
          userService.getActiveSessions(),
          userService.getUserPreferences()
        ]);

        if (metricsRes.status === 'fulfilled' && metricsRes.value) {
          setActivityMetrics(metricsRes.value);
        }

        if (sessRes.status === 'fulfilled' && sessRes.value) {
          setSessionTelemetry({
            currentIp: sessRes.value.currentIp || '127.0.0.1',
            tokenIssuedAt: new Date().toLocaleTimeString(),
            browserFingerprint: `${navigator.userAgent.includes('Chrome') ? 'Google Chrome' : 'Standard Web Browser'} (${navigator.platform || 'Desktop'})`,
            securityVersion: `v${sessRes.value.sessionTokenVersion || 1}`
          });
        }

        if (prefRes.status === 'fulfilled' && prefRes.value) {
          setAlertPreferences({
            adminNotifyAccessRequests: prefRes.value.adminNotifyAccessRequests !== false,
            adminNotifyBankUtr: prefRes.value.adminNotifyBankUtr !== false,
            adminNotifyRateLimitSpikes: prefRes.value.adminNotifyRateLimitSpikes !== false,
            adminNotifyAccountDeletions: prefRes.value.adminNotifyAccountDeletions !== false
          });
        }
      } catch (e) {
        console.error('Failed to load admin profile telemetry:', e);
      }
    }
    loadAdminData();
  }, []);

  const handleSaveAlerts = async (e) => {
    e?.preventDefault();
    setSavingAlerts(true);
    setAlertSuccess(false);
    try {
      const res = await userService.updateUserPreferences(alertPreferences);
      setAlertPreferences({
        adminNotifyAccessRequests: res.adminNotifyAccessRequests !== false,
        adminNotifyBankUtr: res.adminNotifyBankUtr !== false,
        adminNotifyRateLimitSpikes: res.adminNotifyRateLimitSpikes !== false,
        adminNotifyAccountDeletions: res.adminNotifyAccountDeletions !== false
      });
      setAlertSuccess(true);
      setTimeout(() => setAlertSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save alert preferences.');
    } finally {
      setSavingAlerts(false);
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Administrator Profile & Security</h1>
              <p className="text-xs text-gray-500 mt-0.5">Authoritative governance metrics, session telemetry, and alert dispatch preferences</p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-xs font-bold">
              <Shield className="size-4 text-orange-600" />
              {isPrimaryAdmin ? 'Primary Root Authority' : 'Operations Admin'}
            </div>
          </div>

          {/* Admin Activity & Performance Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-xs hover:border-blue-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Actions This Month</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Activity className="size-4" /></div>
              </div>
              <div className="text-2xl font-black text-gray-900">{activityMetrics.actionsThisMonth}</div>
              <p className="text-[11px] text-blue-600 font-medium mt-1">Audit log records & approvals executed</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Feedback Resolution</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><MessageSquare className="size-4" /></div>
              </div>
              <div className="text-2xl font-black text-gray-900">{activityMetrics.resolutionRate}%</div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">{activityMetrics.resolvedFeedbackCount} of {activityMetrics.totalFeedbackCount} inquiries resolved</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-xs hover:border-purple-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Content Curated</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><BookOpen className="size-4" /></div>
              </div>
              <div className="text-2xl font-black text-gray-900">{activityMetrics.contentCurated}</div>
              <p className="text-[11px] text-purple-600 font-medium mt-1">Active verified academic resources</p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Admin Avatar & Authority Details */}
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

            {/* Current Session Telemetry */}
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

          {/* Right Column: Profile Edit, Alert Preferences, Security */}
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

            {/* Admin Alert Preferences Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="size-4 text-orange-600" />
                    Admin Notification & Alert Preferences
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Real-time alerts dispatched to your administrative email inbox</p>
                </div>
              </div>

              <form onSubmit={handleSaveAlerts} className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={alertPreferences.adminNotifyAccessRequests}
                    onChange={(e) => setAlertPreferences({ ...alertPreferences, adminNotifyAccessRequests: e.target.checked })}
                    className="mt-0.5 size-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900">New Admin Access Requests</span>
                    <p className="text-[11px] text-gray-500">Immediate email dispatch when a scholar submits an administrative access endorsement request.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={alertPreferences.adminNotifyBankUtr}
                    onChange={(e) => setAlertPreferences({ ...alertPreferences, adminNotifyBankUtr: e.target.checked })}
                    className="mt-0.5 size-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900">Offline Bank UTR Verification Pending</span>
                    <p className="text-[11px] text-gray-500">Instant notification when a user submits a 12-digit UPI bank reference for manual credit reconciliation.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={alertPreferences.adminNotifyRateLimitSpikes}
                    onChange={(e) => setAlertPreferences({ ...alertPreferences, adminNotifyRateLimitSpikes: e.target.checked })}
                    className="mt-0.5 size-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900">High-Frequency Rate-Limiting & Failed Login Spikes</span>
                    <p className="text-[11px] text-gray-500">Alert triggers when multiple suspicious or failed credential attempts occur from the same network IP.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={alertPreferences.adminNotifyAccountDeletions}
                    onChange={(e) => setAlertPreferences({ ...alertPreferences, adminNotifyAccountDeletions: e.target.checked })}
                    className="mt-0.5 size-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900">User Account Deletion Events</span>
                    <p className="text-[11px] text-gray-500">Audit notice dispatched when a scholar completes 4-digit OTP deletion and purges their account.</p>
                  </div>
                </label>

                <div className="flex items-center justify-between pt-2">
                  {alertSuccess ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <Check className="size-4" /> Alert preferences updated!
                    </span>
                  ) : <span />}
                  <button
                    type="submit"
                    disabled={savingAlerts}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="size-4" />
                    {savingAlerts ? 'Saving...' : 'Save Alert Settings'}
                  </button>
                </div>
              </form>
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
    </AdminLayout>
  );
}
