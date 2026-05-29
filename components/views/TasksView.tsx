// app/operations/tasks/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getTasksAction, getLeadsListAction, toggleTaskStatusAction, createTaskAction } from '@/app/actions/tasks';
import { useApp } from '@/app/context/AppContext';

const TRANSLATIONS = {
  AR: {
    tag: "نظام المتابعة والجدولة الذاتية لعام {year} 🗓️",
    title: "نظام المتابعة والتذكيرات الميدانية",
    desc: "جدولة زيارات المعاينة، اتصالات الحسبة التمويلية وتوقيع عقود المبيعات مع أتمتة كاملة للتذكير.",
    successMsg: "تمت جدولة مهمة المتابعة والتذكير بنجاح وتكليف مستشار العميل!",
    formTitle: "جدولة متابعة جديدة",
    taskTitleLabel: "اسم المهمة / الإجراء المطلوب *",
    taskTitlePlaceholder: "مثال: الاتصال لتأكيد موعد معاينة الفيلا",
    leadLabel: "العميل المرتبط بالمهمة *",
    leadPlaceholder: "-- اختر عميلاً محتملاً --",
    dueDateLabel: "تاريخ الاستحقاق *",
    dueTimeLabel: "وقت الاستحقاق *",
    priorityLabel: "مستوى الأهمية *",
    notesLabel: "ملاحظات وتفاصيل إضافية",
    notesPlaceholder: "تفاصيل الحسبة التمويلية أو شروط حجز الوحدة...",
    saveBtn: "جدولة المتابعة فوراً",
    listTitle: "مهام فريق المبيعات والمتابعات",
    counterPending: "معلقة: ",
    counterCompleted: "مكتملة: ",
    loading: "جاري جلب قائمة المهام...",
    emptyTitle: "لا يوجد مهام أو متابعات مجدولة حالياً.",
    emptySub: "قم بجدولة إجراء جديد في اللوحة الجانبية للمستشارين.",
    assignedRep: "المسؤول: ",
    priorityHigh: "حرجة",
    priorityMedium: "متوسطة",
    priorityLow: "منخفضة"
  },
  EN: {
    tag: "Autonomous Follow-up Ledger {year} 🗓️",
    title: "Tasks & Field Reminders Ledger",
    desc: "Schedule inspection viewings, mortgage evaluations, and contract signings with automated notification pings.",
    successMsg: "Follow-up task scheduled successfully and assigned to the client consultant!",
    formTitle: "Schedule New Follow-up",
    taskTitleLabel: "Task Title / Action Required *",
    taskTitlePlaceholder: "e.g. Call to confirm villa site inspection",
    leadLabel: "Linked Prospective Client *",
    leadPlaceholder: "-- Select a prospect client --",
    dueDateLabel: "Due Date *",
    dueTimeLabel: "Due Time *",
    priorityLabel: "Priority Level *",
    notesLabel: "Additional Notes & Context",
    notesPlaceholder: "Mortgage criteria details or unit reservation guidelines...",
    saveBtn: "Schedule Follow-up Immediately",
    listTitle: "Sales Representative Task Ledger",
    counterPending: "Pending: ",
    counterCompleted: "Completed: ",
    loading: "Retrieving task checklists...",
    emptyTitle: "No scheduled tasks or follow-ups found.",
    emptySub: "Schedule a new action item in the consultant panel.",
    assignedRep: "Assigned: ",
    priorityHigh: "Critical",
    priorityMedium: "Medium",
    priorityLow: "Low"
  }
};

