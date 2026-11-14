import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Edit, Trash2, X, User, Mail, Lock, Hash, KeyRound, Eye, EyeOff, Download, LogOut, Wrench, ArrowUpDown, ArrowUp, ArrowDown, ShieldCheck, CheckCircle } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import { useAuth } from '@/app/context/AuthContext';
import userService from '@/services/api/userService';
import authService from '@/services/api/authService';
import logService from '@/services/api/logService';

const emptyUser = {
  id: null,
  name: '',
  email: '',
  password: '',
  registrationNo: '',
  role: 'user',
  userType: 'Student',
  profession: '',
  collegeName: '',
  universityName: '',
  bio: '',
  active: true,
  subscriptionPlan: 'FREE',
  durationDays: 30
};
const emptyResetState = { id: null, name: '', password: '', confirmPassword: '' };

const PLATFORM_PLANS = [
  { id: 'FREE', name: 'Free / Demo' },
  { id: 'STUDENT_BASIC', name: 'Student Basic' },
  { id: 'STUDENT_PLUS', name: 'Student Plus' },
  { id: 'RESEARCHER_PRO', name: 'PhD Scholar / Researcher' },
  { id: 'UNIVERSITY', name: 'Academic Faculty & Educator' },
  { id: 'ENTERPRISE', name: 'Distinguished Fellow & Scholar' }
];

