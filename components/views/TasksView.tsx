// components/views/TasksView.tsx
'use client';
import React, { useState, useEffect } from 'react';

import PageHeader from '@/components/ui/PageHeader';
import { getTasksAction, getLeadsListAction, toggleTaskStatusAction, createTaskAction } from '@/app/actions/tasks';
import { useApp } from '@/app/context/AppContext';
import { toArabicNumerals } from '@/lib/formatters';
import { SmartCard } from '@/components/ui/SmartCard';

const TRANSLATIONS = {
  AR: {
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
    listTitle: "سجل المهام والمتابعات",
    kpiTotal: "إجمالي المهام",
    kpiPending: "معلقة",
    kpiCompleted: "مكتملة",
    kpiRate: "نسبة الإنجاز",
    filterAll: "الكل",
    filterPending: "معلقة",
    filterCompleted: "مكتملة",
    loading: "جاري جلب قائمة المهام...",
    emptyTitle: "لا يوجد مهام مجدولة حالياً.",
    emptySub: "قم بجدولة إجراء جديد من خلال نموذج المتابعة.",
    priorityHigh: "حرجة",
    priorityMedium: "متوسطة",
    priorityLow: "منخفضة",
    lead: "العميل:",
    dueDate: "الاستحقاق:",
  },
  EN: {
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
    listTitle: "Tasks & Follow-ups Ledger",
    kpiTotal: "Total Tasks",
    kpiPending: "Pending",
    kpiCompleted: "Completed",
    kpiRate: "Completion Rate",
    filterAll: "All",
    filterPending: "Pending",
    filterCompleted: "Completed",
    loading: "Retrieving task checklists...",
    emptyTitle: "No scheduled tasks or follow-ups found.",
    emptySub: "Schedule a new action item using the form.",
    priorityHigh: "Critical",
    priorityMedium: "Medium",
    priorityLow: "Low",
    lead: "Lead:",
    dueDate: "Due:",
  }
};

type FilterType = 'ALL' | 'PENDING' | 'COMPLETED';

