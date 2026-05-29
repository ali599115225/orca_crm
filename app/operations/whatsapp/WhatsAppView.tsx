// app/operations/whatsapp/WhatsAppView.tsx
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
    connected: "القناة متصلة",
    disconnected: "القناة غير متصلة",
    pairingTitle: "لوحة إقران القناة (Device Pairing)",
    pairingDesc: "قم بربط رقم جوال مبيعات الشركة بالمنصة. سيقوم الوكيل الذكي باستقبال رسائل العملاء العقاريين والرد الفوري عليها لضمان عدم ضياع أي صفقة.",
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
    offlineWarning: "⚠️ يرجى ربط جوال المبيعات أولاً بالضغط على \"ربط الجهاز ومحاكاة الاتصال\" لتفعيل محادثات الوكيل.",
    selectConversation: "الرجاء اختيار محادثة من القائمة اليمنى للبدء",
  },
  EN: {
    title: "WhatsApp Integration & Virtual Agents (WhatsApp CRM API)",
    subtitle: "Connect the WhatsApp account for {companyName} to activate 24/7 AI-driven customer tracking.",
    connected: "Channel Connected",
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
    offlineWarning: "⚠️ Please link the sales device first by clicking 'Link Device & Simulate Connection' to activate agent chat.",
    selectConversation: "Please select a conversation from the list to begin",
  }
};

