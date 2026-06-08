// components/views/WhatsAppView.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";

import PageHeader from '@/components/ui/PageHeader';
import { SmartCard } from '@/components/ui/SmartCard';
import { toggleWhatsAppConnectionAction, sendMockWhatsAppMessageAction } from "@/app/actions/whatsapp";
import { useApp } from "@/app/context/AppContext";

interface Message {
  sender: string;
  text: string;
  time: string;
}

interface Chat {
  id: string;
  contactName: string;
  contactPhone: string;
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
}

const TRANSLATIONS = {
  AR: {
    title: "تكامل الواتساب والوكلاء الافتراضيين",
    subtitle: "اربط حساب الواتساب الخاص بـ {companyName} لتفعيل تتبع العملاء عبر الذكاء الاصطناعي على مدار الساعة.",
    connected: "القناة متصلة ونشطة",
    disconnected: "القناة غير متصلة حالياً",
    pairingTitle: "لوحة إقران الجهاز",
    pairingDesc: "قم بربط رقم جوال مبيعات الشركة بالمنصة. سيقوم الوكيل الذكي باستقبال رسائل العملاء والرد الفوري عليها لضمان عدم ضياع أي صفقة.",
    pairingQrDesc: "امسح الكود عبر واتساب الجوال (Linked Devices)",
    connectedDevice: "الجهاز المرتبط:",
    connectedPhone: "الرقم المتصل:",
    activeAgentLabel: "وكيل الرد النشط:",
    aiAgentBadge: "مساعد (AI Chat Agent)",
    disconnectBtn: "فصل جوال المبيعات",
    connectBtn: "ربط الجهاز ومحاكاة الاتصال",
    processing: "جاري المعالجة...",
    conversationsTitle: "المحادثات الحالية",
    conversationsDesc: "اختر عميلاً لتجربة ردود الوكيل الافتراضي",
    activeChannelBadge: "قناة الواتساب النشطة",
    now: "الآن",
    agentTyping: "جاري صياغة الرد من الوكيل الذكي...",
    inputPlaceholder: "اكتب رسالة كأنك العميل (مثال: كم الأسعار؟)...",
    sendBtn: "إرسال",
    offlineWarning: "يرجى ربط جوال المبيعات أولاً بالضغط على 'ربط الجهاز' لتفعيل محادثات الوكيل والرد التلقائي.",
    selectConversation: "الرجاء اختيار محادثة من القائمة للبدء",
  },
  EN: {
    title: "WhatsApp Integration & Virtual Agents",
    subtitle: "Connect the WhatsApp account for {companyName} to activate 24/7 AI-driven customer tracking.",
    connected: "Channel Connected & Active",
    disconnected: "Channel Disconnected",
    pairingTitle: "Device Pairing Panel",
    pairingDesc: "Link your sales mobile number to the platform. The Smart Agent will ingest customer messages and reply instantly, ensuring no deal is lost.",
    pairingQrDesc: "Scan the code via WhatsApp mobile (Linked Devices)",
    connectedDevice: "Linked Device:",
    connectedPhone: "Connected Number:",
    activeAgentLabel: "Active Response Agent:",
    aiAgentBadge: "Assistant (AI Chat Agent)",
    disconnectBtn: "Disconnect Sales Mobile",
    connectBtn: "Link Device & Simulate Connection",
    processing: "Processing...",
    conversationsTitle: "Current Chats (Simulator)",
    conversationsDesc: "Select a client to test virtual agent responses",
    activeChannelBadge: "Active WhatsApp Channel",
    now: "Now",
    agentTyping: "AI Smart Agent is drafting response...",
    inputPlaceholder: "Type a message as the client (e.g. What are the rates?)...",
    sendBtn: "Send",
    offlineWarning: "Please link the sales device first by clicking 'Link Device' to activate agent chat and auto-replies.",
    selectConversation: "Please select a conversation from the list to begin",
  }
};

