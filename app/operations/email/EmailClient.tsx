"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  MailOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";

import { getEmailMessagesAction, sendEmailAction } from "@/app/actions/email";
import { useApp } from "@/app/context/AppContext";
import SettingsSelect from "@/components/settings/SettingsSelect";
import { toArabicNumerals } from "@/lib/formatters";

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  status: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  htmlBody?: string | null;
  textBody?: string | null;
  createdAt: string;
  sentAt: string | null;
  lead?: { firstName: string; lastName: string | null } | null;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

interface EmailClientProps {
  initialMessages: EmailMessage[];
  leads: Lead[];
  emailFrom: string | null;
  providerConfigured: boolean;
  providerName: "RESEND" | "SMTP" | null;
}

interface RecipientOption {
  value: string;
  label: string;
  meta: string;
  leadId: string;
}

const PAGE_SIZE = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TEXT = {
  AR: {
    title: "البريد الإلكتروني",
    description: "إدارة الرسائل الصادرة ومتابعة حالتها وربطها بالعملاء.",
    flow: "العميل ← الرسالة ← الإرسال ← المتابعة",
    totalEmails: "إجمالي الرسائل",
    sentEmails: "المرسلة",
    pendingEmails: "قيد الانتظار",
    failedEmails: "المتعذرة",
    newMessage: "رسالة جديدة",
    refresh: "تحديث",
    search: "ابحث بالموضوع أو المستلم...",
    filter: "تصفية البريد",
    all: "الكل",
    sent: "مرسلة",
    pending: "قيد الانتظار",
    failed: "متعذرة",
    read: "مقروءة",
    unknownStatus: "غير محددة",
    matching: "النتائج المطابقة",
    latestFirst: "الأحدث أولًا",
    customer: "العميل",
    from: "من",
    to: "إلى",
    subject: "الموضوع",
    body: "محتوى الرسالة",
    bodyPlaceholder: "اكتب محتوى البريد...",
    recipientPlaceholder: "ابحث عن عميل أو أدخل بريدًا إلكترونيًا...",
    noRecipients: "لا توجد نتائج مطابقة. يمكنك إدخال بريد خارجي صحيح.",
    send: "إرسال",
    sending: "جارٍ الإرسال...",
    sentOk: "تم إرسال البريد.",
    sendError: "تعذر إرسال البريد.",
    invalidEmail: "أدخل بريدًا إلكترونيًا صحيحًا.",
    subjectRequired: "أدخل موضوع الرسالة.",
    bodyRequired: "اكتب محتوى الرسالة.",
    noMessages: "لا توجد رسائل مطابقة.",
    selectMessage: "اختر رسالة من القائمة لعرض تفاصيلها.",
    loading: "جاري تحميل الرسائل...",
    loadError: "تعذر تحميل الرسائل.",
    retry: "إعادة المحاولة",
    externalRecipient: "مستلم خارجي",
    unknown: "غير محدد",
    messageContentUnavailable: "محتوى الرسالة غير متاح في السجل الحالي.",
    deliveryError: "سبب التعذر",
    messageDetails: "معلومات الرسالة",
    backToMessages: "العودة إلى الرسائل",
    pagePrevious: "الصفحة السابقة",
    pageNext: "الصفحة التالية",
    draft: "مسودة",
    providerMissing: "لم يتم ربط مزود بريد بهذه المنشأة.",
    providerMissingHelp:
      "يمكنك حفظ الرسالة كمسودة أو إعداد مزود البريد من صفحة التكاملات.",
    configureProvider: "إعداد مزود البريد",
    connectSmtp: "ربط SMTP",
    connectResend: "ربط Resend",
    saveDraft: "حفظ كمسودة",
    draftSaved: "تم حفظ الرسالة كمسودة.",
    senderUnavailable: "غير مرتبط",
  },
  EN: {
    title: "Email",
    description: "Manage outbound messages, delivery status, and customer links.",
    flow: "Customer → message → delivery → follow-up",
    totalEmails: "Total emails",
    sentEmails: "Sent",
    pendingEmails: "Pending",
    failedEmails: "Failed",
    newMessage: "New message",
    refresh: "Refresh",
    search: "Search by subject or recipient...",
    filter: "Filter email",
    all: "All",
    sent: "Sent",
    pending: "Pending",
    failed: "Failed",
    read: "Read",
    unknownStatus: "Unknown",
    matching: "Matching results",
    latestFirst: "Latest first",
    customer: "Customer",
    from: "From",
    to: "To",
    subject: "Subject",
    body: "Message body",
    bodyPlaceholder: "Write email content...",
    recipientPlaceholder: "Search customers or enter an email address...",
    noRecipients: "No matching results. You can enter a valid external email.",
    send: "Send",
    sending: "Sending...",
    sentOk: "Email sent.",
    sendError: "Failed to send email.",
    invalidEmail: "Enter a valid email address.",
    subjectRequired: "Enter a subject.",
    bodyRequired: "Write the message body.",
    noMessages: "No matching messages.",
    selectMessage: "Select a message from the list to view its details.",
    loading: "Loading messages...",
    loadError: "Failed to load messages.",
    retry: "Retry",
    externalRecipient: "External recipient",
    unknown: "Not specified",
    messageContentUnavailable: "Message content is unavailable in the current record.",
    deliveryError: "Delivery error",
    messageDetails: "Message information",
    backToMessages: "Back to messages",
    pagePrevious: "Previous page",
    pageNext: "Next page",
    draft: "Draft",
    providerMissing: "No email provider is connected to this organization.",
    providerMissingHelp:
      "You can save the message as a draft or configure email delivery in Integrations.",
    configureProvider: "Configure email provider",
    connectSmtp: "Connect SMTP",
    connectResend: "Connect Resend",
    saveDraft: "Save draft",
    draftSaved: "Message saved as a draft.",
    senderUnavailable: "Not connected",
  },
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isTechnicalText(value: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    ) ||
    /(?:^|\b)(?:email|message|lead|user|task|id)_[a-z0-9_-]+(?:\b|$)/i.test(
      value,
    )
  );
}

