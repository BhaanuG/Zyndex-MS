import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { Search, FlaskConical, Calculator, BookOpen, Landmark, Sparkles, TrendingUp, Heart, Brain, Cpu, Atom, Microscope, X, ArrowRight, Loader2 } from 'lucide-react';
import UserLayout from '@/app/components/UserLayout';
import { useAuth } from '@/app/context/AuthContext';
import { TransitionLoader } from '@/app/components/PageTransitionWrapper';
import resourceService from '@/services/api/resourceService';
import userService from '@/services/api/userService';

const categoryIcons = {
  ai: { icon: Brain, gradient: 'from-fuchsia-500 to-rose-500', bgColor: 'bg-fuchsia-100' },
  ml: { icon: Cpu, gradient: 'from-indigo-500 to-blue-500', bgColor: 'bg-indigo-100' },
  mathematics: { icon: Calculator, gradient: 'from-green-500 to-emerald-500', bgColor: 'bg-green-100' },
  maths: { icon: Calculator, gradient: 'from-green-500 to-emerald-500', bgColor: 'bg-green-100' },
  physics: { icon: Atom, gradient: 'from-cyan-500 to-sky-500', bgColor: 'bg-cyan-100' },
  chemistry: { icon: FlaskConical, gradient: 'from-orange-500 to-amber-500', bgColor: 'bg-orange-100' },
  'computer science': { icon: BookOpen, gradient: 'from-slate-700 to-slate-500', bgColor: 'bg-slate-100' },
  biology: { icon: Microscope, gradient: 'from-lime-500 to-emerald-500', bgColor: 'bg-lime-100' },
  economics: { icon: Landmark, gradient: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-100' },
  science: { icon: FlaskConical, gradient: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-100' },
  literature: { icon: BookOpen, gradient: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-100' },
  history: { icon: Landmark, gradient: 'from-orange-500 to-red-500', bgColor: 'bg-orange-100' },
};

const preferredCategoryOrder = ['AI', 'ML', 'Mathematics', 'Maths', 'Physics', 'Chemistry', 'Computer Science', 'Biology', 'Economics', 'History', 'Literature'];

export default function UserHome() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLiveDropdown, setShowLiveDropdown] = useState(false);
  const [isBookTransitioning, setIsBookTransitioning] = useState(false);
  const searchContainerRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [resources, setResources] = useState([]);
  const [recentViews, setRecentViews] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const { getUrlSafeName, getUrlSafeEmail, user } = useAuth();

  // Close live search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowLiveDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live search results as user types (debounced 250ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length === 0) {
      setLiveSearchResults([]);
      setIsSearching(false);
      setShowLiveDropdown(false);
      return;
    }

    setShowLiveDropdown(true);
    setIsSearching(true);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await resourceService.searchResources({ query: trimmed, size: 8 });
        const list = Array.isArray(res) ? res : (res?.resources || []);
        setLiveSearchResults(list);
      } catch (err) {
        console.error('Failed to perform live search:', err);
        setLiveSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    async function loadHome() {
      const [categoryResult, featuredResult, favoritesResult, recentViewsResult] = await Promise.allSettled([
        resourceService.getCategories(),
        resourceService.getFeaturedResources(12),
        userService.getFavorites({ size: 100 }),
        userService.getRecentViews({ size: 12 }),
      ]);

      if (categoryResult.status === 'fulfilled') {
        setCategories(Array.isArray(categoryResult.value) ? categoryResult.value : []);
      } else {
        console.error('Failed to load categories:', categoryResult.reason);
        setCategories([]);
      }

      if (featuredResult.status === 'fulfilled') {
        setResources(Array.isArray(featuredResult.value) ? featuredResult.value : []);
      } else {
        console.error('Failed to load featured resources:', featuredResult.reason);
        setResources([]);
      }

      if (favoritesResult.status === 'fulfilled') {
        setFavoriteIds((favoritesResult.value.resources || []).map((resource) => resource.id));
      } else {
        console.error('Failed to load favourites:', favoritesResult.reason);
        setFavoriteIds([]);
      }

      if (recentViewsResult.status === 'fulfilled') {
        const viewsList = recentViewsResult.value.resources || [];
        setRecentViews(viewsList.slice(0, 3));
      } else {
        console.error('Failed to load recent views:', recentViewsResult.reason);
        setRecentViews([]);
      }
    }

    loadHome();
  }, []);

  const handleCategoryClick = (category) => {
    const userName = getUrlSafeName();
    const userEmail = getUrlSafeEmail();
    navigate(`/Zyndex/User/${userName}/${userEmail}/Search?category=${encodeURIComponent(category)}`);
  };

  const handleResourceClick = (resourceId) => {
    setShowLiveDropdown(false);
    setIsBookTransitioning(true);
    const userName = getUrlSafeName();
    const userEmail = getUrlSafeEmail();
    setTimeout(() => {
      navigate(`/Zyndex/User/${userName}/${userEmail}/Resource/${resourceId}`);
    }, 5000);
  };

  const handleSeeAllResults = () => {
    if (!searchQuery.trim()) return;
    setShowLiveDropdown(false);
    const userName = getUrlSafeName();
    const userEmail = getUrlSafeEmail();
    navigate(`/Zyndex/User/${userName}/${userEmail}/Search?query=${encodeURIComponent(searchQuery)}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    handleSeeAllResults();
  };

  const toggleFavorite = async (e, resourceId) => {
    e.stopPropagation();
    try {
      if (favoriteIds.includes(resourceId)) {
        await userService.removeFromFavorites(resourceId);
        setFavoriteIds((current) => current.filter((id) => id !== resourceId));
      } else {
        await userService.addToFavorites(resourceId);
        setFavoriteIds((current) => [...current, resourceId]);
      }
    } catch (error) {
      console.error('Failed to update favourites:', error);
    }
  };

  const categoryCards = [...categories]
    .sort((a, b) => {
      const aIndex = preferredCategoryOrder.findIndex((name) => name.toLowerCase() === a.name.toLowerCase());
      const bIndex = preferredCategoryOrder.findIndex((name) => name.toLowerCase() === b.name.toLowerCase());
      const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

      if (normalizedA !== normalizedB) {
        return normalizedA - normalizedB;
      }

      return a.name.localeCompare(b.name);
    })
    .map((category) => {
    const key = category.name.toLowerCase();
    const theme = categoryIcons[key] || categoryIcons.history;
      return {
        ...category,
        title: category.name,
        icon: theme.icon,
        gradient: theme.gradient,
        bgColor: theme.bgColor,
        count: `${category.count} resources`,
      };
    });

  return (
    <UserLayout>
      <div className="py-12 px-6 min-h-screen bg-gradient-to-br from-orange-50 via-amber-50/30 to-orange-50">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <motion.div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-6" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <Sparkles className="size-4" />
              Your Learning Hub
            </motion.div>

            <h1 className="text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Welcome {user?.name || 'User'}
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Explore our live collection of educational resources from the backend.
            </p>

            {/* Interactive Live Search Bar */}
            <div className="max-w-2xl mx-auto relative z-30" ref={searchContainerRef}>
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.trim().length > 0) setShowLiveDropdown(true);
                    }}
                    placeholder="Search by title, author, or keyword (live search)..."
                    className="w-full pl-12 pr-10 py-4 rounded-2xl border border-orange-200 bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-800 placeholder-gray-400 text-base transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setLiveSearchResults([]);
                        setShowLiveDropdown(false);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="size-5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-6 py-4 rounded-2xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-colors shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <span>Search</span>
                </button>
              </form>

              {/* Instant Live Search Results Overlay Dropdown */}
              <AnimatePresence>
                {showLiveDropdown && searchQuery.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden text-left"
                  >
                    {/* Header bar */}
                    <div className="px-5 py-3.5 bg-gradient-to-r from-orange-50 to-amber-50/50 border-b border-orange-100/60 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-orange-900 uppercase tracking-wider">
                        <Sparkles className="size-3.5 text-orange-500" />
                        <span>Live Search Results</span>
                      </div>
                      {isSearching ? (
                        <div className="flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Searching...</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 font-medium">
                          {liveSearchResults.length} {liveSearchResults.length === 1 ? 'result' : 'results'} found
                        </span>
                      )}
                    </div>

                    {/* Results list */}
                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                      {isSearching && liveSearchResults.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                          <Loader2 className="size-8 text-orange-500 animate-spin mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-600">Searching library resources...</p>
                        </div>
                      ) : liveSearchResults.length > 0 ? (
                        liveSearchResults.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleResourceClick(item.id)}
                            className="p-4 hover:bg-orange-50/60 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div className="size-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                <BookOpen className="size-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors text-sm truncate">
                                    {item.title}
                                  </h4>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 shrink-0">
                                    {item.category || 'General'}
                                  </span>
                                  {item.type && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0 uppercase">
                                      {item.type}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-1 mb-1">
                                  {item.description || 'No description provided.'}
                                </p>
                                <p className="text-[11px] text-gray-400 font-medium">
                                  Author: <span className="text-gray-600">{item.author || item.subject || 'Academic Faculty'}</span>
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-orange-600 group-hover:translate-x-1 transition-transform">
                              <span>Open</span>
                              <ArrowRight className="size-3.5" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-400">
                          <BookOpen className="size-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-gray-700 mb-1">No matching resources found</p>
                          <p className="text-xs text-gray-500">
                            No materials matched &ldquo;{searchQuery}&rdquo;. Try another keyword or author.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer link to full SearchResults page */}
                    {liveSearchResults.length > 0 && (
                      <div className="p-3 bg-gray-50/80 border-t border-gray-100 text-center">
                        <button
                          type="button"
                          onClick={handleSeeAllResults}
                          className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors inline-flex items-center gap-1"
                        >
                          <span>See all results for &ldquo;{searchQuery}&rdquo;</span>
                          <ArrowRight className="size-3" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}>
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Browse by Category</h2>
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                <TrendingUp className="size-8 text-orange-600" />
              </motion.div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {categoryCards.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-4 bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center text-gray-500">
                  Category cards will appear here when the category data loads.
                </div>
              ) : categoryCards.map((category, index) => {
                const Icon = category.icon;
                return (
                  <motion.div
                    key={category.name}
                    onClick={() => handleCategoryClick(category.title)}
                    className="group relative bg-white rounded-2xl shadow-lg p-6 cursor-pointer overflow-hidden border border-gray-100"
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                    whileHover={{ y: -10 }}
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 ${category.bgColor} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`} />
                    <div className="relative">
                      <div className={`size-16 bg-gradient-to-br ${category.gradient} rounded-2xl flex items-center justify-center mb-5 shadow-lg`}>
                        <Icon className="size-8 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2 text-lg">{category.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 leading-relaxed">Explore curated materials for {category.title}.</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 font-medium">{category.count}</p>
                        <span className="text-orange-600 font-semibold text-sm">Explore</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.9 }}>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Recently Viewed By You</h2>
            {recentViews.length === 0 ? (
              <div className="relative bg-white rounded-3xl shadow-xl p-12 text-center overflow-hidden border border-gray-100 mb-16">
                <div className="relative">
                  <BookOpen className="size-10 text-orange-600 mx-auto mb-6" />
                  <p className="text-xl font-bold text-gray-900 mb-2">No recent views yet</p>
                  <p className="text-gray-600">Resources you open will appear here only for your account.</p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                {recentViews.map((resource, index) => (
                  <motion.div
                    key={`recent-${resource.id}`}
                    className="group relative bg-white rounded-2xl shadow-lg p-6 cursor-pointer overflow-hidden border border-gray-100"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    whileHover={{ y: -8 }}
                    onClick={() => navigate(`/Zyndex/User/${getUrlSafeName()}/${getUrlSafeEmail()}/Resource/${resource.id}`)}
                  >
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, resource.id)}
                        className={`absolute top-0 right-0 p-2 rounded-full transition-colors ${favoriteIds.includes(resource.id) ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500'}`}
                      >
                        <Heart className={`size-4 ${favoriteIds.includes(resource.id) ? 'fill-current' : ''}`} />
                      </button>
                      <h3 className="font-bold text-gray-900 mb-2 text-lg">{resource.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{resource.description}</p>
                      <p className="text-sm text-gray-500 mb-4">Author of Resource: {resource.author || resource.subject}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium px-2.5 py-1 bg-gray-100 rounded-lg">{resource.category}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            !resource.requiredPlan || resource.requiredPlan === 'FREE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}>
                            {!resource.requiredPlan || resource.requiredPlan === 'FREE' ? 'Free' : (resource.requiredPlan).replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-sm text-orange-600 font-bold">Viewed</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 1.0 }}>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Latest Library Resources</h2>
            {resources.length === 0 ? (
              <div className="relative bg-white rounded-3xl shadow-xl p-20 text-center overflow-hidden border border-gray-100">
                <div className="relative">
                  <BookOpen className="size-10 text-orange-600 mx-auto mb-6" />
                  <p className="text-xl font-bold text-gray-900 mb-2">No resources available</p>
                  <p className="text-gray-600">Resources will appear here once they are uploaded</p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map((resource, index) => (
                  <motion.div
                    key={resource.id}
                    className="group relative bg-white rounded-2xl shadow-lg p-6 cursor-pointer overflow-hidden border border-gray-100"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    onClick={() => navigate(`/Zyndex/User/${getUrlSafeName()}/${getUrlSafeEmail()}/Resource/${resource.id}`)}
                  >
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, resource.id)}
                        className={`absolute top-0 right-0 p-2 rounded-full transition-colors ${favoriteIds.includes(resource.id) ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500'}`}
                      >
                        <Heart className={`size-4 ${favoriteIds.includes(resource.id) ? 'fill-current' : ''}`} />
                      </button>
                      <h3 className="font-bold text-gray-900 mb-2 text-lg">{resource.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{resource.description}</p>
                      <p className="text-sm text-gray-500 mb-4">Author of Resource: {resource.author || resource.subject}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium px-2.5 py-1 bg-gray-100 rounded-lg">{resource.category}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            !resource.requiredPlan || resource.requiredPlan === 'FREE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}>
                            {!resource.requiredPlan || resource.requiredPlan === 'FREE' ? 'Free' : (resource.requiredPlan).replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-sm text-orange-600 font-bold">View</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* 5-second rotating book transition modal upon selecting a search item */}
      <AnimatePresence>
        {isBookTransitioning && (
          <TransitionLoader duration={5000} message="Loading resource..." />
        )}
      </AnimatePresence>
    </UserLayout>
  );
}
