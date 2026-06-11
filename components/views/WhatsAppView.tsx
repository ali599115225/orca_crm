// components/views/WhatsAppView.tsx
"use client";
import React, { useState, useRef } from "react";

import PageHeader from '@/components/ui/PageHeader';
import { SmartCard } from '@/components/ui/SmartCard';
import { toggleWhatsAppConnectionAction, sendWhatsAppMessageAction } from "@/app/actions/whatsapp";
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
  cloudStatus: any;
  warning: string | null;
}

const TRANSLATIONS = {
  AR: {
    title: "WhatsApp Cloud API v3",
    subtitle: "Meta Cloud API v25.0 — {companyName}",
    connected: "متصل",
    disconnected: "غير متصل",
    cloudApiLabel: "Cloud API",
    phoneNumberLabel: "Phone Number ID",
    wabaLabel: "WABA ID",
    provider: "Meta Cloud API v25.0",
    conversationsTitle: "المحادثات",
    emptyState: "لا توجد محادثات بعد. أرسل رسالة من واتساب إلى رقم الأعمال لبدء محادثة.",
    newChatTitle: "محادثة جديدة",
    phonePlaceholder: "أدخل رقم الهاتف (مثال: 966501234567)",
    startChatBtn: "بدء المحادثة",
    now: "الآن",
    inputPlaceholder: "اكتب رسالة...",
    sendBtn: "إرسال",
    selectConversation: "اختر محادثة من القائمة",
    configureWarning: "WhatsApp Cloud API غير مفعل. أضف WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID في Vercel.",
  },
  EN: {
    title: "WhatsApp Cloud API",
    subtitle: "Meta Cloud API — {companyName}",
    connected: "Connected",
    disconnected: "Disconnected",
    cloudApiLabel: "Cloud API",
    phoneNumberLabel: "Phone Number ID",
    wabaLabel: "WABA ID",
    provider: "Meta Cloud API v25.0",
    conversationsTitle: "Conversations",
    emptyState: "No conversations yet. Send a WhatsApp message to the business number to start.",
    newChatTitle: "New Chat",
    phonePlaceholder: "Enter phone number (e.g. 966501234567)",
    startChatBtn: "Start Chat",
    now: "Now",
    inputPlaceholder: "Type a message...",
    sendBtn: "Send",
    selectConversation: "Select a conversation",
    configureWarning: "WhatsApp Cloud API is not configured. Add WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID in Vercel.",
  }
};

export default function WhatsAppView({ initialChats, tenant, cloudStatus, warning }: WhatsAppViewProps) {
  const { lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isArabic = lang === "AR";
  const dir = isArabic ? "rtl" : "ltr";

  const connected = cloudStatus?.configured && cloudStatus?.status === "connected";
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChats[0]?.id || null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      <PageHeader title={t.title} description={t.subtitle.replace("{companyName}", tenant.companyName)} />

      {/* Cloud API Status */}
      <SmartCard className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-sm font-bold text-[var(--nc-text-primary)]">
              {t.provider} — {connected ? t.connected : t.disconnected}
            </span>
          </div>
          {cloudStatus?.phoneNumberId && (
            <span className="text-xs text-[var(--nc-text-dim)]">{t.phoneNumberLabel}: {cloudStatus.phoneNumberId}</span>
          )}
          {cloudStatus?.businessAccountId && (
            <span className="text-xs text-[var(--nc-text-dim)]">{t.wabaLabel}: {cloudStatus.businessAccountId}</span>
          )}
        </div>
      </SmartCard>

      {warning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-400">{warning}</div>
      )}

      {/* Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">{t.conversationsTitle} ({chats.length})</h3>
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
            <div key={chat.id} onClick={() => setActiveChatId(chat.id)}
              className={`p-3 rounded-xl cursor-pointer transition-colors ${chat.id === activeChatId ? 'bg-[var(--nc-accent-soft)]' : 'bg-[var(--nc-surface)] hover:bg-white/5'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--nc-text-primary)]">{chat.contactName}</span>
                <span className="text-[10px] text-[var(--nc-text-dim)]">{chat.time}</span>
              </div>
              <p className="text-xs text-[var(--nc-text-dim)] truncate mt-1">{chat.lastMessage || chat.contactPhone}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          <SmartCard className="p-4 flex flex-col" style={{ minHeight: "400px", maxHeight: "500px" }}>
            {!activeChat ? (
              <div className="flex-1 flex items-center justify-center text-sm text-[var(--nc-text-dim)]">{t.selectConversation}</div>
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
    </div>
  );
}
