import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { FileText, Tag, Star, Send, User, Heart, Lock, ShieldCheck, ChevronLeft, ChevronRight, Minus, Plus, Maximize2, Minimize2, PanelLeft, LayoutGrid, ListTree, X, ChevronDown, BookOpen, RotateCw, RotateCcw, BookOpenCheck, Square, MoveHorizontal, MoveVertical } from 'lucide-react';
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
  const { id: rawId } = useParams();
  const id = rawId ? rawId.replace(/\.php$/i, '') : '';
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
  const pdfScaleRef = useRef(1.15);
  const userHasCustomScaleRef = useRef(false);
  const touchStateRef = useRef({
    startX: 0,
    startY: 0,
    initialDistance: 0,
    initialScale: 1.15,
    isPinching: false,
    hasMoved: false,
    centerX: 0,
    centerY: 0,
  });

  const updatePdfScale = (newScale, focalX = null, focalY = null) => {
    const clampedScale = Math.min(2.5, Math.max(0.35, Number(newScale.toFixed(2))));
    const oldScale = pdfScaleRef.current;
    if (Math.abs(clampedScale - oldScale) < 0.005) return;

    const container = pdfViewerAreaRef.current;
    if (container && focalX !== null && focalY !== null) {
      const rect = container.getBoundingClientRect();
      const pointerX = focalX - rect.left;
      const pointerY = focalY - rect.top;

      const scrollX = container.scrollLeft;
      const scrollY = container.scrollTop;

      const scaleRatio = clampedScale / oldScale;
      const targetScrollLeft = (scrollX + pointerX) * scaleRatio - pointerX;
      const targetScrollTop = (scrollY + pointerY) * scaleRatio - pointerY;

      pdfScaleRef.current = clampedScale;
      userHasCustomScaleRef.current = true;
      setPdfScale(clampedScale);

      requestAnimationFrame(() => {
        if (container) {
          container.scrollLeft = targetScrollLeft;
          container.scrollTop = targetScrollTop;
        }
      });
    } else {
      pdfScaleRef.current = clampedScale;
      userHasCustomScaleRef.current = true;
      setPdfScale(clampedScale);
    }
  };
  const [pdfRotation, setPdfRotation] = useState(0);
  const [pdfPageViewMode, setPdfPageViewMode] = useState('single'); // 'single' | 'two-page'
  const [pdfFitMode, setPdfFitMode] = useState('page'); // 'page' (fit-to-page / top-to-bottom) | 'width' (fit-to-width)
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const [isPageRendering, setIsPageRendering] = useState(false);
  const [showPdfSidebar, setShowPdfSidebar] = useState(false);
  const [pdfSidebarTab, setPdfSidebarTab] = useState('thumbnails'); // 'thumbnails' | 'outline'
  const [pdfOutline, setPdfOutline] = useState([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [expandedOutlineNodes, setExpandedOutlineNodes] = useState({});
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const pdfCanvasRef = useRef(null);
  const pdfSecondCanvasRef = useRef(null);
  const primaryRenderTaskRef = useRef(null);
  const secondaryRenderTaskRef = useRef(null);
  const pdfViewerAreaRef = useRef(null);
  const pdfContainerRef = useRef(null);
  const thumbnailsContainerRef = useRef(null);
  const hasTrackedView = useRef(false);
  const feedbackTimerRef = useRef(null);
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

  // 7-Page preview cap rule for higher-tier resources:
  const isPreviewCapped = !hasPlanAccess;
  const PREVIEW_CAP = 7;
  // Total actual pages of the full resource (from resource metadata, fallback to pdfDocument numPages)
  const totalActualPages = resource?.pageCount || (pdfDocument ? pdfDocument.numPages : 0);
  // Display total pages in toolbar: if capped, show full totalActualPages (e.g. 1 / 45) so scholars know total length
  const displayTotalPages = totalActualPages > 0 ? totalActualPages : (pdfDocument ? pdfDocument.numPages : 0);
  // Navigable maximum page in the reader:
  // If capped, allow navigating up to PREVIEW_CAP + 1 (the 8th page shows the upgrade paywall unlock modal)
  const maxNavigablePage = isPreviewCapped
    ? (displayTotalPages > 0 ? Math.min(displayTotalPages, PREVIEW_CAP + 1) : PREVIEW_CAP + 1)
    : (pdfDocument ? pdfDocument.numPages : 1);
  const isCurrentlyOnLockedPage = isPreviewCapped && pdfPage > PREVIEW_CAP;

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = Boolean(document.fullscreenElement);
      setIsPdfFullscreen(isFullscreenNow);
      // In the main page preview (non-fullscreen), always enforce single page view
      if (!isFullscreenNow) {
        setPdfPageViewMode('single');
      }
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
    const handleKeyDown = (e) => {
      handleUserActivity();
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
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
        resourceService.trackReadingDuration(id, totalMinutes).catch(() => { });
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
      window.removeEventListener('keydown', handleKeyDown);
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
      const submittedRating = rating > 0 ? rating : 5.0;
      await feedbackService.rateResource(id, submittedRating, feedback, isAnonymous);

      setMessage('Feedback submitted successfully.');
      setRating(0);
      setHoveredRating(0);
      setFeedback('');

      // Auto dismiss message after 10 seconds
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setMessage('');
      }, 10000);

      // Refresh resource details to show updated average rating
      try {
        const refreshed = await resourceService.getResourceById(id);
        if (refreshed) setResource(refreshed);
      } catch (ignored) { }
    } catch (error) {
      setMessage(error.message || 'Failed to submit feedback.');
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setMessage('');
      }, 10000);
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

    const wasmUrl = window.location.origin + '/pdfjs-wasm/';
    const cMapUrl = window.location.origin + '/pdfjs-cmaps/';
    const standardFontDataUrl = window.location.origin + '/pdfjs-fonts/';

    loadingTask = pdfjsLib.getDocument({
      url: previewUrlWithVersion,
      httpHeaders: headers,
      withCredentials: false,
      wasmUrl,
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
      isOffscreenCanvasSupported: false,
      rangeChunkSize: 524288, // 512 KB chunks for fast progressive range streaming
      disableAutoFetch: false, // Allow progressive background fetching of subsequent pages
      disableStream: false,
      disableRange: false, // Enable byte range requests so initial pages render immediately
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
        userHasCustomScaleRef.current = false;
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
            const fallbackTask = pdfjsLib.getDocument({
              url: fallbackBlobUrl,
              wasmUrl,
              cMapUrl,
              cMapPacked: true,
              standardFontDataUrl,
              isOffscreenCanvasSupported: false,
            });
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
      } catch (e) { }
      if (fallbackBlobUrl) URL.revokeObjectURL(fallbackBlobUrl);
    };
  }, [previewUrlWithVersion, isPdfPreview]);

  // Load outline / bookmarks when document is available
  useEffect(() => {
    if (!pdfDocument) {
      setPdfOutline([]);
      setThumbnailUrls({});
      setExpandedOutlineNodes({});
      return;
    }

    let isMounted = true;
    setOutlineLoading(true);

    async function parseOutline() {
      try {
        const rawOutline = await pdfDocument.getOutline();
        if (!isMounted) return;

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

        async function processItems(items, parentPath = '') {
          const result = [];
          for (let idx = 0; idx < items.length; idx++) {
            const item = items[idx];
            const nodeKey = `${parentPath}${idx}`;
            let pageNum = await resolveDestToPage(item.dest);
            let subItems = [];
            if (item.items && item.items.length > 0) {
              subItems = await processItems(item.items, `${nodeKey}-`);
            }
            result.push({
              key: nodeKey,
              title: item.title,
              dest: item.dest,
              pageNumber: pageNum,
              items: subItems,
            });
          }
          return result;
        }

        if (rawOutline && rawOutline.length > 0) {
          const structuredOutline = await processItems(rawOutline);
          if (isMounted) {
            setPdfOutline(structuredOutline);
            // Default TOC sections to COLLAPSED so it is not overly long or cluttered
            setExpandedOutlineNodes({});
            setOutlineLoading(false);
          }
        } else {
          // If no PDF outline bookmarks exist, generate automatic section breakdown by page intervals
          const autoSections = [];
          const step = pdfDocument.numPages > 100 ? 25 : (pdfDocument.numPages > 30 ? 10 : 5);
          for (let p = 1; p <= pdfDocument.numPages; p += step) {
            const endPage = Math.min(pdfDocument.numPages, p + step - 1);
            const sectionIdx = autoSections.length + 1;
            autoSections.push({
              key: `section-${sectionIdx}`,
              title: p === endPage ? `Page ${p}` : `Section ${sectionIdx}: Pages ${p} – ${endPage}`,
              pageNumber: p,
              items: [],
            });
          }
          if (isMounted) {
            setPdfOutline(autoSections);
            setOutlineLoading(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          // Fallback outline on error
          const autoSections = [];
          const step = 20;
          for (let p = 1; p <= pdfDocument.numPages; p += step) {
            const endPage = Math.min(pdfDocument.numPages, p + step - 1);
            autoSections.push({
              key: `sec-${p}`,
              title: `Pages ${p} – ${endPage}`,
              pageNumber: p,
              items: [],
            });
          }
          setPdfOutline(autoSections);
          setOutlineLoading(false);
        }
      }
    }

    parseOutline();

    return () => {
      isMounted = false;
    };
  }, [pdfDocument]);

  // Pre-load visible thumbnails continuously as user scrolls or navigates
  useEffect(() => {
    if (!showPdfSidebar || pdfSidebarTab !== 'thumbnails' || !pdfDocument) return;

    let cancelled = false;
    // Load window around current page immediately (+/- 5 pages)
    const start = Math.max(1, pdfPage - 4);
    const end = Math.min(pdfPageCount, pdfPage + 6);

    for (let p = start; p <= end; p++) {
      if (!thumbnailUrls[p]) {
        renderThumbnail(p);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [showPdfSidebar, pdfSidebarTab, pdfPage, pdfDocument, pdfPageCount]);

  // Lazy render thumbnail for a specific page
  const renderThumbnail = async (pageNumber) => {
    if (!pdfDocument || thumbnailUrls[pageNumber]) return;
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const thumbViewport = page.getViewport({ scale: 0.22 });
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = Math.floor(thumbViewport.width);
      thumbCanvas.height = Math.floor(thumbViewport.height);
      const thumbCtx = thumbCanvas.getContext('2d');
      thumbCtx.fillStyle = '#ffffff';
      thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);

      await page.render({ canvasContext: thumbCtx, viewport: thumbViewport, background: 'rgb(255, 255, 255)' }).promise;
      const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);
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

  // Automatically adjust initial scale responsively when document first loads or display mode changes
  // It NEVER re-runs on pdfPage changes, ensuring your zoom level remains completely fixed across pages
  useEffect(() => {
    if (!pdfDocument || userHasCustomScaleRef.current) return;

    let cancelled = false;

    // Use page 1 as the representative dimension for initial viewport fitting
    const pagePromises = [pdfDocument.getPage(1)];
    if (isPdfFullscreen && pdfPageViewMode === 'two-page' && pdfPageCount >= 2) {
      pagePromises.push(pdfDocument.getPage(2));
    }

    Promise.all(pagePromises).then(([page1, page2]) => {
      if (cancelled || !page1 || userHasCustomScaleRef.current) return;
      const vp1 = page1.getViewport({ scale: 1, rotation: pdfRotation });
      const vp2 = page2 ? page2.getViewport({ scale: 1, rotation: pdfRotation }) : null;

      let targetScale = 1.0;
      if (isPdfFullscreen) {
        // Available space inside fullscreen viewer container
        const availableHeight = Math.max(100, window.innerHeight - 80);
        const sidebarWidth = showPdfSidebar ? 320 : 0;
        const availableWidth = Math.max(200, window.innerWidth - sidebarWidth - 64);

        if (pdfFitMode === 'width') {
          const totalWidthNeeded = vp2 ? (vp1.width + vp2.width + 24) : vp1.width;
          if (totalWidthNeeded > 0 && availableWidth > 200) {
            const widthScale = availableWidth / totalWidthNeeded;
            targetScale = Math.max(0.35, Math.min(2.5, Number(widthScale.toFixed(2))));
          }
        } else {
          const maxPageHeight = vp2 ? Math.max(vp1.height, vp2.height) : vp1.height;
          const totalWidthNeeded = vp2 ? (vp1.width + vp2.width + 24) : vp1.width;

          let fitScale = availableHeight / maxPageHeight;
          if (totalWidthNeeded * fitScale > availableWidth) {
            fitScale = availableWidth / totalWidthNeeded;
          }
          targetScale = Math.max(0.25, Math.min(2.5, Number(fitScale.toFixed(2))));
        }
      } else {
        // Non-fullscreen standard viewer: fit page within container / viewport responsively
        const containerWidth = pdfViewerAreaRef.current?.clientWidth || window.innerWidth;
        const isMobileScreen = window.innerWidth < 640;
        const padding = isMobileScreen ? 16 : 48;
        const availableWidth = Math.max(160, containerWidth - padding);

        if (vp1.width > 0 && availableWidth > 0) {
          const responsiveScale = Math.min(1.15, availableWidth / vp1.width);
          targetScale = Math.max(0.35, Math.min(2.0, Number(responsiveScale.toFixed(2))));
        }
      }

      pdfScaleRef.current = targetScale;
      setPdfScale(targetScale);
    }).catch(() => { });

    return () => {
      cancelled = true;
    };
  }, [isPdfFullscreen, pdfRotation, pdfPageViewMode, pdfFitMode, showPdfSidebar, pdfDocument]);

  useEffect(() => {
    if (!pdfDocument || !pdfCanvasRef.current) return undefined;

    let cancelled = false;
    setIsPageRendering(true);

    // Cancel any active render tasks before starting a new render to prevent black frames or conflicts
    try {
      if (primaryRenderTaskRef.current) {
        primaryRenderTaskRef.current.cancel();
      }
    } catch (e) { }
    try {
      if (secondaryRenderTaskRef.current) {
        secondaryRenderTaskRef.current.cancel();
      }
    } catch (e) { }

    // If current page is beyond preview document pages (e.g. page 8 lock screen), skip rendering
    if (isPreviewCapped && pdfPage > PREVIEW_CAP) {
      setIsPageRendering(false);
      return undefined;
    }

    // Render Page 1 (Primary Page)
    pdfDocument.getPage(pdfPage).then((page) => {
      if (cancelled) return;
      // High-DPI (Retina / 4K / Mobile) rendering: cap DPR between 1.25 and 2.0 to balance crispness with fast mobile decode
      const rawDpr = window.devicePixelRatio || 1;
      const dpr = Math.min(2.0, Math.max(1.25, rawDpr));
      const viewport = page.getViewport({ scale: pdfScale * dpr, rotation: pdfRotation });
      const canvas = pdfCanvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');

      // Internal buffer size multiplied by DPR for ultra-sharp vectors & text
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      // Pre-fill canvas with clean white background so black frame never shows while rendering complex vectors
      context.save();
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();

      // Display size stays locked to CSS scale so layout does not stretch
      const cssViewport = page.getViewport({ scale: pdfScale, rotation: pdfRotation });
      canvas.style.width = `${Math.floor(cssViewport.width)}px`;
      canvas.style.height = `${Math.floor(cssViewport.height)}px`;

      const renderTask = page.render({
        canvasContext: context,
        viewport,
        background: 'rgb(255, 255, 255)',
      });
      primaryRenderTaskRef.current = renderTask;

      renderTask.promise
        .then(() => {
          if (!cancelled) setIsPageRendering(false);
        })
        .catch((error) => {
          if (!cancelled && error?.name !== 'RenderingCancelledException') {
            setPreviewError(error.message || 'Unable to render the PDF page.');
            setIsPageRendering(false);
          }
        });
    }).catch((error) => {
      if (!cancelled) {
        setPreviewError(error.message || 'Unable to open the PDF page.');
        setIsPageRendering(false);
      }
    });

    // Render Page 2 (Right Page) only if in Fullscreen mode AND Two-Page Book View is selected
    const secondPageNum = pdfPage + 1;
    if (isPdfFullscreen && pdfPageViewMode === 'two-page' && secondPageNum <= pdfPageCount && pdfSecondCanvasRef.current) {
      pdfDocument.getPage(secondPageNum).then((secondPage) => {
        if (cancelled) return;
        const rawDpr = window.devicePixelRatio || 1;
        const dpr = Math.min(2.0, Math.max(1.25, rawDpr));
        const secondViewport = secondPage.getViewport({ scale: pdfScale * dpr, rotation: pdfRotation });
        const secondCanvas = pdfSecondCanvasRef.current;
        if (!secondCanvas) return;
        const secondContext = secondCanvas.getContext('2d');

        secondCanvas.width = Math.floor(secondViewport.width);
        secondCanvas.height = Math.floor(secondViewport.height);

        secondContext.save();
        secondContext.fillStyle = '#ffffff';
        secondContext.fillRect(0, 0, secondCanvas.width, secondCanvas.height);
        secondContext.restore();

        const secondCssViewport = secondPage.getViewport({ scale: pdfScale, rotation: pdfRotation });
        secondCanvas.style.width = `${Math.floor(secondCssViewport.width)}px`;
        secondCanvas.style.height = `${Math.floor(secondCssViewport.height)}px`;

        const secondRenderTask = secondPage.render({
          canvasContext: secondContext,
          viewport: secondViewport,
          background: 'rgb(255, 255, 255)',
        });
        secondaryRenderTaskRef.current = secondRenderTask;

        secondRenderTask.promise.catch((error) => {
          if (error?.name !== 'RenderingCancelledException') {
            console.warn('Secondary page render error:', error);
          }
        });
      }).catch(() => { });
    }

    return () => {
      cancelled = true;
      try {
        if (primaryRenderTaskRef.current) primaryRenderTaskRef.current.cancel();
      } catch (e) { }
      try {
        if (secondaryRenderTaskRef.current) secondaryRenderTaskRef.current.cancel();
      } catch (e) { }
    };
  }, [pdfDocument, pdfPage, pdfScale, pdfRotation, pdfPageViewMode, pdfPageCount]);

  // Touch handlers for mobile swipe page navigation and 2-finger focal pinch-to-zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Two-finger pinch gesture start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      touchStateRef.current = {
        startX: centerX,
        startY: centerY,
        centerX,
        centerY,
        initialDistance: Math.max(10, dist),
        initialScale: pdfScaleRef.current,
        isPinching: true,
        hasMoved: false,
      };
    } else if (e.touches.length === 1) {
      // Single finger touch start for left/right swipe
      const t = e.touches[0];
      touchStateRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        centerX: t.clientX,
        centerY: t.clientY,
        initialDistance: 0,
        initialScale: pdfScaleRef.current,
        isPinching: false,
        hasMoved: false,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStateRef.current.isPinching) {
      // Two-finger pinch gesture active with focal point tracking
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentCenterX = (t1.clientX + t2.clientX) / 2;
      const currentCenterY = (t1.clientY + t2.clientY) / 2;

      if (touchStateRef.current.initialDistance > 0) {
        const factor = dist / touchStateRef.current.initialDistance;
        const targetScale = touchStateRef.current.initialScale * factor;
        updatePdfScale(targetScale, currentCenterX, currentCenterY);
      }
    } else if (e.touches.length === 1 && !touchStateRef.current.isPinching) {
      touchStateRef.current.hasMoved = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStateRef.current.isPinching) {
      if (e.touches.length < 2) {
        touchStateRef.current.isPinching = false;
      }
      return;
    }

    if (e.changedTouches.length === 1 && touchStateRef.current.hasMoved) {
      const endTouch = e.changedTouches[0];
      const deltaX = endTouch.clientX - touchStateRef.current.startX;
      const deltaY = endTouch.clientY - touchStateRef.current.startY;

      // Check if horizontal movement dominates and exceeds threshold (swipe)
      if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        if (deltaX < 0) {
          // Swiped Left -> Go to Next Page
          const step = (isPdfFullscreen && pdfPageViewMode === 'two-page') ? 2 : 1;
          setPdfPage((prev) => Math.min(maxNavigablePage, prev + step));
        } else {
          // Swiped Right -> Go to Previous Page
          const step = (isPdfFullscreen && pdfPageViewMode === 'two-page') ? 2 : 1;
          setPdfPage((prev) => Math.max(1, prev - step));
        }
      }
    }
    touchStateRef.current.hasMoved = false;
  };

  // Trackpad pinch-to-zoom (Wheel event with ctrlKey) and Ctrl+Wheel zoom towards pointer
  useEffect(() => {
    const container = pdfViewerAreaRef.current;
    if (!container) return undefined;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // Zoom step proportional to wheel delta (trackpad pinch emits smaller continuous deltaY)
        const zoomDelta = -e.deltaY * 0.006;
        const currentScale = pdfScaleRef.current;
        const newScale = currentScale + zoomDelta;
        updatePdfScale(newScale, e.clientX, e.clientY);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [pdfDocument]);

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
                      <User className="size-3.5 text-orange-500" /> Author
                    </span>
                    <span className="font-semibold text-slate-800 text-center sm:col-span-2 sm:text-center" title={resource.author || resource.subject || 'Zyndex Contributor'}>
                      {resource.author || resource.subject || 'Zyndex Contributor'}
                    </span>
                  </div>
                </div>

                {/* Membership & Entitlement Status */}
                <div className="flex items-center gap-2 flex-wrap mb-6">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs ${requiredTier === 0
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
                    {!resource.fileUrl && (
                      <p className="mt-4 text-sm text-amber-700">
                        This resource currently has description data only. Upload or attach a file from the admin panel to make it previewable.
                      </p>
                    )}
                  </div>
                )}
              </motion.div>

              {!isArticle && <motion.div className="bg-white rounded-xl shadow-md p-3 sm:p-8 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <h2 className="text-xl font-semibold text-gray-900">Preview Resource</h2>
                </div>

                {/* Reader View: Allowed if user has plan access OR for 7-page preview */}
                {previewUrl && isPdfPreview && pdfDocument ? (
                  <div
                    ref={pdfContainerRef}
                    className={`overflow-hidden rounded-xl border border-gray-200 bg-neutral-800 flex flex-col ${isPdfFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-0 w-screen h-screen' : ''
                      }`}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-900 px-2.5 sm:px-4 py-2 sm:py-2.5 text-white select-none">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {isPdfFullscreen && (
                          <>
                            <button
                              type="button"
                              onClick={() => setShowPdfSidebar((prev) => !prev)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${showPdfSidebar
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
                        <button type="button" disabled={pdfPage <= 1} onClick={() => setPdfPage((page) => Math.max(1, page - (pdfPageViewMode === 'two-page' ? 2 : 1)))} className="rounded p-1 hover:bg-white/10 disabled:opacity-40 cursor-pointer" aria-label="Previous page" title="Previous page"><ChevronLeft className="size-5" /></button>
                        <div className="flex items-center gap-1 text-xs sm:text-sm bg-neutral-800 px-2 sm:px-2.5 py-1 rounded-lg border border-neutral-700">
                          <span className="hidden xs:inline">Page</span>
                          <input
                            type="number"
                            min={1}
                            max={maxNavigablePage}
                            value={pdfPage}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1 && val <= maxNavigablePage) {
                                setPdfPage(val);
                              }
                            }}
                            className="w-10 sm:w-12 text-center bg-neutral-950 text-white rounded border border-neutral-600 py-0.5 text-xs font-bold focus:outline-none focus:border-orange-500"
                            title="Enter page number to jump directly"
                          />
                          {pdfPageViewMode === 'two-page' && pdfPage + 1 <= displayTotalPages ? (
                            <span className="text-neutral-400 font-mono text-xs">- {pdfPage + 1} of {displayTotalPages}</span>
                          ) : (
                            <span className="text-neutral-400 text-xs">/ {displayTotalPages}</span>
                          )}
                        </div>
                        <button type="button" disabled={pdfPage >= maxNavigablePage || (pdfPageViewMode === 'two-page' && pdfPage + 1 >= maxNavigablePage)} onClick={() => setPdfPage((page) => Math.min(maxNavigablePage, page + (pdfPageViewMode === 'two-page' ? 2 : 1)))} className="rounded p-1 hover:bg-white/10 disabled:opacity-40 cursor-pointer" aria-label="Next page" title="Next page"><ChevronRight className="size-5" /></button>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          type="button"
                          disabled={pdfScale <= 0.35}
                          onClick={() => {
                            updatePdfScale(pdfScaleRef.current - 0.15);
                          }}
                          className="rounded p-1 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                          aria-label="Zoom out"
                          title="Zoom out"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-9 sm:w-12 text-center text-[11px] sm:text-xs font-semibold">{Math.round(pdfScale * 100)}%</span>
                        <button
                          type="button"
                          disabled={pdfScale >= 2.5}
                          onClick={() => {
                            updatePdfScale(pdfScaleRef.current + 0.15);
                          }}
                          className="rounded p-1 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                          aria-label="Zoom in"
                          title="Zoom in"
                        >
                          <Plus className="size-4" />
                        </button>
                        {/* Reset Zoom */}
                        <button
                          type="button"
                          onClick={() => {
                            userHasCustomScaleRef.current = false;
                            updatePdfScale(1.0);
                          }}
                          className="rounded p-1 hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
                          title="Reset Zoom"
                          aria-label="Reset Zoom"
                        >
                          <RotateCcw className="size-3.5" />
                        </button>
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
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${pdfPageViewMode === 'single'
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
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${pdfPageViewMode === 'two-page'
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
                        {/* Fit Mode (Fit to Page vs Fit to Width) in Full Screen */}
                        {isPdfFullscreen && (
                          <>
                            <div className="flex items-center bg-neutral-800 p-0.5 rounded-lg border border-neutral-700">
                              <button
                                type="button"
                                onClick={() => setPdfFitMode('page')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${pdfFitMode === 'page'
                                    ? 'bg-neutral-700 text-orange-400 shadow-sm'
                                    : 'text-neutral-400 hover:text-white'
                                  }`}
                                title="Fit to Page (Top-to-Bottom)"
                              >
                                <MoveVertical className="size-3.5" />
                                <span className="hidden lg:inline">Fit Page</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPdfFitMode('width')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${pdfFitMode === 'width'
                                    ? 'bg-neutral-700 text-orange-400 shadow-sm'
                                    : 'text-neutral-400 hover:text-white'
                                  }`}
                                title="Fit to Width"
                              >
                                <MoveHorizontal className="size-3.5" />
                                <span className="hidden lg:inline">Fit Width</span>
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
                              className={`p-2.5 rounded-lg transition-all cursor-pointer ${pdfSidebarTab === 'thumbnails'
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
                              className={`p-2.5 rounded-lg transition-all cursor-pointer ${pdfSidebarTab === 'outline'
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
                            <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-700/80 bg-[#262626]">
                              <h3 className="font-semibold text-xs sm:text-sm text-white flex items-center gap-1.5">
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
                              <div className="flex items-center gap-1">
                                
                                <button
                                  type="button"
                                  onClick={() => setShowPdfSidebar(false)}
                                  className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-700 cursor-pointer"
                                  title="Close Panel"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                            </div>

                            {/* Panel Body */}
                            <div className="flex-1 overflow-y-auto p-3" ref={thumbnailsContainerRef}>
                              {pdfSidebarTab === 'thumbnails' ? (
                                <div className="space-y-4">
                                  {Array.from({ length: displayTotalPages > 0 ? displayTotalPages : pdfPageCount }).map((_, idx) => {
                                    const pageNum = idx + 1;
                                    const isCurrent = pageNum === pdfPage;
                                    const isLockedThumbnail = isPreviewCapped && pageNum > PREVIEW_CAP;
                                    return (
                                      <div
                                        key={pageNum}
                                        data-thumb-page={pageNum}
                                        onClick={() => {
                                          if (isLockedThumbnail) {
                                            setPdfPage(PREVIEW_CAP + 1);
                                          } else {
                                            setPdfPage(pageNum);
                                          }
                                        }}
                                        onMouseEnter={() => {
                                          if (!isLockedThumbnail) {
                                            renderThumbnail(pageNum);
                                          }
                                        }}
                                        ref={(node) => {
                                          if (node && !isLockedThumbnail && !thumbnailUrls[pageNum]) {
                                            // Trigger initial load for nearby pages
                                            if (Math.abs(pageNum - pdfPage) <= 3) {
                                              renderThumbnail(pageNum);
                                            }
                                          }
                                        }}
                                        className="group cursor-pointer flex flex-col items-center"
                                      >
                                        <div
                                          className={`relative w-36 sm:w-40 aspect-[1/1.414] bg-white rounded-md overflow-hidden shadow transition-all flex items-center justify-center ${isCurrent
                                              ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-[#2d2d2d] shadow-lg'
                                              : 'border border-neutral-700 group-hover:border-neutral-500 opacity-90 group-hover:opacity-100'
                                            }`}
                                        >
                                          {isLockedThumbnail ? (
                                            <div className="flex flex-col items-center justify-center text-amber-400 gap-1.5 p-3 text-center bg-neutral-900/90 w-full h-full">
                                              <Lock className="size-5 text-amber-400" />
                                              <span className="text-[10px] text-amber-200 font-semibold">Locked</span>
                                              <span className="text-[9px] text-neutral-400">Page {pageNum}</span>
                                            </div>
                                          ) : thumbnailUrls[pageNum] ? (
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
                                          className={`text-xs mt-1.5 font-medium transition-colors ${isCurrent ? 'text-orange-400 font-bold' : 'text-neutral-400 group-hover:text-neutral-200'
                                            }`}
                                        >
                                          Page {pageNum} {isLockedThumbnail && '🔒'}
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
                                      {(() => {
                                        const renderOutlineNode = (item, depth = 0) => {
                                          const hasChildren = item.items && item.items.length > 0;
                                          const isExpanded = Boolean(expandedOutlineNodes[item.key]);
                                          return (
                                            <div key={item.key} className="space-y-1">
                                              <div
                                                className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 transition-colors group cursor-pointer ${item.pageNumber === pdfPage ? 'bg-orange-500/20 text-orange-300 font-semibold' : 'hover:bg-neutral-800 text-neutral-300'
                                                  }`}
                                              >
                                                {/* Expand / Collapse Toggle Arrow */}
                                                {hasChildren ? (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setExpandedOutlineNodes((prev) => {
                                                        const wasExpanded = Boolean(prev[item.key]);
                                                        if (wasExpanded) {
                                                          // Closing this section
                                                          return { ...prev, [item.key]: false };
                                                        }
                                                        // Accordion: opening this section closes other sibling sections at the same depth
                                                        const nextState = {};
                                                        Object.keys(prev).forEach((k) => {
                                                          // Keep ancestor or descendant keys if applicable, but close siblings
                                                          if (depth > 0 && k.startsWith(item.key.substring(0, item.key.lastIndexOf('-')))) {
                                                            // Keep parent open
                                                            nextState[k] = prev[k];
                                                          }
                                                        });
                                                        nextState[item.key] = true;
                                                        return nextState;
                                                      });
                                                    }}
                                                    className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white mr-1 transition-transform cursor-pointer"
                                                    title={isExpanded ? 'Collapse Section' : 'Expand Section'}
                                                  >
                                                    <ChevronDown
                                                      className={`size-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-0 text-orange-400' : '-rotate-90 text-neutral-500'
                                                        }`}
                                                    />
                                                  </button>
                                                ) : (
                                                  <span className="w-5 shrink-0" />
                                                )}

                                                {/* Title Navigation (also toggles accordion if it has children) */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (item.pageNumber && item.pageNumber >= 1 && item.pageNumber <= pdfPageCount) {
                                                      setPdfPage(item.pageNumber);
                                                    }
                                                    if (hasChildren) {
                                                      setExpandedOutlineNodes((prev) => {
                                                        const wasExpanded = Boolean(prev[item.key]);
                                                        if (wasExpanded) return { ...prev, [item.key]: false };
                                                        const nextState = {};
                                                        Object.keys(prev).forEach((k) => {
                                                          if (depth > 0 && k.startsWith(item.key.substring(0, item.key.lastIndexOf('-')))) {
                                                            nextState[k] = prev[k];
                                                          }
                                                        });
                                                        nextState[item.key] = true;
                                                        return nextState;
                                                      });
                                                    }
                                                  }}
                                                  className="flex-1 text-left line-clamp-2 leading-relaxed cursor-pointer pr-2 hover:text-white"
                                                  title={item.title}
                                                >
                                                  {item.title}
                                                </button>

                                                {item.pageNumber && (
                                                  <span
                                                    onClick={() => {
                                                      if (item.pageNumber && item.pageNumber >= 1 && item.pageNumber <= pdfPageCount) {
                                                        setPdfPage(item.pageNumber);
                                                      }
                                                    }}
                                                    className="text-[10px] text-neutral-500 font-mono shrink-0 cursor-pointer hover:text-orange-400"
                                                  >
                                                    p.{item.pageNumber}
                                                  </span>
                                                )}
                                              </div>

                                              {/* Recursive Sub-items (collapsible) */}
                                              {hasChildren && isExpanded && (
                                                <div className="pl-3 space-y-1 border-l border-neutral-700/60 ml-3">
                                                  {item.items.map((sub) => renderOutlineNode(sub, depth + 1))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        };
                                        return pdfOutline.map((item) => renderOutlineNode(item, 0));
                                      })()}
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
                      <div
                        className="flex-1 overflow-auto p-1.5 sm:p-4 flex bg-neutral-700 relative min-h-[350px] touch-pan-y"
                        ref={pdfViewerAreaRef}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        {isPageRendering && (
                          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 sm:gap-2 bg-neutral-900/80 backdrop-blur-sm text-neutral-300 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-neutral-700 pointer-events-none shadow-md">
                            <div className="size-2.5 sm:size-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            <span>Rendering page...</span>
                          </div>
                        )}
                        {/* When on a locked page (Page 8+), show the Unlock Paywall Prompt */}
                        {isCurrentlyOnLockedPage ? (
                          <div className="relative mx-auto w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-5 sm:p-10 text-center shadow-xl my-auto text-slate-900">
                            <div className="size-12 sm:size-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 border border-orange-100 shadow-sm">
                              <Lock className="size-6 sm:size-8" />
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                              Preview Cap Reached (7 of {displayTotalPages} Pages)
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-5 sm:mb-6 leading-relaxed">
                              You have reached the end of the free 7-page preview for this resource. To unlock and read all <strong className="text-slate-900 font-bold">{displayTotalPages} pages</strong>, please upgrade to the <span className="font-bold text-orange-600">{PLAN_NAMES[requiredPlan] || requiredPlan}</span> plan or higher.
                            </p>
                            {userPlan && (
                              <p className="text-[11px] sm:text-xs text-slate-600 font-medium mb-5 sm:mb-6 bg-slate-50 rounded-lg py-1.5 px-3 sm:py-2 sm:px-4 inline-block border border-slate-200">
                                Your current active plan: <strong className="text-slate-900 font-bold">{PLAN_NAMES[userPlan] || userPlan}</strong> {isSubExpired && '(Expired)'}
                              </p>
                            )}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (user) {
                                    const safeName = user?.name ? encodeURIComponent(user.name.replace(/\s+/g, '-')) : 'user';
                                    const safeEmail = user?.email ? encodeURIComponent(user.email) : 'email';
                                    navigate(`/Zyndex/User/${safeName}/${safeEmail}/Profile/Billing/Pricing`);
                                  } else {
                                    navigate('/Zyndex/About/Pricing');
                                  }
                                }}
                                className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <ShieldCheck className="size-4" />
                                Upgrade Plan to Unlock All {displayTotalPages} Pages
                              </button>
                              <button
                                type="button"
                                onClick={() => setPdfPage(PREVIEW_CAP)}
                                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-slate-300 shadow-xs"
                              >
                                Back to Page {PREVIEW_CAP}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative mx-auto w-fit max-w-full flex flex-col md:flex-row items-center justify-center gap-4 my-auto shrink-0" onContextMenu={(event) => event.preventDefault()}>
                            {/* Page 1 Canvas */}
                            <div className="relative bg-white shadow-2xl shrink-0 max-w-full">
                              <canvas ref={pdfCanvasRef} className="block select-none bg-white max-w-full" />
                              <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-5 gap-8 overflow-hidden p-4 sm:p-8">
                                {Array.from({ length: 10 }).map((_, index) => (
                                  <div key={index} className="flex items-center justify-center -rotate-25 text-[10px] sm:text-xs font-semibold text-gray-900/[0.22] whitespace-nowrap select-none">
                                    {user?.name || user?.username || 'Zyndex User'} • {user?.email || 'user@example.com'} • Zyndex Digital Library
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Page 2 Canvas in Two-Page Book View (Only in Fullscreen) */}
                            {isPdfFullscreen && pdfPageViewMode === 'two-page' && pdfPage + 1 <= pdfPageCount && (
                              <div className="relative bg-white shadow-2xl shrink-0">
                                <canvas ref={pdfSecondCanvasRef} className="block select-none bg-white" />
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
                        )}
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Rate this resource</label>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {rating > 0 ? `${Number(rating).toFixed(1)} / 5.0` : 'Tap stars to rate'}
                      </span>
                    </div>

                    {/* Interactive 5-star rating with continuous fractional support */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((starIndex) => {
                          const activeVal = hoveredRating || rating || 0;
                          const fillPercent = Math.max(0, Math.min(100, (activeVal - (starIndex - 1)) * 100));

                          return (
                            <div
                              key={starIndex}
                              className="relative cursor-pointer select-none group"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const width = rect.width;
                                const ratio = Math.max(0.1, Math.min(1.0, clickX / width));
                                const preciseRating = Math.round(((starIndex - 1) + ratio) * 10) / 10;
                                setRating(preciseRating);
                              }}
                              onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const moveX = e.clientX - rect.left;
                                const width = rect.width;
                                const ratio = Math.max(0.1, Math.min(1.0, moveX / width));
                                const previewRating = Math.round(((starIndex - 1) + ratio) * 10) / 10;
                                setHoveredRating(previewRating);
                              }}
                              onMouseLeave={() => setHoveredRating(0)}
                              title={`Rate ${starIndex} stars`}
                            >
                              {/* Background empty star */}
                              <Star className="size-8 text-gray-300 transition-transform group-hover:scale-110" />

                              {/* Fractional filled star overlay */}
                              {fillPercent > 0 && (
                                <div
                                  className="absolute top-0 left-0 overflow-hidden pointer-events-none transition-all"
                                  style={{ width: `${fillPercent}%` }}
                                >
                                  <Star className="size-8 fill-yellow-400 text-yellow-400 shrink-0" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Precise Decimal Slider */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <input
                          type="range"
                          min="1.0"
                          max="5.0"
                          step="0.1"
                          value={rating || 5.0}
                          onChange={(e) => setRating(parseFloat(e.target.value))}
                          className="w-48 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                        />
                        <span className="font-mono text-sm font-bold text-gray-800">
                          {rating > 0 ? Number(rating).toFixed(1) : '5.0'} ★
                        </span>
                      </div>
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
