// components/views/HelpdeskView.tsx
'use client';

import React, { useState } from 'react';
import { createTicketAction, closeTicketAction } from '@/app/actions/helpdesk';
import { useApp } from '@/app/context/AppContext';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  aiResponse: string | null;
  createdAt: Date;
}

interface HelpdeskViewProps {
  initialTickets: Ticket[];
  tenantName: string;
}

const TRANSLATIONS = {
  AR: {
    title: "مركز الدعم والوكيل مساعد",
    subtitle: "تواصل مع الوكيل مساعد للحصول على إجابات تقنية فورية أو تصعيد المشاكل الحرجة لعام ٢٠٢٦م.",
    badgeText: "مساعد الدعم الذكي - SaaS Helpdesk Agent",
    openTicket: "فتح تذكرة دعم فني",
    openTicketSub: "سيقوم الوكيل مساعد بالرد عليك تلقائياً فور الإرسال",
    subjectLabel: "موضوع الاستفسار / المشكلة *",
    subjectPlaceholder: "مثال: استفسار عن ربط الدومين المخصص",
    detailsLabel: "الشرح والتفاصيل *",
    detailsPlaceholder: "اكتب تفاصيل استفسارك هنا (أوركا يفهم الكلمات مثل: باقة، ربط، عطل، خطأ)...",
    submitBtn: "✉️ إرسال التذكرة للوكيل مساعد",
    submittingBtn: "جاري الإرسال ومراجعة الوكيل...",
    totalTickets: "إجمالي {count} تذاكر",
    emptyStateLeft: "لا توجد بلاغات صيانة أو طلبات تشغيل مسجلة حالياً دعم سابقة لشركتكم.",
    statusActive: "نشطة",
    statusClosed: "مغلقة",
    ticketDate: "تاريخ: {date}",
    aiResponded: "🤖 تم الرد",
    closeTicketBtn: "إغلاق التذكرة ✕",
    authorLabel: "شرح المطور:",
    aiAgentLabel: "رد الوكيل الفني الذكي (مساعد):",
    tenantLabel: "مستأجر المنصة: {tenantName} | المعرف: #{id}",
    emptyStateRightTitle: "اختر تذكرة لمشاهدة التفاصيل",
    emptyStateRightDesc: "ستظهر تذاكر الدعم والرد الفوري للوكيل مساعد هنا",
    successMsg: "تم إرسال تذكرتك بنجاح وتلقي رد فوري من الوكيل مساعد!",
    errorMsg: "حدث خطأ أثناء إرسال التذكرة.",
    ledgerTitle: "سجل التذاكر والاستفسارات العقارية",
  },
  EN: {
    title: "Support Center & Agent Assistant",
    subtitle: "Communicate with the AI assistant for instant technical answers or escalate critical issues for the year 2026.",
    badgeText: "SaaS Helpdesk Agent",
    openTicket: "Open Support Ticket",
    openTicketSub: "The AI assistant will respond to you automatically upon submission",
    subjectLabel: "Subject / Issue *",
    subjectPlaceholder: "e.g., Inquiring about custom domain integration",
    detailsLabel: "Explanation & Details *",
    detailsPlaceholder: "Enter your inquiry details here (Orca understands terms like: package, connection, failure, error)...",
    submitBtn: "✉️ Send Ticket to AI Assistant",
    submittingBtn: "Sending & consulting agent...",
    totalTickets: "Total {count} tickets",
    emptyStateLeft: "No previous support tickets found for your company.",
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
    successMsg: "Your ticket was sent successfully and a response was received from the AI Assistant!",
    errorMsg: "An error occurred while sending the ticket.",
    ledgerTitle: "Support Tickets & Real Estate Queries",
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

  const formatTicketDate = (dateStr: string | Date) => {
    const dateObj = new Date(dateStr);
    const formatted = dateObj.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
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
        const updated = [newTicket, ...tickets];
        setTickets(updated);
        setSelectedTicket(newTicket);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        window.location.reload();
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

  return (
    <div className="orca-page orca-stack" dir={dir}>
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-xs font-semibold mb-3">
          <i className="ph-bold ph-headset"></i> {t.badgeText}
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t.title}
        </h1>
        <p className="text-xs md:text-sm text-slate-550 dark:text-slate-400">
          {t.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* Left Side: Creation Form & Ticket List (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Create ticket form */}
          <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-slate-900 dark:text-white font-bold text-base">{t.openTicket}</h3>
              <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-0.5">{t.openTicketSub}</p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold animate-shake">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.subjectLabel}</label>
                <input 
                  type="text" 
                  name="title" 
                  required 
                  placeholder={t.subjectPlaceholder}
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.detailsLabel}</label>
                <textarea 
                  name="description" 
                  rows={4} 
                  required 
                  placeholder={t.detailsPlaceholder}
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#df7b62] hover:bg-[#c5654e] text-white font-bold text-sm transition-colors cursor-pointer disabled:opacity-55 hover:shadow-sm"
              >
                {loading ? t.submittingBtn : t.submitBtn}
              </button>
            </form>
          </div>

          {/* Ticket list ledger */}
          <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
              <span>{t.ledgerTitle}</span>
              <span className="text-xs text-slate-400 font-normal">{t.totalTickets.replace('{count}', toArabicNumerals(tickets.length))}</span>
            </h4>

            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-fade">
              {tickets.length === 0 ? (
                <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
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
                          ? 'bg-[#df7b62]/5 border-[#df7b62]/40' 
                          : 'bg-slate-50 dark:bg-[#0b1120] border-slate-200 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{ticket.title}</h5>
                        <p className="text-[10px] text-slate-400">{t.ticketDate.replace('{date}', formatTicketDate(ticket.createdAt))}</p>
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
                            : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 border-slate-250 dark:border-slate-700'
                        }`}>
                          {isOpen ? t.statusActive : t.statusClosed}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Selected Ticket view (7 cols) */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
              
              {/* Detail header */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-center gap-4">
                <div>
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg">{selectedTicket.title}</h3>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-en">
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

              {/* Inquiry description */}
              <div className="bg-slate-50 dark:bg-[#0b1120] border border-slate-100 dark:border-slate-850 p-4 rounded-xl">
                <p className="text-[#df7b62] text-[10px] font-bold mb-1.5">{t.authorLabel}</p>
                <p className="text-slate-750 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {/* AI response box */}
              {selectedTicket.aiResponse ? (
                <div className="bg-indigo-500/5 border border-indigo-500/20 p-5 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none"></div>
                  
                  <div className="flex items-center gap-2 border-b border-indigo-500/10 pb-2 relative z-10">
                    <i className="ph-fill ph-robot text-indigo-500 text-lg"></i>
                    <h5 className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">{t.aiAgentLabel}</h5>
                  </div>
                  
                  <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-wrap relative z-10">
                    {selectedTicket.aiResponse}
                  </div>
                </div>
              ) : null}

            </div>
          ) : (
            <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-16 text-center shadow-sm">
              <i className="ph ph-article-ny-times text-5xl text-slate-400 dark:text-slate-500 mb-4 block"></i>
              <h3 className="text-slate-900 dark:text-white font-bold text-base mb-1">{t.emptyStateRightTitle}</h3>
              <p className="text-slate-400 text-xs">{t.emptyStateRightDesc}</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
