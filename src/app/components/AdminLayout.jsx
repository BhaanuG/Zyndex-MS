import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate, useLocation } from 'react-router';
import { BookOpen, LayoutDashboard, FolderOpen, Users, MessageSquare, LogOut, Menu, X, UserCircle, ArrowLeft, Home, ScrollText, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/app/components/ui/resizable';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, getUrlSafeName, getUrlSafeEmail, isPrimaryAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    // The logout function in AuthContext will handle the redirect after 10 seconds
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
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <div className="size-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                A
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
                    <p className="text-sm font-medium text-gray-900">Admin User</p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                  <div className="size-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                    A
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
