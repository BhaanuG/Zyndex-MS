import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router';
import { Brain, Cpu, Binary, Atom, FlaskConical, Calculator, Landmark, BookOpen, Microscope } from 'lucide-react';
import PublicLayout from '@/app/components/PublicLayout';
import { useAuth } from '@/app/context/AuthContext';
import { setRedirectIntent } from '@/utils/redirectHelper';

export default function BrowseCategory() {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { user, getUrlSafeName, getUrlSafeEmail } = useAuth();
  const navigate = useNavigate();

  const categories = [
    {
      title: 'AI',
      description: 'Artificial intelligence paradigms, foundational neural networks, and prompt engineering',
      icon: Brain,
      gradient: 'from-orange-500 to-amber-500',
      bgGradient: 'from-orange-50 to-amber-50',
    },
    {
      title: 'ML',
      description: 'Machine learning fundamentals, predictive algorithms, statistical models, and deep learning',
      icon: Cpu,
      gradient: 'from-red-500 to-orange-500',
      bgGradient: 'from-red-50 to-orange-50',
    },
    {
      title: 'Computer Science',
      description: 'Data structures, algorithms, computational theory, operating systems, and distributed systems architecture',
      icon: Binary,
      gradient: 'from-blue-500 to-indigo-500',
      bgGradient: 'from-blue-50 to-indigo-50',
    },
    {
      title: 'Physics',
      description: 'Classical mechanics, quantum physics, thermodynamics, electromagnetism, and modern optics',
      icon: Atom,
      gradient: 'from-cyan-500 to-blue-600',
      bgGradient: 'from-cyan-50 to-blue-50',
    },
    {
      title: 'Chemistry',
      description: 'Organic chemistry, inorganic compounds, physical chemistry, chemical thermodynamics, and kinetics',
      icon: FlaskConical,
      gradient: 'from-rose-500 to-pink-600',
      bgGradient: 'from-rose-50 to-pink-50',
    },
    {
      title: 'Mathematics',
      description: 'Linear algebra, multivariable calculus, discrete mathematics, probability, statistics, and differential equations',
      icon: Calculator,
      gradient: 'from-purple-500 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-50',
    },
    {
      title: 'Economics',
      description: 'Microeconomics, macroeconomics, fiscal policy, financial markets, econometrics, and behavioral economics',
      icon: Landmark,
      gradient: 'from-amber-600 to-orange-600',
      bgGradient: 'from-amber-50 to-orange-50',
    },
    {
      title: 'History',
      description: 'World history, civilizations, political revolutions, historiography, and modern global developments',
      icon: Landmark,
      gradient: 'from-amber-700 to-red-700',
      bgGradient: 'from-amber-50 to-red-50',
    },
    {
      title: 'Literature',
      description: 'World literature, literary theory, classical texts, poetry, comparative linguistics, and critical prose',
      icon: BookOpen,
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-50 to-purple-50',
    },
    {
      title: 'Biology',
      description: 'Cell biology, molecular genetics, evolutionary biology, physiology, biochemistry, and microbiology',
      icon: Microscope,
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
  ];

  const handleCategoryClick = (category) => {
    if (user) {
      const userName = getUrlSafeName ? getUrlSafeName() : encodeURIComponent(user.name.replace(/\s+/g, '-'));
      const userEmail = getUrlSafeEmail ? getUrlSafeEmail() : encodeURIComponent(user.email);
      navigate(`/Zyndex/User/${userName}/${userEmail}/Search?category=${encodeURIComponent(category.title)}`);
      return;
    }

    setSelectedCategory(category);
    setRedirectIntent(`/Search?category=${encodeURIComponent(category.title)}`, {
      type: 'category_browse',
      metadata: { category: category.title },
    });
    setShowLoginPrompt(true);
  };

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-4rem)] py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-block mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur-2xl opacity-30" />
                <div className="relative bg-gradient-to-r from-orange-600 to-red-600 p-4 rounded-2xl">
                  <BookOpen className="size-12 text-white" />
                </div>
              </div>
            </motion.div>

            <h1 className="text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Browse by Academic Discipline
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Explore our curated digital repository of textbooks and curriculum modules organized by subject
            </p>
          </motion.div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  className="group relative"
                >
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${category.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
                  
                  {/* Card */}
                  <div className={`relative bg-gradient-to-br ${category.bgGradient} backdrop-blur-sm rounded-3xl p-8 shadow-lg group-hover:shadow-2xl transition-all duration-500`}>
                    {/* Icon */}
                    <motion.div 
                      className={`inline-flex p-4 bg-gradient-to-r ${category.gradient} rounded-2xl shadow-lg mb-6`}
                      whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
                    >
                      <Icon className="size-8 text-white" />
                    </motion.div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                      {category.title}
                    </h3>
                    <p className="text-slate-600 mb-6">
                      {category.description}
                    </p>

                    {/* Button */}
                    <motion.button
                      onClick={() => handleCategoryClick(category)}
                      className="group/btn inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-xl shadow-md hover:shadow-xl transition-all"
                      whileHover={{ x: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Explore Resources
                      <ArrowRight className="size-4 group-hover/btn:translate-x-1 transition-transform" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom Login Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur-2xl opacity-10" />
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-shrink-0 p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                  <Lock className="size-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Login Required
                  </h3>
                  <p className="text-slate-600">
                    To access our complete library of educational resources, please create an account or log in.
                  </p>
                </div>
                <Link
                  to="/Zyndex/User/Log-In"
                  onClick={() => setRedirectIntent('/Resources/Categories')}
                  className="relative group flex-shrink-0 block"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl whitespace-nowrap shadow-lg shadow-orange-600/30">
                    Login Now
                  </div>
                </Link>
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
              className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X className="size-5" />
              </button>

              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="mb-6"
              >
                <div className="relative inline-flex">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur-2xl opacity-30" />
                  <div className="relative bg-gradient-to-r from-orange-600 to-red-600 p-4 rounded-2xl">
                    <Lock className="size-10 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Login Required
              </h3>
              <p className="text-slate-600 mb-8">
                {selectedCategory
                  ? `Please log in to explore all resources in ${selectedCategory.title}.`
                  : 'Please log in to access our educational resources and start exploring.'}
              </p>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <Link
                  to="/Zyndex/User/Log-In"
                  className="relative group block"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl text-center shadow-lg shadow-orange-600/30">
                    Go to Login
                  </div>
                </Link>
                
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="px-6 py-3 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PublicLayout>
  );
}