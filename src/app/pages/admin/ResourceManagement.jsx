import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Edit,
  Trash2,
  X,
  FileText,
  Plus,
  Upload as UploadIcon,
  File,
  AlertTriangle,
  Link as LinkIcon,
  Image as ImageIcon,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Download,
  Clock,
  CheckCircle,
  CheckCircle2,
  HardDrive,
  Database,
  Activity,
  Cpu,
  Info,
  Shield,
  Layers,
  Calendar,
  User,
  Star,
  Maximize2,
  Minimize2,
  PanelLeft,
  LayoutGrid,
  ListTree,
  ChevronDown,
  BookOpen,
  BookOpenCheck,
  Square,
  MoveHorizontal,
  MoveVertical,
  Minus,
  Globe,
  Lock
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as pdfWorkerModule from 'pdfjs-dist/build/pdf.worker.min.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import AdminLayout from '@/app/components/AdminLayout';
import { useAuth } from '@/app/context/AuthContext';
import resourceService from '@/services/api/resourceService';
import logService from '@/services/api/logService';
import DOMPurify from 'dompurify';
import LinkedInArticleEditor from '@/app/components/LinkedInArticleEditor';

if (typeof globalThis !== 'undefined' && pdfWorkerModule?.WorkerMessageHandler) {
  globalThis.pdfjsWorker = { WorkerMessageHandler: pdfWorkerModule.WorkerMessageHandler };
}
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const defaultCategories = [
  'Artificial Intelligence',
  'Machine Learning',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Economics',
  'History',
  'Literature',
  'Biology',
];

