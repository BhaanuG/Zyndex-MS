import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Edit, Trash2, X, FileText, Plus, Upload as UploadIcon, File, AlertTriangle, Link as LinkIcon, Image as ImageIcon, Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download, Clock, CheckCircle, CheckCircle2, HardDrive, Database, Activity, Cpu } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import { useAuth } from '@/app/context/AuthContext';
import resourceService from '@/services/api/resourceService';
import logService from '@/services/api/logService';
import DOMPurify from 'dompurify';
import LinkedInArticleEditor from '@/app/components/LinkedInArticleEditor';

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
  const { user } = useAuth();
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
  const [previewToken, setPreviewToken] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.15);
  const pdfCanvasRef = useRef(null);
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
    setPdfScale(1.15);

    try {
      const tokenRes = await resourceService.getPreviewToken(resource.id);
      setPreviewToken(tokenRes?.token || '');
    } catch (err) {
      console.error('Failed to get preview token:', err);
      setPreviewToken('');
    }
  };

  const closePreviewModal = () => {
    setPreviewResource(null);
    setPreviewToken('');
    setPreviewBlobUrl('');
    setPreviewError('');
    setPdfDocument(null);
  };

  const isPdfPreview = previewResource && (
    /\.pdf($|\?)/i.test(previewResource.fileUrl || '') || 
    /\.pdf($|\?)/i.test(previewResource.fileName || '')
  );

  const previewFileUrl = previewResource?.fileUrl
    ? (previewToken ? `${apiBaseUrl}/resources/${previewResource.id}/file?token=${encodeURIComponent(previewToken)}` : '')
    : '';

  useEffect(() => {
    if (!previewResource || !previewFileUrl || !isPdfPreview) return undefined;

    let objectUrl = '';
    const controller = new AbortController();
    setPreviewBlobUrl('');
    setPreviewError('');

    fetch(previewFileUrl, {
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
        if (controller.signal.aborted) return;
        setPreviewError(error.message || 'Failed to load preview.');
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewResource, previewFileUrl, isPdfPreview]);

  useEffect(() => {
    if (!previewBlobUrl || !isPdfPreview) return undefined;

    let isCancelled = false;
    let loadingTask = null;

    Promise.all([
      import('pdfjs-dist/build/pdf.mjs'),
      import('pdfjs-dist/build/pdf.worker.min.mjs')
    ]).then(([pdfjsLib, workerModule]) => {
      if (isCancelled) return;
      if (typeof globalThis !== 'undefined' && workerModule?.WorkerMessageHandler) {
        globalThis.pdfjsWorker = { WorkerMessageHandler: workerModule.WorkerMessageHandler };
      }

      loadingTask = pdfjsLib.getDocument({
        url: previewBlobUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/',
        cMapPacked: true,
      });
      loadingTask.promise
        .then((doc) => {
          if (isCancelled) return;
          setPdfDocument(doc);
          setPdfPageCount(doc.numPages || 1);
          setPdfPage(1);
        })
        .catch((error) => {
          if (!isCancelled) {
            setPreviewError(error?.message || 'Failed to parse PDF preview.');
          }
        });
    });

    return () => {
      isCancelled = true;
      if (loadingTask?.destroy) loadingTask.destroy();
    };
  }, [previewBlobUrl, isPdfPreview]);

  useEffect(() => {
    if (!pdfDocument || !pdfCanvasRef.current) return undefined;

    let renderTask = null;
    let isCancelled = false;

    pdfDocument
      .getPage(pdfPage)
      .then((page) => {
        if (isCancelled) return;
        const canvas = pdfCanvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: pdfScale * dpr });
        const cssViewport = page.getViewport({ scale: pdfScale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(cssViewport.width)}px`;
        canvas.style.height = `${Math.floor(cssViewport.height)}px`;

        renderTask = page.render({
          canvasContext: context,
          viewport,
        });

        return renderTask.promise;
      })
      .catch((error) => {
        if (!isCancelled && error?.name !== 'RenderingCancelledException') {
          console.error('PDF render failed:', error);
        }
      });

    return () => {
      isCancelled = true;
      if (renderTask?.cancel) renderTask.cancel();
    };
  }, [pdfDocument, pdfPage, pdfScale]);

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
      }).catch(() => {});

      await loadResources(searchTerm);
    } catch (error) {
      console.error('Failed to delete resource:', error);
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
      }).catch(() => {});
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
      }).catch(() => {});
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
                Add New Resource
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
                  className={`h-full transition-all duration-500 ${
                    storageStats.usedPercentage > 85 ? 'bg-rose-500' : storageStats.usedPercentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'
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

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Title</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Category</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Author of Resource</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Type</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Required Plan</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedResources.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-16 text-gray-400">No resources found matching criteria.</td></tr>
                ) : filteredAndSortedResources.map((resource) => (
                  <tr key={resource.id} className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900">{resource.title}</td>
                    <td className="py-4 px-6">{resource.category}</td>
                    <td className="py-4 px-6">{resource.subject}</td>
                    <td className="py-4 px-6 uppercase text-xs font-semibold text-gray-500">
                      {['article', 'paper'].includes(String(resource.resourceType || resource.type || '').toLowerCase()) ? 'ARTICLE' : (resource.resourceType || resource.type || 'PDF')}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        !resource.requiredPlan || resource.requiredPlan === 'FREE'
                          ? 'bg-gray-100 text-gray-700'
                          : resource.requiredPlan === 'STUDENT_BASIC'
                          ? 'bg-blue-100 text-blue-700'
                          : resource.requiredPlan === 'STUDENT_PLUS'
                          ? 'bg-indigo-100 text-indigo-700'
                          : resource.requiredPlan === 'RESEARCHER_PRO'
                          ? 'bg-orange-100 text-orange-700 border border-orange-200'
                          : resource.requiredPlan === 'UNIVERSITY'
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        {PLATFORM_PLANS.find(p => p.id === resource.requiredPlan)?.name || (resource.requiredPlan || 'FREE').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openPreviewModal(resource)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Preview Resource Modal"><Eye className="size-4" /></button>
                        <button onClick={() => openEditModal(resource)} className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors" title="Edit Resource"><Edit className="size-4" /></button>
                        <button onClick={() => handleDelete(resource.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Delete Resource"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                  <h2 className="text-xl font-semibold text-gray-900">Add New Resource</h2>
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
                    <div className="flex items-start gap-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-3">
                      <FileText className="size-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Current resource file</p>
                        <p>{formResource.currentFileName}</p>
                        {formResource.currentFileUrl && (
                          <p className="text-xs text-blue-600 mt-1 break-all">{formResource.currentFileUrl}</p>
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
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePreviewModal}
            />
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-slate-50/80">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                      <FileText className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base line-clamp-1">{previewResource.title}</h3>
                      <p className="text-xs text-gray-500">
                        {previewResource.category} • Author: {previewResource.subject || previewResource.author || 'Zyndex Contributor'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const r = previewResource;
                        closePreviewModal();
                        openEditModal(r);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 rounded-lg border border-orange-200 transition-colors flex items-center gap-1"
                    >
                      <Edit className="size-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rId = previewResource.id;
                        closePreviewModal();
                        handleDelete(rId);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </button>
                    <button
                      type="button"
                      onClick={closePreviewModal}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-1"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>

                {/* Preview Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center justify-center min-h-[350px]">
                  {isPdfPreview && previewBlobUrl && pdfDocument ? (
                    <div className="w-full flex flex-col items-center">
                      {/* PDF Controls */}
                      <div className="flex items-center justify-between gap-3 bg-neutral-900 text-white px-4 py-2 rounded-t-xl w-full max-w-2xl select-none text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={pdfPage <= 1}
                            onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                            className="p-1 hover:bg-white/10 rounded disabled:opacity-40"
                          >
                            <ChevronLeft className="size-4" />
                          </button>
                          <span>Page {pdfPage} / {pdfPageCount}</span>
                          <button
                            type="button"
                            disabled={pdfPage >= pdfPageCount}
                            onClick={() => setPdfPage((p) => Math.min(pdfPageCount, p + 1))}
                            className="p-1 hover:bg-white/10 rounded disabled:opacity-40"
                          >
                            <ChevronRight className="size-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPdfScale((s) => Math.max(0.75, s - 0.15))}
                            className="p-1 hover:bg-white/10 rounded"
                            title="Zoom Out"
                          >
                            <ZoomOut className="size-4" />
                          </button>
                          <span>{Math.round(pdfScale * 100)}%</span>
                          <button
                            type="button"
                            onClick={() => setPdfScale((s) => Math.min(2.5, s + 0.15))}
                            className="p-1 hover:bg-white/10 rounded"
                            title="Zoom In"
                          >
                            <ZoomIn className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPdfScale(1.15)}
                            className="p-1 hover:bg-white/10 rounded"
                            title="Reset Zoom"
                          >
                            <RotateCcw className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* PDF Canvas with Watermark */}
                      <div className="relative max-h-[60vh] overflow-auto bg-neutral-800 p-4 rounded-b-xl w-full max-w-2xl flex justify-center">
                        <div className="relative shadow-2xl bg-white">
                          <canvas ref={pdfCanvasRef} className="block select-none" />
                          <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-4 gap-6 p-6 select-none overflow-hidden">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} className="flex items-center justify-center -rotate-25 text-[10px] font-semibold text-gray-900/[0.18] whitespace-nowrap">
                                Administrator Preview • Zyndex Library
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : previewError ? (
                    <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center max-w-md">
                      <p className="text-red-800 font-semibold text-sm">Failed to load preview</p>
                      <p className="text-red-600 text-xs mt-1">{previewError}</p>
                    </div>
                  ) : previewResource?.description && !previewResource.fileUrl ? (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 max-w-2xl w-full prose max-w-none">
                      <h4 className="font-bold text-gray-900 mb-2">Description / Article Content:</h4>
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewResource.articleContent || previewResource.description || '') }} />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="size-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-gray-600">Loading document preview...</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer Info */}
                <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 px-6">
                  <span>Resource ID: #{previewResource.id}</span>
                  <span className="font-medium text-orange-600">Admin Inspection Mode (Downloads Disabled)</span>
                </div>
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
                        className={`h-full transition-all duration-500 ${
                          storageStats.usedPercentage > 85
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
                    className={`flex-1 py-2.5 text-white font-semibold rounded-xl text-xs hover:opacity-95 shadow-md ${
                      modalMessage.type === 'success'
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
