"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Archive,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

import {
  createTaskAction,
  getLeadsListAction,
  getTasksAction,
  toggleTaskStatusAction,
  updateTaskAction,
} from "@/app/actions/tasks";
import { useApp } from "@/app/context/AppContext";
import SettingsSelect from "@/components/settings/SettingsSelect";
import { displayPerson } from "@/lib/display";
import { toArabicNumerals } from "@/lib/formatters";

const PAGE_SIZE = 5;

type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
type TaskStatus = "PENDING" | "COMPLETED" | "OVERDUE";
type EditorMode = "view" | "create" | "edit";

interface TaskRecord {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string | Date;
  priority: TaskPriority;
  status: TaskStatus;
  leadId: string;
  assignedTo: string;
  lead?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  assignedUser?: {
    id?: string;
    name?: string | null;
  } | null;
}

interface LeadOption {
  id: string;
  firstName: string;
  lastName?: string | null;
  assignedTo?: string | null;
  assignedUser?: {
    id?: string;
    name?: string | null;
  } | null;
}

interface UserOption {
  id: string;
  name: string;
  role?: string | null;
}

interface ComboboxOption {
  value: string;
  label: string;
  meta?: string;
}

const TEXT = {
  AR: {
    title: "المهام والتذكيرات",
    description: "إدارة المهام ومواعيد الاستحقاق وربطها بالعملاء والمسؤولين.",
    total: "إجمالي المهام",
    overdue: "المتأخرة",
    completed: "المكتملة",
    rate: "نسبة الإنجاز",
    listTitle: "المهام والتذكيرات",
    ordered: "غير المكتملة والمتأخرة أولًا",
    newLabel: "مهمة جديدة",
    editLabel: "تعديل المهمة",
    cancel: "إلغاء",
    search: "ابحث بعنوان المهمة أو العميل...",
    filter: "تصفية المهام",
    all: "الكل",
    pending: "قيد الانتظار",
    done: "مكتملة",
    complete: "إكمال",
    reopen: "إعادة فتح",
    customer: "العميل",
    owner: "المسؤول",
    priority: "الأولوية",
    noData: "لا توجد بيانات",
    noNotes: "لا توجد ملاحظات لهذه المهمة.",
    select: "اختر مهمة من القائمة لعرض تفاصيلها.",
    low: "منخفضة",
    medium: "متوسطة",
    high: "مرتفعة",
    taskTitle: "عنوان المهمة",
    lead: "العميل",
    customerSearch: "ابحث عن العميل...",
    ownerSearch: "ابحث عن المسؤول...",
    noCustomers: "لا يوجد عملاء مطابقون.",
    noOwners: "لا يوجد مسؤولون مطابقون.",
    dueDate: "تاريخ الاستحقاق",
    dueTime: "وقت الاستحقاق",
    notes: "ملاحظات",
    saveTask: "حفظ المهمة",
    updateTask: "حفظ التعديلات",
    taskCreated: "تم إنشاء المهمة بنجاح.",
    taskUpdated: "تم تحديث المهمة بنجاح.",
    taskCompleted: "تم إكمال المهمة.",
    taskReopened: "تمت إعادة فتح المهمة.",
    taskError: "تعذر حفظ المهمة.",
    statusError: "تعذر تحديث حالة المهمة.",
    invalidDateTime: "أدخل تاريخًا ووقتًا صالحين.",
    datePlaceholder: "DD/MM/YY",
    timePlaceholder: "HH:MM",
    unknown: "غير محدد",
    taskRecord: "متابعة عميل",
    projectBrochure: "إرسال بروشور المشروع",
    propertyTour: "تنسيق موعد المعاينة",
    digitalBrochure: "إرسال كتيب إلكتروني",
    quotationFollowUp: "متابعة العميل وإرسال عرض السعر",
    customerDataUpdate: "تحديث بيانات العميل",
    whatsappFollowUp: "متابعة واتساب",
    loadError: "تعذر تحميل المهام.",
    retry: "إعادة المحاولة",
    loading: "جاري تحميل المهام...",
  },
  EN: {
    title: "Tasks & reminders",
    description: "Manage tasks, due dates, customers, and assigned owners.",
    total: "Total tasks",
    overdue: "Overdue",
    completed: "Completed",
    rate: "Completion rate",
    listTitle: "Tasks & reminders",
    ordered: "Incomplete and overdue first",
    newLabel: "New task",
    editLabel: "Edit task",
    cancel: "Cancel",
    search: "Search by task title or customer...",
    filter: "Filter tasks",
    all: "All",
    pending: "Pending",
    done: "Completed",
    complete: "Complete",
    reopen: "Reopen",
    customer: "Customer",
    owner: "Owner",
    priority: "Priority",
    noData: "No data",
    noNotes: "No notes are available for this task.",
    select: "Select a task from the list to view its details.",
    low: "Low",
    medium: "Medium",
    high: "High",
    taskTitle: "Task title",
    lead: "Customer",
    customerSearch: "Search customers...",
    ownerSearch: "Search owners...",
    noCustomers: "No matching customers.",
    noOwners: "No matching owners.",
    dueDate: "Due date",
    dueTime: "Due time",
    notes: "Notes",
    saveTask: "Save task",
    updateTask: "Save changes",
    taskCreated: "Task created successfully.",
    taskUpdated: "Task updated successfully.",
    taskCompleted: "Task completed.",
    taskReopened: "Task reopened.",
    taskError: "Failed to save the task.",
    statusError: "Failed to update the task status.",
    invalidDateTime: "Enter a valid date and time.",
    datePlaceholder: "DD/MM/YY",
    timePlaceholder: "HH:MM",
    unknown: "Not specified",
    taskRecord: "Customer follow-up",
    projectBrochure: "Send project brochure",
    propertyTour: "Schedule property tour",
    digitalBrochure: "Send digital brochure",
    quotationFollowUp: "Follow up and send quotation",
    customerDataUpdate: "Update customer details",
    whatsappFollowUp: "WhatsApp follow-up",
    loadError: "Failed to load tasks.",
    retry: "Retry",
    loading: "Loading tasks...",
  },
};

