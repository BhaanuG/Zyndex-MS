import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { FolderOpen, Users, MessageSquare, BarChart3, Activity, TrendingUp, Wrench } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import { useAuth } from '@/app/context/AuthContext';
import resourceService from '@/services/api/resourceService';
import userService from '@/services/api/userService';
import feedbackService from '@/services/api/feedbackService';
import authService from '@/services/api/authService';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { getUrlSafeName, getUrlSafeEmail, user, isPrimaryAdmin } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  useEffect(() => {
    if (isPrimaryAdmin) {
      userService.getMaintenanceMode().then(res => setMaintenanceMode(Boolean(res?.maintenanceMode))).catch(() => {});
      const poll = setInterval(() => {
        userService.getMaintenanceMode().then(res => setMaintenanceMode(Boolean(res?.maintenanceMode))).catch(() => {});
      }, 4000);
      return () => clearInterval(poll);
    }
  }, [isPrimaryAdmin]);

  const handleToggleMaintenance = async () => {
    if (!isPrimaryAdmin) return;
    const nextState = !maintenanceMode;
    const confirmMsg = nextState
      ? 'Are you sure you want to activate Platform Maintenance Mode?\n\n• An announcement email will be dispatched to all users and regular admins.\n• A 15-minute countdown timer will run on user & regular admin portals.\n• When the 15-minute timer expires, all user and regular admin sessions will be terminated and a maintenance modal displayed.'
      : 'Are you sure you want to deactivate Maintenance Mode and restore normal platform access?\n\nAn announcement email will be sent notifying everyone that Zyndex is back online.';
    if (!window.confirm(confirmMsg)) return;

    setTogglingMaintenance(true);
    try {
      const res = await userService.setMaintenanceMode(nextState);
      setMaintenanceMode(Boolean(res?.maintenanceMode));
      alert(res?.message || 'Maintenance mode updated.');
    } catch (err) {
      alert(err.message || 'Failed to update maintenance mode.');
    } finally {
      setTogglingMaintenance(false);
    }
  };
  const [stats, setStats] = useState([
    { title: 'Total Resources', value: '0', icon: FolderOpen, gradient: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-100', link: '' },
    { title: 'Total Users', value: '0', icon: Users, gradient: 'from-red-500 to-red-600', bgColor: 'bg-red-100', link: '' },
    { title: 'Feedback Count', value: '0', icon: MessageSquare, gradient: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-100', link: '' },
  ]);
  const [liveData, setLiveData] = useState({ categories: [], feedbackCategories: [], pendingRequests: 0, recentResources: [] });

  const adminName = getUrlSafeName();
  const adminEmail = getUrlSafeEmail();
  const baseUrl = `/Zyndex/Admin/${adminName}/${adminEmail}`;

  useEffect(() => {
    async function loadDashboard() {
      try {
        const results = await Promise.allSettled([
          resourceService.getResourceStats(),
          userService.getUserStats(),
          feedbackService.getFeedbackStats(),
          resourceService.getAllResources({ size: 5, sort: 'created_at,desc' }),
          authService.getAdminRequests(),
        ]);

        const resourceStats = results[0].status === 'fulfilled' ? results[0].value : {};
        const usersResponse = results[1].status === 'fulfilled' ? results[1].value : {};
        const feedbackStats = results[2].status === 'fulfilled' ? results[2].value : {};
        const resourcesResponse = results[3].status === 'fulfilled' ? results[3].value : {};
        const requestsResponse = results[4].status === 'fulfilled' ? results[4].value : {};

        const totalUsers = usersResponse.totalUsers ?? usersResponse.total ?? usersResponse.totalElements ?? 0;
        const totalResources = resourceStats.totalResources ?? resourceStats.total ?? 0;
        const totalFeedback = feedbackStats.total ?? feedbackStats.totalFeedback ?? 0;

        setStats([
          { title: 'Total Resources', value: String(totalResources), icon: FolderOpen, gradient: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-100', link: `${baseUrl}/Content-Management` },
          { title: 'Total Users', value: String(totalUsers), icon: Users, gradient: 'from-red-500 to-red-600', bgColor: 'bg-red-100', link: `${baseUrl}/User-Management` },
          { title: 'Feedback Count', value: String(totalFeedback), icon: MessageSquare, gradient: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-100', link: `${baseUrl}/Feedback-Review` },
        ]);
        setLiveData({
          categories: resourceStats.byCategory || [],
          feedbackCategories: feedbackStats.byCategory || [],
          pendingRequests: (requestsResponse.requests || []).filter((request) => request.status === 'pending').length,
          recentResources: resourcesResponse.resources || [],
        });
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      }
    }

    loadDashboard();
  }, [baseUrl]);

  return (
    <AdminLayout>
      <div className="space-y-6 min-h-screen">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <motion.div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <Activity className="size-4" />
              Admin Panel
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
              Welcome {user?.name || 'Admin'}
            </h1>
            <p className="text-gray-600 text-lg">Live summary for resources, users, and feedback.</p>
          </div>

          {isPrimaryAdmin && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleMaintenance}
                disabled={togglingMaintenance}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-md ${
                  maintenanceMode
                    ? 'bg-amber-600 text-white hover:bg-amber-700 animate-pulse'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
                title="Toggle Platform Maintenance Mode (Main Admin Only)"
              >
                <Wrench className="size-4" />
                <span>{maintenanceMode ? 'Maintenance Mode ON' : 'Maintenance Mode OFF'}</span>
              </button>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.title} onClick={() => navigate(stat.link)} className="group relative bg-white rounded-xl shadow-lg p-6 cursor-pointer overflow-hidden border border-gray-100" initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 * index }} whileHover={{ y: -6 }}>
                <div className={`absolute top-0 right-0 w-40 h-40 ${stat.bgColor} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`size-16 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                      <Icon className="size-8 text-white" />
                    </div>
                    <div className="size-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                      <TrendingUp className="size-5 text-gray-600 group-hover:text-orange-600 transition-colors" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</p>
                  <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-lg p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4"><BarChart3 className="size-5 text-orange-600" /><h2 className="text-lg font-semibold text-gray-900">Resource Categories</h2></div>
            <div className="space-y-3">{liveData.categories.length ? liveData.categories.map((item) => <div key={item.category} className="flex items-center justify-between"><span className="text-sm text-gray-600">{item.category || 'Uncategorized'}</span><span className="font-semibold text-gray-900">{item.total}</span></div>) : <p className="text-sm text-gray-500">No resource categories available.</p>}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-lg p-5"><h2 className="text-lg font-semibold text-gray-900 mb-4">Needs Attention</h2><div className="space-y-4"><div className="flex justify-between"><span className="text-sm text-gray-600">Pending admin requests</span><strong>{liveData.pendingRequests}</strong></div><div className="flex justify-between"><span className="text-sm text-gray-600">Feedback categories</span><strong>{liveData.feedbackCategories.length}</strong></div></div></div>
        </section>

        <section className="bg-white rounded-xl border border-gray-100 shadow-lg p-5"><h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Resources</h2><div className="divide-y divide-gray-100">{liveData.recentResources.length ? liveData.recentResources.map((resource) => <div key={resource.id} className="flex items-center justify-between py-3"><div><p className="font-medium text-gray-900">{resource.title}</p><p className="text-xs text-gray-500">{resource.category || 'Uncategorized'}</p></div><FolderOpen className="size-4 text-gray-400" /></div>) : <p className="text-sm text-gray-500">No resources available.</p>}</div></section>
      </div>
    </AdminLayout>
  );
}
