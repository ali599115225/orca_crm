"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Archive, Clock, Eye, Mail, MailOpen, PlusCircle, Send, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";

import { getEmailMessagesAction, sendEmailAction } from "@/app/actions/email";
import { useApp } from "@/app/context/AppContext";
import UnifiedOperationsWorkspace from "@/components/operations-workspace/UnifiedOperationsWorkspace";
import type { WorkspaceListItem, WorkspaceTimelineItem } from "@/components/operations-workspace/types";
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

const TEXT = {
  AR: {
    title: "البريد الإلكتروني",
    description: "إدارة البريد الإلكتروني بنفس نموذج العمل الموحد داخل مركز العمليات.",
    newMessages: "الرسائل الجديدة",
    unread: "غير المقروءة",
    waiting: "بانتظار الرد",
    avgReply: "متوسط زمن الرد",
    listTitle: "البريد الإلكتروني",
    latestFirst: "الأحدث أولًا",
    newLabel: "رسالة جديدة",
    search: "ابحث...",
    filter: "تصفية البريد",
    all: "الكل",
    sent: "مرسلة",
    pending: "قيد الانتظار",
    failed: "متعذرة",
    read: "مقروءة",
    unreadBadge: "غير مقروءة",
    customer: "العميل",
    owner: "المسؤول",
    priority: "الأولوية",
    assignee: "إسناد",
    createTask: "إنشاء مهمة",
    archive: "أرشفة",
    openDetails: "فتح التفاصيل",
    archiveConfirm: "هل تريد أرشفة هذه الرسالة؟",
    archiveUnavailable: "الأرشفة غير مفعلة بدون تغيير API.",
    to: "إلى",
    subject: "الموضوع",
    body: "اكتب محتوى البريد...",
    send: "إرسال",
    noData: "لا توجد بيانات",
    select: "اختر رسالة لمشاهدة التفاصيل",
    noMessages: "لا توجد رسائل بعد",
    operations: "فريق العمليات",
    normal: "متوسطة",
    sentOk: "تم إرسال البريد",
    sendError: "تعذر إرسال البريد",
    none: "لا يوجد",
  },
  EN: {
    title: "Email",
    description: "Manage email with the same unified operations workspace model.",
    newMessages: "New messages",
    unread: "Unread",
    waiting: "Awaiting reply",
    avgReply: "Average reply time",
    listTitle: "Email",
    latestFirst: "Latest first",
    newLabel: "New message",
    search: "Search...",
    filter: "Filter email",
    all: "All",
    sent: "Sent",
    pending: "Pending",
    failed: "Failed",
    read: "Read",
    unreadBadge: "Unread",
    customer: "Customer",
    owner: "Owner",
    priority: "Priority",
    assignee: "Assign",
    createTask: "Create task",
    archive: "Archive",
    openDetails: "Open details",
    archiveConfirm: "Archive this message?",
    archiveUnavailable: "Archiving is unavailable without changing the API.",
    to: "To",
    subject: "Subject",
    body: "Write email content...",
    send: "Send",
    noData: "No data",
    select: "Select a message to view details",
    noMessages: "No messages yet",
    operations: "Operations team",
    normal: "Medium",
    sentOk: "Email sent",
    sendError: "Failed to send email",
    none: "None",
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

export default function EmailClient({ initialMessages, leads, emailFrom }: EmailClientProps) {
  const { lang } = useApp();
  const searchParams = useSearchParams();
  const language = lang === "EN" ? "EN" : "AR";
  const t = TEXT[language];
  const isArabic = language === "AR";
  const locale = isArabic ? "ar-SA" : "en-US";

  const [messages, setMessages] = useState<EmailMessage[]>(initialMessages);
  const [selectedId, setSelectedId] = useState<string | null>(initialMessages[0]?.id || null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [to, setTo] = useState(searchParams.get("email") || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [leadId, setLeadId] = useState(searchParams.get("leadId") || "");
  const [isSending, setIsSending] = useState(false);

  const formatNumber = (value: number | string) => (isArabic ? toArabicNumerals(value) : String(value));
  const formatDateTime = (value?: string | null) => {
    if (!value) return t.none;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t.none;
    return date.toLocaleString(locale, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime()
    );
  }, [messages]);

  useEffect(() => {
    if (!selectedId && sortedMessages[0]) setSelectedId(sortedMessages[0].id);
  }, [selectedId, sortedMessages]);

  useEffect(() => {
    const leadParam = searchParams.get("leadId");
    const emailParam = searchParams.get("email");
    if (leadParam) setLeadId(leadParam);
    if (emailParam) setTo(emailParam);
  }, [searchParams]);

  const filteredMessages = sortedMessages.filter((message) => {
    const leadName = message.lead ? `${message.lead.firstName} ${message.lead.lastName || ""}` : "";
    const haystack = `${cleanDisplayText(message.to, "")} ${cleanDisplayText(message.subject, "")} ${leadName}`.toLowerCase();
    const matchesSearch = haystack.includes(query.toLowerCase());
    const matchesFilter = filter === "ALL" || message.status === filter;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredMessages.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedMessage = sortedMessages.find((message) => message.id === selectedId) || null;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const statusLabel = (status: string) => {
    if (status === "SENT") return t.sent;
    if (status === "FAILED") return t.failed;
    if (status === "PENDING") return t.pending;
    return t.read;
  };

  const statusTone = (status: string) => {
    if (status === "SENT") return "success" as const;
    if (status === "FAILED") return "danger" as const;
    if (status === "PENDING") return "warning" as const;
    return "neutral" as const;
  };

  const leadName = (message: EmailMessage | null) => {
    if (!message?.lead) return t.none;
    return `${message.lead.firstName} ${message.lead.lastName || ""}`.trim();
  };

  async function handleSend() {
    if (!to.trim() || !subject.trim() || isSending) return;
    setIsSending(true);
    const formData = new FormData();
    formData.append("to", to.trim());
    formData.append("subject", subject.trim());
    formData.append("htmlBody", body.trim());
    if (leadId) formData.append("leadId", leadId);
    const result = await sendEmailAction(formData);
    setIsSending(false);
    if (result.success) {
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
        setSelectedId(next[0]?.id || null);
      }
    } else {
      toast.error(t.sendError);
    }
  }

  function openMessage(messageId: string) {
    setSelectedId(messageId);
  }

  function archiveMessage(messageId?: string) {
    if (messageId) setSelectedId(messageId);
    if (window.confirm(t.archiveConfirm)) toast(t.archiveUnavailable);
  }

  const listItems: WorkspaceListItem[] = pageItems.map((message) => ({
    id: message.id,
    title: cleanDisplayText(message.subject, t.noData),
    snippet: cleanDisplayText(message.to, t.noData),
    timestamp: formatDateTime(message.sentAt || message.createdAt),
    avatar: "@" ,
    selected: message.id === selectedId,
    badge: { label: statusLabel(message.status), tone: statusTone(message.status) },
    onSelect: () => openMessage(message.id),
    actions: [
      { label: t.openDetails, icon: Eye, onClick: () => openMessage(message.id) },
      { label: t.archive, icon: Archive, onClick: () => archiveMessage(message.id) },
    ],
  }));

  const timeline: WorkspaceTimelineItem[] = selectedMessage
    ? [
        {
          id: `${selectedMessage.id}-summary`,
          body: cleanDisplayText(selectedMessage.subject, t.noData),
          time: formatDateTime(selectedMessage.sentAt || selectedMessage.createdAt),
          side: "neutral",
        },
        selectedMessage.errorMessage
          ? {
              id: `${selectedMessage.id}-error`,
              body: cleanDisplayText(selectedMessage.errorMessage, t.sendError),
              time: undefined,
              side: "out" as const,
            }
          : {
              id: `${selectedMessage.id}-body`,
              body: t.noMessages,
              time: undefined,
              side: "in" as const,
            },
      ]
    : [];

  const pendingCount = messages.filter((message) => message.status === "PENDING").length;
  const failedCount = messages.filter((message) => message.status === "FAILED").length;

  return (
    <UnifiedOperationsWorkspace
      module="email"
      language={language}
      title={t.title}
      description={t.description}
      kpis={[
        { label: t.newMessages, value: formatNumber(messages.length), icon: Mail },
        { label: t.unread, value: formatNumber(pendingCount), icon: MailOpen },
        { label: t.waiting, value: formatNumber(pendingCount + failedCount), icon: Clock },
        { label: t.avgReply, value: t.none, icon: Send },
      ]}
      listTitle={t.listTitle}
      listSubtitle={`${t.latestFirst} · ${formatNumber(filteredMessages.length)} ${t.listTitle}`}
      newLabel={t.newLabel}
      onNew={() => {
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
      detail={{
        avatar: selectedMessage ? selectedMessage.to.charAt(0).toUpperCase() : "@",
        title: selectedMessage ? cleanDisplayText(selectedMessage.subject, t.noData) : t.newLabel,
        meta: selectedMessage ? `${t.to}: ${cleanDisplayText(selectedMessage.to, t.noData)}` : emailFrom,
        actions: [
          { label: t.assignee, icon: UserPlus, onClick: () => toast(t.assignee) },
          { label: t.createTask, icon: PlusCircle, onClick: () => toast(t.createTask) },
          { label: t.archive, icon: Archive, tone: "danger", onClick: () => archiveMessage(selectedMessage?.id) },
        ],
        context: [
          { label: t.customer, value: leadName(selectedMessage) },
          { label: t.owner, value: t.operations },
          { label: t.priority, value: t.normal },
        ],
        timeline,
        emptyTitle: t.noData,
        emptyDescription: t.noMessages,
        composer: {
          mode: "message",
          value: body,
          placeholder: t.body,
          sendLabel: t.send,
          onChange: setBody,
          onSend: handleSend,
          disabled: isSending || !to.trim() || !subject.trim(),
          fields: [
            { id: "to", label: t.to, value: to, placeholder: t.to, onChange: setTo, type: "email", dir: "ltr", required: true },
            { id: "subject", label: t.subject, value: subject, placeholder: t.subject, onChange: setSubject, required: true },
          ],
        },
      }}
      emptyDetailTitle={t.noData}
      emptyDetailDescription={t.select}
    />
  );
}
