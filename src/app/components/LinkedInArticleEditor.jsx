import { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image as ImageIcon, Link as LinkIcon, Unlink, Quote, Code, 
  Minus, Sparkles, Upload, Palette, Type, HelpCircle, Eye, Edit3, X, Check
} from 'lucide-react';

const FONT_FAMILIES = [
  { label: 'Inter (Default Sans)', value: 'Inter, sans-serif' },
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'Merriweather (Editorial Serif)', value: 'Merriweather, serif' },
  { label: 'Lora (Literary Serif)', value: 'Lora, serif' },
  { label: 'Playfair Display (Header Serif)', value: "'Playfair Display', serif" },
  { label: 'Roboto Mono (Code/Technical)', value: "'Roboto Mono', monospace" },
  { label: 'Fira Code', value: "'Fira Code', monospace" },
  { label: 'Georgia (Classic)', value: 'Georgia, serif' },
  { label: 'Cinzel (Scholarly Titling)', value: 'Cinzel, serif' },
];

const FONT_SIZES = [
  { label: 'Small (13px)', value: '1' },
  { label: 'Regular (15px)', value: '3' },
  { label: 'Medium (18px)', value: '4' },
  { label: 'Large (22px)', value: '5' },
  { label: 'Extra Large (28px)', value: '6' },
  { label: 'Display (36px)', value: '7' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: 'transparent' },
  { label: 'Soft Amber', value: '#fef3c7' },
  { label: 'Emerald Glow', value: '#d1fae5' },
  { label: 'Sky Blue', value: '#e0f2fe' },
  { label: 'Rose Accent', value: '#ffe4e6' },
  { label: 'Purple Mist', value: '#f3e8ff' },
];

