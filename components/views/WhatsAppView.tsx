// components/views/WhatsAppView.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
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
    title: "تكامل الواتساب والوكلاء الافتراضيين (WhatsApp CRM API)",
    subtitle: "اربط حساب الواتساب الخاص بـ {companyName} لتفعيل تتبع العملاء عبر الذكاء الاصطناعي على مدار الساعة.",
    connected: "القناة متصلة ونشطة",
    disconnected: "القناة غير متصلة حالياً",
    pairingTitle: "لوحة إقران الجهاز (Device Pairing)",
    pairingDesc: "قم بربط رقم جوال مبيعات الشركة بالمنصة. سيقوم الوكيل الذكي باستقبل رسائل العملاء العقاريين والرد الفوري عليها لضمان عدم ضياع أي صفقة.",
    pairingQrDesc: "امسح الكود عبر واتساب الجوال (Linked Devices)",
    connectedDevice: "الجهاز المرتبط:",
    connectedPhone: "الرقم المتصل:",
    activeAgentLabel: "وكيل الرد النشط:",
    aiAgentBadge: "مساعد (AI Chat Agent)",
    disconnectBtn: "فصل جوال المبيعات (Disconnect)",
    connectBtn: "ربط الجهاز ومحاكاة الاتصال (Link Device)",
    processing: "جاري المعالجة...",
    conversationsTitle: "المحادثات الحالية (المحاكي)",
    conversationsDesc: "اختر عميلاً لتجربة ردود الوكيل الافتراضي",
    activeChannelBadge: "قناة الواتساب النشطة",
    now: "الآن",
    agentTyping: "جاري صياغة الرد من الوكيل الذكي...",
    inputPlaceholder: "اكتب رسالة كأنك العميل (مثال: كم الأسعار؟ أو أين موقع الفلل؟)...",
    sendBtn: "إرسال",
    offlineWarning: "⚠️ يرجى ربط جوال المبيعات أولاً بالضغط على 'ربط الجهاز ومحاكاة الاتصال' لتفعيل محادثات الوكيل والرد التلقائي.",
    selectConversation: "الرجاء اختيار محادثة من القائمة للبدء",
  },
  EN: {
    title: "WhatsApp Integration & Virtual Agents (WhatsApp CRM API)",
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
    inputPlaceholder: "Type a message as the client (e.g. What are the rates? or Where is the project site?)...",
    sendBtn: "Send",
    offlineWarning: "⚠️ Please link the sales device first by clicking 'Link Device & Simulate Connection' to activate agent chat and auto-replies.",
    selectConversation: "Please select a conversation from the list to begin",
  }
};

