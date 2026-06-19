// components/views/WhatsAppView.tsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

import PageHeader from '@/components/ui/PageHeader';
import { SmartCard } from '@/components/ui/SmartCard';
import { toggleWhatsAppConnectionAction, sendWhatsAppMessageAction, deleteWhatsAppConversationAction } from "@/app/actions/whatsapp";
import { createWhatsAppTaskAction } from "@/app/actions/whatsapp-crm";
import { useApp } from "@/app/context/AppContext";
import toast from 'react-hot-toast';
import { displayPerson } from '@/lib/display';
import { toArabicNumerals } from '@/lib/formatters';

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

const TRANSLATIONS = {
  AR: {
    title: "إدارة المحادثات",
    subtitle: "واتساب للأعمال — {companyName}",
    connected: "متصل",
    disconnected: "غير متصل",
    cloudApiLabel: "الربط",
    phoneNumberLabel: "رقم الهاتف",
    wabaLabel: "الحساب",
    provider: "واتساب",
    conversationsTitle: "المحادثات",
    emptyState: "لا توجد محادثات بعد.",
    newChatTitle: "محادثة جديدة",
    phonePlaceholder: "أدخل رقم الهاتف (مثال: 966501234567)",
    startChatBtn: "بدء المحادثة",
    now: "الآن",
    inputPlaceholder: "اكتب رسالة...",
    sendBtn: "إرسال",
    selectConversation: "اختر محادثة من القائمة",
    configureWarning: "يلزم إكمال إعدادات الربط من لوحة الإعدادات قبل استخدام المحادثات.",
    createTask: "إنشاء مهمة",
    taskTitleLabel: "عنوان المهمة",
    taskTypeLabel: "نوع المهمة",
    taskTypes: { Call: "اتصال", Visit: "زيارة", "Follow-up": "متابعة", "Send Offer": "إرسال عرض" },
    createTaskBtn: "إنشاء",
    cancelBtn: "إلغاء",
    taskCreated: "تم إنشاء المهمة بنجاح",
    taskError: "تعذر إنشاء المهمة",
    titleRequired: "عنوان المهمة مطلوب",
    phoneUnavailable: "رقم الهاتف غير متوفر",
    unexpectedError: "حدث خطأ غير متوقع",
    deleteConfirm: "هل تريد حذف هذه المحادثة؟ سيتم حذف الرسائل من ORCA فقط، ولن تُحذف من واتساب.",
    deleteBtn: "حذف",
    deleting: "جاري الحذف...",
    deleteSuccess: "تم حذف المحادثة من ORCA",
    deleteError: "تعذر حذف المحادثة",
    notSpecified: "غير محدد",
  },
  EN: {
    title: "Chat Management",
    subtitle: "WhatsApp Business — {companyName}",
    connected: "Connected",
    disconnected: "Disconnected",
    cloudApiLabel: "Connection",
    phoneNumberLabel: "Phone",
    wabaLabel: "Account",
    provider: "WhatsApp",
    conversationsTitle: "Conversations",
    emptyState: "No conversations yet.",
    newChatTitle: "New Chat",
    phonePlaceholder: "Enter phone number (e.g. 966501234567)",
    startChatBtn: "Start Chat",
    now: "Now",
    inputPlaceholder: "Type a message...",
    sendBtn: "Send",
    selectConversation: "Select a conversation",
    configureWarning: "Connection settings are incomplete. Please review settings.",
    createTask: "Create Task",
    taskTitleLabel: "Task Title",
    taskTypeLabel: "Task Type",
    taskTypes: { Call: "Call", Visit: "Visit", "Follow-up": "Follow-up", "Send Offer": "Send Offer" },
    createTaskBtn: "Create",
    cancelBtn: "Cancel",
    taskCreated: "Task created successfully",
    taskError: "Failed to create task",
    titleRequired: "Task title is required",
    phoneUnavailable: "Phone number is unavailable",
    unexpectedError: "An unexpected error occurred",
    deleteConfirm: "Delete this conversation? Messages will be removed from ORCA only and will not be deleted from WhatsApp.",
    deleteBtn: "Delete",
    deleting: "Deleting...",
    deleteSuccess: "Conversation deleted from ORCA",
    deleteError: "Failed to delete conversation",
    notSpecified: "Not specified",
  }
};

