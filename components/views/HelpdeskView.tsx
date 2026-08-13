"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Headphones,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  TicketCheck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

import {
  closeTicketAction,
  createTicketAction,
  getTicketsAction,
  reopenTicketAction,
} from "@/app/actions/helpdesk";
import { useApp } from "@/app/context/AppContext";
import SettingsSelect from "@/components/settings/SettingsSelect";
import { toArabicNumerals } from "@/lib/formatters";

const PAGE_SIZE = 6;

type TicketStatus = "OPEN" | "CLOSED";

interface TicketRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  aiResponse: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReplyRecord {
  id: string;
  message: string;
  sender: "CLIENT" | "SUPPORT" | "AI";
  createdAt: string;
}

interface HelpdeskViewProps {
  initialTickets: TicketRecord[];
  tenantName: string;
  initialLoadFailed?: boolean;
}

const TEXT = {
  AR: {
    title: "مركز الدعم",
    description: "إدارة تذاكر الدعم ومتابعة الردود وحالة المعالجة ضمن نطاق المنشأة.",
    flow: "المنشأة ← التذكرة ← المتابعة ← الإغلاق",
    total: "إجمالي التذاكر",
    open: "المفتوحة",
    closed: "المغلقة",
    waiting: "بانتظار المعالجة",
    newTicket: "تذكرة جديدة",
    refresh: "تحديث",
    search: "ابحث بعنوان التذكرة أو تفاصيلها...",
    filter: "تصفية التذاكر",
    all: "الكل",
    ticket: "التذكرة",
    subject: "الموضوع",
    created: "تاريخ الإنشاء",
    updated: "آخر تحديث",
    response: "استجابة الدعم",
    status: "الحالة",
    responded: "تم الرد",
    noResponse: "بانتظار الرد",
    matching: "النتائج المطابقة",
    ordered: "الأحدث تحديثًا أولًا",
    showing: "عرض",
    of: "من",
    noTickets: "لا توجد تذاكر دعم مطابقة.",
    selectTicket: "اختر تذكرة من الجدول لعرض تفاصيلها.",
    loading: "جاري تحميل تذاكر الدعم...",
    loadError: "تعذر تحميل تذاكر الدعم.",
    retry: "إعادة المحاولة",
    organization: "المنشأة",
    details: "تفاصيل التذكرة",
    supportResponse: "استجابة فريق الدعم",
    noSupportResponse: "لم يصل رد من فريق الدعم حتى الآن.",
    replies: "ردود المتابعة",
    noReplies: "لا توجد ردود متابعة لهذه التذكرة.",
    repliesError: "تعذر تحميل ردود التذكرة.",
    repliesLoading: "جاري تحميل الردود...",
    replyPlaceholder: "اكتب رد متابعة...",
    sendReply: "إرسال الرد",
    replySent: "تم إرسال الرد.",
    replyError: "تعذر إرسال الرد.",
    close: "إغلاق التذكرة",
    reopen: "إعادة فتح التذكرة",
    closedOk: "تم إغلاق التذكرة.",
    reopenedOk: "تمت إعادة فتح التذكرة.",
    statusError: "تعذر تحديث حالة التذكرة.",
    modalTitle: "إنشاء تذكرة دعم",
    cancel: "إلغاء",
    create: "إرسال التذكرة",
    createOk: "تم إنشاء التذكرة.",
    createError: "تعذر إنشاء التذكرة.",
    titleField: "عنوان التذكرة",
    detailsField: "تفاصيل المشكلة أو الطلب",
    unknown: "غير محدد",
    openCount: "التذاكر النشطة",
    conversation: "المحادثة",
    originalRequest: "الطلب الأساسي",
    requester: "المنشأة",
    supportTeam: "فريق الدعم",
    context: "معلومات التذكرة",
    showContext: "إظهار معلومات التذكرة",
    hideContext: "إخفاء معلومات التذكرة",
    backToTickets: "العودة إلى التذاكر",
    noConversation: "لا توجد رسائل متابعة بعد.",
  },
  EN: {
    title: "Support Center",
    description: "Manage support tickets, replies, and processing status within the organization.",
    flow: "Organization → ticket → follow-up → closure",
    total: "Total tickets",
    open: "Open",
    closed: "Closed",
    waiting: "Awaiting support",
    newTicket: "New ticket",
    refresh: "Refresh",
    search: "Search by ticket title or details...",
    filter: "Filter tickets",
    all: "All",
    ticket: "Ticket",
    subject: "Subject",
    created: "Created",
    updated: "Last updated",
    response: "Support response",
    status: "Status",
    responded: "Responded",
    noResponse: "Awaiting response",
    matching: "Matching results",
    ordered: "Recently updated first",
    showing: "Showing",
    of: "of",
    noTickets: "No matching support tickets.",
    selectTicket: "Select a ticket from the table to view its details.",
    loading: "Loading support tickets...",
    loadError: "Failed to load support tickets.",
    retry: "Retry",
    organization: "Organization",
    details: "Ticket details",
    supportResponse: "Support response",
    noSupportResponse: "No support response has been received yet.",
    replies: "Follow-up replies",
    noReplies: "No follow-up replies for this ticket.",
    repliesError: "Failed to load ticket replies.",
    repliesLoading: "Loading replies...",
    replyPlaceholder: "Type a follow-up reply...",
    sendReply: "Send reply",
    replySent: "Reply sent.",
    replyError: "Failed to send reply.",
    close: "Close ticket",
    reopen: "Reopen ticket",
    closedOk: "Ticket closed.",
    reopenedOk: "Ticket reopened.",
    statusError: "Failed to update ticket status.",
    modalTitle: "Create support ticket",
    cancel: "Cancel",
    create: "Submit ticket",
    createOk: "Ticket created.",
    createError: "Failed to create ticket.",
    titleField: "Ticket title",
    detailsField: "Describe the issue or request",
    unknown: "Not specified",
    openCount: "Active tickets",
    conversation: "Conversation",
    originalRequest: "Original request",
    requester: "Organization",
    supportTeam: "Support team",
    context: "Ticket information",
    showContext: "Show ticket information",
    hideContext: "Hide ticket information",
    backToTickets: "Back to tickets",
    noConversation: "No follow-up messages yet.",
  },
};