export default function UserAccessManagement() {
  const { user: currentUser, refreshUser, isPrimaryAdmin } = useAuth();
  const canManageUsers = currentUser?.role === 'admin' || isPrimaryAdmin === true;
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [formUser, setFormUser] = useState(emptyUser);
  const [originalUserState, setOriginalUserState] = useState({ subscriptionPlan: 'FREE', active: true });
  const [resetUser, setResetUser] = useState(emptyResetState);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [adminRequests, setAdminRequests] = useState([]);
  const [restoringUser, setRestoringUser] = useState(null);
  const [loggingOutUser, setLoggingOutUser] = useState(null);

  const handleRestoreUserAccess = async (u) => {
    if (!isPrimaryAdmin) return;
    if (!window.confirm(`Restore platform access for ${u.name || u.email}?\n\nThe user will be allowed to sign in normally.`)) return;

    setRestoringUser(u.id);
    try {
      await userService.restoreUserAccess(u.id);
      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: 'INFO',
        action: 'ADMIN_RESTORE_USER_ACCESS',
        actorEmail: currentUser?.email || 'admin@zyndex.com',
        details: `Administrator restored platform access for user: ${u.name || 'User'} (${u.email}, ID: ${u.id})`,
        status: 'SUCCESS'
      }).catch(() => {});

      alert(`Access has been successfully restored for ${u.name || u.email}.`);
      await loadUsers(searchTerm);
    } catch (err) {
      alert(err.message || 'Failed to restore user access.');
    } finally {
      setRestoringUser(null);
    }
  };
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [sortBy, setSortBy] = useState('dateJoined_desc'); // 'name_asc', 'name_desc', 'plan', 'expiry', 'dateJoined_desc', 'dateJoined_asc', 'role', 'status'

  const handleForceLogoutUser = async (u) => {
    if (!isPrimaryAdmin) return;
    if (!window.confirm(`Terminate active session for ${u.name || u.email}?\n\nThe user will receive a session termination popup.`)) return;

    setLoggingOutUser(u.id);
    try {
      await userService.forceLogoutUser(u.id);
      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: 'WARN',
        action: 'ADMIN_TERMINATE_USER_SESSION',
        actorEmail: currentUser?.email || 'admin@zyndex.com',
        details: `Administrator terminated active session for user: ${u.name || 'User'} (${u.email}, ID: ${u.id})`,
        status: 'SUCCESS'
      }).catch(() => {});

      alert(`Session for ${u.name || u.email} has been terminated.`);
      await loadUsers(searchTerm);
    } catch (err) {
      alert(err.message || 'Failed to terminate user session.');
    } finally {
      setLoggingOutUser(null);
    }
  };

  const handleForceLogoutAll = async () => {
    if (!isPrimaryAdmin) return;
    if (!window.confirm('Are you sure you want to terminate ALL active user sessions?\n\nAll active users will receive an administrative logout notification.')) return;

    setLoggingOutAll(true);
    try {
      const res = await userService.forceLogoutAllUsers();
      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: 'WARN',
        action: 'ADMIN_TERMINATE_ALL_SESSIONS',
        actorEmail: currentUser?.email || 'admin@zyndex.com',
        details: `Administrator executed global termination of all active student and reader sessions`,
        status: 'SUCCESS'
      }).catch(() => {});

      alert(res?.message || 'All active user sessions have been terminated.');
      await loadUsers(searchTerm);
    } catch (err) {
      alert(err.message || 'Failed to logout all active users.');
    } finally {
      setLoggingOutAll(false);
    }
  };

  const getTimeLeft = (expiryDate, plan) => {
    if (!plan || plan === 'FREE') return 'Lifetime';
    if (!expiryDate || expiryDate === '') return 'N/A';
    const ms = new Date(expiryDate) - new Date();
    if (ms <= 0) return 'Expired';
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return `${days} day${days > 1 ? 's' : ''} left`;
  };

  const getPlatformRole = (u) => {
    const isMainAdmin = u?.email?.toLowerCase() === 'bhaanugali@gmail.com' || u?.isPrimaryAdmin === true;
    if (isMainAdmin) return 'Main Admin';
    if (u?.role?.toLowerCase() === 'admin') return 'Admin';
    return 'User';
  };

  const getSubscriptionDisplay = (u) => {
    const role = getPlatformRole(u);
    if (role === 'Main Admin') return 'Main Admin';
    if (role === 'Admin') return 'Admin';
    return PLATFORM_PLANS.find(p => p.id === u?.subscriptionPlan)?.name || (u?.subscriptionPlan || 'Free / Demo').replace(/_/g, ' ');
  };

  const exportUsersToCsv = () => {
    if (!users || users.length === 0) {
      alert('No user records available to export.');
      return;
    }

    const headers = [
      'Sl No',
      'Name',
      'Email',
      'Platform Role',
      'User Type',
      'Institution / College',
      'Subscription Plan',
      'Time Left',
      'Date Joined'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = users.map((u, idx) => [
      idx + 1,
      u.name || 'N/A',
      u.email || 'N/A',
      getPlatformRole(u),
      u.userType === 'Other' && u.profession ? `Other (${u.profession})` : (u.userType || 'Other'),
      u.collegeName || u.universityName || 'N/A',
      getSubscriptionDisplay(u),
      getPlatformRole(u) !== 'User' ? 'Lifetime / Unlimited' : getTimeLeft(u.subscriptionExpiresAt, u.subscriptionPlan),
      u.dateJoined ? new Date(u.dateJoined).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = '\uFEFF' + [
      headers.map(escapeCsv).join(','),
      ...rows.map(r => r.map(escapeCsv).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    link.setAttribute('download', `Zyndex_Users_Export_${timestampStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadUsers = async (search = '') => {
    try {
      const response = await userService.getAllUsers({ search, size: 100 });
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const sortedUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    const list = [...users];

    list.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'plan') {
        return (a.subscriptionPlan || 'FREE').localeCompare(b.subscriptionPlan || 'FREE');
      }
      if (sortBy === 'expiry_asc') {
        const timeA = a.subscriptionExpiresAt ? new Date(a.subscriptionExpiresAt).getTime() : 0;
        const timeB = b.subscriptionExpiresAt ? new Date(b.subscriptionExpiresAt).getTime() : 0;
        return timeA - timeB;
      }
      if (sortBy === 'expiry_desc') {
        const timeA = a.subscriptionExpiresAt ? new Date(a.subscriptionExpiresAt).getTime() : 0;
        const timeB = b.subscriptionExpiresAt ? new Date(b.subscriptionExpiresAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'dateJoined_asc') {
        return new Date(a.dateJoined || 0).getTime() - new Date(b.dateJoined || 0).getTime();
      }
      if (sortBy === 'dateJoined_desc') {
        return new Date(b.dateJoined || 0).getTime() - new Date(a.dateJoined || 0).getTime();
      }
      if (sortBy === 'active') {
        return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
      }
      return 0;
    });

    return list;
  }, [users, sortBy]);

  useEffect(() => {
    loadUsers();
    if (canManageUsers) {
      authService.getAdminRequests().then((response) => setAdminRequests(response.requests || [])).catch((error) => console.error('Failed to load admin requests:', error));
    }
  }, [canManageUsers]);

  const decideAdminRequest = async (request, decision) => {
    const reason = decision === 'decline' ? window.prompt('Reason for declining this request:') || '' : '';
    try {
      await authService.decideAdminRequest(request.id, decision, reason);
      setAdminRequests((current) => current.filter((item) => item.id !== request.id));
      await loadUsers(searchTerm);
    } catch (error) {
      window.alert(error.message || 'Unable to update admin request.');
    }
  };

  useEffect(() => {
    const interval = window.setInterval(() => loadUsers(searchTerm), 5000);
    return () => window.clearInterval(interval);
  }, [searchTerm]);

  const openCreateModal = () => {
    setIsEditing(false);
    setFormUser(emptyUser);
    setOriginalUserState({ subscriptionPlan: 'FREE', active: true });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setIsEditing(true);
    const nextUser = {
      ...emptyUser,
      ...user,
      active: user.active !== false && user.active !== 0,
      subscriptionPlan: user.subscriptionPlan || 'FREE',
      durationDays: 30
    };
    setFormUser(nextUser);
    setOriginalUserState({ subscriptionPlan: nextUser.subscriptionPlan, active: nextUser.active });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormUser(emptyUser);
  };

  const openResetModal = (user) => {
    setResetUser({
      id: user.id,
      name: user.name,
      password: '',
      confirmPassword: '',
    });
    setShowResetModal(true);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetUser(emptyResetState);
    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (isEditing) {
        const userUpdate = {
          name: formUser.name,
          email: formUser.email,
          role: formUser.role,
          userType: formUser.userType,
          profession: formUser.profession,
          collegeName: formUser.collegeName,
          universityName: formUser.universityName,
          bio: formUser.bio,
          password: formUser.password || undefined,
        };
        if (formUser.subscriptionPlan !== originalUserState.subscriptionPlan) {
          userUpdate.subscriptionPlan = formUser.subscriptionPlan;
          userUpdate.durationDays = formUser.durationDays;
        }
        const updateResponse = await userService.updateUser(formUser.id, userUpdate);
        if (formUser.active !== originalUserState.active) {
          await userService.updateUserStatus(formUser.id, formUser.active);
        }
        if (Number(formUser.id) === Number(currentUser?.id)) {
          await refreshUser();
        }

        closeModal();
        await loadUsers(searchTerm);

        let feedbackMsg = 'User updated successfully.';
        if (updateResponse?.roleChanged) {
          feedbackMsg = updateResponse.roleEmailSent
            ? `User updated and promoted/updated to ${formUser.role.toUpperCase()}. An official platform role email notification was dispatched to the user.`
            : `User updated to ${formUser.role.toUpperCase()}. Role changed successfully.`;
        } else if (updateResponse?.notificationEmailSent === false) {
          feedbackMsg = 'User updated successfully, but the plan-upgrade email could not be sent. Check SMTP configuration and service logs.';
        }

        logService.createLog({
          service: 'ADMIN-PORTAL',
          level: 'INFO',
          action: 'ADMIN_UPDATE_USER',
          actorEmail: currentUser?.email || 'admin@zyndex.com',
          details: `Administrator modified user profile: ${formUser.name} (${formUser.email}, ID: ${formUser.id}, Plan: ${formUser.subscriptionPlan}, Role: ${formUser.role})`,
          status: 'SUCCESS'
        }).catch(() => {});

        alert(feedbackMsg);
        return;
      }

      const createdUser = {
        name: formUser.name.trim(),
        email: formUser.email.trim(),
        role: formUser.role,
      };

      const createResponse = await userService.createUser({
        name: createdUser.name,
        email: createdUser.email,
        password: formUser.password,
        registrationNo: formUser.registrationNo,
        role: createdUser.role,
        userType: formUser.userType,
        profession: formUser.profession,
        collegeName: formUser.collegeName,
        universityName: formUser.universityName,
        bio: formUser.bio,
        subscriptionPlan: formUser.subscriptionPlan,
        durationDays: formUser.durationDays,
      });

      closeModal();
      await loadUsers(searchTerm);

      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: 'INFO',
        action: 'ADMIN_CREATE_USER',
        actorEmail: currentUser?.email || 'admin@zyndex.com',
        details: `Administrator created new user: ${createdUser.name} (${createdUser.email}, Role: ${createdUser.role})`,
        status: 'SUCCESS'
      }).catch(() => {});
      alert(
        createResponse?.confirmationEmailSent === false
          ? `User created successfully, but the confirmation email could not be sent: ${createResponse.confirmationEmailError || 'SMTP configuration is required.'}`
          : `User created successfully. The confirmation email was sent through the auth service to ${createdUser.email}.`
      );
    } catch (error) {
      alert(error.message || 'Failed to save user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await userService.deleteUser(userId);
      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: 'WARN',
        action: 'ADMIN_DELETE_USER',
        actorEmail: currentUser?.email || 'admin@zyndex.com',
        details: `Administrator deleted user: ${targetUser?.name || 'User'} (${targetUser?.email || ''}, ID: ${userId})`,
        status: 'SUCCESS'
      }).catch(() => {});

      await loadUsers(searchTerm);
    } catch (error) {
      alert(error.message || 'Failed to delete user.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (resetUser.password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    if (resetUser.password !== resetUser.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const currentUser = users.find((user) => user.id === resetUser.id);
      if (!currentUser) {
        throw new Error('User not found.');
      }

      await userService.updateUser(resetUser.id, {
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        password: resetUser.password,
      });

      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: 'WARN',
        action: 'ADMIN_RESET_PASSWORD',
        actorEmail: currentUser?.email || 'admin@zyndex.com',
        details: `Administrator performed direct password reset for user: ${currentUser.name} (${currentUser.email}, ID: ${resetUser.id})`,
        status: 'SUCCESS'
      }).catch(() => {});

      closeResetModal();
      alert(`Password reset successfully for ${currentUser.name}.`);
    } catch (error) {
      alert(error.message || 'Failed to reset password.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">User Access Management</h1>
            <p className="text-gray-600 mt-1">Create, read, update, and delete users. Showing {users.length} users.</p>
          </div>
          <div className="flex items-center gap-3">
            {isPrimaryAdmin && (
              <button
                type="button"
                onClick={handleForceLogoutAll}
                disabled={loggingOutAll}
                className="size-10 flex items-center justify-center bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-sm shrink-0 cursor-pointer disabled:opacity-60"
                title="Logout All Active Users"
              >
                <LogOut className="size-4" />
              </button>
            )}

            <button
              onClick={exportUsersToCsv}
              className="size-10 flex items-center justify-center bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm shrink-0 cursor-pointer"
              title="Download Users (CSV)"
            >
              <Download className="size-4 text-gray-600" />
            </button>
            {canManageUsers && (
              <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors">
                <Plus className="size-5" />
                Add User
              </button>
            )}
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <form onSubmit={(e) => { e.preventDefault(); loadUsers(searchTerm); }} className="bg-white rounded-xl shadow-md p-3 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search users by name or email..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </form>

          {/* Sorting Feature Bar */}
          <div className="bg-white rounded-xl shadow-md p-3 flex items-center gap-2">
            <ArrowUpDown className="size-4 text-orange-600 shrink-0" />
            <span className="text-xs font-semibold text-gray-600 shrink-0">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium bg-gray-50 text-gray-800 focus:bg-white focus:outline-none"
            >
              <option value="dateJoined_desc">Date Joined (Newest First)</option>
              <option value="dateJoined_asc">Date Joined (Oldest First)</option>
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
              <option value="plan">Subscription Plan</option>
              <option value="expiry_asc">Expiry Date (Expiring Soonest)</option>
              <option value="expiry_desc">Expiry Date (Expiring Latest)</option>
              <option value="active">Active Users First</option>
            </select>
          </div>
        </div>

        {canManageUsers && adminRequests.length > 0 && (
          <section className="bg-white rounded-xl shadow-md p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Admin Access Requests</h2>
            <div className="space-y-3">
              {adminRequests.filter((request) => request.status === 'pending').map((request) => (
                <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 rounded-lg p-4">
                  <div>
                    <p className="font-medium text-gray-900">{request.full_name} ({request.display_name})</p>
                    <p className="text-sm text-gray-600">{request.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => decideAdminRequest(request, 'approve')} className="px-3 py-2 bg-green-600 text-white rounded-lg">Accept</button>
                    <button onClick={() => decideAdminRequest(request, 'decline')} className="px-3 py-2 bg-amber-600 text-white rounded-lg">Ignore</button>
                    <button onClick={() => decideAdminRequest(request, 'delete')} className="px-3 py-2 bg-red-600 text-white rounded-lg">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Name</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Email</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Platform Role</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">User Type</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Subscription Plan</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Time Left</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Joined</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.length === 0 ? (
                  <tr><td colSpan="8" className="text-center py-16 text-gray-400">No users found.</td></tr>
                ) : sortedUsers.map((user) => {
                  const platformRole = getPlatformRole(user);
                  return (
                    <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
                      <td className={`py-4 px-6 ${user.terminated ? 'text-rose-600 line-through font-medium' : user.isOnline ? 'text-emerald-600 font-semibold' : 'text-gray-900 font-medium'}`}>
                        {user.name}
                        {user.terminated && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            Terminated
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-600">{user.email}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          platformRole === 'Main Admin'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                            : platformRole === 'Admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200 font-bold'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {platformRole}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-700 text-sm">{user.userType === 'Other' && user.profession ? `Other (${user.profession})` : (user.userType || 'Other')}</td>
                      <td className="py-4 px-6">
                        {platformRole === 'Main Admin' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
                            Main Admin
                          </span>
                        ) : platformRole === 'Admin' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200 shadow-sm">
                            Admin
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            !user.subscriptionPlan || user.subscriptionPlan === 'FREE'
                              ? 'bg-gray-100 text-gray-700'
                              : user.subscriptionPlan === 'STUDENT_BASIC'
                              ? 'bg-blue-100 text-blue-700'
                              : user.subscriptionPlan === 'STUDENT_PLUS'
                              ? 'bg-indigo-100 text-indigo-700'
                              : user.subscriptionPlan === 'RESEARCHER_PRO'
                              ? 'bg-orange-100 text-orange-700 border border-orange-200'
                              : user.subscriptionPlan === 'UNIVERSITY'
                              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}>
                            {PLATFORM_PLANS.find(p => p.id === user.subscriptionPlan)?.name || (user.subscriptionPlan || 'FREE').replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-semibold">
                        {platformRole !== 'User' ? (
                          <span className="text-emerald-700 text-xs font-semibold">Lifetime / Unlimited</span>
                        ) : (
                          <span className={getTimeLeft(user.subscriptionExpiresAt, user.subscriptionPlan) === 'Expired' ? 'text-red-600 text-xs' : 'text-gray-700 text-xs'}>
                            {getTimeLeft(user.subscriptionExpiresAt, user.subscriptionPlan)}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-600 text-sm">{new Date(user.dateJoined).toLocaleDateString()}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                        {canManageUsers && <>
                          {isPrimaryAdmin && platformRole !== 'Main Admin' && (
                            user.terminated ? (
                              <button
                                onClick={() => handleRestoreUserAccess(user)}
                                disabled={restoringUser === user.id}
                                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                title="Restore user access (reactivate account)"
                              >
                                <CheckCircle className="size-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleForceLogoutUser(user)}
                                disabled={loggingOutUser === user.id}
                                className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Terminate active user session"
                              >
                                <LogOut className="size-4" />
                              </button>
                            )
                          )}
                          <button onClick={() => openEditModal(user)} className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors" title="Edit User & Plan"><Edit className="size-4" /></button>
                          <button onClick={() => openResetModal(user)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Reset Password"><KeyRound className="size-4" /></button>
                          <button onClick={() => handleDeleteUser(user.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Delete User"><Trash2 className="size-4" /></button>
                        </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} />
            <motion.div className="fixed inset-0 flex items-center justify-center z-50 p-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">{isEditing ? 'Edit User & Subscription' : 'Add New User'}</h2>
                  <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="size-5 text-gray-500" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" /><input type="text" value={formUser.name} onChange={(e) => setFormUser({ ...formUser, name: e.target.value })} placeholder="Full name" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm" required /></div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" /><input type="email" value={formUser.email} onChange={(e) => setFormUser({ ...formUser, email: e.target.value })} placeholder="user@email.com" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm" required /></div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{isEditing ? 'New Password (Optional)' : 'Password'}</label>
                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" /><input type="password" value={formUser.password} onChange={(e) => setFormUser({ ...formUser, password: e.target.value })} placeholder={isEditing ? "Leave blank to keep current" : "Password (min 6 chars)"} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm" required={!isEditing} /></div>
                  </div>
                  {(
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Registration / Roll No</label>
                      <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" /><input type="text" value={formUser.registrationNo} onChange={(e) => setFormUser({ ...formUser, registrationNo: e.target.value })} placeholder="Registration number" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm" /></div>
                    </div>
                  )}
                  {isPrimaryAdmin && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-600">Platform Role</label>
                      </div>
                      <select
                        name="Platform Role"
                        data-target-user={`${formUser.name} (${formUser.email})`}
                        value={formUser.role}
                        onChange={(e) => setFormUser({ ...formUser, role: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="user">User (Standard Reader / Student)</option>
                        <option value="admin">Admin (Full Access)</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">User Type</label>
                    <select
                      name="Academic User Type"
                      data-target-user={`${formUser.name} (${formUser.email})`}
                      value={formUser.userType}
                      onChange={(e) => setFormUser({ ...formUser, userType: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                    >
                      <option>Student</option><option>Teacher / Educator</option><option>Researcher</option><option>Professional</option><option>General Reader</option><option>Other</option>
                    </select>
                  </div>
                  {formUser.userType === 'Other' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">What best describes you?</label>
                      <input type="text" value={formUser.profession} onChange={(e) => setFormUser({ ...formUser, profession: e.target.value })} placeholder="What best describes you?" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">University / College name (Optional)</label>
                    <input type="text" value={formUser.collegeName || formUser.universityName} onChange={(e) => setFormUser({ ...formUser, collegeName: e.target.value, universityName: '' })} placeholder="University or college name" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
                  </div>

                  {isEditing && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Account Status</label>
                      <select
                        name="Account Status"
                        data-target-user={`${formUser.name} (${formUser.email})`}
                        value={formUser.active ? 'active' : 'inactive'}
                        onChange={(e) => setFormUser({ ...formUser, active: e.target.value === 'active' })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  )}

                  {/* Subscription Plan & Duration (Optional for Admin to specify) */}
                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Subscription Plan (Optional)</label>
                    <select
                      name="Subscription Plan"
                      data-target-user={`${formUser.name} (${formUser.email})`}
                      value={formUser.subscriptionPlan}
                      onChange={(e) => setFormUser({ ...formUser, subscriptionPlan: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-orange-50/40 focus:bg-white"
                    >
                      {PLATFORM_PLANS.map((plan) => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Validity Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={formUser.durationDays}
                      onChange={(e) => setFormUser({ ...formUser, durationDays: e.target.value })}
                      placeholder="e.g. 30, 90, 365"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Default is 30 days for new subscriptions.</p>
                  </div>

                  {isEditing && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Existing passwords cannot be viewed. Enter a new password here only if you want to reset it.
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-4">
                    <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 text-sm">Cancel</button>
                    <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm">
                      {isSaving ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create User')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetModal && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeResetModal} />
            <motion.div className="fixed inset-0 flex items-center justify-center z-50 p-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
                    <p className="text-sm text-gray-600 mt-1">{resetUser.name}</p>
                  </div>
                  <button onClick={closeResetModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="size-5 text-gray-500" /></button>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetUser.password}
                      onChange={(e) => setResetUser({ ...resetUser, password: e.target.value })}
                      placeholder="New password"
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg"
                      required
                    />
                    <button type="button" onClick={() => setShowResetPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
                      {showResetPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type={showResetConfirmPassword ? 'text' : 'password'}
                      value={resetUser.confirmPassword}
                      onChange={(e) => setResetUser({ ...resetUser, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg"
                      required
                    />
                    <button type="button" onClick={() => setShowResetConfirmPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
                      {showResetConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    This will replace the user's current password immediately.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <button type="button" onClick={closeResetModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Reset Password</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}