export default function WhatsAppView({ initialChats, tenant }: WhatsAppViewProps) {
  const { lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isArabic = lang === "AR";
  const dir = isArabic ? "rtl" : "ltr";

  const [connected, setConnected] = useState(tenant.whatsappConnected);
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChats[0]?.id || null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChat = chats.find(c => c.id === activeChatId) || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isTyping]);

  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (!isArabic) return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  const formatTimestamp = (timeStr: string) => {
    if (!timeStr) return "";
    if (timeStr === "الآن" || timeStr === "Now") return t.now;
    if (!isArabic) return timeStr;
    return toArabicNumerals(
      timeStr
        .replace(/AM/gi, "ص").replace(/PM/gi, "م")
        .replace(/mins/gi, "دقائق").replace(/min/gi, "دقيقة")
        .replace(/May/gi, "مايو").replace(/June/gi, "يونيو")
        .replace(/July/gi, "يوليو").replace(/April/gi, "أبريل")
    );
  };

  const handleConnectToggle = async () => {
    setLoadingAction(true);
    const newStatus = !connected;
    const result = await toggleWhatsAppConnectionAction(newStatus);
    setLoadingAction(false);
    if (result.success) setConnected(newStatus);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChatId || isTyping) return;

    const userText = messageInput.trim();
    setMessageInput("");

    setChats(prev =>
      prev.map(c => c.id === activeChatId
        ? { ...c, lastMessage: userText, time: isArabic ? "الآن" : "Now", messages: [...c.messages, { sender: "client", text: userText, time: isArabic ? "الآن" : "Now" }] }
        : c
      )
    );

    setIsTyping(true);
    setTimeout(async () => {
      const result = await sendMockWhatsAppMessageAction(activeChatId, userText);
      setIsTyping(false);
      if (result.success && result.agentMessage) {
        setChats(prev =>
          prev.map(c => c.id === activeChatId
            ? { ...c, lastMessage: result.agentMessage.text, time: isArabic ? "الآن" : "Now", messages: [...c.messages, { ...result.agentMessage, time: isArabic ? "الآن" : "Now" }] }
            : c
          )
        );
      }
    }, 1500);
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread: false } : c));
  };

  return (
    <div className="space-y-5 p-6" dir={dir}>

      {/* ── Page Header ─────────────────────────────────── */}
      <PageHeader
        title={t.title}
        description={t.subtitle.replace('{companyName}', tenant.companyName)}
      />

      {/* ── Connection / Pairing Panel ───────────────────── */}
      <SmartCard className="p-5 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6">
        <div className="space-y-3 lg:max-w-2xl">
          <h3 className="text-[var(--nc-foreground)] font-bold text-base flex items-center gap-2">
            <i className={`ph-fill ph-circle text-xs ${connected ? 'text-emerald-500 animate-pulse' : 'text-[var(--nc-foreground-muted)]'}`}></i>
            {t.pairingTitle}
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ml-1 ${
              connected
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}>
              {connected ? t.connected : t.disconnected}
            </span>
          </h3>
          <p className="text-xs text-[var(--nc-foreground-muted)] leading-relaxed">{t.pairingDesc}</p>

          {connected && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-[var(--nc-border)] text-[var(--nc-foreground-muted)]">
              <p><span className="font-semibold">{t.connectedDevice}</span> <span className="font-bold text-[var(--nc-foreground)]">iPhone 15 Pro</span></p>
              <p><span className="font-semibold">{t.connectedPhone}</span> <span className="font-bold text-[var(--nc-foreground)] font-en">+966 50 111 2222</span></p>
              <p><span className="font-semibold">{t.activeAgentLabel}</span> <span className="font-bold text-indigo-500">{t.aiAgentBadge}</span></p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 justify-center">
          {!connected && (
            <div className="flex items-center gap-3 bg-[var(--nc-surface)] border border-[var(--nc-border)] p-3 rounded-xl">
              <div className="w-14 h-14 bg-[var(--nc-surface-strong)] flex items-center justify-center rounded-lg border border-[var(--nc-border)] shrink-0">
                <i className="ph ph-qr-code text-[var(--nc-foreground-muted)] text-3xl opacity-80"></i>
              </div>
              <p className="text-[10px] text-[var(--nc-foreground-muted)] leading-snug">{t.pairingQrDesc}</p>
            </div>
          )}

          <button
            onClick={handleConnectToggle}
            disabled={loadingAction}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer w-full sm:w-auto shadow-sm ${
              connected
                ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 hover:border-transparent'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.01]'
            }`}
          >
            {loadingAction ? t.processing : (connected ? t.disconnectBtn : t.connectBtn)}
          </button>
        </div>
      </SmartCard>

      {/* ── Simulator Workspace ──────────────────────────── */}
      {connected ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[500px]">

          {/* Left: Chats List */}
          <SmartCard className="lg:col-span-4 p-4 flex flex-col gap-4">
            <div>
              <h3 className="text-[var(--nc-foreground)] font-bold text-sm">{t.conversationsTitle}</h3>
              <p className="text-[11px] text-[var(--nc-foreground-muted)] mt-0.5">{t.conversationsDesc}</p>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[400px] flex-grow">
              {chats.map(chat => {
                const isActive = activeChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-start ${
                      isActive
                        ? 'bg-[var(--nc-accent-soft)] border-[var(--nc-accent-border)] shadow-sm'
                        : 'bg-[var(--nc-surface)] border-[var(--nc-border)] hover:border-[var(--nc-accent-border)]'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between w-full">
                        <h4 className="font-bold text-xs text-[var(--nc-foreground)] truncate">{chat.contactName}</h4>
                        <span className="text-[9px] text-[var(--nc-foreground-muted)] font-en shrink-0">{formatTimestamp(chat.time)}</span>
                      </div>
                      <p className="text-[11px] text-[var(--nc-foreground-muted)] truncate leading-snug">{chat.lastMessage}</p>
                    </div>
                    {chat.unread && (
                      <div className="w-2.5 h-2.5 bg-[var(--nc-accent)] rounded-full shrink-0 ml-2 mt-1"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </SmartCard>

          {/* Right: Chat Window */}
          <SmartCard className="lg:col-span-8 p-0 flex flex-col overflow-hidden min-h-[450px]">
            {activeChat ? (
              <>
                {/* Chat header */}
                <div className="px-4 py-3 border-b border-[var(--nc-border)] bg-[var(--nc-surface)]/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] flex items-center justify-center">
                      <i className="ph-bold ph-user text-[var(--nc-accent)] text-sm"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--nc-foreground)] text-sm leading-tight">{activeChat.contactName}</h4>
                      <p className="text-[10px] text-[var(--nc-foreground-muted)] font-mono tracking-wider">{activeChat.contactPhone}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    {t.aiAgentBadge}
                  </span>
                </div>

                {/* Messages */}
                <div className="p-4 space-y-4 overflow-y-auto max-h-[350px] flex-grow bg-[var(--nc-surface)]/20 flex flex-col">
                  {activeChat.messages.map((m, idx) => {
                    const isAgent = m.sender === "agent";
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[80%] ${isAgent ? 'self-start items-start' : 'self-end items-end'} space-y-1`}
                      >
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                          isAgent
                            ? 'bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)] rounded-br-none border border-[var(--nc-border)]'
                            : 'bg-[var(--nc-accent)] text-white rounded-bl-none shadow-sm'
                        }`}>
                          {m.text}
                        </div>
                        <span className="text-[9px] text-[var(--nc-foreground-muted)] px-1 font-en">{formatTimestamp(m.time)}</span>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="self-start flex flex-col items-start space-y-1">
                      <div className="bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] text-[var(--nc-foreground-muted)] p-2.5 rounded-2xl rounded-br-none text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-[var(--nc-foreground-muted)] rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></span>
                        <span className="w-1.5 h-1.5 bg-[var(--nc-foreground-muted)] rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></span>
                        <span className="w-1.5 h-1.5 bg-[var(--nc-foreground-muted)] rounded-full animate-bounce" style={{animationDelay:'0.3s'}}></span>
                        <span className="ml-1 text-[10px] italic">{t.agentTyping}</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--nc-border)] flex gap-3 bg-[var(--nc-surface-strong)]">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={isTyping}
                    placeholder={t.inputPlaceholder}
                    className="flex-grow rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] px-4 py-2.5 text-xs text-[var(--nc-foreground)] placeholder:text-[var(--nc-foreground-muted)] focus:outline-none focus:border-[var(--nc-accent)] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || isTyping}
                    className="bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <i className="ph-bold ph-paper-plane-tilt text-sm"></i>
                    {t.sendBtn}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <i className="ph ph-chat-circle-dots text-4xl text-[var(--nc-foreground-muted)] mb-3 opacity-50"></i>
                <p className="text-[var(--nc-foreground-muted)] text-sm">{t.selectConversation}</p>
              </div>
            )}
          </SmartCard>

        </div>
      ) : (
        /* Disconnected Warning */
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-6 rounded-2xl text-center text-sm font-semibold leading-relaxed max-w-3xl mx-auto space-y-3">
          <i className="ph ph-warning-circle text-3xl block"></i>
          <p>{t.offlineWarning}</p>
        </div>
      )}

    </div>
  );
}