export default function WhatsAppView({ initialChats, tenant }: WhatsAppViewProps) {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

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
    if (lang === 'EN') return str;
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
    if (lang === 'EN') return timeStr;
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
            time: lang === 'AR' ? "الآن" : "Now",
            messages: [...c.messages, { sender: "client", text: userText, time: lang === 'AR' ? "الآن" : "Now" }]
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
                time: lang === 'AR' ? "الآن" : "Now",
                messages: [...c.messages, { ...result.agentMessage, time: lang === 'AR' ? "الآن" : "Now" }]
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

  const isDark = theme === 'dark';

  return (
    <div className={`whatsapp-page-wrapper calibri-strictly ${isDark ? 'dark-canvas' : 'light-canvas'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* خط كاليبري ونظام الألوان المزدوج المتسق لقناة الواتساب */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.cdnfonts.com/css/calibri');
        
        .calibri-strictly, .calibri-strictly * {
          font-family: 'Calibri', 'Calibri-Regular', 'Arial', sans-serif !important;
        }
        
        .whatsapp-page-wrapper {
          min-height: 100%;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        .frosted-glass-dark {
          background: rgba(11, 15, 25, 0.6) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
          border: 1px solid rgba(115, 83, 52, 0.35) !important; /* Polished Bronze border */
          box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.4) !important;
        }
        
        .milky-glass-light {
          background: rgba(255, 255, 255, 0.92) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.03) !important;
        }
        
        .bronze-glow-dark {
          border: 1px solid #735334 !important;
          box-shadow: 0 0 20px rgba(115, 83, 52, 0.35) !important;
        }
        
        .bronze-glow-light {
          border: 1px solid #735334 !important;
          box-shadow: 0 4px 20px rgba(115, 83, 52, 0.12) !important;
        }

        .dark-canvas {
          background-color: #0b0f19 !important;
          color: #ffffff !important;
        }
        
        .light-canvas {
          background-color: #f9f9fb !important;
          color: #0b0f19 !important;
        }
      `}} />

      {/* الترويسة الرئيسية */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 transition-all ${
        isDark ? 'frosted-glass-dark' : 'milky-glass-light'
      }`}>
        <div className={lang === 'AR' ? 'text-right' : 'text-left'}>
          <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.title}
          </h1>
          <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.subtitle.replace('{companyName}', tenant.companyName)}
          </p>
        </div>
        
        <div className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
          connected 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-slate-800/80 text-slate-400 border-slate-700'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
          {connected ? t.connected : t.disconnected}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* العمود الأيمن: التحكم بالاتصال وقناة الـ API (Device Pairing Control Widget) */}
        <div className={`p-6 rounded-2xl h-fit flex flex-col justify-between space-y-6 transition-all ${
          isDark ? 'frosted-glass-dark' : 'milky-glass-light'
        } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <div className="space-y-4">
            <h2 className={`text-sm font-black border-b pb-2 ${isDark ? 'text-[#E6C687] border-slate-850' : 'text-[#735334] border-slate-200'}`}>
              {t.pairingTitle}
            </h2>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {t.pairingDesc}
            </p>

            {!connected ? (
              /* وضع غير متصل: عرض كود QR وهمي تفاعلي للربط */
              <div className={`p-6 rounded-xl border border-dashed flex flex-col items-center justify-center space-y-4 relative overflow-hidden ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="absolute inset-0 bg-[#0b0f19]/30 backdrop-blur-[1px] flex items-center justify-center animate-pulse pointer-events-none"></div>
                <div className="w-40 h-40 bg-white p-2 rounded-lg shadow-md border flex items-center justify-center relative z-10">
                  <div className="w-full h-full bg-slate-900 rounded opacity-80 grid grid-cols-5 grid-rows-5 gap-1 p-2">
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                    <div className="bg-white rounded-sm"></div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 z-10">
                  {t.pairingQrDesc}
                </span>
              </div>
            ) : (
              /* وضع متصل: تفاصيل الجهاز النشط والاتصال بالـ API */
              <div className={`p-4 border rounded-xl space-y-3.5 transition-all ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-2">
                  <span className="text-slate-400">{t.connectedDevice}</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    iPhone {toArabicNumerals(15)} Pro Max
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-2">
                  <span className="text-slate-400">{t.connectedPhone}</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`} dir="ltr">
                    {toArabicNumerals("+966 55 751 6311")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{t.activeAgentLabel}</span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded text-[10px]">
                    {t.aiAgentBadge}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleConnectToggle}
            disabled={loadingAction}
            className={`w-full p-3 rounded-xl text-xs font-black transition-all cursor-pointer hover:scale-[1.01] ${
              connected 
                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20' 
                : 'bg-amber-500 text-slate-950 hover:bg-amber-600'
            }`}
          >
            {loadingAction 
              ? t.processing 
              : connected 
                ? t.disconnectBtn 
                : t.connectBtn}
          </button>
        </div>

        {/* كابينة المحادثة المدمجة 3 أعمدة ( simulated chat and window workspace ) */}
        <div className={`lg:col-span-2 rounded-2xl border overflow-hidden flex flex-col md:flex-row h-[550px] transition-all ${
          isDark ? 'frosted-glass-dark' : 'milky-glass-light'
        }`}>
          
          {/* العمود الثاني: قائمة المحادثات (Current Simulated Chat Threads Feed - 35%) */}
          <div className={`w-full md:w-[35%] flex flex-col ${
            lang === 'AR' ? 'border-l border-l-white/5' : 'border-r border-r-slate-200'
          } ${isDark ? 'bg-slate-950/40' : 'bg-slate-50/50'}`}>
            <div className={`p-4 border-b ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200'} ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
              <h3 className={`text-xs font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {t.conversationsTitle}
              </h3>
              <p className="text-[9px] text-slate-400 mt-0.5 font-bold">{t.conversationsDesc}</p>
            </div>
            
            <div className={`flex-1 overflow-y-auto divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {chats.map(chat => {
                const isActive = activeChatId === chat.id;
                return (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={`w-full p-4 flex items-center justify-between transition-all cursor-pointer ${
                      lang === 'AR' ? 'text-right' : 'text-left'
                    } ${
                      isActive 
                        ? (isDark 
                            ? `bg-slate-900/60 border-[#735334] ${lang === 'AR' ? 'border-r-4' : 'border-l-4'}` 
                            : `bg-white border-[#735334] ${lang === 'AR' ? 'border-r-4' : 'border-l-4'}`) 
                        : (isDark ? 'hover:bg-slate-900/30' : 'hover:bg-slate-100/60')
                    }`}
                  >
                    <div className="space-y-1 overflow-hidden flex-1 pl-2">
                      <div className="flex justify-between items-baseline">
                        <h4 className={`text-xs font-black ${isActive ? 'text-amber-500' : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
                          {chat.contactName}
                        </h4>
                        <span className="text-[8px] text-slate-400 shrink-0 font-bold">
                          {formatTimestamp(chat.time)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate font-semibold">{chat.lastMessage}</p>
                    </div>
                    {chat.unread && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* العمود الثالث: نافذة المحادثة النشطة (Active Workspace Chat Screen - 65%) */}
          <div className={`flex-1 flex flex-col justify-between relative ${
            isDark ? 'bg-[#090d16]' : 'bg-slate-100/50'
          }`}>
            {activeChat ? (
              <>
                {/* رأس المحادثة والعميل النشط */}
                <div className={`p-4 border-b flex items-center justify-between ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200'
                } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                  <div>
                    <h3 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {activeChat.contactName}
                    </h3>
                    <p className={`text-[9px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`} dir="ltr">
                      {toArabicNumerals(activeChat.contactPhone)}
                    </p>
                  </div>
                  
                  <span className={`text-[8px] px-2.5 py-0.5 rounded-full font-black border ${
                    isDark 
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                      : 'bg-[#735334]/15 text-[#735334] border-[#735334]/20'
                  }`}>
                    {t.activeChannelBadge}
                  </span>
                </div>

                {/* منطقة الرسائل والفقاعات الملونة */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {activeChat.messages.map((msg, index) => {
                    const isClient = msg.sender === 'client';
                    return (
                      <div 
                        key={index}
                        className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}
                      >
                        <div 
                          className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isClient 
                              ? 'bg-emerald-600/90 text-white rounded-tr-none' 
                              : (isDark 
                                  ? 'bg-slate-900 border border-slate-850 text-slate-100 rounded-tl-none' 
                                  : 'bg-[#fdfbf7] border border-slate-200 text-slate-800 rounded-tl-none')
                          }`}
                        >
                          <p className="font-semibold">{msg.text}</p>
                          <span className={`block text-[8px] mt-1 text-right font-bold ${
                            isClient ? 'text-emerald-100' : 'text-slate-400'
                          }`}>
                            {formatTimestamp(msg.time)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* مؤشر الكتابة التفاعلي للوكيل الذكي */}
                  {isTyping && (
                    <div className="flex justify-end animate-pulse">
                      <div className={`p-3.5 rounded-2xl rounded-tl-none text-[10px] shadow-sm flex items-center gap-2.5 font-bold ${
                        isDark ? 'bg-slate-900 text-slate-400' : 'bg-[#fdfbf7] text-slate-600'
                      }`}>
                        <span className="flex gap-0.5">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </span>
                        <span>{t.agentTyping}</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* صندوق مدخلات الرسائل */}
                <div className={`p-4 border-t ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200'}`}>
                  {connected ? (
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={t.inputPlaceholder}
                        className={`flex-1 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#735334] ${
                          isDark 
                            ? 'bg-slate-950 border border-slate-800 text-white' 
                            : 'bg-slate-50 border border-slate-200 text-slate-900'
                        }`}
                        disabled={isTyping}
                      />
                      <button
                        type="submit"
                        disabled={!messageInput.trim() || isTyping}
                        className={`px-5 py-3 rounded-xl text-xs font-black transition-all cursor-pointer text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed ${
                          isDark ? 'bg-amber-500 hover:bg-amber-600' : 'bg-amber-500 hover:bg-amber-600'
                        }`}
                      >
                        {t.sendBtn}
                      </button>
                    </form>
                  ) : (
                    <div className="text-center p-2 text-xs text-slate-400 font-bold leading-normal">
                      {t.offlineWarning}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-450 font-bold">
                {t.selectConversation}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
