"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Check, Clock, Eye, MessageSquare, PlusCircle, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import { createWhatsAppTaskAction } from "@/app/actions/whatsapp-crm";
import { archiveChatAction, assignChatAction, getWhatsAppChatsAction, sendWhatsAppMessageAction } from "@/app/actions/whatsapp";
import { getTenantUsersAction } from "@/app/actions/users";
import { useApp } from "@/app/context/AppContext";
import UnifiedOperationsWorkspace from "@/components/operations-workspace/UnifiedOperationsWorkspace";
import type { WorkspaceListItem, WorkspaceTimelineItem } from "@/components/operations-workspace/types";
import { toArabicNumerals } from "@/lib/formatters";
import { formatDisplayDateTime } from '@/lib/display/dateTime';

interface Message {
  id?: string;
  sender: string;
  text: string;
  time: string;
  status?: string | null;
}

interface Chat {
  id: string;
  contactName: string;
  contactPhone: string;
  leadId?: string | null;
  leadStatus?: string | null;
  leadSource?: string | null;
  leadPriority?: string | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  archived?: boolean;
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

const PHONE_COUNTRIES = [
  { code: "966", ar: "السعودية", en: "Saudi Arabia", localLength: 9 },
  { code: "971", ar: "الإمارات", en: "UAE", localLength: 9 },
  { code: "965", ar: "الكويت", en: "Kuwait", localLength: 8 },
  { code: "974", ar: "قطر", en: "Qatar", localLength: 8 },
  { code: "973", ar: "البحرين", en: "Bahrain", localLength: 8 },
  { code: "968", ar: "عمان", en: "Oman", localLength: 8 },
] as const;

const TEXT = {
  AR: {
    title: "واتساب",
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
    archivedFilter: "المؤرشفة",
    connected: "واتساب — متصل",
    disconnected: "واتساب — غير متصل",
    notConfigured: "يلزم إكمال إعدادات الربط قبل استخدام المحادثات.",
    customer: "العميل",
    owner: "المسؤول",
    priority: "الأولوية",
    assignee: "إسناد",
    assigned: "تم حفظ المسؤول",
    assignError: "تعذر حفظ المسؤول",
    assignTitle: "اختيار مسؤول",
    createTask: "إنشاء مهمة",
    archive: "أرشفة",
    openDetails: "فتح التفاصيل",
    archiveConfirm: "هل تريد أرشفة هذه المحادثة؟",
    unarchive: "إلغاء الأرشفة",
    unarchiveConfirm: "هل تريد إلغاء أرشفة هذه المحادثة؟",
    messagePlaceholder: "اكتب رسالة واتساب...",
    send: "إرسال",
    noData: "لا توجد بيانات",
    noMessages: "لا توجد رسائل محفوظة لهذه المحادثة.",
    select: "اختر محادثة لمشاهدة التفاصيل",
    unknownAgent: "فريق العمليات",
    fallbackCustomer: "جهة اتصال",
    taskCreated: "تم إنشاء مهمة متابعة",
    taskError: "تعذر إنشاء المهمة",
    sentError: "تعذر إرسال الرسالة",
    safeSendError: "تعذر إرسال رسالة واتساب. تحقق من الرقم أو إعدادات الربط وحاول مرة أخرى.",
    templateRequired: "بدء المحادثة خارج نافذة 24 ساعة يحتاج قالب WhatsApp معتمدًا.",
    sending: "جاري الإرسال…",
    accepted: "تم قبول الرسالة وتنتظر تأكيد واتساب",
    statusPending: "بانتظار تأكيد واتساب",
    statusSent: "أرسلها واتساب",
    statusDelivered: "تم التسليم",
    statusRead: "تمت القراءة",
    statusFailed: "فشل الإرسال",
    statusReceived: "واردة",
    now: "الآن",
    low: "منخفضة",
    medium: "متوسطة",
    high: "مرتفعة",
    urgent: "عاجلة",
    read: "مقروءة",
    unreadBadge: "غير مقروءة",
    pending: "قيد الانتظار",
    archived: "تمت أرشفة المحادثة",
    unarchived: "تم إلغاء أرشفة المحادثة",
    archiveError: "تعذرت أرشفة المحادثة",
    newChatTitle: "محادثة جديدة",
    newChatPhone: "رقم الجوال",
    newChatCountry: "رمز الدولة",
    invalidPhone: "أدخل رقمًا محليًا صحيحًا دون 0 في البداية.",
    newChatErrorTitle: "تعذر بدء المحادثة",
    errorSubcode: "الرمز الفرعي",
    newChatMessage: "الرسالة الأولى",
    newChatSend: "بدء المحادثة",
    newChatCancel: "إلغاء",
    sentSuccess: "تم قبول الرسالة",
  },
  EN: {
    title: "WhatsApp",
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
    archivedFilter: "Archived",
    connected: "WhatsApp — Connected",
    disconnected: "WhatsApp — Disconnected",
    notConfigured: "Connection settings must be completed before using conversations.",
    customer: "Customer",
    owner: "Owner",
    priority: "Priority",
    assignee: "Assign",
    assigned: "Agent assigned",
    assignError: "Failed to assign agent",
    assignTitle: "Select agent",
    createTask: "Create task",
    archive: "Archive",
    openDetails: "Open details",
    archiveConfirm: "Archive this conversation?",
    unarchive: "Unarchive",
    unarchiveConfirm: "Unarchive this conversation?",
    messagePlaceholder: "Type a WhatsApp message...",
    send: "Send",
    noData: "No data",
    noMessages: "No saved messages for this conversation.",
    select: "Select a conversation to view details",
    unknownAgent: "Operations team",
    fallbackCustomer: "Contact",
    taskCreated: "Follow-up task created",
    taskError: "Failed to create task",
    sentError: "Failed to send message",
    safeSendError: "Failed to send WhatsApp message. Check the number or connection settings and try again.",
    templateRequired: "Starting this conversation outside the 24-hour window requires an approved WhatsApp template.",
    sending: "Sending…",
    accepted: "Message accepted and awaiting WhatsApp confirmation",
    statusPending: "Awaiting WhatsApp confirmation",
    statusSent: "Sent by WhatsApp",
    statusDelivered: "Delivered",
    statusRead: "Read",
    statusFailed: "Failed",
    statusReceived: "Received",
    now: "Now",
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
    read: "Read",
    unreadBadge: "Unread",
    pending: "Pending",
    archived: "Conversation archived",
    unarchived: "Conversation unarchived",
    archiveError: "Failed to archive conversation",
    newChatTitle: "New conversation",
    newChatPhone: "Mobile number",
    newChatCountry: "Country code",
    invalidPhone: "Enter a valid local number without a leading 0.",
    newChatErrorTitle: "Could not start conversation",
    errorSubcode: "Subcode",
    newChatMessage: "First message",
    newChatSend: "Start conversation",
    newChatCancel: "Cancel",
    sentSuccess: "Message accepted",
  },
};

function isTechnical(value: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /(?:^|\b)(?:chat|contact|lead|task|user|id)_[a-z0-9_-]+(?:\b|$)/i.test(value)
  );
}

