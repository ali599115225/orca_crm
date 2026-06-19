"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Archive, Check, Clock, Eye, MessageSquare, PlusCircle, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import { createWhatsAppTaskAction } from "@/app/actions/whatsapp-crm";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsapp";
import { useApp } from "@/app/context/AppContext";
import UnifiedOperationsWorkspace from "@/components/operations-workspace/UnifiedOperationsWorkspace";
import type { WorkspaceListItem, WorkspaceTimelineItem } from "@/components/operations-workspace/types";
import { displayPerson } from "@/lib/display";
import { toArabicNumerals } from "@/lib/formatters";

interface Message {
  sender: string;
  text: string;
  time: string;
}

interface Chat {
  id: string;
  contactName: string;
  contactPhone: string;
  leadId?: string | null;
  leadStatus?: string | null;
  leadSource?: string | null;
  leadPriority?: string | null;
  lastMessage: string;
  time: string;
  unread: boolean;
  messages: Message[];
}

interface WhatsAppViewProps {
  initialChats: Chat[];
  tenant: {
    companyName: string;
    whatsappConnected: boolean;
  };
  cloudStatus: any;
  warning: string | null;
}

const PAGE_SIZE = 5;

const TEXT = {
  AR: {
    title: "مركز الاتصالات",
    description: "إدارة واتساب باحتراف، مع ترتيب الأحدث أولًا وثبات المحادثة المختارة.",
    active: "المحادثات النشطة",
    unread: "غير المقروءة",
    waiting: "بانتظار الرد",
    responseRate: "معدل الاستجابة",
    listTitle: "المحادثات",
    latestFirst: "الأحدث أولًا",
    newLabel: "محادثة جديدة",
    search: "ابحث...",
    filter: "تصفية المحادثات",
    all: "الكل",
    open: "مفتوحة",
    unreadFilter: "غير مقروءة",
    waitingFilter: "بانتظار الرد",
    connected: "واتساب — متصل",
    disconnected: "واتساب — غير متصل",
    notConfigured: "يلزم إكمال إعدادات الربط قبل استخدام المحادثات.",
    customer: "العميل",
    owner: "المسؤول",
    priority: "الأولوية",
    assignee: "إسناد",
    createTask: "إنشاء مهمة",
    archive: "أرشفة",
    openDetails: "فتح التفاصيل",
    archiveConfirm: "هل تريد أرشفة هذه المحادثة؟",
    archiveUnavailable: "الأرشفة غير مفعلة بدون تغيير API.",
    messagePlaceholder: "اكتب رسالة واتساب...",
    send: "إرسال",
    attach: "إرفاق ملف",
    noData: "لا توجد بيانات",
    noMessages: "لا توجد رسائل محفوظة لهذه المحادثة.",
    select: "اختر محادثة لمشاهدة التفاصيل",
    unknownAgent: "فريق العمليات",
    fallbackCustomer: "عميل واتساب",
    taskCreated: "تم إنشاء مهمة متابعة",
    taskError: "تعذر إنشاء المهمة",
    sentError: "تعذر إرسال الرسالة",
    now: "الآن",
    low: "منخفضة",
    medium: "متوسطة",
    high: "مرتفعة",
    urgent: "عاجلة",
    read: "مقروءة",
    unreadBadge: "غير مقروءة",
    pending: "قيد الانتظار",
  },
  EN: {
    title: "Communications Center",
    description: "Manage WhatsApp with latest-first sorting and stable conversation selection.",
    active: "Active conversations",
    unread: "Unread",
    waiting: "Awaiting reply",
    responseRate: "Response rate",
    listTitle: "Conversations",
    latestFirst: "Latest first",
    newLabel: "New conversation",
    search: "Search...",
    filter: "Filter conversations",
    all: "All",
    open: "Open",
    unreadFilter: "Unread",
    waitingFilter: "Awaiting reply",
    connected: "WhatsApp — Connected",
    disconnected: "WhatsApp — Disconnected",
    notConfigured: "Connection settings must be completed before using conversations.",
    customer: "Customer",
    owner: "Owner",
    priority: "Priority",
    assignee: "Assign",
    createTask: "Create task",
    archive: "Archive",
    openDetails: "Open details",
    archiveConfirm: "Archive this conversation?",
    archiveUnavailable: "Archiving is unavailable without changing the API.",
    messagePlaceholder: "Type a WhatsApp message...",
    send: "Send",
    attach: "Attach file",
    noData: "No data",
    noMessages: "No saved messages for this conversation.",
    select: "Select a conversation to view details",
    unknownAgent: "Operations team",
    fallbackCustomer: "WhatsApp customer",
    taskCreated: "Follow-up task created",
    taskError: "Failed to create task",
    sentError: "Failed to send message",
    now: "Now",
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
    read: "Read",
    unreadBadge: "Unread",
    pending: "Pending",
  },
};