export default function LinkedInArticleEditor({ value, onChange, placeholder = 'Write your publication article story here...' }) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'preview'
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [savedSelection, setSavedSelection] = useState(null);

  // Read / extract cover image if present inside html, or maintain cover state
  const [coverImage, setCoverImage] = useState(() => {
    if (!value) return '';
    const match = value.match(/data-article-cover="true"[^>]*src="([^"]+)"/i) || value.match(/class="[^"]*article-cover-banner[^"]*"[^>]*src="([^"]+)"/i);
    return match ? match[1] : '';
  });

  // Keep internal state in sync with external value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Do not disturb innerHTML while focused/typing unless tab switched
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const saveSelection = () => {
    if (window.getSelection) {
      const sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        setSavedSelection(sel.getRangeAt(0));
      }
    }
  };

  const restoreSelection = () => {
    if (savedSelection && window.getSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelection);
    }
  };

  const notifyChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange?.({ target: { value: content } });
    }
  };

  const applyCommand = (command, commandValue = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    notifyChange();
  };

  // Convert uploaded image file (PNG/JPG/WEBP) to base64 DataURL
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result;
      if (base64Url) {
        insertImageAtCursor(base64Url, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Insert image tag right in between paragraphs at cursor position
  const insertImageAtCursor = (src, alt = 'Article Image') => {
    editorRef.current?.focus();
    const imageHtml = `
      <figure class="article-body-figure my-6 clear-both" contenteditable="false">
        <img src="${src}" alt="${alt}" class="rounded-2xl max-w-full w-full max-h-[520px] object-cover shadow-md border border-slate-200" />
        <figcaption class="text-center text-xs text-slate-500 italic mt-2.5 font-medium" contenteditable="true">
          Caption: ${alt} (Click to edit caption)
        </figcaption>
      </figure>
      <p><br></p>
    `;
    document.execCommand('insertHTML', false, imageHtml);
    notifyChange();
  };

  // Set top cover banner (LinkedIn article style cover image)
  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result;
      if (base64Url) {
        setCoverImage(base64Url);
        // Inject or update cover in editor HTML
        if (editorRef.current) {
          const currentHtml = editorRef.current.innerHTML;
          // Strip any old cover banner
          const stripped = currentHtml.replace(/<div class="article-cover-wrapper"[\s\S]*?<\/div>/gi, '').trim();
          const coverBannerHtml = `
            <div class="article-cover-wrapper mb-8 clear-both" contenteditable="false">
              <img data-article-cover="true" src="${base64Url}" alt="Article Cover" class="w-full max-h-[420px] object-cover rounded-2xl shadow-lg border border-slate-200/80" />
            </div>
          `;
          editorRef.current.innerHTML = coverBannerHtml + stripped;
          notifyChange();
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeCoverImage = () => {
    setCoverImage('');
    if (editorRef.current) {
      editorRef.current.innerHTML = editorRef.current.innerHTML.replace(/<div class="article-cover-wrapper"[\s\S]*?<\/div>/gi, '').trim();
      notifyChange();
    }
  };

  // Insert rich link
  const openLinkModal = () => {
    saveSelection();
    const sel = window.getSelection()?.toString() || '';
    setLinkText(sel);
    setLinkUrl('');
    setShowLinkModal(true);
  };

  const applyLink = (e) => {
    e.preventDefault();
    setShowLinkModal(false);
    restoreSelection();
    if (!linkUrl) return;

    let targetUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    if (linkText) {
      const linkHtml = `<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="text-orange-600 hover:text-orange-700 underline font-semibold transition-colors">${linkText}</a>`;
      document.execCommand('insertHTML', false, linkHtml);
    } else {
      document.execCommand('createLink', false, targetUrl);
    }
    notifyChange();
  };

  // Block formats
  const handleHeadingChange = (e) => {
    const val = e.target.value;
    if (val) {
      applyCommand('formatBlock', val);
      e.target.value = '';
    }
  };

  const handleFontFamilyChange = (e) => {
    const val = e.target.value;
    if (val) {
      applyCommand('fontName', val);
      e.target.value = '';
    }
  };

  const handleFontSizeChange = (e) => {
    const val = e.target.value;
    if (val) {
      applyCommand('fontSize', val);
      e.target.value = '';
    }
  };

  const handleHighlight = (color) => {
    applyCommand('hiliteColor', color);
  };

  return (
    <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
      {/* Top Banner / Mode Toggle Header */}
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-orange-600 animate-pulse"></div>
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-orange-600" />
            Publication Article Studio
          </span>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">&bull; Rich Editorial Layout (LinkedIn-Style)</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'write' ? 'bg-white text-orange-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="size-3.5" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'preview' ? 'bg-white text-orange-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="size-3.5" />
            Reader Preview
          </button>
        </div>
      </div>

      {activeTab === 'write' && (
        <>
          {/* Cover Photo / Header Banner Upload Bar */}
          <div className="bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-slate-50 px-4 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleCoverUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="px-3.5 py-2 bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-200 hover:border-orange-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Upload className="size-3.5 text-orange-600" />
                <span>{coverImage ? 'Replace Cover Image' : 'Add Cover Image (Header Banner)'}</span>
              </button>

              {coverImage && (
                <button
                  type="button"
                  onClick={removeCoverImage}
                  className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Remove cover image"
                >
                  <X className="size-3.5" />
                  Remove Cover
                </button>
              )}
            </div>
          </div>

          {/* Full Rich Text Formatting Toolbar (Word / LinkedIn / Medium style) */}
          <div className="p-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center gap-1.5 text-slate-700 sticky top-0 z-20">
            {/* Font Family Dropdown */}
            <div className="flex items-center gap-1">
              <Type className="size-3.5 text-slate-400 ml-1" />
              <select
                onChange={handleFontFamilyChange}
                defaultValue=""
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 outline-none font-medium text-slate-700 max-w-[150px] cursor-pointer"
                title="Font Family"
              >
                <option value="" disabled>Font Style</option>
                {FONT_FAMILIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Font Size Dropdown */}
            <select
              onChange={handleFontSizeChange}
              defaultValue=""
              className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 outline-none font-medium text-slate-700 cursor-pointer"
              title="Text Size"
            >
              <option value="" disabled>Size</option>
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Headings Selector */}
            <select
              onChange={handleHeadingChange}
              defaultValue=""
              className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 outline-none font-bold text-slate-800 cursor-pointer"
              title="Headings"
            >
              <option value="" disabled>Format</option>
              <option value="h1">Heading 1 (Main Title)</option>
              <option value="h2">Heading 2 (Section)</option>
              <option value="h3">Heading 3 (Sub-Section)</option>
              <option value="h4">Heading 4 (Minor Heading)</option>
              <option value="p">Normal Paragraph</option>
              <option value="blockquote">Pull Quote / Callout</option>
              <option value="pre">Code / Monospace Block</option>
            </select>

            <div className="h-5 w-px bg-slate-200 mx-1"></div>

            {/* Inline Styles */}
            <button
              type="button"
              onClick={() => applyCommand('bold')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Bold (Ctrl+B)"
            >
              <Bold className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => applyCommand('italic')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Italic (Ctrl+I)"
            >
              <Italic className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => applyCommand('underline')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Underline (Ctrl+U)"
            >
              <Underline className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => applyCommand('strikeThrough')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Strikethrough"
            >
              <Strikethrough className="size-4" />
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1"></div>

            {/* Text Alignment */}
            <button
              type="button"
              onClick={() => applyCommand('justifyLeft')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Align Left"
            >
              <AlignLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => applyCommand('justifyCenter')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Align Center"
            >
              <AlignCenter className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => applyCommand('justifyRight')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Align Right"
            >
              <AlignRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => applyCommand('justifyFull')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Justify Text"
            >
              <AlignJustify className="size-4" />
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1"></div>

            {/* Lists & Quotes */}
            <button
              type="button"
              onClick={() => applyCommand('insertUnorderedList')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Bulleted List"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => applyCommand('insertOrderedList')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Numbered List"
            >
              <ListOrdered className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => applyCommand('formatBlock', 'blockquote')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Quote / Callout Box"
            >
              <Quote className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => applyCommand('insertHorizontalRule')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Horizontal Divider"
            >
              <Minus className="size-4" />
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1"></div>

            {/* INLINE IMAGE UPLOAD (PNG/JPG/WEBP) IN BETWEEN PARAGRAPHS */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Insert Image (PNG, JPG, WebP) between paragraphs"
            >
              <ImageIcon className="size-3.5" />
              <span>Insert Image</span>
            </button>

            {/* LINK INSERTION MODAL TRIGGER */}
            <button
              type="button"
              onClick={openLinkModal}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Insert Link"
            >
              <LinkIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => applyCommand('unlink')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
              title="Remove Link"
            >
              <Unlink className="size-4" />
            </button>

            {/* Highlight color picker */}
            <div className="flex items-center gap-1 ml-1">
              {HIGHLIGHT_COLORS.slice(1).map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleHighlight(c.value)}
                  style={{ backgroundColor: c.value }}
                  className="size-4 rounded-full border border-slate-300 hover:scale-125 transition-transform cursor-pointer"
                  title={`Highlight: ${c.label}`}
                />
              ))}
            </div>
          </div>

          {/* ContentEditable Article Canvas */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={notifyChange}
            onBlur={notifyChange}
            data-placeholder={placeholder}
            className="min-h-[380px] max-h-[640px] p-6 sm:p-8 overflow-y-auto outline-none prose prose-slate max-w-none focus:outline-none article-editable-canvas"
            style={{
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: '15px',
              lineHeight: '1.8'
            }}
          />
        </>
      )}

      {/* Reader Preview Tab (Renders exact layout seen by scholars) */}
      {activeTab === 'preview' && (
        <div className="p-6 sm:p-10 bg-slate-50/50 min-h-[420px] max-h-[700px] overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200">
            {editorRef.current?.innerHTML ? (
              <div 
                className="article-content prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: editorRef.current.innerHTML }} 
              />
            ) : (
              <div className="py-16 text-center text-slate-400">
                <HelpCircle className="size-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No article text written yet</p>
                <p className="text-xs text-slate-400 mt-1">Switch to the "Write" tab to craft your article content and upload images.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rich Link Dialog */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="size-4 text-orange-600" />
                <h3 className="text-sm font-bold text-slate-900">Insert Hyperlink</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={applyLink} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Text (Optional)</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. Reference Paper or Website"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destination URL</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/research-paper"
                  required
                  autoFocus
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Apply Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
