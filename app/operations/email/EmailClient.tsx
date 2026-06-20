"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Clock, Mail, MailOpen, Send } from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";

import { getEmailMessagesAction, sendEmailAction } from "@/app/actions/email";
import { useApp } from "@/app/context/AppContext";
import UnifiedOperationsWorkspace from "@/components/operations-workspace/UnifiedOperationsWorkspace";
import type { WorkspaceDetail, WorkspaceListItem, WorkspaceTimelineItem } from "@/components/operations-workspace/types";
import { toArabicNumerals } from "@/lib/formatters";

interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  status: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
  lead?: { firstName: string; lastName: string | null } | null;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface EmailClientProps {
  initialMessages: EmailMessage[];
  leads: Lead[];
  emailFrom: string;
}

const PAGE_SIZE = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TEXT = {
  AR: {
    title: "البريد الإلكتروني",
    description: "إدارة البريد الإلكتروني بنفس نموذج العمل الموحد داخل مركز العمليات.",
    totalEmails: "إجمالي الرسائل",
    sentEmails: "المرسلة",
    pendingEmails: "قيد الانتظار",
    failedEmails: "المتعذرة",
    listTitle: "البريد الإلكتروني",
    latestFirst: "الأحدث أولًا",
    messageCount: "رسالة",
    newLabel: "رسالة جديدة",
    search: "ابحث...",
    filter: "تصفية البريد",
    all: "الكل",
    sent: "مرسلة",
    pending: "قيد الانتظار",
    failed: "متعذرة",
    read: "مقروءة",
    unknownStatus: "حالة غير محددة",
    customer: "العميل",
    owner: "المسؤول",
    priority: "الأولوية",
    from: "من",
    status: "الحالة",
    draft: "مسودة",
    to: "إلى",
    subject: "الموضوع",
    body: "محتوى الرسالة",
    bodyPlaceholder: "اكتب محتوى البريد...",
    send: "إرسال",
    sending: "جارٍ الإرسال...",
    noData: "لا توجد بيانات",
    select: "اختر رسالة لمشاهدة التفاصيل",
    contentUnavailable: "محتوى الرسالة غير متاح في السجل الحالي.",
    externalRecipient: "مستلم خارجي",
    emailRecord: "سجل بريد",
    paymentNotice: "إشعار دفعة",
    contractUpdate: "تحديث العقد",
    projectInquiry: "استفسار عن مشروع",
    bookingConfirmation: "تأكيد حجز وحدة",
    externalRecipientNumber: "مستلم خارجي",
    operations: "فريق العمليات",
    normal: "متوسطة",
    sentOk: "تم إرسال البريد",
    sendError: "تعذر إرسال البريد",
    invalidEmail: "أدخل بريدًا إلكترونيًا صحيحًا",
    bodyRequired: "اكتب محتوى الرسالة",
    notAvailable: "—",
  },
  EN: {
    title: "Email",
    description: "Manage email with the same unified operations workspace model.",
    totalEmails: "Total emails",
    sentEmails: "Sent",
    pendingEmails: "Pending",
    failedEmails: "Failed",
    listTitle: "Email",
    latestFirst: "Latest first",
    messageCount: "emails",
    newLabel: "New message",
    search: "Search...",
    filter: "Filter email",
    all: "All",
    sent: "Sent",
    pending: "Pending",
    failed: "Failed",
    read: "Read",
    unknownStatus: "Unknown status",
    customer: "Customer",
    owner: "Owner",
    priority: "Priority",
    from: "From",
    status: "Status",
    draft: "Draft",
    to: "To",
    subject: "Subject",
    body: "Message body",
    bodyPlaceholder: "Write email content...",
    send: "Send",
    sending: "Sending...",
    noData: "No data",
    select: "Select a message to view details",
    contentUnavailable: "Message content is unavailable in the current record.",
    externalRecipient: "External recipient",
    emailRecord: "Email record",
    paymentNotice: "Payment notice",
    contractUpdate: "Contract update",
    projectInquiry: "Project inquiry",
    bookingConfirmation: "Unit booking confirmation",
    externalRecipientNumber: "External recipient",
    operations: "Operations team",
    normal: "Medium",
    sentOk: "Email sent",
    sendError: "Failed to send email",
    invalidEmail: "Enter a valid email address",
    bodyRequired: "Write the message body",
    notAvailable: "—",
  },
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isTechnicalText(value: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /(?:^|\b)(?:email|message|lead|user|task|id)_[a-z0-9_-]+(?:\b|$)/i.test(value)
  );
}

