"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Clock, Edit3, Eye, ListChecks, PlusCircle, UserPlus } from "lucide-react";
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
    edit: "تعديل",
    archive: "أرشفة",
    customer: "العميل",
    owner: "المسؤول",
    priority: "الأولوية",
    notePlaceholder: "أضف ملاحظة على المهمة...",
    saveNote: "حفظ الملاحظة",
    noteSaved: "تم حفظ الملاحظة محليًا",
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
    unknown: "غير محدد",
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
    edit: "Edit",
    archive: "Archive",
    customer: "Customer",
    owner: "Owner",
    priority: "Priority",
    notePlaceholder: "Add a task note...",
    saveNote: "Save note",
    noteSaved: "Note saved locally",
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
    unknown: "Not specified",
  },
};

export default function TasksView() {
  const { lang } = useApp();
  const language = lang === "EN" ? "EN" : "AR";
  const t = TEXT[language];
  const isArabic = language === "AR";
  const locale = isArabic ? "ar-SA" : "en-US";
  const displayLocale = isArabic ? "ar" : "en";

  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [note, setNote] = useState("");
  const [newMode, setNewMode] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLeadId, setNewLeadId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      const tasksResult = await getTasksAction();
      const dbTasks = tasksResult && "data" in tasksResult ? tasksResult.data : Array.isArray(tasksResult) ? tasksResult : [];
      const dbLeads = await getLeadsListAction();
      setTasks(dbTasks);
      setLeads(dbLeads);
      setSelectedId(dbTasks[0]?.id || null);
    }
    loadData();
  }, []);

  const formatNumber = (value: number | string) => (isArabic ? toArabicNumerals(value) : String(value));
  const formatPercent = (value: number) => `${formatNumber(value)}${isArabic ? "٪" : "%"}`;
  const formatDateTime = (value?: string | null) => {
    if (!value) return t.unknown;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t.unknown;
    return date.toLocaleString(locale, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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
    const haystack = `${task.title || ""} ${leadName(task)}`.toLowerCase();
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

  const completedCount = tasks.filter((task) => task.status === "COMPLETED").length;
  const overdueCount = tasks.filter(isOverdue).length;
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  async function toggleTask(task: any) {
    const current = task.status;
    const next = current === "COMPLETED" ? "PENDING" : "COMPLETED";
    setTasks((currentTasks) => currentTasks.map((item) => (item.id === task.id ? { ...item, status: next } : item)));
    const result = await toggleTaskStatusAction(task.id, current);
    if (!result.success) {
      setTasks((currentTasks) => currentTasks.map((item) => (item.id === task.id ? { ...item, status: current } : item)));
    }
  }

  async function createTask() {
    if (!newTitle || !newLeadId || !newDueDate || !newDueTime || !newPriority) return;
    const formData = new FormData();
    formData.append("title", newTitle);
    formData.append("leadId", newLeadId);
    formData.append("dueDateOnly", newDueDate);
    formData.append("dueTimeOnly", newDueTime);
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

  const listItems: WorkspaceListItem[] = pageItems.map((task) => ({
    id: task.id,
    title: task.title || t.noData,
    snippet: `${leadName(task)} · ${formatDateTime(task.dueDate)}`,
    timestamp: formatDateTime(task.dueDate),
    avatar: task.status === "COMPLETED" ? "✓" : "!",
    selected: task.id === selectedId && !newMode,
    badge: {
      label: task.status === "COMPLETED" ? t.done : t.pending,
      tone: task.status === "COMPLETED" ? "success" : isOverdue(task) ? "danger" : "warning",
    },
    onSelect: () => {
      setNewMode(false);
      setSelectedId(task.id);
    },
    actions: [
      { label: t.openDetails, icon: Eye, onClick: () => setSelectedId(task.id) },
      { label: t.complete, icon: CheckCircle2, onClick: () => toggleTask(task) },
      { label: t.edit, icon: Edit3, onClick: () => toast(t.edit) },
    ],
  }));

  const timeline: WorkspaceTimelineItem[] = selectedTask
    ? [
        { id: "title", body: selectedTask.title || t.noData, time: formatDateTime(selectedTask.dueDate), side: "neutral" },
        { id: "notes", body: selectedTask.description || selectedTask.notes || t.noData, side: "in" },
      ]
    : [];

  const detail = newMode
    ? {
        avatar: "+",
        title: t.newLabel,
        meta: t.ordered,
        actions: [
          { label: t.openDetails, icon: Eye, onClick: () => setNewMode(false) },
          { label: t.complete, icon: CheckCircle2, onClick: createTask },
          { label: t.edit, icon: Edit3, onClick: () => toast(t.edit) },
        ],
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
          placeholder: t.notes,
          sendLabel: t.saveTask,
          onChange: setNewNotes,
          onSend: createTask,
          disabled: !newTitle || !newLeadId || !newDueDate || !newDueTime,
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
              options: leads.map((lead) => ({ value: lead.id, label: `${lead.firstName} ${lead.lastName || ""}`.trim() })),
            },
            { id: "date", label: t.dueDate, value: newDueDate, placeholder: t.dueDate, onChange: setNewDueDate, type: "date" as const, required: true },
            { id: "time", label: t.dueTime, value: newDueTime, placeholder: t.dueTime, onChange: setNewDueTime, type: "time" as const, required: true },
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
              ],
            },
          ],
        },
      }
    : selectedTask
      ? {
          avatar: selectedTask.status === "COMPLETED" ? "✓" : "!",
          title: selectedTask.title || t.noData,
          meta: formatDateTime(selectedTask.dueDate),
          actions: [
            { label: t.openDetails, icon: Eye, onClick: () => undefined },
            { label: t.complete, icon: CheckCircle2, onClick: () => toggleTask(selectedTask) },
            { label: t.edit, icon: Edit3, onClick: () => toast(t.edit) },
          ],
          context: [
            { label: t.customer, value: leadName(selectedTask) },
            { label: t.owner, value: selectedTask.assignedUser?.name || t.unknown },
            { label: t.priority, value: priorityLabel(selectedTask.priority) },
          ] as [{ label: string; value: string }, { label: string; value: string }, { label: string; value: string }],
          timeline,
          emptyTitle: t.noData,
          emptyDescription: t.select,
          composer: {
            mode: "note" as const,
            value: note,
            placeholder: t.notePlaceholder,
            sendLabel: t.saveNote,
            onChange: setNote,
            onSend: () => {
              setNote("");
              toast.success(t.noteSaved);
            },
            disabled: !note.trim(),
          },
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