function isTechnicalText(value: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    ) ||
    /(?:^|\b)(?:task|lead|user|ticket|email|message|id)_[a-z0-9_-]+(?:\b|$)/i.test(
      value,
    )
  );
}

function cleanDisplayText(value: unknown, fallback: string) {
  const raw = String(value || "").trim();
  if (!raw || isTechnicalText(raw)) return fallback;

  const cleaned = raw
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "",
    )
    .replace(/\b(?:TASK|LEAD|USER|TICKET|EMAIL|MESSAGE)_[A-Z0-9_]+\b/g, "")
    .replace(
      /\b(?:task|lead|user|ticket|email|message|id)_[a-z0-9_-]+\b/gi,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned || fallback;
}

function taskIsOverdue(task: TaskRecord) {
  if (task.status === "COMPLETED") return false;
  if (task.status === "OVERDUE") return true;

  const dueAt = new Date(task.dueDate).getTime();
  return Number.isFinite(dueAt) && dueAt < Date.now();
}

function toLatinDigits(value: string) {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const persian = "۰۱۲۳۴۵۶۷۸۹";

  return value
    .replace(/[٠-٩]/g, (digit) => String(arabic.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persian.indexOf(digit)));
}

function toDateFieldValue(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(
    date.getFullYear(),
  ).slice(-2)}`;
}

function toTimeFieldValue(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeDateField(value: string) {
  const digits = toLatinDigits(value).replace(/\D/g, "").slice(0, 6);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)]
    .filter(Boolean);
  return parts.join("/");
}

function normalizeTimeField(value: string) {
  const digits = toLatinDigits(value).replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

function parseTaskDateTime(dateValue: string, timeValue: string) {
  const dateMatch = toLatinDigits(dateValue).match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  const timeMatch = toLatinDigits(timeValue).match(/^(\d{2}):(\d{2})$/);

  if (!dateMatch || !timeMatch) return null;

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = 2000 + Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export default function TasksView() {
  const { lang } = useApp();
  const language = lang === "EN" ? "EN" : "AR";
  const t = TEXT[language];
  const isArabic = language === "AR";
  const displayLocale = isArabic ? "ar" : "en";

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [editorMode, setEditorMode] = useState<EditorMode>("view");
  const [newTitle, setNewTitle] = useState("");
  const [newLeadId, setNewLeadId] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("");
  const [newPriority, setNewPriority] =
    useState<TaskPriority>("MEDIUM");
  const [newNotes, setNewNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const loadData = useCallback(
    async (preferredTaskId?: string | null) => {
      setIsLoading(true);
      setLoadError("");

      try {
        const [tasksResult, leadsResult] = await Promise.all([
          getTasksAction(1, 100),
          getLeadsListAction(),
        ]);

        if (!tasksResult.success) {
          throw new Error(tasksResult.error || t.loadError);
        }

        if (!leadsResult.success) {
          throw new Error(leadsResult.error || t.loadError);
        }

        const nextTasks = tasksResult.data as TaskRecord[];
        const nextLeads = leadsResult.data as LeadOption[];
        const nextUsers = (leadsResult.users || []) as UserOption[];

        setTasks(nextTasks);
        setLeads(nextLeads);
        setUsers(nextUsers);
        setSelectedId((current) => {
          if (
            preferredTaskId &&
            nextTasks.some((task) => task.id === preferredTaskId)
          ) {
            return preferredTaskId;
          }

          if (current && nextTasks.some((task) => task.id === current)) {
            return current;
          }

          return nextTasks[0]?.id || null;
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : t.loadError;
        setLoadError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [t.loadError],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const formatNumber = (value: number | string) =>
    isArabic ? toArabicNumerals(value) : String(value);

  const formatPercent = (value: number) =>
    `${formatNumber(value)}${isArabic ? "٪" : "%"}`;

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return t.unknown;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t.unknown;

    const pad = (part: number) => String(part).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(
      date.getFullYear(),
    ).slice(-2)} • ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const leadName = (task: TaskRecord) => {
    const raw = `${task.lead?.firstName || ""} ${
      task.lead?.lastName || ""
    }`.trim();

    return raw
      ? displayPerson(raw, displayLocale, {
          route: "/operations/tasks",
        })
      : t.unknown;
  };

  const leadOptionName = (lead?: LeadOption | null) => {
    if (!lead) return t.unknown;

    const raw = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    return raw
      ? displayPerson(raw, displayLocale, {
          route: "/operations/tasks",
        })
      : t.unknown;
  };

  const ownerOptionName = (user?: UserOption | null) => {
    const raw = String(user?.name || "").trim();
    return raw
      ? displayPerson(raw, displayLocale, {
          route: "/operations/tasks",
        })
      : t.unknown;
  };

  const priorityLabel = (priority?: TaskPriority | null) => {
    if (priority === "HIGH") return t.high;
    if (priority === "LOW") return t.low;
    return t.medium;
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((left, right) => {
      const leftDone = left.status === "COMPLETED";
      const rightDone = right.status === "COMPLETED";

      if (leftDone !== rightDone) return leftDone ? 1 : -1;

      const leftOverdue = taskIsOverdue(left);
      const rightOverdue = taskIsOverdue(right);

      if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;

      return (
        new Date(left.dueDate).getTime() -
        new Date(right.dueDate).getTime()
      );
    });
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortedTasks.filter((task) => {
      const haystack = `${cleanDisplayText(
        task.title,
        "",
      )} ${leadName(task)}`.toLowerCase();

      const matchesSearch =
        !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesFilter =
        filter === "ALL" ||
        (filter === "OVERDUE"
          ? taskIsOverdue(task)
          : task.status === filter);

      return matchesSearch && matchesFilter;
    });
  }, [filter, query, sortedTasks]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTasks.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredTasks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const selectedTask =
    sortedTasks.find((task) => task.id === selectedId) || null;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (editorMode !== "view") return;

    if (
      selectedId &&
      filteredTasks.some((task) => task.id === selectedId)
    ) {
      return;
    }

    setSelectedId(filteredTasks[0]?.id || null);
  }, [editorMode, filteredTasks, selectedId]);

  const completedCount = tasks.filter(
    (task) => task.status === "COMPLETED",
  ).length;
  const overdueCount = tasks.filter(taskIsOverdue).length;
  const completionRate = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  function resetEditor() {
    setNewTitle("");
    setNewLeadId("");
    setNewAssignedTo("");
    setNewDueDate("");
    setNewDueTime("");
    setNewPriority("MEDIUM");
    setNewNotes("");
  }

  function beginCreate() {
    resetEditor();
    setEditorMode("create");
  }

  function beginEdit(task: TaskRecord) {
    setNewTitle(cleanDisplayText(task.title, ""));
    setNewLeadId(task.leadId || task.lead?.id || "");
    setNewAssignedTo(task.assignedTo || task.assignedUser?.id || "");
    setNewDueDate(toDateFieldValue(task.dueDate));
    setNewDueTime(toTimeFieldValue(task.dueDate));
    setNewPriority(
      task.priority === "LOW" || task.priority === "HIGH"
        ? task.priority
        : "MEDIUM",
    );
    setNewNotes(cleanDisplayText(task.description, ""));
    setEditorMode("edit");
  }

  function handleLeadChange(leadId: string) {
    setNewLeadId(leadId);
    const lead = leads.find((option) => option.id === leadId);
    const suggestedOwner = String(lead?.assignedTo || "").trim();

    if (suggestedOwner && users.some((user) => user.id === suggestedOwner)) {
      setNewAssignedTo(suggestedOwner);
    } else {
      setNewAssignedTo("");
    }
  }

  function cancelEditor() {
    resetEditor();
    setEditorMode("view");
    setSelectedId((current) => current || tasks[0]?.id || null);
  }

  async function completeTaskById(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || busyTaskId) return;
    if (task.status === "COMPLETED") return;

    setBusyTaskId(taskId);

    try {
      const result = await toggleTaskStatusAction(taskId);

      if (!result.success) {
        toast.error(result.error || t.statusError);
        return;
      }

      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === taskId
            ? {
                ...item,
                status: result.status as TaskStatus,
              }
            : item,
        ),
      );

      toast.success(
        result.status === "COMPLETED"
          ? t.taskCompleted
          : t.taskReopened,
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  function openTask(taskId: string) {
    setEditorMode("view");
    setSelectedId(taskId);
  }

  async function saveTask() {
    if (
      saving ||
      !newTitle.trim() ||
      !newLeadId ||
      !newAssignedTo ||
      !newDueDate ||
      !newDueTime
    ) {
      return;
    }

    const dueAt = parseTaskDateTime(newDueDate, newDueTime);
    if (!dueAt) {
      toast.error(t.invalidDateTime);
      return;
    }

    const formData = new FormData();
    formData.append("title", newTitle.trim());
    formData.append("leadId", newLeadId);
    formData.append("assignedTo", newAssignedTo);
    formData.append("dueAt", dueAt.toISOString());
    formData.append("priority", newPriority);
    formData.append("description", newNotes.trim());

    if (editorMode === "edit" && selectedTask) {
      formData.append("taskId", selectedTask.id);
    }

    setSaving(true);

    try {
      const result =
        editorMode === "edit"
          ? await updateTaskAction(formData)
          : await createTaskAction(formData);

      if (!result.success) {
        toast.error(result.error || t.taskError);
        return;
      }

      const savedTaskId = result.task.id;
      toast.success(
        editorMode === "edit" ? t.taskUpdated : t.taskCreated,
      );

      resetEditor();
      setEditorMode("view");
      await loadData(savedTaskId);
    } finally {
      setSaving(false);
    }
  }

  const displayTaskTitle = (task: TaskRecord) =>
    cleanDisplayText(task.title, t.taskRecord);

  const ownerName = (task: TaskRecord) => {
    const raw = String(task.assignedUser?.name || "").trim();

    return raw
      ? displayPerson(raw, displayLocale, {
          route: "/operations/tasks",
        })
      : t.unknown;
  };

  const leadOptions = leads.map((lead) => ({
    value: lead.id,
    label: leadOptionName(lead),
    meta: ownerOptionName(
      users.find((user) => user.id === lead.assignedTo) || null,
    ),
  }));
  const ownerOptions = users.map((user) => ({
    value: user.id,
    label: ownerOptionName(user),
  }));
  const editorTitle = editorMode === "edit" ? t.editLabel : t.newLabel;
  const editorOpen = editorMode !== "view";
  const visibleStart =
    filteredTasks.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const visibleEnd = Math.min(safePage * PAGE_SIZE, filteredTasks.length);
  const pendingCount = tasks.length - completedCount;

  const statusLabel = (task: TaskRecord) =>
    task.status === "COMPLETED"
      ? t.done
      : taskIsOverdue(task)
        ? t.overdue
        : t.pending;

  const statusClass = (task: TaskRecord) =>
    task.status === "COMPLETED"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : taskIsOverdue(task)
        ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  const priorityClass = (priority: TaskPriority) =>
    priority === "HIGH"
      ? "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      : priority === "LOW"
        ? "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
        : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";



  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className="nc-page nc-stack orca-container pb-4"
      data-tasks-property-workspace
    >
      <header className="orca-workspace-hero">
        <div>
          <p className="text-xs font-bold text-[var(--nc-accent)]">
            {isArabic
              ? "العميل ← المهمة ← موعد الاستحقاق ← الإنجاز"
              : "Customer → task → due date → completion"}
          </p>
          <h1 className="mt-1 text-2xl font-black">{t.title}</h1>
          <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">
            {t.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void loadData(selectedId)}
            disabled={isLoading}
            className="nc-btn nc-btn-ghost min-h-[44px] rounded-xl border border-[var(--nc-border)] px-4 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            {isArabic ? "تحديث" : "Refresh"}
          </button>

          <button
            type="button"
            onClick={beginCreate}
            className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-black"
          >
            <Plus size={16} />
            {t.newLabel}
          </button>
        </div>
      </header>

      <div className="orca-workspace-metrics">
        {[
          { label: t.total, value: formatNumber(tasks.length), icon: ListChecks },
          { label: t.overdue, value: formatNumber(overdueCount), icon: Clock },
          {
            label: t.completed,
            value: formatNumber(completedCount),
            icon: CheckCircle2,
          },
          { label: t.rate, value: formatPercent(completionRate), icon: Archive },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="orca-workspace-metric min-h-[96px]">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--nc-text-secondary)]">
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <strong className="mt-3 block text-2xl">{value}</strong>
          </div>
        ))}
      </div>

      <div className="orca-workspace-note flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="text-[var(--nc-text-secondary)]">
          {isArabic ? "المهام المفتوحة" : "Open tasks"}:
        </span>
        <strong>{formatNumber(pendingCount)}</strong>
        <span className="text-[var(--nc-border)]">|</span>
        <span className="text-[var(--nc-text-secondary)]">
          {isArabic ? "النتائج المطابقة" : "Matching results"}:
        </span>
        <strong>{formatNumber(filteredTasks.length)}</strong>
        <span className="text-[var(--nc-border)]">|</span>
        <span className="text-[var(--nc-text-secondary)]">{t.ordered}</span>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-700 dark:text-rose-200"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadData(selectedId)}
            className="nc-btn nc-btn-ghost min-h-[44px] rounded-xl border border-rose-500/30 px-4 text-xs font-black"
          >
            {t.retry}
          </button>
        </div>
      ) : null}

      <div
        dir="ltr"
        className="grid min-w-0 gap-3 lg:grid-cols-[340px_minmax(0,1fr)]"
        data-four-page-two-card-workspace
      >
        <aside
          dir={isArabic ? "rtl" : "ltr"}
          className="orca-workspace-panel flex min-w-0 flex-col overflow-hidden lg:h-[520px]"
          data-operational-list-card
        >
          <div className="orca-workspace-toolbar border-b border-[var(--nc-border)] p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
              <label className="relative min-w-0">
                <Search
                  size={16}
                  className={`absolute top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)] ${
                    isArabic ? "right-3" : "left-3"
                  }`}
                />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t.search}
                  className={`min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] py-2.5 text-sm outline-none focus:border-[var(--nc-accent-border)] ${
                    isArabic ? "pl-3 pr-10" : "pl-10 pr-3"
                  }`}
                />
              </label>

              <SettingsSelect
                value={filter}
                onChange={(value) => {
                  setFilter(value);
                  setPage(1);
                }}
                aria-label={t.filter}
                options={[
                  { value: "ALL", label: t.all },
                  { value: "PENDING", label: t.pending },
                  { value: "OVERDUE", label: t.overdue },
                  { value: "COMPLETED", label: t.done },
                ]}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isLoading && tasks.length === 0 ? (
              <div className="flex h-full min-h-[220px] items-center justify-center gap-2 text-sm text-[var(--nc-text-secondary)]">
                <Loader2
                  size={18}
                  className="animate-spin text-[var(--nc-accent)]"
                />
                {t.loading}
              </div>
            ) : pageItems.length === 0 ? (
              <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] p-6 text-center text-sm text-[var(--nc-text-secondary)]">
                {t.noData}
              </div>
            ) : (
              <div className="space-y-2">
                {pageItems.map((task) => {
                  const selected =
                    task.id === selectedId && editorMode === "view";

                  return (
                    <button
                      key={task.id}
                      type="button"
                      data-task-row
                      aria-pressed={selected}
                      onClick={() => openTask(task.id)}
                      className={`group flex h-[68px] w-full items-center gap-3 rounded-2xl border px-3 text-start outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-border)] ${
                        selected
                          ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]"
                          : "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-accent)]"
                      }`}
                    >
                      <span
                        className={`h-9 w-1 shrink-0 rounded-full ${
                          task.status === "COMPLETED"
                            ? "bg-emerald-500/70"
                            : taskIsOverdue(task)
                              ? "bg-rose-500/70"
                              : "bg-amber-500/70"
                        }`}
                        aria-hidden="true"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <strong className="truncate text-sm">
                            {displayTaskTitle(task)}
                          </strong>
                          <time
                            dir="ltr"
                            className="shrink-0 text-[11px] text-[var(--nc-text-dim)]"
                          >
                            {formatDateTime(task.dueDate)}
                          </time>
                        </span>

                        <span className="mt-1 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-[var(--nc-text-secondary)]">
                            {leadName(task)}
                          </span>
                          <span
                            className={`inline-flex min-w-[72px] shrink-0 justify-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass(
                              task,
                            )}`}
                          >
                            {statusLabel(task)}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="orca-workspace-pagination flex min-h-[56px] items-center justify-between gap-2 border-t border-[var(--nc-border)] px-3 py-2 text-xs text-[var(--nc-text-secondary)]">
            <span>
              {isArabic
                ? `${formatNumber(visibleStart)}–${formatNumber(
                    visibleEnd,
                  )} من ${formatNumber(filteredTasks.length)}`
                : `${visibleStart}–${visibleEnd} of ${filteredTasks.length}`}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                disabled={safePage <= 1}
                className="nc-btn nc-btn-ghost min-h-[44px] min-w-[44px] rounded-xl border border-[var(--nc-border)] px-3 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isArabic ? "الصفحة السابقة" : "Previous page"}
              >
                {isArabic ? (
                  <ChevronRight size={17} />
                ) : (
                  <ChevronLeft size={17} />
                )}
              </button>

              <span className="min-w-12 text-center font-bold text-[var(--nc-text-primary)]">
                {formatNumber(safePage)} / {formatNumber(totalPages)}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={safePage >= totalPages}
                className="nc-btn nc-btn-ghost min-h-[44px] min-w-[44px] rounded-xl border border-[var(--nc-border)] px-3 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isArabic ? "الصفحة التالية" : "Next page"}
              >
                {isArabic ? (
                  <ChevronLeft size={17} />
                ) : (
                  <ChevronRight size={17} />
                )}
              </button>
            </div>
          </div>
        </aside>

        <section
          dir={isArabic ? "rtl" : "ltr"}
          className="orca-workspace-panel flex min-w-0 flex-col overflow-hidden lg:h-[520px]"
          data-operational-detail-card
        >
          {selectedTask ? (
            <>
              <header className="flex min-h-[78px] shrink-0 items-center justify-between gap-3 border-b border-[var(--nc-border)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--nc-accent)]">
                    {statusLabel(selectedTask)}
                  </p>
                  <h2 className="mt-1 truncate text-lg font-black">
                    {displayTaskTitle(selectedTask)}
                  </h2>
                  <p
                    className="mt-1 text-xs text-[var(--nc-text-secondary)]"
                    dir="ltr"
                  >
                    {formatDateTime(selectedTask.dueDate)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => beginEdit(selectedTask)}
                    disabled={busyTaskId === selectedTask.id}
                    className="nc-btn nc-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil size={15} />
                    <span className="hidden sm:inline">{t.editLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void completeTaskById(selectedTask.id)}
                    disabled={
                      busyTaskId === selectedTask.id ||
                      selectedTask.status === "COMPLETED"
                    }
                    className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyTaskId === selectedTask.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    <span className="hidden sm:inline">{t.complete}</span>
                  </button>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="orca-info-cell min-h-[64px]">
                    <span>{t.customer}</span>
                    <strong className="truncate">{leadName(selectedTask)}</strong>
                  </div>
                  <div className="orca-info-cell min-h-[64px]">
                    <span>{t.owner}</span>
                    <strong className="truncate">{ownerName(selectedTask)}</strong>
                  </div>
                  <div className="orca-info-cell min-h-[64px]">
                    <span>{t.priority}</span>
                    <strong>{priorityLabel(selectedTask.priority)}</strong>
                  </div>

                  <article className="sm:col-span-3 rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-3">
                    <p className="mb-2 text-xs font-bold text-[var(--nc-text-secondary)]">
                      {t.notes}
                    </p>
                    <p className="whitespace-pre-wrap leading-7 text-[var(--nc-text-primary)]">
                      {cleanDisplayText(selectedTask.description, t.noNotes)}
                    </p>
                  </article>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center p-6 text-center text-sm text-[var(--nc-text-secondary)]">
              {t.select}
            </div>
          )}
        </section>
      </div>

      {editorOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="orca-dialog-overlay"
              data-task-editor-overlay
              style={{
                alignItems: "start",
                justifyItems: "center",
                paddingTop: "5.5rem",
                paddingBottom: "1rem",
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-editor-title"
                className="orca-dialog max-w-[680px]"
                style={{ maxHeight: "calc(100dvh - 6.5rem)" }}
              >
            <div className="orca-dialog-header">
              <div>
                <p className="text-xs font-bold text-[var(--nc-accent)]">
                  {isArabic ? "المهام والتذكيرات" : "Tasks & reminders"}
                </p>
                <h2 id="task-editor-title" className="mt-1 text-lg font-black">
                  {editorTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={cancelEditor}
                disabled={saving}
                className="orca-dialog-close min-h-[44px] min-w-[44px]"
                aria-label={t.cancel}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void saveTask();
              }}
              className="orca-dialog-body grid gap-3 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <TaskField label={t.taskTitle}>
                  <input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  required
                  className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none focus:border-[var(--nc-accent-border)]"
                  />
                </TaskField>
              </div>

              <TaskField label={t.lead}>
                <TaskCombobox
                  value={newLeadId}
                  onChange={handleLeadChange}
                  options={leadOptions}
                  placeholder={t.customerSearch}
                  emptyText={t.noCustomers}
                  ariaLabel={t.lead}
                />
              </TaskField>

              <TaskField label={t.owner}>
                <TaskCombobox
                  value={newAssignedTo}
                  onChange={setNewAssignedTo}
                  options={ownerOptions}
                  placeholder={t.ownerSearch}
                  emptyText={t.noOwners}
                  ariaLabel={t.owner}
                />
              </TaskField>

              <TaskField label={t.priority}>
                <SettingsSelect
                  value={newPriority}
                  onChange={(value) =>
                    setNewPriority(value as TaskPriority)
                  }
                  options={[
                    { value: "LOW", label: t.low },
                    { value: "MEDIUM", label: t.medium },
                    { value: "HIGH", label: t.high },
                  ]}
                />
              </TaskField>

              <TaskField label={t.dueDate}>
                <TaskDateInput
                  value={newDueDate}
                  onChange={setNewDueDate}
                  placeholder={t.datePlaceholder}
                  isArabic={isArabic}
                />
              </TaskField>

              <TaskField label={t.dueTime}>
                <TaskTimeInput
                  value={newDueTime}
                  onChange={setNewDueTime}
                  placeholder={t.timePlaceholder}
                  isArabic={isArabic}
                />
              </TaskField>

              <div className="sm:col-span-2">
                <TaskField label={t.notes}>
                  <textarea
                    rows={3}
                    value={newNotes}
                    onChange={(event) => setNewNotes(event.target.value)}
                    className="orca-form-textarea min-h-[96px] w-full resize-none rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 outline-none focus:border-[var(--nc-accent-border)]"
                  />
                </TaskField>
              </div>

              <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={cancelEditor}
                  disabled={saving}
                  className="nc-btn nc-btn-ghost min-h-[44px] rounded-xl border border-[var(--nc-border)] px-4 font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !newTitle.trim() ||
                    !newLeadId ||
                    !newAssignedTo ||
                    !newDueDate ||
                    !newDueTime
                  }
                  className="nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 font-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  {editorMode === "edit" ? t.updateTask : t.saveTask}
                </button>
              </div>
            </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function TaskDateInput({
  value,
  onChange,
  placeholder,
  isArabic,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isArabic: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const options = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);

      const weekday = new Intl.DateTimeFormat(
        isArabic ? "ar-SA-u-ca-gregory" : "en-GB",
        { weekday: "short" },
      ).format(date);

      return {
        value: toDateFieldValue(date),
        label:
          index === 0
            ? isArabic
              ? "اليوم"
              : "Today"
            : index === 1
              ? isArabic
                ? "غدًا"
                : "Tomorrow"
              : weekday,
      };
    });
  }, [isArabic]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative" data-task-date-field>
      <input
        type="text"
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) =>
          onChange(normalizeDateField(event.target.value))
        }
        placeholder={placeholder}
        maxLength={8}
        required
        className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-12 py-2.5 text-center font-mono outline-none placeholder:text-[var(--nc-text-muted)] focus:border-[var(--nc-accent-border)]"
      />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={isArabic ? "اختيار تاريخ الاستحقاق" : "Choose due date"}
        aria-expanded={open}
        aria-controls={popoverId}
        className="absolute start-0.5 top-1/2 grid min-h-[44px] min-w-[44px] -translate-y-1/2 place-items-center rounded-lg text-[var(--nc-text-secondary)] transition hover:bg-[var(--nc-surface-soft)] hover:text-[var(--nc-text-primary)]"
        data-task-date-trigger
      >
        <CalendarDays size={16} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={popoverId}
          role="listbox"
          aria-label={isArabic ? "تواريخ مقترحة" : "Suggested dates"}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 grid max-h-60 grid-cols-2 gap-1 overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-2 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-task-date-popover
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`min-h-[44px] rounded-lg border px-3 py-2 text-start transition ${
                option.value === value
                  ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)]"
                  : "border-transparent hover:bg-[var(--nc-surface-soft)]"
              }`}
            >
              <span className="block text-xs font-bold">{option.label}</span>
              <span className="mt-0.5 block font-mono text-[11px] text-[var(--nc-text-secondary)]">
                {option.value}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskTimeInput({
  value,
  onChange,
  placeholder,
  isArabic,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isArabic: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const options = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => {
        const hour = Math.floor(index / 2);
        const minute = index % 2 === 0 ? "00" : "30";
        return `${String(hour).padStart(2, "0")}:${minute}`;
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative" data-task-time-field>
      <input
        type="text"
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) =>
          onChange(normalizeTimeField(event.target.value))
        }
        placeholder={placeholder}
        maxLength={5}
        required
        className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-12 py-2.5 text-center font-mono outline-none placeholder:text-[var(--nc-text-muted)] focus:border-[var(--nc-accent-border)]"
      />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={isArabic ? "اختيار وقت الاستحقاق" : "Choose due time"}
        aria-expanded={open}
        aria-controls={popoverId}
        className="absolute start-0.5 top-1/2 grid min-h-[44px] min-w-[44px] -translate-y-1/2 place-items-center rounded-lg text-[var(--nc-text-secondary)] transition hover:bg-[var(--nc-surface-soft)] hover:text-[var(--nc-text-primary)]"
        data-task-time-trigger
      >
        <Clock size={16} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={popoverId}
          role="listbox"
          aria-label={isArabic ? "أوقات مقترحة" : "Suggested times"}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 grid max-h-56 grid-cols-4 gap-1 overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-2 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-task-time-popover
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`min-h-[44px] rounded-lg border px-2 font-mono text-xs transition ${
                option === value
                  ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)]"
                  : "border-transparent hover:bg-[var(--nc-surface-soft)]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block space-y-1.5">
      <span className="block text-xs font-bold text-[var(--nc-text-secondary)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function TaskCombobox({
  value,
  onChange,
  options,
  placeholder,
  emptyText,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  emptyText: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) || null;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleOptions = options.filter((option) => {
    if (!normalizedSearch) return true;
    return `${option.label} ${option.meta || ""}`
      .toLocaleLowerCase()
      .includes(normalizedSearch);
  });

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  function choose(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={rootRef} className="relative" data-task-searchable-combobox>
      <div className="relative">
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--nc-text-secondary)]"
        />
        <input
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          value={open ? search : selected?.label || ""}
          placeholder={placeholder}
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setSearch("");
            }
            if (event.key === "Enter" && visibleOptions.length === 1) {
              event.preventDefault();
              choose(visibleOptions[0]);
            }
          }}
          className="min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-10 py-2.5 text-sm font-bold outline-none focus:border-[var(--nc-accent-border)]"
        />
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setOpen((current) => !current);
          }}
          className="absolute end-0.5 top-1/2 grid min-h-[44px] min-w-[44px] -translate-y-1/2 place-items-center rounded-lg text-[var(--nc-text-secondary)] hover:bg-[var(--nc-surface-soft)]"
          aria-label={ariaLabel}
          tabIndex={-1}
        >
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-1 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visibleOptions.length > 0 ? (
            visibleOptions.map((option) => {
              const selectedOption = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selectedOption}
                  onClick={() => choose(option)}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                    selectedOption
                      ? "bg-[var(--nc-accent-soft)] text-[var(--nc-text-primary)]"
                      : "hover:bg-[var(--nc-surface-soft)]"
                  }`}
                >
                  <span className="min-w-0">
                    <strong className="block truncate">{option.label}</strong>
                    {option.meta ? (
                      <span className="block truncate text-[10px] text-[var(--nc-text-muted)]">
                        {option.meta}
                      </span>
                    ) : null}
                  </span>
                  {selectedOption ? (
                    <Check size={15} className="shrink-0 text-[var(--nc-accent)]" />
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-4 text-center text-xs text-[var(--nc-text-secondary)]">
              {emptyText}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
