import { Link, useNavigate, useLocation } from 'react-router';
import { BookOpen, Search, User, LogOut, ArrowLeft, X, Sparkles, CreditCard, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import MaintenanceCountdownBar from './MaintenanceCountdownBar';

export default function UserLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getUrlSafeName, getUrlSafeEmail } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef(null);

  const handleLogout = () => {
    logout();
    // The logout function in AuthContext will handle the redirect after 10 seconds
  };

  const handleBack = () => {
    // If the user has history in this tab/window, go back
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Otherwise navigate safely back to Home
      navigate(`${baseUrl}/Home`);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="py-3 sm:py-4 px-4 sm:px-6 bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Back Button always visible on left */}
            <motion.button
              type="button"
              onClick={handleBack}
              className="text-xs sm:text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-orange-50 border border-gray-200 hover:border-orange-200 cursor-pointer shadow-2xs"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Go back to previous page"
              aria-label="Back"
            >
              <ArrowLeft className="size-3.5 sm:size-4 text-orange-600" />
              <span className="hidden xs:inline">Back</span>
            </motion.button>

            <Link 
              to={`${baseUrl}/Home`} 
              className="flex items-center gap-1.5 sm:gap-2 hover:scale-105 transition-transform"
            >
              <BookOpen className="size-5 sm:size-6 text-orange-600 shrink-0" />
              <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Zyndex</span>
            </Link>
            {user?.subscriptionPlan && user.subscriptionPlan !== 'FREE' && (() => {
              const plan = String(user.subscriptionPlan).toUpperCase();
              let badgeSymbol = "○";
              let badgeColor = "text-blue-600 hover:text-blue-700";
              let label = "Student Basic";

              if (plan.includes('ENTERPRISE') || plan.includes('FELLOW')) {
                badgeSymbol = "∞";
                badgeColor = "text-purple-600 hover:text-purple-700";
                label = "Distinguished Fellow & Scholar";
              } else if (plan.includes('UNIVERSITY') || plan.includes('FACULTY') || plan.includes('EDUCATOR')) {
                badgeSymbol = "⬢";
                badgeColor = "text-indigo-600 hover:text-indigo-700";
                label = "Academic Faculty & Educator";
              } else if (plan.includes('RESEARCHER') || plan.includes('PRO') || plan.includes('PHD')) {
                badgeSymbol = "✦";
                badgeColor = "text-teal-600 hover:text-teal-700";
                label = "PhD Scholar / Researcher";
              } else if (plan.includes('PLUS')) {
                badgeSymbol = "⬦";
                badgeColor = "text-amber-600 hover:text-amber-700";
                label = "Student Plus";
              } else if (plan.includes('BASIC')) {
                badgeSymbol = "○";
                badgeColor = "text-blue-600 hover:text-blue-700";
                label = "Student Basic";
              }

              return (
                <Link
                  to={`${baseUrl}/Profile/Billing/Pricing`}
                  title={`Subscribed Plan: ${label} (Click to manage)`}
                  aria-label={`Subscribed Plan: ${label}`}
                  className={`inline-flex items-center justify-center text-lg sm:text-xl font-black leading-none transition-transform hover:scale-110 active:scale-95 ${badgeColor}`}
                >
                  <span>{badgeSymbol}</span>
                </Link>
              );
            })()}
          </div>

          {/* Remove middle search bar from header on Home page if on Home */}
          {!location.pathname.includes('/Home') ? (
            <div className="flex-1 max-w-xs md:max-w-md lg:max-w-xl relative hidden md:block" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search resources..."
                  className="w-full pl-10 pr-10 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
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
          ) : (
            <div className="flex-1" />
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-5">
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
                  location.pathname.includes('/Profile')
                    ? 'text-orange-600 font-semibold' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="size-4" />
                Profile
              </Link>
            </motion.div>
            <motion.button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 transition-colors flex items-center gap-2 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut className="size-4" />
              Logout
            </motion.button>

            {/* Top-Right Corner Maintenance Countdown Timer & 10s Alert */}
            <MaintenanceCountdownBar isPrimaryAdmin={false} mode="user" />
          </nav>

          {/* Mobile Right Controls: Maintenance timer & Hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <MaintenanceCountdownBar isPrimaryAdmin={false} mode="user" />
            <motion.button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-700 hover:text-orange-600 hover:bg-orange-50 border border-gray-200 transition-colors"
              whileTap={{ scale: 0.92 }}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-gray-100 mt-3 pt-3 pb-2 space-y-2 bg-white"
            >
              {/* Mobile Search Bar inside dropdown */}
              {!location.pathname.includes('/Home') && (
                <form onSubmit={handleSearchSubmit} className="relative px-2 mb-3">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search resources..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </form>
              )}

              <div className="flex flex-col space-y-1 px-2">
                <Link
                  to={`${baseUrl}/Home`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    location.pathname.includes('/Home')
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to={`${baseUrl}/Profile`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    location.pathname.includes('/Profile')
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <User className="size-4" />
                  Profile & Settings
                </Link>
                <Link
                  to={`${baseUrl}/Profile/Billing/Pricing`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <CreditCard className="size-4" />
                  Plans & Pricing
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                >
                  <LogOut className="size-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12 px-6 mt-auto">
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