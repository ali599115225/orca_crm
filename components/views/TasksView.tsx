"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Clock, ListChecks } from "lucide-react";
import toast from "react-hot-toast";

import { createTaskAction, getLeadsListAction, getTasksAction, toggleTaskStatusAction } from "@/app/actions/tasks";
import { useApp } from "@/app/context/AppContext";
import UnifiedOperationsWorkspace from "@/components/operations-workspace/UnifiedOperationsWorkspace";
import type { WorkspaceListItem, WorkspaceTimelineItem } from "@/components/operations-workspace/types";
import { displayPerson } from "@/lib/display";
import { toArabicNumerals } from "@/lib/formatters";

const PAGE_SIZE = 5;

const TEXT = {
  AR: {
    title: "المهام والتذكيرات",
    description: "إدارة المهام والتذكيرات ضمن نموذج العمليات الموحد.",
    total: "إجمالي المهام",
    overdue: "المتأخرة",
    completed: "المكتملة",
    rate: "نسبة الإنجاز",
    listTitle: "المهام والتذكيرات",
    ordered: "غير المكتملة والمتأخرة أولًا",
    newLabel: "مهمة جديدة",
    search: "ابحث...",
    filter: "تصفية المهام",
    all: "الكل",
    pending: "قيد الانتظار",
    done: "مكتملة",
    openDetails: "فتح",
    complete: "إكمال",
    reopen: "إعادة فتح",
    archive: "أرشفة",
    customer: "العميل",
    owner: "المسؤول",
    priority: "الأولوية",
    noData: "لا توجد بيانات",
    select: "اختر مهمة لمشاهدة التفاصيل",
    low: "منخفضة",
    medium: "متوسطة",
    high: "مرتفعة",
    urgent: "عاجلة",
    taskTitle: "عنوان المهمة",
    lead: "العميل",
    dueDate: "تاريخ الاستحقاق",
    dueTime: "وقت الاستحقاق",
    notes: "ملاحظات",
    saveTask: "حفظ المهمة",
    taskCreated: "تم إنشاء المهمة",
    taskError: "تعذر إنشاء المهمة",
    invalidDate: "أدخل التاريخ بصيغة DD-MM-YY",
    invalidTime: "أدخل الوقت بصيغة HH:mm",
    unknown: "غير محدد",
    taskRecord: "متابعة عميل",
    projectBrochure: "إرسال بروشور المشروع",
    propertyTour: "تنسيق موعد المعاينة",
    digitalBrochure: "إرسال كتيب إلكتروني",
    quotationFollowUp: "متابعة العميل وإرسال عرض السعر",
    customerDataUpdate: "تحديث بيانات العميل",
    whatsappFollowUp: "متابعة واتساب",
    loadError: "تعذر تحميل المهام",
  },
  EN: {
    title: "Tasks & reminders",
    description: "Manage tasks and reminders through the unified operations workspace.",
    total: "Total tasks",
    overdue: "Overdue",
    completed: "Completed",
    rate: "Completion rate",
    listTitle: "Tasks & reminders",
    ordered: "Incomplete and overdue first",
    newLabel: "New task",
    search: "Search...",
    filter: "Filter tasks",
    all: "All",
    pending: "Pending",
    done: "Completed",
    openDetails: "Open",
    complete: "Complete",
    reopen: "Reopen",
    archive: "Archive",
    customer: "Customer",
    owner: "Owner",
    priority: "Priority",
    noData: "No data",
    select: "Select a task to view details",
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
    taskTitle: "Task title",
    lead: "Lead",
    dueDate: "Due date",
    dueTime: "Due time",
    notes: "Notes",
    saveTask: "Save task",
    taskCreated: "Task created",
    taskError: "Failed to create task",
    invalidDate: "Enter the date as DD-MM-YY",
    invalidTime: "Enter the time as HH:mm",
    unknown: "Not specified",
    taskRecord: "Customer follow-up",
    projectBrochure: "Send project brochure",
    propertyTour: "Schedule property tour",
    digitalBrochure: "Send digital brochure",
    quotationFollowUp: "Follow up and send quotation",
    customerDataUpdate: "Update customer details",
    whatsappFollowUp: "WhatsApp follow-up",
    loadError: "Failed to load tasks",
  },
};

