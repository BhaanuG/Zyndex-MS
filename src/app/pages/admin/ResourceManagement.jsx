import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Edit, Trash2, X, FileText, Plus, Upload as UploadIcon, File, AlertTriangle, Link as LinkIcon, Image as ImageIcon, Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import resourceService from '@/services/api/resourceService';

const defaultCategories = [
  'AI',
  'ML',
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
  { id: 'UNIVERSITY', name: 'University', badgeClass: 'bg-purple-100 text-purple-700' },
  { id: 'ENTERPRISE', name: 'Enterprise / Institution', badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
];

const emptyResource = {
  id: null,
  title: '',
  category: '',
  subject: '',
  resourceType: 'pdf',
  requiredPlan: 'FREE',
  description: '',
  file: null,
  currentFileUrl: '',
  currentFileName: '',
};

function ArticleEditor({ value, onChange }) {
  const editorRef = useRef(null);

  const apply = (command, commandValue = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    if (editorRef.current) onChange({ target: { value: editorRef.current.innerHTML } });
  };

  const toolbarButton = (command, commandValue = null, children) => (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        if (command === 'createLink' || command === 'insertImage') {
          const label = command === 'createLink' ? 'Article link URL' : 'Image URL';
          const value = window.prompt(label);
          if (value) apply(command, value);
          return;
        }
        apply(command, commandValue);
      }}
      className="px-2.5 py-1.5 border border-gray-300 rounded hover:bg-white"
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border-b border-gray-200">
        {toolbarButton('bold', null, <strong>B</strong>)}
        {toolbarButton('italic', null, <em>I</em>)}
        {toolbarButton('formatBlock', 'h2', 'H2')}
        {toolbarButton('insertUnorderedList', null, 'List')}
        {toolbarButton('createLink', null, <LinkIcon className="size-4" />)}
        {toolbarButton('insertImage', null, <ImageIcon className="size-4" />)}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={(event) => onChange({ target: { value: event.currentTarget.innerHTML } })}
        className="min-h-48 p-4 prose max-w-none focus:outline-none"
      />
    </div>
  );
}

export default function ResourceManagement() {
  const [searchTerm, setSearchTerm] = useState('');
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
  const [previewResource, setPreviewResource] = useState(null);
  const [previewToken, setPreviewToken] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.15);
  const pdfCanvasRef = useRef(null);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8080/api` : 'http://localhost:8080/api');

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

    import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjsLib) => {
      if (isCancelled) return;
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      loadingTask = pdfjsLib.getDocument({ url: previewBlobUrl });
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
        const viewport = page.getViewport({ scale: pdfScale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

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
    loadResources();
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setCreateStatus('');
    setCreateResource({
      title: '',
      category: '',
      subject: '',
      resourceType: '',
      requiredPlan: 'FREE',
      description: '',
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
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await resourceService.deleteResource(resourceId);
      await loadResources(searchTerm);
    } catch (error) {
      console.error('Failed to delete resource:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setUploading(true);
    setCreateStatus('');

    try {
      const payload = new FormData();
      payload.append('title', createResource.title);
      payload.append('category', createResource.category);
      payload.append('subject', createResource.subject);
      payload.append('resourceType', createResource.resourceType);
      payload.append('requiredPlan', createResource.requiredPlan || 'FREE');
      payload.append('description', createResource.description);
      if (createResource.file) payload.append('file', createResource.file);

      await resourceService.uploadResource(payload);
      setCreateStatus('Resource uploaded successfully.');
      await loadResources(searchTerm);
      await loadCategories();
      closeCreateModal();
    } catch (error) {
      setCreateStatus(error.message || 'Upload failed.');
      setUploading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = new FormData();
      payload.append('title', formResource.title);
      payload.append('category', formResource.category);
      payload.append('subject', formResource.subject);
      payload.append('resourceType', formResource.resourceType);
      payload.append('requiredPlan', formResource.requiredPlan || 'FREE');
      payload.append('description', formResource.description);
      if (formResource.file) payload.append('file', formResource.file);
      await resourceService.updateResource(formResource.id, payload);
      closeEditModal();
      await loadResources(searchTerm);
      await loadCategories();
    } catch (error) {
      setModalMessage({
        title: 'Update Failed',
        text: error.message || 'Failed to update resource.',
        buttonText: 'OK'
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Resource Management</h1>
            <p className="text-gray-600 mt-1">Create, edit, gate by plan tier, and delete PDFs/articles. Showing {resources.length} resources.</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors">
            <Plus className="size-5" />
            Add New Resource
          </button>
        </motion.div>

        <form onSubmit={(e) => { e.preventDefault(); loadResources(searchTerm); }} className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search resources..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-orange-600 text-white rounded-lg">Search</button>
        </form>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
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
                {resources.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-16 text-gray-400">No resources found.</td></tr>
                ) : resources.map((resource) => (
                  <tr key={resource.id} className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900">{resource.title}</td>
                    <td className="py-4 px-6">{resource.category}</td>
                    <td className="py-4 px-6">{resource.subject}</td>
                    <td className="py-4 px-6 uppercase text-xs font-semibold text-gray-500">{resource.type}</td>
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
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
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
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">{createResource.resourceType === 'article' ? 'Linked Article' : 'Description'}</label>
                    {createResource.resourceType === 'article' ? <ArticleEditor value={createResource.description} onChange={(e) => setCreateResource((prev) => ({ ...prev, description: e.target.value }))} /> : <textarea name="description" value={createResource.description} onChange={(e) => setCreateResource((prev) => ({ ...prev, description: e.target.value }))} rows={5} className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none" required />}
                  </div>
                  {createResource.resourceType !== 'article' && <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                    <label className="flex items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors">
                      <UploadIcon className="size-6 text-orange-600" />
                      <span>{createResource.file ? createResource.file.name : 'Choose a file to upload'}</span>
                      <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setCreateResource((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} className="hidden" required />
                    </label>
                  </div>}

                  {createStatus && <p className="text-sm text-orange-600">{createStatus}</p>}

                  <div className="flex items-center gap-3 pt-2">
                    <button type="button" onClick={closeCreateModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={uploading} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-60">
                      <File className="size-4" />
                      {uploading ? 'Uploading...' : 'Add Resource'}
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
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{formResource.resourceType === 'article' ? 'Linked Article' : 'Description'}</label>
                    {formResource.resourceType === 'article' ? <ArticleEditor value={formResource.description} onChange={(e) => setFormResource({ ...formResource, description: e.target.value })} /> : <textarea value={formResource.description} onChange={(e) => setFormResource({ ...formResource, description: e.target.value })} rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg resize-none text-sm" placeholder="Description" required />}
                  </div>
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
                  {formResource.resourceType !== 'article' && <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFormResource({ ...formResource, file: e.target.files?.[0] || null })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />}
                  {formResource.file && (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      Selected file: {formResource.file.name}
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-4">
                    <button type="button" onClick={closeEditModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700">Update</button>
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
                        {previewResource.category} • Author: {previewResource.subject || previewResource.author || 'Zyndex Faculty'}
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
                      <div dangerouslySetInnerHTML={{ __html: previewResource.description }} />
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
                <div className="size-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{modalMessage.title || 'Notification'}</h3>
                <p className="text-sm text-slate-500">{modalMessage.text}</p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (modalMessage.action) modalMessage.action();
                      setModalMessage(null);
                    }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl text-xs hover:opacity-95 shadow-md"
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
