import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { Search, FlaskConical, Calculator, BookOpen, Landmark, Sparkles, TrendingUp, Heart, Brain, Cpu, Atom, Microscope, X, ArrowRight, Loader2, Coins, BookText, ScrollText, Filter, ChevronDown, Check } from 'lucide-react';
import UserLayout from '@/app/components/UserLayout';
import { useAuth } from '@/app/context/AuthContext';
import { TransitionLoader } from '@/app/components/PageTransitionWrapper';
import resourceService from '@/services/api/resourceService';
import userService from '@/services/api/userService';
import { getPlanName, getPlanBadgeClass, PLATFORM_PLANS, isResourceAccessibleForPlan, buildResourceUrl } from '@/utils/planHelper';

const categoryIcons = {
  'artificial intelligence': { icon: Brain, gradient: 'from-fuchsia-500 to-rose-500', bgColor: 'bg-fuchsia-100' },
  'machine learning': { icon: Cpu, gradient: 'from-indigo-500 to-blue-500', bgColor: 'bg-indigo-100' },
  ai: { icon: Brain, gradient: 'from-fuchsia-500 to-rose-500', bgColor: 'bg-fuchsia-100' },
  ml: { icon: Cpu, gradient: 'from-indigo-500 to-blue-500', bgColor: 'bg-indigo-100' },
  mathematics: { icon: Calculator, gradient: 'from-green-500 to-emerald-500', bgColor: 'bg-green-100' },
  maths: { icon: Calculator, gradient: 'from-green-500 to-emerald-500', bgColor: 'bg-green-100' },
  physics: { icon: Atom, gradient: 'from-cyan-500 to-sky-500', bgColor: 'bg-cyan-100' },
  chemistry: { icon: FlaskConical, gradient: 'from-orange-500 to-amber-500', bgColor: 'bg-orange-100' },
  'computer science': { icon: BookOpen, gradient: 'from-slate-700 to-slate-500', bgColor: 'bg-slate-100' },
  biology: { icon: Microscope, gradient: 'from-lime-500 to-emerald-500', bgColor: 'bg-lime-100' },
  economics: { icon: Coins, gradient: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-100' },
  science: { icon: FlaskConical, gradient: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-100' },
  literature: { icon: BookText, gradient: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-100' },
  history: { icon: ScrollText, gradient: 'from-orange-500 to-red-500', bgColor: 'bg-orange-100' },
};

const preferredCategoryOrder = ['Artificial Intelligence', 'Machine Learning', 'Computer Science', 'Physics', 'Chemistry', 'Mathematics', 'Economics', 'History', 'Literature', 'Biology'];

const STANDARD_CATEGORIES = [
  { name: 'Artificial Intelligence', description: 'Artificial intelligence paradigms, neural networks, and prompt engineering' },
  { name: 'Machine Learning', description: 'Machine learning fundamentals, predictive algorithms, and deep learning' },
  { name: 'Computer Science', description: 'Data structures, algorithms, computational theory, and systems' },
  { name: 'Physics', description: 'Classical mechanics, quantum physics, thermodynamics, and optics' },
  { name: 'Chemistry', description: 'Organic chemistry, inorganic compounds, and chemical thermodynamics' },
  { name: 'Mathematics', description: 'Linear algebra, multivariable calculus, probability, and statistics' },
  { name: 'Economics', description: 'Microeconomics, macroeconomics, financial markets, and econometrics' },
  { name: 'History', description: 'World history, civilizations, political revolutions, and developments' },
  { name: 'Literature', description: 'World literature, literary theory, classical texts, and poetry' },
  { name: 'Biology', description: 'Cell biology, genetics, evolutionary biology, and physiology' },
];

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
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef(null);
  const { getUrlSafeName, getUrlSafeEmail, user } = useAuth();

  const isArticleResource = (resource) => {
    const t = String(resource?.type || resource?.resourceType || '').toLowerCase();
    return t === 'article' || t === 'paper' || !resource?.fileUrl;
  };

  const getCleanDescription = (resource) => {
    const raw = resource?.description || '';
    if (!raw) return 'No description provided.';
    if (isArticleResource(resource) || raw.includes('<')) {
      const plain = raw.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      return plain || 'Academic article publication.';
    }
    return raw;
  };

  const getDisplayType = (resource) => {
    return isArticleResource(resource) ? 'ARTICLE' : (resource?.type || 'PDF').toUpperCase();
  };

  // Close live search dropdown and filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowLiveDropdown(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live search results as user types or adjusts plan/format filters (debounced 250ms), applying cumulative plan & type filters
  useEffect(() => {
    const trimmed = searchQuery.trim();
    const hasActiveFilter = selectedPlanFilter !== 'ALL' || selectedTypeFilter !== 'ALL';

    if (trimmed.length === 0 && !hasActiveFilter) {
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
        const queryParams = { query: trimmed, size: 24 };
        if (selectedTypeFilter !== 'ALL') {
          queryParams.type = selectedTypeFilter;
        }
        const res = await resourceService.searchResources(queryParams);
        let list = Array.isArray(res) ? res : (res?.resources || []);
        
        // Filter by cumulative required plan
        if (selectedPlanFilter !== 'ALL') {
          list = list.filter((item) => isResourceAccessibleForPlan(item.requiredPlan, selectedPlanFilter));
        }
        setLiveSearchResults(list.slice(0, 10));
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
  }, [searchQuery, selectedPlanFilter, selectedTypeFilter]);

  useEffect(() => {
    async function loadHome() {
      const [categoryResult, featuredResult, favoritesResult, recentViewsResult] = await Promise.allSettled([
        resourceService.getCategories(),
        resourceService.getFeaturedResources(6),
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
        const raw = Array.isArray(featuredResult.value) ? featuredResult.value : (featuredResult.value?.resources || []);
        setResources(raw.slice(0, 6));
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
    const interval = window.setInterval(loadHome, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const handleCategoryClick = (category) => {
    const userName = getUrlSafeName();
    const userEmail = getUrlSafeEmail();
    navigate(`/Zyndex/User/${userName}/${userEmail}/Search?category=${encodeURIComponent(category)}`);
  };

  const handleResourceClick = (resourceItem) => {
    setShowLiveDropdown(false);
    setIsBookTransitioning(true);
    const userName = getUrlSafeName();
    const userEmail = getUrlSafeEmail();
    const targetUrl = typeof resourceItem === 'object' && resourceItem !== null
      ? buildResourceUrl(userName, userEmail, resourceItem.category, resourceItem.title, resourceItem.id)
      : `/Zyndex/User/${userName}/${userEmail}/General/Resource/Document/${resourceItem}.php`;

    setTimeout(() => {
      navigate(targetUrl);
    }, 3000);
  };

  const handleSeeAllResults = () => {
    if (!searchQuery.trim()) return;
    setShowLiveDropdown(false);
    const userName = getUrlSafeName();
    const userEmail = getUrlSafeEmail();
    const params = new URLSearchParams();
    params.set('query', searchQuery.trim());
    if (selectedPlanFilter !== 'ALL') {
      params.set('plan', selectedPlanFilter);
    }
    if (selectedTypeFilter !== 'ALL') {
      params.set('type', selectedTypeFilter.toLowerCase());
    }
    navigate(`/Zyndex/User/${userName}/${userEmail}/Search?${params.toString()}`);
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

  const categoryCards = STANDARD_CATEGORIES.map((standardCat) => {
    // Find matching category from backend count results if available
    const matchedBackend = categories.find(
      (c) => (c?.name || '').trim().toLowerCase() === standardCat.name.toLowerCase()
    );
    const countNum = matchedBackend?.count ? Number(matchedBackend.count) : 0;
    const key = standardCat.name.toLowerCase();
    const theme = categoryIcons[key] || categoryIcons.history;

    return {
      name: standardCat.name,
      title: standardCat.name,
      description: standardCat.description,
      icon: theme.icon,
      gradient: theme.gradient,
      bgColor: theme.bgColor,
      count: countNum > 0 ? `${countNum} resource${countNum === 1 ? '' : 's'}` : 'Explore resources',
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

            {/* Interactive Live Search Bar with Integrated Plan & Resource Filters */}
            <div className="max-w-3xl mx-auto relative z-30" ref={searchContainerRef}>
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <div className="flex-1 relative flex items-center bg-white rounded-2xl border border-orange-200 shadow-md focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500 transition-all overflow-visible">
                  <Search className="absolute left-4 size-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.trim().length > 0) setShowLiveDropdown(true);
                    }}
                    placeholder="Search by title, author, or keyword..."
                    className="w-full pl-12 pr-10 py-4 bg-transparent text-gray-800 placeholder-gray-400 text-base focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setLiveSearchResults([]);
                        setShowLiveDropdown(false);
                      }}
                      className="absolute right-3.5 p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  )}

                  {/* Divider line before filter selector */}
                  <div className="h-7 w-px bg-slate-200 shrink-0" />

                  {/* Mixed In-Search Filter Dropdown Button */}
                  <div className="relative shrink-0 z-20" ref={filterMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowFilterMenu((prev) => !prev)}
                      className={`h-full px-3.5 py-3 flex items-center gap-1.5 text-xs font-semibold rounded-r-2xl transition-colors cursor-pointer select-none ${
                        selectedPlanFilter !== 'ALL' || selectedTypeFilter !== 'ALL'
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                      title="Filter search by plans and resource formats"
                    >
                      <Filter className="size-3.5 text-orange-600" />
                      <span className="max-w-[120px] truncate hidden md:inline">
                        {selectedPlanFilter !== 'ALL'
                          ? getPlanName(selectedPlanFilter)
                          : selectedTypeFilter !== 'ALL'
                          ? `${selectedTypeFilter}s`
                          : 'All Plans'}
                      </span>
                      <ChevronDown className={`size-3 text-slate-400 transition-transform ${showFilterMenu ? 'rotate-180 text-orange-600' : ''}`} />
                    </button>

                    {/* Filter Popup Menu */}
                    <AnimatePresence>
                      {showFilterMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 space-y-3 z-[60] text-left ring-1 ring-black/5"
                        >
                          {/* Plan Filter Section */}
                          <div>
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Access Plan</span>
                              {selectedPlanFilter !== 'ALL' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPlanFilter('ALL');
                                    setShowFilterMenu(false);
                                  }}
                                  className="text-[10px] text-orange-600 hover:underline font-semibold"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-1 pt-1.5 max-h-44 overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPlanFilter('ALL');
                                  setShowFilterMenu(false);
                                }}
                                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                                  selectedPlanFilter === 'ALL'
                                    ? 'bg-orange-500 text-white font-bold'
                                    : 'text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span>All Access Plans</span>
                                {selectedPlanFilter === 'ALL' && <Check className="size-3.5" />}
                              </button>
                              {PLATFORM_PLANS.map((plan) => (
                                <button
                                  key={plan.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPlanFilter(plan.id);
                                    setShowFilterMenu(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                                    selectedPlanFilter === plan.id
                                      ? 'bg-orange-500 text-white font-bold'
                                      : 'text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <span>{plan.name}</span>
                                  {selectedPlanFilter === plan.id && <Check className="size-3.5" />}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Resource Available Format Section */}
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block pb-1.5">Resource Format</span>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { id: 'ALL', label: 'All' },
                                { id: 'PDF', label: 'PDFs' },
                                { id: 'ARTICLE', label: 'Articles' },
                              ].map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTypeFilter(item.id);
                                    setShowFilterMenu(false);
                                  }}
                                  className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition-colors border ${
                                    selectedTypeFilter === item.id
                                      ? 'bg-orange-500 text-white font-bold border-orange-500 shadow-2xs'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Footer Info */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                            <span>Instant filter applied</span>
                            <button
                              type="button"
                              onClick={() => setShowFilterMenu(false)}
                              className="text-xs font-bold text-orange-600 hover:text-orange-700"
                            >
                              Done
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-4 rounded-2xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Search className="size-4" />
                  <span>Search</span>
                </button>
              </form>

              {/* Instant Live Search Results Overlay Dropdown */}
              <AnimatePresence>
                {showLiveDropdown && !showFilterMenu && (searchQuery.trim().length > 0 || selectedPlanFilter !== 'ALL' || selectedTypeFilter !== 'ALL') && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden text-left z-40"
                  >
                    {/* Header bar */}
                    <div className="px-5 py-3.5 bg-gradient-to-r from-orange-50 to-amber-50/50 border-b border-orange-100/60 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-orange-900 uppercase tracking-wider">
                        <Sparkles className="size-3.5 text-orange-500" />
                        <span>
                          {selectedPlanFilter !== 'ALL' || selectedTypeFilter !== 'ALL'
                            ? `Filtered Resources (${selectedPlanFilter !== 'ALL' ? getPlanName(selectedPlanFilter) : 'All Plans'}${selectedTypeFilter !== 'ALL' ? ` • ${selectedTypeFilter}` : ''})`
                            : 'Live Search Results'}
                        </span>
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
                            onClick={() => handleResourceClick(item)}
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
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                                    isArticleResource(item) 
                                      ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {getDisplayType(item)}
                                  </span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getPlanBadgeClass(item.requiredPlan)}`}>
                                    {getPlanName(item.requiredPlan)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-1 mb-1">
                                  {getCleanDescription(item)}
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
                            {searchQuery.trim()
                              ? `No materials matched "${searchQuery}". Try another keyword or author.`
                              : 'No materials found matching the selected plan/format filters.'}
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
                          <span>
                            {searchQuery.trim()
                              ? `See all results for "${searchQuery}"`
                              : 'See all matching resources in library'}
                          </span>
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
                      <div className="flex items-center justify-between mt-4">
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
                    onClick={() => navigate(buildResourceUrl(getUrlSafeName(), getUrlSafeEmail(), resource.category, resource.title, resource.id))}
                  >
                    <div className="flex flex-col h-full justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2 text-lg leading-snug">{resource.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3 leading-relaxed">{getCleanDescription(resource)}</p>
                        <p className="text-sm text-gray-500 mb-4">Author of Resource: {resource.author || resource.subject}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 mt-auto">
                        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                          <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded-md shrink-0">{resource.category}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ${
                            isArticleResource(resource)
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {getDisplayType(resource)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 inline-flex items-center ${getPlanBadgeClass(resource.requiredPlan)}`}>
                            {getPlanName(resource.requiredPlan)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm text-orange-600 font-bold">Viewed</span>
                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(e, resource.id)}
                            className={`p-1.5 rounded-full transition-colors cursor-pointer ${favoriteIds.includes(resource.id) ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                            title={favoriteIds.includes(resource.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart className={`size-4 ${favoriteIds.includes(resource.id) ? 'fill-current' : ''}`} />
                          </button>
                        </div>
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
                    onClick={() => navigate(buildResourceUrl(getUrlSafeName(), getUrlSafeEmail(), resource.category, resource.title, resource.id))}
                  >
                    <div className="flex flex-col h-full justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2 text-lg leading-snug">{resource.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3 leading-relaxed">{getCleanDescription(resource)}</p>
                        <p className="text-sm text-gray-500 mb-4">Author of Resource: {resource.author || resource.subject}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 mt-auto">
                        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                          <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded-md shrink-0">{resource.category}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ${
                            isArticleResource(resource)
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {getDisplayType(resource)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 inline-flex items-center ${getPlanBadgeClass(resource.requiredPlan)}`}>
                            {getPlanName(resource.requiredPlan)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm text-orange-600 font-bold">View</span>
                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(e, resource.id)}
                            className={`p-1.5 rounded-full transition-colors cursor-pointer ${favoriteIds.includes(resource.id) ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                            title={favoriteIds.includes(resource.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart className={`size-4 ${favoriteIds.includes(resource.id) ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* 3-second rotating book transition modal upon selecting a search item */}
      <AnimatePresence>
        {isBookTransitioning && (
          <TransitionLoader duration={3000} message="Loading resource..." />
        )}
      </AnimatePresence>
    </UserLayout>
  );
}