export default function TasksView() {
  const { lang } = useApp();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;
  const isArabic = lang === 'AR';
  const dir = isArabic ? 'rtl' : 'ltr';

  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    async function loadData() {
      try {
        const tasksResult = await getTasksAction();
        const dbTasks = tasksResult && 'data' in tasksResult ? tasksResult.data : (Array.isArray(tasksResult) ? tasksResult : []);
        const dbLeads = await getLeadsListAction();
        setTasks(dbTasks);
        setLeads(dbLeads);
      } catch (err) {
        console.error('Failed to load tasks data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    const result = await toggleTaskStatusAction(taskId, currentStatus);
    if (!result.success) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: currentStatus } : t));
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
      const updatedTasksResult = await getTasksAction();
      const updatedTasks = updatedTasksResult && 'data' in updatedTasksResult ? updatedTasksResult.data : (Array.isArray(updatedTasksResult) ? updatedTasksResult : []);
      setTasks(updatedTasks);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(result.error || 'حدث خطأ غير متوقع.');
    }
  };

  const formatTaskDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch { return dateStr || ''; }
  };

  const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      (task.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.lead?.firstName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === 'ALL' ||
      (activeFilter === 'PENDING' && task.status === 'PENDING') ||
      (activeFilter === 'COMPLETED' && task.status === 'COMPLETED');
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <div className="w-10 h-10 border-[3px] border-[var(--nc-accent-border)] border-t-[var(--nc-accent)] rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-[var(--nc-foreground-muted)]">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6" dir={dir}>

      {/* ── Page Header ───────────────────────────────────── */}
      <PageHeader title={t.title} description={t.desc} />

      {/* ── KPI Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] flex items-center justify-center shrink-0">
            <i className="ph-bold ph-list-checks text-[var(--nc-accent)] text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--nc-foreground-muted)] uppercase tracking-wider">{t.kpiTotal}</p>
            <p className="text-2xl font-black text-[var(--nc-foreground)] leading-tight">{toArabicNumerals(tasks.length)}</p>
          </div>
        </div>

        {/* Pending */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <i className="ph-bold ph-clock-countdown text-amber-500 text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--nc-foreground-muted)] uppercase tracking-wider">{t.kpiPending}</p>
            <p className="text-2xl font-black text-amber-500 leading-tight">{toArabicNumerals(pendingTasks)}</p>
          </div>
        </div>

        {/* Completed */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <i className="ph-bold ph-check-circle text-emerald-500 text-lg"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--nc-foreground-muted)] uppercase tracking-wider">{t.kpiCompleted}</p>
            <p className="text-2xl font-black text-emerald-500 leading-tight">{toArabicNumerals(completedTasks)}</p>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <i className="ph-bold ph-chart-donut text-indigo-500 text-lg"></i>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-[var(--nc-foreground-muted)] uppercase tracking-wider">{t.kpiRate}</p>
            <p className="text-2xl font-black text-indigo-500 leading-tight">{toArabicNumerals(completionRate)}%</p>
            <div className="mt-1.5 h-1 bg-[var(--nc-surface-strong)] rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">

        {/* Left: Schedule Form */}
        <SmartCard className="p-5 space-y-4">
          {/* Form Header */}
          <div className="flex items-center gap-2.5 border-b border-[var(--nc-border)] pb-4">
            <div className="w-8 h-8 rounded-lg bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] flex items-center justify-center">
              <i className="ph-bold ph-calendar-plus text-[var(--nc-accent)] text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--nc-foreground)]">{t.formTitle}</h3>
              <p className="text-[10px] text-[var(--nc-foreground-muted)]">
                {isArabic ? 'أدخل تفاصيل المهمة وسيتم التذكير تلقائياً' : 'Fill in details and reminder will be set automatically'}
              </p>
            </div>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
              <i className="ph ph-warning-circle shrink-0"></i>
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
              <i className="ph ph-check-circle shrink-0"></i>
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Task title */}
            <div>
              <label className="block text-[var(--nc-foreground-muted)] text-[10px] font-bold mb-1.5 uppercase tracking-wide">
                {t.taskTitleLabel}
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder={t.taskTitlePlaceholder}
                className="w-full rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] px-3.5 py-2.5 text-sm text-[var(--nc-foreground)] placeholder:text-[var(--nc-foreground-muted)] focus:outline-none focus:border-[var(--nc-accent)] transition-colors"
              />
            </div>

            {/* Lead */}
            <div>
              <label className="block text-[var(--nc-foreground-muted)] text-[10px] font-bold mb-1.5 uppercase tracking-wide">
                {t.leadLabel}
              </label>
              <select
                name="leadId"
                required
                className="w-full rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] px-3.5 py-2.5 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent)] transition-colors"
              >
                <option value="">{t.leadPlaceholder}</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.firstName} {l.lastName || ''}</option>
                ))}
              </select>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--nc-foreground-muted)] text-[10px] font-bold mb-1.5 uppercase tracking-wide">
                  {t.dueDateLabel}
                </label>
                <input
                  type="date"
                  name="dueDateOnly"
                  required
                  className="w-full rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] px-3 py-2.5 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[var(--nc-foreground-muted)] text-[10px] font-bold mb-1.5 uppercase tracking-wide">
                  {t.dueTimeLabel}
                </label>
                <input
                  type="time"
                  name="dueTimeOnly"
                  required
                  className="w-full rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] px-3 py-2.5 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent)] transition-colors"
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[var(--nc-foreground-muted)] text-[10px] font-bold mb-1.5 uppercase tracking-wide">
                {t.priorityLabel}
              </label>
              <select
                name="priority"
                required
                className="w-full rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] px-3.5 py-2.5 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent)] transition-colors"
              >
                <option value="HIGH">🔴 {t.priorityHigh}</option>
                <option value="MEDIUM">🟡 {t.priorityMedium}</option>
                <option value="LOW">🟢 {t.priorityLow}</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[var(--nc-foreground-muted)] text-[10px] font-bold mb-1.5 uppercase tracking-wide">
                {t.notesLabel}
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder={t.notesPlaceholder}
                className="w-full rounded-xl bg-[var(--nc-surface)] border border-[var(--nc-border)] px-3.5 py-2.5 text-sm text-[var(--nc-foreground)] placeholder:text-[var(--nc-foreground-muted)] focus:outline-none focus:border-[var(--nc-accent)] transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-white font-bold text-sm transition-all cursor-pointer hover:shadow-lg hover:shadow-[var(--nc-accent)]/20 hover:scale-[1.01] active:scale-95 duration-200 flex items-center justify-center gap-2 mt-1"
            >
              <i className="ph-bold ph-calendar-check text-base"></i>
              {t.saveBtn}
            </button>
          </form>
        </SmartCard>

        {/* Right: Task List */}
        <SmartCard className="p-5 space-y-4">
          {/* List header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--nc-foreground)]">{t.listTitle}</h3>
              <p className="text-[10px] text-[var(--nc-foreground-muted)] mt-0.5">
                {toArabicNumerals(filteredTasks.length)} {isArabic ? 'مهمة' : 'tasks'}
              </p>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-[var(--nc-surface)] border border-[var(--nc-border)] rounded-xl px-3 py-2 focus-within:border-[var(--nc-accent)] transition-colors w-full sm:w-52">
              <i className="ph ph-magnifying-glass text-[var(--nc-foreground-muted)] text-sm shrink-0"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isArabic ? 'ابحث عن مهمة...' : 'Search tasks...'}
                className="bg-transparent border-none outline-none text-xs w-full text-[var(--nc-foreground)] placeholder:text-[var(--nc-foreground-muted)]"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 border-b border-[var(--nc-border)] pb-3">
            {(['ALL', 'PENDING', 'COMPLETED'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  activeFilter === f
                    ? 'bg-[var(--nc-accent)] text-white shadow-sm'
                    : 'text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface)] hover:text-[var(--nc-foreground)]'
                }`}
              >
                {f === 'ALL' ? t.filterAll : f === 'PENDING' ? t.filterPending : t.filterCompleted}
                {f !== 'ALL' && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    f === 'PENDING' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                  }`}>
                    {toArabicNumerals(f === 'PENDING' ? pendingTasks : completedTasks)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tasks */}
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 -mr-1">
            {filteredTasks.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-[var(--nc-border)] rounded-2xl">
                <i className="ph ph-calendar-x text-4xl text-[var(--nc-foreground-muted)] block mb-3 opacity-50"></i>
                <h4 className="text-[var(--nc-foreground)] font-bold text-sm mb-1">{t.emptyTitle}</h4>
                <p className="text-[var(--nc-foreground-muted)] text-xs">{t.emptySub}</p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isCompleted = task.status === 'COMPLETED';
                const isHigh = task.priority === 'HIGH';
                const isMedium = task.priority === 'MEDIUM';

                const priorityStripe = isHigh
                  ? 'bg-rose-500'
                  : isMedium
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

                const priorityBadge = isHigh
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  : isMedium
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';

                return (
                  <div
                    key={task.id}
                    onClick={() => handleToggle(task.id, task.status)}
                    className={`relative overflow-hidden rounded-xl border transition-all cursor-pointer group hover:shadow-sm ${
                      isCompleted
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-[var(--nc-border)] bg-[var(--nc-surface-strong)] hover:border-[var(--nc-accent-border)]'
                    }`}
                  >
                    {/* Priority stripe */}
                    <div className={`absolute top-0 bottom-0 ${isArabic ? 'right-0' : 'left-0'} w-1 ${isCompleted ? 'bg-emerald-500' : priorityStripe} rounded-full opacity-70`}></div>

                    <div className={`flex items-start gap-3 p-3.5 ${isArabic ? 'pr-5' : 'pl-5'}`}>
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isCompleted
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-[var(--nc-border)] group-hover:border-[var(--nc-accent)]'
                        }`}
                      >
                        {isCompleted && <i className="ph-bold ph-check text-white text-[9px]"></i>}
                      </div>

                      {/* Content */}
                      <div className="flex-grow min-w-0">
                        <h4 className={`font-bold text-sm leading-tight ${
                          isCompleted
                            ? 'line-through text-[var(--nc-foreground-muted)]'
                            : 'text-[var(--nc-foreground)]'
                        }`}>
                          {task.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {task.lead && (
                            <span className="text-[10px] text-[var(--nc-foreground-muted)] flex items-center gap-1">
                              <i className="ph ph-user text-[9px]"></i>
                              {task.lead.firstName} {task.lead.lastName || ''}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="text-[10px] text-[var(--nc-foreground-muted)] flex items-center gap-1">
                              <i className="ph ph-calendar-blank text-[9px]"></i>
                              {formatTaskDate(task.dueDate)}
                            </span>
                          )}
                        </div>

                        {task.notes && (
                          <p className="text-[10px] text-[var(--nc-foreground-muted)] mt-1 leading-relaxed italic line-clamp-1">
                            {task.notes}
                          </p>
                        )}
                      </div>

                      {/* Priority badge */}
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${priorityBadge}`}>
                        {isHigh ? t.priorityHigh : isMedium ? t.priorityMedium : t.priorityLow}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SmartCard>
      </div>
    </div>
  );
}
