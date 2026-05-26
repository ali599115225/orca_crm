// app/operations/whatsapp/WhatsAppView.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { toggleWhatsAppConnectionAction, sendMockWhatsAppMessageAction } from "@/app/actions/whatsapp";

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

export default function WhatsAppView({ initialChats, tenant }: WhatsAppViewProps) {
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
            time: "الآن",
            messages: [...c.messages, { sender: "client", text: userText, time: "الآن" }]
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
                time: "الآن",
                messages: [...c.messages, result.agentMessage]
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
    <div className="space-y-6" dir="rtl">
      {/* الهيدر الترحيبي والتوضيحي */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">تكامل الواتساب والوكلاء الافتراضيين (WhatsApp CRM API)</h1>
          <p className="text-gray-500 text-xs mt-1">
            اربط حساب الواتساب الخاص بـ <span className="font-bold text-amber-500">{tenant.companyName}</span> لتفعيل متابعة العملاء عبر الذكاء الاصطناعي 24/7.
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${connected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
          {connected ? "القناة متصلة" : "القناة غير متصلة"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* العمود الأيمن: التحكم بالاتصال وقناة الـ API */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b pb-2">لوحة إقران القناة (Device Pairing)</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              قم بربط رقم جوال مبيعات الشركة بالمنصة. سيقوم **الوكيل الذكي** باستقبال رسائل العملاء العقاريين والرد الفوري عليها لضمان عدم ضياع أي صفقة.
            </p>

            {!connected ? (
              /* وضع غير متصل: عرض كود QR وهمي تفاعلي */
              <div className="p-6 bg-slate-55 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] flex items-center justify-center animate-pulse pointer-events-none"></div>
                <div className="w-40 h-40 bg-white p-2 rounded-lg shadow-md border flex items-center justify-center relative z-10">
                  {/* كود QR تمثيلي مصمم بالـ CSS */}
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
                <span className="text-[10px] font-bold text-slate-500 z-10">امسح الكود عبر واتساب الجوال (Linked Devices)</span>
              </div>
            ) : (
              /* وضع متصل: تفاصيل الجهاز النشط */
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-emerald-500/5 pb-2">
                  <span className="text-slate-500">الجهاز المرتبط:</span>
                  <span className="font-bold text-slate-800">iPhone 15 Pro Max (مبيعات الرياض)</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-emerald-500/5 pb-2">
                  <span className="text-slate-500">الرقم المتصل:</span>
                  <span className="font-bold text-slate-800" dir="ltr">+966 55 751 6311</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">وكيل الرد النشط:</span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">مساعد (AI Chat Agent)</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleConnectToggle}
            disabled={loadingAction}
            className={`w-full p-3 rounded-xl text-xs font-black transition-all cursor-pointer hover:scale-[1.01] ${connected ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            {loadingAction ? "جاري المعالجة..." : connected ? "فصل جوال المبيعات (Disconnect)" : "ربط الجهاز ومحاكاة الاتصال (Link Device)"}
          </button>
        </div>

        {/* العمود الأيسر: محاكي المحادثات والوكيل الافتراضي */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-[550px]">
          
          {/* قائمة المحادثات (35%) */}
          <div className="w-full md:w-[35%] border-l flex flex-col bg-slate-50">
            <div className="p-4 border-b bg-white">
              <h3 className="text-xs font-bold text-slate-800">المحادثات الحالية (المحاكي)</h3>
              <p className="text-[9px] text-gray-400 mt-0.5">اختر عميلاً لتجربة ردود الوكيل الافتراضي</p>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y">
              {chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`w-full p-4 text-right flex items-center justify-between transition-all cursor-pointer ${activeChatId === chat.id ? 'bg-white border-r-4 border-amber-500' : 'hover:bg-slate-100/60'}`}
                >
                  <div className="space-y-1 overflow-hidden flex-1 pl-2">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{chat.contactName}</h4>
                      <span className="text-[8px] text-slate-400 shrink-0">{chat.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{chat.lastMessage}</p>
                  </div>
                  {chat.unread && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* محتوى المحادثة (65%) */}
          <div className="flex-1 flex flex-col justify-between bg-slate-100 relative">
            {activeChat ? (
              <>
                {/* هيدر العميل النشط */}
                <div className="p-4 bg-white border-b flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">{activeChat.contactName}</h3>
                    <p className="text-[9px] text-slate-400" dir="ltr">{activeChat.contactPhone}</p>
                  </div>
                  <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[8px] px-2 py-0.5 rounded-full font-bold">
                    قناة الواتساب النشطة
                  </span>
                </div>

                {/* منطقة الرسائل */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {activeChat.messages.map((msg, index) => (
                    <div 
                      key={index}
                      className={`flex ${msg.sender === 'client' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div 
                        className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${msg.sender === 'client' ? 'bg-emerald-500 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}
                      >
                        <p>{msg.text}</p>
                        <span className={`block text-[8px] mt-1 text-right ${msg.sender === 'client' ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* مؤشر الكتابة التفاعلي للذكاء الاصطناعي */}
                  {isTyping && (
                    <div className="flex justify-end">
                      <div className="bg-white text-slate-500 p-3 rounded-2xl rounded-tl-none text-[10px] shadow-sm flex items-center gap-1.5 font-bold">
                        <span className="flex gap-0.5">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </span>
                        <span>جاري صياغة الرد من الوكيل الذكي...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* صندوق الكتابة */}
                <div className="p-4 bg-white border-t">
                  {connected ? (
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="اكتب رسالة كأنك العميل (مثال: كم الأسعار؟ أو أين موقع الفلل؟)..."
                        className="flex-1 bg-slate-50 border rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        disabled={isTyping}
                      />
                      <button
                        type="submit"
                        disabled={!messageInput.trim() || isTyping}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        إرسال
                      </button>
                    </form>
                  ) : (
                    <div className="text-center p-2 text-xs text-slate-400 font-bold">
                      ⚠️ يرجى ربط جوال المبيعات أولاً بالضغط على "ربط الجهاز" لتفعيل محادثات الوكيل.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-bold">
                الرجاء اختيار محادثة من القائمة اليمنى للبدء
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
