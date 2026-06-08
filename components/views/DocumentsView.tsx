// components/views/DocumentsView.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/app/context/AppContext';
import { toast } from '@/app/context/ToastContext';
import { getDocumentsAction, createDocumentActionDirect, deleteDocumentActionDirect } from '@/app/actions/documents';
import { SmartCard } from '@/components/ui/SmartCard';
import PageHeader from '@/components/ui/PageHeader';

interface DocumentItem {
  id: string;
  name: string;
  url: string;
  type: 'CONTRACT' | 'BLUEPRINT' | 'ID' | 'IMAGE' | 'OTHER';
  linkedTo?: string | null;
  linkedType?: 'PROPERTY' | 'PROJECT' | 'LEAD' | null;
  size: number;
  createdAt: string;
}

export default function DocumentsView() {
  const { theme, lang } = useApp();
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Upload panel state
  const [uploadOpen, setUploadOpen] = useState(false);

  // Form fields for upload
  const [docType, setDocType] = useState<'CONTRACT' | 'BLUEPRINT' | 'ID' | 'IMAGE' | 'OTHER'>('CONTRACT');
  const [linkedTo, setLinkedTo] = useState('');
  const [linkedType, setLinkedType] = useState<'PROPERTY' | 'PROJECT' | 'LEAD' | ''>('');

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await getDocumentsAction();
      if (res.success && res.data) {
        setDocuments(res.data as any[]);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await createDocumentActionDirect({
        name: file.name,
        type: docType,
        linkedTo: linkedTo || null,
        linkedType: linkedType || null,
        size: file.size,
      });

      if (res.success) {
        setSuccess(isArabic ? 'تم رفع المستند بنجاح وحفظه بالمستودع.' : 'Document uploaded successfully.');
        fetchDocs();
        setLinkedTo('');
        setLinkedType('');
      } else {
        setError(res.error || 'Upload failed');
      }
    } catch (err: any) {
      setError(isArabic ? 'حدث خطأ في الاتصال بالخادم.' : 'Connection error.');
    } finally {
      setUploading(false);
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 4000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isArabic ? 'هل أنت متأكد من حذف هذا الملف نهائياً؟' : 'Are you sure you want to delete this file?')) return;
    try {
      const res = await deleteDocumentActionDirect(id);
      if (res.success) {
        setSuccess(isArabic ? 'تم حذف الملف بنجاح.' : 'File deleted.');
        setDocuments(documents.filter(d => d.id !== id));
        if (previewDoc?.id === id) setPreviewDoc(null);
      } else {
        setError(res.error || 'Delete failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'CONTRACT': return isArabic ? 'عقد موحد' : 'Contract';
      case 'BLUEPRINT': return isArabic ? 'مخطط كروكي' : 'Blueprint';
      case 'ID': return isArabic ? 'بطاقة هوية' : 'ID Document';
      case 'IMAGE': return isArabic ? 'صورة عقار' : 'Image';
      default: return isArabic ? 'ملحقات أخرى' : 'Other';
    }
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'CONTRACT': return 'ph-file-text text-emerald-500';
      case 'BLUEPRINT': return 'ph-compass text-blue-500';
      case 'ID': return 'ph-identification-card text-purple-500';
      case 'IMAGE': return 'ph-image text-amber-500';
      default: return 'ph-file text-[var(--nc-foreground-muted)]';
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const DOCS_TITLE = {
    AR: { title: 'مستودع الوثائق المشترك', desc: 'تحكَّم في مخططات المشاريع، العقود والبطاقات بمكان مركزي آمن.' },
    EN: { title: 'Shared Document Repository', desc: 'Manage project blueprints, contracts and IDs in one secure central location.' },
  };
  const pageText = DOCS_TITLE[lang] || DOCS_TITLE.AR;

  return (
    <div className="space-y-5 p-6" dir={dir}>

      <PageHeader title={pageText.title} description={pageText.desc} />

      {/* Messages */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-pulse">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* ── Document Grid Card (full width, no title) ── */}
      <SmartCard className="p-5 space-y-4">
        {/* Toolbar: filters + search + view toggle */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'CONTRACT', 'BLUEPRINT', 'ID', 'IMAGE', 'OTHER'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                  filterType === type
                    ? 'bg-[var(--nc-accent)] text-[var(--nc-foreground)] border-transparent shadow-sm'
                    : 'border-[var(--nc-border)] text-[var(--nc-foreground-muted)] hover:border-[var(--nc-accent-border)]'
                }`}
              >
                {type === 'ALL' ? (isArabic ? 'الكل' : 'All') : getDocTypeLabel(type)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative w-full sm:w-44 bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-lg px-3 py-2 flex items-center gap-1.5">
              <i className="ph ph-magnifying-glass text-[var(--nc-foreground-muted)] text-xs"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isArabic ? 'ابحث باسم الملف...' : 'Search files...'}
                className="bg-transparent border-none outline-none text-xs w-full text-[var(--nc-foreground)] font-bold"
              />
            </div>
            {/* View mode */}
            <button
              onClick={() => setViewMode('grid')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-colors ${viewMode === 'grid' ? 'bg-[var(--nc-accent-soft)] border-[var(--nc-accent-border)] text-[var(--nc-accent-text)]' : 'border-[var(--nc-border)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]'}`}
            >
              <i className="ph ph-squares-four"></i>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-colors ${viewMode === 'list' ? 'bg-[var(--nc-accent-soft)] border-[var(--nc-accent-border)] text-[var(--nc-accent-text)]' : 'border-[var(--nc-border)] text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]'}`}
            >
              <i className="ph ph-list"></i>
            </button>
          </div>
        </div>

        {/* Documents Grid/List */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-[var(--nc-accent-border)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-[var(--nc-foreground-muted)]">{isArabic ? 'جاري الاتصال بمستودع الملفات...' : 'Syncing document archive...'}</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-20 border border-dashed border-[var(--nc-border)] rounded-2xl text-center text-[var(--nc-foreground-muted)]">
            <i className="ph ph-file-x text-4xl block mb-2 opacity-50"></i>
            <p className="text-xs">{isArabic ? 'لم نعثر على أي مستندات تطابق الفلتر.' : 'No files matching criteria.'}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                className="bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] p-4 rounded-xl shadow-sm hover:border-[var(--nc-accent-border)]/40 transition-all flex flex-col justify-between group h-40"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="w-8 h-8 rounded-lg bg-[var(--nc-surface)] border border-[var(--nc-border)] flex items-center justify-center">
                      <i className={`ph-fill ${getDocIcon(doc.type)} text-lg`}></i>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 text-rose-500 rounded transition-opacity"
                    >
                      <i className="ph ph-trash"></i>
                    </button>
                  </div>

                  <h4 className="font-bold text-xs text-[var(--nc-foreground)] truncate" title={doc.name}>
                    {doc.name}
                  </h4>

                  <div className="flex items-center gap-2 text-[10px] text-[var(--nc-foreground-muted)]">
                    <span>{formatSize(doc.size)}</span>
                    <span>•</span>
                    <span>{getDocTypeLabel(doc.type)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-[var(--nc-border)] flex justify-between items-center">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="text-[10px] text-indigo-500 font-bold hover:underline"
                  >
                    {isArabic ? 'معاينة المستند' : 'Preview inline'}
                  </button>

                  {doc.linkedType && (
                    <span className="bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] text-[8px] font-black px-1.5 py-0.5 rounded border border-[var(--nc-border)]">
                      {doc.linkedType === 'LEAD' ? (isArabic ? 'عميل' : 'Lead') : doc.linkedType === 'PROPERTY' ? (isArabic ? 'عقار' : 'Property') : (isArabic ? 'مشروع' : 'Project')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                className="bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] p-3.5 rounded-xl flex items-center justify-between gap-4 hover:border-[var(--nc-accent-border)]/40 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--nc-surface)] border border-[var(--nc-border)] flex items-center justify-center shrink-0">
                    <i className={`ph-fill ${getDocIcon(doc.type)} text-lg`}></i>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-[var(--nc-foreground)] truncate" title={doc.name}>
                      {doc.name}
                    </h4>
                    <p className="text-[10px] text-[var(--nc-foreground-muted)] mt-0.5">
                      {getDocTypeLabel(doc.type)} • {formatSize(doc.size)} • {new Date(doc.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] text-[10px] font-bold hover:bg-[var(--nc-surface-strong)] transition-colors"
                  >
                    {isArabic ? 'معاينة' : 'Preview'}
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                  >
                    <i className="ph ph-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SmartCard>

      {/* ── Upload Panel (Bottom, Parallel Horizontal Expansion) ── */}
      <div className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] overflow-hidden transition-all duration-500 ease-in-out shadow-sm">
        {/* Collapsed Header / Toggle Bar */}
        <button
          onClick={() => setUploadOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-start group hover:bg-[var(--nc-surface)]/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300 ${uploadOpen ? 'bg-[var(--nc-accent)] text-[var(--nc-foreground)]' : 'bg-[var(--nc-surface)] border border-[var(--nc-border)] text-[var(--nc-foreground-muted)]'}`}>
              <i className={`ph-bold ph-upload-simple text-sm transition-transform duration-300 ${uploading ? 'animate-bounce' : ''}`}></i>
            </span>
            <div>
              <p className="text-sm font-extrabold text-[var(--nc-foreground)]">
                {isArabic ? 'تحميل مستند جديد للمستودع' : 'Upload Document to Repository'}
              </p>
              <p className="text-[10px] text-[var(--nc-foreground-muted)] font-medium">
                {uploading
                  ? (isArabic ? 'جاري رفع الملف...' : 'Uploading...')
                  : (isArabic ? 'PDF, PNG, JPG, DOCX — حتى 5 ميجابايت' : 'PDF, PNG, JPG, DOCX — up to 5MB')}
              </p>
            </div>
          </div>
          <i className={`ph-bold ph-caret-down text-[var(--nc-foreground-muted)] text-sm transition-transform duration-300 ${uploadOpen ? 'rotate-180' : ''}`}></i>
        </button>

        {/* Expandable Form — Horizontal parallel layout */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${uploadOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="border-t border-[var(--nc-border)] px-5 py-4">
            {/* Horizontal grid: Type | Link Context | Entity ID | Drop Zone */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              {/* Col 1: Doc Type */}
              <div>
                <label className="block text-[var(--nc-foreground-muted)] text-[10px] font-bold mb-1.5">
                  {isArabic ? 'تصنيف الملف *' : 'Document Type *'}
                </label>
                <select
                  value={docType}
                  onChange={(e: any) => setDocType(e.target.value)}
                  className="w-full rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] px-3 py-2.5 text-xs text-[var(--nc-foreground)] font-bold focus:outline-none focus:border-[var(--nc-accent-border)] transition-colors"
                >
                  <option value="CONTRACT">{isArabic ? 'عقد موحد' : 'Contract'}</option>
                  <option value="BLUEPRINT">{isArabic ? 'مخطط كروكي' : 'Blueprint'}</option>
                  <option value="ID">{isArabic ? 'بطاقة هوية' : 'ID Document'}</option>
                  <option value="IMAGE">{isArabic ? 'صورة عقار' : 'Image'}</option>
                  <option value="OTHER">{isArabic ? 'ملف ملحق' : 'Other'}</option>
                </select>
              </div>

              {/* Col 2: Link Context */}
              <div>
                <label className="block text-[var(--nc-foreground-muted)] text-[10px] font-bold mb-1.5">
                  {isArabic ? 'ربط بـ' : 'Link Context'}
                </label>
                <select
                  value={linkedType}
                  onChange={(e: any) => setLinkedType(e.target.value)}
                  className="w-full rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] px-3 py-2.5 text-xs text-[var(--nc-foreground)] font-bold focus:outline-none focus:border-[var(--nc-accent-border)] transition-colors"
                >
                  <option value="">{isArabic ? 'غير مرتبطة' : 'Unlinked'}</option>
                  <option value="PROPERTY">{isArabic ? 'عقار مخصص' : 'Property'}</option>
                  <option value="PROJECT">{isArabic ? 'مشروع عقاري' : 'Project'}</option>
                  <option value="LEAD">{isArabic ? 'عميل مهتم' : 'Lead'}</option>
                </select>
              </div>

              {/* Col 3: Entity ID */}
              <div>
                <label className="block text-[var(--nc-foreground-muted)] text-[10px] font-bold mb-1.5">
                  {isArabic ? 'معرف الكيان' : 'Entity ID'}
                </label>
                <input
                  type="text"
                  value={linkedTo}
                  disabled={!linkedType}
                  onChange={(e) => setLinkedTo(e.target.value)}
                  placeholder={linkedType ? 'ID...' : 'N/A'}
                  className="w-full rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] px-3 py-2.5 text-xs text-[var(--nc-foreground)] font-bold focus:outline-none focus:border-[var(--nc-accent-border)] disabled:opacity-40 transition-colors"
                />
              </div>

              {/* Col 4: Drag & Drop / File picker */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative border-2 border-dashed border-[var(--nc-accent-border)]/50 hover:border-[var(--nc-accent-border)] rounded-xl py-2.5 px-4 text-center cursor-pointer transition-all hover:bg-[var(--nc-surface)]/30 hover:scale-[1.02] duration-200 flex items-center justify-center gap-2 min-h-[42px]"
              >
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <i className={`ph ph-cloud-arrow-up text-base ${uploading ? 'text-[var(--nc-accent)] animate-bounce' : 'text-[var(--nc-accent-border)]'}`}></i>
                <span className="text-[10px] font-extrabold text-[var(--nc-foreground-muted)]">
                  {uploading
                    ? (isArabic ? 'جاري الرفع...' : 'Uploading...')
                    : (isArabic ? 'اسحب أو اختر ملفاً' : 'Drop or pick file')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF/Image Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--nc-surface)]/80 backdrop-blur-md">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] p-6 shadow-2xl animate-scale-up flex flex-col h-[80vh]">
            <div className="flex justify-between items-center border-b border-[var(--nc-border)] pb-3.5 mb-4 shrink-0">
              <h3 className="text-[var(--nc-foreground)] font-extrabold text-sm flex items-center gap-2">
                <i className="ph-bold ph-eye text-[var(--nc-foreground-muted)]"></i>
                {previewDoc.name}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] text-lg bg-[var(--nc-surface)] hover:bg-[var(--nc-surface-strong)] w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Simulated file display view */}
            <div className="flex-grow bg-[var(--nc-surface)]/80 border border-[var(--nc-border)] rounded-xl overflow-hidden flex items-center justify-center relative p-6">
              {previewDoc.type === 'IMAGE' || previewDoc.name.endsWith('.png') || previewDoc.name.endsWith('.jpg') ? (
                <div className="text-center space-y-4 max-w-full max-h-full flex flex-col items-center">
                  <div className="w-32 h-32 rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] flex items-center justify-center shadow-lg">
                    <i className="ph ph-image text-[var(--nc-foreground)] text-5xl opacity-80"></i>
                  </div>
                  <p className="text-[var(--nc-foreground-muted)] text-xs">{isArabic ? 'معاينة صورة المحتوى العقاري' : 'Property image visual preview'}</p>
                </div>
              ) : (
                /* PDF preview card mockup */
                <div className="w-full max-w-md bg-white border border-[var(--nc-border)] rounded-xl p-8 text-[var(--nc-foreground)] font-bold space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 left-0 h-2.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-amber-500"></div>

                  <div className="flex justify-between items-center border-b border-[var(--nc-border)] pb-4">
                    <div>
                      <h4 className="font-extrabold text-sm text-[var(--nc-foreground)]">أوركا لخدمات المحاكاة العقارية</h4>
                      <p className="text-[10px] text-[var(--nc-foreground-muted)] mt-0.5">ORCA DIGITAL COMPLIANCE SECURE DOCUMENT</p>
                    </div>
                    <i className="ph ph-seal-check text-emerald-500 text-3xl"></i>
                  </div>

                  <div className="space-y-3.5 text-[11px] leading-relaxed">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[var(--nc-foreground-muted)] font-bold">{isArabic ? 'اسم الوثيقة:' : 'Document Name:'}</span>
                        <span className="block font-extrabold text-[var(--nc-foreground)] truncate">{previewDoc.name}</span>
                      </div>
                      <div>
                        <span className="block text-[var(--nc-foreground-muted)] font-bold">{isArabic ? 'تاريخ التخزين:' : 'Storage Date:'}</span>
                        <span className="block font-mono font-bold text-[var(--nc-foreground)]">{new Date(previewDoc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[var(--nc-foreground-muted)] font-bold">{isArabic ? 'تصنيف الموثوقية:' : 'Security Classification:'}</span>
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded font-black text-[9px] uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {isArabic ? 'رسمي مشفر (Secure Encrypted)' : 'Encrypted'}
                      </span>
                    </div>
                    <div className="p-3 bg-[var(--nc-surface)] border border-[var(--nc-border)] rounded-lg text-[var(--nc-foreground-muted)] font-mono text-[9px] select-all leading-normal whitespace-pre">
                      {`SECURE_DECRYPT_ID: ${previewDoc.id}\nDIGEST_SHA256: 4a2b918a38b1...2c8d\nSTORAGE_BLOB_PROVIDER: MOCK_PERSIST_JSON`}
                    </div>
                  </div>

                  <div className="border-t border-[var(--nc-border)] pt-4 flex justify-between items-center text-[10px] font-bold text-[var(--nc-foreground-muted)]">
                    <span>{isArabic ? 'بوابة التحقق الحكومي' : 'Government verify portal'}</span>
                    <span className="text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      {isArabic ? 'نشط ومتصل' : 'Active sync'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center gap-4 mt-6 pt-4 border-t border-[var(--nc-border)] shrink-0">
              <span className="text-[var(--nc-foreground-muted)] text-[10px] font-mono">{formatSize(previewDoc.size)}</span>

              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 bg-[var(--nc-surface-strong)] hover:bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] text-xs font-bold rounded-xl cursor-pointer transition-colors border border-[var(--nc-border)]"
                >
                  {isArabic ? 'إغلاق' : 'Close'}
                </button>
                <a
                  href={previewDoc.url}
                  download={previewDoc.name}
                  onClick={(e) => {
                    e.preventDefault();
                    toast.error(isArabic ? `تنزيل المستند: ${previewDoc.name}` : `Downloading: ${previewDoc.name}`);
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-650 to-indigo-500 hover:from-indigo-500 hover:to-indigo-450 text-[var(--nc-foreground)] text-xs font-bold rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <i className="ph-bold ph-download-simple"></i>
                  <span>{isArabic ? 'تحميل وتنزيل الملف' : 'Download Document'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
