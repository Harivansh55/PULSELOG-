import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Upload, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Zap, 
  Wrench, 
  Clock, 
  Image as ImageIcon,
  X,
  ArrowLeft,
  FileText,
  Send,
  Bold,
  Italic,
  Heading,
  List,
  Code,
  Link2,
  Quote,
  ExternalLink,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { ChangelogItem, ChangelogCategory, ChangelogStatus } from '../types';
import { apiRequest } from '../api/client';
import { useToast } from './Toast';

interface AdminStudioProps {
  onChangelogChange?: () => void;
  onExit?: () => void;
}

const PRESET_COVERS = [
  { name: 'Aurora Gradient', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80' },
  { name: 'Cyber Mesh', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80' },
  { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&q=80' },
  { name: 'Vibrant Wave', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80' },
];

export const AdminStudio: React.FC<AdminStudioProps> = ({ onChangelogChange, onExit }) => {
  const { showToast } = useToast();
  const [changelogs, setChangelogs] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorMode, setEditorMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ChangelogCategory>('New');
  const [status, setStatus] = useState<ChangelogStatus>('Published');
  const [coverImage, setCoverImage] = useState<string>('');
  const [markdown, setMarkdown] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview' | 'split'>('split');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchAdminChangelogs();
  }, []);

  const fetchAdminChangelogs = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: ChangelogItem[] }>('/api/v1/admin/changelogs');
      if (res && res.data) {
        setChangelogs(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch admin releases', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setCategory('New');
    setStatus('Published');
    setCoverImage('');
    setMarkdown('### Overview\n\nWrite release notes and announcements here with **Markdown** formatting.\n\n- Highlight 1\n- Highlight 2\n\n```ts\nconsole.log("PulseLog release notes!");\n```');
    setEditorMode('create');
  };

  const handleOpenEdit = (item: ChangelogItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setStatus(item.status);
    setCoverImage(item.cover_image || '');
    setMarkdown(item.content_markdown);
    setEditorMode('edit');
  };

  const handleDelete = async (id: number, itemTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${itemTitle}"?`)) {
      return;
    }
    try {
      await apiRequest(`/api/v1/admin/changelogs/${id}`, { method: 'DELETE' });
      showToast('Release deleted successfully.', 'success');
      setChangelogs((prev) => prev.filter((c) => c.id !== id));
      onChangelogChange?.();
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const handleTogglePublish = async (item: ChangelogItem) => {
    const newStatus: ChangelogStatus = item.status === 'Published' ? 'Draft' : 'Published';
    try {
      const res = await apiRequest<{ success: boolean; data: ChangelogItem }>(
        `/api/v1/admin/changelogs/${item.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        }
      );
      showToast(
        newStatus === 'Published' ? 'Release published to public timeline!' : 'Reverted to Draft.',
        'success'
      );
      setChangelogs((prev) => prev.map((c) => (c.id === item.id ? res.data : c)));
      onChangelogChange?.();
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  // Image upload handling with multipart + base64 fallback
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPEG, WEBP, GIF).', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size exceeds 5MB limit.', 'error');
      return;
    }

    setUploadingImage(true);

    // Try standard multipart FormData first
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiRequest<{ success: boolean; data: { url: string; filename: string } }>(
        '/api/v1/admin/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (res && res.data && res.data.url) {
        setCoverImage(res.data.url);
        showToast('Cover image uploaded successfully!', 'success');
        setUploadingImage(false);
        return;
      }
    } catch (uploadErr) {
      console.warn('Multipart upload failed, attempting Base64 data URL fallback...', uploadErr);
    }

    // Resilient Fallback: Convert to Base64 and upload via JSON payload
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await apiRequest<{ success: boolean; data: { url: string; filename: string } }>(
            '/api/v1/admin/upload',
            {
              method: 'POST',
              body: JSON.stringify({ data_url: base64Data }),
            }
          );
          if (res && res.data && res.data.url) {
            setCoverImage(res.data.url);
            showToast('Cover image uploaded successfully!', 'success');
          } else {
            // As ultimate fallback, use data URL directly
            setCoverImage(base64Data);
            showToast('Cover image attached!', 'success');
          }
        } catch (fallbackErr: any) {
          showToast(fallbackErr.message || 'Image upload failed', 'error');
        } finally {
          setUploadingImage(false);
        }
      };
      reader.onerror = () => {
        setUploadingImage(false);
        showToast('Failed to read file from disk.', 'error');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadingImage(false);
      showToast(err.message || 'Image upload failed', 'error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Support pasting image directly from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleFileUpload(file);
            break;
          }
        }
      }
    }
  };

  // Markdown Toolbar helper
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = markdown.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newText = markdown.substring(0, start) + replacement + markdown.substring(end);
    setMarkdown(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 50);
  };

  const handleSave = async (forcedStatus?: ChangelogStatus) => {
    if (!title.trim()) {
      showToast('Please provide a title for the changelog.', 'error');
      return;
    }
    if (!markdown.trim()) {
      showToast('Markdown content cannot be empty.', 'error');
      return;
    }

    const payloadStatus = forcedStatus || status;
    setSaving(true);

    try {
      if (editorMode === 'create') {
        const res = await apiRequest<{ success: boolean; data: ChangelogItem }>('/api/v1/admin/changelogs', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            category,
            status: payloadStatus,
            content_markdown: markdown,
            cover_image: coverImage.trim() || null,
          }),
        });
        showToast(
          payloadStatus === 'Published' 
            ? '🎉 Release published successfully to public timeline!' 
            : 'Draft saved successfully!',
          'success'
        );
        setChangelogs([res.data, ...changelogs]);
      } else if (editorMode === 'edit' && editingId) {
        const res = await apiRequest<{ success: boolean; data: ChangelogItem }>(
          `/api/v1/admin/changelogs/${editingId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              title: title.trim(),
              category,
              status: payloadStatus,
              content_markdown: markdown,
              cover_image: coverImage.trim() || null,
            }),
          }
        );
        showToast(
          payloadStatus === 'Published'
            ? '🎉 Release published successfully to public timeline!'
            : 'Release updated successfully!',
          'success'
        );
        setChangelogs(changelogs.map((c) => (c.id === editingId ? res.data : c)));
      }

      onChangelogChange?.();
      setEditorMode('list');
    } catch (err: any) {
      showToast(err.message || 'Save failed. Please check credentials and input.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200"
      onPaste={handlePaste}
    >
      {/* List View */}
      {editorMode === 'list' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Release Management Studio
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Compose, upload cover art, draft, and publish product announcements live to the feed.
              </p>
            </div>
            
            <div className="flex items-center gap-2.5">
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  View Public Timeline
                </button>
              )}
              <button
                id="admin-create-new-btn"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md shadow-sky-600/20 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                New Changelog
              </button>
            </div>
          </div>

          {/* Table / Grid */}
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading releases...</div>
          ) : changelogs.length === 0 ? (
            <div className="text-center py-16 p-8 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">No Changelogs Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Get started by drafting your first product update or feature release announcement.
              </p>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold"
              >
                <Plus className="w-4 h-4" /> Create Release
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Cover</th>
                    <th className="py-3.5 px-4">Title & Slug</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Published Date</th>
                    <th className="py-3.5 px-4">Reactions</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {changelogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        {item.cover_image ? (
                          <img
                            src={item.cover_image}
                            alt=""
                            className="w-12 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                          />
                        ) : (
                          <div className="w-12 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white max-w-sm truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">#{item.slug}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleTogglePublish(item)}
                          title="Click to toggle status between Published and Draft"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                            item.status === 'Published'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Published' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          {item.status}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {item.published_at ? new Date(item.published_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <span>❤️ {item.reactions?.heart ?? 0}</span>
                          <span>🎉 {item.reactions?.celebrate ?? 0}</span>
                          <span>🚀 {item.reactions?.rocket ?? 0}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            id={`edit-log-${item.id}`}
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-slate-800 transition-colors"
                            title="Edit release"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            id={`delete-log-${item.id}`}
                            onClick={() => handleDelete(item.id, item.title)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800 transition-colors"
                            title="Delete release"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Editor & Publishing Studio (Create / Edit) */}
      {(editorMode === 'create' || editorMode === 'edit') && (
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEditorMode('list')}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                title="Back to releases list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editorMode === 'create' ? 'Compose New Changelog' : 'Edit Changelog'}
                </h2>
                <p className="text-xs text-slate-500">Live Markdown Editor & Publishing Pipeline</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave('Draft')}
                disabled={saving}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                id="publish-release-btn"
                onClick={() => handleSave('Published')}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {saving ? 'Publishing...' : 'Publish Release'}
              </button>
            </div>
          </div>

          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Title */}
            <div className="sm:col-span-2 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Release Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="admin-release-title"
                type="text"
                required
                placeholder="e.g. v2.5.0 — High-Performance Search and Markdown Studio"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                id="admin-release-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ChangelogCategory)}
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="New">New (Feature)</option>
                <option value="Improved">Improved (Enhancement)</option>
                <option value="Fixed">Fixed (Bug Fix)</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Release Status
              </label>
              <select
                id="admin-release-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ChangelogStatus)}
                className={`w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                  status === 'Published'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                }`}
              >
                <option value="Published">🟢 Published (Live on feed)</option>
                <option value="Draft">🟡 Draft (Admin preview only)</option>
              </select>
            </div>
          </div>

          {/* Cover Image Upload & Preview Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-500" />
                Cover Banner Image (Optional)
              </span>
              {coverImage && (
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="text-xs text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Remove Image
                </button>
              )}
            </div>

            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 group">
                <img 
                  src={coverImage} 
                  alt="Cover preview" 
                  className="w-full max-h-56 object-cover" 
                  onError={() => showToast('Could not load image preview from URL', 'error')}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-semibold hover:bg-white shadow"
                  >
                    Change Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 rounded-xl text-center bg-slate-50/50 dark:bg-slate-950/50 transition-colors"
              >
                <Upload className="w-8 h-8 text-sky-500 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {uploadingImage ? 'Uploading and optimizing image...' : 'Drag and drop an image file, or click Browse'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3">
                  PNG, JPG, WEBP, GIF up to 5MB. You can also paste directly with Ctrl+V.
                </p>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-sm transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Browse Image File
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                      e.target.value = ''; // reset so same file can be re-picked
                    }
                  }}
                />
              </div>
            )}

            {/* Presets and URL inputs */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
                {PRESET_COVERS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setCoverImage(preset.url)}
                    className="px-2 py-1 text-[11px] rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              {/* Direct URL field */}
              <div className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:max-w-md">
                <span className="text-[11px] text-slate-400 shrink-0">Or URL:</span>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Markdown Editor Controls & Toolbar */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            {/* Toolbar */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => insertMarkdown('**', '**')}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('*', '*')}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('## ')}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Heading"
                >
                  <Heading className="w-3.5 h-3.5" />
                </button>
                <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
                <button
                  type="button"
                  onClick={() => insertMarkdown('- ')}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Unordered List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('```ts\n', '\n```')}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Code Block"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('[', '](https://example.com)')}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Link"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('> ')}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Quote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* View Tabs */}
              <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'write'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('split')}
                  className={`hidden md:inline-block px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'split'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Split
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'preview'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Editor Canvas */}
            <div className={`grid ${activeTab === 'split' ? 'grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800' : 'grid-cols-1'}`}>
              {(activeTab === 'write' || activeTab === 'split') && (
                <div className="p-4">
                  <textarea
                    ref={textareaRef}
                    rows={16}
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    placeholder="Write changelog content in Markdown..."
                    className="w-full h-full min-h-[350px] bg-transparent resize-y font-mono text-sm text-slate-800 dark:text-slate-200 focus:outline-none leading-relaxed"
                  />
                </div>
              )}

              {(activeTab === 'preview' || activeTab === 'split') && (
                <div className="p-6 overflow-y-auto max-h-[500px] bg-slate-50/40 dark:bg-slate-950/40">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Rendered Preview
                  </div>
                  {coverImage && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                      <img src={coverImage} alt="" className="w-full h-40 object-cover" />
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {title || 'Untitled Release'}
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      {category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {status === 'Published' ? 'Will publish immediately' : 'Will be saved as Draft'}
                    </span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {markdown || '*No content written yet.*'}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditorMode('list')}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSave('Draft')}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                id="publish-release-bottom-btn"
                onClick={() => handleSave('Published')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {saving ? 'Publishing...' : 'Publish Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