function cleanDisplayText(value: unknown, fallback: string) {
  const raw = String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return fallback;

  const withoutIdentifiers = raw
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "",
    )
    .replace(/\b(?:ticket|reply|message|user|id)_[a-z0-9_-]+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return withoutIdentifiers || fallback;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-[var(--nc-text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function HelpdeskView({
  initialTickets,
  tenantName,
  initialLoadFailed = false,
}: HelpdeskViewProps) {
  const { lang } = useApp();
  const language = lang === "EN" ? "EN" : "AR";
  const t = TEXT[language];
  const isArabic = language === "AR";

  const [tickets, setTickets] = useState<TicketRecord[]>(initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTickets[0]?.id || null,
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | TicketStatus>("ALL");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(
    initialLoadFailed ? t.loadError : "",
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newChannel, setNewChannel] = useState<"EMAIL" | "SMS" | "WHATSAPP">(
    "EMAIL",
  );
  const [saving, setSaving] = useState(false);

  const [busyTicketId, setBusyTicketId] = useState("");
  const [replies, setReplies] = useState<ReplyRecord[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesError, setRepliesError] = useState("");
  const [replyInput, setReplyInput] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  const formatNumber = (value: number | string) =>
    isArabic ? toArabicNumerals(value) : String(value);

  const formatDateTime = (value?: string | null) => {
    if (!value) return t.unknown;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t.unknown;

    const pad = (part: number) => String(part).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(
      date.getFullYear(),
    ).slice(-2)} • ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const organizationName = cleanDisplayText(tenantName, t.unknown);

  const sortedTickets = useMemo(
    () =>
      [...tickets].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      ),
    [tickets],
  );

  const ticketNumber = useCallback(
    (ticket: TicketRecord) => {
      const chronological = [...tickets].sort(
        (left, right) =>
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime(),
      );
      const index = chronological.findIndex((item) => item.id === ticket.id);
      return `${t.ticket} #${String(Math.max(1, index + 1)).padStart(3, "0")}`;
    },
    [t.ticket, tickets],
  );

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortedTickets.filter((ticket) => {
      const matchesFilter =
        filter === "ALL" || ticket.status.toUpperCase() === filter;
      const haystack = `${ticket.title} ${ticket.description}`.toLowerCase();
      const matchesQuery =
        !normalizedQuery || haystack.includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [filter, query, sortedTickets]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTickets.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredTickets.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const selectedTicket =
    sortedTickets.find((ticket) => ticket.id === selectedId) || null;

  const openCount = tickets.filter(
    (ticket) => ticket.status.toUpperCase() === "OPEN",
  ).length;
  const closedCount = tickets.filter(
    (ticket) => ticket.status.toUpperCase() === "CLOSED",
  ).length;
  const waitingCount = tickets.filter(
    (ticket) =>
      ticket.status.toUpperCase() === "OPEN" && !ticket.aiResponse?.trim(),
  ).length;

  const visibleStart =
    filteredTickets.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const visibleEnd = Math.min(
    safePage * PAGE_SIZE,
    filteredTickets.length,
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (
      selectedId &&
      filteredTickets.some((ticket) => ticket.id === selectedId)
    ) {
      return;
    }

    setSelectedId(filteredTickets[0]?.id || null);
  }, [filteredTickets, selectedId]);

  useEffect(() => {
    setLoadError(initialLoadFailed ? t.loadError : "");
  }, [initialLoadFailed, t.loadError]);

  useEffect(() => {
    if (!editorOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        setEditorOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [editorOpen, saving]);

  const loadTickets = useCallback(
    async (preferredId?: string | null) => {
      setIsLoading(true);
      setLoadError("");

      try {
        const result = await getTicketsAction();

        if (!result.success) {
          setLoadError(result.error || t.loadError);
          return;
        }

        setTickets(result.data);
        const targetId =
          preferredId && result.data.some((ticket) => ticket.id === preferredId)
            ? preferredId
            : result.data[0]?.id || null;
        setSelectedId(targetId);
      } catch {
        setLoadError(t.loadError);
      } finally {
        setIsLoading(false);
      }
    },
    [t.loadError],
  );

  useEffect(() => {
    if (!selectedTicket) {
      setReplies([]);
      setRepliesError("");
      return;
    }

    let cancelled = false;
    const ticketId = selectedTicket.id;

    async function loadReplies() {
      setRepliesLoading(true);
      setRepliesError("");

      try {
        const response = await fetch(
          `/api/v1/support/tickets/${ticketId}/reply`,
          { cache: "no-store" },
        );
        const payload = await response.json();

        if (cancelled) return;

        if (!response.ok || !payload.success) {
          setReplies([]);
          setRepliesError(payload.error || t.repliesError);
          return;
        }

        setReplies(Array.isArray(payload.data) ? payload.data : []);
      } catch {
        if (!cancelled) {
          setReplies([]);
          setRepliesError(t.repliesError);
        }
      } finally {
        if (!cancelled) setRepliesLoading(false);
      }
    }

    void loadReplies();

    return () => {
      cancelled = true;
    };
  }, [selectedTicket?.id, t.repliesError]);

  function beginCreate() {
    setNewTitle("");
    setNewDescription("");
    setNewEmail("");
    setNewPhone("");
    setNewChannel("EMAIL");
    setEditorOpen(true);
  }

  async function createTicket() {
    if (!newTitle.trim() || !newDescription.trim()) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", newTitle.trim());
      formData.append("description", newDescription.trim());
      formData.append("email", newEmail.trim());
      formData.append("phone", newPhone.trim());
      formData.append("channel", newChannel);

      const result = await createTicketAction(formData);

      if (!result.success) {
        toast.error(result.error || t.createError);
        return;
      }

      toast.success(t.createOk);
      setEditorOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewEmail("");
      setNewPhone("");
      setNewChannel("EMAIL");
      await loadTickets(result.ticket.id);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTicketStatus(ticket: TicketRecord) {
    setBusyTicketId(ticket.id);

    try {
      const isClosed = ticket.status.toUpperCase() === "CLOSED";
      const result = isClosed
        ? await reopenTicketAction(ticket.id)
        : await closeTicketAction(ticket.id);

      if (!result.success) {
        toast.error(result.error || t.statusError);
        return;
      }

      setTickets((current) =>
        current.map((item) =>
          item.id === ticket.id ? result.ticket : item,
        ),
      );
      toast.success(isClosed ? t.reopenedOk : t.closedOk);
    } finally {
      setBusyTicketId("");
    }
  }

  async function sendReply() {
    if (!selectedTicket || !replyInput.trim()) return;

    setSendingReply(true);
    try {
      const response = await fetch(
        `/api/v1/support/tickets/${selectedTicket.id}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: replyInput.trim() }),
        },
      );
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        toast.error(payload.error || t.replyError);
        return;
      }

      setReplies((current) => [...current, payload.data]);
      setReplyInput("");
      toast.success(t.replySent);
    } catch {
      toast.error(t.replyError);
    } finally {
      setSendingReply(false);
    }
  }

  const statusLabel = (ticket: TicketRecord) =>
    ticket.status.toUpperCase() === "CLOSED" ? t.closed : t.open;

  const statusClass = (ticket: TicketRecord) =>
    ticket.status.toUpperCase() === "CLOSED"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className="nc-page nc-stack orca-container pb-4"
      data-helpdesk-property-workspace
      data-support-split-workspace
    >
      <header className="orca-workspace-hero">
        <div>
          <p className="text-xs font-bold text-[var(--nc-accent)]">
            {t.flow}
          </p>
          <h1 className="mt-1 text-2xl font-black">{t.title}</h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
            {t.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void loadTickets(selectedId)}
            disabled={isLoading}
            className="nc-btn nc-btn-ghost min-h-[44px] rounded-xl border border-[var(--nc-border)] px-4 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={isLoading ? "animate-spin" : ""}
            />
            {t.refresh}
          </button>

          <button
            type="button"
            onClick={beginCreate}
            className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-black"
          >
            <Plus size={16} />
            {t.newTicket}
          </button>
        </div>
      </header>

      <div className="orca-workspace-metrics">
        {[
          { label: t.total, value: formatNumber(tickets.length), icon: Headphones },
          { label: t.open, value: formatNumber(openCount), icon: Clock3 },
          { label: t.closed, value: formatNumber(closedCount), icon: TicketCheck },
          { label: t.waiting, value: formatNumber(waitingCount), icon: MessageSquareText },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="orca-workspace-metric min-h-[84px]">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--nc-text-secondary)]">
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <strong className="mt-3 block text-2xl">{value}</strong>
          </div>
        ))}
      </div>

      <div className="orca-workspace-note flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="text-[var(--nc-text-secondary)]">
          {t.openCount}:
        </span>
        <strong>{formatNumber(openCount)}</strong>
        <span className="text-[var(--nc-border)]">|</span>
        <span className="text-[var(--nc-text-secondary)]">
          {t.matching}:
        </span>
        <strong>{formatNumber(filteredTickets.length)}</strong>
        <span className="text-[var(--nc-border)]">|</span>
        <span className="text-[var(--nc-text-secondary)]">{t.ordered}</span>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-700 dark:text-rose-200"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadTickets(selectedId)}
            className="nc-btn nc-btn-ghost min-h-[44px] rounded-xl border border-rose-500/30 px-4 text-xs font-black"
          >
            {t.retry}
          </button>
        </div>
      ) : null}

      <div
        dir="ltr"
        className="grid min-w-0 gap-3 lg:grid-cols-[340px_minmax(0,1fr)]"
        data-four-page-two-card-workspace
      >
        <aside
          dir={isArabic ? "rtl" : "ltr"}
          data-support-ticket-list
          data-operational-list-card
          className={`orca-workspace-panel min-w-0 flex-col overflow-hidden lg:flex lg:h-[520px] ${
            mobileDetailOpen ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="orca-workspace-toolbar border-b border-[var(--nc-border)] p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
              <label className="relative min-w-0">
                <Search
                  size={16}
                  className={`absolute top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)] ${
                    isArabic ? "right-3" : "left-3"
                  }`}
                />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t.search}
                  className={`min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] py-2.5 text-sm outline-none focus:border-[var(--nc-accent-border)] ${
                    isArabic ? "pl-3 pr-10" : "pl-10 pr-3"
                  }`}
                />
              </label>

              <SettingsSelect
                value={filter}
                onChange={(value) => {
                  setFilter(value as "ALL" | TicketStatus);
                  setPage(1);
                }}
                aria-label={t.filter}
                options={[
                  { value: "ALL", label: t.all },
                  { value: "OPEN", label: t.open },
                  { value: "CLOSED", label: t.closed },
                ]}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isLoading && tickets.length === 0 ? (
              <div className="flex h-full min-h-[220px] items-center justify-center gap-2 text-sm text-[var(--nc-text-secondary)]">
                <Loader2
                  size={18}
                  className="animate-spin text-[var(--nc-accent)]"
                />
                {t.loading}
              </div>
            ) : pageItems.length === 0 ? (
              <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] p-6 text-center text-sm text-[var(--nc-text-secondary)]">
                {t.noTickets}
              </div>
            ) : (
              <div className="space-y-2">
                {pageItems.map((ticket) => {
                  const selected = ticket.id === selectedId;
                  const hasSupportResponse = Boolean(ticket.aiResponse?.trim());

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      data-ticket-row
                      aria-pressed={selected}
                      onClick={() => {
                        setSelectedId(ticket.id);
                        setMobileDetailOpen(true);
                      }}
                      className={`group flex h-[68px] w-full items-center gap-3 rounded-2xl border px-3 text-start outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-border)] ${
                        selected
                          ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]"
                          : "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-accent)]"
                      }`}
                    >
                      <span
                        className={`h-9 w-1 shrink-0 rounded-full ${
                          ticket.status.toUpperCase() === "CLOSED"
                            ? "bg-emerald-500/70"
                            : hasSupportResponse
                              ? "bg-sky-500/70"
                              : "bg-amber-500/70"
                        }`}
                        aria-hidden="true"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <strong className="truncate text-sm">
                            {cleanDisplayText(ticket.title, t.unknown)}
                          </strong>
                          <time
                            dir="ltr"
                            className="shrink-0 text-[11px] text-[var(--nc-text-dim)]"
                          >
                            {formatDateTime(ticket.updatedAt)}
                          </time>
                        </span>

                        <span className="mt-1 flex items-center justify-between gap-2">
                          <span className="min-w-0 flex items-center gap-2">
                            <span className="shrink-0 text-[11px] font-bold text-[var(--nc-text-dim)]">
                              {ticketNumber(ticket)}
                            </span>
                            <span className="min-w-0 truncate text-xs text-[var(--nc-text-secondary)]">
                              {cleanDisplayText(ticket.description, t.unknown)}
                            </span>
                          </span>
                          <span
                            className={`inline-flex min-w-[76px] shrink-0 justify-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass(
                              ticket,
                            )}`}
                          >
                            {statusLabel(ticket)}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="orca-workspace-pagination flex min-h-[56px] items-center justify-between gap-2 border-t border-[var(--nc-border)] px-3 py-2 text-xs text-[var(--nc-text-secondary)]">
            <span>
              {isArabic
                ? `${formatNumber(visibleStart)}–${formatNumber(
                    visibleEnd,
                  )} من ${formatNumber(filteredTickets.length)}`
                : `${visibleStart}–${visibleEnd} of ${filteredTickets.length}`}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                className="nc-btn nc-btn-ghost min-h-[44px] min-w-[44px] rounded-xl border border-[var(--nc-border)] px-3 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isArabic ? "الصفحة السابقة" : "Previous page"}
              >
                {isArabic ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
              </button>

              <span className="min-w-12 text-center font-bold text-[var(--nc-text-primary)]">
                {formatNumber(safePage)} / {formatNumber(totalPages)}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={safePage >= totalPages}
                className="nc-btn nc-btn-ghost min-h-[44px] min-w-[44px] rounded-xl border border-[var(--nc-border)] px-3 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isArabic ? "الصفحة التالية" : "Next page"}
              >
                {isArabic ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
              </button>
            </div>
          </div>
        </aside>

        <section
          dir={isArabic ? "rtl" : "ltr"}
          data-support-conversation
          data-operational-detail-card
          className={`orca-workspace-panel min-w-0 flex-col overflow-hidden lg:flex lg:h-[520px] ${
            mobileDetailOpen ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedTicket ? (
            <>
              <header className="flex min-h-[78px] shrink-0 items-center justify-between gap-3 border-b border-[var(--nc-border)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileDetailOpen(false)}
                    className="nc-btn nc-btn-ghost min-h-[44px] min-w-[44px] rounded-xl border border-[var(--nc-border)] px-3 lg:hidden"
                    aria-label={t.backToTickets}
                  >
                    {isArabic ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                  </button>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--nc-accent)]">
                      {ticketNumber(selectedTicket)}
                    </p>
                    <h2 className="mt-1 truncate text-lg font-black">
                      {cleanDisplayText(selectedTicket.title, t.unknown)}
                    </h2>
                    <p
                      dir="ltr"
                      className="mt-1 text-xs text-[var(--nc-text-secondary)]"
                    >
                      {formatDateTime(selectedTicket.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`hidden min-w-[82px] justify-center rounded-full border px-3 py-1 text-xs font-bold sm:inline-flex ${statusClass(
                      selectedTicket,
                    )}`}
                  >
                    {statusLabel(selectedTicket)}
                  </span>

                  <button
                    type="button"
                    onClick={() => void toggleTicketStatus(selectedTicket)}
                    disabled={busyTicketId === selectedTicket.id}
                    className="nc-btn nc-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyTicketId === selectedTicket.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : selectedTicket.status.toUpperCase() === "CLOSED" ? (
                      <RotateCcw size={16} />
                    ) : (
                      <Archive size={16} />
                    )}
                    <span className="hidden sm:inline">
                      {selectedTicket.status.toUpperCase() === "CLOSED"
                        ? t.reopen
                        : t.close}
                    </span>
                  </button>
                </div>
              </header>

              <section className="shrink-0 border-b border-[var(--nc-border)] px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => setContextOpen((current) => !current)}
                  className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-2 text-xs font-bold text-[var(--nc-text-secondary)] hover:bg-[var(--nc-surface-strong)]"
                  aria-expanded={contextOpen}
                >
                  <span>{t.context}</span>
                  {contextOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </button>

                {contextOpen ? (
                  <div className="grid gap-2 pb-2 sm:grid-cols-3">
                    <div className="orca-info-cell min-h-[56px]">
                      <span>{t.organization}</span>
                      <strong className="truncate">{organizationName}</strong>
                    </div>
                    <div className="orca-info-cell min-h-[56px]">
                      <span>{t.created}</span>
                      <strong dir="ltr">
                        {formatDateTime(selectedTicket.createdAt)}
                      </strong>
                    </div>
                    <div className="orca-info-cell min-h-[56px]">
                      <span>{t.updated}</span>
                      <strong dir="ltr">
                        {formatDateTime(selectedTicket.updatedAt)}
                      </strong>
                    </div>
                  </div>
                ) : null}
              </section>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="mx-auto flex max-w-4xl flex-col gap-2.5">
                  <article className="max-w-[74%] self-start rounded-2xl rounded-tl-md border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3.5 py-2.5">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <strong className="text-[var(--nc-accent)]">
                        {t.originalRequest}
                      </strong>
                      <time dir="ltr" className="text-[var(--nc-text-dim)]">
                        {formatDateTime(selectedTicket.createdAt)}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap leading-7 text-[var(--nc-text-primary)]">
                      {cleanDisplayText(selectedTicket.description, t.unknown)}
                    </p>
                  </article>

                  {selectedTicket.aiResponse?.trim() ? (
                    <article className="max-w-[74%] self-end rounded-2xl rounded-tr-md border border-sky-500/25 bg-sky-500/10 px-3.5 py-2.5">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                        <strong className="text-sky-700 dark:text-sky-300">
                          {t.supportTeam}
                        </strong>
                        <time dir="ltr" className="text-[var(--nc-text-dim)]">
                          {formatDateTime(selectedTicket.updatedAt)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap leading-7">
                        {cleanDisplayText(
                          selectedTicket.aiResponse,
                          t.noSupportResponse,
                        )}
                      </p>
                    </article>
                  ) : null}

                  {repliesLoading ? (
                    <div className="flex min-h-[120px] items-center justify-center gap-2 text-sm text-[var(--nc-text-secondary)]">
                      <Loader2 size={17} className="animate-spin" />
                      {t.repliesLoading}
                    </div>
                  ) : repliesError ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-sm text-rose-700 dark:text-rose-200"
                    >
                      {repliesError}
                    </div>
                  ) : replies.length === 0 && !selectedTicket.aiResponse?.trim() ? (
                    <div className="rounded-xl border border-dashed border-[var(--nc-border)] px-3 py-5 text-center text-sm text-[var(--nc-text-secondary)]">
                      {t.noConversation}
                    </div>
                  ) : (
                    replies.map((reply) => {
                      const fromSupport =
                        reply.sender === "SUPPORT" || reply.sender === "AI";

                      return (
                        <article
                          key={reply.id}
                          className={`max-w-[74%] rounded-2xl border px-3.5 py-2.5 ${
                            fromSupport
                              ? "self-end rounded-tr-md border-sky-500/25 bg-sky-500/10"
                              : "self-start rounded-tl-md border-[var(--nc-border)] bg-[var(--nc-surface-solid)]"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                            <strong
                              className={
                                fromSupport
                                  ? "text-sky-700 dark:text-sky-300"
                                  : "text-[var(--nc-accent)]"
                              }
                            >
                              {fromSupport ? t.supportTeam : t.requester}
                            </strong>
                            <time dir="ltr" className="text-[var(--nc-text-dim)]">
                              {formatDateTime(reply.createdAt)}
                            </time>
                          </div>
                          <p className="whitespace-pre-wrap leading-7">
                            {cleanDisplayText(reply.message, t.unknown)}
                          </p>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>

              <footer className="shrink-0 border-t border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-2.5">
                {selectedTicket.status.toUpperCase() === "OPEN" ? (
                  <div className="mx-auto grid max-w-4xl items-center gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
                    <textarea
                      rows={2}
                      value={replyInput}
                      onChange={(event) => setReplyInput(event.target.value)}
                      placeholder={t.replyPlaceholder}
                      className="orca-form-textarea min-h-[56px] max-h-[88px] w-full resize-y rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2 outline-none focus:border-[var(--nc-accent-border)]"
                    />
                    <button
                      type="button"
                      onClick={() => void sendReply()}
                      disabled={sendingReply || !replyInput.trim()}
                      className="nc-btn-primary inline-flex h-11 min-h-11 max-h-11 w-full items-center justify-center gap-2 self-center rounded-xl px-4 font-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-[120px] sm:justify-self-center"
                    >
                      {sendingReply ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      {t.sendReply}
                    </button>
                  </div>
                ) : (
                  <div className="mx-auto max-w-4xl rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3 text-center text-sm font-bold text-[var(--nc-text-secondary)]">
                    {t.closed}
                  </div>
                )}
              </footer>
            </>
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center p-6 text-center text-sm text-[var(--nc-text-secondary)]">
              {t.selectTicket}
            </div>
          )}
        </section>
      </div>

      {editorOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="orca-dialog-overlay fixed inset-x-0 bottom-0 top-[88px] z-[140] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-6 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) {
                  setEditorOpen(false);
                }
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="helpdesk-editor-title"
                className="orca-dialog w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] shadow-2xl"
              >
                <div className="orca-dialog-header">
                  <div>
                    <p className="text-xs font-bold text-[var(--nc-accent)]">
                      {t.title}
                    </p>
                    <h2
                      id="helpdesk-editor-title"
                      className="mt-1 text-lg font-black"
                    >
                      {t.modalTitle}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    disabled={saving}
                    className="orca-dialog-close min-h-[44px] min-w-[44px]"
                    aria-label={t.cancel}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void createTicket();
                  }}
                  className="max-h-[calc(100vh-190px)] overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <div className="grid gap-4">
                    <Field label={t.titleField}>
                      <input
                        value={newTitle}
                        onChange={(event) => setNewTitle(event.target.value)}
                        maxLength={160}
                        required
                        autoFocus
                        className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2.5 outline-none focus:border-[var(--nc-accent-border)]"
                      />
                    </Field>

                    <Field label={t.detailsField}>
                      <textarea
                        rows={5}
                        value={newDescription}
                        onChange={(event) => setNewDescription(event.target.value)}
                        maxLength={5000}
                        required
                        className="orca-form-textarea min-h-[120px] max-h-[220px] w-full resize-y rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2.5 outline-none focus:border-[var(--nc-accent-border)]"
                      />
                    </Field>

                    <Field label="Channel">
                      <select
                        value={newChannel}
                        onChange={(event) =>
                          setNewChannel(
                            event.target.value as "EMAIL" | "SMS" | "WHATSAPP",
                          )
                        }
                        className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2.5 outline-none focus:border-[var(--nc-accent-border)]"
                      >
                        <option value="EMAIL">EMAIL</option>
                        <option value="SMS">SMS</option>
                        <option value="WHATSAPP">WHATSAPP</option>
                      </select>
                    </Field>

                    <Field label="Email">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(event) => setNewEmail(event.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2.5 outline-none focus:border-[var(--nc-accent-border)]"
                      />
                    </Field>

                    <Field label="Phone">
                      <input
                        value={newPhone}
                        onChange={(event) => setNewPhone(event.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2.5 outline-none focus:border-[var(--nc-accent-border)]"
                      />
                    </Field>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setEditorOpen(false)}
                        disabled={saving}
                        className="nc-btn nc-btn-ghost min-h-[44px] rounded-xl border border-[var(--nc-border)] px-4 font-bold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="submit"
                        disabled={
                          saving ||
                          newTitle.trim().length < 3 ||
                          newDescription.trim().length < 5
                        }
                        className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 font-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        {t.create}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
