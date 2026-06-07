// components/views/TasksView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getTasksAction, getLeadsListAction, toggleTaskStatusAction, createTaskAction } from '@/app/actions/tasks';
import { useApp } from '@/app/context/AppContext';
import { LayoutContainer } from '../ui/LayoutContainer';

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
        <div className="w-10 h-10 border-4 border-[var(--nc-accent-border)] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-slate-400 font-medium dark:text-slate-450">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="nc-page nc-stack p-6" dir={dir}>
      
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-text-secondary)] text-xs font-semibold mb-3">
          <i className="ph-bold ph-calendar-check"></i> {t.tag}
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-[var(--nc-text-primary)] dark:text-white mb-2">
          {t.title}
        </h1>
        <p className="text-xs md:text-sm text-slate-400 font-medium">
          {t.desc}
        </p>
      </div>

      <LayoutContainer
        kpis={
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold bg-[var(--nc-accent-soft)] text-[var(--nc-text-secondary)] border border-[var(--nc-accent-border)] px-2.5 py-1 rounded-full">
              {t.counterPending}{toArabicNumerals(pendingTasks)}
            </span>
            <span className="text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              {t.counterCompleted}{toArabicNumerals(completedTasks)}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center border rounded-full px-4 py-2 transition-all bg-[var(--nc-surface-strong)] border-[var(--nc-border)] focus-within:border-[var(--nc-accent)] w-full">
            <i className="ph ph-magnifying-glass text-[var(--nc-foreground-muted)] text-base ml-2"></i>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isArabic ? "ابحث عن مهمة..." : "Search tasks..."} 
              className="bg-transparent border-none outline-none text-xs w-full text-[var(--nc-foreground)] placeholder-[var(--nc-foreground-muted)]" 
            />
          </div>
        }
        insights={
          <div className="bg-transparent border-none p-0 space-y-5">
            <h3 className="text-[var(--nc-text-primary)] font-bold dark:text-white text-base border-b border-[var(--nc-border)] pb-3 flex items-center gap-2">
              <i className="ph-bold ph-calendar-plus text-[var(--nc-text-secondary)]"></i>
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
                <label className="block text-[var(--nc-text-dim)] font-medium text-xs font-semibold mb-2">{t.taskTitleLabel}</label>
                <input 
                  type="text" 
                  name="title" 
                  required 
                  placeholder={t.taskTitlePlaceholder}
                  className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent)] focus:ring-1 focus:ring-[var(--nc-accent)] transition-all"
                />
              </div>

              <div>
                <label className="block text-[var(--nc-text-dim)] font-medium text-xs font-semibold mb-2">{t.leadLabel}</label>
                <select 
                  name="leadId" 
                  required 
                  className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent)] focus:ring-1 focus:ring-[var(--nc-accent)] transition-all"
                >
                  <option value="">{t.leadPlaceholder}</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.firstName} {l.lastName || ''} ({formatTaskDate(l.createdAt)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--nc-text-dim)] font-medium text-xs font-semibold mb-2">{t.dueDateLabel}</label>
                  <input 
                    type="date" 
                    name="dueDateOnly" 
                    required 
                    className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent)] focus:ring-1 focus:ring-[var(--nc-accent)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[var(--nc-text-dim)] font-medium text-xs font-semibold mb-2">{t.dueTimeLabel}</label>
                  <input 
                    type="time" 
                    name="dueTimeOnly" 
                    required 
                    className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent)] focus:ring-1 focus:ring-[var(--nc-accent)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--nc-text-dim)] font-medium text-xs font-semibold mb-2">{t.priorityLabel}</label>
                <select 
                  name="priority" 
                  required
                  className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent)] focus:ring-1 focus:ring-[var(--nc-accent)] transition-all"
                >
                  <option value="HIGH">{t.priorityHigh}</option>
                  <option value="MEDIUM">{t.priorityMedium}</option>
                  <option value="LOW">{t.priorityLow}</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--nc-text-dim)] font-medium text-xs font-semibold mb-2">{t.notesLabel}</label>
                <textarea 
                  name="description" 
                  rows={3}
                  placeholder={t.notesPlaceholder}
                  className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent)] focus:ring-1 focus:ring-[var(--nc-accent)] transition-all"
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 rounded-xl bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold text-sm transition-colors mt-4 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-95 duration-200"
              >
                {t.saveBtn}
              </button>
            </form>
          </div>
        }
        details={
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {filteredTasks.length === 0 ? (
              <div className="bg-[var(--nc-surface-solid)] border border-[var(--nc-glass-border)] rounded-2xl p-12 text-center">
                <i className="ph ph-calendar-x text-4xl text-[var(--nc-text-dim)] font-medium mb-3 block"></i>
                <h4 className="text-[var(--nc-text-primary)] font-bold dark:text-white text-base mb-1">{t.emptyTitle}</h4>
                <p className="text-[var(--nc-text-dim)] font-medium text-xs">{t.emptySub}</p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isCompleted = task.status === "COMPLETED";
                const isHigh = task.priority === "HIGH";
                const isMedium = task.priority === "MEDIUM";

                return (
                  <div 
                    key={task.id} 
                    className={`bg-[var(--nc-surface-solid)] border ${
                      isCompleted 
                        ? 'border-emerald-500/20 bg-emerald-500/5' 
                        : 'border-[var(--nc-glass-border)]'
                    } p-4 rounded-xl shadow-sm hover:border-[var(--nc-accent-border)]/40 transition-all flex items-start gap-4 cursor-pointer`}
                    onClick={() => handleToggle(task.id, task.status)}
                  >
                    <input 
                      type="checkbox" 
                      checked={isCompleted}
                      onChange={() => {}}
                      className="w-5 h-5 rounded-md border-[var(--nc-border)] text-[var(--nc-accent)] focus:ring-[var(--nc-accent)] shrink-0 mt-0.5"
                    />
                    
                    <div className="flex-grow space-y-1">
                      <h4 className={`text-[var(--nc-foreground)] font-bold text-sm leading-tight transition-all ${
                        isCompleted ? 'line-through text-[var(--nc-foreground-muted)]' : ''
                      }`}>
                        {task.title}
                      </h4>
                      {task.lead && (
                        <p className="text-xs text-slate-500 font-medium">
                          {isArabic ? "العميل المستهدف: " : "Target Prospect: "}
                          <span className="font-semibold text-[var(--nc-foreground-muted)]">{task.lead.firstName} {task.lead.lastName || ''}</span>
                        </p>
                      )}
                      {task.notes && (
                        <p className="text-xs text-slate-500 text-[var(--nc-foreground-muted)] italic mt-1 leading-relaxed">
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
                          : 'bg-[var(--nc-surface-soft)] text-[var(--nc-foreground-muted)] border-[var(--nc-border)]'
                      }`}>
                        {isHigh ? t.priorityHigh : isMedium ? t.priorityMedium : t.priorityLow}
                      </span>
                      <span className="text-xs text-slate-500 text-[var(--nc-text-dim)] font-medium font-en font-semibold">
                        {formatTaskDate(task.dueDate)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        }
      />

    </div>
  );
}


