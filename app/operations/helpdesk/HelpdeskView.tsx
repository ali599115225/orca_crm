// app/operations/helpdesk/HelpdeskView.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
    subtitle: "تواصل مع الوكيل مساعد للحصول على إجابات تقنية فورية أو تصعيد المشاكل الحرجة لعام {year}م.",
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
    emptyStateLeft: "لا توجد تذاكر دعم سابقة لشركتكم.",
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
    subtitle: "Communicate with the AI assistant for instant technical answers or escalate critical issues for the year {year}.",
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

  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

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

  const formatTicketDate = (dateStr: string | Date) => {
    const dateObj = new Date(dateStr);
    const formatted = dateObj.toLocaleDateString('en-US', {
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
      
      if (result.ticket) {
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

  const isDark = theme === 'dark';

  return (
    <div className={`helpdesk-page-wrapper calibri-strictly ${isDark ? 'dark-canvas' : 'light-canvas'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* خط كاليبري ونظام الألوان المزدوج المتسق */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.cdnfonts.com/css/calibri');
        
        .calibri-strictly, .calibri-strictly * {
          font-family: 'Calibri', 'Calibri-Regular', 'Arial', sans-serif !important;
        }
        
        .helpdesk-page-wrapper {
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

      {/* الترويسة وشارة الذكاء الاصطناعي (Header & AI Badge Layout) */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 transition-all ${
        isDark ? 'frosted-glass-dark' : 'milky-glass-light'
      }`}>
        <div className={lang === 'AR' ? 'text-right' : 'text-left'}>
          <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t.title}
          </h1>
          <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t.subtitle.replace('{year}', toArabicNumerals(2026))}
          </p>
        </div>
        
        {/* شارة الذكاء الاصطناعي الفخمة الملونة */}
        <div className={`px-4 py-2 rounded-xl font-bold text-xs shrink-0 text-center border ${
          isDark 
            ? 'bg-[#735334]/20 text-[#E6C687] border-[#735334]/40 shadow-[0_0_15px_rgba(115,83,52,0.2)]' 
            : 'bg-[#735334]/10 text-[#735334] border-[#735334]/20 shadow-sm'
        }`}>
          {t.badgeText}
        </div>
      </div>

      {/* التنبيهات والأخطاء */}
      {success && (
        <div className="bg-emerald-950/20 border border-emerald-800/50 text-emerald-400 text-xs p-4 rounded-xl font-bold mb-6">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-950/20 border border-rose-800/50 text-rose-300 text-xs p-4 rounded-xl font-bold mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* استمارة فتح تذكرة دعم فني جديدة */}
        <div className={`p-6 rounded-2xl h-fit space-y-5 transition-all ${isDark ? 'frosted-glass-dark' : 'milky-glass-light'} ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <div>
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{t.openTicket}</h3>
            <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t.openTicketSub}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.subjectLabel}
              </label>
              <input 
                type="text" 
                name="title" 
                required 
                placeholder={t.subjectPlaceholder}
                className={`w-full rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-[#735334] focus:outline-none ${
                  isDark 
                    ? 'bg-slate-950/70 border border-slate-800 text-white' 
                    : 'bg-white border border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.detailsLabel}
              </label>
              <textarea 
                name="description" 
                required 
                rows={5}
                placeholder={t.detailsPlaceholder}
                className={`w-full rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-[#735334] focus:outline-none ${
                  isDark 
                    ? 'bg-slate-950/70 border border-slate-800 text-white' 
                    : 'bg-white border border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-3 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md text-white ${
                isDark ? 'bg-[#735334] hover:bg-[#5f4229]' : 'bg-[#735334] hover:bg-[#4a3520]'
              }`}
            >
              {loading ? t.submittingBtn : t.submitBtn}
            </button>
          </form>
        </div>

        {/* سجل التذاكر والاستفسارات العقارية (Ticket Ledger Subsystem) */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
            isDark ? 'frosted-glass-dark' : 'milky-glass-light'
          }`}>
            <h3 className={`font-black text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {t.ledgerTitle}
            </h3>
            
            {/* العداد النشط بالتنسيق الشرقي */}
            <span className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
              isDark ? 'bg-slate-950 border border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              {t.totalTickets.replace('{count}', toArabicNumerals(tickets.length))}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* القائمة الجانبية للتذاكر */}
            <div className={`rounded-2xl border overflow-hidden shadow-sm divide-y h-[450px] overflow-y-auto transition-all ${
              isDark ? 'frosted-glass-dark divide-slate-800' : 'milky-glass-light divide-slate-100'
            }`}>
              {tickets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 font-bold text-xs">
                  {t.emptyStateLeft}
                </div>
              ) : (
                tickets.map((tSingle) => (
                  <div 
                    key={tSingle.id} 
                    onClick={() => setSelectedTicket(tSingle)}
                    className={`p-4 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${lang === 'AR' ? 'text-right' : 'text-left'} ${
                      selectedTicket?.id === tSingle.id 
                        ? (isDark ? 'bg-[#735334]/20 border-r-4 border-[#735334]' : 'bg-[#735334]/5 border-r-4 border-[#735334]') 
                        : (isDark ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50/50')
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={`font-black text-xs line-clamp-1 flex-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {tSingle.title}
                        </h4>
                        
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border shrink-0 ${
                          tSingle.status === 'OPEN' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : (isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500')
                        }`}>
                          {tSingle.status === 'OPEN' ? t.statusActive : t.statusClosed}
                        </span>
                      </div>
                      
                      <p className={`text-[10px] line-clamp-2 mt-1 leading-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {tSingle.description}
                      </p>
                    </div>

                    <div className={`flex items-center justify-between text-[9px] text-slate-400 font-bold border-t border-slate-700/20 pt-2 ${lang === 'AR' ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span>{t.ticketDate.replace('{date}', formatTicketDate(tSingle.createdAt))}</span>
                      {tSingle.aiResponse && <span className="text-amber-500 font-black">{t.aiResponded}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* تفاصيل التذكرة المفتوحة */}
            <div className={`rounded-2xl border p-5 shadow-sm h-[450px] flex flex-col justify-between transition-all ${
              isDark ? 'frosted-glass-dark' : 'milky-glass-light'
            } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
              {selectedTicket ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-3">
                    <div className={`flex justify-between items-center border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <h4 className={`font-black text-xs leading-normal ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {selectedTicket.title}
                      </h4>
                      
                      {selectedTicket.status === 'OPEN' && (
                        <button 
                          onClick={() => handleCloseTicket(selectedTicket.id)}
                          className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 text-[9px] font-black px-2.5 py-1 rounded-lg border border-rose-500/20 transition-colors cursor-pointer"
                        >
                          {t.closeTicketBtn}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className={`text-[9px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.authorLabel}</p>
                      <p className={`text-[11px] p-3 rounded-lg leading-relaxed border font-semibold ${
                        isDark ? 'bg-slate-950/40 border-slate-800 text-slate-350' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        {selectedTicket.description}
                      </p>
                    </div>

                    {selectedTicket.aiResponse && (
                      <div className={`p-3.5 border rounded-xl space-y-1.5 animate-in fade-in duration-300 ${
                        isDark ? 'bg-[#735334]/10 border-[#735334]/20' : 'bg-amber-500/5 border-amber-500/20'
                      }`}>
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <p className="text-[9px] font-black">{t.aiAgentLabel}</p>
                        </div>
                        <p className={`text-[10px] leading-relaxed font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {selectedTicket.aiResponse}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-slate-400 text-center border-t border-slate-700/20 pt-3">
                    {t.tenantLabel.replace('{tenantName}', tenantName).replace('{id}', toArabicNumerals(selectedTicket.id.substring(0, 8).toUpperCase()))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2 py-10">
                  <svg width="32" height="32" className="text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-xs font-bold text-slate-500">
                    {t.emptyStateRightTitle}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    {t.emptyStateRightDesc}
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