export default function WhatsAppView({ initialChats, tenant }: WhatsAppViewProps) {
  const { theme, lang } = useApp();
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

  // توجيه المحادثة لأسفل تلقائياً عند وصول رسائل جديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isTyping]);

  // دالة تحويل الأرقام إلى الأرقام العربية الشرقية حسب اللغة النشطة
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (!isArabic) return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  // معالجة صياغة الوقت والتواريخ والملحقات
  const formatTimestamp = (timeStr: string) => {
    if (!timeStr) return "";
    if (timeStr === "الآن" || timeStr === "Now") {
      return t.now;
    }
    if (!isArabic) return timeStr;
    let converted = timeStr
      .replace(/AM/gi, "ص")
      .replace(/PM/gi, "م")
      .replace(/mins/gi, "دقائق")
      .replace(/min/gi, "دقيقة")
      .replace(/May/gi, "مايو")
      .replace(/June/gi, "يونيو")
      .replace(/July/gi, "يوليو")
      .replace(/April/gi, "أبريل");
    return toArabicNumerals(converted);
  };

  const handleConnectToggle = async () => {
    setLoadingAction(true);
    const newStatus = !connected;
    const result = await toggleWhatsAppConnectionAction(newStatus);
    setLoadingAction(false);
    if (result.success) {
      setConnected(newStatus);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChatId || isTyping) return;

    const userText = messageInput.trim();
    setMessageInput("");

    // 1. إضافة رسالة العميل للواجهة فوراً
    setChats(prevChats => 
      prevChats.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            lastMessage: userText,
            time: isArabic ? "الآن" : "Now",
            messages: [...c.messages, { sender: "client", text: userText, time: isArabic ? "الآن" : "Now" }]
          };
        }
        return c;
      })
    );

    // 2. تفعيل مؤشر الكتابة للوكيل الذكي
    setIsTyping(true);

    // محاكاة تأخير الكتابة الطبيعي للذكاء الاصطناعي (1.5 ثانية)
    setTimeout(async () => {
      const result = await sendMockWhatsAppMessageAction(activeChatId, userText);
      setIsTyping(false);

      if (result.success && result.agentMessage) {
        setChats(prevChats => 
          prevChats.map(c => {
            if (c.id === activeChatId) {
              return {
                ...c,
                lastMessage: result.agentMessage.text,
                time: isArabic ? "الآن" : "Now",
                messages: [...c.messages, { ...result.agentMessage, time: isArabic ? "الآن" : "Now" }]
              };
            }
            return c;
          })
        );
      }
    }, 1500);
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setChats(prevChats => 
      prevChats.map(c => c.id === chatId ? { ...c, unread: false } : c)
    );
  };

  return (
    <div className="nc-page nc-stack" dir={dir}>
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-text-secondary)] text-xs font-semibold mb-3">
          <i className="ph-bold ph-whatsapp-logo"></i> {t.activeChannelBadge}
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-[var(--nc-text-primary)] font-bold dark:text-white mb-2">
          {t.title}
        </h1>
        <p className="text-xs md:text-sm text-[var(--nc-text-dim)] font-medium dark:text-[var(--nc-text-dim)] font-medium">
          {t.subtitle.replace('{companyName}', tenant.companyName)}
        </p>
      </div>

      {/* Connection Panel */}
      <div className="bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6">
        <div className="space-y-3 lg:max-w-2xl">
          <h3 className="text-[var(--nc-text-primary)] font-bold dark:text-white font-bold text-base flex items-center gap-2">
            <i className={`ph-fill ph-circle text-xs ${connected ? 'text-emerald-500 animate-pulse' : 'text-[var(--nc-text-dim)] font-medium'}`}></i>
            {t.pairingTitle}
          </h3>
          <p className="text-xs text-[var(--nc-text-dim)] font-medium dark:text-[var(--nc-text-dim)] font-medium leading-relaxed">{t.pairingDesc}</p>
          
          {connected && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-[var(--nc-glass-border)] text-[var(--nc-text-dim)] font-medium dark:text-slate-450">
              <p><span className="font-semibold">{t.connectedDevice}</span> <span className="font-bold text-slate-850 dark:text-white">iPhone 15 Pro</span></p>
              <p><span className="font-semibold">{t.connectedPhone}</span> <span className="font-bold text-slate-850 dark:text-white font-en">+966 50 111 2222</span></p>
              <p><span className="font-semibold">{t.activeAgentLabel}</span> <span className="font-bold text-indigo-500">{t.aiAgentBadge}</span></p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 justify-center">
          {/* Simulated QR placeholder */}
          {!connected && (
            <div className="flex items-center gap-3 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] p-3 rounded-xl">
              <div className="w-14 h-14 bg-[var(--nc-surface-solid)] dark:bg-slate-700 flex items-center justify-center rounded-lg border border-slate-600 shrink-0">
                <i className="ph ph-qr-code text-white text-3xl opacity-80"></i>
              </div>
              <p className="text-[10px] text-[var(--nc-text-dim)] font-medium dark:text-[var(--nc-text-dim)] font-medium leading-snug">{t.pairingQrDesc}</p>
            </div>
          )}

          <button 
            onClick={handleConnectToggle}
            disabled={loadingAction}
            className={`px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer w-full sm:w-auto shadow-sm ${
              connected 
                ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 hover:border-transparent' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.01]'
            }`}
          >
            {loadingAction ? t.processing : (connected ? t.disconnectBtn : t.connectBtn)}
          </button>
        </div>
      </div>

      {/* Simulator Workspace */}
      {connected ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[500px]">
          
          {/* Left panel: chats list (4 cols) */}
          <div className="lg:col-span-4 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-2xl p-4 shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-[var(--nc-text-primary)] font-bold dark:text-white font-bold text-base">{t.conversationsTitle}</h3>
              <p className="text-[11px] text-slate-450 dark:text-[var(--nc-text-dim)] font-medium mt-0.5">{t.conversationsDesc}</p>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[400px] scrollbar-fade flex-grow">
              {chats.map(chat => {
                const isActive = activeChatId === chat.id;
                return (
                  <div 
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-start ${
                      isActive 
                        ? 'bg-[var(--nc-accent)]/5 border-[var(--nc-accent-border)]/40 shadow-sm' 
                        : 'bg-slate-50 dark:bg-[var(--nc-surface-solid)] border-[var(--nc-glass-border)] dark:border-slate-850 hover:border-slate-350 dark:hover:border-[var(--nc-glass-border)]'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between w-full">
                        <h4 className="font-bold text-xs text-[var(--nc-text-primary)] font-bold dark:text-white truncate">{chat.contactName}</h4>
                        <span className="text-[9px] text-[var(--nc-text-dim)] font-medium font-en shrink-0">{formatTimestamp(chat.time)}</span>
                      </div>
                      <p className="text-[11px] text-[var(--nc-text-dim)] font-medium dark:text-[var(--nc-text-dim)] font-medium truncate leading-snug">{chat.lastMessage}</p>
                    </div>
                    {chat.unread && (
                      <div className="w-2.5 h-2.5 bg-[var(--nc-accent)] rounded-full shrink-0 ml-2 mt-1"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: chat dialogue message pane (8 cols) */}
          <div className="lg:col-span-8 bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[450px]">
            {activeChat ? (
              <>
                {/* Chat header */}
                <div className="p-4 border-b border-[var(--nc-glass-border)] dark:border-[var(--nc-glass-border)] bg-slate-50/50 dark:bg-[var(--nc-surface-solid)]/10 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-[var(--nc-text-primary)] font-bold dark:text-white text-sm">{activeChat.contactName}</h4>
                    <p className="text-[10px] text-[var(--nc-text-dim)] font-medium dark:text-[var(--nc-text-dim)] font-medium font-mono tracking-wider">{activeChat.contactPhone}</p>
                  </div>
                  <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    {t.aiAgentBadge}
                  </span>
                </div>

                {/* Messages dialogue */}
                <div className="p-4 space-y-4 overflow-y-auto max-h-[350px] flex-grow scrollbar-fade bg-slate-50/20 dark:bg-[var(--nc-surface-solid)]/10 flex flex-col">
                  {activeChat.messages.map((m, idx) => {
                    const isAgent = m.sender === "agent";
                    return (
                      <div 
                        key={idx} 
                        className={`flex flex-col max-w-[80%] ${
                          isAgent 
                            ? 'self-start items-start' 
                            : 'self-end items-end'
                        } space-y-1`}
                      >
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                          isAgent 
                            ? 'bg-slate-100 dark:bg-[var(--nc-surface-solid)] text-slate-850 dark:text-slate-200 rounded-br-none' 
                            : 'bg-[var(--nc-accent)] text-white rounded-bl-none shadow-sm'
                        }`}>
                          {m.text}
                        </div>
                        <span className="text-[9px] text-[var(--nc-text-dim)] font-medium dark:text-[var(--nc-text-dim)] font-medium px-1 font-en">{formatTimestamp(m.time)}</span>
                      </div>
                    );
                  })}

                  {/* Typing simulation */}
                  {isTyping && (
                    <div className="self-start flex flex-col items-start space-y-1">
                      <div className="bg-slate-100 dark:bg-[var(--nc-surface-solid)] text-slate-450 dark:text-slate-450 p-2.5 rounded-2xl rounded-br-none text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce delay-100"></span>
                        <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce delay-200"></span>
                        <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce delay-300"></span>
                        <span className="ml-1 text-[10px] italic">{t.agentTyping}</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--nc-glass-border)] dark:border-[var(--nc-glass-border)] flex gap-3 bg-slate-50/40 dark:bg-[#151f32]">
                  <input 
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={isTyping}
                    placeholder={t.inputPlaceholder}
                    className="flex-grow rounded-xl bg-white dark:bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] dark:border-slate-850 px-4 py-3 text-xs text-[var(--nc-text-primary)] font-bold dark:text-white placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:border-[var(--nc-accent-border)]"
                  />
                  <button 
                    type="submit"
                    disabled={!messageInput.trim() || isTyping}
                    className="bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white px-5 py-3 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {t.sendBtn}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <i className="ph ph-chat-circle-dots text-4xl text-[var(--nc-text-dim)] font-medium dark:text-[var(--nc-text-dim)] font-medium mb-2"></i>
                <p className="text-slate-450 dark:text-[var(--nc-text-dim)] font-medium text-sm">{t.selectConversation}</p>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Disconnected State Warning */
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-6 rounded-2xl text-center text-sm font-semibold leading-relaxed max-w-3xl mx-auto space-y-3">
          <i className="ph ph-warning text-3xl block text-rose-500"></i>
          <p>{t.offlineWarning}</p>
        </div>
      )}

    </div>
  );
}
