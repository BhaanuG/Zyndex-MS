import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router';
import { Search, SlidersHorizontal, BookOpen, Heart } from 'lucide-react';
import UserLayout from '@/app/components/UserLayout';
import resourceService from '@/services/api/resourceService';
import { useAuth } from '@/app/context/AuthContext';
import userService from '@/services/api/userService';

export default function SearchResults() {
  const navigate = useNavigate();
  const { getUrlSafeName, getUrlSafeEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const query = searchParams.get('query') || searchParams.get('q') || '';
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSort, setSelectedSort] = useState('recent');
  const [favoriteIds, setFavoriteIds] = useState([]);

  useEffect(() => {
    async function loadResults() {
      setLoading(true);
      try {
        const resourceRequest = category
          ? resourceService.getResourcesByCategory(category, { type: selectedType === 'all' ? '' : selectedType, sort: selectedSort, size: 100 })
          : resourceService.searchResources({ query, type: selectedType === 'all' ? '' : selectedType, sort: selectedSort, size: 100 });
        const [resourceResult, favoriteResult] = await Promise.allSettled([
          resourceRequest,
          userService.getFavorites({ size: 100 }),
        ]);

        if (resourceResult.status === 'rejected') {
          throw resourceResult.reason;
        }

        const response = resourceResult.value;
        setResults(Array.isArray(response) ? response : response.resources || []);

        if (favoriteResult.status === 'fulfilled') {
          setFavoriteIds((favoriteResult.value.resources || []).map((resource) => resource.id));
        } else {
          console.error('Failed to load favourites:', favoriteResult.reason);
          setFavoriteIds([]);
        }
      } catch (error) {
        console.error('Failed to load search results:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [category, query, selectedType, selectedSort]);

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

  const title = category
    ? `${category.charAt(0).toUpperCase() + category.slice(1)} Resources`
    : query
      ? `Search results for "${query}"`
      : 'Search Resources';

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

  return (
    <UserLayout>
      <div className="py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h1>
            <button onClick={() => setFilterOpen(!filterOpen)} className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <SlidersHorizontal className="size-5" />
              <span className="font-medium">Filters</span>
            </button>
          </motion.div>

          {filterOpen && (
            <motion.div className="bg-white rounded-xl shadow-md p-6 mb-8" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
                  <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="all">All Types</option>
                    <option value="pdf">PDF</option>
                    <option value="article">Article</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select value={selectedSort} onChange={(e) => setSelectedSort(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="recent">Most Recent</option>
                    <option value="popular">Most Popular</option>
                    <option value="title">Title A-Z</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow-md p-16 text-center text-gray-500">Loading resources...</div>
          ) : results.length === 0 ? (
            <motion.div className="bg-white rounded-xl shadow-md p-16 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Search className="size-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No results found</p>
              <p className="text-sm">Try changing your search or filters.</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {results.map((resource, index) => (
                <motion.div
                  key={resource.id}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  onClick={() => navigate(`/Zyndex/User/${getUrlSafeName()}/${getUrlSafeEmail()}/Resource/${resource.id}`)}
                >
                  <div className="flex justify-end mb-2">
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, resource.id)}
                      className={`p-2 rounded-full transition-colors ${favoriteIds.includes(resource.id) ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500'}`}
                    >
                      <Heart className={`size-4 ${favoriteIds.includes(resource.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{resource.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">{getCleanDescription(resource)}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                      <span className="font-medium text-gray-700">{resource.category}</span>
                      <span>Author: {resource.subject || resource.author}</span>
                      <span className={`uppercase text-xs font-bold px-2 py-0.5 rounded-md ${
                        isArticleResource(resource) 
                          ? 'bg-amber-100/80 text-amber-900 border border-amber-200' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {getDisplayType(resource)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        !resource.requiredPlan || resource.requiredPlan === 'FREE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-orange-50 text-orange-700 border border-orange-200'
                      }`}>
                        {!resource.requiredPlan || resource.requiredPlan === 'FREE' ? 'Free' : (resource.requiredPlan).replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-orange-600 font-medium text-sm">View</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
