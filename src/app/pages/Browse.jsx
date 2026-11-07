import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router';
import { Search, BookOpen, Lock, X, Filter, Grid3x3, List, Tags, Clock, Star, TrendingUp, FolderOpen, Sparkles, FileText, Shield, Eye, Zap, Layers, RefreshCw } from 'lucide-react';
import PublicLayout from '@/app/components/PublicLayout';
import { setRedirectIntent } from '@/utils/redirectHelper';

export default function Features() {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleLoginClick = () => {
    setShowLoginPrompt(true);
  };

  const platformFeatures = [
    {
      icon: Search,
      title: 'Smart Academic Discovery',
      description: 'Instant multi-attribute search across textbooks, research journals, lecture notes, and curriculum guides with real-time indexing.',
      gradient: 'from-orange-500 to-orange-600'
    },
    {
      icon: Filter,
      title: 'Multi-Discipline Categories',
      description: 'Curated archives spanning AI, Machine Learning, Computer Science, Engineering, Mathematics, Physics, and Humanities.',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      icon: FileText,
      title: 'Interactive PDF Reader',
      description: 'High-performance in-browser viewer with dynamic zoom, responsive multi-page rendering, document outline, and jump-to-page navigation.',
      gradient: 'from-red-500 to-orange-600'
    },
    {
      icon: Clock,
      title: 'Live Reading Telemetry',
      description: 'Smart session and active-minute logging with tab visibility awareness to provide authentic academic engagement analytics.',
      gradient: 'from-orange-600 to-red-600'
    },
    {
      icon: Star,
      title: 'Personalized Scholar Hub',
      description: 'One-click resource bookmarking, favorite lists, and resume reading shortcuts highlighting your last 3 explored resources.',
      gradient: 'from-orange-500 to-amber-600'
    },
    {
      icon: Shield,
      title: 'Enterprise Multi-Factor Security',
      description: 'Dynamic 4-digit numeric OTP authentication, 24-hour trusted device authorization, and 2h 30m idle session security monitoring.',
      gradient: 'from-amber-500 to-orange-500'
    },
    {
      icon: Layers,
      title: 'Tiered Access Governance',
      description: 'Fine-grained role and subscription management catering to Students, Teachers, PhD Researchers, and Academic Admins.',
      gradient: 'from-orange-600 to-amber-600'
    },
    {
      icon: Zap,
      title: 'Real-Time Telemetry Logs',
      description: 'Live admin metrics monitoring total readers, active today/live users, average session lengths, and aggregated reading minutes.',
      gradient: 'from-red-600 to-orange-600'
    },
    {
      icon: RefreshCw,
      title: 'Seamless Digital Payments',
      description: 'UPI QR code checkout with automated UTR confirmation, 2-minute verification hold processing, and automated receipt issuance.',
      gradient: 'from-amber-600 to-red-600'
    }
  ];

  const viewModes = [
    {
      icon: Grid3x3,
      title: 'Card Explorer',
      description: 'Visual resource cards with category badges, author attribution, and page counts'
    },
    {
      icon: List,
      title: 'Live Academic Catalog',
      description: 'Structured academic directory with instant keyword search and category filtering'
    },
    {
      icon: FolderOpen,
      title: 'Subject Disciplines',
      description: 'Dedicated archives curated specifically for university scholars, educators, and faculty'
    }
  ];

  return (
    <PublicLayout>
      <div className="min-h-screen py-24 px-6 bg-gradient-to-br from-slate-50 via-white to-orange-50/30 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-20 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header Section */}
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-full text-sm font-semibold mb-8 shadow-lg shadow-orange-100/50"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              style={{
                boxShadow: '0 4px 24px -8px rgba(249, 115, 22, 0.25), 0 0 0 1px rgba(249, 115, 22, 0.1) inset'
              }}
            >
              <Sparkles className="size-4 text-orange-600" />
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Platform Capabilities &amp; Highlights
              </span>
            </motion.div>

            <motion.h1 
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              style={{ 
                textShadow: '0 2px 40px rgba(249, 115, 22, 0.1)'
              }}
            >
              <span className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 bg-clip-text text-transparent">
                Zyndex Platform Features
              </span>
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Discover all high-impact features, reading telemetry, secure multi-factor access, and curated discipline categories built for the modern academic ecosystem.
            </motion.p>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            {platformFeatures.map((feature, index) => (
              <motion.div
                key={index}
                className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 overflow-hidden border border-white/20"
                style={{
                  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(249, 115, 22, 0.05) inset'
                }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-full blur-2xl transition-opacity duration-500`} />
                
                <div className="relative z-10">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white mb-6 shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="size-6" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Public Explorer Demo Banner */}
          <motion.div
            className="relative bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl p-10 md:p-14 text-white text-center overflow-hidden shadow-2xl shadow-orange-500/30 mb-20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">Ready to Experience the Full Platform?</h2>
              <p className="text-orange-100 text-lg">
                Create your verified user account in seconds, enjoy seamless search, and log your reading progress with real-time academic telemetry.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  to="/Zyndex/User/Sign-Up"
                  className="px-8 py-3.5 bg-white text-orange-600 font-bold rounded-xl shadow-lg hover:bg-orange-50 transition-all text-sm"
                >
                  Create Account
                </Link>
                <Link
                  to="/Zyndex/Resources/Categories"
                  className="px-8 py-3.5 bg-orange-700/60 border border-white/20 text-white font-semibold rounded-xl hover:bg-orange-700 transition-all text-sm"
                >
                  Explore Categories
                </Link>
              </div>
            </div>
          </motion.div>

          {/* View Modes Section */}
          <motion.div 
            className="mb-20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Flexible Viewing Options</h2>
              <p className="text-gray-600 text-xl">Choose how you want to explore resources</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {viewModes.map((mode, index) => (
                <motion.div
                  key={index}
                  className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 text-center overflow-hidden border border-white/20"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.05, y: -5, transition: { duration: 0.3 } }}
                  style={{
                    boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative">
                    <motion.div 
                      className="size-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-200/50"
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      style={{
                        boxShadow: '0 10px 30px -8px rgba(249, 115, 22, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
                      }}
                    >
                      <mode.icon className="size-8 text-orange-600" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{mode.title}</h3>
                    <p className="text-gray-600">{mode.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Login CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <div className="relative bg-gradient-to-br from-orange-50/80 to-amber-50/80 backdrop-blur-xl rounded-3xl p-12 md:p-16 text-center overflow-hidden border border-orange-100/50"
              style={{
                boxShadow: '0 25px 70px -20px rgba(249, 115, 22, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
              }}
            >
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-orange-300/30 to-transparent rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-br from-amber-300/30 to-transparent rounded-full blur-3xl" />
              
              <div className="relative">
                <motion.div
                  className="inline-flex p-6 bg-white/80 backdrop-blur-sm rounded-3xl mb-6 shadow-xl shadow-orange-200/50"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.8, type: 'spring', stiffness: 200 }}
                  style={{
                    boxShadow: '0 15px 40px -10px rgba(249, 115, 22, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
                  }}
                >
                  <BookOpen className="size-12 text-orange-600" />
                </motion.div>
                
                <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Ready to Start Exploring?
                </h3>
                <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                  Log in to access our complete library of educational resources and unlock all browsing features
                </p>

                <motion.button
                  onClick={handleLoginClick}
                  className="relative group inline-block"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative px-10 py-5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-2xl flex items-center gap-3 shadow-2xl shadow-orange-500/40"
                    style={{
                      boxShadow: '0 15px 40px -10px rgba(249, 115, 22, 0.5)'
                    }}
                  >
                    <Lock className="size-5" />
                    Login to Browse Library
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Login Prompt Modal */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowLoginPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-10 border border-white/20"
              style={{
                boxShadow: '0 30px 80px -15px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="size-5" />
              </button>

              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mb-6"
              >
                <div className="relative inline-flex">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur-2xl opacity-40" />
                  <div className="relative bg-gradient-to-r from-orange-600 to-red-600 p-5 rounded-3xl shadow-2xl shadow-orange-500/50"
                    style={{
                      boxShadow: '0 15px 40px -10px rgba(249, 115, 22, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                    }}
                  >
                    <Lock className="size-10 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* Content */}
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Login Required
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                Please log in to access our educational resources and start exploring our comprehensive library.
              </p>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <Link
                  to="/Zyndex/User/Log-In"
                  onClick={() => setRedirectIntent('/Home', { type: 'browse_catalog' })}
                  className="relative group block"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-2xl text-center shadow-2xl shadow-orange-500/40"
                    style={{
                      boxShadow: '0 10px 30px -8px rgba(249, 115, 22, 0.5)'
                    }}
                  >
                    Go to Login
                  </div>
                </Link>
                
                <motion.button
                  onClick={() => setShowLoginPrompt(false)}
                  className="px-8 py-4 text-gray-600 hover:bg-gray-100 font-semibold rounded-2xl transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PublicLayout>
  );
}
