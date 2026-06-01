// components/views/TasksView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getTasksAction, getLeadsListAction, toggleTaskStatusAction, createTaskAction } from '@/app/actions/tasks';
import { useApp } from '@/app/context/AppContext';

const TRANSLATIONS = {
  AR: {
    tag: "نظام المتابعة والجدولة الذاتية لعام ٢٠٢٦ 🗓️",
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
    tag: "Autonomous Follow-up Ledger 2026 🗓️",
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
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';

  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(result.error || "حدث خطأ غير متوقع.");
    }
  };

  // دالة تحويل الأرقام إلى الأرقام العربية الشرقية حسب اللغة النشطة
  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (!isArabic) return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str.replace(/[0-9]/g, (w) => arabicDigits[+w]);
  };

  const formatTaskDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr || "";
    }
  };

  const filteredTasks = tasks.filter(t => 
    (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.lead?.firstName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingTasks = tasks.filter(t => t.status === "PENDING").length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#df7b62] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-slate-500 dark:text-slate-450">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto w-full" dir={dir}>
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#df7b62]/10 border border-[#df7b62]/20 text-[#df7b62] text-xs font-semibold mb-3">
          <i className="ph-bold ph-calendar-check"></i> {t.tag}
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t.title}
        </h1>
        <p className="text-xs md:text-sm text-slate-550 dark:text-slate-400">
          {t.desc}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left Column: Task List (7 cols) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-[#df7b62]/10 text-[#df7b62] border border-[#df7b62]/20 px-2.5 py-1 rounded-full">
                {t.counterPending}{toArabicNumerals(pendingTasks)}
              </span>
              <span className="text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                {t.counterCompleted}{toArabicNumerals(completedTasks)}
              </span>
            </div>

            <div className={`flex items-center border rounded-full px-4 py-2 transition-all ${theme === 'dark' ? 'bg-[#0b1120] border-slate-850 focus-within:border-[#df7b62]' : 'bg-slate-50 border-slate-300 focus-within:border-[#df7b62]'}`}>
              <i className="ph ph-magnifying-glass text-slate-400 text-base ml-2"></i>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isArabic ? "ابحث عن مهمة..." : "Search tasks..."} 
                className="bg-transparent border-none outline-none text-xs w-40 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" 
              />
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] no-scrollbar">
            {filteredTasks.length === 0 ? (
              <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center">
                <i className="ph ph-calendar-x text-4xl text-slate-400 dark:text-slate-500 mb-3 block"></i>
                <h4 className="text-slate-900 dark:text-white font-bold text-base mb-1">{t.emptyTitle}</h4>
                <p className="text-slate-400 text-xs">{t.emptySub}</p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isCompleted = task.status === "COMPLETED";
                const isHigh = task.priority === "HIGH";
                const isMedium = task.priority === "MEDIUM";

                return (
                  <div 
                    key={task.id} 
                    className={`bg-white dark:bg-[#151f32] border ${
                      isCompleted 
                        ? 'border-emerald-500/20 bg-emerald-500/5' 
                        : 'border-slate-200 dark:border-slate-800/80'
                    } p-4 rounded-xl shadow-sm hover:border-[#df7b62]/40 transition-all flex items-start gap-4 cursor-pointer`}
                    onClick={() => handleToggle(task.id, task.status)}
                  >
                    <input 
                      type="checkbox" 
                      checked={isCompleted}
                      onChange={() => {}} // toggled via parent div click
                      className="w-5 h-5 rounded-md border-slate-300 dark:border-slate-700 text-[#df7b62] focus:ring-[#df7b62] shrink-0 mt-0.5"
                    />
                    
                    <div className="flex-grow space-y-1">
                      <h4 className={`text-slate-900 dark:text-white font-bold text-sm leading-tight transition-all ${
                        isCompleted ? 'line-through text-slate-450 dark:text-slate-500' : ''
                      }`}>
                        {task.title}
                      </h4>
                      {task.lead && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {isArabic ? "العميل المستهدف: " : "Target Prospect: "}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{task.lead.firstName} {task.lead.lastName || ''}</span>
                        </p>
                      )}
                      {task.notes && (
                        <p className="text-[11px] text-slate-450 dark:text-slate-500 italic mt-1 leading-relaxed">
                          {task.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        isHigh 
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                          : isMedium 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}>
                        {isHigh ? t.priorityHigh : isMedium ? t.priorityMedium : t.priorityLow}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-en font-semibold">
                        {formatTaskDate(task.dueDate)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Create Task Form (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-slate-900 dark:text-white font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <i className="ph-bold ph-calendar-plus text-[#df7b62]"></i>
              {t.formTitle}
            </h3>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.taskTitleLabel}</label>
                <input 
                  type="text" 
                  name="title" 
                  required 
                  placeholder={t.taskTitlePlaceholder}
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                />
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.leadLabel}</label>
                <select 
                  name="leadId" 
                  required 
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                >
                  <option value="">{t.leadPlaceholder}</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.firstName} {l.lastName || ''} ({formatTaskDate(l.createdAt)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.dueDateLabel}</label>
                  <input 
                    type="date" 
                    name="dueDate" 
                    required 
                    className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.dueTimeLabel}</label>
                  <input 
                    type="time" 
                    name="dueTime" 
                    required 
                    className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.priorityLabel}</label>
                <select 
                  name="priority" 
                  required
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                >
                  <option value="HIGH">{t.priorityHigh}</option>
                  <option value="MEDIUM">{t.priorityMedium}</option>
                  <option value="LOW">{t.priorityLow}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2">{t.notesLabel}</label>
                <textarea 
                  name="notes" 
                  rows={3}
                  placeholder={t.notesPlaceholder}
                  className="w-full rounded-xl bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#df7b62]"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 rounded-xl bg-[#df7b62] hover:bg-[#c5654e] text-white font-bold text-sm transition-colors mt-4 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-95 duration-200"
              >
                {t.saveBtn}
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}