function isTechnicalText(value: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /(?:^|\b)(?:task|lead|user|ticket|email|message|id)_[a-z0-9_-]+(?:\b|$)/i.test(value)
  );
}

function cleanDisplayText(value: unknown, fallback: string) {
  const raw = String(value || "").trim();
  if (!raw || isTechnicalText(raw)) return fallback;
  const cleaned = raw
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\b(?:TASK|LEAD|USER|TICKET|EMAIL|MESSAGE)_[A-Z0-9_]+\b/g, "")
    .replace(/\b(?:task|lead|user|ticket|email|message|id)_[a-z0-9_-]+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || fallback;
}

function normalizeDateDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function parseDisplayDateToIso(value: string) {
  const normalized = normalizeDateDigits(value.trim());
  const match = normalized.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDisplayTime(value: string) {
  const normalized = normalizeDateDigits(value.trim());
  const match = normalized.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

export default function TasksView() {
  const { lang } = useApp();
  const language = lang === "EN" ? "EN" : "AR";
  const t = TEXT[language];
  const isArabic = language === "AR";
  const displayLocale = isArabic ? "ar" : "en";

  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [newMode, setNewMode] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLeadId, setNewLeadId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const tasksResult = await getTasksAction();
        const dbTasks = tasksResult && "data" in tasksResult ? tasksResult.data : Array.isArray(tasksResult) ? tasksResult : [];
        const dbLeads = await getLeadsListAction();
        setTasks(dbTasks);
        setLeads(dbLeads);
        setSelectedId(dbTasks[0]?.id || null);
      } catch {
        toast.error(t.loadError);
      }
    }
    loadData();
  }, [t.loadError]);

  const formatNumber = (value: number | string) => (isArabic ? toArabicNumerals(value) : String(value));
  const formatPercent = (value: number) => `${formatNumber(value)}${isArabic ? "٪" : "%"}`;
  const formatDateTime = (value?: string | null) => {
    if (!value) return t.unknown;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t.unknown;
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${String(date.getFullYear()).slice(-2)} • ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const leadName = (task: any) => {
    const raw = `${task?.lead?.firstName || ""} ${task?.lead?.lastName || ""}`.trim();
    return raw ? displayPerson(raw, displayLocale, { route: "/operations/tasks" }) : t.unknown;
  };

  const priorityLabel = (priority?: string | null) => {
    if (priority === "HIGH") return t.high;
    if (priority === "URGENT") return t.urgent;
    if (priority === "LOW") return t.low;
    return t.medium;
  };

  const isOverdue = (task: any) => task.status !== "COMPLETED" && task.dueDate && new Date(task.dueDate).getTime() < Date.now();

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aDone = a.status === "COMPLETED";
      const bDone = b.status === "COMPLETED";
      if (aDone !== bDone) return aDone ? 1 : -1;
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
    });
  }, [tasks]);

  const filteredTasks = sortedTasks.filter((task) => {
    const haystack = `${cleanDisplayText(task.title, "")} ${leadName(task)}`.toLowerCase();
    const matchesSearch = haystack.includes(query.toLowerCase());
    const matchesFilter = filter === "ALL" || task.status === filter;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedTask = sortedTasks.find((task) => task.id === selectedId) || null;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (newMode) return;
    if (selectedId && filteredTasks.some((task) => task.id === selectedId)) return;
    setSelectedId(filteredTasks[0]?.id || null);
  }, [filteredTasks, newMode, selectedId]);

  const completedCount = tasks.filter((task) => task.status === "COMPLETED").length;
  const overdueCount = tasks.filter(isOverdue).length;
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  async function toggleTaskById(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const current = task.status;
    const next = current === "COMPLETED" ? "PENDING" : "COMPLETED";
    setTasks((currentTasks) => currentTasks.map((item) => (item.id === task.id ? { ...item, status: next } : item)));
    const result = await toggleTaskStatusAction(task.id, current);
    if (!result.success) {
      setTasks((currentTasks) => currentTasks.map((item) => (item.id === task.id ? { ...item, status: current } : item)));
    }
  }

  function openTask(taskId: string) {
    setNewMode(false);
    setSelectedId(taskId);
  }

  async function createTask() {
    if (!newTitle || !newLeadId || !newDueDate || !newDueTime || !newPriority) return;
    const dueDateOnly = parseDisplayDateToIso(newDueDate);
    if (!dueDateOnly) {
      toast.error(t.invalidDate);
      return;
    }

    const dueTimeOnly = parseDisplayTime(newDueTime);
    if (!dueTimeOnly) {
      toast.error(t.invalidTime);
      return;
    }

    const formData = new FormData();
    formData.append("title", newTitle);
    formData.append("leadId", newLeadId);
    formData.append("dueDateOnly", dueDateOnly);
    formData.append("dueTimeOnly", dueTimeOnly);
    formData.append("priority", newPriority);
    formData.append("description", newNotes);
    const result = await createTaskAction(formData);
    if (result.success) {
      toast.success(t.taskCreated);
      setNewTitle("");
      setNewLeadId("");
      setNewDueDate("");
      setNewDueTime("");
      setNewPriority("MEDIUM");
      setNewNotes("");
      setNewMode(false);
      const updated = await getTasksAction();
      const nextTasks = updated && "data" in updated ? updated.data : [];
      setTasks(nextTasks);
      setSelectedId(nextTasks[0]?.id || null);
    } else {
      toast.error(t.taskError);
    }
  }

  const displayTaskTitle = (task: any) => {
    const raw = String(task?.title || "").trim();
    const normalized = raw.toLowerCase();
    if (/بروشور|project brochure/.test(normalized)) return t.projectBrochure;
    if (/معاينة|property tour|viewing/.test(normalized)) return t.propertyTour;
    if (/كتيب|digital brochure|booklet/.test(normalized)) return t.digitalBrochure;
    if (/عرض السعر|quotation|price offer/.test(normalized)) return t.quotationFollowUp;
    if (/تحديث بيانات|update customer/.test(normalized)) return t.customerDataUpdate;
    if (/whatsapp lead/i.test(String(task?.lead?.firstName || "")) || /واتساب|whatsapp|\d{9,}/.test(normalized)) {
      const suffix = raw.match(/(\d{4})\d*$/)?.[1];
      return suffix ? `${t.whatsappFollowUp} ${formatNumber(suffix)}` : t.whatsappFollowUp;
    }
    const languageMismatch = language === "EN" ? /[\u0600-\u06FF]/.test(raw) : /^[\x00-\x7F\s]+$/.test(raw);
    return languageMismatch ? t.taskRecord : cleanDisplayText(raw, t.taskRecord);
  };

  const ownerName = (task: any) => {
    const raw = String(task?.assignedUser?.name || "").trim();
    return raw ? displayPerson(raw, displayLocale, { route: "/operations/tasks" }) : t.unknown;
  };

  const listItems: WorkspaceListItem[] = pageItems.map((task) => ({
    id: task.id,
    title: displayTaskTitle(task),
    snippet: leadName(task),
    timestamp: formatDateTime(task.dueDate),
    avatar: task.status === "COMPLETED" ? "✓" : "!",
    selected: task.id === selectedId && !newMode,
    badge: {
      label: task.status === "COMPLETED" ? t.done : t.pending,
      tone: task.status === "COMPLETED" ? "success" : isOverdue(task) ? "danger" : "warning",
    },
    onSelect: () => openTask(task.id),
    actions: [],
  }));

  const timeline: WorkspaceTimelineItem[] = selectedTask
    ? [
        {
          id: `${selectedTask.id}-notes`,
          body: cleanDisplayText(selectedTask.description || selectedTask.notes, t.noData),
          time: formatDateTime(selectedTask.dueDate),
          side: "neutral",
        },
      ]
    : [];

  const detail = newMode
    ? {
        avatar: "+",
        title: t.newLabel,
        meta: t.ordered,
        actions: [],
        context: [
          { label: t.customer, value: leads.find((lead) => lead.id === newLeadId)?.firstName || t.unknown },
          { label: t.owner, value: t.unknown },
          { label: t.priority, value: priorityLabel(newPriority) },
        ] as [{ label: string; value: string }, { label: string; value: string }, { label: string; value: string }],
        timeline: [] as WorkspaceTimelineItem[],
        emptyTitle: t.newLabel,
        emptyDescription: t.notes,
        composer: {
          mode: "note" as const,
          value: newNotes,
          bodyLabel: t.notes,
          placeholder: t.notes,
          sendLabel: t.saveTask,
          onChange: setNewNotes,
          onSend: createTask,
          disabled: !newTitle || !newLeadId || !parseDisplayDateToIso(newDueDate) || !parseDisplayTime(newDueTime),
          fields: [
            { id: "title", label: t.taskTitle, value: newTitle, placeholder: t.taskTitle, onChange: setNewTitle, required: true },
            {
              id: "lead",
              label: t.lead,
              value: newLeadId,
              placeholder: t.lead,
              onChange: setNewLeadId,
              type: "select" as const,
              required: true,
              options: leads.map((lead) => ({ value: lead.id, label: displayPerson(`${lead.firstName} ${lead.lastName || ""}`.trim(), displayLocale, { route: "/operations/tasks" }) })),
            },
            { id: "date", label: t.dueDate, value: newDueDate, placeholder: "DD-MM-YY", onChange: setNewDueDate, type: "text" as const, dir: "ltr" as const, required: true },
            { id: "time", label: t.dueTime, value: newDueTime, placeholder: "HH:mm", onChange: setNewDueTime, type: "text" as const, dir: "ltr" as const, required: true },
            {
              id: "priority",
              label: t.priority,
              value: newPriority,
              placeholder: t.priority,
              onChange: setNewPriority,
              type: "select" as const,
              required: true,
              options: [
                { value: "LOW", label: t.low },
                { value: "MEDIUM", label: t.medium },
                { value: "HIGH", label: t.high },
                { value: "URGENT", label: t.urgent },
              ],
            },
          ],
        },
      }
    : selectedTask
      ? {
          avatar: selectedTask.status === "COMPLETED" ? "✓" : "!",
          title: displayTaskTitle(selectedTask),
          meta: <span dir="ltr">{formatDateTime(selectedTask.dueDate)}</span>,
          actions: [
            {
              label: selectedTask.status === "COMPLETED" ? t.reopen : t.complete,
              icon: CheckCircle2,
              onClick: () => toggleTaskById(selectedTask.id),
            },
          ],
          context: [
            { label: t.customer, value: leadName(selectedTask) },
            { label: t.owner, value: ownerName(selectedTask) },
            { label: t.priority, value: priorityLabel(selectedTask.priority) },
          ] as [{ label: string; value: string }, { label: string; value: string }, { label: string; value: string }],
          timeline,
          emptyTitle: t.noData,
          emptyDescription: t.select,
        }
      : null;

  return (
    <UnifiedOperationsWorkspace
      module="tasks"
      language={language}
      title={t.title}
      description={t.description}
      kpis={[
        { label: t.total, value: formatNumber(tasks.length), icon: ListChecks },
        { label: t.overdue, value: formatNumber(overdueCount), icon: Clock },
        { label: t.completed, value: formatNumber(completedCount), icon: CheckCircle2 },
        { label: t.rate, value: formatPercent(completionRate), icon: Archive },
      ]}
      listTitle={t.listTitle}
      listSubtitle={`${t.ordered} · ${formatNumber(filteredTasks.length)} ${t.listTitle}`}
      newLabel={t.newLabel}
      onNew={() => {
        setNewMode(true);
        setSelectedId(null);
      }}
      searchValue={query}
      searchPlaceholder={t.search}
      onSearchChange={(value) => {
        setQuery(value);
        setPage(1);
      }}
      filterValue={filter}
      filterLabel={t.filter}
      filterOptions={[
        { value: "ALL", label: t.all },
        { value: "PENDING", label: t.pending },
        { value: "COMPLETED", label: t.done },
      ]}
      onFilterChange={(value) => {
        setFilter(value);
        setPage(1);
      }}
      items={listItems}
      pagination={{
        page: safePage,
        totalPages,
        onPrevious: () => setPage((current) => Math.max(1, current - 1)),
        onNext: () => setPage((current) => Math.min(totalPages, current + 1)),
      }}
      detail={detail}
      emptyDetailTitle={t.noData}
      emptyDetailDescription={t.select}
    />
  );
}
