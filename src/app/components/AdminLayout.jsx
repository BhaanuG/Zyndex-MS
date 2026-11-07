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

  // Wire click and action tracking in Admin Portal
  const lastClickTimeRef = useRef(0);
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const handleClick = (e) => {
      const now = Date.now();
      // Throttle rapid clicks to at most one per 4 seconds
      if (now - lastClickTimeRef.current < 4000) return;

      const target = e.target;
      const button = target.closest('button');
      const link = target.closest('a');
      const input = target.closest('input, select');

      let actionDesc = null;
      if (button) {
        const text = button.innerText?.trim() || button.getAttribute('title') || button.getAttribute('aria-label');
        if (text) {
          actionDesc = `Administrator clicked button: "${text.slice(0, 50)}"`;
        }
      } else if (link) {
        const text = link.innerText?.trim() || link.getAttribute('title') || link.getAttribute('href');
        if (text) {
          actionDesc = `Administrator clicked navigation link: "${text.slice(0, 50)}"`;
        }
      } else if (input) {
        const placeholder = input.getAttribute('placeholder') || input.getAttribute('name') || input.tagName;
        actionDesc = `Administrator focused/interacted with input element: [${placeholder}]`;
      }

      if (actionDesc) {
        lastClickTimeRef.current = now;
        const pageName = location.pathname.split('/').filter(Boolean).pop() || 'Admin-Portal';
        logService.createLog({
          service: 'ADMIN-PORTAL',
          level: 'INFO',
          action: 'ADMIN_UI_INTERACTION',
          actorEmail: user.email || 'admin@zyndex.com',
          details: `${actionDesc} on page ${pageName}`,
          status: 'SUCCESS'
        }).catch(() => {});
      }
    };

    window.addEventListener('click', handleClick, { passive: true, capture: true });
    return () => window.removeEventListener('click', handleClick, { capture: true });
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
        <MaintenanceCountdownBar isPrimaryAdmin={isPrimaryAdmin} />
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
            <MaintenanceCountdownBar isPrimaryAdmin={isPrimaryAdmin} />
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