function cleanDisplayText(value: unknown, fallback: string) {
  const raw = stripHtml(String(value || "")).trim();
  if (!raw || isTechnicalText(raw)) return fallback;

  const cleaned = raw
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "",
    )
    .replace(/\b(?:EMAIL|MESSAGE|LEAD|USER|TASK)_[A-Z0-9_]+\b/g, "")
    .replace(/\b(?:email|message|lead|user|task|id)_[a-z0-9_-]+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned || fallback;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTimeValue(
  value: string | null | undefined,
  fallback: string,
) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(
    date.getFullYear(),
  ).slice(-2)} • ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isLegacyGlobalEmailProviderText(value: unknown) {
  const text = String(value || "");
  return /(?:onboarding@resend\.dev|RESEND_API_KEY|EMAIL_FROM)/i.test(text);
}

export default function EmailClient({
  initialMessages,
  leads,
  emailFrom,
  providerConfigured,
  providerName,
}: EmailClientProps) {
  const { lang } = useApp();
  const searchParams = useSearchParams();
  const language = lang === "EN" ? "EN" : "AR";
  const t = TEXT[language];
  const isArabic = language === "AR";

  const [messages, setMessages] = useState<EmailMessage[]>(initialMessages);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialMessages[0]?.id || null,
  );
  const [isComposing, setIsComposing] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [to, setTo] = useState(searchParams.get("email") || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [leadId, setLeadId] = useState(searchParams.get("leadId") || "");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const formatNumber = (value: number | string) =>
    isArabic ? toArabicNumerals(value) : String(value);

  const formatDateTime = (value?: string | null) =>
    formatDateTimeValue(value, t.unknown);

  const recipientOptions = useMemo<RecipientOption[]>(
    () =>
      leads
        .filter((lead) => Boolean(lead.email?.trim()))
        .map((lead) => {
          const name = cleanDisplayText(
            `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
            t.customer,
          );
          const email = String(lead.email || "").trim();

          return {
            value: email,
            label: name,
            meta: email,
            leadId: lead.id,
          };
        }),
    [leads, t.customer],
  );

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (left, right) =>
          new Date(right.sentAt || right.createdAt).getTime() -
          new Date(left.sentAt || left.createdAt).getTime(),
      ),
    [messages],
  );

  useEffect(() => {
    const leadParam = searchParams.get("leadId");
    const emailParam = searchParams.get("email");
    if (leadParam) setLeadId(leadParam);
    if (emailParam) setTo(emailParam);
  }, [searchParams]);

  const statusLabel = useCallback(
    (status: string) => {
      if (status === "SENT") return t.sent;
      if (status === "FAILED") return t.failed;
      if (status === "PENDING") return t.pending;
      if (status === "READ") return t.read;
      return t.unknownStatus;
    },
    [t],
  );

  const statusClass = (status: string) => {
    if (status === "SENT" || status === "READ") {
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    }

    if (status === "FAILED") {
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    }

    if (status === "PENDING") {
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    }

    return "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-[var(--nc-text-secondary)]";
  };

  const displayRecipient = (value: string) =>
    cleanDisplayText(value, t.externalRecipient);

  const displaySubject = (message: EmailMessage) =>
    cleanDisplayText(message.subject, t.unknown);

  const leadName = (message: EmailMessage | null) => {
    if (!message?.lead) return t.externalRecipient;

    return cleanDisplayText(
      `${message.lead.firstName || ""} ${
        message.lead.lastName || ""
      }`.trim(),
      t.externalRecipient,
    );
  };

  const filteredMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortedMessages.filter((message) => {
      const haystack = `${displayRecipient(message.to)} ${displaySubject(
        message,
      )} ${leadName(message)}`.toLowerCase();

      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        (filter === "ALL" || message.status === filter)
      );
    });
  }, [filter, query, sortedMessages, language]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMessages.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredMessages.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const visibleStart =
    filteredMessages.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const visibleEnd = Math.min(
    safePage * PAGE_SIZE,
    filteredMessages.length,
  );
  const selectedMessage =
    sortedMessages.find((message) => message.id === selectedId) || null;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (isComposing) return;
    if (
      selectedId &&
      filteredMessages.some((message) => message.id === selectedId)
    ) {
      return;
    }

    setSelectedId(filteredMessages[0]?.id || null);
  }, [filteredMessages, isComposing, selectedId]);

  const sentCount = messages.filter(
    (message) => message.status === "SENT" || message.status === "READ",
  ).length;
  const pendingCount = messages.filter(
    (message) => message.status === "PENDING",
  ).length;
  const failedCount = messages.filter(
    (message) => message.status === "FAILED",
  ).length;

  const loadMessages = useCallback(
    async (preferredId?: string | null) => {
      setIsLoading(true);
      setLoadError("");

      try {
        const result = await getEmailMessagesAction(50);
        if (!result.success) {
          throw new Error(t.loadError);
        }

        const next = result.messages.map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString(),
          sentAt: message.sentAt?.toISOString() || null,
          lead: message.lead
            ? {
                firstName: message.lead.firstName,
                lastName: message.lead.lastName || null,
              }
            : null,
        })) as EmailMessage[];

        setMessages(next);
        setSelectedId((current) => {
          if (
            preferredId &&
            next.some((message) => message.id === preferredId)
          ) {
            return preferredId;
          }

          if (current && next.some((message) => message.id === current)) {
            return current;
          }

          return next[0]?.id || null;
        });
      } catch (error) {
        setLoadError(
          error instanceof Error && error.message
            ? error.message
            : t.loadError,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [t.loadError],
  );

  function beginCompose() {
    setIsComposing(true);
    setSelectedId(null);
    setMobileDetailOpen(true);
    setSubject("");
    setBody("");

    const emailParam = searchParams.get("email") || "";
    const leadParam = searchParams.get("leadId") || "";
    setTo(emailParam);
    setLeadId(leadParam);
  }

  function openMessage(messageId: string) {
    setIsComposing(false);
    setSelectedId(messageId);
    setMobileDetailOpen(true);
  }

  async function handleSend() {
    const recipient = to.trim();
    const cleanSubject = subject.trim();
    const cleanBody = body.trim();

    if (isSending) return;

    if (!EMAIL_PATTERN.test(recipient)) {
      toast.error(t.invalidEmail);
      return;
    }

    if (!cleanSubject) {
      toast.error(t.subjectRequired);
      return;
    }

    if (!cleanBody) {
      toast.error(t.bodyRequired);
      return;
    }

    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append("to", recipient);
      formData.append("subject", cleanSubject);
      formData.append("htmlBody", cleanBody);
      formData.append("textBody", stripHtml(cleanBody));
      if (leadId) formData.append("leadId", leadId);

      const result = await sendEmailAction(formData);

      if (!result.success) {
        const draftSaved =
          "draftSaved" in result && result.draftSaved === true;

        const errorMessage =
          "error" in result && typeof result.error === "string"
            ? result.error
            : t.sendError;

        if (draftSaved) {
          toast.success(t.draftSaved);
          toast.error(errorMessage);
          setTo("");
          setSubject("");
          setBody("");
          setLeadId("");
          setIsComposing(false);
          await loadMessages(
            "emailId" in result ? result.emailId || null : null,
          );
          return;
        }

        toast.error(errorMessage);
        return;
      }

      toast.success(t.sentOk);
      setTo("");
      setSubject("");
      setBody("");
      setLeadId("");
      setIsComposing(false);
      await loadMessages(result.emailId || null);
    } finally {
      setIsSending(false);
    }
  }

  const selectedBody = selectedMessage
    ? stripHtml(selectedMessage.htmlBody || selectedMessage.textBody || "")
    : "";

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className="nc-page nc-stack orca-container pb-4"
      data-email-property-workspace
      data-email-two-card-workspace
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
            onClick={() => void loadMessages(selectedId)}
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
            onClick={beginCompose}
            className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-black"
          >
            <Plus size={16} />
            {t.newMessage}
          </button>
        </div>
      </header>

      <div className="orca-workspace-metrics">
        {[
          {
            label: t.totalEmails,
            value: formatNumber(messages.length),
            icon: Mail,
          },
          {
            label: t.sentEmails,
            value: formatNumber(sentCount),
            icon: CheckCircle2,
          },
          {
            label: t.pendingEmails,
            value: formatNumber(pendingCount),
            icon: Clock3,
          },
          {
            label: t.failedEmails,
            value: formatNumber(failedCount),
            icon: MailOpen,
          },
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
          {t.matching}:
        </span>
        <strong>{formatNumber(filteredMessages.length)}</strong>
        <span className="text-[var(--nc-border)]">|</span>
        <span className="text-[var(--nc-text-secondary)]">
          {t.sentEmails}:
        </span>
        <strong>{formatNumber(sentCount)}</strong>
        <span className="text-[var(--nc-border)]">|</span>
        <span className="text-[var(--nc-text-secondary)]">
          {t.latestFirst}
        </span>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-700 dark:text-rose-200"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadMessages(selectedId)}
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
          data-email-message-list
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
                  setFilter(value);
                  setPage(1);
                }}
                aria-label={t.filter}
                options={[
                  { value: "ALL", label: t.all },
                  { value: "SENT", label: t.sent },
                  { value: "READ", label: t.read },
                  { value: "PENDING", label: t.pending },
                  { value: "FAILED", label: t.failed },
                ]}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isLoading && messages.length === 0 ? (
              <div className="flex h-full min-h-[220px] items-center justify-center gap-2 text-sm text-[var(--nc-text-secondary)]">
                <Loader2
                  size={18}
                  className="animate-spin text-[var(--nc-accent)]"
                />
                {t.loading}
              </div>
            ) : pageItems.length === 0 ? (
              <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] p-6 text-center text-sm text-[var(--nc-text-secondary)]">
                {t.noMessages}
              </div>
            ) : (
              <div className="space-y-2">
                {pageItems.map((message) => {
                  const selected =
                    message.id === selectedId && !isComposing;

                  return (
                    <button
                      key={message.id}
                      type="button"
                      data-email-row
                      aria-pressed={selected}
                      onClick={() => openMessage(message.id)}
                      className={`group flex h-[68px] w-full items-center gap-3 rounded-2xl border px-3 text-start outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-border)] ${
                        selected
                          ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]"
                          : "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-accent)]"
                      }`}
                    >
                      <span
                        className={`h-9 w-1 shrink-0 rounded-full ${
                          message.status === "FAILED"
                            ? "bg-rose-500/70"
                            : message.status === "PENDING"
                              ? "bg-amber-500/70"
                              : "bg-emerald-500/70"
                        }`}
                        aria-hidden="true"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <strong className="truncate text-sm">
                            {displaySubject(message)}
                          </strong>
                          <time
                            dir="ltr"
                            className="shrink-0 text-[11px] text-[var(--nc-text-dim)]"
                          >
                            {formatDateTime(
                              message.sentAt || message.createdAt,
                            )}
                          </time>
                        </span>

                        <span className="mt-1 flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-xs text-[var(--nc-text-secondary)]">
                            {displayRecipient(message.to)}
                          </span>
                          <span
                            className={`inline-flex min-w-[76px] shrink-0 justify-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass(
                              message.status,
                            )}`}
                          >
                            {statusLabel(message.status)}
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
                  )} من ${formatNumber(filteredMessages.length)}`
                : `${visibleStart}–${visibleEnd} of ${filteredMessages.length}`}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                disabled={safePage <= 1}
                className="nc-btn nc-btn-ghost min-h-[44px] min-w-[44px] rounded-xl border border-[var(--nc-border)] px-3 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t.pagePrevious}
              >
                {isArabic ? (
                  <ChevronRight size={17} />
                ) : (
                  <ChevronLeft size={17} />
                )}
              </button>

              <span className="min-w-12 text-center font-bold text-[var(--nc-text-primary)]">
                {formatNumber(safePage)} / {formatNumber(totalPages)}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(totalPages, current + 1),
                  )
                }
                disabled={safePage >= totalPages}
                className="nc-btn nc-btn-ghost min-h-[44px] min-w-[44px] rounded-xl border border-[var(--nc-border)] px-3 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t.pageNext}
              >
                {isArabic ? (
                  <ChevronLeft size={17} />
                ) : (
                  <ChevronRight size={17} />
                )}
              </button>
            </div>
          </div>
        </aside>

        <section
          dir={isArabic ? "rtl" : "ltr"}
          data-email-detail-card
          data-operational-detail-card
          className={`orca-workspace-panel min-w-0 flex-col overflow-hidden lg:flex lg:h-[520px] ${
            mobileDetailOpen ? "flex" : "hidden lg:flex"
          }`}
        >
          {isComposing ? (
            <>
              <header className="flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-b border-[var(--nc-border)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileDetailOpen(false)}
                    className="nc-btn nc-btn-ghost min-h-[44px] min-w-[44px] rounded-xl border border-[var(--nc-border)] px-3 lg:hidden"
                    aria-label={t.backToMessages}
                  >
                    {isArabic ? (
                      <ChevronRight size={18} />
                    ) : (
                      <ChevronLeft size={18} />
                    )}
                  </button>

                  <div>
                    <p className="text-xs font-bold text-[var(--nc-accent)]">
                      {t.draft}
                    </p>
                    <h2 className="mt-1 text-lg font-black">
                      {t.newMessage}
                    </h2>
                  </div>
                </div>

                <span
                  dir="ltr"
                  className="hidden max-w-[46%] truncate text-xs text-[var(--nc-text-secondary)] sm:block"
                >
                  {emailFrom || t.senderUnavailable}
                </span>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="mx-auto max-w-4xl space-y-3">
                  {!providerConfigured ? (
                    <div
                      role="status"
                      className="flex min-h-[64px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
                      data-email-provider-missing
                    >
                      <div>
                        <p className="text-sm font-black text-amber-700 dark:text-amber-300">
                          {t.providerMissing}
                        </p>
                        <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                          {t.providerMissingHelp}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href="/operations/settings?tab=integrations&category=EMAIL&provider=SMTP&open=1"
                          className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-xs font-black"
                        >
                          {t.connectSmtp}
                        </a>
                        <a
                          href="/operations/settings?tab=integrations&category=EMAIL&provider=RESEND&open=1"
                          className="nc-btn nc-btn-secondary inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-xs font-black"
                        >
                          {t.connectResend}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="sr-only">
                      {providerName || "EMAIL_PROVIDER"}
                    </p>
                  )}

                  <RecipientCombobox
                    value={to}
                    onValueChange={(value) => {
                      setTo(value);
                      const match = recipientOptions.find(
                        (option) => option.value === value,
                      );
                      setLeadId(match?.leadId || "");
                    }}
                    options={recipientOptions}
                    label={t.to}
                    placeholder={t.recipientPlaceholder}
                    emptyText={t.noRecipients}
                  />

                  <label className="block space-y-1.5">
                    <span className="block text-xs font-bold text-[var(--nc-text-secondary)]">
                      {t.subject}
                    </span>
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 text-sm font-bold outline-none focus:border-[var(--nc-accent-border)]"
                      placeholder={t.subject}
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="block text-xs font-bold text-[var(--nc-text-secondary)]">
                      {t.body}
                    </span>
                    <textarea
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      placeholder={t.bodyPlaceholder}
                      rows={8}
                      className="min-h-[190px] w-full resize-none rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-3 text-sm leading-7 outline-none focus:border-[var(--nc-accent-border)]"
                    />
                  </label>
                </div>
              </div>

              <footer className="shrink-0 border-t border-[var(--nc-border)] px-4 py-3">
                <div className="mx-auto flex max-w-4xl justify-end">
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={
                      isSending ||
                      !EMAIL_PATTERN.test(to.trim()) ||
                      !subject.trim() ||
                      !body.trim()
                    }
                    className="nc-btn-primary inline-flex h-11 min-h-11 max-h-11 w-[120px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    {isSending
                      ? t.sending
                      : providerConfigured
                        ? t.send
                        : t.saveDraft}
                  </button>
                </div>
              </footer>
            </>
          ) : selectedMessage ? (
            <>
              <header className="flex min-h-[72px] shrink-0 items-center justify-between gap-3 border-b border-[var(--nc-border)] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileDetailOpen(false)}
                    className="nc-btn nc-btn-ghost min-h-[44px] min-w-[44px] rounded-xl border border-[var(--nc-border)] px-3 lg:hidden"
                    aria-label={t.backToMessages}
                  >
                    {isArabic ? (
                      <ChevronRight size={18} />
                    ) : (
                      <ChevronLeft size={18} />
                    )}
                  </button>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--nc-accent)]">
                      {statusLabel(selectedMessage.status)}
                    </p>
                    <h2 className="mt-1 truncate text-lg font-black">
                      {displaySubject(selectedMessage)}
                    </h2>
                    <p
                      dir="ltr"
                      className="mt-1 text-xs text-[var(--nc-text-secondary)]"
                    >
                      {formatDateTime(
                        selectedMessage.sentAt ||
                          selectedMessage.createdAt,
                      )}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex min-w-[82px] shrink-0 justify-center rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                    selectedMessage.status,
                  )}`}
                >
                  {statusLabel(selectedMessage.status)}
                </span>
              </header>

              <div className="grid shrink-0 gap-2 border-b border-[var(--nc-border)] px-3 py-3 sm:grid-cols-3">
                <div className="orca-info-cell min-h-[56px]">
                  <span>{t.customer}</span>
                  <strong className="truncate">
                    {leadName(selectedMessage)}
                  </strong>
                </div>
                <div className="orca-info-cell min-h-[56px]">
                  <span>{t.from}</span>
                  <strong dir="ltr" className="truncate">
                    {isLegacyGlobalEmailProviderText(selectedMessage.from)
                      ? t.senderUnavailable
                      : selectedMessage.from || t.senderUnavailable}
                  </strong>
                </div>
                <div className="orca-info-cell min-h-[56px]">
                  <span>{t.to}</span>
                  <strong dir="ltr" className="truncate">
                    {displayRecipient(selectedMessage.to)}
                  </strong>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="mx-auto max-w-4xl space-y-3">
                  <article className="rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 py-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <strong className="text-[var(--nc-accent)]">
                        {t.body}
                      </strong>
                      <Mail size={16} />
                    </div>
                    <p className="whitespace-pre-wrap leading-7 text-[var(--nc-text-primary)]">
                      {selectedBody || t.messageContentUnavailable}
                    </p>
                  </article>

                  {selectedMessage.errorMessage ? (
                    <article className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-700 dark:text-rose-200">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold">
                        <AlertCircle size={16} />
                        {t.deliveryError}
                      </div>
                      <p className="whitespace-pre-wrap leading-7">
                        {isLegacyGlobalEmailProviderText(
                          selectedMessage.errorMessage,
                        )
                          ? t.providerMissing
                          : cleanDisplayText(
                              selectedMessage.errorMessage,
                              t.sendError,
                            )}
                      </p>
                    </article>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[360px] items-center justify-center p-8 text-center">
              <div>
                <Mail
                  size={28}
                  className="mx-auto text-[var(--nc-text-dim)]"
                />
                <h2 className="mt-3 text-lg font-black">{t.title}</h2>
                <p className="mt-2 text-sm text-[var(--nc-text-secondary)]">
                  {t.selectMessage}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function RecipientCombobox({
  value,
  onValueChange,
  options,
  label,
  placeholder,
  emptyText,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: RecipientOption[];
  label: string;
  placeholder: string;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const normalized = value.trim().toLowerCase();
  const visibleOptions = options.filter((option) => {
    if (!normalized) return true;
    return `${option.label} ${option.meta}`
      .toLowerCase()
      .includes(normalized);
  });

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-bold text-[var(--nc-text-secondary)]">
        {label}
      </span>

      <div
        ref={rootRef}
        className="relative"
        data-email-searchable-recipient
      >
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--nc-text-secondary)]"
        />

        <input
          type="email"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          dir="ltr"
          value={value}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            onValueChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (
              event.key === "Enter" &&
              visibleOptions.length === 1
            ) {
              event.preventDefault();
              onValueChange(visibleOptions[0].value);
              setOpen(false);
            }
          }}
          className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-10 py-2.5 text-sm font-bold outline-none focus:border-[var(--nc-accent-border)]"
        />

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="absolute end-0.5 top-1/2 grid min-h-[44px] min-w-[44px] -translate-y-1/2 place-items-center rounded-lg text-[var(--nc-text-secondary)] hover:bg-[var(--nc-surface-soft)]"
          aria-label={label}
          tabIndex={-1}
        >
          <ChevronDown size={15} aria-hidden="true" />
        </button>

        {open ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-52 overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-1 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => (
                <button
                  key={option.leadId}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-accent)]"
                >
                  <UserRound size={16} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">
                      {option.label}
                    </strong>
                    <span
                      dir="ltr"
                      className="block truncate text-xs text-[var(--nc-text-secondary)]"
                    >
                      {option.meta}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-[var(--nc-text-secondary)]">
                {emptyText}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </label>
  );
}
