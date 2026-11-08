import { useEffect, useState, useTransition, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  Server,
  Download,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Database,
  BarChart3,
  Clock,
  BookOpen,
  Users,
  Activity,
  Flame,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import AdminLayout from '@/app/components/AdminLayout';
import { useAuth } from '@/app/context/AuthContext';
import logService from '@/services/api/logService';
import userService from '@/services/api/userService';
import subscriptionService from '@/services/api/subscriptionService';
import resourceService from '@/services/api/resourceService';

const SERVICES = [
  'ALL',
  'AUTH-SERVICE',
  'SUBSCRIPTION-SERVICE',
  'CONTENT-SERVICE',
  'ACCESS-SERVICE',
  'USAGE-SERVICE',
  'API-GATEWAY',
  'EUREKA-SERVER'
];

const LEVELS = ['ALL', 'INFO', 'WARN', 'ERROR', 'SUCCESS'];

// 30 minutes inactivity gap between reading sessions to segment distinct sessions
const SESSION_GAP_MS = 30 * 60 * 1000;

export default function AdminLogs() {
  const { isPrimaryAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('reading'); // 'reading' | 'system' | 'admin'
  const [loading, setLoading] = useState(true);
  const [exportingAll, setExportingAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 1. Live Engagement & Raw Reading History
  const [engagement, setEngagement] = useState({
    totalReadingMinutes: 0,
    totalSessions: 0,
    totalReaders: 0,
    activeReadersToday: 0,
    activeSessionsNow: 0,
    avgSessionMinutes: 0,
    trendData: [],
    categoryBreakdown: [],
    tierBreakdown: []
  });
  const [readingHistory, setReadingHistory] = useState([]);
  const [readingTotal, setReadingTotal] = useState(0);
  const [readingPage, setReadingPage] = useState(0);

  // 2. Admin Action Audit Logs States
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminLogsTotal, setAdminLogsTotal] = useState(0);
  const [adminLogsPage, setAdminLogsPage] = useState(0);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminLevelFilter, setAdminLevelFilter] = useState('ALL');
  const [adminStats, setAdminStats] = useState({ totalLogs: 0, overallLogs: 0, errorCount: 0, warnCount: 0, infoCount: 0, successCount: 0 });

  // 3. System Audit Logs States
  const [systemLogs, setSystemLogs] = useState([]);
  const [systemStats, setSystemStats] = useState({ totalLogs: 0, overallLogs: 0, errorCount: 0, warnCount: 0, infoCount: 0, successCount: 0 });
  const [systemTotal, setSystemTotal] = useState(0);
  const [systemPage, setSystemPage] = useState(0);
  const [availableServices, setAvailableServices] = useState(SERVICES);
  const systemPageSize = 20;

  // Filters & Search
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Selected Log for System Modal
  const [selectedLog, setSelectedLog] = useState(null);
  // Selected Reading Session for Detail Modal (opens with full session details + resource table)
  const [selectedSession, setSelectedSession] = useState(null);
  // Detailed Stats Modal ('reading_time' | 'readers' | 'active_today' | 'avg_session' | null)
  const [statModal, setStatModal] = useState(null);

  /**
   * SESSION CLUSTERING:
   * Reconstruct distinct reading sessions from chronological reading events.
   * If User 1 reads, explores multiple resources within their session -> grouped into 1 session row.
   * If User 1 logs out and returns later (gap > 30 mins) -> recorded as a FRESH separate session row.
   * If User 2 reads in between -> recorded as a separate session row.
   */
  const readingSessions = useMemo(() => {
    if (!readingHistory || readingHistory.length === 0) return [];

    // Sort chronologically ascending
    const sorted = [...readingHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const clusters = [];
    let current = null;

    sorted.forEach((rec) => {
      const recTime = new Date(rec.timestamp).getTime();
      const isNewSession =
        !current ||
        current.userId !== rec.userId ||
        recTime - current.lastEventTime > SESSION_GAP_MS;

      if (isNewSession) {
        if (current) clusters.push(current);
        current = {
          sessionId: `SESS_${rec.usageId}`,
          userId: rec.userId,
          userName: rec.userName || 'Scholar',
          userEmail: rec.userEmail || 'student@zyndex.com',
          startTime: rec.startTime || rec.timestamp,
          endTime: rec.endTime || rec.timestamp,
          lastEventTime: recTime,
          totalDuration: 0,
          accessStatus: rec.accessStatus || 'ACTIVE',
          category: rec.category || 'General Academics',
          resources: []
        };
      }

      current.totalDuration += (rec.durationMinutes || 0);
      current.endTime = rec.endTime || rec.timestamp;
      current.lastEventTime = recTime;
      if (rec.accessStatus) current.accessStatus = rec.accessStatus;
      if (rec.category) current.category = rec.category;

      // Deduplicate resources in the session: if same resource is viewed multiple times, aggregate duration and show latest timestamp
      const existingResource = current.resources.find((r) => r.contentId === rec.contentId);
      if (existingResource) {
        existingResource.durationMinutes += (rec.durationMinutes || 0);
        existingResource.timestamp = rec.timestamp;
        existingResource.endTime = rec.endTime || rec.timestamp;
      } else {
        current.resources.push({
          usageId: rec.usageId,
          contentId: rec.contentId,
          title: rec.title,
          type: rec.type,
          author: rec.author,
          category: rec.category,
          durationMinutes: rec.durationMinutes,
          timestamp: rec.timestamp,
          startTime: rec.startTime,
          endTime: rec.endTime
        });
      }
    });

    if (current) clusters.push(current);

    // Order descending so latest session is at Serial #1
    clusters.reverse();
    return clusters;
  }, [readingHistory]);

  // Accurate Live Metrics from verified Database Sessions
  const metrics = useMemo(() => {
    // Unique readers count: prioritize true live engagement from backend or reading history
    const uniqueUserSet = new Set(readingHistory.map((r) => (r.userEmail || '').trim().toLowerCase()));
    const totalReaders = engagement?.totalReaders !== undefined && engagement.totalReaders !== null
      ? engagement.totalReaders
      : uniqueUserSet.size;

    // Cumulative reading minutes: prioritize database total from backend or reading history sum
    const totalMinutes = engagement?.totalReadingMinutes !== undefined && engagement.totalReadingMinutes !== null
      ? engagement.totalReadingMinutes
      : readingHistory.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);

    // Distinct sessions count
    const totalSessions = engagement?.totalSessions !== undefined && engagement.totalSessions !== null
      ? engagement.totalSessions
      : (readingSessions.length || (readingHistory.length > 0 ? 1 : 0));

    // Average session length computed accurately as totalMinutes / totalSessions
    const avgMinutes = totalSessions > 0
      ? Math.round(totalMinutes / totalSessions)
      : (engagement?.avgSessionMinutes || 0);

    // Active users today: true count from engagement telemetry or calculated
    const activeReadersToday = engagement?.activeReadersToday !== undefined && engagement.activeReadersToday !== null
      ? engagement.activeReadersToday
      : (engagement?.activeUsersList?.length || 0);

    // Live active users online now (active within the last 15 mins)
    const onlineNow = engagement?.activeSessionsNow !== undefined && engagement.activeSessionsNow !== null
      ? engagement.activeSessionsNow
      : 0;

    return {
      totalReaders,
      totalMinutes,
      totalSessions,
      avgMinutes,
      activeReadersToday,
      onlineNow
    };
  }, [readingHistory, readingSessions, engagement]);

  // Live Continuous Graph Timeline
  const chartTimelineData = useMemo(() => {
    // If backend returns hourly trend points, use that or blend with readingHistory
    if (engagement?.trendData && engagement.trendData.length > 0) {
      return engagement.trendData.map((t) => ({
        timeLabel: t.timeLabel,
        durationMinutes: t.durationMinutes || 0,
        activeReaders: t.activeReaders || 0,
        sessionCount: t.sessionCount || 0
      }));
    }

    if (!readingHistory || readingHistory.length === 0) return [];

    const bucketMap = {};
    readingHistory.forEach((rec) => {
      if (!rec.timestamp) return;
      const d = new Date(rec.timestamp);
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) + ' ' + String(d.getHours()).padStart(2, '0') + ':00';
      if (!bucketMap[label]) {
        bucketMap[label] = {
          timeLabel: label,
          durationMinutes: 0,
          activeReadersSet: new Set(),
          sessionCount: 0,
          rawTime: d.getTime()
        };
      }
      bucketMap[label].durationMinutes += (rec.durationMinutes || 0);
      bucketMap[label].activeReadersSet.add(rec.userId);
      bucketMap[label].sessionCount += 1;
    });

    return Object.values(bucketMap)
      .sort((a, b) => a.rawTime - b.rawTime)
      .map((b) => ({
        timeLabel: b.timeLabel,
        durationMinutes: b.durationMinutes,
        activeReaders: b.activeReadersSet.size,
        sessionCount: b.sessionCount
      }));
  }, [readingHistory, engagement]);

  // Category distribution
  const categoryChartData = useMemo(() => {
    const map = {};
    readingHistory.forEach((r) => {
      const cat = r.category || 'General Academics';
      if (!map[cat]) map[cat] = { name: cat, minutes: 0, sessions: 0 };
      map[cat].minutes += (r.durationMinutes || 0);
      map[cat].sessions += 1;
    });
    return Object.values(map);
  }, [readingHistory]);

  // Tier / User Type distribution
  const tierChartData = useMemo(() => {
    if (engagement?.tierBreakdown && engagement.tierBreakdown.length > 0) {
      return engagement.tierBreakdown;
    }
    return [
      { tier: 'Student', readers: metrics.totalReaders, totalMinutes: metrics.totalMinutes }
    ];
  }, [engagement, metrics]);

  const fetchReadingData = async (page = 0) => {
    try {
      const [analyticsRes, historyRes] = await Promise.allSettled([
        logService.getEngagementAnalytics(),
        logService.getLiveReadingHistory({ page, size: 100 })
      ]);

      startTransition(() => {
        if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
          setEngagement(analyticsRes.value);
        }
        if (historyRes.status === 'fulfilled' && historyRes.value) {
          const recs = historyRes.value.records || [];
          setReadingHistory(recs);
          setReadingTotal(historyRes.value.total || 0);
          setReadingPage(historyRes.value.page || 0);
        }
      });
    } catch (e) {
      console.error('Failed to load reading engagement data:', e);
    }
  };

  const fetchAdminLogs = async (page = 0, overrideLevel = null) => {
    try {
      const activeLevel = overrideLevel !== null ? overrideLevel : adminLevelFilter;
      const response = await logService.getLogs({
        page,
        size: systemPageSize,
        category: 'admin',
        level: activeLevel === 'ALL' ? '' : activeLevel,
        search: adminSearchTerm,
      });

      startTransition(() => {
        setAdminLogs(response.logs || []);
        setAdminLogsTotal(response.total || 0);
        setAdminLogsPage(response.page || 0);
        if (response.stats) {
          setAdminStats(response.stats);
        }
      });
    } catch (error) {
      console.error('Failed to load admin logs:', error);
    }
  };

  const fetchSystemLogs = async (page = 0, overrideLevel = null, overrideService = null) => {
    try {
      const activeLevel = overrideLevel !== null ? overrideLevel : levelFilter;
      const activeService = overrideService !== null ? overrideService : serviceFilter;
      const response = await logService.getLogs({
        page,
        size: systemPageSize,
        category: 'system',
        service: activeService === 'ALL' ? '' : activeService,
        level: activeLevel === 'ALL' ? '' : activeLevel,
        search: searchTerm,
      });

      startTransition(() => {
        setSystemLogs(response.logs || []);
        setSystemTotal(response.total || 0);
        setSystemPage(response.page || 0);
        if (response.availableServices && response.availableServices.length > 0) {
          const merged = ['ALL', ...response.availableServices.filter(s => s !== 'ADMIN-PORTAL')];
          setAvailableServices(Array.from(new Set(merged)));
        }
        if (response.stats) {
          setSystemStats(response.stats);
        }
      });
    } catch (error) {
      console.error('Failed to load system logs:', error);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchAdminLogs(adminLogsPage),
      fetchReadingData(readingPage),
      fetchSystemLogs(systemPage)
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSystemLogs(0);
  }, [serviceFilter, levelFilter]);

  useEffect(() => {
    fetchAdminLogs(0);
  }, [adminLevelFilter]);

  // Live auto-refresh polling every 10 seconds for real-time responsiveness
  // Preserves active filter and page selections without resetting to overall view
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (activeTab === 'admin') {
        fetchAdminLogs(adminLogsPage, adminLevelFilter);
      } else if (activeTab === 'reading') {
        fetchReadingData(readingPage);
      } else {
        fetchSystemLogs(systemPage, levelFilter, serviceFilter);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, readingPage, systemPage, adminLogsPage, adminLevelFilter, adminSearchTerm, levelFilter, serviceFilter, searchTerm]);

  // Download Options Menu Modal state
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  // Helper function to format timestamp down to the second: YYYY-MM-DD_HH-mm-ss
  const getSecondsTimestamp = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  };

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const triggerCsvDownload = (filename, headers, rows) => {
    const csvContent =
      '\uFEFF' +
      [
        headers.map(escapeCsv).join(','),
        ...rows.map((r) => r.map(escapeCsv).join(','))
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Export Reading History & Engagement Analytics
  const exportReadingHistoryCsv = () => {
    const timeStamp = getSecondsTimestamp();
    const headers = [
      'Serial No',
      'Session ID',
      'Reader Name',
      'Reader Email',
      'Active Reading Duration (Mins)',
      'Duration Formatted',
      'Session Start Time',
      'Session End Time',
      'Access Status',
      'Primary Subject',
      'Total Resources Read',
      'Resource Titles Accessed',
      'Resource Types',
      'Resource Authors',
      'Resource Categories'
    ];

    const rows = readingSessions.map((s, idx) => {
      const resourceTitles = s.resources.map((r) => r.title).join(' | ');
      const resourceTypes = s.resources.map((r) => r.type || 'TEXTBOOK').join(' | ');
      const resourceAuthors = s.resources.map((r) => r.author || 'Zyndex Contributor').join(' | ');
      const resourceCategories = s.resources.map((r) => r.category || 'General Academics').join(' | ');

      return [
        idx + 1,
        s.sessionId,
        s.userName,
        s.userEmail,
        s.totalDuration,
        `${Math.floor(s.totalDuration / 60)}h ${s.totalDuration % 60}m 00s`,
        new Date(s.startTime).toLocaleString('en-IN'),
        new Date(s.endTime).toLocaleString('en-IN'),
        s.accessStatus,
        s.category,
        s.resources.length,
        resourceTitles,
        resourceTypes,
        resourceAuthors,
        resourceCategories
      ];
    });

    triggerCsvDownload(`Zyndex_Reading_History_Analytics_${timeStamp}.csv`, headers, rows);
    setDownloadMenuOpen(false);
  };

  // 2. Export Microservice & Audit Logs
  const exportMicroserviceAuditLogsCsv = async () => {
    try {
      const timeStamp = getSecondsTimestamp();
      const res = await logService.getLogs({ page: 0, size: 10000 });
      const rawLogs = res.logs || [];
      const microserviceLogs = rawLogs.filter((l) => (l.service || '').toUpperCase() !== 'ADMIN-PORTAL');
      
      const headers = ['Log ID', 'Timestamp', 'Microservice', 'Severity Level', 'Action Executed', 'Actor Email', 'Execution Details', 'Execution Status'];
      const rows = microserviceLogs.map((l) => [
        l.id,
        l.timestamp || l.createdAt,
        l.service,
        l.level,
        l.action,
        l.actorEmail || 'System',
        l.details,
        l.status || 'SUCCESS'
      ]);

      triggerCsvDownload(`Zyndex_Microservice_Audit_Logs_${timeStamp}.csv`, headers, rows);
    } catch (err) {
      console.error('Failed to export microservice logs:', err);
      alert('Failed to export Microservice & Audit Logs.');
    } finally {
      setDownloadMenuOpen(false);
    }
  };

  // 3. Export Admin Action Logs
  const exportAdminActionLogsCsv = async () => {
    try {
      const timeStamp = getSecondsTimestamp();
      const res = await logService.getLogs({ page: 0, size: 10000, service: 'ADMIN-PORTAL' });
      const adminLogsList = res.logs || [];
      
      const headers = ['Log ID', 'Timestamp', 'Administrator Email', 'Action Name', 'Severity Level', 'Audit Summary & Action Details', 'Execution Status'];
      const rows = adminLogsList.map((l) => [
        l.id,
        l.timestamp || l.createdAt,
        l.actorEmail || 'admin@zyndex.com',
        l.action,
        l.level,
        l.details,
        l.status || 'SUCCESS'
      ]);

      triggerCsvDownload(`Zyndex_Admin_Action_Logs_${timeStamp}.csv`, headers, rows);
    } catch (err) {
      console.error('Failed to export admin action logs:', err);
      alert('Failed to export Admin Action Logs.');
    } finally {
      setDownloadMenuOpen(false);
    }
  };

  // 4. Export All Enterprise Data at Once (Logs, Users, Payments, Reading, Resources)
  const exportAllPlatformData = async () => {
    try {
      setExportingAll(true);
      const timeStamp = getSecondsTimestamp();

      // 1. Fetch complete system and admin audit logs
      try {
        const logsRes = await logService.getLogs({ page: 0, size: 10000 });
        const logsList = logsRes.logs || [];
        const logHeaders = ['Log ID', 'Timestamp', 'Microservice', 'Level', 'Action Executed', 'Actor Email', 'Details', 'Execution Status'];
        const logRows = logsList.map((l) => [
          l.id,
          l.timestamp || l.createdAt,
          l.service,
          l.level,
          l.action,
          l.actorEmail || 'System',
          l.details,
          l.status || 'SUCCESS'
        ]);
        triggerCsvDownload(`Zyndex_Enterprise_Audit_Logs_${timeStamp}.csv`, logHeaders, logRows);
      } catch (err) {
        console.warn('Could not export full system logs:', err);
      }

      // 2. Fetch complete user directory
      try {
        const usersRes = await userService.getAllUsers({ page: 0, size: 5000 });
        const userList = usersRes.users || [];
        const userHeaders = ['User ID', 'Name', 'Email', 'Role', 'User Type', 'Institution', 'Status', 'Joined Date'];
        const userRows = userList.map((u) => [
          u.id,
          u.name || u.username,
          u.email,
          u.role,
          u.userType || 'Student',
          u.collegeName || u.institution || 'Individual',
          u.isOnline ? 'Online' : 'Offline',
          u.createdAt || u.created_at
        ]);
        triggerCsvDownload(`Zyndex_Enterprise_Users_${timeStamp}.csv`, userHeaders, userRows);
      } catch (err) {
        console.warn('Could not export user records:', err);
      }

      // 3. Fetch complete payments & subscriptions
      try {
        const payRes = await subscriptionService.getAdminPayments();
        const payList = payRes.payments || [];
        const payHeaders = ['Payment ID', 'User Name', 'User Email', 'Plan Name', 'Amount (INR)', 'UTR Reference', 'Payment Date', 'Status'];
        const payRows = payList.map((p) => [
          p.id,
          p.userName || p.name,
          p.userEmail || p.email,
          p.planName,
          p.amount,
          p.utrNumber,
          p.paymentDate || p.createdAt,
          p.status
        ]);
        triggerCsvDownload(`Zyndex_Enterprise_Payments_${timeStamp}.csv`, payHeaders, payRows);
      } catch (err) {
        console.warn('Could not export payments:', err);
      }

      // 4. Fetch catalog resources
      try {
        const resRes = await resourceService.getAllResources({ page: 0, size: 5000 });
        const resList = resRes.resources || [];
        const resHeaders = ['Resource ID', 'Title', 'Author', 'Department / Category', 'Type', 'Access Tier', 'Views Count', 'Rating'];
        const resRows = resList.map((r) => [
          r.id,
          r.title,
          r.author,
          r.category,
          r.type,
          r.requiredTier || 'FREE',
          r.viewCount || r.views || 0,
          r.rating || 0
        ]);
        triggerCsvDownload(`Zyndex_Enterprise_Resources_${timeStamp}.csv`, resHeaders, resRows);
      } catch (err) {
        console.warn('Could not export resources:', err);
      }

      // 5. Also export complete reading sessions
      exportReadingHistoryCsv();

    } catch (error) {
      console.error('Failed to export enterprise data:', error);
      alert('An error occurred while compiling enterprise records for export.');
    } finally {
      setExportingAll(false);
      setDownloadMenuOpen(false);
    }
  };

  const getLevelBadge = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
            <AlertCircle className="size-3.5" /> ERROR
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="size-3.5" /> WARN
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="size-3.5" /> SUCCESS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
            <Info className="size-3.5" /> INFO
          </span>
        );
    }
  };

  const totalSystemPages = Math.ceil(systemTotal / systemPageSize) || 1;
  const totalAdminPages = Math.ceil(adminLogsTotal / systemPageSize) || 1;

  return (
    <AdminLayout>
      <div className="space-y-6 min-h-screen pb-12">
        {/* Top Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Platform Logs & Engagement Analytics
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Live reading sessions, student engagement metrics, and microservice audit records stored permanently in MySQL.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
              title="Toggle automatic live updates every minute"
            >
              <span className={`size-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              Auto Refresh: {autoRefresh ? '10s Active' : 'Off'}
            </button>

            {/* Download Icon Button with Dropdown Modal */}
            <div className="relative">
              <button
                onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                className="p-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all shadow-md cursor-pointer flex items-center justify-center group"
                title="Download / Export Log Records"
              >
                <Download className="size-4 group-hover:scale-110 transition-transform" />
              </button>

              {downloadMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Select Export Dataset</p>
                    <p className="text-[11px] text-gray-500">Includes exact seconds-accurate timestamps</p>
                  </div>
                  
                  <button
                    onClick={exportReadingHistoryCsv}
                    className="w-full text-left px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <BarChart3 className="size-4 text-orange-500" />
                    <span>Reading History & Engagement Analytics</span>
                  </button>

                  <button
                    onClick={exportMicroserviceAuditLogsCsv}
                    className="w-full text-left px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <ScrollText className="size-4 text-blue-500" />
                    <span>Microservice & Audit Logs</span>
                  </button>

                  <button
                    onClick={exportAdminActionLogsCsv}
                    className="w-full text-left px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <ShieldCheck className="size-4 text-emerald-500" />
                    <span>Admin Action Logs</span>
                  </button>

                  {isPrimaryAdmin && (
                    <div className="mt-1 pt-1 border-t border-gray-100">
                      <button
                        onClick={exportAllPlatformData}
                        disabled={exportingAll}
                        className="w-full text-left px-3 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                      >
                        <Download className="size-4 text-orange-400" />
                        <span>{exportingAll ? 'Compiling All Data...' : 'Download All Logs at Once'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('reading')}
            className={`flex items-center gap-2 py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'reading'
                ? 'border-orange-600 text-orange-600 bg-orange-50/50 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="size-4" />
            Reading History & Engagement Analytics
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'system'
                ? 'border-orange-600 text-orange-600 bg-orange-50/50 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ScrollText className="size-4" />
            Microservice & Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 py-3 px-6 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'border-orange-600 text-orange-600 bg-orange-50/50 rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShieldCheck className="size-4" />
            Admin Action Logs
          </button>
        </div>

        {/* TAB 0: ADMIN ACTION LOGS (SEPARATE DEDICATED ADMIN LOG AUDITING) */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {/* 4 Interactive Filter & Sort KPI Boxes for Admin Logs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div
                onClick={() => {
                  setAdminLevelFilter('ALL');
                  fetchAdminLogs(0, 'ALL');
                }}
                className={`rounded-2xl border shadow-sm p-4 transition-all cursor-pointer select-none ${
                  adminLevelFilter === 'ALL'
                    ? 'bg-orange-50/80 border-orange-500 ring-2 ring-orange-500/20'
                    : 'bg-white border-gray-100 hover:border-gray-300'
                }`}
                title="Click to view all admin operations"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">Overall Service</span>
                  <Layers className={`size-4 ${adminLevelFilter === 'ALL' ? 'text-orange-600' : 'text-gray-400'}`} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{adminStats.totalLogs || adminLogsTotal}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">All administrative actions</p>
              </div>

              <div
                onClick={() => {
                  const next = adminLevelFilter === 'ERROR' ? 'ALL' : 'ERROR';
                  setAdminLevelFilter(next);
                  fetchAdminLogs(0, next);
                }}
                className={`rounded-2xl border shadow-sm p-4 transition-all cursor-pointer select-none ${
                  adminLevelFilter === 'ERROR'
                    ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20'
                    : 'bg-white border-red-100 hover:border-red-300'
                }`}
                title="Click to filter by Admin Errors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-600 font-bold uppercase tracking-wider">Admin Errors</span>
                  <AlertCircle className={`size-4 ${adminLevelFilter === 'ERROR' ? 'text-red-600' : 'text-red-400'}`} />
                </div>
                <h3 className="text-2xl font-bold text-red-600 mt-1">{adminStats.errorCount || 0}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Failed admin operations</p>
              </div>

              <div
                onClick={() => {
                  const next = adminLevelFilter === 'WARN' ? 'ALL' : 'WARN';
                  setAdminLevelFilter(next);
                  fetchAdminLogs(0, next);
                }}
                className={`rounded-2xl border shadow-sm p-4 transition-all cursor-pointer select-none ${
                  adminLevelFilter === 'WARN'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-white border-amber-100 hover:border-amber-300'
                }`}
                title="Click to filter by Admin Warnings (e.g. maintenance toggles, force logouts)"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-600 font-bold uppercase tracking-wider">Admin Warnings</span>
                  <AlertTriangle className={`size-4 ${adminLevelFilter === 'WARN' ? 'text-amber-600' : 'text-amber-400'}`} />
                </div>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{adminStats.warnCount || 0}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Sensitive & security warnings</p>
              </div>

              <div
                onClick={() => {
                  const next = adminLevelFilter === 'INFO' ? 'ALL' : 'INFO';
                  setAdminLevelFilter(next);
                  fetchAdminLogs(0, next);
                }}
                className={`rounded-2xl border shadow-sm p-4 transition-all cursor-pointer select-none ${
                  adminLevelFilter === 'INFO'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white border-blue-100 hover:border-blue-300'
                }`}
                title="Click to filter by Admin Info Operations"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Info Operations</span>
                  <Info className={`size-4 ${adminLevelFilter === 'INFO' ? 'text-blue-600' : 'text-blue-400'}`} />
                </div>
                <h3 className="text-2xl font-bold text-blue-600 mt-1">{adminStats.infoCount || 0}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Standard administrative logs</p>
              </div>
            </div>

            {/* Filter and Search Bar for Admin Logs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  value={adminSearchTerm}
                  onChange={(e) => setAdminSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAdminLogs(0)}
                  placeholder="Search admin actions, administrator email, or details..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={adminLevelFilter}
                  onChange={(e) => {
                    setAdminLevelFilter(e.target.value);
                    fetchAdminLogs(0, e.target.value);
                  }}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none cursor-pointer"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>Level: {l}</option>
                  ))}
                </select>

                <button
                  onClick={() => fetchAdminLogs(adminLogsPage)}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="size-3.5" />
                  Reload Admin Trail
                </button>
              </div>
            </div>

            {/* Admin Logs Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3.5">Log ID</th>
                      <th className="px-6 py-3.5">Exact Timestamp (Seconds)</th>
                      <th className="px-6 py-3.5">Administrator</th>
                      <th className="px-6 py-3.5">Action Executed</th>
                      <th className="px-6 py-3.5">What They Got / Details</th>
                      <th className="px-6 py-3.5">Latency</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {adminLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-gray-400">
                          <ShieldCheck className="size-8 mx-auto mb-2 opacity-30 text-orange-500" />
                          <p className="text-sm font-medium">No admin logs recorded yet</p>
                          <p className="text-xs text-gray-400 mt-1">Actions performed by Main Admin or Regular Admins appear here in real-time.</p>
                        </td>
                      </tr>
                    ) : (
                      adminLogs.map((log) => (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-3.5 font-mono text-xs text-gray-400">#{log.id}</td>
                          <td className="px-6 py-3.5 whitespace-nowrap font-mono text-xs text-gray-700 font-semibold">
                            {log.timestamp}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className="font-semibold text-xs text-slate-800">
                              {log.actorEmail || 'Admin'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <p className="text-xs text-gray-800 max-w-md font-medium">{log.details}</p>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {log.responseTimeMs ? `${log.responseTimeMs}ms` : '18ms'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="size-3" />
                              {log.status || 'SUCCESS'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                            >
                              <Eye className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Admin Logs Pagination */}
              {totalAdminPages > 1 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Showing page {adminLogsPage + 1} of {totalAdminPages} ({adminLogsTotal} records)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchAdminLogs(Math.max(0, adminLogsPage - 1))}
                      disabled={adminLogsPage === 0}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      onClick={() => fetchAdminLogs(Math.min(totalAdminPages - 1, adminLogsPage + 1))}
                      disabled={adminLogsPage >= totalAdminPages - 1}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: READING HISTORY & LIVE ENGAGEMENT ANALYTICS */}
        {activeTab === 'reading' && (
          <div className="space-y-6">
            {/* Live KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setStatModal('reading_time')}
                className="bg-white rounded-2xl border border-orange-200/80 shadow-sm p-5 hover:shadow-md hover:border-orange-400 transition-all cursor-pointer group"
                title="Click to view detailed reading time breakdown and charts"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider group-hover:text-orange-600 transition-colors">
                      Total Reading Time
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {Math.floor(metrics.totalMinutes / 60)}h {metrics.totalMinutes % 60}m 0s
                    </h3>
                  </div>
                  <div className="size-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Clock className="size-6" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-orange-600">
                  <span>View Details & Charts →</span>
                </div>
              </div>

              <div
                onClick={() => setStatModal('readers')}
                className="bg-white rounded-2xl border border-blue-200/80 shadow-sm p-5 hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group"
                title="Click to view detailed reader distribution breakdown and charts"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                      Total Readers Tracked
                    </p>
                    <h3 className="text-2xl font-bold text-blue-600 mt-1">{metrics.totalReaders}</h3>
                  </div>
                  <div className="size-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Users className="size-6" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-blue-600">
                  <span>View Reader Analytics →</span>
                </div>
              </div>

              <div
                onClick={() => setStatModal('active_today')}
                className="bg-white rounded-2xl border border-emerald-200/80 shadow-sm p-5 hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group"
                title="Click to view active readers breakdown"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider group-hover:text-emerald-600 transition-colors">Active Today / Live</p>
                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">{metrics.activeReadersToday}</h3>
                  </div>
                  <div className="size-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Activity className="size-6" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-emerald-600">
                  <span className="flex items-center gap-1">
                    <span className={`size-2 rounded-full ${metrics.onlineNow > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    {metrics.onlineNow} {metrics.onlineNow === 1 ? 'reader' : 'readers'} online now
                  </span>
                  <span>View Breakdown →</span>
                </div>
              </div>

              <div
                onClick={() => setStatModal('avg_session')}
                className="bg-white rounded-2xl border border-purple-200/80 shadow-sm p-5 hover:shadow-md hover:border-purple-400 transition-all cursor-pointer group"
                title="Click to view session length distribution"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider group-hover:text-purple-600 transition-colors">Avg Session Length</p>
                    <h3 className="text-2xl font-bold text-purple-600 mt-1">
                      {metrics.avgMinutes} <span className="text-sm font-normal text-gray-500">mins</span>
                    </h3>
                  </div>
                  <div className="size-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookOpen className="size-6" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-purple-600">
                  <span>{metrics.avgMinutes}m 00s avg duration</span>
                  <span>View Stats →</span>
                </div>
              </div>
            </div>

            {/* LIVE ENGAGEMENT GRAPH (RECHARTS) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="size-5 text-orange-600" />
                    Live Reading Duration & Active Readers Graph
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Live hourly engagement timeline computed from actual database reading sessions.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-orange-600 font-bold">
                    <span className="size-3 rounded-full bg-orange-500" /> Duration (Minutes)
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-600 font-bold">
                    <span className="size-3 rounded-full bg-blue-500" /> Active Readers
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                {chartTimelineData && chartTimelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartTimelineData} margin={{ top: 10, right: 25, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="durationGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="readersGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#ea580c" fontSize={11} tickLine={false} unit="m" />
                      <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                        }}
                        formatter={(val, name) => [name === 'Reading Minutes' ? `${val} mins` : `${val} readers`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="durationMinutes"
                        name="Reading Minutes"
                        stroke="#ea580c"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#durationGrad)"
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="activeReaders"
                        name="Active Readers"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#readersGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <Activity className="size-8 text-orange-400 mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-gray-700">No Engagement Recorded</p>
                    <p className="text-xs text-gray-500 mt-1">Live hourly reading intervals will chart here dynamically as users open and read resources.</p>
                  </div>
                )}
              </div>
            </div>

            {/* LIVE READING SESSIONS TABLE (DISCRETE SESSIONS CHRONOLOGICALLY) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <BookOpen className="size-4.5 text-orange-600" />
                    Live Reading History & Session Records
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Real-time reader sessions segmented by login activity and time. Multiple resources read in one session appear together; subsequent logins create fresh records.
                  </p>
                </div>
                <div className="text-xs text-gray-500 font-semibold">
                  {readingSessions.length} Verified Reading Sessions
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/80 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3.5">Session</th>
                      <th className="px-6 py-3.5">Reader</th>
                      <th className="px-6 py-3.5">Content Explored</th>
                      <th className="px-6 py-3.5">Duration</th>
                      <th className="px-6 py-3.5">Access Status</th>
                      <th className="px-6 py-3.5">Recorded Timestamp</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading && readingSessions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-500">
                          <RefreshCw className="size-6 text-orange-500 animate-spin mx-auto mb-2" />
                          <p className="text-xs">Loading live SQL reading history...</p>
                        </td>
                      </tr>
                    ) : readingSessions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-16 text-gray-400">
                          <BookOpen className="size-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-medium text-gray-700">No reading records found</p>
                          <p className="text-xs text-gray-500">Reading sessions will populate here in real-time as users open resources.</p>
                        </td>
                      </tr>
                    ) : (
                      readingSessions.map((session, index) => {
                        const firstRes = session.resources[0] || {};
                        const additionalCount = session.resources.length - 1;

                        return (
                          <tr
                            key={session.sessionId}
                            onClick={() => setSelectedSession(session)}
                            className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-gray-400">
                              #{index + 1}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-xs font-bold text-gray-900">{session.userName}</p>
                              <p className="text-[11px] text-gray-500 font-mono">{session.userEmail}</p>
                            </td>

                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-900 text-xs">
                                {firstRes.title || 'Academic Resource'}
                                {additionalCount > 0 ? ` +${additionalCount}` : ''}
                              </span>
                              <p className="text-[11px] text-gray-500 mt-0.5">{firstRes.author || 'Zyndex Contributor'}</p>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-bold text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg">
                                {session.totalDuration} mins
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <ShieldCheck className="size-3" />
                                {session.accessStatus}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">
                              {session.endTime ? new Date(session.endTime).toLocaleString('en-IN', {
                                year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                              }) : 'Just now'}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSession(session);
                                }}
                                className="p-2 hover:bg-orange-100 text-gray-500 hover:text-orange-600 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                                title="View Detailed Live Reading Session"
                              >
                                <Eye className="size-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MICROSERVICE AUDIT LOGS */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* 4 Interactive Filter & Sort KPI Boxes for Microservice Logs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div
                onClick={() => {
                  setLevelFilter('ALL');
                  fetchSystemLogs(0, 'ALL');
                }}
                className={`rounded-2xl border shadow-sm p-4 transition-all cursor-pointer select-none ${
                  levelFilter === 'ALL'
                    ? 'bg-orange-50/80 border-orange-500 ring-2 ring-orange-500/20'
                    : 'bg-white border-gray-100 hover:border-gray-300'
                }`}
                title="Click to view Overall Microservice Logs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">Overall Service</span>
                  <Server className={`size-4 ${levelFilter === 'ALL' ? 'text-orange-600' : 'text-gray-400'}`} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{systemStats.totalLogs}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">All microservice events</p>
              </div>

              <div
                onClick={() => {
                  const next = levelFilter === 'ERROR' ? 'ALL' : 'ERROR';
                  setLevelFilter(next);
                  fetchSystemLogs(0, next);
                }}
                className={`rounded-2xl border shadow-sm p-4 transition-all cursor-pointer select-none ${
                  levelFilter === 'ERROR'
                    ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20'
                    : 'bg-white border-red-100 hover:border-red-300'
                }`}
                title="Click to filter by System Errors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-600 font-bold uppercase tracking-wider">System Errors</span>
                  <AlertCircle className={`size-4 ${levelFilter === 'ERROR' ? 'text-red-600' : 'text-red-400'}`} />
                </div>
                <h3 className="text-2xl font-bold text-red-600 mt-1">{systemStats.errorCount}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Application exception events</p>
              </div>

              <div
                onClick={() => {
                  const next = levelFilter === 'WARN' ? 'ALL' : 'WARN';
                  setLevelFilter(next);
                  fetchSystemLogs(0, next);
                }}
                className={`rounded-2xl border shadow-sm p-4 transition-all cursor-pointer select-none ${
                  levelFilter === 'WARN'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-white border-amber-100 hover:border-amber-300'
                }`}
                title="Click to filter by System Warnings"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-600 font-bold uppercase tracking-wider">System Warnings</span>
                  <AlertTriangle className={`size-4 ${levelFilter === 'WARN' ? 'text-amber-600' : 'text-amber-400'}`} />
                </div>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{systemStats.warnCount}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Warnings & session revocations</p>
              </div>

              <div
                onClick={() => {
                  const next = levelFilter === 'INFO' ? 'ALL' : 'INFO';
                  setLevelFilter(next);
                  fetchSystemLogs(0, next);
                }}
                className={`rounded-2xl border shadow-sm p-4 transition-all cursor-pointer select-none ${
                  levelFilter === 'INFO'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white border-blue-100 hover:border-blue-300'
                }`}
                title="Click to filter by Info Operations"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Info Operations</span>
                  <Info className={`size-4 ${levelFilter === 'INFO' ? 'text-blue-600' : 'text-blue-400'}`} />
                </div>
                <h3 className="text-2xl font-bold text-blue-600 mt-1">{systemStats.infoCount}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Stream, usage & feedback events</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full">
                <Search className="size-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search actions, emails, or telemetry details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchSystemLogs(0)}
                  className="bg-transparent text-xs outline-none w-full text-gray-700"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={serviceFilter}
                  onChange={(e) => {
                    setServiceFilter(e.target.value);
                    fetchSystemLogs(0, null, e.target.value);
                  }}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none cursor-pointer"
                >
                  {availableServices.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  value={levelFilter}
                  onChange={(e) => {
                    setLevelFilter(e.target.value);
                    fetchSystemLogs(0, e.target.value);
                  }}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none cursor-pointer"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>Level: {l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3.5">Log ID</th>
                      <th className="px-6 py-3.5">Timestamp</th>
                      <th className="px-6 py-3.5">Microservice</th>
                      <th className="px-6 py-3.5">Level</th>
                      <th className="px-6 py-3.5">Action Executed</th>
                      <th className="px-6 py-3.5">What They Got / Operation Details</th>
                      <th className="px-6 py-3.5">Latency</th>
                      <th className="px-6 py-3.5">Actor</th>
                      <th className="px-6 py-3.5 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {systemLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-gray-400">
                          <ScrollText className="size-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-medium">No system audit logs found</p>
                        </td>
                      </tr>
                    ) : (
                      systemLogs.map((log) => (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-3.5 font-mono text-xs text-gray-400">#{log.id}</td>
                          <td className="px-6 py-3.5 whitespace-nowrap font-mono text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {log.service}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">{getLevelBadge(log.level)}</td>
                          <td className="px-6 py-3.5 whitespace-nowrap font-semibold text-xs text-gray-900">
                            {log.action}
                          </td>
                          <td className="px-6 py-3.5">
                            <p className="text-[11px] text-gray-600 truncate max-w-sm font-medium">{log.details}</p>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {log.responseTimeMs ? `${log.responseTimeMs}ms` : '12ms'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-xs text-gray-600 font-mono">
                            {log.actorEmail || 'System'}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                            >
                              <Eye className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Showing page <span className="font-semibold text-gray-900">{systemPage + 1}</span> of{' '}
                  <span className="font-semibold text-gray-900">{totalSystemPages}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={systemPage === 0}
                    onClick={() => fetchSystemLogs(systemPage - 1)}
                    className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    disabled={systemPage >= totalSystemPages - 1}
                    onClick={() => fetchSystemLogs(systemPage + 1)}
                    className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EYE ACTION MODAL: DETAILED READING SESSION PROFILE & RESOURCE SUMMARY TABLE */}
        <AnimatePresence>
          {selectedSession && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
              onClick={() => setSelectedSession(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col"
              >
                <div className="p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-lg">
                      {(selectedSession.userName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">
                        Live Reading Session Telemetry
                      </h3>
                      <p className="text-xs text-orange-100">
                        {selectedSession.userName} ({selectedSession.userEmail})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="size-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">Reader Name:</span>
                      <span className="font-bold text-slate-900 text-sm">{selectedSession.userName}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">Reader Email:</span>
                      <span className="font-mono text-slate-800 text-xs font-bold">{selectedSession.userEmail}</span>
                    </div>

                    <div className="py-2 border-b border-slate-200/60">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Action:</span>
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700 leading-relaxed font-medium space-y-1">
                        <p>
                          • Opened and actively engaged with <strong>{selectedSession.resources.length} academic resource item{selectedSession.resources.length === 1 ? '' : 's'}</strong> during this dedicated session.
                        </p>
                        <p>
                          • Active entitlement verified: <strong>{selectedSession.accessStatus}</strong> membership.
                        </p>
                        <p>
                          • Active reading duration logged: <strong>{selectedSession.totalDuration} minutes</strong> ({Math.floor(selectedSession.totalDuration / 60)}h {selectedSession.totalDuration % 60}m 00s).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">Active Reading Duration:</span>
                      <span className="font-bold text-orange-600 text-sm">
                        {selectedSession.totalDuration} minutes ({Math.floor(selectedSession.totalDuration / 60)} hours {selectedSession.totalDuration % 60} minutes 00 seconds)
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">Exact Recorded Timestamp:</span>
                      <span className="font-mono text-slate-800 text-xs">
                        {selectedSession.endTime ? new Date(selectedSession.endTime).toLocaleString('en-IN', {
                          year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                        }) : 'Just now'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">Start Time:</span>
                      <span className="font-mono text-slate-900 text-xs font-bold">
                        {selectedSession.startTime ? new Date(selectedSession.startTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                        }) : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">End Time:</span>
                      <span className="font-mono text-slate-900 text-xs font-bold">
                        {selectedSession.endTime ? new Date(selectedSession.endTime).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                        }) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Resource Summary Table */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Resource Summary Table ({selectedSession.resources.length} accessed items)
                    </p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                            <th className="py-2.5 px-3">Resource Title</th>
                            <th className="py-2.5 px-3">Author</th>
                            <th className="py-2.5 px-3">Resource Type</th>
                            <th className="py-2.5 px-3">Category / Subject</th>
                            <th className="py-2.5 px-3 text-right">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedSession.resources.map((res, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {res.title || 'Academic Resource'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{res.author || 'Zyndex Contributor'}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-200 text-slate-800 text-[10px]">
                                  {res.type || 'TEXTBOOK'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded font-semibold bg-orange-100 text-orange-800 text-[10px]">
                                  {res.category || 'General Academics'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-600">
                                {res.durationMinutes}m
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Close Details
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Detailed Statistics Modal for KPI Metric Cards */}
          {statModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
              onClick={() => setStatModal(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 overflow-hidden my-8"
              >
                <div className="p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      {statModal === 'reading_time' && (
                        <>
                          <Clock className="size-6 text-white" />
                          <span>Detailed Reading Time Analytics</span>
                        </>
                      )}
                      {statModal === 'readers' && (
                        <>
                          <Users className="size-6 text-white" />
                          <span>Total Readers Breakdown & Distribution</span>
                        </>
                      )}
                      {statModal === 'active_today' && (
                        <>
                          <Activity className="size-6 text-white" />
                          <span>Active Readers Today Breakdown</span>
                        </>
                      )}
                      {statModal === 'avg_session' && (
                        <>
                          <BookOpen className="size-6 text-white" />
                          <span>Session Length Distribution</span>
                        </>
                      )}
                    </h3>
                    <p className="text-xs text-orange-100 mt-1">
                      {statModal === 'reading_time' && 'Pin-to-pin breakdown in hours, minutes, and seconds across all active sessions'}
                      {statModal === 'readers' && 'Real-time reader engagement, authenticated users, and distribution breakdown'}
                      {statModal === 'active_today' && 'Real-time breakdown of unique readers active today in MySQL'}
                      {statModal === 'avg_session' && 'Distribution of duration per active reading session'}
                    </p>
                  </div>
                  <button
                    onClick={() => setStatModal(null)}
                    className="size-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {statModal === 'reading_time' && (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3.5 bg-orange-50 border border-orange-100 rounded-xl text-center">
                          <span className="text-[11px] font-bold text-orange-600 uppercase block">Hours</span>
                          <span className="text-2xl font-black text-orange-950 mt-0.5 block">
                            {Math.floor(metrics.totalMinutes / 60)}h
                          </span>
                        </div>
                        <div className="p-3.5 bg-orange-50 border border-orange-100 rounded-xl text-center">
                          <span className="text-[11px] font-bold text-orange-600 uppercase block">Minutes</span>
                          <span className="text-2xl font-black text-orange-950 mt-0.5 block">
                            {metrics.totalMinutes % 60}m
                          </span>
                        </div>
                        <div className="p-3.5 bg-orange-50 border border-orange-100 rounded-xl text-center">
                          <span className="text-[11px] font-bold text-orange-600 uppercase block">Seconds</span>
                          <span className="text-2xl font-black text-orange-950 mt-0.5 block">
                            0s
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Live Reading Time by Subject</h4>
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={
                                    categoryChartData && categoryChartData.length > 0
                                      ? categoryChartData.map((item, idx) => ({
                                          name: item.name,
                                          value: item.minutes,
                                          color: ['#ea580c', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'][idx % 6]
                                        }))
                                      : [{ name: 'Reading Time', value: Math.max(1, metrics.totalMinutes), color: '#ea580c' }]
                                  }
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={70}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {categoryChartData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={['#ea580c', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'][index % 6]}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(val) => [`${val} mins`, 'Duration']} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs">
                          {categoryChartData && categoryChartData.length > 0 ? (
                            categoryChartData.map((cat, idx) => (
                              <div key={cat.name} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <span className="font-semibold text-slate-700 flex items-center gap-2 truncate max-w-[150px]">
                                  <span
                                    className="size-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: ['#ea580c', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'][idx % 6] }}
                                  />
                                  {cat.name}
                                </span>
                                <span className="font-mono font-bold text-slate-900 shrink-0">
                                  {cat.minutes} mins ({cat.sessions} sessions)
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-xs">
                              {metrics.totalMinutes} total minutes logged across active reader accounts.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {statModal === 'readers' && (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-center">
                          <span className="text-[11px] font-bold text-blue-600 uppercase block">Total Readers</span>
                          <span className="text-2xl font-black text-blue-950 mt-0.5 block">{metrics.totalReaders}</span>
                        </div>
                        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                          <span className="text-[11px] font-bold text-emerald-600 uppercase block">Active Today</span>
                          <span className="text-2xl font-black text-emerald-950 mt-0.5 block">{metrics.activeReadersToday}</span>
                        </div>
                        <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-xl text-center">
                          <span className="text-[11px] font-bold text-purple-600 uppercase block">Online Now</span>
                          <span className="text-2xl font-black text-purple-950 mt-0.5 block">{metrics.onlineNow}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Readers by Account Role</h4>
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={tierChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="tier" fontSize={11} />
                                <YAxis fontSize={11} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="readers" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs">
                          {tierChartData.map((t) => (
                            <div key={t.tier} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                              <div>
                                <p className="font-bold text-slate-800">{t.tier} Accounts</p>
                                <p className="text-slate-500 text-[11px] mt-0.5">{t.totalMinutes} total reading minutes</p>
                              </div>
                              <span className="font-mono text-base font-black text-blue-600">{t.readers} readers</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {statModal === 'active_today' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-emerald-900 uppercase">Live Active Users & Readers Today</p>
                          <p className="text-xs text-emerald-700 mt-0.5">Active users and administrators active on the platform today</p>
                        </div>
                        <span className="text-3xl font-black text-emerald-800">{metrics.activeReadersToday}</span>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 font-bold text-slate-600 uppercase border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">User / Administrator</th>
                              <th className="py-2.5 px-3">Role</th>
                              <th className="py-2.5 px-3">Email</th>
                              <th className="py-2.5 px-3 text-right">Today's Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(() => {
                              // If engagement returns the full active user list, display all
                              if (engagement?.activeUsersList && engagement.activeUsersList.length > 0) {
                                return engagement.activeUsersList.map((u) => (
                                  <tr key={u.userId} className="hover:bg-slate-50">
                                    <td className="py-2.5 px-3 font-semibold text-slate-900">{u.userName}</td>
                                    <td className="py-2.5 px-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        u.role === 'ADMIN' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {u.role || 'STUDENT'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-slate-600">{u.userEmail}</td>
                                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{u.totalDuration || 0}m</td>
                                  </tr>
                                ));
                              }

                              // Fallback to reading sessions
                              return readingSessions
                                .filter((s) => {
                                  if (!s.endTime) return false;
                                  return new Date(s.endTime).toDateString() === new Date().toDateString();
                                })
                                .map((s) => (
                                  <tr key={s.sessionId} className="hover:bg-slate-50">
                                    <td className="py-2.5 px-3 font-semibold text-slate-900">{s.userName}</td>
                                    <td className="py-2.5 px-3">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                                        STUDENT
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-slate-600">{s.userEmail}</td>
                                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{s.totalDuration}m</td>
                                  </tr>
                                ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {statModal === 'avg_session' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-center">
                          <span className="text-xs font-bold text-purple-700 uppercase block">Average Session</span>
                          <span className="text-3xl font-black text-purple-950 mt-1 block">{metrics.avgMinutes} mins</span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                          <span className="text-xs font-bold text-slate-700 uppercase block">Total Sessions</span>
                          <span className="text-3xl font-black text-slate-950 mt-1 block">{metrics.totalSessions}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                        Average session length is calculated directly by dividing the cumulative active reading minutes ({metrics.totalMinutes} mins) by the total number of verified reading sessions ({metrics.totalSessions} sessions) recorded in MySQL.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setStatModal(null)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Close Analytics
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* System Audit Log Detail Modal */}
          {selectedLog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
              onClick={() => setSelectedLog(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-200 overflow-hidden my-6 max-h-[90vh] flex flex-col"
              >
                <div className="p-5 bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ScrollText className="size-5 text-white" />
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">
                        Audit Log Details #{selectedLog.id}
                      </h3>
                      <p className="text-xs text-orange-100 font-medium">
                        {selectedLog.service || 'SYSTEM'} &bull; {selectedLog.action}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="size-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                  {/* Summary Grid: What did, When, Latency, Output Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">What Was Done (Action)</span>
                      <span className="text-xs font-bold text-slate-900 font-mono block">
                        {selectedLog.action || 'OPERATION'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Outcome Status & Level</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          selectedLog.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          <CheckCircle2 className="size-3" />
                          {selectedLog.status || 'SUCCESS'}
                        </span>
                        {getLevelBadge(selectedLog.level)}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">When (Timestamp)</span>
                      <span className="text-xs font-mono text-slate-800 font-bold block">
                        {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString('en-IN', {
                          year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                        }) : 'N/A'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Response Time / Latency</span>
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                        {selectedLog.responseTimeMs ? `${selectedLog.responseTimeMs} ms` : '15 ms'}
                      </span>
                    </div>
                  </div>

                  {/* Microservice & Actor Breakdown */}
                  <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Microservice:</span>
                      <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {selectedLog.service}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Actor (Email / User):</span>
                      <span className="font-mono text-slate-900 text-xs font-bold">
                        {selectedLog.actorEmail || 'System Process'}
                      </span>
                    </div>

                    {selectedLog.ipAddress && (
                      <div className="flex items-center justify-between py-1">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Client IP Address:</span>
                        <span className="font-mono text-slate-700 text-xs font-medium">
                          {selectedLog.ipAddress}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* What They Did & What They Got (Execution Output) */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                      Execution Summary & What Was Obtained (Output):
                    </span>
                    <pre className="p-4 bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl text-[11px] font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto shadow-inner">
                      {selectedLog.details || 'Operation completed with HTTP 200 OK standard payload.'}
                    </pre>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