const PLATFORM_PLANS = [
  { id: 'FREE', name: 'Free / Demo (All Users)', badgeClass: 'bg-gray-100 text-gray-700' },
  { id: 'STUDENT_BASIC', name: 'Student Basic', badgeClass: 'bg-blue-100 text-blue-700' },
  { id: 'STUDENT_PLUS', name: 'Student Plus', badgeClass: 'bg-indigo-100 text-indigo-700' },
  { id: 'RESEARCHER_PRO', name: 'PhD Scholar / Researcher', badgeClass: 'bg-orange-100 text-orange-700 border border-orange-200' },
  { id: 'UNIVERSITY', name: 'Academic Faculty & Educator', badgeClass: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
  { id: 'ENTERPRISE', name: 'Distinguished Fellow & Scholar', badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200' },
];

const emptyResource = {
  id: null,
  title: '',
  category: '',
  subject: '',
  resourceType: 'pdf',
  requiredPlan: 'FREE',
  description: '',
  articleContent: '',
  file: null,
  currentFileUrl: '',
  currentFileName: '',
};

function ArticleEditor({ value, onChange }) {
  return <LinkedInArticleEditor value={value} onChange={onChange} />;
}

export default function ResourceManagement() {
  const { user, isPrimaryAdmin } = useAuth();
  const isMainAdmin = isPrimaryAdmin || user?.email?.toLowerCase() === 'bhaanugali@gmail.com' || user?.isPrimaryAdmin === true;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [resources, setResources] = useState([]);
  const [modalMessage, setModalMessage] = useState(null);
  const [categories, setCategories] = useState(defaultCategories);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formResource, setFormResource] = useState(emptyResource);
  const [createResource, setCreateResource] = useState({
    title: '',
    category: '',
    subject: '',
    resourceType: '',
    requiredPlan: 'FREE',
    description: '',
    file: null,
  });
  const [createStatus, setCreateStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState({ loaded: 0, total: 0 });
  const [uploadStartTime, setUploadStartTime] = useState(null);
  const [uploadEtaSeconds, setUploadEtaSeconds] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [updatingResource, setUpdatingResource] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStats, setUpdateStats] = useState({ loaded: 0, total: 0 });
  const [updateStartTime, setUpdateStartTime] = useState(null);
  const [updateEtaSeconds, setUpdateEtaSeconds] = useState(null);
  const [updateSpeed, setUpdateSpeed] = useState('');
  const [previewResource, setPreviewResource] = useState(null);
  const [infoResource, setInfoResource] = useState(null);
  const [previewToken, setPreviewToken] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfRotation, setPdfRotation] = useState(0);
  const [pdfPageViewMode, setPdfPageViewMode] = useState('single');
  const [pdfFitMode, setPdfFitMode] = useState('page');
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const [isPageRendering, setIsPageRendering] = useState(false);
  const [showPdfSidebar, setShowPdfSidebar] = useState(false);
  const [pdfSidebarTab, setPdfSidebarTab] = useState('thumbnails');
  const [pdfOutline, setPdfOutline] = useState([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const [expandedOutlineNodes, setExpandedOutlineNodes] = useState({});
  const [downloadProgress, setDownloadProgress] = useState(0);

  const pdfCanvasRef = useRef(null);
  const pdfSecondCanvasRef = useRef(null);
  const primaryRenderTaskRef = useRef(null);
  const secondaryRenderTaskRef = useRef(null);
  const pdfContainerRef = useRef(null);
  const pdfViewerAreaRef = useRef(null);
  const thumbnailsContainerRef = useRef(null);
  const getProtocol = () => (typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:');
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `${getProtocol()}//${window.location.hostname}:8080/api` : 'http://localhost:8080/api');

  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [storageStats, setStorageStats] = useState({
    totalBytes: 0,
    freeBytes: 0,
    usedBytes: 0,
    usedPercentage: 0,
    uploadsDirBytes: 0,
    vmHealth: null
  });

  const loadStorageStats = async () => {
    try {
      const stats = await resourceService.getStorageStats();
      if (stats && stats.totalBytes) {
        setStorageStats(stats);
      }
    } catch (e) {
      // Quiet background failure so UI remains responsive
    }
  };

  useEffect(() => {
    loadStorageStats();
    // Live update smoothly every 3 seconds to preserve server performance
    const timer = setInterval(() => {
      loadStorageStats();
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const formatStorageSize = (bytes) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };
  const openPreviewModal = async (resource) => {
    setPreviewResource(resource);
    setPreviewError('');
    setPreviewBlobUrl('');
    setPdfDocument(null);
    setPdfPage(1);
    setPdfPageCount(0);
    setPdfScale(1.0);
    setPdfRotation(0);
    setPdfPageViewMode('single');
    setPdfFitMode('page');
    setIsPdfFullscreen(false);
    setShowPdfSidebar(false);
    setThumbnailUrls({});
    setPdfOutline([]);
    setDownloadProgress(0);

    try {
      const tokenRes = await resourceService.getPreviewToken(resource.id);
      setPreviewToken(tokenRes?.token || '');
    } catch (err) {
      console.error('Failed to get preview token:', err);
      setPreviewToken('');
    }
  };

  const closePreviewModal = () => {
    if (document.fullscreenElement) {
      try {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (e) { }
    }
    setPreviewResource(null);
    setPreviewToken('');
    setPreviewBlobUrl('');
    setPreviewError('');
    setPdfDocument(null);
    setIsPdfFullscreen(false);
    setShowPdfSidebar(false);
  };

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
    const handleFullscreenChange = () => {
      const isFullscreenNow = Boolean(document.fullscreenElement);
      setIsPdfFullscreen(isFullscreenNow);
      if (!isFullscreenNow) {
        setPdfPageViewMode('single');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const isPdfPreview = previewResource && (
    /\.pdf($|\?)/i.test(previewResource.fileUrl || '') ||
    /\.pdf($|\?)/i.test(previewResource.fileName || '')
  );

  const previewFileUrl = previewResource?.fileUrl
    ? (previewToken ? `${apiBaseUrl}/resources/${previewResource.id}/file?token=${encodeURIComponent(previewToken)}` : '')
    : '';

  // Stream & load PDF document progressively
  useEffect(() => {
    if (!previewResource || !previewFileUrl || !isPdfPreview) return undefined;

    let cancelled = false;
    let loadingTask = null;
    let fallbackBlobUrl = '';
    setPdfDocument(null);
    setPdfPage(1);
    setPdfPageCount(0);
    setPreviewError('');
    setDownloadProgress(0);

    const token = localStorage.getItem('auth_token') || '';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    loadingTask = pdfjsLib.getDocument({
      url: previewFileUrl,
      httpHeaders: headers,
      withCredentials: false,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
      rangeChunkSize: 524288, // 512 KB chunks for fast streaming
      disableAutoFetch: false,
      disableStream: false,
      disableRange: false,
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
        // Fallback: fetch as blob and decode
        fetch(previewFileUrl, {
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
      } catch (e) { }
      if (fallbackBlobUrl) URL.revokeObjectURL(fallbackBlobUrl);
    };
  }, [previewFileUrl, isPdfPreview, previewResource]);

  // Load outline / bookmarks
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

        async function resolveDestToPage(dest) {
          try {
            if (!dest) return null;
            let explicitDest = dest;
            if (typeof dest === 'string') {
              explicitDest = await pdfDocument.getDestination(dest);
            }
            if (Array.isArray(explicitDest) && explicitDest.length > 0) {
              const pageRef = explicitDest[0];
              if (typeof pageRef === 'object' && pageRef !== null) {
                const pageIndex = await pdfDocument.getPageIndex(pageRef);
                return pageIndex + 1;
              } else if (typeof pageRef === 'number') {
                return pageRef + 1;
              }
            }
          } catch (e) { }
          return null;
        }

        async function transformItems(items, parentKey = 'root') {
          const result = [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const key = `${parentKey}-${i}`;
            const pageNumber = await resolveDestToPage(item.dest);
            const subItems = item.items && item.items.length > 0 ? await transformItems(item.items, key) : [];
            result.push({
              title: item.title,
              dest: item.dest,
              pageNumber,
              items: subItems,
              key,
            });
          }
          return result;
        }

        if (rawOutline && rawOutline.length > 0) {
          const parsed = await transformItems(rawOutline);
          if (isMounted) setPdfOutline(parsed);
        } else {
          if (isMounted) setPdfOutline([]);
        }
      } catch (err) {
        if (isMounted) setPdfOutline([]);
      } finally {
        if (isMounted) setOutlineLoading(false);
      }
    }

    parseOutline();
    return () => {
      isMounted = false;
    };
  }, [pdfDocument]);

  // Thumbnail generator
  const renderThumbnail = async (pageNumber) => {
    if (!pdfDocument || thumbnailUrls[pageNumber]) return;
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const thumbViewport = page.getViewport({ scale: 0.22 });
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = Math.floor(thumbViewport.width);
      thumbCanvas.height = Math.floor(thumbViewport.height);
      const thumbCtx = thumbCanvas.getContext('2d', { alpha: false });
      thumbCtx.fillStyle = '#ffffff';
      thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);

      await page.render({ canvasContext: thumbCtx, viewport: thumbViewport, background: 'rgb(255, 255, 255)' }).promise;
      const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);
      setThumbnailUrls((prev) => ({ ...prev, [pageNumber]: dataUrl }));
    } catch (e) { }
  };

  // Thumbnail prefetching
  useEffect(() => {
    if (!showPdfSidebar || pdfSidebarTab !== 'thumbnails' || !pdfDocument || !pdfPageCount) return;
    const start = Math.max(1, pdfPage - 4);
    const end = Math.min(pdfPageCount, pdfPage + 6);
    for (let p = start; p <= end; p++) {
      if (!thumbnailUrls[p]) renderThumbnail(p);
    }
  }, [showPdfSidebar, pdfSidebarTab, pdfPage, pdfDocument, pdfPageCount]);

  // Responsive scale & fit
  useEffect(() => {
    if (!pdfDocument || !isPdfFullscreen) return;
    let cancelled = false;

    const pagePromises = [pdfDocument.getPage(pdfPage)];
    if (pdfPageViewMode === 'two-page' && pdfPage + 1 <= pdfPageCount) {
      pagePromises.push(pdfDocument.getPage(pdfPage + 1));
    }

    Promise.all(pagePromises).then(([page1, page2]) => {
      if (cancelled || !page1) return;
      const vp1 = page1.getViewport({ scale: 1, rotation: pdfRotation });
      const vp2 = page2 ? page2.getViewport({ scale: 1, rotation: pdfRotation }) : null;
      const availableHeight = Math.max(200, window.innerHeight - 70);
      const sidebarWidth = showPdfSidebar ? 320 : 0;
      const availableWidth = Math.max(200, window.innerWidth - sidebarWidth - 64);

      if (pdfFitMode === 'width') {
        const totalWidthNeeded = vp2 ? (vp1.width + vp2.width + 24) : vp1.width;
        if (totalWidthNeeded > 0 && availableWidth > 200) {
          const widthScale = availableWidth / totalWidthNeeded;
          setPdfScale(Math.max(0.35, Math.min(2.5, Number(widthScale.toFixed(2)))));
        }
      } else {
        const maxHeightNeeded = vp2 ? Math.max(vp1.height, vp2.height) : vp1.height;
        if (maxHeightNeeded > 0 && availableHeight > 200) {
          const pageScale = (availableHeight - 40) / maxHeightNeeded;
          setPdfScale(Math.max(0.35, Math.min(2.5, Number(pageScale.toFixed(2)))));
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isPdfFullscreen, pdfRotation, pdfPageViewMode, pdfFitMode, showPdfSidebar, pdfPage, pdfPageCount, pdfDocument]);

  // Page rendering on Canvas (High-DPI Retina, crisp vectors, multi-page support)
  useEffect(() => {
    if (!pdfDocument || !pdfCanvasRef.current) return undefined;
    let cancelled = false;
    setIsPageRendering(true);

    try {
      if (primaryRenderTaskRef.current) primaryRenderTaskRef.current.cancel();
      if (secondaryRenderTaskRef.current) secondaryRenderTaskRef.current.cancel();
    } catch (e) { }

    // Render Page 1 (Primary Page)
    pdfDocument.getPage(pdfPage).then((page) => {
      if (cancelled) return;
      const dpr = Math.max(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: pdfScale * dpr, rotation: pdfRotation });
      const canvas = pdfCanvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d', { alpha: false });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      context.save();
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();

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
            setIsPageRendering(false);
          }
        });
    });

    // Render Page 2 in Two-Page Book View
    const secondPageNum = pdfPage + 1;
    if (isPdfFullscreen && pdfPageViewMode === 'two-page' && secondPageNum <= pdfPageCount && pdfSecondCanvasRef.current) {
      pdfDocument.getPage(secondPageNum).then((secondPage) => {
        if (cancelled) return;
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        const secondViewport = secondPage.getViewport({ scale: pdfScale * dpr, rotation: pdfRotation });
        const secondCanvas = pdfSecondCanvasRef.current;
        if (!secondCanvas) return;
        const secondContext = secondCanvas.getContext('2d', { alpha: false });

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
          if (!cancelled && error?.name !== 'RenderingCancelledException') { }
        });
      });
    }

    return () => {
      cancelled = true;
      try {
        if (primaryRenderTaskRef.current) primaryRenderTaskRef.current.cancel();
        if (secondaryRenderTaskRef.current) secondaryRenderTaskRef.current.cancel();
      } catch (e) { }
    };
  }, [pdfDocument, pdfPage, pdfScale, pdfRotation, pdfPageViewMode, pdfPageCount, isPdfFullscreen]);

  const loadResources = async (search = '') => {
    try {
      const response = await resourceService.getAllResources({ search, size: 100 });
      setResources(response.resources || []);
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await resourceService.getCategories();
      const dynamicCategories = (response || []).map((category) => category.name).filter(Boolean);
      setCategories(Array.from(new Set([...defaultCategories, ...dynamicCategories])));
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories(defaultCategories);
    }
  };

  useEffect(() => {
    loadResources(searchTerm);
    loadCategories();
    const interval = window.setInterval(() => {
      loadResources(searchTerm);
      loadCategories();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [searchTerm]);

  const openCreateModal = () => {
    setCreateStatus('');
    setCreateResource({
      title: '',
      category: '',
      subject: '',
      resourceType: '',
      requiredPlan: 'FREE',
      description: '',
      articleContent: '',
      file: null,
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateStatus('');
    setUploading(false);
  };

  const openEditModal = (resource) => {
    setFormResource({
      id: resource.id,
      title: resource.title,
      category: resource.category,
      subject: resource.subject,
      requiredPlan: resource.requiredPlan || 'FREE',
      resourceType:
        resource.resourceType === 'guide' || resource.type === 'guide'
          ? 'pdf'
          : resource.resourceType === 'paper' || resource.type === 'paper'
            ? 'article'
            : resource.resourceType || resource.type || 'pdf',
      description: resource.description,
      articleContent: resource.articleContent || resource.description || '',
      file: null,
      currentFileUrl: resource.fileUrl || '',
      currentFileName: resource.fileName || '',
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setFormResource(emptyResource);
  };

  const handleDelete = async (resourceId) => {
    const target = resources.find((r) => r.id === resourceId);
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await resourceService.deleteResource(resourceId);
      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: 'WARN',
        action: 'ADMIN_DELETE_RESOURCE',
        actorEmail: user?.email || 'admin@zyndex.com',
        details: `Administrator deleted academic resource: ${target?.title || 'Resource'} (ID: ${resourceId}, Category: ${target?.category || 'N/A'})`,
        status: 'SUCCESS'
      }).catch(() => { });

      await loadResources(searchTerm);
    } catch (error) {
      console.error('Failed to delete resource:', error);
    }
  };

  const handleTogglePublish = async (resource) => {
    if (!isMainAdmin) {
      setModalMessage({
        type: 'error',
        title: 'Access Restricted',
        text: 'Only the Main Administrator has authority to publish or unpublish resources from the catalog.',
        buttonText: 'Understood'
      });
      return;
    }

    const currentPublished = resource.isPublished !== false;
    const actionLabel = currentPublished ? 'unpublish' : 'publish';
    if (!window.confirm(`Are you sure you want to ${actionLabel} "${resource.title}"? ${currentPublished ? 'It will remain in the database but will be completely hidden from all users.' : 'It will become live and visible to all users.'}`)) {
      return;
    }

    try {
      const res = await resourceService.togglePublishStatus(resource.id, !currentPublished);
      setModalMessage({
        type: 'success',
        title: currentPublished ? 'Resource Unpublished' : 'Resource Published',
        text: res?.message || (currentPublished ? 'Resource unpublished and hidden from user catalog.' : 'Resource published and now live in user catalog.'),
        buttonText: 'OK'
      });

      // Update local state immediately
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, isPublished: !currentPublished } : r))
      );
      if (infoResource && infoResource.id === resource.id) {
        setInfoResource((prev) => ({ ...prev, isPublished: !currentPublished }));
      }

      await loadResources(searchTerm);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || `Failed to ${actionLabel} resource.`;
      setModalMessage({
        type: 'error',
        title: 'Action Failed',
        text: errorMsg,
        buttonText: 'OK'
      });
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
  };

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined || !isFinite(seconds) || seconds < 0) return 'Calculating...';
    if (seconds < 60) return `${Math.round(seconds)}s remaining`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s remaining`;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(0);
    const initialTotal = createResource.file ? createResource.file.size : 0;
    setUploadStats({ loaded: 0, total: initialTotal });
    setUploadStartTime(Date.now());
    setUploadEtaSeconds(null);
    setUploadSpeed('');
    setCreateStatus('');

    try {
      const payload = new FormData();
      payload.append('title', createResource.title);
      payload.append('category', createResource.category);
      payload.append('subject', createResource.subject);
      payload.append('resourceType', createResource.resourceType);
      payload.append('requiredPlan', createResource.requiredPlan || 'FREE');
      payload.append('description', createResource.description);
      if (createResource.articleContent) {
        payload.append('articleContent', createResource.articleContent);
      }
      if (createResource.file) payload.append('file', createResource.file);

      const startTime = Date.now();
      await resourceService.uploadResource(payload, (progressEvent) => {
        const total = progressEvent.total || (createResource.file ? createResource.file.size : 0);
        const loaded = progressEvent.loaded || 0;
        const percent = total > 0 ? Math.min(100, Math.round((loaded * 100) / total)) : 0;
        setUploadProgress(percent);
        setUploadStats({ loaded, total });

        // Calculate average upload speed and ETA
        const elapsedSec = (Date.now() - startTime) / 1000;
        if (elapsedSec > 0.4 && loaded > 0) {
          const bytesPerSec = loaded / elapsedSec;
          setUploadSpeed(`${formatBytes(bytesPerSec)}/s`);
          if (total > loaded) {
            const remainingBytes = total - loaded;
            const eta = remainingBytes / bytesPerSec;
            setUploadEtaSeconds(eta);
          } else {
            setUploadEtaSeconds(0);
          }
        }
      });

      // Close modal and reset form immediately upon success
      closeCreateModal();
      setCreateResource({
        title: '',
        category: '',
        subject: '',
        requiredPlan: 'FREE',
        resourceType: 'pdf',
        description: '',
        articleContent: '',
        file: null,
      });

      setModalMessage({
        type: 'success',
        title: 'Resource Uploaded',
        text: 'The resource has been uploaded successfully and is now live.',
        buttonText: 'OK'
      });

      // Refresh listings in background
      loadResources(searchTerm);
      loadCategories();
      loadStorageStats();

      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: 'INFO',
        action: 'ADMIN_UPLOAD_RESOURCE',
        actorEmail: user?.email || 'admin@zyndex.com',
        details: `Administrator uploaded new resource: ${createResource.title} (Category: ${createResource.category}, Type: ${createResource.resourceType}, Plan: ${createResource.requiredPlan || 'FREE'})`,
        status: 'SUCCESS'
      }).catch(() => { });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Upload failed.';
      setModalMessage({
        title: 'Upload Failed',
        text: errorMsg,
        buttonText: 'OK'
      });
      setCreateStatus(errorMsg);
    } finally {
      setUploading(false);
      setUploadEtaSeconds(null);
      setUploadSpeed('');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdatingResource(true);
    setUpdateProgress(0);
    const initialTotal = formResource.file ? formResource.file.size : 0;
    setUpdateStats({ loaded: 0, total: initialTotal });
    setUpdateStartTime(Date.now());
    setUpdateEtaSeconds(null);
    setUpdateSpeed('');

    try {
      const payload = new FormData();
      payload.append('title', formResource.title);
      payload.append('category', formResource.category);
      payload.append('subject', formResource.subject);
      payload.append('resourceType', formResource.resourceType);
      payload.append('requiredPlan', formResource.requiredPlan || 'FREE');
      payload.append('description', formResource.description);
      if (formResource.articleContent) {
        payload.append('articleContent', formResource.articleContent);
      }
      if (formResource.file) payload.append('file', formResource.file);

      const startTime = Date.now();
      await resourceService.updateResource(formResource.id, payload, (progressEvent) => {
        const total = progressEvent.total || (formResource.file ? formResource.file.size : 0);
        const loaded = progressEvent.loaded || 0;
        const percent = total > 0 ? Math.min(100, Math.round((loaded * 100) / total)) : 0;
        setUpdateProgress(percent);
        setUpdateStats({ loaded, total });

        const elapsedSec = (Date.now() - startTime) / 1000;
        if (elapsedSec > 0.4 && loaded > 0) {
          const bytesPerSec = loaded / elapsedSec;
          setUpdateSpeed(`${formatBytes(bytesPerSec)}/s`);
          if (total > loaded) {
            const remainingBytes = total - loaded;
            const eta = remainingBytes / bytesPerSec;
            setUpdateEtaSeconds(eta);
          } else {
            setUpdateEtaSeconds(0);
          }
        }
      });

      closeEditModal();
      await loadResources(searchTerm);
      await loadCategories();

      logService.createLog({
        service: 'ADMIN-PORTAL',
        level: 'INFO',
        action: 'ADMIN_UPDATE_RESOURCE',
        actorEmail: user?.email || 'admin@zyndex.com',
        details: `Administrator updated resource: ${formResource.title} (ID: ${formResource.id}, Plan: ${formResource.requiredPlan || 'FREE'}, Category: ${formResource.category})`,
        status: 'SUCCESS'
      }).catch(() => { });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update resource.';
      setModalMessage({
        title: 'Update Failed',
        text: errorMsg,
        buttonText: 'OK'
      });
    } finally {
      setUpdatingResource(false);
      setUpdateEtaSeconds(null);
      setUpdateSpeed('');
    }
  };

  const exportResourcesToCsv = () => {
    const headers = [
      'Serial No',
      'Resource ID',
      'Title',
      'Author / Contributor',
      'Category / Department',
      'Resource Type',
      'Access Plan Tier',
      'Total Views',
      'Rating',
      'Upload Date'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = resources.map((r, idx) => [
      idx + 1,
      r.id,
      r.title || 'Untitled',
      r.author || r.subject || 'Zyndex Contributor',
      r.category || 'General',
      r.resourceType || r.type || 'PDF',
      r.requiredPlan || 'FREE',
      r.viewCount || r.views || 0,
      r.rating || 0,
      r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'
    ]);

    const csvContent = '\uFEFF' + [
      headers.map(escapeCsv).join(','),
      ...rows.map(r => r.map(escapeCsv).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    link.setAttribute('download', `Zyndex_Resources_Export_${timestampStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredAndSortedResources = resources.filter((resource) => {
    if (selectedCategory !== 'ALL' && (resource.category || '').trim().toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    }
    if (sortBy === 'oldest') {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    }
    if (sortBy === 'title_asc') {
      return (a.title || '').localeCompare(b.title || '');
    }
    if (sortBy === 'title_desc') {
      return (b.title || '').localeCompare(a.title || '');
    }
    return 0;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Resource Management</h1>
            <p className="text-gray-600 mt-1">Create, edit, gate by plan tier, and delete PDFs/articles. Showing {filteredAndSortedResources.length} of {resources.length} resources.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={exportResourcesToCsv}
                className="size-10 flex items-center justify-center bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm shrink-0 cursor-pointer"
                title="Download Resources (CSV)"
              >
                <Download className="size-4 text-gray-600" />
              </button>
              <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors cursor-pointer shadow-sm">
                <Plus className="size-5" />
                Add New Content
              </button>
            </div>

            {/* Live Cloud Storage Indicator Widget (Updates every second) */}
            <div
              onClick={() => setStorageModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xs text-xs cursor-pointer hover:border-orange-300 hover:shadow-sm transition-all"
              title="Click to view detailed Cloud Storage Manager"
            >
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <HardDrive className="size-3.5 text-slate-500" />
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="text-slate-500">Cloud Storage:</span>
                <span className="font-bold text-slate-900">{formatStorageSize(storageStats.freeBytes)} free</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-500">{formatStorageSize(storageStats.totalBytes)}</span>
              </div>
              <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-500 ${storageStats.usedPercentage > 85 ? 'bg-rose-500' : storageStats.usedPercentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  style={{ width: `${Math.min(100, Math.max(2, storageStats.usedPercentage))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono">({storageStats.usedPercentage}% used)</span>
            </div>
          </div>
        </motion.div>

        <form onSubmit={(e) => { e.preventDefault(); loadResources(searchTerm); }} className="bg-white rounded-xl shadow-md p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search resources..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button type="submit" className="px-5 py-2.5 bg-orange-600 text-white rounded-lg font-semibold text-sm hover:bg-orange-700 transition-colors shrink-0">Search</button>

          <div className="flex items-center gap-2 shrink-0">
            {/* Category Filter Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-xs"
              title="Filter resources by Category"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Sort Order Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-xs"
              title="Sort resources order"
            >
              <option value="newest">Last Added (Newest)</option>
              <option value="oldest">First Added (Oldest)</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="title_desc">Title (Z-A)</option>
            </select>
          </div>
        </form>

        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] table-auto text-left border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider select-none">
                <tr>
                  <th className="py-3.5 px-5 w-[32%]">Title</th>
                  <th className="py-3.5 px-4 w-[18%]">Category</th>
                  <th className="py-3.5 px-4 w-[18%]">Author of Resource</th>
                  <th className="py-3.5 px-4 w-[16%]">Required Plan</th>
                  <th className="py-3.5 px-5 w-[16%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAndSortedResources.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-16 text-slate-400">
                      No resources found matching criteria.
                    </td>
                  </tr>
                ) : filteredAndSortedResources.map((resource) => {
                  const isPublished = resource.isPublished !== false;
                  return (
                    <tr
                      key={resource.id}
                      className={`hover:bg-slate-50/70 transition-colors ${!isPublished ? 'bg-amber-50/25' : ''}`}
                    >
                      {/* Title + inline status indicator */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col gap-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 line-clamp-1" title={resource.title}>
                              {resource.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-mono text-slate-400">#{resource.id}</span>
                            <span className="text-slate-300">•</span>
                            <span className={`inline-flex items-center gap-1 font-medium ${isPublished ? 'text-emerald-700' : 'text-amber-700'
                              }`}>
                              <span className={`size-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {isPublished ? 'Live' : 'Unpublished (Hidden)'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                          {resource.category || 'General'}
                        </span>
                      </td>

                      {/* Author of Resource */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <span className="line-clamp-1" title={resource.subject || resource.author || 'Anonymous'}>
                          {resource.subject || resource.author || 'Anonymous'}
                        </span>
                      </td>

                      {/* Required Plan */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${!resource.requiredPlan || resource.requiredPlan === 'FREE'
                            ? 'bg-slate-100 text-slate-700'
                            : resource.requiredPlan === 'STUDENT_BASIC'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : resource.requiredPlan === 'STUDENT_PLUS'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : resource.requiredPlan === 'RESEARCHER_PRO'
                                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                  : resource.requiredPlan === 'UNIVERSITY'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-purple-50 text-purple-800 border border-purple-200'
                          }`}>
                          {PLATFORM_PLANS.find(p => p.id === resource.requiredPlan)?.name || (resource.requiredPlan || 'FREE').replace('_', ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* 1. Info Button - Teal / Cyan */}
                          <button
                            type="button"
                            onClick={() => setInfoResource(resource)}
                            className="p-1.5 text-teal-600 bg-teal-50/80 hover:bg-teal-100/90 border border-teal-200/80 hover:border-teal-300 rounded-lg transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="View Detailed Resource Information"
                          >
                            <Info className="size-4" />
                          </button>

                          {/* 2. View Preview / Read Button - Indigo / Violet with BookOpen Icon */}
                          <button
                            type="button"
                            onClick={() => openPreviewModal(resource)}
                            className="p-1.5 text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/80 hover:border-indigo-300 rounded-lg transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="Open Document Preview & Reader"
                          >
                            <BookOpen className="size-4" />
                          </button>

                          {/* 3. Main Admin Only: Publish / Unpublish Toggle - Emerald (Globe / Public) vs Amber (Lock / Private) */}
                          {isMainAdmin && (
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(resource)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer border shadow-2xs hover:scale-105 active:scale-95 ${isPublished
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 hover:border-amber-400'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 hover:border-emerald-400'
                                }`}
                              title={isPublished ? 'Unpublish Resource (Hide from user catalog, keep in database)' : 'Publish Resource (Make visible in user catalog)'}
                            >
                              {isPublished ? <Lock className="size-4 text-amber-700" /> : <Globe className="size-4 text-emerald-700" />}
                            </button>
                          )}

                          {/* 4. Edit Button - Vibrant Brand Orange */}
                          <button
                            type="button"
                            onClick={() => openEditModal(resource)}
                            className="p-1.5 text-orange-600 bg-orange-50/80 hover:bg-orange-100/90 border border-orange-200/80 hover:border-orange-300 rounded-lg transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="Edit Resource"
                          >
                            <Edit className="size-4" />
                          </button>

                          {/* 5. Delete Button - Rose / Crimson Red */}
                          <button
                            type="button"
                            onClick={() => handleDelete(resource.id)}
                            className="p-1.5 text-rose-600 bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/80 hover:border-rose-300 rounded-lg transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="Delete Resource"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeCreateModal} />
            <motion.div className="fixed inset-0 flex items-center justify-center z-50 p-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Add New Content</h2>
                  <button onClick={closeCreateModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="size-5 text-gray-500" /></button>
                </div>

                <form onSubmit={handleCreate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input name="title" value={createResource.title} onChange={(e) => setCreateResource((prev) => ({ ...prev, title: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select name="category" value={createResource.category} onChange={(e) => setCreateResource((prev) => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required>
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Author of Resource</label>
                      <input name="subject" value={createResource.subject} onChange={(e) => setCreateResource((prev) => ({ ...prev, subject: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
                      <select name="resourceType" value={createResource.resourceType} onChange={(e) => setCreateResource((prev) => ({ ...prev, resourceType: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required>
                        <option value="">Select a type</option>
                        <option value="pdf">PDF</option>
                        <option value="article">Article</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Plan to Unlock</label>
                      <select name="requiredPlan" value={createResource.requiredPlan} onChange={(e) => setCreateResource((prev) => ({ ...prev, requiredPlan: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-orange-50/30" required>
                        {PLATFORM_PLANS.map((plan) => (
                          <option key={plan.id} value={plan.id}>{plan.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (Card Summary)</label>
                    <textarea
                      name="description"
                      value={createResource.description}
                      onChange={(e) => setCreateResource((prev) => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      placeholder="Brief overview of the resource shown on search and category cards..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
                      required
                    />
                  </div>

                  {createResource.resourceType === 'article' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Article Studio Content</label>
                      <ArticleEditor
                        value={createResource.articleContent || ''}
                        onChange={(val) => setCreateResource((prev) => ({ ...prev, articleContent: val }))}
                      />
                    </div>
                  )}
                  {createResource.resourceType !== 'article' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">File</label>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          ∞ Unlimited Storage (No Cap)
                        </span>
                      </div>
                      <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors bg-slate-50/50 hover:bg-orange-50/20">
                        <UploadIcon className="size-8 text-orange-600 mb-1" />
                        <span className="font-medium text-gray-800 text-sm">
                          {createResource.file ? createResource.file.name : 'Choose a file to upload'}
                        </span>
                        {createResource.file && (
                          <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                            Exact Size: {formatBytes(createResource.file.size)}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">Supported: PDF, DOC, DOCX, TXT • Any file size permitted</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => {
                            const selected = e.target.files?.[0] || null;
                            setCreateResource((prev) => ({ ...prev, file: selected }));
                            setUploadProgress(0);
                            setUploadStats({ loaded: 0, total: selected ? selected.size : 0 });
                          }}
                          className="hidden"
                          required
                        />
                      </label>
                    </div>
                  )}

                  {/* Real-time Upload Progress Indicator */}
                  {uploading && (
                    <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-orange-950">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-orange-600 animate-ping inline-block" />
                          Uploading Resource...
                        </span>
                        <span className="text-sm font-extrabold text-orange-600">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-orange-200/80 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-red-600 h-2.5 rounded-full transition-all duration-150 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-orange-800 font-medium gap-1">
                        <span>Transferred: {formatBytes(uploadStats.loaded)} / {formatBytes(uploadStats.total || (createResource.file?.size || 0))}</span>
                        <div className="flex items-center gap-3">
                          {uploadSpeed && (
                            <span className="font-semibold text-orange-900 bg-orange-100/70 px-1.5 py-0.5 rounded">
                              {uploadSpeed}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Clock className="size-3 text-orange-600" />
                            {uploadProgress === 100 ? 'Finalizing on server...' : formatDuration(uploadEtaSeconds)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {createStatus && <p className="text-sm text-orange-600 font-medium">{createStatus}</p>}

                  <div className="flex items-center gap-3 pt-2">
                    <button type="button" onClick={closeCreateModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={uploading} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-60">
                      <File className="size-4" />
                      {uploading ? `Uploading (${uploadProgress}%)` : 'Add Resource'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeEditModal} />
            <motion.div className="fixed inset-0 flex items-center justify-center z-50 p-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Resource</h2>
                  <button onClick={closeEditModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="size-5 text-gray-500" /></button>
                </div>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                    <input value={formResource.title} onChange={(e) => setFormResource({ ...formResource, title: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Title" required />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                      <select value={formResource.category} onChange={(e) => setFormResource({ ...formResource, category: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" required>
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Author of Resource</label>
                      <input value={formResource.subject} onChange={(e) => setFormResource({ ...formResource, subject: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Author of Resource" required />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Resource Type</label>
                      <select value={formResource.resourceType} onChange={(e) => setFormResource({ ...formResource, resourceType: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm">
                        <option value="pdf">PDF</option>
                        <option value="article">Article</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Minimum Plan to Unlock</label>
                      <select value={formResource.requiredPlan} onChange={(e) => setFormResource({ ...formResource, requiredPlan: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-orange-50/30">
                        {PLATFORM_PLANS.map((plan) => (
                          <option key={plan.id} value={plan.id}>{plan.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Description (Card Summary)</label>
                    <textarea
                      value={formResource.description}
                      onChange={(e) => setFormResource({ ...formResource, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg resize-none text-sm"
                      placeholder="Brief overview of the resource shown on search and category cards..."
                      required
                    />
                  </div>

                  {formResource.resourceType === 'article' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Article Studio Content</label>
                      <ArticleEditor
                        value={formResource.articleContent || ''}
                        onChange={(val) => setFormResource({ ...formResource, articleContent: val })}
                      />
                    </div>
                  )}
                  {formResource.resourceType !== 'article' && formResource.currentFileName && (
                    <div className="flex items-start gap-3 text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-3">
                      <FileText className="size-4 mt-0.5 flex-shrink-0 text-orange-600" />
                      <div>
                        <p className="font-medium text-xs text-orange-900">Current resource file</p>
                        <p className="text-xs text-orange-800 font-mono mt-0.5">{formResource.currentFileName}</p>
                        {formResource.currentFileUrl && (
                          <p className="text-xs text-orange-600 mt-1 break-all">{formResource.currentFileUrl}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {formResource.resourceType !== 'article' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-gray-600">Replace Resource File</label>
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ∞ No Storage Limit
                        </span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => {
                          const selected = e.target.files?.[0] || null;
                          setFormResource({ ...formResource, file: selected });
                          setUpdateProgress(0);
                          setUpdateStats({ loaded: 0, total: selected ? selected.size : 0 });
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm bg-slate-50/50"
                      />
                    </div>
                  )}
                  {formResource.file && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs space-y-1">
                      <p className="text-green-800 font-bold">Selected Replacement File: {formResource.file.name}</p>
                      <p className="text-green-700">Exact File Size: {formatBytes(formResource.file.size)}</p>
                    </div>
                  )}

                  {updatingResource && (
                    <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-orange-950">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-orange-600 animate-ping inline-block" />
                          Uploading Replacement...
                        </span>
                        <span className="text-sm font-extrabold text-orange-600">{updateProgress}%</span>
                      </div>
                      <div className="w-full bg-orange-200/80 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-red-600 h-2.5 rounded-full transition-all duration-150 ease-out"
                          style={{ width: `${updateProgress}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-orange-800 font-medium gap-1">
                        <span>Transferred: {formatBytes(updateStats.loaded)} / {formatBytes(updateStats.total || (formResource.file?.size || 0))}</span>
                        <div className="flex items-center gap-3">
                          {updateSpeed && (
                            <span className="font-semibold text-orange-900 bg-orange-100/70 px-1.5 py-0.5 rounded">
                              {updateSpeed}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Clock className="size-3 text-orange-600" />
                            {updateProgress === 100 ? 'Finalizing update on server...' : formatDuration(updateEtaSeconds)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-4">
                    <button type="button" onClick={closeEditModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={updatingResource} className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-60">
                      {updatingResource ? `Updating (${updateProgress}%)` : 'Update'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reusable Centered Custom Modal Message */}
      <AnimatePresence>
        {previewResource && (
          <>
            <motion.div
              className={`fixed inset-0 bg-black/60 z-50 backdrop-blur-xs ${isPdfFullscreen ? 'hidden' : ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePreviewModal}
            />
            <motion.div
              className={`fixed z-50 ${isPdfFullscreen
                  ? 'inset-0 p-0 m-0 w-screen h-screen'
                  : 'inset-0 flex items-center justify-center p-2 sm:p-4'
                }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div
                ref={pdfContainerRef}
                className={`bg-white shadow-2xl flex flex-col overflow-hidden ${isPdfFullscreen
                    ? 'w-screen h-screen rounded-none border-0'
                    : 'rounded-2xl max-w-5xl w-full max-h-[92vh] border border-gray-200'
                  }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-slate-50/90 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg shrink-0">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{previewResource.title}</h3>
                      <p className="text-xs text-gray-500 truncate">
                        {previewResource.category} • Author: {previewResource.subject || previewResource.author || 'Zyndex Contributor'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={togglePdfFullscreen}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg border border-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title={isPdfFullscreen ? 'Exit Full Screen' : 'View Full Screen'}
                    >
                      {isPdfFullscreen ? (
                        <>
                          <Minimize2 className="size-3.5 text-orange-600" />
                          <span className="hidden sm:inline">Exit Fullscreen</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="size-3.5 text-orange-600" />
                          <span className="hidden sm:inline">Full Screen</span>
                        </>
                      )}
                    </button>
                    {!isPdfFullscreen && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const r = previewResource;
                            closePreviewModal();
                            openEditModal(r);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 rounded-lg border border-orange-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="size-3.5" /> <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const rId = previewResource.id;
                            closePreviewModal();
                            handleDelete(rId);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="size-3.5" /> <span className="hidden sm:inline">Delete</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={closePreviewModal}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      title="Close"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>

                {/* Preview Body */}
                <div className="flex-1 flex flex-col overflow-hidden bg-neutral-800 relative">
                  {isPdfPreview && pdfDocument ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* PDF Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-900 px-4 py-2 text-white select-none shrink-0 border-b border-neutral-700/80">
                        {/* Page navigation */}
                        <div className="flex items-center gap-2">
                          {/* Sidebar toggle only in fullscreen mode */}
                          {isPdfFullscreen && (
                            <>
                              <button
                                type="button"
                                onClick={() => setShowPdfSidebar((prev) => !prev)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${showPdfSidebar
                                    ? 'bg-orange-600/20 text-orange-400 border-orange-500/50'
                                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700 hover:text-white'
                                  }`}
                                title={showPdfSidebar ? 'Hide Page Navigator' : 'Show Page Navigator'}
                              >
                                <PanelLeft className="size-3.5" />
                                <span className="hidden sm:inline">Pages</span>
                              </button>
                              <div className="h-4 w-px bg-neutral-700 mx-0.5" />
                            </>
                          )}

                          <button
                            type="button"
                            disabled={pdfPage <= 1}
                            onClick={() => setPdfPage((page) => Math.max(1, page - (isPdfFullscreen && pdfPageViewMode === 'two-page' ? 2 : 1)))}
                            className="rounded p-1 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                            title="Previous page"
                          >
                            <ChevronLeft className="size-4" />
                          </button>

                          {/* In standard popup: simple clean "Page X / Y". In fullscreen: editable jump input */}
                          {isPdfFullscreen ? (
                            <div className="flex items-center gap-1.5 text-xs bg-neutral-800 px-2 py-0.5 rounded-lg border border-neutral-700">
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
                                className="w-10 text-center bg-neutral-950 text-white rounded border border-neutral-600 py-0.5 text-xs font-bold focus:outline-none focus:border-orange-500"
                              />
                              {pdfPageViewMode === 'two-page' && pdfPage + 1 <= pdfPageCount ? (
                                <span className="text-neutral-400 font-mono">- {pdfPage + 1} of {pdfPageCount}</span>
                              ) : (
                                <span className="text-neutral-400">of {pdfPageCount}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-neutral-300">
                              Page {pdfPage} / {pdfPageCount}
                            </span>
                          )}

                          <button
                            type="button"
                            disabled={pdfPage >= pdfPageCount || (isPdfFullscreen && pdfPageViewMode === 'two-page' && pdfPage + 1 >= pdfPageCount)}
                            onClick={() => setPdfPage((page) => Math.min(pdfPageCount, page + (isPdfFullscreen && pdfPageViewMode === 'two-page' ? 2 : 1)))}
                            className="rounded p-1 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                            title="Next page"
                          >
                            <ChevronRight className="size-4" />
                          </button>
                        </div>

                        {/* Zoom & View Controls */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            type="button"
                            disabled={pdfScale <= 0.6}
                            onClick={() => setPdfScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
                            className="rounded p-1 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                            title="Zoom Out"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-11 text-center text-xs font-mono font-semibold">{Math.round(pdfScale * 100)}%</span>
                          <button
                            type="button"
                            disabled={pdfScale >= 2.5}
                            onClick={() => setPdfScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
                            className="rounded p-1 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                            title="Zoom In"
                          >
                            <Plus className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPdfScale(1.0)}
                            className="rounded p-1 hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
                            title="Reset 100%"
                          >
                            <RotateCcw className="size-3.5" />
                          </button>

                          {/* Extra advanced options (Rotation, Single/Two-Page, Fit Page/Width) shown ONLY when in Fullscreen */}
                          {isPdfFullscreen && (
                            <>
                              <div className="h-4 w-px bg-neutral-700 mx-0.5" />

                              {/* Rotation */}
                              <button
                                type="button"
                                onClick={() => setPdfRotation((r) => (r - 90 + 360) % 360)}
                                className="rounded p-1 hover:bg-white/10 text-neutral-300 hover:text-white cursor-pointer"
                                title={`Rotate Counterclockwise (${(pdfRotation - 90 + 360) % 360}°)`}
                              >
                                <RotateCcw className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPdfRotation((r) => (r + 90) % 360)}
                                className="rounded p-1 hover:bg-white/10 text-neutral-300 hover:text-white cursor-pointer flex items-center gap-1"
                                title={`Rotate Clockwise (${(pdfRotation + 90) % 360}°)`}
                              >
                                <RotateCw className="size-3.5" />
                                {pdfRotation !== 0 && (
                                  <span className="text-[10px] font-mono text-orange-400 font-bold">{pdfRotation}°</span>
                                )}
                              </button>

                              {/* View Mode (Single vs Two-Page) */}
                              <div className="hidden sm:flex items-center bg-neutral-800 p-0.5 rounded-lg border border-neutral-700">
                                <button
                                  type="button"
                                  onClick={() => setPdfPageViewMode('single')}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors ${pdfPageViewMode === 'single'
                                      ? 'bg-neutral-700 text-orange-400 shadow-sm'
                                      : 'text-neutral-400 hover:text-white'
                                    }`}
                                  title="Single Page View"
                                >
                                  <Square className="size-3" />
                                  <span className="hidden md:inline">Single</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPdfPageViewMode('two-page')}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors ${pdfPageViewMode === 'two-page'
                                      ? 'bg-neutral-700 text-orange-400 shadow-sm'
                                      : 'text-neutral-400 hover:text-white'
                                    }`}
                                  title="Two-Page Book View"
                                >
                                  <BookOpenCheck className="size-3" />
                                  <span className="hidden md:inline">Two-Page</span>
                                </button>
                              </div>

                              {/* Fit Mode */}
                              <div className="hidden md:flex items-center bg-neutral-800 p-0.5 rounded-lg border border-neutral-700">
                                <button
                                  type="button"
                                  onClick={() => setPdfFitMode('page')}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors ${pdfFitMode === 'page'
                                      ? 'bg-neutral-700 text-orange-400 shadow-sm'
                                      : 'text-neutral-400 hover:text-white'
                                    }`}
                                  title="Fit Page (Top-to-Bottom)"
                                >
                                  <MoveVertical className="size-3" />
                                  <span>Fit Page</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPdfFitMode('width')}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors ${pdfFitMode === 'width'
                                      ? 'bg-neutral-700 text-orange-400 shadow-sm'
                                      : 'text-neutral-400 hover:text-white'
                                    }`}
                                  title="Fit Width"
                                >
                                  <MoveHorizontal className="size-3" />
                                  <span>Fit Width</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Main Reader View Area with Sidebar */}
                      <div className="flex-1 flex overflow-hidden bg-neutral-800 relative">
                        {/* Sidebar (Thumbnails / TOC) - enabled in fullscreen mode */}
                        {isPdfFullscreen && showPdfSidebar && (
                          <div className="flex h-full w-64 sm:w-72 shrink-0 border-r border-neutral-700 bg-[#252525] text-neutral-200 select-none z-10 shadow-xl">
                            {/* Nav Strip */}
                            <div className="w-11 shrink-0 bg-[#1c1c1c] border-r border-neutral-700/80 flex flex-col items-center py-2.5 gap-2">
                              <button
                                type="button"
                                onClick={() => setPdfSidebarTab('thumbnails')}
                                className={`p-2 rounded-lg transition-all cursor-pointer ${pdfSidebarTab === 'thumbnails'
                                    ? 'bg-neutral-800 text-orange-400 border border-neutral-600 shadow-sm'
                                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                                  }`}
                                title="Page Thumbnails"
                              >
                                <LayoutGrid className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPdfSidebarTab('outline')}
                                className={`p-2 rounded-lg transition-all cursor-pointer ${pdfSidebarTab === 'outline'
                                    ? 'bg-neutral-800 text-orange-400 border border-neutral-600 shadow-sm'
                                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                                  }`}
                                title="Table of Contents"
                              >
                                <ListTree className="size-4" />
                              </button>
                            </div>

                            {/* Panel Content */}
                            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#262626]">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700 bg-[#202020]">
                                <h4 className="font-semibold text-xs text-white flex items-center gap-1.5">
                                  {pdfSidebarTab === 'thumbnails' ? (
                                    <>
                                      <LayoutGrid className="size-3.5 text-orange-400" />
                                      <span>Thumbnails ({pdfPageCount})</span>
                                    </>
                                  ) : (
                                    <>
                                      <ListTree className="size-3.5 text-orange-400" />
                                      <span>Table of Contents</span>
                                    </>
                                  )}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => setShowPdfSidebar(false)}
                                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 cursor-pointer"
                                  title="Close"
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>

                              <div className="flex-1 overflow-y-auto p-3" ref={thumbnailsContainerRef}>
                                {pdfSidebarTab === 'thumbnails' ? (
                                  <div className="space-y-3">
                                    {Array.from({ length: pdfPageCount }).map((_, idx) => {
                                      const pageNum = idx + 1;
                                      const isCurrent = pageNum === pdfPage;
                                      return (
                                        <div
                                          key={pageNum}
                                          onClick={() => setPdfPage(pageNum)}
                                          onMouseEnter={() => renderThumbnail(pageNum)}
                                          className="group cursor-pointer flex flex-col items-center"
                                        >
                                          <div
                                            className={`relative w-28 sm:w-32 aspect-[1/1.414] bg-white rounded overflow-hidden shadow transition-all flex items-center justify-center ${isCurrent
                                                ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-[#262626] shadow-lg'
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
                                                <BookOpen className="size-4 text-neutral-500" />
                                                <span className="text-[10px] text-neutral-400 font-mono">Page {pageNum}</span>
                                              </div>
                                            )}
                                          </div>
                                          <span
                                            className={`text-[11px] mt-1 font-medium transition-colors ${isCurrent ? 'text-orange-400 font-bold' : 'text-neutral-400 group-hover:text-neutral-200'
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
                                      <div className="flex items-center justify-center py-8 text-neutral-400 text-xs">
                                        <div className="size-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
                                        Loading outline...
                                      </div>
                                    ) : pdfOutline && pdfOutline.length > 0 ? (
                                      <div className="space-y-1 text-xs">
                                        {(() => {
                                          const renderNode = (item, depth = 0) => {
                                            const hasChildren = item.items && item.items.length > 0;
                                            const isExpanded = Boolean(expandedOutlineNodes[item.key]);
                                            return (
                                              <div key={item.key} className="space-y-1">
                                                <div
                                                  className={`w-full flex items-center justify-between rounded px-2 py-1 transition-colors group cursor-pointer ${item.pageNumber === pdfPage ? 'bg-orange-500/20 text-orange-300 font-semibold' : 'hover:bg-neutral-800 text-neutral-300'
                                                    }`}
                                                >
                                                  {hasChildren ? (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedOutlineNodes((prev) => ({ ...prev, [item.key]: !prev[item.key] }));
                                                      }}
                                                      className="p-0.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white mr-1"
                                                    >
                                                      <ChevronDown className={`size-3 transition-transform ${isExpanded ? 'rotate-0 text-orange-400' : '-rotate-90'}`} />
                                                    </button>
                                                  ) : (
                                                    <span className="w-4 shrink-0" />
                                                  )}
                                                  <span
                                                    onClick={() => {
                                                      if (item.pageNumber && item.pageNumber >= 1 && item.pageNumber <= pdfPageCount) {
                                                        setPdfPage(item.pageNumber);
                                                      }
                                                    }}
                                                    className="flex-1 text-left truncate hover:text-white text-[11px]"
                                                    title={item.title}
                                                  >
                                                    {item.title}
                                                  </span>
                                                  {item.pageNumber && (
                                                    <span className="text-[10px] text-neutral-500 font-mono shrink-0 ml-1">
                                                      p.{item.pageNumber}
                                                    </span>
                                                  )}
                                                </div>
                                                {hasChildren && isExpanded && (
                                                  <div className="pl-2 space-y-1 border-l border-neutral-700/60 ml-2">
                                                    {item.items.map((sub) => renderNode(sub, depth + 1))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          };
                                          return pdfOutline.map((item) => renderNode(item, 0));
                                        })()}
                                      </div>
                                    ) : (
                                      <div className="py-8 px-2 text-center text-neutral-400 space-y-2">
                                        <ListTree className="size-6 mx-auto text-neutral-600 opacity-60" />
                                        <p className="text-xs font-medium text-neutral-300">No outline embedded</p>
                                        <p className="text-[11px] text-neutral-500">
                                          Use thumbnails to jump to sections.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PDF Canvas Viewport Area */}
                        <div
                          ref={pdfViewerAreaRef}
                          className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-neutral-800 relative"
                        >
                          {isPageRendering && (
                            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-neutral-900/80 backdrop-blur-sm text-neutral-300 text-xs px-3 py-1 rounded-full border border-neutral-700 pointer-events-none shadow-md">
                              <div className="size-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                              <span>Rendering...</span>
                            </div>
                          )}

                          <div className="relative mx-auto w-fit flex flex-col md:flex-row items-center justify-center gap-4 my-auto shrink-0 select-none">
                            {/* Page 1 Canvas */}
                            <div className="relative bg-white shadow-2xl shrink-0">
                              <canvas ref={pdfCanvasRef} className="block select-none bg-white" />
                              <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-4 gap-6 p-6 select-none overflow-hidden">
                                {Array.from({ length: 8 }).map((_, i) => (
                                  <div key={i} className="flex items-center justify-center -rotate-25 text-[10px] font-semibold text-gray-900/[0.18] whitespace-nowrap">
                                    Administrator Inspection • Zyndex Library
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Page 2 Canvas (Two-Page View) */}
                            {pdfPageViewMode === 'two-page' && pdfPage + 1 <= pdfPageCount && (
                              <div className="relative bg-white shadow-2xl shrink-0">
                                <canvas ref={pdfSecondCanvasRef} className="block select-none bg-white" />
                                <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-4 gap-6 p-6 select-none overflow-hidden">
                                  {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="flex items-center justify-center -rotate-25 text-[10px] font-semibold text-gray-900/[0.18] whitespace-nowrap">
                                      Administrator Inspection • Zyndex Library
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
                    <div className="p-8 text-center max-w-md mx-auto my-auto bg-white rounded-2xl border border-red-200">
                      <p className="text-red-800 font-semibold text-sm">Failed to load preview</p>
                      <p className="text-red-600 text-xs mt-1">{previewError}</p>
                    </div>
                  ) : previewResource?.description && !previewResource.fileUrl ? (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 max-w-2xl w-full prose max-w-none m-auto overflow-y-auto max-h-[80vh]">
                      <h4 className="font-bold text-gray-900 mb-2">Description / Article Content:</h4>
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewResource.articleContent || previewResource.description || '') }} />
                    </div>
                  ) : (
                    <div className="text-center py-16 m-auto">
                      <div className="size-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-neutral-300 font-medium">
                        {downloadProgress > 0 ? `Streaming Document (${downloadProgress}%)...` : 'Loading resource preview...'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal Footer Info */}
                {!isPdfFullscreen && (
                  <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 px-6 shrink-0">
                    <span>Resource ID: #{previewResource.id}</span>
                    <span className="font-medium text-orange-600">Admin Inspection Mode</span>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Cloud Storage Manager Detailed Modal */}
        {storageModalOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStorageModalOpen(false)}
            />
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div
                className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-100 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                      <HardDrive className="size-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight">Cloud Storage Manager</h3>
                      <p className="text-xs text-orange-100 mt-0.5">Live file system allocation & space breakdown</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStorageModalOpen(false)}
                    className="size-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                  {/* Primary Storage Capacity Bar */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Total Allocation: {formatStorageSize(storageStats.totalBytes)}</span>
                      <span className="text-orange-600">{storageStats.usedPercentage}% In Use</span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${storageStats.usedPercentage > 85
                            ? 'bg-rose-500'
                            : storageStats.usedPercentage > 70
                              ? 'bg-amber-500'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          }`}
                        style={{ width: `${Math.min(100, Math.max(2, storageStats.usedPercentage))}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                      <span>Used: <strong className="text-slate-800">{formatStorageSize(storageStats.usedBytes)}</strong></span>
                      <span>Available: <strong className="text-emerald-700">{formatStorageSize(storageStats.freeBytes)}</strong></span>
                    </div>
                  </div>

                  {/* 3 Metrics Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-center">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">Free Space</span>
                      <span className="text-lg font-black text-emerald-950 mt-1 block">
                        {formatStorageSize(storageStats.freeBytes)}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">Ready for uploads</span>
                    </div>

                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-center">
                      <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider">Uploads Store</span>
                      <span className="text-lg font-black text-amber-950 mt-1 block">
                        {formatStorageSize(storageStats.uploadsDirBytes)}
                      </span>
                      <span className="text-[10px] text-amber-700 font-medium">PDFs & media</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                      <span className="text-[10px] font-bold text-slate-700 uppercase block tracking-wider">System Files</span>
                      <span className="text-lg font-black text-slate-900 mt-1 block">
                        {formatStorageSize(Math.max(0, (storageStats.usedBytes || 0) - (storageStats.uploadsDirBytes || 0)))}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">OS & containers</span>
                    </div>
                  </div>

                  {/* Detailed Storage Breakdown List */}
                  <div className="space-y-2 text-xs">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Storage Distribution Details</h4>
                    <div className="bg-slate-50 rounded-2xl p-3 divide-y divide-slate-200/80 border border-slate-200">
                      <div className="flex items-center justify-between py-2 text-slate-700">
                        <span className="font-medium flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                          Available Free Cloud Storage
                        </span>
                        <span className="font-mono font-bold text-emerald-700">{formatStorageSize(storageStats.freeBytes)}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 text-slate-700">
                        <span className="font-medium flex items-center gap-2">
                          <span className="size-2 rounded-full bg-amber-500 inline-block" />
                          Platform Uploads Directory
                        </span>
                        <span className="font-mono font-bold text-amber-700">{formatStorageSize(storageStats.uploadsDirBytes)}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 text-slate-700">
                        <span className="font-medium flex items-center gap-2">
                          <span className="size-2 rounded-full bg-slate-500 inline-block" />
                          Root Filesystem Path
                        </span>
                        <span className="font-mono text-slate-600 text-[11px]">{storageStats.uploadDirPath || '/app/backend/uploads'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 text-slate-700">
                        <span className="font-medium flex items-center gap-2">
                          <span className="size-2 rounded-full bg-blue-500 inline-block" />
                          Total Disk Volume
                        </span>
                        <span className="font-mono font-bold text-slate-900">{formatStorageSize(storageStats.totalBytes)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live telemetry synchronized</span>
                  </div>
                  <button
                    onClick={() => setStorageModalOpen(false)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {infoResource && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInfoResource(null)}
            />
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-6 border border-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-orange-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-xl shadow-md shadow-orange-500/20">
                      <FileText className="size-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                          Resource ID #{infoResource.id}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {['article', 'paper'].includes(String(infoResource.resourceType || infoResource.type || '').toLowerCase()) ? 'ARTICLE / PAPER' : 'PDF DOCUMENT'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1 line-clamp-1">{infoResource.title}</h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInfoResource(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Resource Technical File Profile Banner */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <HardDrive className="size-4 text-orange-600" />
                      Resource Technical & Storage Profile
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                      Verified Content File
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Pages</p>
                      <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
                        {infoResource.pageCount ? `${infoResource.pageCount} Pages` : (['article', 'paper'].includes(String(infoResource.resourceType || infoResource.type || '').toLowerCase()) ? 'Single Article' : (infoResource.hasDownload ? 'Detecting Pages...' : 'Interactive Article'))}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Document File Size</p>
                      <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
                        {infoResource.fileSizeBytes ? formatStorageSize(infoResource.fileSizeBytes) : (infoResource.hasDownload ? 'Stored PDF' : 'Interactive Article')}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Content Format</p>
                      <p className="text-base font-bold text-orange-600 mt-0.5 uppercase text-xs sm:text-sm font-mono">
                        {infoResource.fileName ? infoResource.fileName.split('.').pop()?.toUpperCase() : (infoResource.hasDownload ? 'PDF' : 'HTML')}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Catalog Access</p>
                      <p className="text-base font-bold text-emerald-600 mt-0.5 text-xs sm:text-sm">
                        {infoResource.featured !== false ? 'Active & Published' : 'Draft / Unapproved'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Granular Metadata Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Layers className="size-3 text-orange-500" /> Academic Category & Discipline
                    </span>
                    <p className="font-semibold text-slate-800 text-sm">{infoResource.category || 'General'}</p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <User className="size-3 text-orange-600" /> Author / Subject Attribution
                    </span>
                    <p className="font-semibold text-slate-800 text-sm">{infoResource.subject || infoResource.author || 'Anonymous Author'}</p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Shield className="size-3 text-amber-600" /> Required Access Plan
                    </span>
                    <div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${!infoResource.requiredPlan || infoResource.requiredPlan === 'FREE'
                          ? 'bg-gray-100 text-gray-700'
                          : infoResource.requiredPlan === 'STUDENT_BASIC'
                            ? 'bg-blue-100 text-blue-700'
                            : infoResource.requiredPlan === 'STUDENT_PLUS'
                              ? 'bg-indigo-100 text-indigo-700'
                              : infoResource.requiredPlan === 'RESEARCHER_PRO'
                                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}>
                        {PLATFORM_PLANS.find(p => p.id === infoResource.requiredPlan)?.name || (infoResource.requiredPlan || 'FREE').replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Star className="size-3 text-amber-500" /> Reader Rating & Feedback
                    </span>
                    <p className="font-semibold text-slate-800 text-sm">
                      {infoResource.averageRating ? `${Number(infoResource.averageRating).toFixed(1)} ★` : 'No ratings yet'}
                      {infoResource.totalRatings ? ` (${infoResource.totalRatings} reviews)` : ''}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Activity className="size-3 text-orange-500" /> Engagement Telemetry
                    </span>
                    <p className="font-semibold text-slate-800 text-sm">
                      {infoResource.viewCount || 0} Views &bull; {infoResource.downloadCount || 0} Downloads
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Calendar className="size-3 text-slate-500" /> Upload Date & Timestamps
                    </span>
                    <p className="font-semibold text-slate-800 font-mono text-[11px]">
                      {infoResource.createdAt ? new Date(infoResource.createdAt).toLocaleString('en-IN', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Stored Filename & Path */}
                {infoResource.fileName && (
                  <div className="p-3 bg-orange-50/70 border border-orange-100 rounded-xl text-xs space-y-1 font-mono">
                    <span className="text-orange-700 font-bold uppercase tracking-wider text-[10px]">Cloud File Identifier:</span>
                    <p className="text-slate-800 break-all">{infoResource.fileName}</p>
                  </div>
                )}

                {/* Description */}
                {infoResource.description && (
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Description & Summary:</span>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed max-h-32 overflow-y-auto">
                      {infoResource.description}
                    </p>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div>
                    {isMainAdmin && (
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(infoResource)}
                        className={`px-3.5 py-2 font-semibold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${infoResource.isPublished !== false
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                      >
                        {infoResource.isPublished !== false ? (
                          <>
                            <EyeOff className="size-3.5 text-amber-700" />
                            Unpublish (Hide from Users)
                          </>
                        ) : (
                          <>
                            <Eye className="size-3.5 text-emerald-700" />
                            Publish to Live Catalog
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const res = infoResource;
                        setInfoResource(null);
                        openPreviewModal(res);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="size-3.5" />
                      Open Reader Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setInfoResource(null)}
                      className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {modalMessage && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalMessage(null)}
            />
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
                {modalMessage.type === 'success' ? (
                  <div className="size-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm shadow-emerald-500/20">
                    <CheckCircle2 className="size-6 text-emerald-600" />
                  </div>
                ) : (
                  <div className="size-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="size-6" />
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-900">{modalMessage.title || 'Notification'}</h3>
                <p className="text-sm text-slate-500">{modalMessage.text}</p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (modalMessage.action) modalMessage.action();
                      setModalMessage(null);
                    }}
                    className={`flex-1 py-2.5 text-white font-semibold rounded-xl text-xs hover:opacity-95 shadow-md ${modalMessage.type === 'success'
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-orange-500 to-red-600 shadow-orange-500/20'
                      }`}
                  >
                    {modalMessage.buttonText || 'OK'}
                  </button>
                  {modalMessage.cancelText && (
                    <button
                      type="button"
                      onClick={() => setModalMessage(null)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50"
                    >
                      {modalMessage.cancelText}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
