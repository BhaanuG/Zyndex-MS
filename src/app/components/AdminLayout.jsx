import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate, useLocation } from 'react-router';
import { BookOpen, LayoutDashboard, FolderOpen, Users, MessageSquare, LogOut, Menu, X, UserCircle, ArrowLeft, Home, ScrollText, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logService from '@/services/api/logService';
import MaintenanceCountdownBar from './MaintenanceCountdownBar';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/app/components/ui/resizable';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getUrlSafeName, getUrlSafeEmail, isPrimaryAdmin } = useAuth();
  const lastLoggedPathRef = useRef('');
  const lastScrollTimeRef = useRef(0);

  // Automatically wire and log every admin navigation and significant action with seconds-accurate timestamps
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const currentPath = location.pathname;
    if (lastLoggedPathRef.current === currentPath) return;
    lastLoggedPathRef.current = currentPath;

    const pageName = currentPath.split('/').filter(Boolean).pop() || 'Admin-Portal';
    let humanReadableAction = `Administrator opened page: ${pageName}`;
    if (pageName.toLowerCase().includes('dashboard')) {
      humanReadableAction = 'Administrator opened dashboard and reviewed system telemetry';
    } else if (pageName.toLowerCase().includes('user-management')) {
      humanReadableAction = 'Administrator navigated to User Management to audit and manage platform users';
    } else if (pageName.toLowerCase().includes('content-management')) {
      humanReadableAction = 'Administrator navigated to Content Management to inspect or upload library resources';
    } else if (pageName.toLowerCase().includes('payments')) {
      humanReadableAction = 'Administrator opened Payments and Subscription reconciliation portal';
    } else if (pageName.toLowerCase().includes('feedback-review')) {
      humanReadableAction = 'Administrator navigated to Feedback Review to examine user reviews';
    } else if (pageName.toLowerCase().includes('logs')) {
      humanReadableAction = 'Administrator navigated to Platform Logs & Engagement Analytics';
    } else if (pageName.toLowerCase().includes('profile')) {
      humanReadableAction = 'Administrator opened Admin Profile preferences';
    }

    logService.createLog({
      service: 'ADMIN-PORTAL',
      level: 'INFO',
      action: 'ADMIN_NAVIGATE',
      actorEmail: user.email || 'admin@zyndex.com',
      details: humanReadableAction,
      status: 'SUCCESS'
    }).catch(() => {});
  }, [location.pathname, user]);

  // Wire scroll tracking in Admin Portal (throttled to avoid log flooding)
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const handleScroll = () => {
      const now = Date.now();
      // Record at most once every 30 seconds per page scroll
      if (now - lastScrollTimeRef.current > 30000) {
        lastScrollTimeRef.current = now;
        const pageName = location.pathname.split('/').filter(Boolean).pop() || 'Admin-Portal';
        logService.createLog({
          service: 'ADMIN-PORTAL',
          level: 'INFO',
          action: 'ADMIN_SCROLL_INSPECT',
          actorEmail: user.email || 'admin@zyndex.com',
          details: `Administrator active inspection and scrolling on: ${pageName}`,
          status: 'SUCCESS'
        }).catch(() => {});
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname, user]);

  // Wire click, select, and action tracking in Admin Portal
  const lastClickTimeRef = useRef(0);
  const lastClickKeyRef = useRef('');
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const handleClick = (e) => {
      const now = Date.now();
      const target = e.target;
      const button = target.closest('button');
      const link = target.closest('a');
      const select = target.closest('select');
      const input = target.closest('input, textarea');
      const card = target.closest('[data-log-label]') || target.closest('[title]');

      let actionTitle = 'ADMIN_USER_CLICK';
      let actionDesc = null;
      let clickKey = '';

      const pageName = location.pathname.split('/').filter(Boolean).pop() || 'Admin-Dashboard';

      if (button) {
        const text = button.innerText?.trim() || button.getAttribute('title') || button.getAttribute('aria-label') || 'Button';
        clickKey = `btn_${text}_${pageName}`;
        if (now - lastClickTimeRef.current < 1000 && lastClickKeyRef.current === clickKey) return;

        let intent = 'Triggered button action';
        const lower = text.toLowerCase();
        if (lower.includes('download') || lower.includes('export')) intent = 'Initiated audit / analytics data export';
        else if (lower.includes('filter') || lower.includes('level') || lower.includes('service')) intent = 'Filtered dataset or logs table';
        else if (lower.includes('search')) intent = 'Executed search query on dataset';
        else if (lower.includes('save') || lower.includes('update') || lower.includes('submit')) intent = 'Submitted record modifications or configuration settings';
        else if (lower.includes('delete') || lower.includes('trash') || lower.includes('remove')) intent = 'Invoked account/resource deletion procedure';
        else if (lower.includes('terminate') || lower.includes('logout')) intent = 'Initiated session termination / revocation workflow';
        else if (lower.includes('confirm') || lower.includes('verify') || lower.includes('approve')) intent = 'Approved / verified pending user action or request';
        else if (lower.includes('reject') || lower.includes('dismiss')) intent = 'Rejected / declined user request';
        else if (lower.includes('cancel') || lower.includes('close')) intent = 'Dismissed dialog / cancelled current operation';
        else if (lower.includes('maintenance')) intent = 'Toggled platform maintenance mode control';
        else if (lower.includes('tab') || lower.includes('logs') || lower.includes('metrics') || lower.includes('reading') || lower.includes('audit')) intent = 'Switched dashboard audit view / tab';
        else if (lower.includes('reload') || lower.includes('refresh')) intent = 'Triggered real-time dataset reload';

        actionTitle = `ADMIN_CLICK_${text.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().slice(0, 30)}`;
        actionDesc = `Administrator (${user.name || user.email}) ${intent} by clicking button "${text.slice(0, 60)}" on the ${pageName} page [Element: <button>, Timestamp: ${new Date().toISOString()}]`;
      } else if (select) {
        const selectName = select.getAttribute('name') || select.id || 'Dropdown';
        const selectedOptionText = select.options[select.selectedIndex]?.text || select.value;
        clickKey = `sel_${selectName}_${selectedOptionText}`;
        if (now - lastClickTimeRef.current < 1000 && lastClickKeyRef.current === clickKey) return;

        actionTitle = `ADMIN_SELECT_${selectName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().slice(0, 25)}`;
        actionDesc = `Administrator (${user.name || user.email}) selected option "${selectedOptionText}" from dropdown [${selectName}] on ${pageName} page`;
      } else if (link) {
        const text = link.innerText?.trim() || link.getAttribute('title') || link.getAttribute('href') || 'Navigation';
        const href = link.getAttribute('href') || 'link';
        clickKey = `link_${href}`;
        if (now - lastClickTimeRef.current < 1000 && lastClickKeyRef.current === clickKey) return;

        actionTitle = 'ADMIN_NAVIGATION_CLICK';
        actionDesc = `Administrator (${user.name || user.email}) navigated via link "${text.slice(0, 50)}" to destination [${href}] from ${pageName} view`;
      } else if (card && !button && !link) {
        const title = card.getAttribute('title') || card.getAttribute('data-log-label') || card.innerText?.slice(0, 30);
        if (title) {
          clickKey = `card_${title}`;
          if (now - lastClickTimeRef.current < 1200 && lastClickKeyRef.current === clickKey) return;
          actionTitle = `ADMIN_CLICK_${title.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().slice(0, 25)}`;
          actionDesc = `Administrator (${user.name || user.email}) selected filter / KPI card "${title}" on ${pageName} page`;
        }
      } else if (input) {
        const placeholder = input.getAttribute('placeholder') || input.getAttribute('name') || input.id || input.tagName;
        const valType = input.type || 'text';
        clickKey = `inp_${placeholder}`;
        if (now - lastClickTimeRef.current < 3000 && lastClickKeyRef.current === clickKey) return;

        actionTitle = 'ADMIN_INPUT_FOCUS';
        actionDesc = `Administrator (${user.name || user.email}) clicked and focused on input field [${placeholder}] (type: ${valType}) on ${pageName} page`;
      }

      if (actionDesc) {
        lastClickTimeRef.current = now;
        lastClickKeyRef.current = clickKey;
        logService.createLog({
          service: 'ADMIN-PORTAL',
          level: 'INFO',
          action: actionTitle,
          actorEmail: user.email || 'admin@zyndex.com',
          details: actionDesc,
          status: 'SUCCESS'
        }).catch(() => {});
      }
    };

    // Also listen for change events on selects to immediately capture exact option selected
    const handleChange = (e) => {
      const select = e.target.closest('select');
      if (!select) return;
      const selectName = select.getAttribute('name') || select.getAttribute('aria-label') || select.id || 'Filter Dropdown';
      const selectedOptionText = select.options[select.selectedIndex]?.text || select.value;
      const pageName = location.pathname.split('/').filter(Boolean).pop() || 'Admin-Dashboard';

      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: 'INFO',
        action: `ADMIN_FILTER_CHANGED`,
        actorEmail: user.email || 'admin@zyndex.com',
        details: `Administrator (${user.name || user.email}) changed filter [${selectName}] to "${selectedOptionText}" on ${pageName} page`,
        status: 'SUCCESS'
      }).catch(() => {});
    };

    window.addEventListener('click', handleClick, { passive: true, capture: true });
    window.addEventListener('change', handleChange, { passive: true, capture: true });
    return () => {
      window.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('change', handleChange, { capture: true });
    };
  }, [location.pathname, user]);

  const handleLogout = () => {
    if (user?.email) {
      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: 'INFO',
        action: 'ADMIN_LOGOUT',
        actorEmail: user.email,
        details: `Administrator logged out from admin portal`,
        status: 'SUCCESS'
      }).catch(() => {});
    }
    logout();
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Get dynamic URL parts
  const adminName = getUrlSafeName();
  const adminEmail = getUrlSafeEmail();
  const baseUrl = `/Zyndex/Admin/${adminName}/${adminEmail}`;

  // Check if we're on the dashboard or profile page
  const isDashboard = location.pathname.includes('/Dashboard');
  const isProfilePage = location.pathname.includes('/Profile');
  const showBackButton = !isDashboard && !isProfilePage;

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: `${baseUrl}/Dashboard` },
    { icon: Users, label: 'User Management', path: `${baseUrl}/User-Management` },
    { icon: FolderOpen, label: 'Content Management', path: `${baseUrl}/Content-Management` },
    ...(isPrimaryAdmin ? [{ icon: CreditCard, label: 'Payments', path: `${baseUrl}/Payments` }] : []),
    { icon: MessageSquare, label: 'Feed Back Review', path: `${baseUrl}/Feedback-Review` },
    ...(isPrimaryAdmin ? [{ icon: ScrollText, label: 'Logs', path: `${baseUrl}/Logs` }] : []),
    { icon: UserCircle, label: 'My Profile', path: `${baseUrl}/Profile` },
  ];

  if (!sidebarOpen) {
    // Content when sidebar is closed - no resizable panels
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="size-5" />
              </motion.button>
              
              {/* Navigation buttons for profile page or when back is needed */}
              {isProfilePage && (
                <motion.button
                  onClick={() => navigate(`${baseUrl}/Dashboard`)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Home className="size-4" />
                  Dashboard
                </motion.button>
              )}
              
              {showBackButton && !isProfilePage && (
                <motion.button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </motion.button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name || user?.username || 'Administrator'}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <div className="size-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                {(user?.name || user?.username || 'A').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
          <footer className="mt-12 py-6 border-t border-gray-200 text-center text-xs text-gray-500">
            © 2026 Zyndex • A ScholarSphere Digital Company • All rights reserved.
          </footer>
        </main>
      </div>
    );
  }

  // Content with sidebar open - use resizable panels
  return (
    <div className="min-h-screen bg-gray-50">
      <ResizablePanelGroup direction="horizontal" className="min-h-screen">
        {/* Sidebar Panel */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-white border-r border-gray-200">
          <div className="flex flex-col h-screen">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <BookOpen className="size-6 text-orange-600" />
                <span className="text-xl font-semibold text-gray-900">Zyndex</span>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <div key={index} className="hover:translate-x-1 transition-transform">
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-orange-50 text-orange-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="size-5 flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{item.label}</span>
                    </Link>
                  </div>
                );
              })}
            </nav>

            {/* Maintenance Timer at down/bottom of the profile side bar */}
            <MaintenanceCountdownBar isPrimaryAdmin={false} mode="admin-sidebar" />

            {/* Logout */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 hover:translate-x-1 transition-all"
              >
                <LogOut className="size-5 flex-shrink-0" />
                <span className="text-sm font-medium truncate">Logout</span>
              </button>
            </div>
          </div>
        </ResizablePanel>

        {/* Resize Handle */}
        <ResizableHandle withHandle className="hover:bg-orange-500/20 transition-colors" />

        {/* Main Content Panel */}
        <ResizablePanel defaultSize={80} minSize={50}>
          <div className="flex flex-col h-screen">
            {/* Top Bar */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="size-5" />
                  </motion.button>
                  
                  {/* Navigation buttons for profile page or when back is needed */}
                  {isProfilePage && (
                    <motion.button
                      onClick={() => navigate(`${baseUrl}/Dashboard`)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Home className="size-4" />
                      Dashboard
                    </motion.button>
                  )}
                  
                  {showBackButton && !isProfilePage && (
                    <motion.button
                      onClick={handleBack}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ArrowLeft className="size-4" />
                      Back
                    </motion.button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user?.name || user?.username || 'Administrator'}</p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                  <div className="size-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {(user?.name || user?.username || 'A').charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
              {children}
              <footer className="mt-12 py-6 border-t border-gray-200 text-center text-xs text-gray-500">
                © 2026 Zyndex • A ScholarSphere Digital Company • All rights reserved.
              </footer>
            </main>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
