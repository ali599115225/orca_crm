// components/views/HelpdeskView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createTicketAction, closeTicketAction } from '@/app/actions/helpdesk';
import { useApp } from '@/app/context/AppContext';
import { SmartCard } from '@/components/ui/SmartCard';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  aiResponse: string | null;
  createdAt: Date | string;
}

interface Reply {
  id: string;
  message: string;
  sender: 'CLIENT' | 'SUPPORT' | 'AI';
  createdAt: string;
}

interface HelpdeskViewProps {
  initialTickets: Ticket[];
  tenantName: string;
}

const TRANSLATIONS = {
  AR: {
    title: "مركز الدعم والمساعدة الفنية",
    subtitle: "تلقي الدعم الفني الفوري وفتح تذاكر الاستفسارات والصيانة لعملياتك العقارية.",
    badgeText: "مركز الدعم الفني الذكي",
    openTicket: "فتح تذكرة دعم جديدة",
    openTicketSub: "سيقوم الوكيل مساعد بالرد عليك تلقائياً فور الإرسال",
    subjectLabel: "موضوع الاستفسار / المشكلة *",
    subjectPlaceholder: "مثال: استفسار عن ربط الدومين المخصص",
    detailsLabel: "الشرح والتفاصيل *",
    detailsPlaceholder: "اكتب تفاصيل استفسارك هنا...",
    submitBtn: "✉️ إرسال التذكرة للوكيل مساعد",
    submittingBtn: "جاري الإرسال ومراجعة الوكيل...",
    totalTickets: "إجمالي {count} تذاكر",
    emptyStateLeft: "لا توجد بلاغات صيانة أو طلبات تشغيل مسجلة حالياً.",
    statusActive: "نشطة",
    statusClosed: "مغلقة",
    ticketDate: "تاريخ: {date}",
    aiResponded: "🤖 تم الرد",
    closeTicketBtn: "إغلاق التذكرة ✕",
    authorLabel: "شرح المطور:",
    aiAgentLabel: "رد الوكيل الفني الذكي (مساعد):",
    tenantLabel: "مستأجر المنصة: {tenantName} | ID: #{id}",
    emptyStateRightTitle: "اختر تذكرة لمشاهدة التفاصيل",
    emptyStateRightDesc: "ستظهر تذاكر الدعم والرد الفوري للوكيل مساعد هنا",
    successMsg: "تم إرسال تذكرتك بنجاح وتلقي رد فوري من الوكيل مساعد!",
    errorMsg: "حدث خطأ أثناء إرسال التذكرة.",
    ledgerTitle: "سجل التذاكر والاستفسارات",
    slaLabel: "مؤشر الاستجابة SLA:",
    slaMet: "تم الالتزام بـ SLA ✅",
    slaActive: "قيد المتابعة - متبقي {time}",
    replyPlaceholder: "اكتب رداً للمتابعة الفنية...",
    sendReplyBtn: "إرسال الرد",
  },
  EN: {
    title: "Support Helpdesk Hub",
    subtitle: "Submit support tickets and receive immediate AI technical assistance.",
    badgeText: "Technical Support Desk",
    openTicket: "Open Support Ticket",
    openTicketSub: "The AI assistant will respond to you automatically upon submission",
    subjectLabel: "Subject / Issue *",
    subjectPlaceholder: "e.g., Inquiring about custom domain integration",
    detailsLabel: "Explanation & Details *",
    detailsPlaceholder: "Enter your inquiry details here...",
    submitBtn: "✉️ Send Ticket to AI Assistant",
    submittingBtn: "Sending & consulting agent...",
    totalTickets: "Total {count} tickets",
    emptyStateLeft: "No previous support tickets found.",
    statusActive: "Active",
    statusClosed: "Closed",
    ticketDate: "Date: {date}",
    aiResponded: "🤖 Responded",
    closeTicketBtn: "Close Ticket ✕",
    authorLabel: "Author Details:",
    aiAgentLabel: "Smart Technical Agent Response (Assistant):",
    tenantLabel: "Platform Tenant: {tenantName} | ID: #{id}",
    emptyStateRightTitle: "Select a ticket to view details",
    emptyStateRightDesc: "Support tickets and immediate agent responses will appear here",
    successMsg: "Your ticket was sent successfully!",
    errorMsg: "An error occurred while sending the ticket.",
    ledgerTitle: "Support Tickets Ledger",
    slaLabel: "SLA Response Indicator:",
    slaMet: "SLA Compliant ✅",
    slaActive: "In Progress - {time} left",
    replyPlaceholder: "Type a follow-up reply...",
    sendReplyBtn: "Send Reply",
  }
};