export default function TasksView() {
  const { theme, lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const dbTasks = await getTasksAction();
        const dbLeads = await getLeadsListAction();
        setTasks(dbTasks);
        setLeads(dbLeads);
      } catch (err) {
        console.error("Failed to load tasks data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggle = async (taskId: string, currentStatus: string) => {
    const result = await toggleTaskStatusAction(taskId, currentStatus);
    if (result.success) {
      const updatedTasks = await getTasksAction();
      setTasks(updatedTasks);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await createTaskAction(formData);

    if (result.success) {
      setSuccessMessage(t.successMsg);
      e.currentTarget.reset();
      const updatedTasks = await getTasksAction();
      setTasks(updatedTasks);
    } else {
      setErrorMessage(result.error || "حدث خطأ غير متوقع.");
    }
  };

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

  // تنسيق التاريخ والوقت للأرقام العربية الشرقية
  const formatTaskDate = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    const formatted = dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return toArabicNumerals(formatted);
  };

  const pendingCount = tasks.filter(t => t.status === 'PENDING').length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;

  const isDark = theme === 'dark';

  return (
    <div className={`tasks-page-wrapper calibri-strictly ${isDark ? 'dark-canvas' : 'light-canvas'}`} dir={lang === 'AR' ? 'rtl' : 'ltr'}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .calibri-strictly, .calibri-strictly * {
          font-family: 'Cairo', 'Inter', sans-serif !important;
        }
        
        /* تباين خاص بالمظهر الداكن والفاتح */
        .tasks-page-wrapper {
          min-height: 100%;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        /* تأثير الزجاج المتلألئ للمظهر الداكن */
        .frosted-glass-dark {
          background: rgba(11, 15, 25, 0.6) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
          border: 1px solid rgba(99, 102, 241, 0.25) !important; /* Polished Indigo border */
          box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.4) !important;
        }
        
        /* المظهر الفاتح الراقي */
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
        
        .text-royal-bronze {
          color: #735334 !important;
        }
        .text-gold-accent {
          color: #E6C687 !important;
        }
      `}} />

      {/* الترويسة العليا للمهام والتذكيرات */}
      <div className={`mb-8 ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
        <span className={`inline-block text-[10px] font-extrabold px-3 py-1 rounded-full border ${
          isDark 
            ? 'bg-amber-500/10 text-[#E6C687] border-[#735334]/40' 
            : 'bg-[#735334]/10 text-[#735334] border-[#735334]/20'
        }`}>
          {t.tag.replace('{year}', toArabicNumerals(2026))}
        </span>
        <h1 className={`text-3xl font-black mt-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {t.title}
        </h1>
        <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-650'}`}>
          {t.desc}
        </p>
      </div>

      {/* تنبيهات العمليات */}
      {errorMessage && (
        <div className="bg-rose-950/20 border border-rose-800/50 text-rose-300 text-xs p-4 rounded-xl font-bold mb-6">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-950/20 border border-emerald-800/50 text-emerald-400 text-xs p-4 rounded-xl font-bold mb-6">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* نموذج جدولة مهمة جديدة للعميل (Schedule New Follow-up) */}
        <div className={`p-6 rounded-2xl h-fit space-y-5 transition-all ${isDark ? 'frosted-glass-dark' : 'milky-glass-light'} ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
          <h2 className={`font-black text-sm pb-2 border-b ${isDark ? 'text-[#E6C687] border-slate-800' : 'text-[#735334] border-slate-200'}`}>
            {t.formTitle}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* اسم المهمة / الإجراء المطلوب */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.taskTitleLabel}
              </label>
              <input 
                type="text" 
                name="title"
                required
                className={`w-full rounded-lg p-2.5 text-xs font-bold transition-all focus:outline-none focus:ring-1 focus:ring-[#735334] ${
                  isDark 
                    ? 'bg-slate-950/70 border border-[#735334]/50 text-white' 
                    : 'bg-white border border-slate-300 text-slate-900'
                }`}
                placeholder={t.taskTitlePlaceholder}
              />
            </div>

            {/* العميل المرتبط بالمهمة */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.leadLabel}
              </label>
              <select 
                name="leadId" 
                required 
                className={`w-full rounded-lg p-2.5 text-xs cursor-pointer focus:outline-none ${
                  isDark 
                    ? 'bg-slate-950/70 border border-[#735334]/50 text-white' 
                    : 'bg-white border border-slate-300 text-slate-850'
                }`}
              >
                <option value="">{t.leadPlaceholder}</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.firstName} {l.lastName || ""}</option>
                ))}
              </select>
            </div>

            {/* تاريخ ووقت الاستحقاق */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.dueDateLabel}
                </label>
                <div className="relative">
                  <input 
                    type="date" 
                    name="dueDateOnly"
                    required
                    className={`w-full rounded-lg pl-3 pr-8 py-2.5 text-[11px] font-bold transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#735334] ${
                      isDark 
                        ? 'bg-slate-950/70 border border-[#735334]/50 text-white' 
                        : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                  <div className={`absolute inset-y-0 flex items-center pointer-events-none text-slate-400 ${lang === 'AR' ? 'right-0 pr-2.5' : 'left-0 pl-2.5'}`}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.dueTimeLabel}
                </label>
                <div className="relative">
                  <input 
                    type="time" 
                    name="dueTimeOnly"
                    required
                    className={`w-full rounded-lg pl-3 pr-8 py-2.5 text-[11px] font-bold transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#735334] ${
                      isDark 
                        ? 'bg-slate-950/70 border border-[#735334]/50 text-white' 
                        : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                  <div className={`absolute inset-y-0 flex items-center pointer-events-none text-slate-400 ${lang === 'AR' ? 'right-0 pr-2.5' : 'left-0 pl-2.5'}`}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* مستوى الأهمية */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.priorityLabel}
              </label>
              <select 
                name="priority" 
                className={`w-full rounded-lg p-2.5 text-xs cursor-pointer focus:outline-none ${
                  isDark 
                    ? 'bg-slate-950/70 border border-[#735334]/50 text-white' 
                    : 'bg-white border border-slate-300 text-slate-850'
                }`}
              >
                <option value="LOW">{lang === 'AR' ? "منخفضة" : "Low"}</option>
                <option value="MEDIUM">{lang === 'AR' ? "متوسطة" : "Medium"}</option>
                <option value="HIGH">{lang === 'AR' ? "حرجة" : "Critical"}</option>
              </select>
            </div>

            {/* ملاحظات وتفاصيل إضافية */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.notesLabel}
              </label>
              <textarea 
                name="description"
                rows={3}
                className={`w-full rounded-lg p-2.5 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-[#735334] ${
                  isDark 
                    ? 'bg-slate-950/70 border border-[#735334]/50 text-white text-right' 
                    : 'bg-white border border-slate-300 text-slate-900 text-right'
                }`}
                placeholder={t.notesPlaceholder}
              />
            </div>

            {/* زر الحفظ */}
            <button 
              type="submit"
              className={`w-full transition-all p-3 rounded-lg text-xs font-bold cursor-pointer text-white ${
                isDark 
                  ? 'bg-[#735334] hover:bg-[#5f4229]' 
                  : 'bg-[#735334] hover:bg-[#4a3520]'
              }`}
            >
              {t.saveBtn}
            </button>
          </form>
        </div>

        {/* قائمة المهام المجدولة النشطة من قاعدة البيانات */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* كرت العنوان والعدادات الإجمالية للمهام */}
          <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
            isDark ? 'frosted-glass-dark' : 'milky-glass-light'
          } ${lang === 'AR' ? 'flex-row' : 'flex-row-reverse'}`}>
            <h3 className={`font-black text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {t.listTitle}
            </h3>
            
            {/* Task Overview Counters */}
            <div className="flex gap-2 text-[10px] font-bold">
              <span className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                isDark 
                  ? 'bg-amber-950/30 border border-amber-900/50 text-amber-400' 
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}>
                {t.counterPending}{toArabicNumerals(pendingCount)}
              </span>
              <span className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                isDark 
                  ? 'bg-emerald-950/30 border border-emerald-900/50 text-emerald-400' 
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}>
                {t.counterCompleted}{toArabicNumerals(completedCount)}
              </span>
            </div>
          </div>

          {/* لوحة عرض شبكة المهام */}
          <div className={`rounded-2xl border overflow-hidden shadow-sm divide-y transition-all ${
            isDark ? 'frosted-glass-dark divide-slate-800' : 'milky-glass-light divide-slate-105'
          }`}>
            
            {loading ? (
              <div className="p-12 text-center text-slate-450 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block ml-2"></span>
                {t.loading}
              </div>
            ) : tasks.length === 0 ? (
              
              /* Empty State Vector Anchor */
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <svg className="w-16 h-16 text-slate-500/40 mb-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm font-black text-slate-400">
                  {t.emptyTitle}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-bold">
                  {t.emptySub}
                </p>
              </div>
              
            ) : (
              tasks.map((task) => (
                <div key={task.id} className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                  isDark ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50/50'
                } ${lang === 'AR' ? 'text-right' : 'text-left'}`}>
                  
                  <div className={`flex items-start gap-3 ${lang === 'AR' ? '' : 'flex-row-reverse'}`}>
                    <input 
                      type="checkbox" 
                      checked={task.status === 'COMPLETED'}
                      onChange={() => handleToggle(task.id, task.status)}
                      className={`mt-1.5 h-4.5 w-4.5 rounded transition-all cursor-pointer ${
                        isDark ? 'accent-amber-500 bg-slate-950 border-[#735334]/50' : 'accent-[#735334]'
                      }`}
                    />
                    <div>
                      <h4 className={`text-xs font-black ${
                        task.status === 'COMPLETED' 
                          ? 'line-through text-slate-550' 
                          : (isDark ? 'text-white' : 'text-slate-800')
                      }`}>
                        {task.title}
                      </h4>
                      
                      {task.description && (
                        <p className={`text-[10px] mt-1.5 p-2 rounded-lg border max-w-lg leading-relaxed ${
                          isDark 
                            ? 'bg-slate-950/40 border-slate-800 text-slate-400' 
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          {task.description}
                        </p>
                      )}
                      
                      <p className={`text-[10px] mt-2 font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {lang === 'AR' ? 'العميل: ' : 'Client: '}
                        <span className={isDark ? 'text-amber-300' : 'text-[#735334]'}>
                          {task.lead?.firstName} {task.lead?.lastName || ""}
                        </span>
                      </p>
                      
                      <p className="text-[10px] text-amber-500 font-extrabold mt-1.5">
                        {lang === 'AR' ? 'الاستحقاق: ' : 'Due: '}{formatTaskDate(task.dueDate)}
                      </p>
                    </div>
                  </div>

                  {/* معلومات المسؤول والدرجة التفضيلية */}
                  <div className="flex items-center gap-2 self-end sm:self-auto text-[10px] font-bold">
                    <span className={isDark ? 'text-slate-500' : 'text-slate-405'}>
                      {t.assignedRep}{task.assignedUser?.name}
                    </span>
                    
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black border ${
                      task.priority === 'HIGH' 
                        ? 'bg-rose-500/10 border-rose-500/25 text-rose-500' 
                        : task.priority === 'MEDIUM' 
                          ? 'bg-amber-500/10 border-amber-500/25 text-amber-500' 
                          : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-650')
                    }`}>
                      {task.priority === 'HIGH' ? t.priorityHigh : task.priority === 'MEDIUM' ? t.priorityMedium : t.priorityLow}
                    </span>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}