function isTechnical(value: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /(?:^|\b)(?:chat|contact|lead|task|user|id)_[a-z0-9_-]+(?:\b|$)/i.test(value)
  );
}

function lastFour(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-4);
}

export default function WhatsAppView({ initialChats, tenant, cloudStatus, warning }: WhatsAppViewProps) {
  const { lang } = useApp();
  const language = lang === "EN" ? "EN" : "AR";
  const t = TEXT[language];
  const isArabic = language === "AR";
  const locale = isArabic ? "ar-SA" : "en-US";
  const displayLocale = isArabic ? "ar" : "en";
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const formatNumber = (value: number | string) => (isArabic ? toArabicNumerals(value) : String(value));
  const formatPercent = (value: number) => `${formatNumber(value)}${isArabic ? "٪" : "%"}`;

  const formatDateTime = (value?: string | null) => {
    if (!value) return t.now;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t.now;
    return date.toLocaleString(locale, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
  }, [chats]);

  useEffect(() => {
    setChats(initialChats);
    setSelectedId((previous) => {
      const incoming = [...initialChats].sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
      if (incoming.length === 0) return null;
      if (previous && incoming.some((chat) => chat.id === previous)) return previous;
      return incoming[0].id;
    });
  }, [initialChats]);

  const selectedChat = sortedChats.find((chat) => chat.id === selectedId) || null;

  const safeName = (chat: Chat) => {
    const raw = String(chat.contactName || "").trim();
    const phone = String(chat.contactPhone || "").trim();
    if (!raw || raw === phone || /^[+\d\s-]{6,}$/.test(raw) || isTechnical(raw)) {
      const suffix = lastFour(phone);
      return suffix ? `${t.fallbackCustomer} • ${suffix}` : t.fallbackCustomer;
    }
    return displayPerson(raw, displayLocale, { route: "/operations/whatsapp" });
  };

  const priorityLabel = (priority?: string | null) => {
    if (priority === "HIGH" || priority === "HOT") return t.high;
    if (priority === "URGENT") return t.urgent;
    if (priority === "LOW" || priority === "COLD") return t.low;
    return t.medium;
  };

  const isWaitingReply = (chat: Chat) => chat.messages[chat.messages.length - 1]?.sender === "client";
  const connected = cloudStatus?.configured && cloudStatus?.status === "connected";

  const visibleSource = sortedChats.filter((chat) => {
    const haystack = `${safeName(chat)} ${chat.lastMessage}`.toLowerCase();
    const matchesSearch = haystack.includes(query.toLowerCase());
    const matchesFilter =
      filter === "ALL" ||
      (filter === "UNREAD" && chat.unread) ||
      (filter === "WAITING" && isWaitingReply(chat)) ||
      filter === "OPEN";
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(visibleSource.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = visibleSource.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const unreadCount = sortedChats.filter((chat) => chat.unread).length;
  const waitingCount = sortedChats.filter(isWaitingReply).length;
  const responseRate = sortedChats.length ? Math.round(((sortedChats.length - waitingCount) / sortedChats.length) * 100) : 0;

  const selectChat = (id: string) => {
    setSelectedId(id);
  };

  async function handleSend() {
    if (!selectedChat || !messageInput.trim() || isSending) return;
    const text = messageInput.trim();
    setMessageInput("");
    setIsSending(true);
    setChats((current) =>
      current.map((chat) =>
        chat.id === selectedChat.id
          ? {
              ...chat,
              lastMessage: text,
              time: new Date().toISOString(),
              messages: [...chat.messages, { sender: "agent", text, time: new Date().toISOString() }],
            }
          : chat
      )
    );
    const result = await sendWhatsAppMessageAction(selectedChat.contactPhone, text);
    setIsSending(false);
    if (!result.success) toast.error(t.sentError);
  }

  async function createTaskForSelected() {
    if (!selectedChat) return;
    const formData = new FormData();
    formData.append("title", `${t.createTask} — ${safeName(selectedChat)}`);
    formData.append("taskType", "Follow-up");
    formData.append("contactPhone", selectedChat.contactPhone);
    const result = await createWhatsAppTaskAction(formData);
    if (result.success) toast.success(t.taskCreated);
    else toast.error(t.taskError);
  }

  function archiveConversation() {
    if (!selectedChat) return;
    if (window.confirm(t.archiveConfirm)) {
      toast(t.archiveUnavailable);
    }
  }

  function archiveChat(chat: Chat) {
    setSelectedId(chat.id);
    if (window.confirm(t.archiveConfirm)) {
      toast(t.archiveUnavailable);
    }
  }

  const listItems: WorkspaceListItem[] = pageItems.map((chat) => ({
    id: chat.id,
    title: safeName(chat),
    snippet: chat.lastMessage || t.noMessages,
    timestamp: formatDateTime(chat.time),
    avatar: safeName(chat).charAt(0),
    selected: chat.id === selectedId,
    badge: chat.unread
      ? { label: t.unreadBadge, tone: "warning" }
      : isWaitingReply(chat)
        ? { label: t.pending, tone: "warning" }
        : { label: t.read, tone: "success" },
    onSelect: () => selectChat(chat.id),
    actions: [
      { label: t.openDetails, icon: Eye, onClick: () => selectChat(chat.id) },
      { label: t.archive, icon: Archive, onClick: () => archiveChat(chat) },
    ],
  }));

  const timeline: WorkspaceTimelineItem[] =
    selectedChat?.messages.map((message, index) => ({
      id: `${selectedChat.id}-${index}`,
      body: message.text || t.noData,
      time: formatDateTime(message.time),
      side: message.sender === "agent" ? "in" : "out",
    })) || [];

  return (
    <UnifiedOperationsWorkspace
      module="whatsapp"
      language={language}
      title={t.title}
      description={`${connected ? t.connected : t.disconnected}${warning ? ` · ${warning}` : ""}${!connected ? ` · ${t.notConfigured}` : ""}`}
      kpis={[
        { label: t.active, value: formatNumber(sortedChats.length), icon: MessageSquare },
        { label: t.unread, value: formatNumber(unreadCount), icon: MessageSquare },
        { label: t.waiting, value: formatNumber(waitingCount), icon: Clock },
        { label: t.responseRate, value: formatPercent(responseRate), icon: Check },
      ]}
      listTitle={t.listTitle}
      listSubtitle={`${t.latestFirst} · ${formatNumber(visibleSource.length)} ${t.listTitle}`}
      newLabel={t.newLabel}
      onNew={() => toast(t.newLabel)}
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
        { value: "OPEN", label: t.open },
        { value: "UNREAD", label: t.unreadFilter },
        { value: "WAITING", label: t.waitingFilter },
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
      detail={
        selectedChat
          ? {
              avatar: safeName(selectedChat).charAt(0),
              title: safeName(selectedChat),
              meta: `${formatDateTime(selectedChat.time)} · ${connected ? t.connected : t.disconnected}`,
              actions: [
                { label: t.assignee, icon: UserPlus, onClick: () => toast(t.assignee) },
                { label: t.createTask, icon: PlusCircle, onClick: createTaskForSelected },
                { label: t.archive, icon: Archive, tone: "danger", onClick: archiveConversation },
              ],
              context: [
                { label: t.customer, value: safeName(selectedChat) },
                { label: t.owner, value: t.unknownAgent },
                { label: t.priority, value: priorityLabel(selectedChat.leadPriority) },
              ],
              timeline,
              emptyTitle: t.noData,
              emptyDescription: t.noMessages,
              composer: {
                mode: "message",
                value: messageInput,
                placeholder: t.messagePlaceholder,
                sendLabel: t.send,
                onChange: setMessageInput,
                onSend: handleSend,
                disabled: isSending || !messageInput.trim() || !connected,
                attachLabel: t.attach,
                onAttach: () => toast(t.attach),
              },
            }
          : null
      }
      emptyDetailTitle={t.noData}
      emptyDetailDescription={t.select}
    />
  );
}