export default function HelpdeskView({ initialTickets, tenantName }: HelpdeskViewProps) {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';

  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Custom replies timeline
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // SLA timers
  const [slaCountdown, setSlaCountdown] = useState<string>('');

  // Fetch ticket replies when a ticket is selected
  useEffect(() => {
    if (!selectedTicket) return;
    
    // Load replies from api
    const loadReplies = async () => {
      try {
        const res = await fetch(`/api/v1/support/tickets/${selectedTicket.id}/reply`);
        const json = await res.json();
        if (json.success) {
          setReplies(json.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadReplies();

    // Setup SLA calculations: SLA target is 15 minutes
    const updateSla = () => {
      const created = new Date(selectedTicket.createdAt).getTime();
      const now = new Date().getTime();
      const target = created + 15 * 60 * 1000;
      const diff = target - now;

      if (diff > 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setSlaCountdown(
          isArabic 
            ? `${minutes} دقيقة و ${seconds} ثانية` 
            : `${minutes}m ${seconds}s`
        );
      } else {
        setSlaCountdown('MET');
      }
    };

    updateSla();
    const interval = setInterval(updateSla, 1000);
    return () => clearInterval(interval);
  }, [selectedTicket, lang]);

  // Convert numbers to Arabic Eastern numerals if Arabic language is active
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (!isArabic) return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str.replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)]);
  };

  const formatTicketDate = (dateStr: string | Date) => {
    const dateObj = new Date(dateStr);
    const formatted = dateObj.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    return toArabicNumerals(formatted);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createTicketAction(formData);

    setLoading(false);
    if (result.success) {
      setSuccess(t.successMsg);
      e.currentTarget.reset();
      
      if ('ticket' in result && result.ticket) {
        const newTicket: Ticket = {
          id: result.ticket.id,
          title: result.ticket.title,
          description: result.ticket.description,
          status: result.ticket.status,
          aiResponse: result.ticket.aiResponse,
          createdAt: new Date(result.ticket.createdAt),
        };
        setTickets([newTicket, ...tickets]);
        setSelectedTicket(newTicket);
        setTimeout(() => setSuccess(null), 3000);
      }
    } else {
      setError(result.error || t.errorMsg);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    const result = await closeTicketAction(ticketId);
    if (result.success) {
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: 'CLOSED' } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: 'CLOSED' });
      }
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !selectedTicket) return;

    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/v1/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyInput, sender: 'CLIENT' })
      });
      const json = await res.json();
      if (json.success) {
        setReplies([...replies, json.data]);
        setReplyInput('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="nc-page nc-stack p-6" dir={dir}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-corporate-blue/10 dark:bg-cyan-glow/10 border border-corporate-blue/20 dark:border-cyan-glow/20 text-corporate-blue dark:text-cyan-glow text-xs font-semibold mb-3">
            <i className="ph-bold ph-headset"></i> {t.badgeText}
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t.title}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl leading-relaxed">
            {t.subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Left Side: Creation Form & Ticket List (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Create ticket form */}
          <SmartCard className="p-6 space-y-4">
            <div className="border-b border-slate-200/50 dark:border-white/10 pb-3">
              <h3 className="text-slate-900 dark:text-white font-bold text-base">{t.openTicket}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{t.openTicketSub}</p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-550 text-xs font-semibold">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium text-xs font-semibold mb-2">{t.subjectLabel}</label>
                <input 
                  type="text" 
                  name="title" 
                  required 
                  placeholder={t.subjectPlaceholder}
                  className="w-full rounded-xl bg-white/50 dark:bg-void/50 border border-slate-200/50 dark:border-white/10 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-corporate-blue dark:focus:border-cyan-glow focus:ring-1 focus:ring-corporate-blue dark:focus:ring-cyan-glow transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium text-xs font-semibold mb-2">{t.detailsLabel}</label>
                <textarea 
                  name="description" 
                  rows={4} 
                  required 
                  placeholder={t.detailsPlaceholder}
                  className="w-full rounded-xl bg-white/50 dark:bg-void/50 border border-slate-200/50 dark:border-white/10 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-corporate-blue dark:focus:border-cyan-glow focus:ring-1 focus:ring-corporate-blue dark:focus:ring-cyan-glow transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 rounded-xl bg-corporate-blue dark:bg-gradient-to-r dark:from-indigo-650 dark:to-indigo-500 hover:scale-[1.01] text-white font-bold text-sm transition-all cursor-pointer disabled:opacity-55 shadow-md"
              >
                {loading ? t.submittingBtn : t.submitBtn}
              </button>
            </form>
          </SmartCard>

          {/* Ticket list ledger */}
          <SmartCard className="p-6 space-y-4">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm border-b border-slate-200/50 dark:border-white/10 pb-3 flex justify-between items-center">
              <span>{t.ledgerTitle}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-normal">{t.totalTickets.replace('{count}', toArabicNumerals(tickets.length))}</span>
            </h4>

            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-fade">
              {tickets.length === 0 ? (
                <div className="py-6 text-center text-slate-500 dark:text-slate-400 font-medium text-xs">
                  {t.emptyStateLeft}
                </div>
              ) : (
                tickets.map((ticket) => {
                  const isActive = selectedTicket?.id === ticket.id;
                  const isOpen = ticket.status === 'OPEN';
                  return (
                    <div 
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-start ${
                        isActive 
                          ? 'bg-corporate-blue/10 dark:bg-cyan-glow/10 border-corporate-blue/40 dark:border-cyan-glow/40' 
                          : 'bg-white/50 dark:bg-void/50 border-slate-200/50 dark:border-white/10 hover:border-corporate-blue/40 dark:hover:border-cyan-glow/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{ticket.title}</h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{t.ticketDate.replace('{date}', formatTicketDate(ticket.createdAt))}</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ticket.aiResponse && (
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                            {t.aiResponded}
                          </span>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isOpen 
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border border-slate-300 dark:border-slate-700'
                        }`}>
                          {isOpen ? t.statusActive : t.statusClosed}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SmartCard>
        </div>

        {/* Right Side: Selected Ticket view (7 cols) */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <SmartCard className="p-6 space-y-6">
              
              {/* Detail header */}
              <div className="border-b border-slate-200/50 dark:border-white/10 pb-4 flex justify-between items-center gap-4">
                <div>
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg">{selectedTicket.title}</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 font-en">
                    {t.tenantLabel.replace('{tenantName}', tenantName).replace('{id}', selectedTicket.id)}
                  </p>
                </div>
                {selectedTicket.status === 'OPEN' && (
                  <button 
                    onClick={() => handleCloseTicket(selectedTicket.id)}
                    className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all border border-rose-500/20 hover:border-transparent cursor-pointer shrink-0"
                  >
                    {t.closeTicketBtn}
                  </button>
                )}
              </div>

              {/* SLA Indicator */}
              {selectedTicket.status === 'OPEN' && (
                <div className="flex justify-between items-center bg-indigo-500/10 border border-indigo-500/20 px-4 py-2.5 rounded-xl text-xs">
                  <span className="font-bold text-indigo-500 dark:text-indigo-400">{t.slaLabel}</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 font-en">
                    {slaCountdown === 'MET' ? t.slaMet : t.slaActive.replace('{time}', slaCountdown)}
                  </span>
                </div>
              )}

              {/* Inquiry description */}
              <div className="bg-white/50 dark:bg-void/50 border border-slate-200/50 dark:border-white/10 p-4 rounded-xl">
                <p className="text-corporate-blue dark:text-cyan-glow text-[10px] font-bold mb-1.5">{t.authorLabel}</p>
                <p className="text-slate-700 dark:text-slate-300 font-medium text-xs leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {/* AI response box */}
              {selectedTicket.aiResponse ? (
                <div className="bg-indigo-500/5 border border-indigo-500/20 p-5 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none"></div>
                  
                  <div className="flex items-center gap-2 border-b border-indigo-500/10 pb-2 relative z-10">
                    <i className="ph-fill ph-robot text-indigo-500 text-lg"></i>
                    <h5 className="text-indigo-500 dark:text-indigo-400 font-bold text-xs">{t.aiAgentLabel}</h5>
                  </div>
                  
                  <div className="text-slate-700 dark:text-slate-300 font-medium text-xs leading-relaxed whitespace-pre-wrap relative z-10">
                    {selectedTicket.aiResponse}
                  </div>
                </div>
              ) : null}

              {/* Replies Timeline */}
              <div className="space-y-4">
                <h4 className="text-slate-900 dark:text-white font-bold text-xs border-b border-slate-200/50 dark:border-white/10 pb-2">
                  {isArabic ? 'سجل متابعة تذاكر الدعم والردود' : 'Support Follow-ups Timeline'}
                </h4>
                
                <div className="space-y-3 max-h-[220px] overflow-y-auto scrollbar-fade">
                  {replies.map(rep => {
                    const isClient = rep.sender === 'CLIENT';
                    return (
                      <div key={rep.id} className={`flex flex-col ${isClient ? 'items-end' : 'items-start'} space-y-1`}>
                        <div className={`p-3 rounded-xl text-xs leading-normal max-w-[85%] ${isClient ? 'bg-corporate-blue text-white rounded-br-none' : 'bg-white/50 dark:bg-void/50 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-white/10 rounded-bl-none'}`}>
                          {rep.message}
                        </div>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium font-en px-1">{new Date(rep.createdAt).toLocaleTimeString()}</span>
                      </div>
                    );
                  })}
                </div>

                {selectedTicket.status === 'OPEN' && (
                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input
                      type="text"
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder={t.replyPlaceholder}
                      className="flex-grow rounded-xl bg-white/50 dark:bg-void/50 border border-slate-200/50 dark:border-white/10 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-corporate-blue dark:focus:border-cyan-glow focus:ring-1 focus:ring-corporate-blue dark:focus:ring-cyan-glow transition-all"
                    />
                    <button
                      type="submit"
                      disabled={submittingReply || !replyInput.trim()}
                      className="bg-corporate-blue dark:bg-gradient-to-r dark:from-indigo-650 dark:to-indigo-500 hover:scale-[1.02] text-white px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                    >
                      {submittingReply ? '...' : t.sendReplyBtn}
                    </button>
                  </form>
                )}
              </div>

            </SmartCard>
          ) : (
            <SmartCard className="p-16 text-center">
              <i className="ph ph-article-ny-times text-5xl text-slate-400 mb-4 block"></i>
              <h3 className="text-slate-900 dark:text-white font-bold text-base mb-1">{t.emptyStateRightTitle}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">{t.emptyStateRightDesc}</p>
            </SmartCard>
          )}
        </div>
      </div>

    </div>
  );
}
