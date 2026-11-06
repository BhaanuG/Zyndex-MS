import { motion } from 'motion/react';
import { Link } from 'react-router';
import { Target, Heart, Users, Sparkles, Award, TrendingUp, ArrowRight } from 'lucide-react';
import PublicLayout from '@/app/components/PublicLayout';

export default function About() {
  const teamMembers = [
    { initials: 'GB', name: 'G Bhaanu Sai', role: 'Team Lead', regNo: '2400030952', color: 'bg-gradient-to-br from-orange-500 to-orange-600' },
    { initials: 'RD', name: 'Rage Dheeraj', role: 'Team Member', regNo: '2400030485', color: 'bg-gradient-to-br from-orange-600 to-red-600' },
    { initials: 'GV', name: 'G V V Charan', role: 'Team Member', regNo: '2400030872', color: 'bg-gradient-to-br from-amber-500 to-orange-600' },
  ];

  const values = [
    {
      title: 'Excellence',
      description: 'Striving for the highest quality in everything we do',
      icon: Target,
    },
    {
      title: 'Accessibility',
      description: 'Making education resources available to everyone',
      icon: Users,
    },
    {
      title: 'Innovation',
      description: 'Continuously improving and embracing new technologies',
      icon: Heart,
    },
  ];

  return (
    <PublicLayout>
      <div className="py-24 px-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-orange-200/20 rounded-full blur-3xl"
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
            className="absolute bottom-20 right-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl"
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
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-24"
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
                About Our Platform
              </span>
            </motion.div>
            
            <motion.h1 
              className="text-6xl md:text-7xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              style={{ 
                textShadow: '0 2px 40px rgba(249, 115, 22, 0.1)'
              }}
            >
              About <span className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 bg-clip-text text-transparent">Zyndex</span>
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Building the future of <span className="font-semibold text-orange-600">educational resources</span> through technology and <span className="font-semibold text-orange-600">innovation</span>
            </motion.p>
          </motion.div>

          {/* Mission and Vision */}
          <div className="grid md:grid-cols-2 gap-8 mb-24">
            <motion.div 
              className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-10 overflow-hidden border border-white/20"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              whileHover={{ y: -12, transition: { duration: 0.4 } }}
              style={{
                boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
              }}
            >
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-orange-400/20 to-transparent rounded-full blur-3xl group-hover:opacity-70 opacity-40 transition-opacity duration-500" />
              
              <div className="relative">
                <motion.div 
                  className="size-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-orange-500/40"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  style={{
                    boxShadow: '0 10px 40px -10px rgba(249, 115, 22, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                  }}
                >
                  <Target className="size-8 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 mb-5">Our Mission</h2>
                <p className="text-gray-600 leading-relaxed text-lg">
                  To democratize access to high-quality educational resources and create a comprehensive platform that empowers learners and educators worldwide. We believe that knowledge should be accessible, organized, and easy to discover.
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-10 overflow-hidden border border-white/20"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              whileHover={{ y: -12, transition: { duration: 0.4 } }}
              style={{
                boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
              }}
            >
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-red-400/20 to-transparent rounded-full blur-3xl group-hover:opacity-70 opacity-40 transition-opacity duration-500" />
              
              <div className="relative">
                <motion.div 
                  className="size-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-red-500/40"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  style={{
                    boxShadow: '0 10px 40px -10px rgba(239, 68, 68, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                  }}
                >
                  <Heart className="size-8 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 mb-5">Our Vision</h2>
                <p className="text-gray-600 leading-relaxed text-lg">
                  We envision a world where every learner has seamless access to curated educational content across all disciplines. Zyndex aims to be the go-to platform for academic excellence, fostering a global community of continuous learners.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Team Section */}
          <motion.div 
            className="mb-24"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="text-center mb-16">
              <motion.div 
                className="size-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/40"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                style={{
                  boxShadow: '0 20px 50px -15px rgba(245, 158, 11, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                }}
              >
                <Users className="size-10 text-white" />
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Team</h2>
              <p className="text-gray-600 text-xl">Dedicated to building exceptional educational tools</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={index}
                  className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-10 text-center overflow-hidden border border-white/20"
                  initial={{ opacity: 0, y: 40, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.6 + index * 0.1 }}
                  whileHover={{ y: -12, transition: { duration: 0.4 } }}
                  style={{
                    boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative">
                    <motion.div 
                      className={`size-24 ${member.color} rounded-3xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-2xl shadow-orange-500/40`}
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      style={{
                        boxShadow: '0 15px 40px -10px rgba(249, 115, 22, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                      }}
                    >
                      {member.initials}
                    </motion.div>
                    <h3 className="font-bold text-gray-900 mb-2 text-xl">{member.name}</h3>
                    <p className="text-sm text-orange-600 font-semibold mb-4">{member.role}</p>
                    <div className="inline-flex items-center px-4 py-2 bg-orange-50/80 backdrop-blur-sm rounded-xl border border-orange-200/50 shadow-sm">
                      <p className="text-xs text-gray-600 font-medium">Reg. No: {member.regNo}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Core Values */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Core Values</h2>
              <p className="text-gray-600 text-xl">The principles that guide everything we do</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-10 text-center overflow-hidden border border-white/20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 1 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -8, transition: { duration: 0.4 } }}
                  style={{
                    boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative">
                    <motion.div 
                      className="size-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-200/50"
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      style={{
                        boxShadow: '0 10px 30px -8px rgba(249, 115, 22, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
                      }}
                    >
                      <value.icon className="size-10 text-orange-600" />
                    </motion.div>
                    <h3 className="font-bold text-gray-900 mb-4 text-2xl">{value.title}</h3>
                    <p className="text-base text-gray-600 leading-relaxed">{value.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Call to Action Section */}
          <motion.div
            className="mt-24 text-center bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 rounded-3xl p-12 text-white shadow-2xl relative overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Unlock Real-Time Academic & Research Knowledge
              </h2>
              <p className="text-orange-100 text-lg">
                Join thousands of students, researchers, and institutions accessing peer-reviewed journals and digital books.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Link
                  to="/Zyndex/Resources/Browse"
                  className="px-6 py-3.5 bg-white text-orange-600 font-bold rounded-xl shadow-lg hover:bg-orange-50 transition-all flex items-center gap-2 text-sm"
                >
                  Explore Catalog <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/Zyndex/About/Pricing"
                  className="px-6 py-3.5 bg-orange-700/60 hover:bg-orange-700 text-white font-bold rounded-xl border border-white/20 transition-all text-sm"
                >
                  View Subscription Plans
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PublicLayout>
  );
}