function cleanDisplayText(value: unknown, fallback: string) {
  const raw = stripHtml(String(value || "")).trim();
  if (!raw || isTechnicalText(raw)) return fallback;
  const cleaned = raw
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\b(?:EMAIL|MESSAGE|LEAD|USER|TASK)_[A-Z0-9_]+\b/g, "")
    .replace(/\b(?:email|message|lead|user|task|id)_[a-z0-9_-]+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || fallback;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTimeValue(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${String(date.getFullYear()).slice(-2)} • ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EmailClient({ initialMessages, emailFrom }: EmailClientProps) {
  const { lang } = useApp();
  const searchParams = useSearchParams();
  const language = lang === "EN" ? "EN" : "AR";
  const t = TEXT[language];
  const isArabic = language === "AR";

  const [messages, setMessages] = useState<EmailMessage[]>(initialMessages);
  const [selectedId, setSelectedId] = useState<string | null>(initialMessages[0]?.id || null);
  const [isComposing, setIsComposing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [to, setTo] = useState(searchParams.get("email") || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [leadId, setLeadId] = useState(searchParams.get("leadId") || "");
  const [isSending, setIsSending] = useState(false);

  const formatNumber = (value: number | string) => (isArabic ? toArabicNumerals(value) : String(value));
  const formatDateTime = (value?: string | null) => formatDateTimeValue(value, t.notAvailable);
  const isTestRecipient = (value: string) => /(?:stress\.test|example\.(?:com|test)|demo)/i.test(value);
  const recordNumber = (value: string) => {
    const localPart = value.split("@")[0] || "";
    const match = localPart.match(/(\d{1,4})$/);
    return match ? formatNumber(match[1]) : "";
  };
  const displayRecipient = (value: string) => {
    if (!isTestRecipient(value)) return cleanDisplayText(value, t.externalRecipient);
    const number = recordNumber(value);
    return number ? `${t.externalRecipientNumber} ${number}` : t.externalRecipient;
  };
  const displaySubject = (message: EmailMessage) => {
    const raw = String(message.subject || "").toLowerCase();
    if (/دفعة|payment/.test(raw)) return t.paymentNotice;
    if (/عقد|contract/.test(raw)) return t.contractUpdate;
    if (/استفسار|مشروع|inquiry|project/.test(raw)) return t.projectInquiry;
    if (/حجز|وحدة|booking|unit/.test(raw)) return t.bookingConfirmation;
    if (isTestRecipient(message.to) || /(?:stress|demo)/i.test(raw)) {
      const number = recordNumber(message.to);
      return number ? `${t.emailRecord} ${number}` : t.emailRecord;
    }
    return cleanDisplayText(message.subject, t.emailRecord);
  };

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime()
      ),
    [messages]
  );

  useEffect(() => {
    const leadParam = searchParams.get("leadId");
    const emailParam = searchParams.get("email");
    if (leadParam) setLeadId(leadParam);
    if (emailParam) setTo(emailParam);
  }, [searchParams]);

  const filteredMessages = useMemo(
    () =>
      sortedMessages.filter((message) => {
        const leadName = message.lead ? `${message.lead.firstName} ${message.lead.lastName || ""}` : "";
        const haystack = `${displayRecipient(message.to)} ${displaySubject(message)} ${leadName}`.toLowerCase();
        return haystack.includes(query.toLowerCase()) && (filter === "ALL" || message.status === filter);
      }),
    [filter, query, sortedMessages, language]
  );

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredMessages.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedMessage = sortedMessages.find((message) => message.id === selectedId) || null;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (isComposing) return;
    if (selectedId && filteredMessages.some((message) => message.id === selectedId)) return;
    setSelectedId(filteredMessages[0]?.id || null);
  }, [filteredMessages, isComposing, selectedId]);

  const statusLabel = (status: string) => {
    if (status === "SENT") return t.sent;
    if (status === "FAILED") return t.failed;
    if (status === "PENDING") return t.pending;
    if (status === "READ") return t.read;
    return t.unknownStatus;
  };

  const statusTone = (status: string) => {
    if (status === "SENT" || status === "READ") return "success" as const;
    if (status === "FAILED") return "danger" as const;
    if (status === "PENDING") return "warning" as const;
    return "neutral" as const;
  };

  const leadName = (message: EmailMessage | null) => {
    if (!message?.lead) return t.notAvailable;
    return cleanDisplayText(`${message.lead.firstName} ${message.lead.lastName || ""}`.trim(), t.notAvailable);
  };

  async function handleSend() {
    const recipient = to.trim();
    const cleanSubject = subject.trim();
    const cleanBody = body.trim();
    if (isSending) return;
    if (!cleanSubject) return;
    if (!EMAIL_PATTERN.test(recipient)) {
      toast.error(t.invalidEmail);
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
      if (leadId) formData.append("leadId", leadId);
      const result = await sendEmailAction(formData);
      if (!result.success) {
        toast.error(t.sendError);
        return;
      }

      toast.success(t.sentOk);
      setTo("");
      setSubject("");
      setBody("");
      setLeadId("");
      const refresh = await getEmailMessagesAction(50);
      if (refresh.success) {
        const next = refresh.messages.map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString(),
          sentAt: message.sentAt?.toISOString() || null,
          lead: message.lead ? { firstName: message.lead.firstName, lastName: message.lead.lastName || null } : null,
        }));
        setMessages(next);
        setIsComposing(false);
        setSelectedId(next[0]?.id || null);
      }
    } finally {
      setIsSending(false);
    }
  }

  function openMessage(messageId: string) {
    setIsComposing(false);
    setSelectedId(messageId);
  }

  const listItems: WorkspaceListItem[] = pageItems.map((message) => {
    const recipient = displayRecipient(message.to);
    return {
      id: message.id,
      title: displaySubject(message),
      snippet: recipient,
      timestamp: formatDateTime(message.sentAt || message.createdAt),
      avatar: displaySubject(message).charAt(0).toUpperCase() || "@",
      selected: message.id === selectedId && !isComposing,
      badge: { label: statusLabel(message.status), tone: statusTone(message.status) },
      onSelect: () => openMessage(message.id),
      actions: [],
    };
  });

  const timeline: WorkspaceTimelineItem[] = selectedMessage
    ? [
        selectedMessage.errorMessage
          ? {
              id: `${selectedMessage.id}-error`,
              body: cleanDisplayText(selectedMessage.errorMessage, t.sendError),
              time: formatDateTime(selectedMessage.sentAt || selectedMessage.createdAt),
              side: "out" as const,
            }
          : {
              id: `${selectedMessage.id}-status`,
              body: t.contentUnavailable,
              time: formatDateTime(selectedMessage.sentAt || selectedMessage.createdAt),
              side: "neutral" as const,
            },
      ]
    : [];

  const sentCount = messages.filter((message) => message.status === "SENT" || message.status === "READ").length;
  const pendingCount = messages.filter((message) => message.status === "PENDING").length;
  const failedCount = messages.filter((message) => message.status === "FAILED").length;

  const detail: WorkspaceDetail | null = isComposing
    ? {
        avatar: "+",
        title: t.newLabel,
        meta: emailFrom,
        actions: [],
        context: [
          { label: t.from, value: emailFrom },
          { label: t.status, value: t.draft },
          { label: t.priority, value: t.normal },
        ],
        timeline: [],
        emptyTitle: t.newLabel,
        emptyDescription: t.bodyRequired,
        composer: {
          mode: "message",
          value: body,
          bodyLabel: t.body,
          placeholder: t.bodyPlaceholder,
          sendLabel: isSending ? t.sending : t.send,
          onChange: setBody,
          onSend: handleSend,
          disabled: isSending || !EMAIL_PATTERN.test(to.trim()) || !subject.trim() || !body.trim(),
          fields: [
            { id: "to", label: t.to, value: to, placeholder: t.to, onChange: setTo, type: "email", dir: "ltr", required: true },
            { id: "subject", label: t.subject, value: subject, placeholder: t.subject, onChange: setSubject, required: true },
          ],
        },
      }
    : selectedMessage
      ? {
          avatar: displaySubject(selectedMessage).charAt(0).toUpperCase() || "@",
          title: displaySubject(selectedMessage),
          meta: `${t.to}: ${displayRecipient(selectedMessage.to)}`,
          actions: [],
          context: [
            { label: t.customer, value: leadName(selectedMessage) },
            { label: t.owner, value: t.operations },
            { label: t.status, value: statusLabel(selectedMessage.status) },
          ],
          timeline,
          emptyTitle: t.noData,
          emptyDescription: t.contentUnavailable,
        }
      : null;

  return (
    <UnifiedOperationsWorkspace
      module="email"
      language={language}
      title={t.title}
      description={t.description}
      kpis={[
        { label: t.totalEmails, value: formatNumber(messages.length), icon: Mail },
        { label: t.sentEmails, value: formatNumber(sentCount), icon: Send },
        { label: t.pendingEmails, value: formatNumber(pendingCount), icon: Clock },
        { label: t.failedEmails, value: formatNumber(failedCount), icon: MailOpen },
      ]}
      listTitle={t.listTitle}
      listSubtitle={isArabic
        ? `${formatNumber(filteredMessages.length)} ${t.messageCount} · ${t.latestFirst}`
        : `${formatNumber(filteredMessages.length)} ${t.messageCount} · ${t.latestFirst}`}
      newLabel={t.newLabel}
      onNew={() => {
        setIsComposing(true);
        setSelectedId(null);
        setSubject("");
        setBody("");
      }}
      searchValue={query}
      searchPlaceholder={t.search}
      onSearchChange={(value) => {
        setQuery(value);
        setPage(1);
      }}
      filterValue={filter}
      filterLabel={t.filter}
      filterOptions={[
        { value: "ALL", label: t.all },
        { value: "SENT", label: t.sent },
        { value: "READ", label: t.read },
        { value: "PENDING", label: t.pending },
        { value: "FAILED", label: t.failed },
      ]}
      onFilterChange={(value) => {
        setFilter(value);
        setPage(1);
      }}
      items={listItems}
      pagination={{
        page: safePage,
        totalPages,
        onPrevious: () => setPage((current) => Math.max(1, current - 1)),
        onNext: () => setPage((current) => Math.min(totalPages, current + 1)),
      }}
      detail={detail}
      emptyDetailTitle={t.noData}
      emptyDetailDescription={t.select}
    />
  );
}
