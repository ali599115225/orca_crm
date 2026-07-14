"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Check, ChevronLeft, ChevronRight, Clock, MessageSquare, Plus, PlusCircle, RefreshCw, Search, Send, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

import { createWhatsAppTaskAction } from "@/app/actions/whatsapp-crm";
import { archiveChatAction, assignChatAction, getWhatsAppAssigneesAction, getWhatsAppChatsAction, sendWhatsAppMessageAction } from "@/app/actions/whatsapp";
import { useApp } from "@/app/context/AppContext";
import { useNotify } from "@/app/context/UIBusContext";
import SettingsSelect from "@/components/settings/SettingsSelect";
import { toArabicNumerals } from "@/lib/formatters";

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
  currentUserId: string | null;
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
    assignedToMe: "مسندة إليّ",
    connected: "واتساب — متصل",
    disconnected: "واتساب — غير متصل",
    testMode: "وضع اختبار Meta",
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
    newChatCustomerSearch: "ابحث عن عميل محفوظ (اختياري)",
    newChatCustomerHint: "يمكنك اختيار عميل محفوظ أو إدخال رقم خارجي يدويًا.",
    newChatCountry: "رمز الدولة",
    invalidPhone: "أدخل رقمًا محليًا صحيحًا دون 0 في البداية.",
    newChatErrorTitle: "تعذر بدء المحادثة",
    errorSubcode: "الرمز الفرعي",
    newChatMessage: "الرسالة الأولى",
    newChatSend: "بدء المحادثة",
    newChatCancel: "إلغاء",
    sentSuccess: "تم قبول الرسالة",
    providerMeta: "Meta Cloud",
    provider360: "360dialog",
    configureMeta: "ربط Meta",
    configure360: "ربط 360dialog",
    flow: "العمليات ← المراسلات ← واتساب",
    refresh: "تحديث",
    manageConnection: "إدارة الربط",
    creatingTask: "جاري إنشاء المهمة…",
    loadingTeam: "جاري تحميل فريق العمل…",
    noTeam: "لا يوجد موظفون نشطون للإسناد.",
    matching: "النتائج المطابقة",
    pagePrevious: "السابق",
    pageNext: "التالي",
    backToConversations: "العودة إلى المحادثات",
    noConversations: "لا توجد محادثات مطابقة.",
    connection: "حالة الاتصال",
    messagesCount: "الرسائل",
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
    assignedToMe: "Assigned to me",
    connected: "WhatsApp — Connected",
    disconnected: "WhatsApp — Disconnected",
    testMode: "Meta Test Mode",
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
    newChatCustomerSearch: "Search saved customer (optional)",
    newChatCustomerHint: "Choose a saved customer or enter an external number manually.",
    newChatCountry: "Country code",
    invalidPhone: "Enter a valid local number without a leading 0.",
    newChatErrorTitle: "Could not start conversation",
    errorSubcode: "Subcode",
    newChatMessage: "First message",
    newChatSend: "Start conversation",
    newChatCancel: "Cancel",
    sentSuccess: "Message accepted",
    providerMeta: "Meta Cloud",
    provider360: "360dialog",
    configureMeta: "Connect Meta",
    configure360: "Connect 360dialog",
    flow: "Operations ← Messaging ← WhatsApp",
    refresh: "Refresh",
    manageConnection: "Manage connection",
    creatingTask: "Creating task…",
    loadingTeam: "Loading team…",
    noTeam: "No active team members are available for assignment.",
    matching: "Matching results",
    pagePrevious: "Previous",
    pageNext: "Next",
    backToConversations: "Back to conversations",
    noConversations: "No matching conversations.",
    connection: "Connection status",
    messagesCount: "Messages",
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

function splitInternationalPhone(value: string) {
  const digits = normalizeWhatsAppPhone(value);
  const country = PHONE_COUNTRIES.find((item) => digits.startsWith(item.code));
  if (!country) return null;
  return {
    countryCode: country.code,
    localPhone: digits.slice(country.code.length),
  };
}

