// app/operations/helpdesk/HelpdeskView.tsx
'use client';

import React, { useState } from 'react';
import { createTicketAction, closeTicketAction } from '@/app/actions/helpdesk';

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

export default function HelpdeskView({ initialTickets, tenantName }: HelpdeskViewProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createTicketAction(formData);

    setLoading(false);
    if (result.success) {
      setSuccess("تم إرسال تذكرتك بنجاح وتلقي رد فوري من الوكيل مساعد!");
      e.currentTarget.reset();
      // إعادة تحميل التذاكر
      window.location.reload();
    } else {
      setError(result.error || "حدث خطأ أثناء إرسال التذكرة.");
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
    <div className="space-y-6" dir="rtl">
      
      {/* هيدر مركز الدعم */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-3 py-1 rounded-full font-black">
            مساعد الدعم الذكي - SaaS Helpdesk Agent
          </span>
          <h1 className="text-2xl font-black text-slate-800 mt-2">مركز الدعم والوكيل مساعد</h1>
          <p className="text-xs text-slate-400 mt-1">تواصل مع الوكيل مساعد للحصول على إجابات تقنية فورية أو تصعيد المشاكل الحرجة</p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl font-bold">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* استمارة فتح تذكرة جديدة */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">فتح تذكرة دعم فني</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">سيقوم الوكيل مساعد بالرد عليك تلقائياً فور الإرسال</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">موضوع الاستفسار / المشكلة *</label>
              <input 
                type="text" 
                name="title" 
                required 
                placeholder="مثال: استفسار عن ربط الدومين المخصص"
                className="w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">الشرح والتفاصيل *</label>
              <textarea 
                name="description" 
                required 
                rows={5}
                placeholder="اكتب تفاصيل استفسارك أو المشكلة التي تواجهك هنا (أوركا يفهم الكلمات المفتاحية مثل: باقة، ربط، عطل، خطأ)..."
                className="w-full border rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
            >
              {loading ? 'جاري الإرسال ومراجعة الوكيل...' : '✉️ إرسال التذكرة للوكيل مساعد'}
            </button>
          </form>
        </div>

        {/* قائمة التذاكر السابقة واستعراض الردود */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
            <h3 className="font-bold text-slate-800 text-xs">سجل التذاكر والاستفسارات العقارية</h3>
            <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 font-bold">
              إجمالي {tickets.length} تذاكر
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* القائمة الجانبية للتذاكر */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm divide-y divide-gray-100 h-[450px] overflow-y-auto">
              {tickets.length === 0 ? (
                <div className="p-12 text-center text-gray-400 font-medium text-xs">
                  لا توجد تذاكر دعم فني سابقة لشركتكم.
                </div>
              ) : (
                tickets.map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => setSelectedTicket(t)}
                    className={`p-4 cursor-pointer transition-all flex flex-col justify-between space-y-3 text-right ${selectedTicket?.id === t.id ? 'bg-amber-500/5 border-r-4 border-amber-500' : 'hover:bg-slate-50/50'}`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-extrabold text-slate-800 text-xs line-clamp-1 flex-1">{t.title}</h4>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border shrink-0 ${t.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                          {t.status === 'OPEN' ? 'نشطة' : 'مغلقة'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-normal">{t.description}</p>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold border-t pt-2">
                      <span>تاريخ: {new Date(t.createdAt).toLocaleDateString('ar-SA')}</span>
                      {t.aiResponse && <span className="text-amber-600 font-black">🤖 تم الرد</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* تفاصيل التذكرة المفتوحة */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm h-[450px] flex flex-col justify-between">
              {selectedTicket ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-black text-slate-800 text-xs leading-normal">{selectedTicket.title}</h4>
                      {selectedTicket.status === 'OPEN' && (
                        <button 
                          onClick={() => handleCloseTicket(selectedTicket.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        >
                          إغلاق التذكرة ✕
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-400 font-bold">شرح المطور:</p>
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed border font-semibold">{selectedTicket.description}</p>
                    </div>

                    {selectedTicket.aiResponse && (
                      <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5 animate-in fade-in duration-300">
                        <div className="flex items-center gap-1.5 text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <p className="text-[9px] font-black">رد الوكيل الفني الذكي (مساعد):</p>
                        </div>
                        <p className="text-[10px] text-slate-700 leading-relaxed font-semibold">
                          {selectedTicket.aiResponse}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-slate-400 text-center border-t pt-3">
                    مستأجر المنصة: <span className="font-bold text-slate-600">{tenantName}</span> | المعرف: #{selectedTicket.id.substring(0, 8).toUpperCase()}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2 py-10">
                  <svg width="32" height="32" className="text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-xs font-bold text-slate-500">اختر تذكرة لمشاهدة التفاصيل</p>
                  <p className="text-[9px] text-slate-400">ستظهر تذاكر الدعم والرد الفوري للوكيل مساعد هنا</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