function cleanDisplayText(value: string, fallback: string) {
  const raw = String(value || "").trim();
  if (!raw || isTechnical(raw)) return fallback;

  const cleaned = raw
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\b(?:WHATSAPP|META|GRAPH)_[A-Z0-9_]+\b/g, "")
    .replace(/\b(?:chat|contact|lead|task|user|id)_[a-z0-9_-]+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned || fallback;
}

function normalizeWhatsAppPhone(value: string) {
  let digits = String(value || "").replace(/[^\d]/g, "");
  while (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

function normalizeLocalPhone(value: string) {
  return String(value || "").replace(/[^\d]/g, "").replace(/^0+/, "");
}

function composeWhatsAppPhone(countryCode: string, localPhone: string) {
  return `${countryCode}${normalizeLocalPhone(localPhone)}`;
}

function isValidLocalPhone(countryCode: string, localPhone: string) {
  const rule = PHONE_COUNTRIES.find((country) => country.code === countryCode);
  const local = normalizeLocalPhone(localPhone);
  return Boolean(rule && local.length === rule.localLength && !local.startsWith("0"));
}

export default function WhatsAppView({ initialChats, tenant, cloudStatus, warning }: WhatsAppViewProps) {
  const { lang } = useApp();
  const language = lang === "EN" ? "EN" : "AR";
  const t = TEXT[language];
  const isArabic = language === "AR";
  const locale = isArabic ? "ar-SA" : "en-US";
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [newCountryCode, setNewCountryCode] = useState("966");
  const [newPhone, setNewPhone] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchInFlightRef = useRef<Promise<Chat[]> | null>(null);
  const sendInFlightRef = useRef(false);
  const createSendInFlightRef = useRef(false);
  const selectedChatRef = useRef<Chat | null>(null);

  const fetchFreshChats = useCallback(async (mode: "active" | "archived" = filter === "ARCHIVED" ? "archived" : "active") => {
    if (fetchInFlightRef.current) return fetchInFlightRef.current;

    const request = (async () => {
      try {
        const result = await getWhatsAppChatsAction({ mode });
        if (result.success && result.chats) {
          const freshChats = result.chats as Chat[];
          setChats(freshChats);
          setSelectedId((current) => {
            if (current && freshChats.some((chat) => chat.id === current)) return current;
            if (current && selectedChatRef.current?.id === current) return current;
            return freshChats[0]?.id || null;
          });
          return freshChats;
        }
      } catch { /* silent poll failure */ }
      return [];
    })();

    fetchInFlightRef.current = request;
    try {
      return await request;
    } finally {
      fetchInFlightRef.current = null;
    }
  }, [filter]);

  const formatNumber = (value: number | string) => (isArabic ? toArabicNumerals(value) : String(value));
  const formatPercent = (value: number) => `${formatNumber(value)}${isArabic ? "٪" : "%"}`;

  const formatDateTime = (value?: string | null) => {
    if (!value) return t.now;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t.now;
    return formatDisplayDateTime(date);
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

  const selectedChat = sortedChats.find((chat) => chat.id === selectedId) || (selectedChatRef.current?.id === selectedId ? selectedChatRef.current : null);

  useEffect(() => {
    if (selectedChat) selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    setSelectedId((current) => {
      if (current && sortedChats.some((chat) => chat.id === current)) return current;
      return sortedChats[0]?.id || null;
    });
  }, [sortedChats]);

  const safeName = (chat: Chat) => {
    const raw = String(chat.contactName || "").trim();
    const phone = normalizeWhatsAppPhone(chat.contactPhone);
    if (!raw || raw === phone || /^[+\d\s-]{6,}$/.test(raw) || isTechnical(raw)) {
      return phone || t.fallbackCustomer;
    }
    return raw;
  };

  const statusLabel = (status?: string | null) => {
    if (status === "sent") return t.statusSent;
    if (status === "delivered") return t.statusDelivered;
    if (status === "read") return t.statusRead;
    if (status === "failed") return t.statusFailed;
    if (status === "received") return t.statusReceived;
    return t.statusPending;
  };

  const safeSendError = (result: any) => {
    if (result?.errorCode === "WHATSAPP_TEMPLATE_REQUIRED") return t.templateRequired;
    return cleanDisplayText(result?.errorMessage || "", t.safeSendError);
  };

  const priorityLabel = (priority?: string | null) => {
    if (priority === "HIGH" || priority === "HOT") return t.high;
    if (priority === "URGENT") return t.urgent;
    if (priority === "LOW" || priority === "COLD") return t.low;
    return t.medium;
  };

  const isWaitingReply = (chat: Chat) => chat.messages[chat.messages.length - 1]?.sender === "client";
  const connected = cloudStatus?.configured && cloudStatus?.status === "connected";

  useEffect(() => {
    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(fetchFreshChats, 3000);
    };
    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") startPolling(); };
    const onHidden = () => { if (document.visibilityState === "hidden") stopPolling(); };

    if (connected) startPolling();
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [connected, fetchFreshChats]);

  const visibleSource = sortedChats.filter((chat) => {
    const haystack = `${safeName(chat)} ${cleanDisplayText(chat.lastMessage, "")}`.toLowerCase();
    const matchesSearch = haystack.includes(query.toLowerCase());
    const matchesFilter =
      filter === "ALL" ||
      (filter === "ARCHIVED" && chat.archived) ||
      (filter === "UNREAD" && chat.unread) ||
      (filter === "WAITING" && isWaitingReply(chat)) ||
      (filter === "OPEN" && !chat.archived);
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
    if (!selectedChat || !messageInput.trim() || isSending || sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    const text = messageInput.trim();
    const optimisticId = `local-${Date.now()}`;
    const optimisticTime = new Date().toISOString();
    setMessageInput("");
    setIsSending(true);
    setChats((current) =>
      current.map((chat) =>
        chat.id === selectedChat.id
          ? {
              ...chat,
              lastMessage: text,
              time: optimisticTime,
              messages: [...chat.messages, { id: optimisticId, sender: "agent", text, time: optimisticTime, status: "pending" }],
            }
          : chat
      )
    );
    try {
      const result = await sendWhatsAppMessageAction(normalizeWhatsAppPhone(selectedChat.contactPhone), text);
      if (!result.success) {
        setChats((current) =>
          current.map((chat) =>
            chat.id === selectedChat.id
              ? { ...chat, messages: chat.messages.map((message) => (message.id === optimisticId ? { ...message, status: "failed" } : message)) }
              : chat
          )
        );
        toast.error(safeSendError(result));
      } else {
        void fetchFreshChats();
      }
    } finally {
      sendInFlightRef.current = false;
      setIsSending(false);
    }
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

  async function archiveConversation() {
    if (!selectedChat) return;
    if (!window.confirm(selectedChat.archived ? t.unarchiveConfirm : t.archiveConfirm)) return;
    const result = await archiveChatAction(selectedChat.id);
    if (result.success) {
      setChats((current) => current.filter((c) => c.id !== selectedChat.id));
      setSelectedId(null);
      toast.success(selectedChat.archived ? t.unarchived : t.archived);
    } else {
      toast.error(t.archiveError);
    }
  }

  async function archiveChat(chat: Chat) {
    if (!window.confirm(chat.archived ? t.unarchiveConfirm : t.archiveConfirm)) return;
    const result = await archiveChatAction(chat.id);
    if (result.success) {
      setChats((current) => current.filter((c) => c.id !== chat.id));
      if (selectedId === chat.id) setSelectedId(null);
      toast.success(chat.archived ? t.unarchived : t.archived);
    } else {
      toast.error(t.archiveError);
    }
  }

  async function openAssign() {
    if (!selectedChat) return;
    setShowAssign(true);
    if (users.length === 0) {
      setLoadingUsers(true);
      const result = await getTenantUsersAction();
      setLoadingUsers(false);
      if (Array.isArray(result)) {
        setUsers(result.filter((u: any) => u.isActive).map((u: any) => ({ id: u.id, name: u.name })));
      }
    }
  }

  async function handleAssign(userId: string, userName: string) {
    if (!selectedChat) return;
    const result = await assignChatAction(selectedChat.id, userId);
    if (result.success) {
      const assignedName = result.assignedUserName || userName;
      setChats((current) =>
        current.map((c) => (c.id === selectedChat.id ? { ...c, assignedUserId: userId, assignedUserName: assignedName } : c))
      );
      setShowAssign(false);
      toast.success(t.assigned);
    } else {
      toast.error(t.assignError);
    }
  }

  async function handleNewChat(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidLocalPhone(newCountryCode, newPhone)) {
      setNewChatError(t.invalidPhone);
      return;
    }
    const normalizedPhone = composeWhatsAppPhone(newCountryCode, newPhone);
    if (!normalizedPhone || !newMessage.trim() || isCreatingChat || createSendInFlightRef.current) return;
    createSendInFlightRef.current = true;
    setIsCreatingChat(true);
    setNewChatError(null);
    try {
      const result = await sendWhatsAppMessageAction(normalizedPhone, newMessage.trim());
      if (result.success && result.messageId) {
        setFilter("ALL");
        setPage(1);
        setNewPhone("");
        setNewCountryCode("966");
        setNewMessage("");
        setNewChatError(null);
        setShowNewForm(false);
        toast.success(t.sentSuccess);
        void fetchFreshChats("active").then((freshChats) => {
          const newChat = freshChats.find(
            (chat) => normalizeWhatsAppPhone(chat.contactPhone) === (result.phone || normalizedPhone)
          );
          if (newChat) setSelectedId(newChat.id);
        });
      } else {
        setNewChatError(safeSendError(result));
      }
    } finally {
      createSendInFlightRef.current = false;
      setIsCreatingChat(false);
    }
  }

  const listItems: WorkspaceListItem[] = pageItems.map((chat) => ({
    id: chat.id,
    title: safeName(chat),
    snippet: cleanDisplayText(chat.lastMessage, t.noMessages),
    timestamp: formatDateTime(chat.time),
    avatar: safeName(chat).charAt(0),
    selected: chat.id === selectedId,
    badge: chat.unread
      ? { label: t.unreadBadge, tone: "warning" }
      : chat.archived
        ? { label: t.archived, tone: "neutral" }
        : isWaitingReply(chat)
        ? { label: t.pending, tone: "warning" }
        : { label: t.read, tone: "success" },
    onSelect: () => selectChat(chat.id),
    actions: [
      { label: t.openDetails, icon: Eye, onClick: () => selectChat(chat.id) },
      { label: chat.archived ? t.unarchive : t.archive, icon: Archive, onClick: () => archiveChat(chat) },
    ],
  }));

  const timeline: WorkspaceTimelineItem[] =
    selectedChat?.messages.map((message, index) => ({
      id: message.id || `${selectedChat.id}-${message.time}-${index}`,
      body: (
          <span style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 14, lineHeight: 1.65 }}>{cleanDisplayText(message.text, t.noData)}</span>
          <span style={{ fontSize: 11, lineHeight: 1.2, opacity: 0.72 }}>
            {formatDateTime(message.time)}
            {message.sender === "agent" ? ` · ${statusLabel(message.status)}` : ""}
          </span>
        </span>
      ),
      side: message.sender === "agent" ? "in" : "out",
    })) || [];

  return (
    <>
    <UnifiedOperationsWorkspace
      module="whatsapp"
      language={language}
      title={t.title}
      description={`${connected ? t.connected : t.disconnected}${!connected ? ` · ${t.notConfigured}` : warning ? ` · ${warning}` : ""}`}
      kpis={[
        { label: t.active, value: formatNumber(sortedChats.length), icon: MessageSquare },
        { label: t.unread, value: formatNumber(unreadCount), icon: MessageSquare },
        { label: t.waiting, value: formatNumber(waitingCount), icon: Clock },
        { label: t.responseRate, value: formatPercent(responseRate), icon: Check },
      ]}
      listTitle={t.listTitle}
      listSubtitle={`${t.latestFirst} · ${formatNumber(visibleSource.length)} ${t.listTitle}`}
      newLabel={t.newLabel}
      onNew={() => { setNewChatError(null); setShowNewForm(true); }}
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
        { value: "ARCHIVED", label: t.archivedFilter },
        { value: "UNREAD", label: t.unreadFilter },
        { value: "WAITING", label: t.waitingFilter },
      ]}
      onFilterChange={(value) => {
        setFilter(value);
        setPage(1);
        void fetchFreshChats(value === "ARCHIVED" ? "archived" : "active");
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
                  { label: t.assignee, icon: UserPlus, onClick: openAssign },
                { label: t.createTask, icon: PlusCircle, onClick: createTaskForSelected },
                { label: selectedChat.archived ? t.unarchive : t.archive, icon: Archive, tone: "danger", onClick: archiveConversation },
              ],
              context: [
                { label: t.customer, value: safeName(selectedChat) },
                { label: t.owner, value: selectedChat.assignedUserName || t.unknownAgent },
                { label: t.priority, value: priorityLabel(selectedChat.leadPriority) },
              ],
              timeline,
              emptyTitle: t.noData,
              emptyDescription: t.noMessages,
              composer: {
                mode: "note",
                value: messageInput,
                placeholder: t.messagePlaceholder,
                sendLabel: t.send,
                onChange: setMessageInput,
                onSend: handleSend,
                disabled: false,
              },
            }
          : null
      }
      emptyDetailTitle={t.noData}
      emptyDetailDescription={t.select}
    />
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleNewChat} className="w-full max-w-md rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-6 shadow-2xl space-y-4 text-right" dir={isArabic ? "rtl" : "ltr"}>
            <h2 className="text-base font-bold text-[var(--nc-text-primary)] border-b border-[var(--nc-border)] pb-2">{t.newChatTitle}</h2>
            <div>
              <label className="block mb-1.5 text-xs font-bold text-[var(--nc-text-secondary)]">{t.newChatPhone}</label>
              <div className="grid grid-cols-[128px_1fr] gap-2">
                <select
                  value={newCountryCode}
                  onChange={(e) => { setNewCountryCode(e.target.value); setNewChatError(null); }}
                  aria-label={t.newChatCountry}
                  className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2.5 text-sm text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)]"
                  dir="ltr"
                >
                  {PHONE_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      +{country.code} {isArabic ? country.ar : country.en}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => { setNewPhone(normalizeLocalPhone(e.target.value)); setNewChatError(null); }}
                  placeholder="551234567"
                  required
                  className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2.5 text-sm text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)]"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-bold text-[var(--nc-text-secondary)]">{t.newChatMessage}</label>
              <textarea value={newMessage} onChange={(e) => { setNewMessage(e.target.value); setNewChatError(null); }} placeholder={t.messagePlaceholder} required rows={3} className="w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2.5 text-sm text-[var(--nc-text-primary)] outline-none resize-none focus:border-[var(--nc-accent-border)]" />
            </div>
            {newChatError && (
              <div role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-200">
                <p className="font-semibold">{t.newChatErrorTitle}</p>
                <p className="mt-1 leading-5">{newChatError}</p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={isCreatingChat} aria-busy={isCreatingChat} className="nc-btn-primary flex-1 min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-70">{isCreatingChat ? t.sending : t.newChatSend}</button>
              <button type="button" disabled={isCreatingChat} onClick={() => { setShowNewForm(false); setNewCountryCode("966"); setNewPhone(""); setNewMessage(""); setNewChatError(null); }} className="nc-btn-ghost flex-1 min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-70">{t.newChatCancel}</button>
            </div>
          </form>
        </div>
      )}
      {showAssign && selectedChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-5 shadow-2xl space-y-3" dir={isArabic ? "rtl" : "ltr"}>
            <h2 className="text-base font-bold text-[var(--nc-text-primary)] border-b border-[var(--nc-border)] pb-2">{t.assignTitle}</h2>
            <p className="text-xs text-[var(--nc-text-secondary)]">{safeName(selectedChat)}</p>
            {loadingUsers ? (
              <p className="text-sm text-[var(--nc-text-secondary)] text-center py-4">{isArabic ? "جاري تحميل المستخدمين..." : "Loading users..."}</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-[var(--nc-text-secondary)] text-center py-4">{isArabic ? "لا يوجد مستخدمون" : "No users found"}</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {users.map((u) => (
                  <button key={u.id} type="button" onClick={() => handleAssign(u.id, u.name)} className="w-full text-right px-3 py-2.5 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] hover:bg-[var(--nc-surface)] text-sm font-semibold text-[var(--nc-text-primary)] flex items-center justify-between gap-2">
                    <span>{u.name}</span>
                    {selectedChat.assignedUserId === u.id && <span className="text-xs text-[var(--nc-accent-text)]">✓</span>}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setShowAssign(false)} className="nc-btn-ghost w-full min-h-[40px] rounded-xl text-sm font-semibold">{isArabic ? "إلغاء" : "Cancel"}</button>
          </div>
        </div>
      )}
    </>
  );
}
