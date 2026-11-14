import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Tag, Star, Send, User, Heart, Lock, ShieldCheck, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useParams, useNavigate } from 'react-router';
import DOMPurify from 'dompurify';
import UserLayout from '@/app/components/UserLayout';
import { useAuth } from '@/app/context/AuthContext';
import resourceService from '@/services/api/resourceService';
import feedbackService from '@/services/api/feedbackService';
import userService from '@/services/api/userService';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PLAN_TIERS = {
  FREE: 0,
  STUDENT_BASIC: 1,
  STUDENT_PLUS: 2,
  RESEARCHER_PRO: 3,
  UNIVERSITY: 4,
  ENTERPRISE: 5,
};

const PLAN_NAMES = {
  FREE: 'Free / Demo',
  STUDENT_BASIC: 'Student Basic',
  STUDENT_PLUS: 'Student Plus',
  RESEARCHER_PRO: 'PhD Scholar / Researcher',
  UNIVERSITY: 'Academic Faculty & Educator',
  ENTERPRISE: 'Distinguished Fellow & Scholar',
};

export default function ResourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [resource, setResource] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [previewToken, setPreviewToken] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.15);
  const pdfCanvasRef = useRef(null);
  const hasTrackedView = useRef(false);
  const getProtocol = () => (typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:');
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `${getProtocol()}//${window.location.hostname}:8080/api` : 'http://localhost:8080/api');

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const isSubExpired = user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) < new Date() : false;
  const userPlan = isSubExpired ? 'FREE' : (user?.subscriptionPlan || 'FREE');
  const userPlanName = PLAN_NAMES[userPlan] || String(userPlan).replace(/_/g, ' ');
  const userTimeLeft = isAdmin
    ? 'Lifetime'
    : userPlan === 'FREE'
      ? 'Lifetime'
      : !user?.subscriptionExpiresAt || isSubExpired
        ? 'No active subscription'
        : `${Math.ceil((new Date(user.subscriptionExpiresAt) - new Date()) / (1000 * 60 * 60 * 24))} day${Math.ceil((new Date(user.subscriptionExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)) === 1 ? '' : 's'} left`;
  const userTier = isAdmin ? 99 : (PLAN_TIERS[userPlan] ?? 0);
  const requiredPlan = resource?.requiredPlan || 'FREE';
  const requiredTier = PLAN_TIERS[requiredPlan] ?? 0;
  const hasPlanAccess = isAdmin || (userTier >= requiredTier);

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    async function loadResource() {
      try {
        const response = await resourceService.getResourceById(id);
        setResource(response);

        const [favoriteResult, tokenResult] = await Promise.allSettled([
          userService.getFavorites({ size: 100 }),
          resourceService.getPreviewToken(id),
        ]);

        if (favoriteResult.status === 'fulfilled') {
          setIsFavorite((favoriteResult.value.resources || []).some((item) => item.id === Number(id)));
        } else {
          console.error('Failed to load favourites:', favoriteResult.reason);
        }

        if (tokenResult.status === 'fulfilled') {
          setPreviewToken(tokenResult.value.token || '');
        } else {
          console.error('Failed to load preview token:', tokenResult.reason);
        }

        // Track resource view only once per resource visit
        if (!hasTrackedView.current) {
          hasTrackedView.current = true;
          resourceService.trackResourceAccess(id).catch((error) => {
            console.error('Failed to track resource access:', error);
          });
        }
      } catch (error) {
        console.error('Failed to load resource:', error);
        setResource(null);
      }
    }

    loadResource();
  }, [id]);

  useEffect(() => {
    let accumulatedSeconds = 0;
    let lastActiveTimestamp = Date.now();
    let isTabVisible = !document.hidden;

    // Track active reading time only when tab is visible and user is not idle
    const handleVisibility = () => {
      const now = Date.now();
      if (document.hidden) {
        if (isTabVisible) {
          accumulatedSeconds += Math.round((now - lastActiveTimestamp) / 1000);
        }
        isTabVisible = false;
      } else {
        lastActiveTimestamp = now;
        isTabVisible = true;
      }
    };

    const handleUserActivity = () => {
      if (isTabVisible) {
        lastActiveTimestamp = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });

    const sendDuration = (forceDuration = null) => {
      const now = Date.now();
      if (isTabVisible) {
        accumulatedSeconds += Math.round((now - lastActiveTimestamp) / 1000);
        lastActiveTimestamp = now;
      }
      // Cap individual reading duration to 120 minutes (7200 seconds)
      const totalSeconds = Math.min(Math.max(0, accumulatedSeconds), 7200);
      const totalMinutes = forceDuration !== null
        ? forceDuration
        : (totalSeconds >= 15 ? Math.max(1, Math.round(totalSeconds / 60)) : 0);

      if (totalMinutes > 0) {
        resourceService.trackReadingDuration(id, totalMinutes).catch(() => {});
      }
    };

    // Periodic live heartbeat every 30 seconds while user is actively reading
    const heartbeatInterval = setInterval(() => {
      if (isTabVisible) {
        sendDuration();
      }
    }, 30000);

    const onExit = () => {
      sendDuration();
    };

    window.addEventListener('pagehide', onExit);
    window.addEventListener('beforeunload', onExit);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('pagehide', onExit);
      window.removeEventListener('beforeunload', onExit);
      sendDuration();
    };
  }, [id]);

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();

    try {
      await feedbackService.rateResource(id, rating, feedback, isAnonymous);

      setMessage('Feedback submitted successfully.');
      setRating(0);
      setFeedback('');
    } catch (error) {
      setMessage(error.message || 'Failed to submit feedback.');
    }
  };

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await userService.removeFromFavorites(id);
        setIsFavorite(false);
      } else {
        await userService.addToFavorites(id);
        setIsFavorite(true);
      }
    } catch (error) {
      setMessage(error.message || 'Failed to update favourites.');
    }
  };

  const previewUrl = resource?.fileUrl
    ? `${apiBaseUrl}/resources/${id}/file${previewToken ? `?token=${encodeURIComponent(previewToken)}` : ''}`
    : '';
  const previewUrlWithVersion = previewUrl
    ? `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(resource?.updatedAt || resource?.createdAt || '')}`
    : '';
  const isPdfPreview = /\.pdf($|\?)/i.test(resource?.fileUrl || '') || /\.pdf($|\?)/i.test(resource?.fileName || '');
  const isArticle = ['paper', 'article'].includes(String(resource?.type || '').toLowerCase()) || ['paper', 'article'].includes(String(resource?.resourceType || '').toLowerCase());

  useEffect(() => {
    if (!previewUrlWithVersion || !isPdfPreview) return undefined;

    let objectUrl = '';
    const controller = new AbortController();
    setPreviewBlobUrl('');
    setPreviewError('');

    fetch(previewUrlWithVersion, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.text();
          throw new Error(body || `Preview request failed with HTTP ${response.status}.`);
        }
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl(objectUrl);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setPreviewError(error.message || 'Unable to load the PDF preview.');
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewUrlWithVersion, isPdfPreview]);

  useEffect(() => {
    if (!previewBlobUrl) return undefined;

    let loadingTask;
    let cancelled = false;
    setPdfDocument(null);
    setPdfPage(1);
    setPdfPageCount(0);

    loadingTask = pdfjsLib.getDocument({ url: previewBlobUrl });
    loadingTask.promise
      .then((document) => {
        if (cancelled) {
          document.destroy();
          return;
        }
        setPdfDocument(document);
        setPdfPageCount(document.numPages);
      })
      .catch((error) => {
        if (!cancelled) setPreviewError(error.message || 'Unable to decode the PDF preview.');
      });

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [previewBlobUrl]);

  useEffect(() => {
    if (!pdfDocument || !pdfCanvasRef.current) return undefined;

    let cancelled = false;
    pdfDocument.getPage(pdfPage).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: pdfScale });
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d', { alpha: false });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      page.render({ canvasContext: context, viewport }).promise.catch((error) => {
        if (!cancelled) setPreviewError(error.message || 'Unable to render the PDF page.');
      });
    }).catch((error) => {
      if (!cancelled) setPreviewError(error.message || 'Unable to open the PDF page.');
    });

    return () => {
      cancelled = true;
    };
  }, [pdfDocument, pdfPage, pdfScale]);

  return (
    <UserLayout>
      <div className="py-4 sm:py-8 px-3 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {!resource ? (
            <motion.div className="bg-white rounded-xl shadow-md p-10 sm:p-16 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <FileText className="size-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Resource not found</p>
              <p className="text-sm">The resource you're looking for doesn't exist.</p>
            </motion.div>
          ) : (
            <>
              <motion.div className="bg-white rounded-xl shadow-md p-4 sm:p-8 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-4 break-words">{resource.title}</h1>
                    
                    {/* Neatly Organized Academic Metadata */}
                    <div className="space-y-2 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 divide-y divide-slate-200/70 text-xs">
                      <div className="flex items-center justify-between pb-2 gap-2">
                        <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                          <Tag className="size-3.5 text-orange-500" /> Category
                        </span>
                        <span className="font-semibold text-slate-800 truncate text-right">
                          {resource.category || 'General'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 gap-2">
                        <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                          <User className="size-3.5 text-blue-500" /> Author
                        </span>
                        <span className="font-semibold text-slate-800 truncate text-right" title={resource.author || resource.subject || 'Zyndex Contributor'}>
                          {resource.author || resource.subject || 'Zyndex Contributor'}
                        </span>
                      </div>
                    </div>

                    {/* Membership & Entitlement Status */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs ${
                        requiredTier === 0
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-orange-50 text-orange-800 border border-orange-200'
                      }`}>
                        <span className={`size-1.5 rounded-full ${requiredTier === 0 ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                        {requiredTier === 0 ? 'Free Access Resource' : `Requires: ${PLAN_NAMES[requiredPlan] || requiredPlan}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                    <button onClick={toggleFavorite} className={`flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm ${isFavorite ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                      <Heart className={`size-4 sm:size-5 ${isFavorite ? 'fill-current' : ''}`} />
                      {isFavorite ? 'Favourite' : 'Add Favourite'}
                    </button>
                  </div>
                </div>

                {isArticle ? (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="article-reader-container bg-white rounded-2xl p-2 sm:p-6">
                      <div 
                        className="article-content text-slate-800 leading-relaxed font-serif text-[16px] sm:text-[17px] space-y-4"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resource.articleContent || resource.description || '') }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="prose max-w-none mt-4">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
                    <p className="text-gray-700">{resource.description}</p>
                    {resource.fileUrl?.includes('example.com') && (
                      <p className="mt-4 text-sm text-amber-700">
                        This is seeded demo metadata from the database. Upload a real PDF or article file from the admin panel to replace it with actual preview content.
                      </p>
                    )}
                    {!resource.hasDownload && (
                      <p className="mt-4 text-sm text-amber-700">
                        This resource currently has description data only. Upload or attach a file from the admin panel to make it previewable.
                      </p>
                    )}
                  </div>
                )}
              </motion.div>

              {!isArticle && <motion.div className="bg-white rounded-xl shadow-md p-8 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <h2 className="text-xl font-semibold text-gray-900">Preview Resource</h2>
                </div>

                {!hasPlanAccess ? (
                  <div className="border border-orange-200 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50 rounded-2xl p-10 text-center space-y-4">
                    <div className="size-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <Lock className="size-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">Resource Locked Under Your Current Plan</h3>
                      <p className="text-sm text-gray-600 max-w-md mx-auto">
                        This resource requires the <span className="font-semibold text-orange-700">{PLAN_NAMES[requiredPlan] || requiredPlan}</span> plan or higher.
                        {userPlan && (
                          <span className="block mt-1 text-xs text-gray-500">
                            Your current plan: <strong>{PLAN_NAMES[userPlan] || userPlan}</strong> {isSubExpired && '(Expired)'}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="pt-2 flex justify-center gap-3">
                      <button
                        onClick={() => {
                          if (user) {
                            const safeName = user?.name ? encodeURIComponent(user.name.replace(/\s+/g, '-')) : 'user';
                            const safeEmail = user?.email ? encodeURIComponent(user.email) : 'email';
                            navigate(`/Zyndex/User/${safeName}/${safeEmail}/Profile/Billing/Pricing`);
                          } else {
                            navigate('/Zyndex/About/Pricing');
                          }
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl text-sm hover:from-orange-700 hover:to-red-700 shadow-md transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="size-4" />
                        Upgrade Plan to Unlock
                      </button>
                    </div>
                  </div>
                ) : previewUrl && isPdfPreview && previewBlobUrl && pdfDocument ? (
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-neutral-800" onContextMenu={(event) => event.preventDefault()}>
                    <div className="flex items-center justify-between gap-3 bg-neutral-900 px-4 py-2 text-white select-none">
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={pdfPage <= 1} onClick={() => setPdfPage((page) => Math.max(1, page - 1))} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40" aria-label="Previous page" title="Previous page"><ChevronLeft className="size-5" /></button>
                        <span className="min-w-20 text-center text-sm">{pdfPage} / {pdfPageCount}</span>
                        <button type="button" disabled={pdfPage >= pdfPageCount} onClick={() => setPdfPage((page) => Math.min(pdfPageCount, page + 1))} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40" aria-label="Next page" title="Next page"><ChevronRight className="size-5" /></button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={pdfScale <= 0.8} onClick={() => setPdfScale((scale) => Math.max(0.8, Number((scale - 0.15).toFixed(2))))} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40" aria-label="Zoom out" title="Zoom out"><Minus className="size-4" /></button>
                        <span className="w-12 text-center text-xs">{Math.round(pdfScale * 100)}%</span>
                        <button type="button" disabled={pdfScale >= 2} onClick={() => setPdfScale((scale) => Math.min(2, Number((scale + 0.15).toFixed(2))))} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40" aria-label="Zoom in" title="Zoom in"><Plus className="size-4" /></button>
                      </div>
                    </div>
                    <div className="relative max-h-[720px] overflow-auto bg-neutral-700 p-4">
                      <div className="relative mx-auto w-fit bg-white shadow-xl" onContextMenu={(event) => event.preventDefault()}>
                        <canvas ref={pdfCanvasRef} className="block max-w-none select-none" />
                        <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-5 gap-8 overflow-hidden p-8">
                          {Array.from({ length: 10 }).map((_, index) => (
                            <div key={index} className="flex items-center justify-center -rotate-25 text-xs font-semibold text-gray-900/[0.22] whitespace-nowrap select-none">
                              {user?.name || user?.username || 'Zyndex User'} • {user?.email || 'user@example.com'} • Zyndex Digital Library
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : previewError ? (
                  <div className="border border-red-200 rounded-xl p-6 bg-red-50">
                    <p className="text-red-800 font-medium">PDF preview could not be loaded.</p>
                    <p className="text-red-700 text-sm mt-1">{previewError}</p>
                    <button type="button" onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
                      Retry preview
                    </button>
                  </div>
                ) : previewUrl && isPdfPreview ? (
                  <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 flex items-center justify-center gap-3">
                    <div className="size-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-700 text-sm font-medium">Loading secure PDF preview...</p>
                  </div>
                ) : previewUrl ? (
                  <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                    <p className="text-gray-700 mb-3">
                      Preview is available for this resource.
                    </p>
                  </div>
                ) : (
                  <div className="border border-amber-200 rounded-xl p-6 bg-amber-50">
                    <p className="text-amber-800">
                      No preview file is attached yet. Upload a PDF or article file from the admin panel to preview it here.
                    </p>
                  </div>
                )}
              </motion.div>}

              <motion.div className="bg-white rounded-xl shadow-md p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Leave Feedback</h2>
                <form onSubmit={handleSubmitFeedback} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Rate this resource</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoveredRating(star)} onMouseLeave={() => setHoveredRating(0)} className="focus:outline-none">
                          <Star className={`size-8 transition-colors ${star <= (hoveredRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your feedback</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Share your thoughts about this resource..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>

                  {/* Anonymous Feedback Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        Submit as Anonymous Feedback
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {isAnonymous 
                          ? 'Your name and email address will be hidden from the admin portal.' 
                          : 'Your name and email address will be visible to administrators.'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  {message && <p className="text-sm text-orange-600">{message}</p>}

                  <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors">
                    <Send className="size-4" />
                    Submit Feedback
                  </button>
                </form>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