export default function WhatsAppView({ initialChats, tenant, cloudStatus, currentUserId }: WhatsAppViewProps) {
  const { lang } = useApp();
  const { notify } = useNotify();
  const language = lang === "EN" ? "EN" : "AR";
  const t = TEXT[language];
  const isArabic = language === "AR";
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [newCountryCode, setNewCountryCode] = useState("966");
  const [newPhone, setNewPhone] = useState("");
  const [newCustomerQuery, setNewCustomerQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchInFlightRef = useRef<Promise<Chat[]> | null>(null);
  const sendInFlightRef = useRef(false);
  const createSendInFlightRef = useRef(false);
  const selectedChatRef = useRef<Chat | null>(null);
  const latestIncomingMessageRef = useRef<string | null>(null);

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
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)} • ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
  }, [chats]);

  const customerOptions = useMemo(() => {
    const byPhone = new Map<string, { phone: string; name: string }>();
    for (const chat of chats) {
      const phone = normalizeWhatsAppPhone(chat.contactPhone);
      if (!phone || byPhone.has(phone)) continue;
      const rawName = String(chat.contactName || "").trim();
      const name =
        !rawName || rawName === phone || /^[+\d\s-]{6,}$/.test(rawName) || isTechnical(rawName)
          ? t.fallbackCustomer
          : rawName;
      byPhone.set(phone, { phone, name });
    }
    return [...byPhone.values()].sort((left, right) =>
      left.name.localeCompare(right.name, isArabic ? "ar" : "en"),
    );
  }, [chats, isArabic, t.fallbackCustomer]);

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

  useEffect(() => {
    if (filter === "ARCHIVED") return;

    const latestIncoming = sortedChats
      .flatMap((chat) =>
        chat.messages.map((message, index) => ({ chat, message, index }))
      )
      .filter(({ message }) => message.sender === "client")
      .sort(
        (left, right) =>
          new Date(right.message.time || 0).getTime() -
          new Date(left.message.time || 0).getTime()
      )[0];

    if (!latestIncoming) {
      latestIncomingMessageRef.current = null;
      return;
    }

    const key =
      latestIncoming.message.id ||
      `${latestIncoming.chat.id}:${latestIncoming.message.time}:${latestIncoming.message.text}:${latestIncoming.index}`;

    if (latestIncomingMessageRef.current === null) {
      latestIncomingMessageRef.current = key;
      return;
    }

    if (latestIncomingMessageRef.current !== key) {
      const fallbackCustomer = isArabic ? TEXT.AR.fallbackCustomer : TEXT.EN.fallbackCustomer;
      const fallbackMessage = isArabic ? TEXT.AR.noData : TEXT.EN.noData;
      const rawName = String(latestIncoming.chat.contactName || "").trim();
      const phone = normalizeWhatsAppPhone(latestIncoming.chat.contactPhone);
      const contactName =
        !rawName ||
        rawName === phone ||
        /^[+\d\s-]{6,}$/.test(rawName) ||
        isTechnical(rawName)
          ? phone || fallbackCustomer
          : rawName;

      notify({
        type: "info",
        title: isArabic
          ? `رسالة واتساب جديدة من ${contactName}`
          : `New WhatsApp message from ${contactName}`,
        message: cleanDisplayText(latestIncoming.message.text, fallbackMessage),
        duration: 6000,
      });
    }

    latestIncomingMessageRef.current = key;
  }, [filter, isArabic, notify, sortedChats]);

  const statusLabel = (status?: string | null) => {
    if (status === "sent") return t.statusSent;
    if (status === "delivered") return t.statusDelivered;
    if (status === "read") return t.statusRead;
    if (status === "failed") return t.statusFailed;
    if (status === "received") return t.statusReceived;
    return t.statusPending;
  };

  const safeSendError = (result: any) => {
    if (result?.errorCode === "WHATSAPP_TEMPLATE_REQUIRED") {
      return t.templateRequired;
    }

    const raw = String(
      result?.errorMessage || result?.errorCode || "",
    );

    if (
      /TENANT_CONTEXT|WHATSAPP_(?:NOT_CONNECTED|NO_CREDENTIAL|NO_PHONE|MESSAGING_DISABLED)/.test(
        raw,
      )
    ) {
      return t.notConfigured;
    }

    return cleanDisplayText(raw, t.safeSendError);
  };

  const priorityLabel = (priority?: string | null) => {
    if (priority === "HIGH" || priority === "HOT") return t.high;
    if (priority === "URGENT") return t.urgent;
    if (priority === "LOW" || priority === "COLD") return t.low;
    return t.medium;
  };

  const isWaitingReply = (chat: Chat) => chat.messages[chat.messages.length - 1]?.sender === "client";
  const connected =
    cloudStatus?.configured && cloudStatus?.status === "connected";
  const testMode =
    cloudStatus?.configured && cloudStatus?.status === "test-mode";
  const whatsAppReachable = connected || testMode;
  const providerLabel =
    cloudStatus?.provider === "360dialog"
      ? t.provider360
      : cloudStatus?.provider === "meta"
        ? t.providerMeta
        : null;
  const connectionLabel = testMode
    ? t.testMode
    : connected
      ? `${t.connected}${providerLabel ? ` · ${providerLabel}` : ""}`
      : t.disconnected;

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

    if (whatsAppReachable) startPolling();
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [whatsAppReachable, fetchFreshChats]);

  const visibleSource = sortedChats.filter((chat) => {
    const haystack = `${safeName(chat)} ${cleanDisplayText(chat.lastMessage, "")}`.toLowerCase();
    const matchesSearch = haystack.includes(query.toLowerCase());
    const matchesFilter =
      filter === "ALL" ||
      (filter === "ARCHIVED" && chat.archived) ||
      (filter === "UNREAD" && chat.unread) ||
      (filter === "WAITING" && isWaitingReply(chat)) ||
      (filter === "ASSIGNED_TO_ME" && Boolean(currentUserId) && chat.assignedUserId === currentUserId) ||
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
    setMobileDetailOpen(true);
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
    if (!selectedChat || isCreatingTask) return;

    setIsCreatingTask(true);
    try {
      const formData = new FormData();
      formData.append("title", `${t.createTask} — ${safeName(selectedChat)}`);
      formData.append("taskType", "Follow-up");
      formData.append("contactPhone", normalizeWhatsAppPhone(selectedChat.contactPhone));
      formData.append("contactName", safeName(selectedChat));
      if (selectedChat.leadId) {
        formData.append("leadId", selectedChat.leadId);
      }

      const result = await createWhatsAppTaskAction(formData);
      if (result.success) {
        toast.success(t.taskCreated);
      } else {
        toast.error(cleanDisplayText(String(result.error || ""), t.taskError));
      }
    } finally {
      setIsCreatingTask(false);
    }
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
    if (users.length > 0 || loadingUsers) return;

    setLoadingUsers(true);
    try {
      const result = await getWhatsAppAssigneesAction();
      if (result.success) {
        setUsers(result.users);
      } else {
        toast.error(t.assignError);
      }
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleAssign(userId: string, userName: string) {
    if (!selectedChat || assigningUserId) return;

    setAssigningUserId(userId);
    try {
      const result = await assignChatAction(selectedChat.id, userId);
      if (result.success) {
        const assignedName = result.assignedUserName || userName;
        setChats((current) =>
          current.map((chat) =>
            chat.id === selectedChat.id
              ? {
                  ...chat,
                  assignedUserId: userId,
                  assignedUserName: assignedName,
                }
              : chat,
          ),
        );
        setShowAssign(false);
        toast.success(t.assigned);
      } else {
        toast.error(t.assignError);
      }
    } finally {
      setAssigningUserId(null);
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
      if (result.success && result.messageId && result.metaMessageId) {
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
          if (newChat) {
            setSelectedId(newChat.id);
            setMobileDetailOpen(true);
          }
        });
      } else {
        setNewChatError(safeSendError(result));
      }
    } finally {
      createSendInFlightRef.current = false;
      setIsCreatingChat(false);
    }
  }

  const visibleStart =
    visibleSource.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const visibleEnd = Math.min(
    safePage * PAGE_SIZE,
    visibleSource.length,
  );

  const conversationStatus = (chat: Chat) => {
    if (chat.archived) {
      return {
        label: t.archivedFilter,
        className:
          "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
      };
    }
    if (chat.unread) {
      return {
        label: t.unreadBadge,
        className:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      };
    }
    if (isWaitingReply(chat)) {
      return {
        label: t.pending,
        className:
          "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
      };
    }
    return {
      label: t.read,
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  };

  const closeNewChat = () => {
    setShowNewForm(false);
    setNewCountryCode("966");
    setNewPhone("");
    setNewCustomerQuery("");
    setNewMessage("");
    setNewChatError(null);
  };

  return (
    <>
      <section
        dir={isArabic ? "rtl" : "ltr"}
        className="nc-page nc-stack orca-container pb-4"
        data-whatsapp-property-workspace
        data-whatsapp-two-card-workspace
      >
        <header className="orca-workspace-hero">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--nc-accent)]">
              {t.flow}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black">{t.title}</h1>
              <span
                className={`inline-flex min-h-7 items-center justify-center rounded-full border px-3 text-xs font-black ${
                  whatsAppReachable
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                }`}
              >
                {connectionLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
              {t.description}
            </p>
            <p className="mt-1 text-xs text-[var(--nc-text-dim)]">
              {tenant.companyName}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {!whatsAppReachable ? (
              <a
                href="/operations/settings?tab=integrations&category=MESSAGING"
                className="nc-btn nc-btn-secondary inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-xs font-black"
              >
                {t.manageConnection}
              </a>
            ) : null}

            <button
              type="button"
              onClick={() =>
                void fetchFreshChats(
                  filter === "ARCHIVED" ? "archived" : "active",
                )
              }
              className="nc-btn nc-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] px-4 text-xs font-bold"
            >
              <RefreshCw size={15} />
              {t.refresh}
            </button>

            <button
              type="button"
              disabled={!whatsAppReachable}
              onClick={() => {
                setNewChatError(null);
                setShowNewForm(true);
              }}
              className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              {t.newLabel}
            </button>
          </div>
        </header>

        <div className="orca-workspace-metrics">
          {[
            {
              label: t.active,
              value: formatNumber(sortedChats.filter((chat) => !chat.archived).length),
              icon: MessageSquare,
            },
            {
              label: t.unread,
              value: formatNumber(unreadCount),
              icon: MessageSquare,
            },
            {
              label: t.waiting,
              value: formatNumber(waitingCount),
              icon: Clock,
            },
            {
              label: t.responseRate,
              value: formatPercent(responseRate),
              icon: Check,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="orca-workspace-metric min-h-[84px]"
            >
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
          <strong>{formatNumber(visibleSource.length)}</strong>
          <span className="text-[var(--nc-border)]">|</span>
          <span className="text-[var(--nc-text-secondary)]">
            {t.unread}:
          </span>
          <strong>{formatNumber(unreadCount)}</strong>
          <span className="text-[var(--nc-border)]">|</span>
          <span className="text-[var(--nc-text-secondary)]">
            {t.latestFirst}
          </span>
        </div>

        <div
          dir="ltr"
          className="grid min-w-0 gap-3 lg:grid-cols-[340px_minmax(0,1fr)]"
          data-four-page-two-card-workspace
        >
          <aside
            dir={isArabic ? "rtl" : "ltr"}
            data-whatsapp-conversation-list
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
                    void fetchFreshChats(
                      value === "ARCHIVED" ? "archived" : "active",
                    );
                  }}
                  aria-label={t.filter}
                  options={[
                    { value: "ALL", label: t.all },
                    { value: "OPEN", label: t.open },
                    { value: "ARCHIVED", label: t.archivedFilter },
                    { value: "UNREAD", label: t.unreadFilter },
                    { value: "WAITING", label: t.waitingFilter },
                    ...(currentUserId
                      ? [
                          {
                            value: "ASSIGNED_TO_ME",
                            label: t.assignedToMe,
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {pageItems.length === 0 ? (
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] p-6 text-center text-sm text-[var(--nc-text-secondary)]">
                  {t.noConversations}
                </div>
              ) : (
                <div className="space-y-2">
                  {pageItems.map((chat) => {
                    const selected = chat.id === selectedId;
                    const status = conversationStatus(chat);

                    return (
                      <button
                        key={chat.id}
                        type="button"
                        data-whatsapp-row
                        aria-pressed={selected}
                        onClick={() => selectChat(chat.id)}
                        className={`group flex h-[68px] w-full items-center gap-3 rounded-2xl border px-3 text-start outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-border)] ${
                          selected
                            ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]"
                            : "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-accent)]"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black ${
                            selected
                              ? "border-[var(--nc-accent-border)] bg-[var(--nc-surface-solid)]"
                              : "border-[var(--nc-border)] bg-[var(--nc-surface-solid)]"
                          }`}
                          aria-hidden="true"
                        >
                          {safeName(chat).charAt(0)}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <strong className="truncate text-sm">
                              {safeName(chat)}
                            </strong>
                            <time
                              dir="ltr"
                              className="shrink-0 text-[11px] text-[var(--nc-text-dim)]"
                            >
                              {formatDateTime(chat.time)}
                            </time>
                          </span>

                          <span className="mt-1 flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-xs text-[var(--nc-text-secondary)]">
                              {cleanDisplayText(
                                chat.lastMessage,
                                t.noMessages,
                              )}
                            </span>
                            <span
                              className={`inline-flex min-w-[78px] shrink-0 justify-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${status.className}`}
                            >
                              {status.label}
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
                    )} من ${formatNumber(visibleSource.length)}`
                  : `${visibleStart}–${visibleEnd} of ${visibleSource.length}`}
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
            data-whatsapp-conversation-detail
            data-operational-detail-card
            className={`orca-workspace-panel min-w-0 flex-col overflow-hidden lg:flex lg:h-[520px] ${
              mobileDetailOpen ? "flex" : "hidden lg:flex"
            }`}
          >
            {selectedChat ? (
              <>
                <header className="flex min-h-[72px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--nc-border)] px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileDetailOpen(false)}
                      className="nc-btn nc-btn-ghost min-h-[44px] min-w-[44px] rounded-xl border border-[var(--nc-border)] px-3 lg:!hidden"
                      aria-label={t.backToConversations}
                    >
                      {isArabic ? (
                        <ChevronRight size={18} />
                      ) : (
                        <ChevronLeft size={18} />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--nc-accent)]">
                        {connectionLabel}
                      </p>
                      <h2 className="mt-1 truncate text-lg font-black">
                        {safeName(selectedChat)}
                      </h2>
                      <p
                        dir="ltr"
                        className="mt-1 text-xs text-[var(--nc-text-secondary)]"
                      >
                        +{normalizeWhatsAppPhone(selectedChat.contactPhone)}
                        {" · "}
                        {formatDateTime(selectedChat.time)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={openAssign}
                      disabled={loadingUsers || Boolean(assigningUserId)}
                      className="nc-btn nc-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UserPlus size={16} />
                      {t.assignee}
                    </button>
                    <button
                      type="button"
                      onClick={createTaskForSelected}
                      disabled={isCreatingTask}
                      aria-busy={isCreatingTask}
                      className="nc-btn nc-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 text-xs font-black disabled:cursor-wait disabled:opacity-60"
                    >
                      <PlusCircle size={16} />
                      {isCreatingTask ? t.creatingTask : t.createTask}
                    </button>
                    <button
                      type="button"
                      onClick={archiveConversation}
                      className="nc-btn inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-black text-rose-700 dark:text-rose-300"
                    >
                      <Archive size={16} />
                      {selectedChat.archived
                        ? t.unarchive
                        : t.archive}
                    </button>
                  </div>
                </header>

                <div
                  data-whatsapp-context-strip
                  className="flex min-h-[44px] shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b border-[var(--nc-border)] px-4 py-2.5 text-xs"
                >
                  <span className="min-w-0 text-[var(--nc-text-secondary)]">
                    {t.customer}:{" "}
                    <strong className="text-[var(--nc-text-primary)]">
                      {safeName(selectedChat)}
                    </strong>
                  </span>
                  <span className="min-w-0 text-[var(--nc-text-secondary)]">
                    {t.owner}:{" "}
                    <strong className="text-[var(--nc-text-primary)]">
                      {selectedChat.assignedUserName || t.unknownAgent}
                    </strong>
                  </span>
                  <span className="text-[var(--nc-text-secondary)]">
                    {t.priority}:{" "}
                    <strong className="text-[var(--nc-text-primary)]">
                      {priorityLabel(selectedChat.leadPriority)}
                    </strong>
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {selectedChat.messages.length === 0 ? (
                    <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] p-6 text-center text-sm text-[var(--nc-text-secondary)]">
                      {t.noMessages}
                    </div>
                  ) : (
                    <div className="mx-auto flex max-w-4xl flex-col gap-2.5">
                      {selectedChat.messages.map((message, index) => {
                        const isAgent = message.sender === "agent";
                        return (
                          <article
                            key={
                              message.id ||
                              `${selectedChat.id}-${message.time}-${index}`
                            }
                            className={`flex ${
                              isAgent ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[72%] rounded-xl border px-3 py-2 ${
                                isAgent
                                  ? "border-blue-500/30 bg-blue-600 text-white"
                                  : "border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)]"
                              }`}
                            >
                              <p className="whitespace-pre-wrap text-sm leading-6">
                                {cleanDisplayText(
                                  message.text,
                                  t.noData,
                                )}
                              </p>
                              <p
                                dir="ltr"
                                className={`mt-0.5 text-[10px] ${
                                  isAgent
                                    ? "text-blue-100"
                                    : "text-[var(--nc-text-dim)]"
                                }`}
                              >
                                {formatDateTime(message.time)}
                                {isAgent
                                  ? ` · ${statusLabel(message.status)}`
                                  : ""}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                <footer className="shrink-0 border-t border-[var(--nc-border)] px-4 py-3">
                  <div
                    data-whatsapp-message-composer
                    className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_120px]"
                  >
                    <textarea
                      value={messageInput}
                      onChange={(event) =>
                        setMessageInput(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                      disabled={!whatsAppReachable || isSending}
                      rows={3}
                      placeholder={t.messagePlaceholder}
                      className="min-h-[84px] max-h-[144px] w-full resize-y rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--nc-accent-border)] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={
                        !whatsAppReachable ||
                        isSending ||
                        !messageInput.trim()
                      }
                      className="nc-btn-primary inline-flex h-11 min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-[120px]"
                    >
                      <Send size={16} />
                      {isSending ? t.sending : t.send}
                    </button>
                  </div>
                </footer>
              </>
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center p-8 text-center">
                <div>
                  <MessageSquare
                    size={28}
                    className="mx-auto text-[var(--nc-text-dim)]"
                  />
                  <h2 className="mt-3 text-lg font-black">
                    {t.noData}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--nc-text-secondary)]">
                    {t.select}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
      {showNewForm && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-x-0 bottom-0 top-[88px] z-[120] flex items-center justify-center bg-black/55 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="whatsapp-new-chat-title"
            >
              <form
                onSubmit={handleNewChat}
                className="max-h-full w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-6 text-right shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                dir={isArabic ? "rtl" : "ltr"}
              >
                <h2
                  id="whatsapp-new-chat-title"
                  className="border-b border-[var(--nc-border)] pb-2 text-base font-bold text-[var(--nc-text-primary)]"
                >
                  {t.newChatTitle}
                </h2>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">
                    {t.newChatCustomerSearch}
                  </label>
                  <input
                    list="whatsapp-customer-options"
                    value={newCustomerQuery}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNewCustomerQuery(value);
                      const normalized = normalizeWhatsAppPhone(value);
                      const selected = customerOptions.find(
                        (option) => option.phone === normalized,
                      );
                      const split = selected ? splitInternationalPhone(selected.phone) : null;
                      if (split) {
                        setNewCountryCode(split.countryCode);
                        setNewPhone(split.localPhone);
                        setNewChatError(null);
                      }
                    }}
                    placeholder={t.newChatCustomerSearch}
                    className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2.5 text-sm text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)]"
                    dir={isArabic ? "rtl" : "ltr"}
                  />
                  <datalist id="whatsapp-customer-options">
                    {customerOptions.map((option) => (
                      <option key={option.phone} value={option.phone}>
                        {option.name}
                      </option>
                    ))}
                  </datalist>
                  <p className="mt-1 text-[11px] text-[var(--nc-text-secondary)]">
                    {t.newChatCustomerHint}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">
                    {t.newChatPhone}
                  </label>
                  <div className="grid grid-cols-[128px_1fr] gap-2">
                    <select
                      value={newCountryCode}
                      onChange={(event) => {
                        setNewCountryCode(event.target.value);
                        setNewChatError(null);
                      }}
                      aria-label={t.newChatCountry}
                      className="min-h-[44px] rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2.5 text-sm text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)]"
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
                      onChange={(event) => {
                        setNewPhone(
                          normalizeLocalPhone(event.target.value),
                        );
                        setNewChatError(null);
                      }}
                      placeholder="551234567"
                      required
                      className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2.5 text-sm text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)]"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]">
                    {t.newChatMessage}
                  </label>
                  <textarea
                    value={newMessage}
                    onChange={(event) => {
                      setNewMessage(event.target.value);
                      setNewChatError(null);
                    }}
                    placeholder={t.messagePlaceholder}
                    required
                    rows={3}
                    className="min-h-[112px] w-full resize-none rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2.5 text-base text-[var(--nc-text-primary)] outline-none focus:border-[var(--nc-accent-border)]"
                  />
                </div>

                {newChatError ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-200"
                  >
                    <p className="font-semibold">{t.newChatErrorTitle}</p>
                    <p className="mt-1 leading-5">{newChatError}</p>
                  </div>
                ) : null}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isCreatingChat || !whatsAppReachable}
                    aria-busy={isCreatingChat}
                    className="nc-btn-primary min-h-[44px] flex-1 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreatingChat ? t.sending : t.newChatSend}
                  </button>
                  <button
                    type="button"
                    disabled={isCreatingChat}
                    onClick={closeNewChat}
                    className="nc-btn-ghost min-h-[44px] flex-1 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-70"
                  >
                    {t.newChatCancel}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}

      {showAssign && selectedChat && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-x-0 bottom-0 top-[88px] z-[120] flex items-center justify-center bg-black/55 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="whatsapp-assign-title"
            >
              <div
                className="max-h-full w-full max-w-sm space-y-3 overflow-y-auto rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-5 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                dir={isArabic ? "rtl" : "ltr"}
              >
                <h2
                  id="whatsapp-assign-title"
                  className="border-b border-[var(--nc-border)] pb-2 text-base font-bold text-[var(--nc-text-primary)]"
                >
                  {t.assignTitle}
                </h2>
                <p className="text-xs text-[var(--nc-text-secondary)]">
                  {safeName(selectedChat)}
                </p>

                {loadingUsers ? (
                  <p className="py-4 text-center text-sm text-[var(--nc-text-secondary)]">
{t.loadingTeam}
                  </p>
                ) : users.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[var(--nc-text-secondary)]">
{t.noTeam}
                  </p>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() =>
                          handleAssign(user.id, user.name)
                        }
                        disabled={Boolean(assigningUserId)}
                        aria-busy={assigningUserId === user.id}
                        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2.5 text-right text-sm font-semibold text-[var(--nc-text-primary)] hover:bg-[var(--nc-surface)] disabled:cursor-wait disabled:opacity-60"
                      >
                        <span>{user.name}</span>
                        {selectedChat.assignedUserId === user.id ? (
                          <span className="text-xs text-[var(--nc-accent-text)]">
                            ✓
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowAssign(false)}
                  className="nc-btn-ghost min-h-[44px] w-full rounded-xl text-sm font-semibold"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

    </>
  );
}
