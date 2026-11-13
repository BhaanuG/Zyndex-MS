import { Link, useNavigate, useLocation } from 'react-router';
import { BookOpen, User, LogOut, ArrowLeft, Sparkles, CreditCard, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import MaintenanceCountdownBar from './MaintenanceCountdownBar';

export default function UserLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getUrlSafeName, getUrlSafeEmail } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

          {/* Spacer between brand badge and navigation */}
          <div className="flex-1" />

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