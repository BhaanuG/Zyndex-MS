import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { FileText, Tag, Star, Send, User, Heart, Lock, ShieldCheck, ChevronLeft, ChevronRight, Minus, Plus, Maximize2, Minimize2, PanelLeft, LayoutGrid, ListTree, X, ChevronDown, BookOpen, RotateCw, RotateCcw, BookOpenCheck, Square } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as pdfWorkerModule from 'pdfjs-dist/build/pdf.worker.min.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useParams, useNavigate } from 'react-router';
import DOMPurify from 'dompurify';
import UserLayout from '@/app/components/UserLayout';
import { useAuth } from '@/app/context/AuthContext';
import resourceService from '@/services/api/resourceService';
import feedbackService from '@/services/api/feedbackService';
import userService from '@/services/api/userService';

// Ensure the worker message handler is registered on globalThis so fake worker fallback always succeeds synchronously
if (typeof globalThis !== 'undefined' && pdfWorkerModule?.WorkerMessageHandler) {
  globalThis.pdfjsWorker = { WorkerMessageHandler: pdfWorkerModule.WorkerMessageHandler };
}
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
  const [loadingResource, setLoadingResource] = useState(true);
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
  const [pdfRotation, setPdfRotation] = useState(0);
  const [pdfPageViewMode, setPdfPageViewMode] = useState('single'); // 'single' | 'two-page'
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const [showPdfSidebar, setShowPdfSidebar] = useState(false);
  const [pdfSidebarTab, setPdfSidebarTab] = useState('thumbnails'); // 'thumbnails' | 'outline'
  const [pdfOutline, setPdfOutline] = useState([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const pdfCanvasRef = useRef(null);
  const pdfSecondCanvasRef = useRef(null);
  const pdfViewerAreaRef = useRef(null);
  const pdfContainerRef = useRef(null);
  const thumbnailsContainerRef = useRef(null);
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
    const handleFullscreenChange = () => {
      setIsPdfFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePdfFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (pdfContainerRef.current?.requestFullscreen) {
          await pdfContainerRef.current.requestFullscreen();
        } else if (pdfContainerRef.current?.webkitRequestFullscreen) {
          await pdfContainerRef.current.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    async function loadResource() {
      setLoadingResource(true);
      try {
        // Fetch resource metadata first so page details render instantly without waiting for favorites or preview tokens
        const resData = await resourceService.getResourceById(id);
        if (isCancelled) return;
        if (resData) {
          setResource(resData);
          setLoadingResource(false);
        } else {
          setResource(null);
          setLoadingResource(false);
        }

        // Secondary background fetches for preview token and favorite status
        Promise.allSettled([
          userService.getFavorites({ size: 100 }),
          resourceService.getPreviewToken(id),
        ]).then(([favResult, tokResult]) => {
          if (isCancelled) return;
          if (favResult.status === 'fulfilled') {
            setIsFavorite((favResult.value.resources || []).some((item) => item.id === Number(id)));
          }
          if (tokResult.status === 'fulfilled') {
            setPreviewToken(tokResult.value.token || '');
          }
        });

        // Track resource view only once per resource visit
        if (!hasTrackedView.current) {
          hasTrackedView.current = true;
          resourceService.trackResourceAccess(id).catch((error) => {
            console.error('Failed to track resource access:', error);
          });
        }
      } catch (error) {
        console.error('Failed to load resource:', error);
        if (!isCancelled) {
          setResource(null);
          setLoadingResource(false);
        }
      }
    }

    loadResource();
    return () => {
      isCancelled = true;
    };
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

  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (!previewUrlWithVersion || !isPdfPreview) return undefined;

    let loadingTask;
    let cancelled = false;
    let fallbackBlobUrl = '';
    setPdfDocument(null);
    setPdfPage(1);
    setPdfPageCount(0);
    setPreviewError('');
    setDownloadProgress(0);

    const token = localStorage.getItem('auth_token') || '';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    loadingTask = pdfjsLib.getDocument({
      url: previewUrlWithVersion,
      httpHeaders: headers,
      withCredentials: false,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
      rangeChunkSize: 65536,
      disableAutoFetch: true,
      disableStream: false,
    });

    loadingTask.onProgress = ({ loaded, total }) => {
      if (total > 0) {
        setDownloadProgress(Math.min(99, Math.round((loaded / total) * 100)));
      }
    };

    loadingTask.promise
      .then((document) => {
        if (cancelled) {
          document.destroy();
          return;
        }
        setPdfDocument(document);
        setPdfPageCount(document.numPages);
        setDownloadProgress(100);
      })
      .catch((error) => {
        if (cancelled) return;
        // Fallback: fetch as blob and decode if direct range streaming encounters worker restrictions
        fetch(previewUrlWithVersion, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then(async (res) => {
            if (!res.ok) {
              const body = await res.text();
              throw new Error(body || `Preview request failed with HTTP ${res.status}.`);
            }
            return res.blob();
          })
          .then((blob) => {
            fallbackBlobUrl = URL.createObjectURL(blob);
            const fallbackTask = pdfjsLib.getDocument({ url: fallbackBlobUrl });
            return fallbackTask.promise.then((doc) => {
              if (cancelled) {
                doc.destroy();
                return;
              }
              setPdfDocument(doc);
              setPdfPageCount(doc.numPages);
              setDownloadProgress(100);
            });
          })
          .catch((err) => {
            if (!cancelled) setPreviewError(err.message || 'Unable to decode the PDF preview.');
          });
      });

    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy();
      } catch (e) {}
      if (fallbackBlobUrl) URL.revokeObjectURL(fallbackBlobUrl);
    };
  }, [previewUrlWithVersion, isPdfPreview]);

  // Load outline / bookmarks when document is available
  useEffect(() => {
    if (!pdfDocument) {
      setPdfOutline([]);
      setThumbnailUrls({});
      return;
    }

    let isMounted = true;
    setOutlineLoading(true);

    async function parseOutline() {
      try {
        const rawOutline = await pdfDocument.getOutline();
        if (!isMounted) return;

        if (!rawOutline || rawOutline.length === 0) {
          setPdfOutline([]);
          setOutlineLoading(false);
          return;
        }

        // Helper to resolve destination to a 1-based page number
        async function resolveDestToPage(dest) {
          try {
            if (!dest) return null;
            let explicitDest = dest;
            if (typeof dest === 'string') {
              explicitDest = await pdfDocument.getDestination(dest);
            }
            if (Array.isArray(explicitDest) && explicitDest.length > 0) {
              const pageRef = explicitDest[0];
              if (pageRef && typeof pageRef === 'object' && ('num' in pageRef || 'gen' in pageRef)) {
                const pageIndex = await pdfDocument.getPageIndex(pageRef);
                return pageIndex + 1;
              } else if (typeof pageRef === 'number') {
                return pageRef + 1;
              }
            }
            return null;
          } catch (e) {
            return null;
          }
        }

        async function processItems(items) {
          const result = [];
          for (const item of items) {
            let pageNum = await resolveDestToPage(item.dest);
            let subItems = [];
            if (item.items && item.items.length > 0) {
              subItems = await processItems(item.items);
            }
            result.push({
              title: item.title,
              dest: item.dest,
              pageNumber: pageNum,
              items: subItems,
            });
          }
          return result;
        }

        const structuredOutline = await processItems(rawOutline);
        if (isMounted) {
          setPdfOutline(structuredOutline);
          setOutlineLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setPdfOutline([]);
          setOutlineLoading(false);
        }
      }
    }

    parseOutline();

    return () => {
      isMounted = false;
    };
  }, [pdfDocument]);

  // Lazy render thumbnail for a specific page when requested
  const renderThumbnail = async (pageNumber) => {
    if (!pdfDocument || thumbnailUrls[pageNumber]) return;
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const thumbViewport = page.getViewport({ scale: 0.25 });
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = Math.floor(thumbViewport.width);
      thumbCanvas.height = Math.floor(thumbViewport.height);
      const thumbCtx = thumbCanvas.getContext('2d', { alpha: false });
      
      await page.render({ canvasContext: thumbCtx, viewport: thumbViewport }).promise;
      const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);
      setThumbnailUrls((prev) => ({ ...prev, [pageNumber]: dataUrl }));
    } catch (e) {
      // Ignore individual thumbnail rendering errors
    }
  };

  // Keep active thumbnail scrolled into view when sidebar is open
  useEffect(() => {
    if (showPdfSidebar && pdfSidebarTab === 'thumbnails' && thumbnailsContainerRef.current) {
      const activeEl = thumbnailsContainerRef.current.querySelector(`[data-thumb-page="${pdfPage}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [pdfPage, showPdfSidebar, pdfSidebarTab]);

  // Automatically adjust scale in Fullscreen mode so the page fits top-to-bottom
  useEffect(() => {
    if (!isPdfFullscreen || !pdfDocument) return;

    let cancelled = false;

    pdfDocument.getPage(pdfPage).then((page) => {
      if (cancelled) return;
      const baseViewport = page.getViewport({ scale: 1, rotation: pdfRotation });
      const availableHeight = window.innerHeight - 75; // Account for 50px top toolbar and margins
      if (availableHeight > 200 && baseViewport.height > 0) {
        let fitScale = availableHeight / baseViewport.height;
        // In two-page view, check if two pages fit horizontally
        if (pdfPageViewMode === 'two-page') {
          const sidebarWidth = showPdfSidebar ? 320 : 0;
          const availableWidth = window.innerWidth - sidebarWidth - 60;
          const totalWidthNeeded = baseViewport.width * 2;
          if (totalWidthNeeded * fitScale > availableWidth) {
            fitScale = availableWidth / totalWidthNeeded;
          }
        }
        setPdfScale(Math.max(0.4, Number(fitScale.toFixed(2))));
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isPdfFullscreen, pdfRotation, pdfPageViewMode, showPdfSidebar, pdfPage, pdfDocument]);

  useEffect(() => {
    if (!pdfDocument || !pdfCanvasRef.current) return undefined;

    let cancelled = false;

    // Render Page 1 (Primary Page)
    pdfDocument.getPage(pdfPage).then((page) => {
      if (cancelled) return;
      // High-DPI (Retina / 4K / Mobile) rendering: scale canvas internal pixels by window.devicePixelRatio
      const dpr = Math.max(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: pdfScale * dpr, rotation: pdfRotation });
      const canvas = pdfCanvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d', { alpha: false });
      
      // Internal buffer size multiplied by DPR for ultra-sharp vectors & text
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      // Display size stays locked to CSS scale so layout does not stretch
      const cssViewport = page.getViewport({ scale: pdfScale, rotation: pdfRotation });
      canvas.style.width = `${Math.floor(cssViewport.width)}px`;
      canvas.style.height = `${Math.floor(cssViewport.height)}px`;

      page.render({ canvasContext: context, viewport }).promise.catch((error) => {
        if (!cancelled) setPreviewError(error.message || 'Unable to render the PDF page.');
      });
    }).catch((error) => {
      if (!cancelled) setPreviewError(error.message || 'Unable to open the PDF page.');
    });

    // Render Page 2 (Right Page) if in Two-Page Book View
    const secondPageNum = pdfPage + 1;
    if (pdfPageViewMode === 'two-page' && secondPageNum <= pdfPageCount && pdfSecondCanvasRef.current) {
      pdfDocument.getPage(secondPageNum).then((secondPage) => {
        if (cancelled) return;
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        const secondViewport = secondPage.getViewport({ scale: pdfScale * dpr, rotation: pdfRotation });
        const secondCanvas = pdfSecondCanvasRef.current;
        if (!secondCanvas) return;
        const secondContext = secondCanvas.getContext('2d', { alpha: false });

        secondCanvas.width = Math.floor(secondViewport.width);
        secondCanvas.height = Math.floor(secondViewport.height);

        const secondCssViewport = secondPage.getViewport({ scale: pdfScale, rotation: pdfRotation });
        secondCanvas.style.width = `${Math.floor(secondCssViewport.width)}px`;
        secondCanvas.style.height = `${Math.floor(secondCssViewport.height)}px`;

        secondPage.render({ canvasContext: secondContext, viewport: secondViewport }).promise.catch(() => {});
      }).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [pdfDocument, pdfPage, pdfScale, pdfRotation, pdfPageViewMode, pdfPageCount]);

  return (
    <UserLayout>
      <div className="py-4 sm:py-8 px-4 sm:px-[2.5cm]">
        <div className="w-full">
          {loadingResource ? (
            <motion.div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 sm:p-12 animate-pulse space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="h-8 bg-slate-200 rounded-xl w-3/4 mb-4"></div>
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
              <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
              <div className="h-48 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
                  <div className="size-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
                  <span>Loading resource preview & details...</span>
                </div>
              </div>
            </motion.div>
          ) : !resource ? (
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
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                    <button onClick={toggleFavorite} className={`flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm ${isFavorite ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                      <Heart className={`size-4 sm:size-5 ${isFavorite ? 'fill-current' : ''}`} />
                      {isFavorite ? 'Favourite' : 'Add Favourite'}
                    </button>
                  </div>
                </div>

                {/* Neatly Organized Academic Metadata - Full Width Across Border */}
                <div className="space-y-2 mb-5 w-full bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 divide-y divide-slate-200/70 text-xs sm:text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center pb-2.5 gap-2 text-center sm:text-left">
                    <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5 shrink-0">
                      <Tag className="size-3.5 text-orange-500" /> Category
                    </span>
                    <span className="font-semibold text-slate-800 text-center sm:col-span-2 sm:text-center">
                      {resource.category || 'General'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center pt-2.5 gap-2 text-center sm:text-left">
                    <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5 shrink-0">
                      <User className="size-3.5 text-blue-500" /> Author
                    </span>
                    <span className="font-semibold text-slate-800 text-center sm:col-span-2 sm:text-center" title={resource.author || resource.subject || 'Zyndex Contributor'}>
                      {resource.author || resource.subject || 'Zyndex Contributor'}
                    </span>
                  </div>
                </div>

                {/* Membership & Entitlement Status */}
                <div className="flex items-center gap-2 flex-wrap mb-6">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs ${
                    requiredTier === 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-orange-50 text-orange-800 border border-orange-200'
                  }`}>
                    <span className={`size-1.5 rounded-full ${requiredTier === 0 ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                    {requiredTier === 0 ? 'Free Access Resource' : `Requires: ${PLAN_NAMES[requiredPlan] || requiredPlan}`}
                  </span>
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
                ) : previewUrl && isPdfPreview && pdfDocument ? (
                  <div
                    ref={pdfContainerRef}
                    className={`overflow-hidden rounded-xl border border-gray-200 bg-neutral-800 flex flex-col ${
                      isPdfFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-0 w-screen h-screen' : ''
                    }`}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 px-4 py-2.5 text-white select-none">
                      <div className="flex items-center gap-2">
                        {isPdfFullscreen && (
                          <>
                            <button
                              type="button"
                              onClick={() => setShowPdfSidebar((prev) => !prev)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                                showPdfSidebar
                                  ? 'bg-orange-600/20 text-orange-400 border-orange-500/50'
                                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700 hover:text-white'
                              }`}
                              title={showPdfSidebar ? 'Hide Page Navigator & Contents' : 'Show Page Navigator & Contents'}
                              aria-label="Toggle Page Navigator"
                            >
                              <PanelLeft className="size-4" />
                              <span className="hidden sm:inline">Pages</span>
                            </button>
                            <div className="h-5 w-px bg-neutral-700 mx-0.5" />
                          </>
                        )}
                        <button type="button" disabled={pdfPage <= 1} onClick={() => setPdfPage((page) => Math.max(1, page - (pdfPageViewMode === 'two-page' ? 2 : 1)))} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40 cursor-pointer" aria-label="Previous page" title="Previous page"><ChevronLeft className="size-5" /></button>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm bg-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-700">
                          <span>Page</span>
                          <input
                            type="number"
                            min={1}
                            max={pdfPageCount}
                            value={pdfPage}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1 && val <= pdfPageCount) {
                                setPdfPage(val);
                              }
                            }}
                            className="w-12 text-center bg-neutral-950 text-white rounded border border-neutral-600 py-0.5 text-xs font-bold focus:outline-none focus:border-orange-500"
                            title="Enter page number to jump directly"
                          />
                          {pdfPageViewMode === 'two-page' && pdfPage + 1 <= pdfPageCount ? (
                            <span className="text-neutral-400 font-mono">- {pdfPage + 1} of {pdfPageCount}</span>
                          ) : (
                            <span className="text-neutral-400">of {pdfPageCount}</span>
                          )}
                        </div>
                        <button type="button" disabled={pdfPage >= pdfPageCount || (pdfPageViewMode === 'two-page' && pdfPage + 1 >= pdfPageCount)} onClick={() => setPdfPage((page) => Math.min(pdfPageCount, page + (pdfPageViewMode === 'two-page' ? 2 : 1)))} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40 cursor-pointer" aria-label="Next page" title="Next page"><ChevronRight className="size-5" /></button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={pdfScale <= 0.8} onClick={() => setPdfScale((scale) => Math.max(0.8, Number((scale - 0.15).toFixed(2))))} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40 cursor-pointer" aria-label="Zoom out" title="Zoom out"><Minus className="size-4" /></button>
                        <span className="w-12 text-center text-xs font-semibold">{Math.round(pdfScale * 100)}%</span>
                        <button type="button" disabled={pdfScale >= 2.5} onClick={() => setPdfScale((scale) => Math.min(2.5, Number((scale + 0.15).toFixed(2))))} className="rounded p-1.5 hover:bg-white/10 disabled:opacity-40 cursor-pointer" aria-label="Zoom in" title="Zoom in"><Plus className="size-4" /></button>
                        <div className="h-5 w-px bg-neutral-700 mx-1" />
                        {/* Continuous rotation controls in Full Screen */}
                        {isPdfFullscreen && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPdfRotation((r) => (r - 90 + 360) % 360)}
                              className="rounded p-1.5 hover:bg-white/10 text-neutral-300 hover:text-white cursor-pointer transition-colors"
                              aria-label="Rotate Counterclockwise"
                              title={`Rotate Counterclockwise (${(pdfRotation - 90 + 360) % 360}°)`}
                            >
                              <RotateCcw className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPdfRotation((r) => (r + 90) % 360)}
                              className="rounded p-1.5 hover:bg-white/10 text-neutral-300 hover:text-white cursor-pointer transition-colors flex items-center gap-1"
                              aria-label="Rotate Clockwise"
                              title={`Rotate Clockwise (${(pdfRotation + 90) % 360}°)`}
                            >
                              <RotateCw className="size-4" />
                              {pdfRotation !== 0 && (
                                <span className="text-[10px] font-mono text-orange-400 font-bold">{pdfRotation}°</span>
                              )}
                            </button>
                            <div className="h-5 w-px bg-neutral-700 mx-1" />
                          </>
                        )}
                        {/* View Mode (Single vs Two-Page Book) in Full Screen */}
                        {isPdfFullscreen && (
                          <>
                            <div className="flex items-center bg-neutral-800 p-0.5 rounded-lg border border-neutral-700">
                              <button
                                type="button"
                                onClick={() => setPdfPageViewMode('single')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                                  pdfPageViewMode === 'single'
                                    ? 'bg-neutral-700 text-orange-400 shadow-sm'
                                    : 'text-neutral-400 hover:text-white'
                                }`}
                                title="Single Page View (Fit Top-to-Bottom)"
                              >
                                <Square className="size-3.5" />
                                <span className="hidden md:inline">Single</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPdfPageViewMode('two-page')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                                  pdfPageViewMode === 'two-page'
                                    ? 'bg-neutral-700 text-orange-400 shadow-sm'
                                    : 'text-neutral-400 hover:text-white'
                                }`}
                                title="Two-Page Book View (Fit Top-to-Bottom)"
                              >
                                <BookOpenCheck className="size-3.5" />
                                <span className="hidden md:inline">Two-Page</span>
                              </button>
                            </div>
                            <div className="h-5 w-px bg-neutral-700 mx-1" />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={togglePdfFullscreen}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold transition-all border border-neutral-700 cursor-pointer"
                          title={isPdfFullscreen ? 'Exit Full Screen' : 'View Full Screen'}
                        >
                          {isPdfFullscreen ? (
                            <>
                              <Minimize2 className="size-4 text-orange-400" />
                              <span className="hidden sm:inline">Exit Fullscreen</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="size-4 text-orange-400" />
                              <span className="hidden sm:inline">Full Screen</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {/* Body Area with Split Sidebar in Fullscreen */}
                    <div className={`relative flex flex-1 overflow-hidden bg-neutral-700 ${isPdfFullscreen ? 'h-[calc(100vh-50px)]' : 'max-h-[720px]'}`}>
                      {/* Left Navigation Sidebar (Thumbnails & Table of Contents) in Fullscreen */}
                      {isPdfFullscreen && showPdfSidebar && (
                        <div className="flex h-full w-72 sm:w-80 shrink-0 border-r border-neutral-800 bg-[#2b2b2b] text-neutral-200 select-none z-10 shadow-2xl">
                          {/* Navigation Icon Strip */}
                          <div className="w-12 shrink-0 bg-[#202020] border-r border-neutral-700/80 flex flex-col items-center py-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setPdfSidebarTab('thumbnails')}
                              className={`p-2.5 rounded-lg transition-all cursor-pointer ${
                                pdfSidebarTab === 'thumbnails'
                                  ? 'bg-neutral-800 text-orange-400 border border-neutral-600 shadow-sm'
                                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                              }`}
                              title="Page Thumbnails"
                              aria-label="Page Thumbnails"
                            >
                              <LayoutGrid className="size-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPdfSidebarTab('outline')}
                              className={`p-2.5 rounded-lg transition-all cursor-pointer ${
                                pdfSidebarTab === 'outline'
                                  ? 'bg-neutral-800 text-orange-400 border border-neutral-600 shadow-sm'
                                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                              }`}
                              title="Table of Contents"
                              aria-label="Table of Contents"
                            >
                              <ListTree className="size-5" />
                            </button>
                          </div>

                          {/* Content Panel */}
                          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#2d2d2d]">
                            {/* Panel Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700/80 bg-[#262626]">
                              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                                {pdfSidebarTab === 'thumbnails' ? (
                                  <>
                                    <LayoutGrid className="size-4 text-orange-400" />
                                    <span>Thumbnails ({pdfPageCount})</span>
                                  </>
                                ) : (
                                  <>
                                    <ListTree className="size-4 text-orange-400" />
                                    <span>Table of Contents</span>
                                  </>
                                )}
                              </h3>
                              <button
                                type="button"
                                onClick={() => setShowPdfSidebar(false)}
                                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-700 cursor-pointer"
                                title="Close Panel"
                              >
                                <X className="size-4" />
                              </button>
                            </div>

                            {/* Panel Body */}
                            <div className="flex-1 overflow-y-auto p-3" ref={thumbnailsContainerRef}>
                              {pdfSidebarTab === 'thumbnails' ? (
                                <div className="space-y-4">
                                  {Array.from({ length: pdfPageCount }).map((_, idx) => {
                                    const pageNum = idx + 1;
                                    const isCurrent = pageNum === pdfPage;
                                    return (
                                      <div
                                        key={pageNum}
                                        data-thumb-page={pageNum}
                                        onClick={() => setPdfPage(pageNum)}
                                        onMouseEnter={() => renderThumbnail(pageNum)}
                                        ref={(node) => {
                                          if (node && !thumbnailUrls[pageNum]) {
                                            // Trigger initial load for nearby pages
                                            if (Math.abs(pageNum - pdfPage) <= 3) {
                                              renderThumbnail(pageNum);
                                            }
                                          }
                                        }}
                                        className="group cursor-pointer flex flex-col items-center"
                                      >
                                        <div
                                          className={`relative w-36 sm:w-40 aspect-[1/1.414] bg-white rounded-md overflow-hidden shadow transition-all flex items-center justify-center ${
                                            isCurrent
                                              ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#2d2d2d] shadow-lg'
                                              : 'border border-neutral-700 group-hover:border-neutral-500 opacity-90 group-hover:opacity-100'
                                          }`}
                                        >
                                          {thumbnailUrls[pageNum] ? (
                                            <img
                                              src={thumbnailUrls[pageNum]}
                                              alt={`Page ${pageNum}`}
                                              className="w-full h-full object-contain pointer-events-none"
                                              loading="lazy"
                                            />
                                          ) : (
                                            <div className="flex flex-col items-center justify-center text-neutral-400 gap-1 p-2">
                                              <BookOpen className="size-5 text-neutral-500" />
                                              <span className="text-[10px] text-neutral-400 font-mono">Page {pageNum}</span>
                                            </div>
                                          )}
                                        </div>
                                        <span
                                          className={`text-xs mt-1.5 font-medium transition-colors ${
                                            isCurrent ? 'text-blue-400 font-bold' : 'text-neutral-400 group-hover:text-neutral-200'
                                          }`}
                                        >
                                          {pageNum}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div>
                                  {outlineLoading ? (
                                    <div className="flex items-center justify-center py-10 text-neutral-400 text-xs">
                                      <div className="size-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
                                      Loading outline...
                                    </div>
                                  ) : pdfOutline && pdfOutline.length > 0 ? (
                                    <div className="space-y-1 text-xs">
                                      {pdfOutline.map((item, i) => (
                                        <div key={i} className="space-y-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (item.pageNumber && item.pageNumber >= 1 && item.pageNumber <= pdfPageCount) {
                                                setPdfPage(item.pageNumber);
                                              }
                                            }}
                                            className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-start gap-2 hover:bg-neutral-800 transition-colors cursor-pointer group ${
                                              item.pageNumber === pdfPage ? 'bg-orange-500/20 text-orange-300 font-semibold' : 'text-neutral-300'
                                            }`}
                                          >
                                            <ChevronRight className="size-3.5 shrink-0 mt-0.5 text-neutral-500 group-hover:text-neutral-300" />
                                            <span className="flex-1 line-clamp-2 leading-relaxed">{item.title}</span>
                                            {item.pageNumber && (
                                              <span className="text-[10px] text-neutral-500 font-mono shrink-0 ml-1">p.{item.pageNumber}</span>
                                            )}
                                          </button>
                                          {item.items && item.items.length > 0 && (
                                            <div className="pl-4 space-y-1 border-l border-neutral-700/60 ml-3">
                                              {item.items.map((sub, subIdx) => (
                                                <button
                                                  key={subIdx}
                                                  type="button"
                                                  onClick={() => {
                                                    if (sub.pageNumber && sub.pageNumber >= 1 && sub.pageNumber <= pdfPageCount) {
                                                      setPdfPage(sub.pageNumber);
                                                    }
                                                  }}
                                                  className={`w-full text-left px-2 py-1 rounded flex items-center justify-between hover:bg-neutral-800 transition-colors cursor-pointer group text-xs ${
                                                    sub.pageNumber === pdfPage ? 'bg-orange-500/20 text-orange-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
                                                  }`}
                                                >
                                                  <span className="truncate pr-2">{sub.title}</span>
                                                  {sub.pageNumber && (
                                                    <span className="text-[10px] text-neutral-500 font-mono shrink-0">p.{sub.pageNumber}</span>
                                                  )}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="py-12 px-4 text-center text-neutral-400 space-y-2">
                                      <ListTree className="size-8 mx-auto text-neutral-600 opacity-60" />
                                      <p className="text-xs font-medium text-neutral-300">No outline bookmarks embedded</p>
                                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                                        This document does not contain an internal table of contents. Use page thumbnails to browse sections.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Main PDF Canvas Area */}
                      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-neutral-700" ref={pdfViewerAreaRef}>
                        <div className="relative mx-auto w-fit flex flex-col md:flex-row items-center justify-center gap-4 my-auto" onContextMenu={(event) => event.preventDefault()}>
                          {/* Page 1 Canvas */}
                          <div className="relative bg-white shadow-2xl">
                            <canvas ref={pdfCanvasRef} className="block max-w-none select-none" />
                            <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-5 gap-8 overflow-hidden p-8">
                              {Array.from({ length: 10 }).map((_, index) => (
                                <div key={index} className="flex items-center justify-center -rotate-25 text-xs font-semibold text-gray-900/[0.22] whitespace-nowrap select-none">
                                  {user?.name || user?.username || 'Zyndex User'} • {user?.email || 'user@example.com'} • Zyndex Digital Library
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Page 2 Canvas in Two-Page Book View */}
                          {pdfPageViewMode === 'two-page' && pdfPage + 1 <= pdfPageCount && (
                            <div className="relative bg-white shadow-2xl">
                              <canvas ref={pdfSecondCanvasRef} className="block max-w-none select-none" />
                              <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-5 gap-8 overflow-hidden p-8">
                                {Array.from({ length: 10 }).map((_, index) => (
                                  <div key={index} className="flex items-center justify-center -rotate-25 text-xs font-semibold text-gray-900/[0.22] whitespace-nowrap select-none">
                                    {user?.name || user?.username || 'Zyndex User'} • {user?.email || 'user@example.com'} • Zyndex Digital Library
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
                  <div className="border border-gray-200 rounded-xl p-8 bg-gray-50 flex flex-col items-center justify-center gap-2">
                    <div className="size-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-800 text-sm font-semibold">
                      {downloadProgress > 0 ? `Streaming PDF Document (${downloadProgress}%)...` : 'Loading secure PDF preview...'}
                    </p>
                    <p className="text-xs text-gray-500">Preparing high-definition pages for viewing</p>
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
