"use client";

import SettingsSelect from "@/components/settings/SettingsSelect";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Download,
  ExternalLink,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderOpen,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import {
  OperationsDialog,
  OperationsEmptyState,
  OperationsExecutiveGrid,
  OperationsFormField,
  OperationsKpiGrid,
  OperationsMasterList,
  OperationsMasterRow,
  OperationsMetricCard,
  OperationsPageHeader,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsTextField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

type DocumentType = "CONTRACT" | "BLUEPRINT" | "ID" | "IMAGE" | "OTHER";

interface DocumentItem {
  id: string;
  name: string;
  type: DocumentType;
  status: string;
  mimeType: string;
  extension: string;
  size: number;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

const DOCUMENT_TYPES: Array<{
  value: "ALL" | DocumentType;
  ar: string;
  en: string;
}> = [
  { value: "ALL", ar: "كل الأنواع", en: "All types" },
  { value: "CONTRACT", ar: "عقد", en: "Contract" },
  { value: "BLUEPRINT", ar: "مخطط", en: "Blueprint" },
  { value: "ID", ar: "هوية", en: "ID" },
  { value: "IMAGE", ar: "صورة", en: "Image" },
  { value: "OTHER", ar: "أخرى", en: "Other" },
];

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(",", "");
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function documentTypeLabel(type: string, isArabic: boolean): string {
  const item = DOCUMENT_TYPES.find((entry) => entry.value === type);
  return item ? (isArabic ? item.ar : item.en) : isArabic ? "أخرى" : "Other";
}

function DocumentIcon({
  item,
  className = "h-5 w-5",
}: {
  item: DocumentItem;
  className?: string;
}) {
  if (item.mimeType.startsWith("image/")) {
    return <FileImage className={className} aria-hidden="true" />;
  }
  if (
    item.extension === "xlsx" ||
    item.extension === "csv"
  ) {
    return <FileSpreadsheet className={className} aria-hidden="true" />;
  }
  if (
    item.mimeType === "application/pdf" ||
    item.extension === "docx" ||
    item.extension === "txt"
  ) {
    return <FileText className={className} aria-hidden="true" />;
  }
  return <File className={className} aria-hidden="true" />;
}

function messageForCode(code: string | undefined, isArabic: boolean): string {
  const messages: Record<string, [string, string]> = {
    EMPTY_FILE: ["الملف فارغ.", "The file is empty."],
    FILE_TOO_LARGE: ["حجم الملف يتجاوز 10 ميجابايت.", "The file exceeds 10 MB."],
    UNSAFE_FILE_NAME: ["اسم الملف أو امتداده غير آمن.", "The file name or extension is unsafe."],
    INVALID_FILE_TYPE: ["نوع الملف غير مسموح به.", "The file type is not allowed."],
    FILE_SIGNATURE_MISMATCH: ["محتوى الملف لا يطابق امتداده.", "The file content does not match its extension."],
    DOCUMENT_FORBIDDEN: ["لا تملك الصلاحية المطلوبة.", "You do not have the required permission."],
    DOCUMENT_UNAUTHENTICATED: ["انتهت الجلسة. سجّل الدخول مجددًا.", "Your session has expired. Sign in again."],
    DOCUMENT_ACTOR_NOT_FOUND: ["تعذر التحقق من المستخدم داخل المنشأة.", "The user could not be verified."],
    DOCUMENTS_LOAD_FAILED: ["تعذر تحميل مستودع المستندات.", "Unable to load the document repository."],
  };
  const value = messages[String(code || "")];
  return value
    ? value[isArabic ? 0 : 1]
    : isArabic
      ? "تعذر إكمال العملية."
      : "The operation could not be completed.";
}

function DetailCell({ label, value, dir }: { label: string; value: React.ReactNode; dir?: "rtl" | "ltr" }) {
  return (
    <div className="orca-info-cell min-h-[56px]">
      <span>{label}</span>
      <strong dir={dir} className="truncate">{value}</strong>
    </div>
  );
}

export default function DocumentsView() {
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [canUpload, setCanUpload] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | DocumentType>("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [uploadType, setUploadType] = useState<DocumentType>("OTHER");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/documents", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.code || "DOCUMENTS_LOAD_FAILED");
      }
      const data = Array.isArray(payload.data) ? payload.data : [];
      setDocuments(data);
      setCanUpload(Boolean(payload.permissions?.canUpload));
      setCanDelete(Boolean(payload.permissions?.canDelete));
      setSelectedId((current) =>
        current && data.some((item: DocumentItem) => item.id === current)
          ? current
          : data[0]?.id || "",
      );
    } catch (error) {
      setDocuments([]);
      setNotice({
        type: "error",
        text: messageForCode(
          error instanceof Error ? error.message : "DOCUMENTS_LOAD_FAILED",
          isArabic,
        ),
      });
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const owners = useMemo(
    () =>
      [...new Set(documents.map((item) => item.ownerName).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [documents],
  );

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const now = Date.now();

    return documents.filter((item) => {
      const matchesSearch =
        !normalized ||
        item.name.toLowerCase().includes(normalized) ||
        item.extension.toLowerCase().includes(normalized) ||
        item.ownerName.toLowerCase().includes(normalized);
      const matchesType =
        typeFilter === "ALL" || item.type === typeFilter;
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;
      const matchesOwner =
        ownerFilter === "ALL" || item.ownerName === ownerFilter;

      const created = new Date(item.createdAt).getTime();
      const age = now - created;
      const matchesDate =
        dateFilter === "ALL" ||
        (dateFilter === "TODAY" && age <= 24 * 60 * 60 * 1000) ||
        (dateFilter === "7D" && age <= 7 * 24 * 60 * 60 * 1000) ||
        (dateFilter === "30D" && age <= 30 * 24 * 60 * 60 * 1000);

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesOwner &&
        matchesDate
      );
    });
  }, [documents, search, typeFilter, statusFilter, ownerFilter, dateFilter]);

  const selected = useMemo(
    () =>
      filtered.find((item) => item.id === selectedId) ||
      documents.find((item) => item.id === selectedId) ||
      filtered[0] ||
      null,
    [documents, filtered, selectedId],
  );

  const chooseFile = (file: File | null) => {
    if (!file) return;
    setUploadFile(file);
    setNotice(null);
  };

  const submitUpload = async () => {
    if (!uploadFile) {
      setNotice({
        type: "error",
        text: isArabic ? "اختر ملفًا للرفع." : "Select a file to upload.",
      });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.set("file", uploadFile);
      formData.set("type", uploadType);

      const response = await fetch("/api/v1/documents", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.code || "DOCUMENT_UPLOAD_FAILED");
      }

      setUploadOpen(false);
      setUploadFile(null);
      setNotice({
        type: "success",
        text: isArabic
          ? "تم رفع المستند وحفظه فعليًا."
          : "The document was uploaded and stored.",
      });
      await loadDocuments();
      if (payload.data?.id) setSelectedId(payload.data.id);
    } catch (error) {
      setNotice({
        type: "error",
        text: messageForCode(
          error instanceof Error ? error.message : undefined,
          isArabic,
        ),
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/v1/documents/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(
          response.status === 403
            ? "DOCUMENT_FORBIDDEN"
            : payload?.code || "DOCUMENT_DELETE_FAILED",
        );
      }
      setDeleteTarget(null);
      setNotice({
        type: "success",
        text: isArabic
          ? "تم حذف المستند."
          : "The document was deleted.",
      });
      await loadDocuments();
    } catch (error) {
      setNotice({
        type: "error",
        text: messageForCode(
          error instanceof Error ? error.message : undefined,
          isArabic,
        ),
      });
    } finally {
      setBusy(false);
    }
  };

  const previewUrl = selected
    ? `/api/v1/documents/${selected.id}`
    : "";
  const canPreviewInline = Boolean(
    selected &&
      (selected.mimeType.startsWith("image/") ||
        selected.mimeType === "application/pdf" ||
        selected.extension === "txt" ||
        selected.extension === "csv"),
  );

  const documentKpis = [
    {
      label: isArabic ? "إجمالي المستندات" : "Total documents",
      value: documents.length,
    },
    {
      label: isArabic ? "العقود" : "Contracts",
      value: documents.filter((item) => item.type === "CONTRACT").length,
    },
    {
      label: isArabic ? "الصور والمخططات" : "Images & blueprints",
      value: documents.filter((item) =>
        ["IMAGE", "BLUEPRINT"].includes(item.type),
      ).length,
    },
    {
      label: isArabic ? "المالكون" : "Owners",
      value: owners.length,
    },
  ];

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className={operationsVisual.page}
      data-documents-property-workspace
      data-operations-contract="dashboard-v2"
    >
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow={isArabic ? "المستند ← المالك ← المعاينة ← التنزيل" : "Document → owner → preview → download"}
          title={isArabic ? "مستودع المستندات" : "Document Repository"}
          description={isArabic ? "إدارة الملفات التشغيلية والبحث فيها ومعاينتها وتنزيلها من مساحة عمل موحدة." : "Manage, search, preview, and download operational files from one unified workspace."}
          icon={FolderOpen}
          actions={
            <>
              <button type="button" onClick={() => void loadDocuments()} disabled={loading} className={operationsVisual.iconButton} aria-label={isArabic ? "تحديث" : "Refresh"} title={isArabic ? "تحديث" : "Refresh"}>
                <RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
              </button>
              {canUpload ? (
                <button type="button" onClick={() => setUploadOpen(true)} className={operationsVisual.primaryButton}><Upload aria-hidden="true" />{isArabic ? "رفع مستند" : "Upload document"}</button>
              ) : null}
            </>
          }
        />

        {notice ? (
          <div role={notice.type === "error" ? "alert" : "status"} className={notice.type === "success" ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300" : "rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300"}>
            {notice.text}
          </div>
        ) : null}

        <OperationsKpiGrid aria-label={isArabic ? "ملخص المستندات" : "Document summary"}>
          <OperationsMetricCard title={isArabic ? "إجمالي المستندات" : "Total documents"} value={documents.length} description={`${filtered.length} ${isArabic ? "مطابق" : "matching"}`} icon={FolderOpen} />
          <OperationsMetricCard title={isArabic ? "العقود" : "Contracts"} value={documents.filter((item) => item.type === "CONTRACT").length} description={isArabic ? "مستندات العقود" : "Contract files"} icon={FileText} />
          <OperationsMetricCard title={isArabic ? "الصور والمخططات" : "Images & blueprints"} value={documents.filter((item) => ["IMAGE", "BLUEPRINT"].includes(item.type)).length} description={isArabic ? "مواد مرئية" : "Visual assets"} icon={FileImage} />
          <OperationsMetricCard title={isArabic ? "المالكون" : "Owners"} value={owners.length} description={isArabic ? "مالكون مميزون" : "Distinct owners"} icon={Users} />
        </OperationsKpiGrid>

        <OperationsExecutiveGrid dir="ltr" data-four-page-two-card-workspace>
          <OperationsPanel dir={isArabic ? "rtl" : "ltr"} className="min-w-0 overflow-hidden" data-operational-list-card>
            <OperationsPanelHeader title={isArabic ? "المستندات" : "Documents"} description={`${filtered.length} ${isArabic ? "نتيجة" : "results"}`} icon={Filter} />
            <div className="border-b border-[var(--nc-border)] p-2.5">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]">
                <label className="relative min-w-0">
                  <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)] ${isArabic ? "right-3" : "left-3"}`} aria-hidden="true" />
                  <OperationsTextField value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isArabic ? "ابحث بالاسم أو النوع أو المالك..." : "Search by name, type, or owner..."} className={isArabic ? "pl-3 pr-10" : "pl-10 pr-3"} />
                </label>
                <SettingsSelect aria-label={isArabic ? "تصفية حسب النوع" : "Filter by type"} value={typeFilter} onChange={(value) => setTypeFilter(value as "ALL" | DocumentType)} className="orca-operations-input"
                  options={[...DOCUMENT_TYPES.map((item) => ({ value: item.value, label: isArabic ? item.ar : item.en }))]}
                />
                <SettingsSelect aria-label={isArabic ? "تصفية حسب الحالة" : "Filter by status"} value={statusFilter} onChange={(value) => setStatusFilter(value)} className="orca-operations-input"
                  options={[{ value: "ALL", label: isArabic ? "كل الحالات" : "All statuses" },
                    { value: "READY", label: isArabic ? "جاهز" : "Ready" }]}
                />
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <SettingsSelect aria-label={isArabic ? "تصفية حسب المالك" : "Filter by owner"} value={ownerFilter} onChange={(value) => setOwnerFilter(value)} className="orca-operations-input"
                  options={[{ value: "ALL", label: isArabic ? "كل المالكين" : "All owners" },
                    ...owners.map((owner) => ({ value: owner, label: owner }))]}
                />
                <SettingsSelect aria-label={isArabic ? "تصفية حسب التاريخ" : "Filter by date"} value={dateFilter} onChange={(value) => setDateFilter(value)} className="orca-operations-input"
                  options={[{ value: "ALL", label: isArabic ? "كل التواريخ" : "All dates" },
                    { value: "TODAY", label: isArabic ? "آخر 24 ساعة" : "Last 24 hours" },
                    { value: "7D", label: isArabic ? "آخر 7 أيام" : "Last 7 days" },
                    { value: "30D", label: isArabic ? "آخر 30 يومًا" : "Last 30 days" }]}
                />
              </div>
            </div>

            <div className="orca-operations-flow-region">
              {loading ? (
                <div className="grid min-h-[240px] place-items-center text-sm text-[var(--nc-text-secondary)]">{isArabic ? "جارٍ تحميل المستندات..." : "Loading documents..."}</div>
              ) : filtered.length === 0 ? (
                <div className="p-3"><OperationsEmptyState>{isArabic ? "لا توجد مستندات مطابقة." : "No matching documents."}</OperationsEmptyState></div>
              ) : (
                <OperationsMasterList>
                  {filtered.map((item) => (
                    <OperationsMasterRow key={item.id} selected={selected?.id === item.id} onClick={() => setSelectedId(item.id)} className="grid min-h-[66px] grid-cols-[36px_minmax(0,1.6fr)_minmax(90px,.7fr)_minmax(90px,.7fr)_100px] items-center gap-3 px-3 py-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)]"><DocumentIcon item={item} className="h-4 w-4" /></span>
                      <span className="min-w-0"><strong className="orca-table-primary block truncate text-sm">{item.name}</strong><span className="orca-table-secondary mt-1 block truncate text-[11px] text-[var(--nc-text-dim)]">{documentTypeLabel(item.type, isArabic)} · {formatSize(item.size)}</span></span>
                      <span className="orca-table-primary truncate text-[14px] text-[var(--nc-text-secondary)]">{item.ownerName}</span>
                      <span dir="ltr" className="orca-table-secondary text-[11px] text-[var(--nc-text-secondary)]">{formatDateTime(item.createdAt)}</span>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-center text-[12px] font-bold text-emerald-700 dark:text-emerald-300">{item.status || "READY"}</span>
                    </OperationsMasterRow>
                  ))}
                </OperationsMasterList>
              )}
            </div>
          </OperationsPanel>

          <OperationsPanel dir={isArabic ? "rtl" : "ltr"} className="min-w-0 overflow-hidden" data-operational-detail-card>
            {selected ? (
              <>
                <OperationsPanelHeader
                  title={selected.name}
                  description={`${documentTypeLabel(selected.type, isArabic)} · ${formatSize(selected.size)}`}
                  icon={FileText}
                  actions={canDelete ? <button type="button" onClick={() => setDeleteTarget(selected)} className={operationsVisual.iconButton} aria-label={isArabic ? "حذف" : "Delete"} title={isArabic ? "حذف" : "Delete"}><Trash2 aria-hidden="true" /></button> : undefined}
                />
                <div className="grid shrink-0 gap-2 border-b border-[var(--nc-border)] p-3 sm:grid-cols-3">
                  <DetailCell label={isArabic ? "المالك" : "Owner"} value={selected.ownerName} />
                  <DetailCell label={isArabic ? "الحجم" : "Size"} value={formatSize(selected.size)} />
                  <DetailCell label={isArabic ? "التاريخ" : "Date"} value={formatDateTime(selected.createdAt)} dir="ltr" />
                </div>
                <div className="orca-operations-flow-region p-3">
                  {canPreviewInline ? (
                    selected.mimeType.startsWith("image/") ? (
                      <img src={previewUrl} alt={selected.name} className="mx-auto max-h-[300px] max-w-full rounded-xl border border-[var(--nc-border)] object-contain" />
                    ) : selected.mimeType === "application/pdf" ? (
                      <iframe src={previewUrl} title={selected.name} className="h-[300px] w-full rounded-xl border border-[var(--nc-border)] bg-white" />
                    ) : (
                      <iframe src={previewUrl} title={selected.name} className="h-[300px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)]" />
                    )
                  ) : (
                    <OperationsEmptyState>{isArabic ? "المعاينة المباشرة غير متاحة لهذا النوع." : "Inline preview is not available for this file type."}</OperationsEmptyState>
                  )}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--nc-border)] p-3">
                  <a href={previewUrl} target="_blank" rel="noreferrer" className={operationsVisual.secondaryButton}><ExternalLink aria-hidden="true" />{isArabic ? "فتح" : "Open"}</a>
                  <a href={`${previewUrl}?download=1`} className={operationsVisual.primaryButton}><Download aria-hidden="true" />{isArabic ? "تنزيل" : "Download"}</a>
                </div>
              </>
            ) : (
              <div className="p-3"><OperationsEmptyState>{isArabic ? "اختر مستندًا من القائمة." : "Select a document from the list."}</OperationsEmptyState></div>
            )}
          </OperationsPanel>
        </OperationsExecutiveGrid>

        <OperationsDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          title={isArabic ? "رفع مستند جديد" : "Upload a document"}
          description={isArabic ? "الأنواع المسموحة: PDF وJPG وPNG وWEBP وDOCX وXLSX وTXT وCSV. الحد الأقصى 10 ميجابايت." : "Allowed: PDF, JPG, PNG, WEBP, DOCX, XLSX, TXT, and CSV. Maximum 10 MB."}
          closeLabel={isArabic ? "إغلاق" : "Close"}
          closeDisabled={busy}
          dir={isArabic ? "rtl" : "ltr"}
          footer={
            <>
              <button type="button" onClick={() => setUploadOpen(false)} disabled={busy} className={operationsVisual.secondaryButton}>{isArabic ? "إلغاء" : "Cancel"}</button>
              <button type="button" disabled={busy || !uploadFile} onClick={() => void submitUpload()} className={operationsVisual.primaryButton}>{busy ? (isArabic ? "جارٍ الرفع..." : "Uploading...") : (isArabic ? "رفع المستند" : "Upload document")}</button>
            </>
          }
        >
          <div className="space-y-4">
            <OperationsFormField label={isArabic ? "تصنيف المستند" : "Document type"}>
              <SettingsSelect value={uploadType} onChange={(value) => setUploadType(value as DocumentType)} className="orca-operations-input"
                options={[...DOCUMENT_TYPES.filter((item) => item.value !== "ALL").map((item) => ({ value: item.value, label: isArabic ? item.ar : item.en }))]}
              />
            </OperationsFormField>
            <div
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0] || null); }}
              className={`rounded-xl border-2 border-dashed p-7 text-center transition ${dragging ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)]" : "border-[var(--nc-border)] bg-[var(--nc-surface-soft)]"}`}
            >
              <Upload className="mx-auto h-9 w-9 text-[var(--nc-text-dim)]" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold">{uploadFile ? uploadFile.name : isArabic ? "اسحب الملف هنا أو اختره من الجهاز" : "Drop the file here or choose it from your device"}</p>
              {uploadFile ? <p className="mt-2 text-xs text-[var(--nc-text-dim)]" dir="ltr">{formatSize(uploadFile.size)}</p> : null}
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.txt,.csv" onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className={`${operationsVisual.secondaryButton} mt-4`}>{isArabic ? "اختيار ملف" : "Choose file"}</button>
            </div>
          </div>
        </OperationsDialog>

        <OperationsDialog
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title={isArabic ? "تأكيد حذف المستند" : "Confirm document deletion"}
          description={deleteTarget ? (isArabic ? `سيتم حذف «${deleteTarget.name}» نهائيًا. لا يمكن التراجع عن هذا الإجراء.` : `“${deleteTarget.name}” will be permanently deleted. This action cannot be undone.`) : undefined}
          closeLabel={isArabic ? "إلغاء" : "Cancel"}
          closeDisabled={busy}
          dir={isArabic ? "rtl" : "ltr"}
          footer={
            <>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={busy} className={operationsVisual.secondaryButton}>{isArabic ? "إلغاء" : "Cancel"}</button>
              <button type="button" disabled={busy} onClick={() => void confirmDelete()} className="orca-operations-primary-button border-rose-500/40 bg-rose-600 text-white">{busy ? (isArabic ? "جارٍ الحذف..." : "Deleting...") : (isArabic ? "حذف نهائي" : "Delete permanently")}</button>
            </>
          }
        >
          <p className="text-sm leading-7 text-[var(--nc-text-secondary)]">{isArabic ? "تحقق من المستند المحدد قبل الحذف. هذا الإجراء نهائي." : "Verify the selected document before deletion. This action is permanent."}</p>
        </OperationsDialog>
      </div>
    </section>
  );
}
