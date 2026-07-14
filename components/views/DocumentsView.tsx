"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
  X,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";

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
    DOCUMENT_ACTOR_NOT_FOUND: ["تعذر التحقق من المستخدم داخل المنشأة.", "The tenant user could not be verified."],
    DOCUMENTS_LOAD_FAILED: ["تعذر تحميل مستودع المستندات.", "Unable to load the document repository."],
  };
  const value = messages[String(code || "")];
  return value
    ? value[isArabic ? 0 : 1]
    : isArabic
      ? "تعذر إكمال العملية."
      : "The operation could not be completed.";
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
  const [portalReady, setPortalReady] = useState(false);
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

  useEffect(() => setPortalReady(true), []);

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
      className="nc-page nc-stack orca-container pb-4"
      data-documents-property-workspace
    >
      <header className="orca-workspace-hero">
        <div>
          <p className="text-xs font-bold text-[var(--nc-accent)]">
            {isArabic
              ? "المستند ← المالك ← المعاينة ← التنزيل"
              : "Document → owner → preview → download"}
          </p>
          <h1 className="mt-1 text-2xl font-black">
            {isArabic ? "مستودع المستندات" : "Document Repository"}
          </h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
            {isArabic
              ? "إدارة الملفات التشغيلية والبحث فيها ومعاينتها وتنزيلها من مساحة عمل موحدة."
              : "Manage, search, preview, and download operational files from one unified workspace."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void loadDocuments()}
            disabled={loading}
            className="nc-btn nc-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] px-4 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {isArabic ? "تحديث" : "Refresh"}
          </button>

          {canUpload && (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-black"
            >
              <Upload size={16} aria-hidden="true" />
              {isArabic ? "رفع مستند" : "Upload document"}
            </button>
          )}
        </div>
      </header>

      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={
            notice.type === "success"
              ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
              : "rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300"
          }
        >
          {notice.text}
        </div>
      )}

      <div className="orca-workspace-metrics">
        {[
          {
            label: isArabic ? "إجمالي المستندات" : "Total documents",
            value: documents.length,
            icon: FolderOpen,
          },
          {
            label: isArabic ? "العقود" : "Contracts",
            value: documents.filter((item) => item.type === "CONTRACT").length,
            icon: FileText,
          },
          {
            label: isArabic ? "الصور والمخططات" : "Images & blueprints",
            value: documents.filter((item) =>
              ["IMAGE", "BLUEPRINT"].includes(item.type),
            ).length,
            icon: FileImage,
          },
          {
            label: isArabic ? "المالكون" : "Owners",
            value: owners.length,
            icon: Users,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="orca-workspace-metric min-h-[96px]">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--nc-text-secondary)]">
              <span>{label}</span>
              <Icon size={17} aria-hidden="true" />
            </div>
            <strong className="mt-3 block text-2xl" dir="ltr">
              {value}
            </strong>
          </div>
        ))}
      </div>

      <div className="orca-workspace-note flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="text-[var(--nc-text-secondary)]">
          {isArabic ? "النتائج المطابقة" : "Matching results"}:
        </span>
        <strong dir="ltr">{filtered.length}</strong>
        <span className="text-[var(--nc-border)]">|</span>
        <span className="text-[var(--nc-text-secondary)]">
          {isArabic ? "الصيغ المدعومة" : "Supported formats"}:
        </span>
        <strong dir="ltr">PDF · JPG · PNG · WEBP · DOCX · XLSX · TXT · CSV</strong>
      </div>

      <div
        dir="ltr"
        className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_410px]"
        data-four-page-two-card-workspace
      >
        <section
          dir={isArabic ? "rtl" : "ltr"}
          className="orca-workspace-panel flex min-w-0 flex-col overflow-hidden lg:h-[520px]"
          data-operational-list-card
        >
          <div className="orca-workspace-toolbar border-b border-[var(--nc-border)] p-3">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]">
              <label className="relative min-w-0">
                <Search
                  size={16}
                  className={`absolute top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)] ${
                    isArabic ? "right-3" : "left-3"
                  }`}
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    isArabic
                      ? "ابحث بالاسم أو النوع أو المالك..."
                      : "Search by name, type, or owner..."
                  }
                  className={`min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] py-2.5 text-sm outline-none focus:border-[var(--nc-accent-border)] ${
                    isArabic ? "pl-3 pr-10" : "pl-10 pr-3"
                  }`}
                />
              </label>

              <select
                aria-label={isArabic ? "تصفية حسب النوع" : "Filter by type"}
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as "ALL" | DocumentType)
                }
                className="min-h-[44px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-bold text-[var(--nc-foreground)]"
              >
                {DOCUMENT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {isArabic ? item.ar : item.en}
                  </option>
                ))}
              </select>

              <select
                aria-label={isArabic ? "تصفية حسب الحالة" : "Filter by status"}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-h-[44px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-bold text-[var(--nc-foreground)]"
              >
                <option value="ALL">
                  {isArabic ? "كل الحالات" : "All statuses"}
                </option>
                <option value="READY">{isArabic ? "جاهز" : "Ready"}</option>
              </select>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <select
                aria-label={isArabic ? "تصفية حسب المالك" : "Filter by owner"}
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
                className="min-h-[44px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-bold text-[var(--nc-foreground)]"
              >
                <option value="ALL">
                  {isArabic ? "كل المالكين" : "All owners"}
                </option>
                {owners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>

              <select
                aria-label={isArabic ? "تصفية حسب التاريخ" : "Filter by date"}
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="min-h-[44px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-bold text-[var(--nc-foreground)]"
              >
                <option value="ALL">
                  {isArabic ? "كل التواريخ" : "All dates"}
                </option>
                <option value="TODAY">
                  {isArabic ? "آخر 24 ساعة" : "Last 24 hours"}
                </option>
                <option value="7D">
                  {isArabic ? "آخر 7 أيام" : "Last 7 days"}
                </option>
                <option value="30D">
                  {isArabic ? "آخر 30 يومًا" : "Last 30 days"}
                </option>
              </select>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-[52px] shrink-0 items-center justify-between border-b border-[var(--nc-border)] px-4">
              <div className="flex items-center gap-2">
                <Filter
                  className="h-4 w-4 text-[var(--nc-text-secondary)]"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-black">
                  {isArabic ? "المستندات" : "Documents"}
                </h2>
              </div>
              <span
                className="text-xs font-bold text-[var(--nc-text-secondary)]"
                dir="ltr"
              >
                {filtered.length}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--nc-surface-solid)] text-xs text-[var(--nc-text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-start">
                      {isArabic ? "الملف" : "File"}
                    </th>
                    <th className="px-4 py-3 text-start">
                      {isArabic ? "النوع" : "Type"}
                    </th>
                    <th className="px-4 py-3 text-start">
                      {isArabic ? "الحجم" : "Size"}
                    </th>
                    <th className="px-4 py-3 text-start">
                      {isArabic ? "المالك" : "Owner"}
                    </th>
                    <th className="px-4 py-3 text-start">
                      {isArabic ? "التاريخ" : "Date"}
                    </th>
                    <th className="px-4 py-3 text-start">
                      {isArabic ? "الحالة" : "Status"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr
                        key={index}
                        className="border-t border-[var(--nc-border)]"
                      >
                        <td colSpan={6} className="px-4 py-3">
                          <div className="h-12 animate-pulse rounded-xl bg-[var(--nc-surface-strong)]" />
                        </td>
                      </tr>
                    ))}

                  {!loading &&
                    filtered.map((item) => (
                      <tr
                        key={item.id}
                        tabIndex={0}
                        role="button"
                        onClick={() => setSelectedId(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedId(item.id);
                          }
                        }}
                        className={`cursor-pointer border-t border-[var(--nc-border)] outline-none transition hover:bg-[var(--nc-surface-strong)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-border)] ${
                          selected?.id === item.id
                            ? "bg-[var(--nc-accent-soft)]"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-foreground)]">
                              <DocumentIcon item={item} />
                            </span>
                            <div className="min-w-0">
                              <p
                                className="max-w-72 truncate font-bold"
                                title={item.name}
                              >
                                {item.name}
                              </p>
                              <p className="mt-1 text-[11px] uppercase text-[var(--nc-text-dim)]">
                                {item.extension}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--nc-text-secondary)]">
                          {documentTypeLabel(item.type, isArabic)}
                        </td>
                        <td className="px-4 py-3" dir="ltr">
                          {formatSize(item.size)}
                        </td>
                        <td className="px-4 py-3 text-[var(--nc-text-secondary)]">
                          {item.ownerName ||
                            (isArabic ? "غير محدد" : "Not specified")}
                        </td>
                        <td
                          className="px-4 py-3 text-[var(--nc-text-secondary)]"
                          dir="ltr"
                        >
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex min-w-[80px] justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                            {isArabic ? "جاهز" : "Ready"}
                          </span>
                        </td>
                      </tr>
                    ))}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4">
                        <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] p-6 text-center">
                          <div className="max-w-md">
                            <FolderOpen
                              className="mx-auto h-9 w-9 text-[var(--nc-accent)]"
                              aria-hidden="true"
                            />
                            <h3 className="mt-3 text-sm font-black">
                              {documents.length === 0
                                ? isArabic
                                  ? "لا توجد مستندات بعد"
                                  : "No documents yet"
                                : isArabic
                                  ? "لا توجد نتائج مطابقة"
                                  : "No matching results"}
                            </h3>
                            <p className="mt-2 text-xs leading-6 text-[var(--nc-text-secondary)]">
                              {documents.length === 0
                                ? isArabic
                                  ? "ارفع أول مستند ليظهر هنا مع بيانات المالك والحجم والتاريخ."
                                  : "Upload the first document to display its owner, size, and date here."
                                : isArabic
                                  ? "غيّر البحث أو عوامل التصفية لعرض مستندات أخرى."
                                  : "Adjust the search or filters to display other documents."}
                            </p>
                            {canUpload && documents.length === 0 && (
                              <button
                                type="button"
                                onClick={() => setUploadOpen(true)}
                                className="nc-btn-primary mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-black"
                              >
                                <Upload size={15} aria-hidden="true" />
                                {isArabic
                                  ? "رفع أول مستند"
                                  : "Upload first document"}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section
          dir={isArabic ? "rtl" : "ltr"}
          className="orca-workspace-panel flex min-w-0 flex-col overflow-hidden lg:h-[520px]"
          data-operational-detail-card
        >
          {selected ? (
            <>
              <header className="flex min-h-[78px] shrink-0 items-center justify-between gap-3 border-b border-[var(--nc-border)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--nc-accent)]">
                    {documentTypeLabel(selected.type, isArabic)}
                  </p>
                  <h2
                    className="mt-1 truncate text-lg font-black"
                    title={selected.name}
                  >
                    {selected.name}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--nc-text-secondary)]" dir="ltr">
                    {formatDateTime(selected.createdAt)}
                  </p>
                </div>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(selected)}
                    className="nc-btn nc-btn-ghost min-h-[44px] min-w-[44px] rounded-xl border border-rose-500/30 px-3 text-rose-700 dark:text-rose-300"
                    aria-label={
                      isArabic ? "حذف المستند" : "Delete document"
                    }
                  >
                    <Trash2 className="mx-auto h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </header>

              <div className="min-h-0 flex-1 p-3">
                <div className="flex h-full min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]">
                  {selected.mimeType.startsWith("image/") ? (
                    <img
                      src={previewUrl}
                      alt={selected.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : canPreviewInline ? (
                    <iframe
                      src={previewUrl}
                      title={selected.name}
                      className="h-full min-h-[280px] w-full border-0"
                    />
                  ) : (
                    <div className="p-6 text-center">
                      <DocumentIcon
                        item={selected}
                        className="mx-auto h-12 w-12 text-[var(--nc-text-dim)]"
                      />
                      <p className="mt-4 text-sm leading-7 text-[var(--nc-text-secondary)]">
                        {isArabic
                          ? "لا تتوفر معاينة مباشرة لهذا النوع. يمكنك فتح الملف أو تنزيله."
                          : "Inline preview is unavailable for this type. Open or download the file instead."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t border-[var(--nc-border)] p-4">
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-[var(--nc-text-secondary)]">
                      {isArabic ? "النوع والحجم" : "Type and size"}
                    </dt>
                    <dd className="mt-1 font-bold">
                      {selected.extension.toUpperCase()} ·{" "}
                      {formatSize(selected.size)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--nc-text-secondary)]">
                      {isArabic ? "المالك" : "Owner"}
                    </dt>
                    <dd className="mt-1 font-bold">
                      {selected.ownerName ||
                        (isArabic ? "غير محدد" : "Not specified")}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="nc-btn nc-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] px-4 text-xs font-bold"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    {isArabic ? "فتح" : "Open"}
                  </a>
                  <a
                    href={`${previewUrl}?download=1`}
                    className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-black"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {isArabic ? "تنزيل" : "Download"}
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center p-6 text-center">
              <div className="max-w-sm">
                <FolderOpen
                  className="mx-auto h-10 w-10 text-[var(--nc-accent)]"
                  aria-hidden="true"
                />
                <h2 className="mt-3 text-base font-black">
                  {isArabic
                    ? "اختر مستندًا من القائمة"
                    : "Select a document from the list"}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--nc-text-secondary)]">
                  {isArabic
                    ? "ستظهر هنا المعاينة والمالك والحجم والتاريخ وإجراءات الفتح والتنزيل."
                    : "Preview, owner, size, date, and open/download actions will appear here."}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {portalReady &&
        uploadOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 pb-8 pt-24 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-upload-title"
          >
            <div className="w-full max-w-xl rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 id="document-upload-title" className="text-lg font-black text-[var(--nc-foreground)]">
                    {isArabic ? "رفع مستند جديد" : "Upload a document"}
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-[var(--nc-foreground-muted)]">
                    {isArabic
                      ? "الأنواع المسموحة: PDF وJPG وPNG وWEBP وDOCX وXLSX وTXT وCSV. الحد الأقصى 10 ميجابايت."
                      : "Allowed: PDF, JPG, PNG, WEBP, DOCX, XLSX, TXT, and CSV. Maximum 10 MB."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="min-h-[44px] min-w-[44px] rounded-xl text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface-strong)]"
                  aria-label={isArabic ? "إغلاق" : "Close"}
                >
                  <X className="mx-auto h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <label className="mt-5 block text-sm font-bold text-[var(--nc-foreground)]">
                {isArabic ? "تصنيف المستند" : "Document type"}
                <select
                  value={uploadType}
                  onChange={(event) =>
                    setUploadType(event.target.value as DocumentType)
                  }
                  className="mt-2 min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 text-sm text-[var(--nc-foreground)]"
                >
                  {DOCUMENT_TYPES.filter((item) => item.value !== "ALL").map(
                    (item) => (
                      <option key={item.value} value={item.value}>
                        {isArabic ? item.ar : item.en}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  chooseFile(event.dataTransfer.files?.[0] || null);
                }}
                className={`mt-5 rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  dragging
                    ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)]"
                    : "border-[var(--nc-border)] bg-[var(--nc-surface-strong)]"
                }`}
              >
                <Upload className="mx-auto h-10 w-10 text-[var(--nc-foreground-muted)]" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-[var(--nc-foreground)]">
                  {uploadFile
                    ? uploadFile.name
                    : isArabic
                      ? "اسحب الملف هنا أو اختره من الجهاز"
                      : "Drop the file here or choose it from your device"}
                </p>
                {uploadFile && (
                  <p className="mt-2 text-xs text-[var(--nc-foreground-muted)]" dir="ltr">
                    {formatSize(uploadFile.size)}
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.txt,.csv"
                  onChange={(event) =>
                    chooseFile(event.target.files?.[0] || null)
                  }
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 min-h-[44px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-4 text-sm font-bold text-[var(--nc-foreground)]"
                >
                  {isArabic ? "اختيار ملف" : "Choose file"}
                </button>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="min-h-[44px] flex-1 rounded-xl border border-[var(--nc-border)] px-4 text-sm font-bold text-[var(--nc-foreground)]"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={busy || !uploadFile}
                  onClick={() => void submitUpload()}
                  className="min-h-[44px] flex-1 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy
                    ? isArabic
                      ? "جارٍ الرفع..."
                      : "Uploading..."
                    : isArabic
                      ? "رفع المستند"
                      : "Upload document"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {portalReady &&
        deleteTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 pb-8 pt-24 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-delete-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-6 shadow-2xl">
              <h2 id="document-delete-title" className="text-lg font-black text-[var(--nc-foreground)]">
                {isArabic ? "تأكيد حذف المستند" : "Confirm document deletion"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--nc-foreground-muted)]">
                {isArabic
                  ? `سيتم حذف «${deleteTarget.name}» نهائيًا. لا يمكن التراجع عن هذا الإجراء.`
                  : `“${deleteTarget.name}” will be permanently deleted. This action cannot be undone.`}
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="min-h-[44px] flex-1 rounded-xl border border-[var(--nc-border)] px-4 text-sm font-bold text-[var(--nc-foreground)]"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmDelete()}
                  className="min-h-[44px] flex-1 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy
                    ? isArabic
                      ? "جارٍ الحذف..."
                      : "Deleting..."
                    : isArabic
                      ? "حذف نهائي"
                      : "Delete permanently"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