export default function WhatsAppView({ initialChats, tenant, cloudStatus, warning }: WhatsAppViewProps) {
  const { lang } = useApp();
  const router = useRouter();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isArabic = lang === "AR";
  const dir = isArabic ? "rtl" : "ltr";
  const displayLocale = isArabic ? 'ar' : 'en';

  const containsArabic = (value: string) => /[\u0600-\u06FF]/.test(value);
  const looksTechnical = (value: string) => {
    const v = value.trim();
    return (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ||
      /^[0-9a-f]{8,24}$/i.test(v) ||
      /(?:^|\b)(?:chat|contact|lead|task|user|id)_[a-z0-9_-]+(?:\b|$)/i.test(v) ||
      /\b(?:demo|mock|stress|trial|تجريبي)\b/i.test(v)
    );
  };
  const safeDisplayText = (value: unknown, fallback = t.notSpecified) => {
    const text = String(value ?? '').trim();
    if (!text || looksTechnical(text)) return fallback;
    if (!isArabic && containsArabic(text)) return fallback;
    return text;
  };
  const formatNumber = (value: string | number) => (isArabic ? toArabicNumerals(value) : String(value));
  const displayContactName = (chat: Pick<Chat, 'contactName' | 'contactPhone'>) => {
    const rawName = String(chat.contactName || '').trim();
    const phone = String(chat.contactPhone || '').trim();
    if (!rawName || rawName === phone || /^[+\d\s-]{6,}$/.test(rawName)) return phone || t.notSpecified;
    const displayed = displayPerson(rawName, displayLocale, { route: '/operations/whatsapp' });
    return safeDisplayText(displayed, phone || t.notSpecified);
  };

  const connected = cloudStatus?.configured && cloudStatus?.status === "connected";
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChats[0]?.id || null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [taskChatId, setTaskChatId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState("Call");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // مزامنة chats عند تغير initialChats (بعد Refresh/navigation)
  useEffect(() => {
    setChats(initialChats);
    setActiveChatId(prev => {
      // إذا كان activeChatId الحالي غير موجود في initialChats، اختر الأول
      const exists = initialChats.find(c => c.id === prev);
      if (!exists && initialChats.length > 0) return initialChats[0].id;
      if (initialChats.length === 0) return null;
      return prev;
    });
  }, [initialChats]);

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  async function handleSend() {
    if (!messageInput.trim() || !activeChat) return;
    const text = messageInput.trim();
    setMessageInput("");
    setIsSending(true);

    const newMsg: Message = { sender: "agent", text, time: t.now };
    setChats(prev => prev.map(c =>
      c.id === activeChat.id ? { ...c, messages: [...c.messages, newMsg], lastMessage: text, time: t.now } : c
    ));
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    await sendWhatsAppMessageAction(activeChat.contactPhone, text);
    setIsSending(false);
  }

  async function handleCreateTask() {
    if (!taskTitle.trim() || !taskChatId) {
      toast.error(t.titleRequired);
      return;
    }
    const chat = chats.find(c => c.id === taskChatId);
    if (!chat?.contactPhone) {
      toast.error(t.phoneUnavailable);
      return;
    }

    setIsCreatingTask(true);
    try {
      const formData = new FormData();
      formData.append("title", taskTitle.trim());
      formData.append("taskType", taskType);
      formData.append("contactPhone", chat.contactPhone);

      const result = await createWhatsAppTaskAction(formData);

      if (result.success) {
        setTaskChatId(null);
        setTaskTitle("");
        setTaskType("Call");
        toast.success(t.taskCreated);
        router.refresh();
      } else {
        toast.error(result.error || t.taskError);
      }
    } catch (err) {
      console.error("[WA_TASK] Client error:", err);
      toast.error(t.unexpectedError);
    } finally {
      setIsCreatingTask(false);
    }
  }

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(contactId: string) {
    setIsDeleting(true);
    const result = await deleteWhatsAppConversationAction(contactId);
    setIsDeleting(false);
    setDeleteConfirm(null);
    if (result.success) {
      setChats(prev => {
        const updated = prev.filter(c => c.id !== contactId);
        // إذا كانت المحادثة المحذوفة هي النشطة، اختر أول محادثة متبقية
        if (activeChatId === contactId && updated.length > 0) {
          setActiveChatId(updated[0].id);
        } else if (activeChatId === contactId) {
          setActiveChatId(null);
        }
        return updated;
      });
      toast.success(t.deleteSuccess);
    } else {
      toast.error(safeDisplayText(result.error, t.deleteError));
    }
  }

  function getClassificationBadge(priority: string | null | undefined) {
    if (!priority) return null;
    const colors: Record<string, string> = {
      HOT: "bg-red-500/20 text-red-400 border-red-500/30",
      WARM: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      COLD: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    const labels: Record<string, string> = {
      HOT: isArabic ? "ساخن" : "Hot",
      WARM: isArabic ? "دافئ" : "Warm",
      COLD: isArabic ? "بارد" : "Cold",
    };
    const colorClass = colors[priority] || colors.COLD;
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colorClass} font-bold`}>
        {labels[priority] || priority}
      </span>
    );
  }

  function startNewChat() {
    const phone = newPhone.trim();
    if (!phone) return;
    const existing = chats.find(c => c.contactPhone === phone);
    if (existing) {
      setActiveChatId(existing.id);
    } else {
      const newChat: Chat = {
        id: `new-${Date.now()}`,
        contactName: phone,
        contactPhone: phone,
        lastMessage: "",
        time: t.now,
        unread: false,
        messages: [],
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
    }
    setNewPhone("");
    setShowNewChat(false);
  }

  return (
    <div className="space-y-4 p-6" dir={dir}>
      <PageHeader title={t.title} description={t.subtitle.replace("{companyName}", safeDisplayText(tenant.companyName, t.notSpecified))} />

      {/* Cloud API Status */}
      <SmartCard className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-sm font-bold text-[var(--nc-text-primary)]">
              {t.provider} — {connected ? t.connected : t.disconnected}
            </span>
          </div>
          {!connected && (
            <div className="text-xs text-[var(--nc-text-dim)]">{t.configureWarning}</div>
          )}
        </div>
      </SmartCard>

      {/* Conversations or Disconnected State */}
      {!connected ? (
        <SmartCard className="p-4 flex flex-col items-center justify-center text-center h-fit py-12 border-dashed border border-[var(--nc-border)]">
           <i className="ph-bold ph-whatsapp-logo text-4xl text-[var(--nc-text-dim)] mb-3 opacity-50"></i>
           <p className="text-sm text-[var(--nc-text-primary)] font-bold mb-1">{t.disconnected}</p>
           <p className="text-xs text-[var(--nc-text-dim)]">{t.configureWarning}</p>
        </SmartCard>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">{t.conversationsTitle} ({formatNumber(chats.length)})</h3>
            <button onClick={() => setShowNewChat(!showNewChat)} className="text-xs font-bold text-[var(--nc-accent)] hover:underline">
              + {t.newChatTitle}
            </button>
          </div>

          {showNewChat && (
            <div className="flex gap-2 mb-2">
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder={t.phonePlaceholder}
                className="flex-1 bg-[var(--nc-surface)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--nc-text-primary)] outline-none" />
              <button onClick={startNewChat} className="px-3 py-1.5 bg-[var(--nc-accent)] text-white text-xs font-bold rounded-lg">{t.startChatBtn}</button>
            </div>
          )}

          {chats.length === 0 && <p className="text-xs text-[var(--nc-text-dim)]">{t.emptyState}</p>}

          {chats.map(chat => (
            <div key={chat.id} className="relative">
              <div onClick={() => setActiveChatId(chat.id)}
                className={`p-3 rounded-xl cursor-pointer transition-colors ${chat.id === activeChatId ? 'bg-[var(--nc-accent-soft)]' : 'bg-[var(--nc-surface)] hover:bg-white/5'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--nc-text-primary)] flex items-center gap-2">
                    {displayContactName(chat)}
                    {getClassificationBadge(chat.leadPriority)}
                  </span>
                  <span className="text-[10px] text-[var(--nc-text-dim)]">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-[var(--nc-text-dim)] truncate flex-1">{chat.lastMessage || chat.contactPhone}</p>
                  <button onClick={(e) => { e.stopPropagation(); setTaskChatId(chat.id); setTaskTitle(""); setTaskType("Call"); }}
                    className="text-[var(--nc-accent)] hover:text-[var(--nc-accent-hover)] text-xs ml-1 shrink-0" title={t.createTask}>+</button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(chat.id); }}
                    disabled={isDeleting}
                    className="text-rose-400 hover:text-rose-300 text-xs ml-2 shrink-0">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
            <div className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-sm mx-4 space-y-4 shadow-2xl">
              <p className="text-sm text-[var(--nc-text-primary)] text-center">
                {t.deleteConfirm}
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => handleDelete(deleteConfirm)} disabled={isDeleting}
                  className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl disabled:opacity-50">
                  {isDeleting ? t.deleting : t.deleteBtn}
                </button>
                <button type="button" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}
                  className="flex-1 py-2 bg-[var(--nc-surface)] border border-white/10 text-[var(--nc-text-dim)] text-sm rounded-xl">
                  {t.cancelBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {taskChatId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setTaskChatId(null)} />
            <div className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-sm mx-4 space-y-4 shadow-2xl">
              <h3 className="text-sm font-bold text-[var(--nc-text-primary)] text-center">{t.createTask}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[var(--nc-text-dim)] mb-1">{t.taskTitleLabel}</label>
                  <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                    placeholder={t.taskTitleLabel}
                    className="w-full bg-[var(--nc-surface)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--nc-text-primary)] outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--nc-text-dim)] mb-1">{t.taskTypeLabel}</label>
                  <select value={taskType} onChange={e => setTaskType(e.target.value)}
                    className="w-full bg-[var(--nc-surface)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--nc-text-primary)] outline-none">
                    {Object.entries(t.taskTypes).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={handleCreateTask} disabled={isCreatingTask || !taskTitle.trim()}
                  className="flex-1 py-2 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white text-sm font-bold rounded-xl disabled:opacity-50">
                  {isCreatingTask ? "..." : t.createTaskBtn}
                </button>
                <button type="button" onClick={() => setTaskChatId(null)} disabled={isCreatingTask}
                  className="flex-1 py-2 bg-[var(--nc-surface)] border border-white/10 text-[var(--nc-text-dim)] text-sm rounded-xl">
                  {t.cancelBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="lg:col-span-2">
          <SmartCard className={`p-4 flex flex-col ${activeChat ? '' : 'h-fit'}`} style={activeChat ? { minHeight: "400px", maxHeight: "500px" } : {}}>
            {!activeChat ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--nc-text-dim)]">
                  <i className="ph-bold ph-chat-circle-dots text-3xl mb-2 opacity-50"></i>
                  <p className="text-sm">{t.emptyState}</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                  {activeChat.messages.length === 0 && (
                    <p className="text-xs text-[var(--nc-text-dim)] text-center">{t.emptyState}</p>
                  )}
                  {activeChat.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${msg.sender === "agent" ? 'bg-[var(--nc-accent)] text-white rounded-br-md' : 'bg-[var(--nc-surface-strong)] text-[var(--nc-text-primary)] rounded-bl-md'}`}>
                        {msg.text}
                        <div className={`text-[9px] mt-0.5 ${msg.sender === "agent" ? 'text-white/60' : 'text-[var(--nc-text-dim)]'}`}>{msg.time}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <input value={messageInput} onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder={t.inputPlaceholder}
                    disabled={isSending}
                    className="flex-1 bg-[var(--nc-surface)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--nc-text-primary)] outline-none disabled:opacity-50" />
                  <button onClick={handleSend} disabled={isSending || !messageInput.trim()}
                    className="px-4 py-2 bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors">
                    {isSending ? "..." : t.sendBtn}
                  </button>
                </div>
              </>
            )}
          </SmartCard>
        </div>
      </div>
      )}
    </div>
  );
}
