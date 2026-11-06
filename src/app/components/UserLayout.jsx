import { Link, useNavigate, useLocation } from 'react-router';
import { BookOpen, Search, User, LogOut, ArrowLeft, X, Sparkles, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function UserLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getUrlSafeName, getUrlSafeEmail } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  const handleLogout = () => {
    logout();
    // The logout function in AuthContext will handle the redirect after 10 seconds
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Get dynamic URL parts
  const userName = getUrlSafeName();
  const userEmail = getUrlSafeEmail();
  const baseUrl = `/Zyndex/User/${userName}/${userEmail}`;

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setShowSearchResults(e.target.value.trim().length > 0);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`${baseUrl}/Search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const isHomePage = location.pathname.includes('/Home');
  const isProfilePage = location.pathname.includes('/Profile');
  const showBackButton = !isHomePage && !isProfilePage;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="py-4 px-6 bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button onClick={handleBack} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Back" aria-label="Back">
                <ArrowLeft className="size-5" />
              </button>
            )}
            <Link 
              to={`${baseUrl}/Home`} 
              className="flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <BookOpen className="size-6 text-orange-600" />
              <span className="text-xl font-semibold text-gray-900">Zyndex</span>
            </Link>
            {user?.subscriptionPlan && user.subscriptionPlan !== 'FREE' && (() => {
              const plan = String(user.subscriptionPlan).toUpperCase();
              let badgeStyle = "bg-orange-50 text-orange-700 border-orange-200/80";
              let dotColor = "bg-orange-500";
              let label = plan.replace('_', ' ');

              if (plan.includes('ENTERPRISE')) {
                badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200";
                dotColor = "bg-indigo-500";
              } else if (plan.includes('UNIVERSITY')) {
                badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
                dotColor = "bg-purple-500";
              } else if (plan.includes('RESEARCHER') || plan.includes('PRO')) {
                badgeStyle = "bg-teal-50 text-teal-700 border-teal-200";
                dotColor = "bg-teal-500";
              } else if (plan.includes('PLUS')) {
                badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                dotColor = "bg-amber-500";
              } else if (plan.includes('BASIC')) {
                badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                dotColor = "bg-blue-500";
              }

              return (
                <Link
                  to={`${baseUrl}/Profile/Billing/Pricing`}
                  title={`Subscribed Plan: ${label} (Click to manage)`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase transition-all hover:scale-105 ${badgeStyle}`}
                >
                  <span className={`size-1.5 rounded-full ${dotColor}`} />
                  {label}
                </Link>
              );
            })()}
          </div>

          {/* Live Search Bar */}
          <div className="flex-1 max-w-xl relative" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search resources..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="size-4" />
                </button>
              )}
            </form>

            {/* Live Search Results Dropdown */}
            <AnimatePresence>
              {showSearchResults && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700">Live Results</p>
                      <p className="text-xs text-gray-500">Type to search...</p>
                    </div>
                    
                    {searchQuery.length > 0 ? (
                      <div className="space-y-2">
                        {/* No results message - since no data should be added */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-8 text-center text-gray-400"
                        >
                          <Search className="size-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm font-medium mb-1">No resources found</p>
                          <p className="text-xs">Press Enter to search for "{searchQuery}"</p>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-400">
                        <Search className="size-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-xs">Start typing to see results</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <nav className="flex items-center gap-6">
            {showBackButton && (
              <motion.button
                onClick={handleBack}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="size-4" />
                Back
              </motion.button>
            )}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to={`${baseUrl}/Home`}
                className={`text-sm font-medium transition-colors ${
                  location.pathname.includes('/Home') 
                    ? 'text-orange-600 font-semibold' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Home
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to={`${baseUrl}/Profile`}
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  location.pathname.includes('/Profile') && !location.pathname.includes('/Billing/Pricing')
                    ? 'text-orange-600 font-semibold' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="size-4" />
                Profile
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to={`${baseUrl}/Profile/Billing/Pricing`}
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  location.pathname.includes('/Profile/Billing/Pricing')
                    ? 'text-orange-600 font-semibold' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CreditCard className="size-4" />
                Plans & Billing
              </Link>
            </motion.div>
            <motion.button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut className="size-4" />
              Logout
            </motion.button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-[calc(100vh-180px)]">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12 px-6 mt-12">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <BookOpen className="size-6 text-orange-500" />
              <span className="text-xl font-semibold">Zyndex</span>
            </div>
            <p className="text-sm text-gray-400">
              © 2026 Zyndex • A ScholarSphere Digital Company • All rights reserved.
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}