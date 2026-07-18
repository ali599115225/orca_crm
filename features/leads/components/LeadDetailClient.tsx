"use client";

// Official lead detail page. Tabs: overview, communication & activity,
// tasks, tours, opportunities, offers, history. Status change, assignment,
// edit, and archive are permission-gated (re-verified on the server).
// `status` is the single source of truth; raw enums and raw server errors
// are never rendered.
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Mail,
  MessageCircle,
  Pencil,
  UserRound,
  Search,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  ListTodo,
  Phone,
  X,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { toast } from "@/app/context/ToastContext";
import { sendEmailAction } from "@/app/actions/email";
import {
  archiveLeadAction,
  assignLeadAction,
  getAssignableUsersAction,
  restoreLeadAction,
  recordLeadWhatsAppActivityAction,
  updateLeadStatusAction,
  type AssignableUser,
  type LeadDetailData,
} from "@/app/actions/leads";
import {
  LEAD_STATUS_VALUES,
  isLeadsManagerRole,
  isLeadsWriterRole,
  type LeadStatusValue,
} from "@/lib/leads/model";
import { displayEnum, displayGeo, displayPerson } from "@/lib/display";
import type { DisplayLocale } from "@/lib/display";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/display/dateTime";
import { formatNumber } from "@/components/leads/helpers";
import SettingsSelect from "@/components/settings/SettingsSelect";
import {
  activityTypeLabel,
  leadHistoryActionLabel,
  leadsCopy,
  opportunityStatusLabel,
  localizeEmailProviderError,
  localizeLeadError,
  localizeSystemLeadActivityDescription,
  localizeSystemLeadTaskTitle,
  taskStatusLabel,
} from "@/features/leads/copy/leadsCopy";
import LeadFormDialog from "@/features/leads/components/LeadFormDialog";
import LeadListPager from "@/features/leads/components/LeadListPager";
import { leadStatusTone, leadVisual, taskStatusTone } from "@/features/leads/visual";

const LEAD_DETAIL_PAGE_SIZE = 5;

type DetailTab =
  | "overview"
  | "communication"
  | "tasks"
  | "tours"
  | "opportunities"
  | "offers"
  | "history";


function normalizeSaudiWhatsAppPhone(value: string): string | null {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("9660")) digits = `966${digits.slice(4)}`;
  if (digits.startsWith("05") && digits.length === 10) {
    digits = `966${digits.slice(1)}`;
  } else if (digits.startsWith("5") && digits.length === 9) {
    digits = `966${digits}`;
  }

  return /^9665\d{8}$/.test(digits) ? digits : null;
}

interface LeadDetailClientProps {
  lead: LeadDetailData;
  viewerRole: string;
  viewerUserId: string;
}

export default function LeadDetailClient({ lead, viewerRole, viewerUserId }: LeadDetailClientProps) {
  const router = useRouter();
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const displayLocale: DisplayLocale = isArabic ? "ar" : "en";
  const labels = isArabic ? leadsCopy.ar : leadsCopy.en;
  const direction: "rtl" | "ltr" = isArabic ? "rtl" : "ltr";
  const langKey: "ar" | "en" = isArabic ? "ar" : "en";

  const canWrite = isLeadsWriterRole(viewerRole);
  const canManage = isLeadsManagerRole(viewerRole);

  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [statusSaving, setStatusSaving] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveSaving, setArchiveSaving] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [restoreSaving, setRestoreSaving] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState(lead.email || "");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [whatsAppSending, setWhatsAppSending] = useState(false);
  const [whatsAppError, setWhatsAppError] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [communicationPage, setCommunicationPage] = useState(1);
  const [tasksPage, setTasksPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [communicationSearch, setCommunicationSearch] = useState("");
  const [communicationKind, setCommunicationKind] = useState<"all" | "email" | "activity">("all");
  const [conversationKind, setConversationKind] = useState<"all" | "email" | "call" | "whatsapp" | "message">("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(lead.tasks[0]?.id || null);
  const [tourSearch, setTourSearch] = useState("");
  const [selectedTourId, setSelectedTourId] = useState<string | null>(lead.tours[0]?.id || null);
  const [updatingTourId, setUpdatingTourId] = useState<string | null>(null);
  const [tourActionError, setTourActionError] = useState("");
  const [opportunitySearch, setOpportunitySearch] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(
    lead.opportunities[0]?.id || null,
  );
  const [offerSearch, setOfferSearch] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [offerActionError, setOfferActionError] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyCategory, setHistoryCategory] = useState<
    "all" | "communication" | "tours" | "deals" | "data" | "system"
  >("all");
  const [historyPeriod, setHistoryPeriod] = useState<"all" | "7" | "30" | "90">("all");

  const pageRootRef = useRef<HTMLElement | null>(null);

  // Hide the layout's vertical scrollbar only while the lead detail page is
  // mounted (scrolling stays fully functional). The actual scroller is an
  // ancestor owned by the shared layout, so it is tagged at runtime instead
  // of editing shared files; the tag is removed on unmount.
  useEffect(() => {
    const node = pageRootRef.current;
    if (!node) return;
    let scroller: HTMLElement | null = null;
    let parent = node.parentElement;
    while (parent) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        scroller = parent;
        break;
      }
      parent = parent.parentElement;
    }
    if (!scroller) return;
    scroller.setAttribute("data-leads-hide-scrollbar", "true");
    scroller.style.setProperty("scrollbar-width", "none");
    return () => {
      scroller.removeAttribute("data-leads-hide-scrollbar");
      scroller.style.removeProperty("scrollbar-width");
    };
  }, []);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    void getAssignableUsersAction().then((users) => {
      if (!cancelled) setAssignableUsers(users);
    });
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  const leadName = `${lead.firstName} ${lead.lastName || ""}`.trim();
  const leadInitials = leadName
    ? leadName.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("")
    : "?";
  const shortDate = (d: Date | string | null | undefined): string => {
    if (!d) return labels.notSpecified;
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) return labels.notSpecified;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };
  const shortDateTime = (d: Date | string | null | undefined): string => {
    if (!d) return labels.notSpecified;
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) return labels.notSpecified;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yy} \u2022 ${hh}:${min}`;
  };
  const totalOffers = lead.opportunities.reduce((s, o) => s + o.offers.length, 0);
  const allOffers = useMemo(
    () =>
      lead.opportunities
        .flatMap((o) => o.offers)
        .sort((a, b) => ((a.createdAt || "") < (b.createdAt || "") ? 1 : -1)),
    [lead.opportunities],
  );
  const recentOffers = allOffers.slice(0, 3);
  const recentTours = lead.tours.slice(0, 3);
  const normalizedWhatsAppPhone = normalizeSaudiWhatsAppPhone(lead.phone);
  const whatsAppFallbackUrl = normalizedWhatsAppPhone
    ? `https://wa.me/${normalizedWhatsAppPhone}?text=${encodeURIComponent(
        whatsAppMessage.trim(),
      )}`
    : null;

  const tabs: Array<{ id: DetailTab; label: string; count?: number }> = [
    { id: "overview", label: labels.overviewTab },
    {
      id: "communication",
      label: labels.communicationTab,
      count: lead.emailMessages.length + lead.leadActivities.length,
    },
    { id: "tasks", label: labels.tasks, count: lead.tasks.length },
    { id: "tours", label: labels.tours, count: lead.tours.length },
    { id: "opportunities", label: labels.opportunities, count: lead.opportunities.length },
    {
      id: "offers",
      label: labels.offers,
      count: lead.opportunities.reduce((sum, opportunity) => sum + opportunity.offers.length, 0),
    },
    { id: "history", label: labels.historyTab, count: lead.history.length },
  ];

  const statusOptions = useMemo(
    () =>
      LEAD_STATUS_VALUES.map((value) => ({
        value,
        label: displayEnum(value, "leadStatus", displayLocale),
      })),
    [displayLocale],
  );

  const assigneeOptions = useMemo(
    () => [
      { value: "", label: labels.unassigned },
      ...assignableUsers.map((user) => ({ value: user.id, label: user.name })),
    ],
    [assignableUsers, labels.unassigned],
  );

  const timeline = useMemo(() => {
    const emails = lead.emailMessages.map((message) => ({
      kind: "email" as const,
      id: `email-${message.id}`,
      at: message.sentAt || message.createdAt,
      message,
    }));
    const activities = lead.leadActivities.map((activity) => ({
      kind: "activity" as const,
      id: `activity-${activity.id}`,
      at: activity.createdAt,
      activity,
    }));
    return [...emails, ...activities].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [lead.emailMessages, lead.leadActivities]);

  const filteredTimeline = useMemo(() => {
    const query = communicationSearch.trim().toLowerCase();
    return timeline.filter((entry) => {
      if (communicationKind !== "all" && entry.kind !== communicationKind) return false;
      if (!query) return true;
      const haystack =
        entry.kind === "email"
          ? `${entry.message.subject || ""} ${entry.message.to || ""} ${entry.message.status || ""}`
          : `${entry.activity.activityType || ""} ${entry.activity.description || ""} ${entry.activity.userName || ""}`;
      return haystack.toLowerCase().includes(query);
    });
  }, [timeline, communicationKind, communicationSearch]);

  // Conversations panel: communications only (email, calls, WhatsApp,
  // messages/SMS). Notes and generic events never appear here.
  type ConversationChannel = "email" | "call" | "whatsapp" | "message";
  const conversationChannel = (entry: (typeof timeline)[number]): ConversationChannel | null => {
    if (entry.kind === "email") return "email";
    const type = String(entry.activity.activityType || "").toUpperCase();
    if (type.includes("CALL")) return "call";
    if (type.includes("WHATSAPP")) return "whatsapp";
    if (type.includes("SMS") || type.includes("MESSAGE")) return "message";
    return null;
  };

  const conversationBase = useMemo(
    () => filteredTimeline.filter((entry) => conversationChannel(entry) !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTimeline],
  );

  const conversationCounts = useMemo(() => {
    const counts: Record<ConversationChannel, number> = { email: 0, call: 0, whatsapp: 0, message: 0 };
    for (const entry of conversationBase) {
      const channel = conversationChannel(entry);
      if (channel) counts[channel] += 1;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationBase]);

  const conversationTimeline = useMemo(
    () =>
      conversationKind === "all"
        ? conversationBase
        : conversationBase.filter((entry) => conversationChannel(entry) === conversationKind),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationBase, conversationKind],
  );
  const communicationTotalPages = Math.max(
    1,
    Math.ceil(filteredTimeline.length / LEAD_DETAIL_PAGE_SIZE),
  );
  const tasksTotalPages = Math.max(
    1,
    Math.ceil(lead.tasks.length / LEAD_DETAIL_PAGE_SIZE),
  );
  // History tab: read-only classification of audit actions into display
  // categories. TOUR is checked before STATUS so tour-status events land
  // under tours, not data updates.
  type HistoryCategory = "communication" | "tours" | "deals" | "data" | "system";
  const historyCategoryOf = (action: string): HistoryCategory => {
    const a = String(action || "").toUpperCase();
    if (a.includes("WHATSAPP") || a.includes("CONTACT") || a.includes("EMAIL")) return "communication";
    if (a.includes("TOUR")) return "tours";
    if (a.includes("OFFER") || a.includes("OPPORTUNITY") || a.includes("CONTRACT")) return "deals";
    if (a.includes("STATUS") || a.includes("UPDATED") || a.includes("ASSIGNED") || a.includes("MOVE")) return "data";
    return "system";
  };

  // Audit-log `details` may hold technical payloads (fixture keys such as
  // "X_V1:history:offer-accepted", JSON blobs, UUIDs). These must never be
  // rendered: known event keys map to human wording, anything else technical
  // falls back to a generic readable description.
  const historyDetailsText = (
    entry: LeadDetailData["history"][number],
  ): string => {
    const raw = String(entry.details || "").trim();
    if (!raw) return labels.notSpecified;

    const knownEventDescriptions: Array<{ match: RegExp; ar: string; en: string }> = [
      { match: /offer-?accept/i, ar: "تم قبول العرض", en: "Offer accepted" },
      { match: /offer-?sent/i, ar: "تم إرسال العرض", en: "Offer sent" },
      { match: /offer-?creat/i, ar: "تم إنشاء عرض", en: "Offer created" },
      { match: /offer-?cancel|offer-?reject/i, ar: "تم إلغاء العرض", en: "Offer cancelled" },
      { match: /tour-?schedul/i, ar: "تمت جدولة جولة", en: "Tour scheduled" },
      { match: /tour-?complet/i, ar: "تم إكمال الجولة", en: "Tour completed" },
      { match: /tour-?cancel/i, ar: "تم إلغاء الجولة", en: "Tour cancelled" },
      { match: /tour/i, ar: "تحديث على الجولة", en: "Tour updated" },
      { match: /task-?creat/i, ar: "تم إنشاء مهمة", en: "Task created" },
      { match: /task-?complet/i, ar: "تم إكمال المهمة", en: "Task completed" },
      { match: /task/i, ar: "تحديث على المهمة", en: "Task updated" },
      { match: /opportunity-?creat/i, ar: "تم إنشاء فرصة", en: "Opportunity created" },
      { match: /opportunity/i, ar: "تحديث على الفرصة", en: "Opportunity updated" },
      { match: /status/i, ar: "تم تغيير الحالة", en: "Status changed" },
      { match: /assign/i, ar: "تم تحديث الإسناد", en: "Assignment updated" },
      { match: /whatsapp/i, ar: "تم إرسال رسالة واتساب", en: "WhatsApp message sent" },
      { match: /email|mail/i, ar: "تم إرسال بريد إلكتروني", en: "Email sent" },
      { match: /call/i, ar: "تم تسجيل مكالمة", en: "Call logged" },
      { match: /note/i, ar: "تمت إضافة ملاحظة", en: "Note added" },
      { match: /lead-?creat|created/i, ar: "تم تسجيل العميل", en: "Lead created" },
      { match: /archiv/i, ar: "تمت أرشفة العميل", en: "Lead archived" },
      { match: /contract/i, ar: "تحديث على العقد", en: "Contract updated" },
    ];

    const looksTechnical =
      /^[\[{"]/.test(raw) ||
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(raw) ||
      (/^[A-Za-z0-9_.:\-\/]+$/.test(raw) && /[:_]/.test(raw));

    if (!looksTechnical) return raw;

    for (const candidate of knownEventDescriptions) {
      if (candidate.match.test(raw)) return isArabic ? candidate.ar : candidate.en;
    }
    return isArabic ? "حدث ضمن سجل العميل" : "Lead record event";
  };

  const historyCounts = useMemo(() => {
    const counts: Record<HistoryCategory, number> = {
      communication: 0,
      tours: 0,
      deals: 0,
      data: 0,
      system: 0,
    };
    for (const entry of lead.history) counts[historyCategoryOf(entry.action)] += 1;
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.history]);

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    const minDate =
      historyPeriod === "all"
        ? null
        : Date.now() - Number(historyPeriod) * 24 * 60 * 60 * 1000;
    return lead.history.filter((entry) => {
      if (historyCategory !== "all" && historyCategoryOf(entry.action) !== historyCategory) return false;
      if (minDate) {
        const at = new Date(entry.createdAt).getTime();
        if (!Number.isNaN(at) && at < minDate) return false;
      }
      if (!query) return true;
      const haystack = `${leadHistoryActionLabel(entry.action, langKey)} ${historyDetailsText(entry)} ${entry.userName || ""}`;
      return haystack.toLowerCase().includes(query);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.history, historySearch, historyCategory, historyPeriod, langKey]);

  const historyTotalPages = Math.max(
    1,
    Math.ceil(filteredHistory.length / LEAD_DETAIL_PAGE_SIZE),
  );

  const safeCommunicationPage = Math.min(
    communicationPage,
    communicationTotalPages,
  );
  const safeTasksPage = Math.min(tasksPage, tasksTotalPages);
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);

  const visibleTimeline = filteredTimeline.slice(
    (safeCommunicationPage - 1) * LEAD_DETAIL_PAGE_SIZE,
    safeCommunicationPage * LEAD_DETAIL_PAGE_SIZE,
  );
  const visibleTasks = lead.tasks.slice(
    (safeTasksPage - 1) * LEAD_DETAIL_PAGE_SIZE,
    safeTasksPage * LEAD_DETAIL_PAGE_SIZE,
  );
  const visibleHistory = filteredHistory.slice(
    (safeHistoryPage - 1) * LEAD_DETAIL_PAGE_SIZE,
    safeHistoryPage * LEAD_DETAIL_PAGE_SIZE,
  );

  const filteredTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase();
    if (!query) return lead.tasks;
    return lead.tasks.filter((task) =>
      `${task.title || ""} ${task.description || ""} ${task.assignedUserName || ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [lead.tasks, taskSearch]);

  const selectedTask =
    lead.tasks.find((task) => task.id === selectedTaskId) ||
    lead.tasks[0] ||
    null;

  const taskStatusKey = (task: LeadDetailData["tasks"][number]) =>
    String(task.status || "").toUpperCase();

  const isCompletedTask = (task: LeadDetailData["tasks"][number]) => {
    const status = taskStatusKey(task);
    return status.includes("COMPLETED") || status.includes("DONE");
  };

  const isOverdueTask = (task: LeadDetailData["tasks"][number]) => {
    if (isCompletedTask(task) || !task.dueDate) return false;
    const due = new Date(task.dueDate);
    return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
  };

  // Only three supported buckets: pending, completed, overdue. Any
  // non-completed, non-overdue task (including legacy statuses) is pending.
  const taskBuckets = [
    {
      id: "pending",
      label: isArabic ? "معلقة" : "Pending",
      tasks: filteredTasks.filter((task) => !isCompletedTask(task) && !isOverdueTask(task)),
    },
    {
      id: "completed",
      label: isArabic ? "مكتملة" : "Completed",
      tasks: filteredTasks.filter((task) => isCompletedTask(task)),
    },
    {
      id: "overdue",
      label: isArabic ? "متأخرة" : "Overdue",
      tasks: filteredTasks.filter((task) => isOverdueTask(task)),
    },
  ];

  // Display-only status label/tone: overdue is derived, IN_PROGRESS is not supported.
  const displayTaskStatus = (task: LeadDetailData["tasks"][number]): { label: string; tone: string } => {
    if (isOverdueTask(task)) {
      return {
        label: isArabic ? "متأخرة" : "Overdue",
        tone: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
      };
    }
    if (isCompletedTask(task)) {
      return { label: taskStatusLabel("COMPLETED", langKey), tone: taskStatusTone("COMPLETED") };
    }
    return { label: taskStatusLabel("PENDING", langKey), tone: taskStatusTone("PENDING") };
  };

  // ── Tours tab (list + details, real lead.tours data only) ────────────────
  const tourStatusToneClass = (status?: string | null): string => {
    switch (String(status || "").toUpperCase()) {
      case "COMPLETED":
        return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
      case "CANCELLED":
        return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
      case "FOLLOW_UP":
        return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
      default:
        return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    }
  };

  const filteredTours = useMemo(() => {
    const query = tourSearch.trim().toLowerCase();
    if (!query) return lead.tours;
    return lead.tours.filter((tour) =>
      `${tour.location || ""} ${displayEnum(tour.status, "tourStatus", displayLocale)}`
        .toLowerCase()
        .includes(query),
    );
  }, [lead.tours, tourSearch, displayLocale]);

  const selectedTour =
    lead.tours.find((tour) => tour.id === selectedTourId) ||
    lead.tours[0] ||
    null;

  // ── Unit identity directory (existing /api/properties endpoint) ──────────
  // Opportunities/offers only carry unitId; readable identity (project ·
  // unit number) comes from the same endpoint EngagementTabs already used.
  const [unitDirectory, setUnitDirectory] = useState<
    Map<string, { label: string; type: string | null }>
  >(new Map());

  useEffect(() => {
    const needsUnits = lead.opportunities.some(
      (opportunity) => opportunity.unitId || opportunity.offers.some((offer) => offer.unitId),
    );
    if (!needsUnits) return;
    let cancelled = false;
    void fetch("/api/properties")
      .then((response) => response.json())
      .then((json) => {
        if (cancelled || !json?.success || !Array.isArray(json.data)) return;
        const directory = new Map<string, { label: string; type: string | null }>();
        for (const unit of json.data) {
          const project =
            typeof unit.project === "string" ? unit.project : unit.project?.name || "";
          const parts = [project, unit.unitNumber].filter(
            (part: string) => part && part !== "\u2014",
          );
          directory.set(unit.id, {
            label: parts.join(" \u00b7 "),
            type: unit.type && unit.type !== "\u2014" ? String(unit.type) : null,
          });
        }
        setUnitDirectory(directory);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lead.opportunities]);

  const unitLabelOf = (unitId: string | null | undefined): string | null => {
    if (!unitId) return null;
    return unitDirectory.get(unitId)?.label || null;
  };
  const unitTypeOf = (unitId: string | null | undefined): string | null => {
    if (!unitId) return null;
    return unitDirectory.get(unitId)?.type || null;
  };

  const opportunityIdentity = (
    opportunity: LeadDetailData["opportunities"][number],
  ): string => unitLabelOf(opportunity.unitId) || labels.notSpecified;

  const offerIdentity = (
    offer: LeadDetailData["opportunities"][number]["offers"][number],
  ): string => {
    const unit = unitLabelOf(offer.unitId);
    if (!unit) return labels.notSpecified;
    return isArabic ? `عرض ${unit}` : `Offer \u2014 ${unit}`;
  };

  // ── Opportunities tab (list + details, real lead.opportunities only) ─────
  const opportunityStatusToneClass = (status?: string | null): string => {
    const normalized = String(status || "").toUpperCase();
    if (normalized.includes("WON")) {
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    }
    if (normalized.includes("LOST") || normalized.includes("CANCELLED")) {
      return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
    }
    if (
      normalized.includes("NEGOTIATION") ||
      normalized.includes("OFFERED") ||
      normalized.includes("PROPOSAL")
    ) {
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    }
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  };

  const filteredOpportunities = useMemo(() => {
    const query = opportunitySearch.trim().toLowerCase();
    if (!query) return lead.opportunities;
    return lead.opportunities.filter((opportunity) =>
      `${opportunityIdentity(opportunity)} ${unitTypeOf(opportunity.unitId) || ""} ${opportunityStatusLabel(opportunity.status, langKey)} ${opportunity.value} ${shortDate(opportunity.closeDate)}`
        .toLowerCase()
        .includes(query),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.opportunities, opportunitySearch, langKey, unitDirectory]);

  const selectedOpportunity =
    lead.opportunities.find((opportunity) => opportunity.id === selectedOpportunityId) ||
    lead.opportunities[0] ||
    null;

  // ── Offers tab (list + details, offers flattened from opportunities) ─────
  const offerStatusToneClass = (status?: string | null): string => {
    switch (String(status || "").toUpperCase()) {
      case "ACCEPTED":
        return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
      case "REJECTED":
        return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
      default:
        return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    }
  };

  const offerLinkedOpportunityLabel = (
    offer: LeadDetailData["opportunities"][number]["offers"][number],
  ): string | null => {
    const opportunity = lead.opportunities.find(
      (candidate) =>
        candidate.id === offer.linkedOpportunityId ||
        candidate.offers.some((candidateOffer) => candidateOffer.id === offer.id),
    );
    if (!opportunity) return null;
    const identity = opportunityIdentity(opportunity);
    return identity === labels.notSpecified ? null : identity;
  };

  const filteredOffers = useMemo(() => {
    const query = offerSearch.trim().toLowerCase();
    if (!query) return allOffers;
    return allOffers.filter((offer) =>
      `${offerIdentity(offer)} ${unitLabelOf(offer.unitId) || ""} ${displayEnum(offer.status, "offerStatus", displayLocale)} ${offer.price} ${shortDate(offer.validUntil)}`
        .toLowerCase()
        .includes(query),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOffers, offerSearch, displayLocale, unitDirectory]);

  const selectedOffer =
    allOffers.find((offer) => offer.id === selectedOfferId) ||
    allOffers[0] ||
    null;

  const englishMoney = (value: number): string =>
    Number(value || 0).toLocaleString("en-US");

  useEffect(() => {
    setCommunicationPage((current) =>
      Math.min(current, communicationTotalPages),
    );
  }, [communicationTotalPages]);

  useEffect(() => {
    setCommunicationPage(1);
  }, [communicationKind, communicationSearch]);

  useEffect(() => {
    if (lead.tasks.length === 0) {
      setSelectedTaskId(null);
      return;
    }
    if (!lead.tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(lead.tasks[0].id);
    }
  }, [lead.tasks, selectedTaskId]);

  useEffect(() => {
    if (lead.tours.length === 0) {
      setSelectedTourId(null);
      return;
    }
    if (!lead.tours.some((tour) => tour.id === selectedTourId)) {
      setSelectedTourId(lead.tours[0].id);
    }
  }, [lead.tours, selectedTourId]);

  useEffect(() => {
    if (lead.opportunities.length === 0) {
      setSelectedOpportunityId(null);
      return;
    }
    if (!lead.opportunities.some((opportunity) => opportunity.id === selectedOpportunityId)) {
      setSelectedOpportunityId(lead.opportunities[0].id);
    }
  }, [lead.opportunities, selectedOpportunityId]);

  useEffect(() => {
    if (allOffers.length === 0) {
      setSelectedOfferId(null);
      return;
    }
    if (!allOffers.some((offer) => offer.id === selectedOfferId)) {
      setSelectedOfferId(allOffers[0].id);
    }
  }, [allOffers, selectedOfferId]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyCategory, historyPeriod]);

  useEffect(() => {
    setTasksPage((current) => Math.min(current, tasksTotalPages));
  }, [tasksTotalPages]);

  useEffect(() => {
    setHistoryPage((current) => Math.min(current, historyTotalPages));
  }, [historyTotalPages]);

  const handleStatusChange = async (nextStatus: LeadStatusValue) => {
    if (!canWrite || nextStatus === lead.status) return;
    setStatusSaving(true);
    const result = await updateLeadStatusAction(lead.id, nextStatus);
    setStatusSaving(false);
    if (!result.success) {
      toast.error(localizeLeadError(result, langKey));
      return;
    }
    toast.success(labels.statusUpdated);
    router.refresh();
  };

  const handleAssign = async (userId: string) => {
    if (!canManage) return;
    setAssignSaving(true);
    const result = await assignLeadAction(lead.id, userId || null);
    setAssignSaving(false);
    if (!result.success) {
      toast.error(localizeLeadError(result, langKey));
      return;
    }
    toast.success(labels.assignUpdated);
    router.refresh();
  };

  const handleArchive = async () => {
    setArchiveError("");
    if (!archiveReason.trim()) {
      setArchiveError(labels.archiveReasonPlaceholder);
      return;
    }
    setArchiveSaving(true);
    const result = await archiveLeadAction(lead.id, archiveReason);
    setArchiveSaving(false);
    if (!result.success) {
      setArchiveError(localizeLeadError(result, langKey));
      return;
    }
    setShowArchiveDialog(false);
    toast.success(labels.leadArchivedMsg);
    router.refresh();
  };

  const handleRestore = async () => {
    setRestoreSaving(true);
    const result = await restoreLeadAction(lead.id);
    setRestoreSaving(false);
    if (!result.success) {
      toast.error(localizeLeadError(result, langKey));
      return;
    }
    toast.success(labels.leadRestoredMsg);
    router.refresh();
  };

  const handleSendEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!emailTo || !emailSubject || !emailBody) return;

    setEmailSending(true);
    setEmailError("");
    const formData = new FormData();
    formData.append("to", emailTo);
    formData.append("subject", emailSubject);
    formData.append("textBody", emailBody);
    formData.append("leadId", lead.id);
    const result = await sendEmailAction(formData);
    setEmailSending(false);

    if (result.success) {
      toast.success(labels.emailSent);
      setShowEmailModal(false);
      setEmailSubject("");
      setEmailBody("");
      setEmailError("");
      router.refresh();
    } else {
      const message = localizeEmailProviderError(result.error, langKey);
      setEmailError(message);
      toast.error(message);
    }
  };

  const handleSendWhatsApp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = whatsAppMessage.trim();

    if (!normalizedWhatsAppPhone) {
      setWhatsAppError(
        isArabic
          ? "رقم الجوال غير صالح لمراسلة واتساب."
          : "The phone number is not valid for WhatsApp.",
      );
      return;
    }
    if (!message) {
      setWhatsAppError(
        isArabic ? "اكتب نص الرسالة أولاً." : "Enter a message first.",
      );
      return;
    }

    try {
      setWhatsAppSending(true);
      setWhatsAppError("");
      const response = await fetch("/api/v1/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: normalizedWhatsAppPhone,
          message,
        }),
      });

      const raw = await response.text();
      let payload: any = {};
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        payload = {};
      }

      if (!response.ok || payload.success === false) {
        throw new Error("WHATSAPP_SEND_FAILED");
      }

      await recordLeadWhatsAppActivityAction(lead.id, "SENT", message);
      toast.success(
        isArabic ? "تم إرسال رسالة واتساب." : "WhatsApp message sent.",
      );
      setShowWhatsAppModal(false);
      setWhatsAppMessage("");
      router.refresh();
    } catch {
      setWhatsAppError(
        isArabic
          ? "تعذر الإرسال عبر ربط واتساب. استخدم الفتح المباشر."
          : "WhatsApp integration could not send. Use direct WhatsApp.",
      );
    } finally {
      setWhatsAppSending(false);
    }
  };

  const handleWhatsAppFallback = () => {
    const message = whatsAppMessage.trim();
    if (!message || !whatsAppFallbackUrl) return;
    void recordLeadWhatsAppActivityAction(lead.id, "OPENED", message).then(
      (result) => {
        if (result.success) router.refresh();
      },
    );
    setShowWhatsAppModal(false);
    setWhatsAppMessage("");
    setWhatsAppError("");
  };

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title || !canWrite) return;

    try {
      setTaskSaving(true);
      setTaskError("");
      const response = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          title,
          description: taskDescription.trim() || undefined,
          priority: "MEDIUM",
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error("TASK_CREATE_FAILED");
      }

      setTaskTitle("");
      setTaskDescription("");
      setShowTaskForm(false);
      toast.success(isArabic ? "تم إنشاء المهمة." : "Task created.");
      router.refresh();
    } catch {
      setTaskError(isArabic ? "تعذر إنشاء المهمة." : "Failed to create task.");
    } finally {
      setTaskSaving(false);
    }
  };

  // Same official endpoint LeadToursPanel uses; no API change.
  const handleUpdateTourStatus = async (
    tourId: string,
    status: "COMPLETED" | "CANCELLED" | "FOLLOW_UP",
  ) => {
    if (!canWrite || updatingTourId || lead.isArchived) return;
    try {
      setUpdatingTourId(tourId);
      setTourActionError("");
      const response = await fetch(`/api/v1/tours/${tourId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error("TOUR_STATUS_FAILED");
      }
      toast.success(isArabic ? "تم تحديث حالة الجولة." : "Tour status updated.");
      router.refresh();
    } catch {
      setTourActionError(isArabic ? "تعذر تحديث حالة الجولة." : "Failed to update tour status.");
    } finally {
      setUpdatingTourId(null);
    }
  };

  // Same official endpoint EngagementTabs used for accepting an offer.
  const handleAcceptOffer = async (offerId: string, unitId: string | null) => {
    if (!canWrite || !unitId || acceptingOfferId || lead.isArchived) return;
    try {
      setAcceptingOfferId(offerId);
      setOfferActionError("");
      const response = await fetch(`/api/v1/offers/${offerId}/accept`, {
        method: "POST",
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error("OFFER_ACCEPT_FAILED");
      }
      toast.success(isArabic ? "تم قبول العرض." : "Offer accepted.");
      router.refresh();
    } catch {
      setOfferActionError(isArabic ? "تعذر قبول العرض." : "Failed to accept the offer.");
    } finally {
      setAcceptingOfferId(null);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!canWrite || completingTaskId) return;

    try {
      setCompletingTaskId(taskId);
      setTaskError("");
      const response = await fetch(`/api/v1/tasks/${taskId}/complete`, {
        method: "PATCH",
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error("TASK_COMPLETE_FAILED");
      }

      toast.success(isArabic ? "تم إكمال المهمة." : "Task completed.");
      router.refresh();
    } catch {
      setTaskError(isArabic ? "تعذر إكمال المهمة." : "Failed to complete task.");
    } finally {
      setCompletingTaskId(null);
    }
  };

  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const infoCardClass = `${leadVisual.softPanel} p-4 sm:p-5`;
  const infoLabelClass = leadVisual.label;
  const infoValueClass = leadVisual.value;
  const selectClass = leadVisual.select;
  const inputClass = leadVisual.input;
  const renderEmptyState = (message: string) => (
    <div className="flex h-[140px] items-center justify-center rounded-lg border border-dashed border-[var(--nc-border)] text-xs font-medium text-[var(--nc-text-secondary)]">
      {message}
    </div>
  );

  return (
    <section ref={pageRootRef} dir={direction} className={leadVisual.page}>
      {/* Scoped rule for the tagged layout scroller (Chromium/WebKit). */}
      <style>{`[data-leads-hide-scrollbar]::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
      <div className={leadVisual.pageStack}>
        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => router.push("/operations/leads")}
            className={leadVisual.secondaryButton}
          >
            <BackIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {labels.back}
          </button>
          <div className="flex flex-wrap items-center gap-1.5">
            {canManage && !lead.isArchived && (
              <button
                type="button"
                onClick={() => {
                  setArchiveReason("");
                  setArchiveError("");
                  setShowArchiveDialog(true);
                }}
                className={leadVisual.dangerGhostButton}
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                {labels.archiveAction}
              </button>
            )}
            {canManage && lead.isArchived && (
              <button
                type="button"
                onClick={() => void handleRestore()}
                disabled={restoreSaving}
                className={leadVisual.primaryButton}
              >
                <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" />
                {restoreSaving ? labels.saving : labels.restoreAction}
              </button>
            )}
            {canWrite && !lead.isArchived && (
              <>
                <SettingsSelect
                  aria-label={labels.changeStatus}
                  value={lead.status}
                  disabled={statusSaving}
                  onChange={(value) => void handleStatusChange(value as LeadStatusValue)}
                  options={statusOptions}
                  className={selectClass}
                />
                <button
                  type="button"
                  onClick={() => {
                    setWhatsAppError("");
                    setWhatsAppMessage("");
                    setShowWhatsAppModal(true);
                  }}
                  className={leadVisual.ghostButton}
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {isArabic ? "واتساب" : "WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailError("");
                    setShowEmailModal(true);
                  }}
                  className={leadVisual.ghostButton}
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {labels.sendEmail}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditDialog(true)}
                  className={leadVisual.primaryButton}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  {labels.editAction}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Summary Card */}
        <div className={`${leadVisual.softPanel} mx-3 p-4 sm:mx-4`}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-black text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
              {leadInitials}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold text-[var(--nc-text-primary)] sm:text-lg">
                <bdi dir="auto">{leadName || lead.phone}</bdi>
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold leading-none ${leadStatusTone(lead.status)}`}>
                  {displayEnum(lead.status, "leadStatus", displayLocale)}
                </span>
                {lead.isArchived && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold leading-none text-amber-700 dark:text-amber-300">
                    <Archive className="h-3 w-3" aria-hidden="true" />
                    {labels.archivedBadge}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--nc-border)] pt-3 text-xs sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <p className="font-medium text-[var(--nc-text-secondary)]">{labels.phoneLabel}</p>
              <p className="mt-0.5 font-bold text-[var(--nc-text-primary)]"><bdi dir="ltr" className="tabular-nums">{lead.phone}</bdi></p>
            </div>
            <div>
              <p className="font-medium text-[var(--nc-text-secondary)]">{labels.emailLabel}</p>
              <p className="mt-0.5 break-all font-bold text-[var(--nc-text-primary)]">{lead.email ? <bdi dir="ltr">{lead.email}</bdi> : labels.notSpecified}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--nc-text-secondary)]">{labels.city}</p>
              <p className="mt-0.5 font-bold text-[var(--nc-text-primary)]">{displayGeo(lead.city, "city", displayLocale, { route: "/operations/leads" })}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--nc-text-secondary)]">{labels.source}</p>
              <p className="mt-0.5 font-bold text-[var(--nc-text-primary)]">{displayEnum(lead.source, "leadSource", displayLocale)}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--nc-text-secondary)]">{labels.assignAction}</p>
              {canManage && !lead.isArchived ? (
                <SettingsSelect
                  aria-label={labels.assignAction}
                  value={lead.assignedTo || ""}
                  disabled={assignSaving}
                  onChange={(value) => void handleAssign(value)}
                  options={assigneeOptions}
                  className={`${selectClass} mt-0.5`}
                />
              ) : (
                <p className="mt-0.5 font-bold text-[var(--nc-text-primary)]">
                  <bdi dir="auto">{lead.assignedUser ? displayPerson(lead.assignedUser.name, displayLocale, { route: "/operations/leads" }) : labels.unassigned}</bdi>
                </p>
              )}
            </div>
            <div>
              <p className="font-medium text-[var(--nc-text-secondary)]">{labels.registrationDate}</p>
              <p className="mt-0.5 font-bold text-[var(--nc-text-primary)]"><bdi dir="ltr">{shortDate(lead.createdAt)}</bdi></p>
            </div>
            <div>
              <p className="font-medium text-[var(--nc-text-secondary)]">{labels.lastContact}</p>
              <p className="mt-0.5 font-bold text-[var(--nc-text-primary)]"><bdi dir="ltr">{shortDate(lead.lastContactedAt)}</bdi></p>
            </div>
            <div>
              <p className="font-medium text-[var(--nc-text-secondary)]">{labels.scoreLabel}</p>
              <p className="mt-0.5 font-bold text-[var(--nc-text-primary)]"><bdi dir="ltr">{lead.leadScore}/100</bdi></p>
            </div>
          </div>

          {lead.isArchived && (
            <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
              <p>{labels.archivedInfo}</p>
              <p className="mt-0.5">
                {lead.archivedByName ? (<>{labels.archivedBy}: <bdi dir="auto">{lead.archivedByName}</bdi></>) : null}
                {lead.archivedAt ? ` · ${formatDisplayDateTime(lead.archivedAt)}` : null}
              </p>
              {lead.archiveReason && (<p className="mt-0.5">{labels.archiveReasonShown}: {lead.archiveReason}</p>)}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className={leadVisual.workspacePanel}>
          <div className="relative">
            <div
              className={leadVisual.workspaceTabs}
              data-leads-hide-scrollbar
              style={{ scrollbarWidth: "none" }}
              role="tablist"
              aria-label={labels.title}
            >
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      active ? leadVisual.activeTab : leadVisual.tab
                    }
                  >
                    {tab.label}
                    {typeof tab.count === "number" && tab.count > 0
                      ? ` (${formatNumber(tab.count, isArabic)})`
                      : ""}
                  </button>
                );
              })}
            </div>
            <div
              className={`pointer-events-none absolute inset-y-0 z-10 w-8 lg:hidden ${
                isArabic ? "left-0 bg-gradient-to-l" : "right-0 bg-gradient-to-r"
              } from-transparent to-[var(--nc-surface-solid)]`}
              aria-hidden="true"
            />
          </div>

          <div className="p-4">
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* Row 1: Tasks | Activity | Customer Info  (RTL: rightmost first) */}
                <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-[4fr_5fr_3fr]">
                  {/* Upcoming Tasks */}
                  <div className={`${leadVisual.softPanel} p-3`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[var(--nc-text-primary)]">{isArabic ? "المهام القادمة" : "Upcoming Tasks"}</h3>
                      {lead.tasks.length > 0 && (
                        <button type="button" onClick={() => setActiveTab("tasks")} className="text-[11px] font-bold text-[var(--nc-accent)]">
                          {isArabic ? "عرض الكل" : "View all"}
                        </button>
                      )}
                    </div>
                    {lead.tasks.length === 0 ? (
                      <div className="mt-2 flex h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--nc-border)]">
                        <Pencil className="h-8 w-8 text-[var(--nc-text-dim)]" aria-hidden="true" />
                        <p className="text-xs font-medium text-[var(--nc-text-secondary)]">{isArabic ? "لا يوجد مهام قادمة" : "No upcoming tasks"}</p>
                        {canWrite && !lead.isArchived && (
                          <button type="button" onClick={() => { setActiveTab("tasks"); setShowTaskForm(true); }} className="text-[11px] font-bold text-[var(--nc-accent)]">
                            {isArabic ? "إضافة مهمة جديدة" : "Add new task"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {lead.tasks.slice(0, 4).map((task) => (
                          <div key={task.id} className="flex items-start justify-between gap-2 rounded-md border border-[var(--nc-border)] px-2 py-1.5">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[var(--nc-text-primary)]">
                                {localizeSystemLeadTaskTitle(task.title, langKey)}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[var(--nc-text-secondary)]">
                                <bdi dir="ltr">{shortDateTime(task.dueDate)}</bdi>
                              </p>
                            </div>
                            <span className={`shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${taskStatusTone(task.status)}`}>
                              {taskStatusLabel(task.status, langKey)}
                            </span>
                          </div>
                        ))}
                        {canWrite && !lead.isArchived && (
                          <button
                            type="button"
                            onClick={() => { setActiveTab("tasks"); setShowTaskForm(true); }}
                            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-[var(--nc-accent)]/40 py-1.5 text-[11px] font-bold text-[var(--nc-accent)]"
                          >
                            + {isArabic ? "مهمة جديدة" : "New task"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recent Activity */}
                  <div className={`${leadVisual.softPanel} p-3`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[var(--nc-text-primary)]">{isArabic ? "النشاط الأخير" : "Recent Activity"}</h3>
                      {timeline.length > 0 && (
                        <button type="button" onClick={() => setActiveTab("communication")} className="text-[11px] font-bold text-[var(--nc-accent)]">
                          {isArabic ? "عرض الكل" : "View all"}
                        </button>
                      )}
                    </div>
                    {timeline.length === 0 ? (
                      <div className="mt-2 flex h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--nc-border)]">
                        <MessageCircle className="h-8 w-8 text-[var(--nc-text-dim)]" aria-hidden="true" />
                        <p className="text-xs font-medium text-[var(--nc-text-secondary)]">{isArabic ? "لا يوجد نشاط متاح" : "No activity yet"}</p>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2.5">
                        {timeline.slice(0, 5).map((entry) => (
                          <div key={entry.id} className="flex items-start gap-2">
                            <span className="mt-0.5 shrink-0 text-[var(--nc-text-dim)]">
                              {entry.kind === "email" ? <Mail className="h-3.5 w-3.5" aria-hidden="true" /> : <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-[var(--nc-text-primary)]">
                                {entry.kind === "email" ? entry.message.subject : localizeSystemLeadActivityDescription(entry.activity.description, langKey)}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[var(--nc-text-secondary)]">
                                <bdi dir="ltr">{shortDateTime(entry.at)}</bdi>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Needs & Preferences */}
                  <div className={`${leadVisual.softPanel} p-3 md:col-span-2 lg:col-span-1`}>
                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-[var(--nc-text-primary)]">
                      <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                      {isArabic ? "احتياجات وتفضيلات العميل" : "Customer Needs & Preferences"}
                    </h3>
                    {lead.project?.name ? (
                      <div className="mt-2 space-y-2 text-xs">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="shrink-0 font-medium text-[var(--nc-text-secondary)]">{labels.projectInfo}</span>
                          <span className="text-end font-bold text-[var(--nc-text-primary)]">
                            <bdi dir="auto">{lead.project.name}</bdi>
                          </span>
                        </div>
                        {lead.project.id && (
                          <button
                            type="button"
                            onClick={() => router.push(`/operations/projects?projectId=${encodeURIComponent(lead.project!.id)}&leadId=${encodeURIComponent(lead.id)}`)}
                            className={`${leadVisual.secondaryButton} w-full justify-center`}
                          >
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            {isArabic ? "فتح المشروع" : "Open project"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 flex h-[120px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--nc-border)]">
                        <UserRound className="h-8 w-8 text-[var(--nc-text-dim)]" aria-hidden="true" />
                        <p className="px-2 text-center text-xs font-medium text-[var(--nc-text-secondary)]">
                          {isArabic ? "لا توجد احتياجات عقارية إضافية مسجلة" : "No additional property needs recorded"}
                        </p>
                      </div>
                    )}
                  </div>                </div>

                {/* Row 2: Tours | Offers  (RTL: rightmost first) */}
                <div className="grid items-stretch gap-4 md:grid-cols-2">
                  {/* Upcoming Tours */}
                  <div className={`${leadVisual.softPanel} p-3`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[var(--nc-text-primary)]">{isArabic ? "الجولات القادمة" : "Upcoming Tours"}</h3>
                      {lead.tours.length > 0 && (
                        <button type="button" onClick={() => setActiveTab("tours")} className="text-[11px] font-bold text-[var(--nc-accent)]">
                          {isArabic ? "عرض الكل" : "View all"}
                        </button>
                      )}
                    </div>
                    {recentTours.length === 0 ? (
                      <div className="mt-2 flex h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--nc-border)]">
                        <ExternalLink className="h-8 w-8 text-[var(--nc-text-dim)]" aria-hidden="true" />
                        <p className="text-xs font-medium text-[var(--nc-text-secondary)]">{isArabic ? "لا توجد جولات قادمة" : "No upcoming tours"}</p>
                        {canWrite && !lead.isArchived && (
                          <button type="button" onClick={() => setActiveTab("tours")} className="text-[11px] font-bold text-[var(--nc-accent)]">
                            {isArabic ? "جدولة جولة جديدة" : "Schedule new tour"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[var(--nc-border)] text-[11px] text-[var(--nc-text-secondary)]">
                              <th className="pb-1.5 text-start font-medium">{isArabic ? "الموقع" : "Location"}</th>
                              <th className="pb-1.5 text-start font-medium">{isArabic ? "التاريخ والوقت" : "Date & Time"}</th>
                              <th className="pb-1.5 text-start font-medium">{labels.currentStatus}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentTours.map((tour) => (
                              <tr key={tour.id} className="border-b border-[var(--nc-border)] last:border-0">
                                <td className="py-1.5 font-bold text-[var(--nc-text-primary)]">{tour.location || labels.notSpecified}</td>
                                <td className="py-1.5 text-[var(--nc-text-secondary)]">
                                  <bdi dir="ltr">{shortDateTime(tour.startAt)}</bdi>
                                </td>
                                <td className="py-1.5">
                                  <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold">
                                    {displayEnum(tour.status, "tourStatus", displayLocale)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Recent Offers */}
                  <div className={`${leadVisual.softPanel} p-3`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[var(--nc-text-primary)]">{isArabic ? "العروض الأخيرة" : "Recent Offers"}</h3>
                      {totalOffers > 0 && (
                        <button type="button" onClick={() => setActiveTab("offers")} className="text-[11px] font-bold text-[var(--nc-accent)]">
                          {isArabic ? "عرض الكل" : "View all"}
                        </button>
                      )}
                    </div>
                    {recentOffers.length === 0 ? (
                      <div className="mt-2 flex h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--nc-border)]">
                        <ExternalLink className="h-8 w-8 text-[var(--nc-text-dim)]" aria-hidden="true" />
                        <p className="text-xs font-medium text-[var(--nc-text-secondary)]">{isArabic ? "لا توجد عروض مرسلة" : "No offers sent"}</p>
                        {canWrite && !lead.isArchived && (
                          <button type="button" onClick={() => setActiveTab("offers")} className="text-[11px] font-bold text-[var(--nc-accent)]">
                            {isArabic ? "إنشاء عرض جديد" : "Create new offer"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[var(--nc-border)] text-[11px] text-[var(--nc-text-secondary)]">
                              <th className="pb-1.5 text-start font-medium">{isArabic ? "السعر" : "Price"}</th>
                              <th className="pb-1.5 text-start font-medium">{isArabic ? "صالح حتى" : "Valid until"}</th>
                              <th className="pb-1.5 text-start font-medium">{labels.currentStatus}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentOffers.map((offer) => (
                              <tr key={offer.id} className="border-b border-[var(--nc-border)] last:border-0">
                                <td className="py-1.5 font-bold text-[var(--nc-text-primary)]">
                                  <bdi dir="ltr">{formatNumber(offer.price, isArabic)} {isArabic ? "ر.س" : "SAR"}</bdi>
                                </td>
                                <td className="py-1.5 text-[var(--nc-text-secondary)]">
                                  <bdi dir="ltr">{shortDate(offer.validUntil)}</bdi>
                                </td>
                                <td className="py-1.5">
                                  <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold">
                                    {displayEnum(offer.status, "offerStatus", displayLocale)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "communication" && (
              <div className="space-y-4">
                <div className={`${leadVisual.softPanel} flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between`}>
                  <div className="relative min-w-0 flex-1">
                    <Search
                      className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nc-text-dim)] ${isArabic ? "right-3" : "left-3"}`}
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={communicationSearch}
                      onChange={(event) => setCommunicationSearch(event.target.value)}
                      placeholder={isArabic ? "ابحث في التواصل والنشاط..." : "Search communication and activity..."}
                      className={`${inputClass} ${isArabic ? "pr-10" : "pl-10"}`}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {([
                      ["all", isArabic ? "الكل" : "All"],
                      ["email", isArabic ? "البريد" : "Email"],
                      ["activity", isArabic ? "الأنشطة" : "Activities"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCommunicationKind(value)}
                        className={communicationKind === value ? leadVisual.activeTab : leadVisual.secondaryButton}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid items-start gap-4 lg:grid-cols-2">
                  {/* Activity Log — right in RTL: all events */}
                  <section className={`${leadVisual.softPanel} p-4`}>
                    <div className="flex items-center justify-between border-b border-[var(--nc-border)] pb-3">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                          {isArabic ? "سجل النشاط" : "Activity log"}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-[var(--nc-text-secondary)]">
                        <bdi dir="ltr">{filteredTimeline.length}</bdi>
                      </span>
                    </div>

                    {filteredTimeline.length === 0 ? (
                      <div className="mt-3">{renderEmptyState(labels.noActivities)}</div>
                    ) : (
                      <>
                        <div className="mt-3 divide-y divide-[var(--nc-border)]">
                          {visibleTimeline.map((entry) => (
                            <article key={`log-${entry.id}`} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                              <div className="flex min-w-0 items-start gap-3">
                                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-accent)]">
                                  {entry.kind === "email" ? (
                                    <Mail className="h-4 w-4" aria-hidden="true" />
                                  ) : String(entry.activity.activityType || "").toUpperCase().includes("CALL") ? (
                                    <Phone className="h-4 w-4" aria-hidden="true" />
                                  ) : (
                                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[var(--nc-text-primary)]">
                                    {entry.kind === "email"
                                      ? entry.message.subject
                                      : activityTypeLabel(entry.activity.activityType, langKey)}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-xs text-[var(--nc-text-secondary)]">
                                    {entry.kind === "email"
                                      ? entry.message.to
                                      : localizeSystemLeadActivityDescription(entry.activity.description, langKey)}
                                  </p>
                                  {entry.kind === "activity" && entry.activity.userName && (
                                    <p className="mt-1 text-[11px] text-[var(--nc-text-dim)]">
                                      {labels.activityBy} <bdi dir="auto">{entry.activity.userName}</bdi>
                                    </p>
                                  )}
                                </div>
                              </div>
                              <time className="shrink-0 text-[11px] font-semibold text-[var(--nc-text-secondary)]">
                                <bdi dir="ltr">{shortDateTime(entry.at)}</bdi>
                              </time>
                            </article>
                          ))}
                        </div>
                        <LeadListPager
                          page={safeCommunicationPage}
                          totalPages={communicationTotalPages}
                          isArabic={isArabic}
                          onPageChange={setCommunicationPage}
                        />
                      </>
                    )}
                  </section>

                  {/* Conversations — left in RTL: communications only */}
                  <section className={`${leadVisual.softPanel} p-4`}>
                    <div className="flex items-center justify-between border-b border-[var(--nc-border)] pb-3">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                          {isArabic ? "المحادثات" : "Conversations"}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-[var(--nc-text-secondary)]">
                        <bdi dir="ltr">{conversationTimeline.length}</bdi>
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {([
                        ["all", isArabic ? "الكل" : "All", conversationBase.length],
                        ["whatsapp", isArabic ? "واتساب" : "WhatsApp", conversationCounts.whatsapp],
                        ["call", isArabic ? "مكالمات" : "Calls", conversationCounts.call],
                        ["email", isArabic ? "البريد الإلكتروني" : "Email", conversationCounts.email],
                        ["message", isArabic ? "رسائل" : "Messages", conversationCounts.message],
                      ] as const).map(([value, label, count]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setConversationKind(value)}
                          className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-[11px] font-bold transition ${
                            conversationKind === value
                              ? "border-[var(--nc-accent)] bg-[var(--nc-accent)]/10 text-[var(--nc-accent)]"
                              : "border-[var(--nc-border)] text-[var(--nc-text-secondary)] hover:border-[var(--nc-accent)]/50"
                          }`}
                        >
                          {label}
                          <bdi dir="ltr">({count})</bdi>
                        </button>
                      ))}
                    </div>

                    {conversationTimeline.length === 0 ? (
                      <div className="mt-3">
                        {renderEmptyState(isArabic ? "لا توجد محادثات" : "No conversations")}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {conversationTimeline.slice(0, 8).map((entry) => {
                          const channel = conversationChannel(entry);
                          return (
                            <article
                              key={`conversation-${entry.id}`}
                              className="rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--nc-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--nc-text-secondary)]">
                                      {channel === "email" ? (
                                        <Mail className="h-3 w-3" aria-hidden="true" />
                                      ) : channel === "call" ? (
                                        <Phone className="h-3 w-3" aria-hidden="true" />
                                      ) : (
                                        <MessageCircle className="h-3 w-3" aria-hidden="true" />
                                      )}
                                      {entry.kind === "email"
                                        ? (isArabic ? "بريد إلكتروني" : "Email")
                                        : activityTypeLabel(entry.activity.activityType, langKey)}
                                    </span>
                                  </div>
                                  <p className="mt-2 truncate text-xs font-bold text-[var(--nc-text-primary)]">
                                    {entry.kind === "email"
                                      ? entry.message.subject
                                      : localizeSystemLeadActivityDescription(entry.activity.description, langKey)}
                                  </p>
                                  <p className="mt-1 truncate text-[11px] text-[var(--nc-text-secondary)]">
                                    {entry.kind === "email"
                                      ? entry.message.to
                                      : entry.activity.userName || leadName || lead.phone}
                                  </p>
                                </div>
                                <time className="shrink-0 text-[10px] font-semibold text-[var(--nc-text-dim)]">
                                  <bdi dir="ltr">{shortDateTime(entry.at)}</bdi>
                                </time>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-4">
                <div className={`${leadVisual.softPanel} p-4`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ListTodo className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                          {isArabic ? "مهام العميل" : "Lead tasks"}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                        {isArabic
                          ? "تابع المهام المفتوحة والمنجزة وحدد المهمة لعرض تفاصيلها."
                          : "Track open and completed tasks and select a task to view its details."}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative min-w-0 sm:min-w-64">
                        <Search
                          className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nc-text-dim)] ${isArabic ? "right-3" : "left-3"}`}
                          aria-hidden="true"
                        />
                        <input
                          type="search"
                          value={taskSearch}
                          onChange={(event) => setTaskSearch(event.target.value)}
                          placeholder={isArabic ? "ابحث في المهام..." : "Search tasks..."}
                          className={`${inputClass} ${isArabic ? "pr-10" : "pl-10"}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/operations/tasks?leadId=${encodeURIComponent(lead.id)}`)
                        }
                        className={leadVisual.secondaryButton}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        {isArabic ? "صفحة المهام" : "Tasks page"}
                      </button>
                      {canWrite && !lead.isArchived && (
                        <button
                          type="button"
                          onClick={() => {
                            setTaskError("");
                            setShowTaskForm((value) => !value);
                          }}
                          className={leadVisual.primaryButton}
                        >
                          {showTaskForm
                            ? labels.cancel
                            : isArabic
                              ? "مهمة جديدة"
                              : "New task"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border border-[var(--nc-border)] p-3">
                      <p className="text-[11px] font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "إجمالي المهام" : "Total"}</p>
                      <p className="mt-1 text-lg font-black text-[var(--nc-text-primary)]"><bdi dir="ltr">{lead.tasks.length}</bdi></p>
                    </div>
                    <div className="rounded-lg border border-[var(--nc-border)] p-3">
                      <p className="text-[11px] font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "معلقة" : "Pending"}</p>
                      <p className="mt-1 text-lg font-black text-amber-500"><bdi dir="ltr">{taskBuckets[0].tasks.length}</bdi></p>
                    </div>
                    <div className="rounded-lg border border-[var(--nc-border)] p-3">
                      <p className="text-[11px] font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "مكتملة" : "Completed"}</p>
                      <p className="mt-1 text-lg font-black text-emerald-500"><bdi dir="ltr">{taskBuckets[1].tasks.length}</bdi></p>
                    </div>
                    <div className="rounded-lg border border-[var(--nc-border)] p-3">
                      <p className="text-[11px] font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "متأخرة" : "Overdue"}</p>
                      <p className="mt-1 text-lg font-black text-red-500"><bdi dir="ltr">{taskBuckets[2].tasks.length}</bdi></p>
                    </div>
                  </div>
                </div>

                {showTaskForm && canWrite && !lead.isArchived && (
                  <form onSubmit={handleCreateTask} className={`${leadVisual.card} space-y-3 p-4`}>
                    {taskError && (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
                        {taskError}
                      </div>
                    )}
                    <input
                      value={taskTitle}
                      onChange={(event) => setTaskTitle(event.target.value)}
                      placeholder={isArabic ? "عنوان المهمة" : "Task title"}
                      className={inputClass}
                      required
                    />
                    <textarea
                      value={taskDescription}
                      onChange={(event) => setTaskDescription(event.target.value)}
                      placeholder={isArabic ? "وصف اختياري" : "Optional description"}
                      rows={3}
                      className={leadVisual.textarea}
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={taskSaving || !taskTitle.trim()}
                        className={leadVisual.primaryButton}
                      >
                        {taskSaving
                          ? labels.saving
                          : isArabic
                            ? "حفظ المهمة"
                            : "Save task"}
                      </button>
                    </div>
                  </form>
                )}

                {!showTaskForm && taskError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
                    {taskError}
                  </div>
                )}

                {lead.tasks.length === 0 ? (
                  renderEmptyState(labels.noTasks)
                ) : (
                  <div className="grid items-start gap-4 lg:grid-cols-[minmax(300px,0.86fr)_minmax(0,1.7fr)]">
                    {/* Task details — right in RTL */}
                    <aside className={`${leadVisual.softPanel} p-4`}>
                      {selectedTask ? (
                        <>
                          <div className="flex items-center justify-between gap-3 border-b border-[var(--nc-border)] pb-3">
                            <div className="flex items-center gap-2">
                              <ListTodo className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                              <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                                {isArabic ? "تفاصيل المهمة" : "Task details"}
                              </h3>
                            </div>
                            <span className={`inline-flex min-h-6 items-center rounded-full border px-2.5 text-[11px] font-bold ${displayTaskStatus(selectedTask).tone}`}>
                              {displayTaskStatus(selectedTask).label}
                            </span>
                          </div>

                          <h4 className="mt-4 text-lg font-black text-[var(--nc-text-primary)]">
                            {localizeSystemLeadTaskTitle(selectedTask.title, langKey)}
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-[var(--nc-text-secondary)]">
                            {selectedTask.description || labels.notSpecified}
                          </p>

                          <dl className="mt-4 grid gap-3 border-t border-[var(--nc-border)] pt-4 text-xs sm:grid-cols-2 lg:grid-cols-1">
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{labels.taskAssignee}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                {selectedTask.assignedUserName
                                  ? displayPerson(selectedTask.assignedUserName, displayLocale, { route: "/operations/leads" })
                                  : labels.unassigned}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{labels.taskDue}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                <bdi dir="ltr">{shortDateTime(selectedTask.dueDate)}</bdi>
                              </dd>
                            </div>
                          </dl>

                          {canWrite && !lead.isArchived && selectedTask.status !== "COMPLETED" && (
                            <button
                              type="button"
                              disabled={Boolean(completingTaskId)}
                              onClick={() => void handleCompleteTask(selectedTask.id)}
                              className={`${leadVisual.primaryButton} mt-5 w-full justify-center`}
                            >
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              {completingTaskId === selectedTask.id
                                ? labels.saving
                                : isArabic
                                  ? "تم الإنجاز"
                                  : "Mark complete"}
                            </button>
                          )}
                        </>
                      ) : (
                        renderEmptyState(labels.noTasks)
                      )}
                    </aside>

                    {/* Responsive board: 3 status columns on Desktop */}
                    <section className={`${leadVisual.softPanel} p-4`}>
                      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {taskBuckets.map((bucket) => (
                          <div key={bucket.id} className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-2.5">
                            <div className="flex items-center justify-between gap-2 border-b border-[var(--nc-border)] pb-2">
                              <h4 className="text-xs font-bold text-[var(--nc-text-primary)]">{bucket.label}</h4>
                              <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-[var(--nc-border)] px-1.5 py-0.5 text-[10px] font-black text-[var(--nc-text-secondary)]">
                                <bdi dir="ltr">{bucket.tasks.length}</bdi>
                              </span>
                            </div>

                            <div className="mt-2 space-y-2">
                              {bucket.tasks.length === 0 ? (
                                <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-[var(--nc-border)] px-2 text-center text-[11px] text-[var(--nc-text-dim)]">
                                  {isArabic ? "لا توجد مهام" : "No tasks"}
                                </div>
                              ) : (
                                bucket.tasks.map((task) => (
                                  <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => setSelectedTaskId(task.id)}
                                    className={`w-full rounded-lg border p-2.5 text-start transition ${
                                      selectedTask?.id === task.id
                                        ? "border-[var(--nc-accent)] bg-[var(--nc-accent)]/10"
                                        : "border-[var(--nc-border)] hover:border-[var(--nc-accent)]/50"
                                    }`}
                                  >
                                    <p className="line-clamp-2 text-xs font-bold text-[var(--nc-text-primary)]">
                                      {localizeSystemLeadTaskTitle(task.title, langKey)}
                                    </p>
                                    {task.description && (
                                      <p className="mt-1 line-clamp-2 text-[11px] text-[var(--nc-text-secondary)]">
                                        {task.description}
                                      </p>
                                    )}
                                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-[var(--nc-text-dim)]">
                                      <span className="truncate">
                                        {task.assignedUserName || labels.unassigned}
                                      </span>
                                      <bdi dir="ltr" className="shrink-0">
                                        {shortDate(task.dueDate)}
                                      </bdi>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                <LeadListPager
                  page={safeTasksPage}
                  totalPages={tasksTotalPages}
                  isArabic={isArabic}
                  onPageChange={setTasksPage}
                />
              </div>
            )}
            {activeTab === "tours" && (
              <div className="space-y-4">
                {/* Header bar: title + search + new tour */}
                <div className={`${leadVisual.softPanel} p-4`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                          {isArabic ? "جولات العميل" : "Lead tours"}
                        </h3>
                        <span className="text-xs font-semibold text-[var(--nc-text-secondary)]">
                          <bdi dir="ltr">({lead.tours.length})</bdi>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                        {isArabic
                          ? "عرض وإدارة الجولات المقررة للعميل وحدد الجولة لعرض تفاصيلها."
                          : "View and manage the lead tours and select one to see its details."}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative min-w-0 sm:min-w-64">
                        <Search
                          className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nc-text-dim)] ${isArabic ? "right-3" : "left-3"}`}
                          aria-hidden="true"
                        />
                        <input
                          type="search"
                          value={tourSearch}
                          onChange={(event) => setTourSearch(event.target.value)}
                          placeholder={isArabic ? "ابحث في الجولات..." : "Search tours..."}
                          className={`${inputClass} ${isArabic ? "pr-10" : "pl-10"}`}
                        />
                      </div>
                      {canWrite && !lead.isArchived && (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/operations/tours?leadId=${encodeURIComponent(lead.id)}`)
                          }
                          className={leadVisual.primaryButton}
                        >
                          {isArabic ? "جولة جديدة" : "New tour"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {tourActionError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
                    {tourActionError}
                  </div>
                )}

                {lead.tours.length === 0 ? (
                  <div className="flex h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--nc-border)]">
                    <CalendarDays className="h-8 w-8 text-[var(--nc-text-dim)]" aria-hidden="true" />
                    <p className="text-xs font-medium text-[var(--nc-text-secondary)]">
                      {isArabic ? "لا توجد جولات مسجلة" : "No tours recorded"}
                    </p>
                    {canWrite && !lead.isArchived && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/operations/tours?leadId=${encodeURIComponent(lead.id)}`)
                        }
                        className="text-[11px] font-bold text-[var(--nc-accent)]"
                      >
                        {isArabic ? "جدولة جولة جديدة" : "Schedule new tour"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
                    {/* Tours list — right in RTL */}
                    <section className={`${leadVisual.softPanel} p-4`}>
                      {filteredTours.length === 0 ? (
                        renderEmptyState(isArabic ? "لا توجد نتائج مطابقة" : "No matching tours")
                      ) : (
                        <div data-leads-hide-scrollbar style={{ scrollbarWidth: "none" }} className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-[var(--nc-border)] text-[11px] text-[var(--nc-text-secondary)]">
                                <th className="pb-2 text-start font-medium">{isArabic ? "الموقع" : "Location"}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "تاريخ ووقت الجولة" : "Tour date & time"}</th>
                                <th className="pb-2 text-start font-medium">{labels.currentStatus}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "الإجراءات" : "Actions"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTours.map((tour) => (
                                <tr
                                  key={tour.id}
                                  onClick={() => setSelectedTourId(tour.id)}
                                  className={`cursor-pointer border-b border-[var(--nc-border)] transition last:border-0 ${
                                    selectedTour?.id === tour.id
                                      ? "bg-[var(--nc-accent)]/10"
                                      : "hover:bg-[var(--nc-surface-solid)]"
                                  }`}
                                >
                                  <td className="py-2.5 font-bold text-[var(--nc-text-primary)]">
                                    {tour.location || labels.notSpecified}
                                  </td>
                                  <td className="py-2.5 text-[var(--nc-text-secondary)]">
                                    <bdi dir="ltr">{shortDateTime(tour.startAt)}</bdi>
                                  </td>
                                  <td className="py-2.5">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${tourStatusToneClass(tour.status)}`}>
                                      {displayEnum(tour.status, "tourStatus", displayLocale)}
                                    </span>
                                  </td>
                                  <td className="py-2.5">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        router.push(
                                          `/operations/tours?tourId=${encodeURIComponent(tour.id)}&leadId=${encodeURIComponent(lead.id)}`,
                                        );
                                      }}
                                      className="inline-flex min-h-8 items-center gap-1 rounded-md border border-[var(--nc-border)] px-2 text-[11px] font-bold text-[var(--nc-text-secondary)] transition hover:border-[var(--nc-accent)]/50"
                                    >
                                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                      {isArabic ? "فتح" : "Open"}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    {/* Tour details — left in RTL */}
                    <aside className={`${leadVisual.softPanel} p-4`}>
                      {selectedTour ? (
                        <>
                          <div className="flex items-center justify-between gap-3 border-b border-[var(--nc-border)] pb-3">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                              <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                                {isArabic ? "تفاصيل الجولة" : "Tour details"}
                              </h3>
                            </div>
                            <span className={`inline-flex min-h-6 items-center rounded-full border px-2.5 text-[11px] font-bold ${tourStatusToneClass(selectedTour.status)}`}>
                              {displayEnum(selectedTour.status, "tourStatus", displayLocale)}
                            </span>
                          </div>

                          <dl className="mt-4 space-y-3 text-xs">
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "الموقع" : "Location"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                {selectedTour.location || labels.notSpecified}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "تاريخ ووقت الجولة" : "Tour date & time"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                <bdi dir="ltr">{shortDateTime(selectedTour.startAt)}</bdi>
                              </dd>
                            </div>
                            {selectedTour.endAt && (
                              <div>
                                <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "نهاية الجولة" : "Tour end"}</dt>
                                <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                  <bdi dir="ltr">{shortDateTime(selectedTour.endAt)}</bdi>
                                </dd>
                              </div>
                            )}
                          </dl>

                          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--nc-border)] pt-4">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/operations/tours?tourId=${encodeURIComponent(selectedTour.id)}&leadId=${encodeURIComponent(lead.id)}`,
                                )
                              }
                              className={`${leadVisual.secondaryButton} w-full justify-center`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              {isArabic ? "فتح صفحة الجولة" : "Open tour page"}
                            </button>
                            {selectedTour.unitId && (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/operations/properties?unitId=${encodeURIComponent(selectedTour.unitId!)}&leadId=${encodeURIComponent(lead.id)}`,
                                  )
                                }
                                className={`${leadVisual.secondaryButton} w-full justify-center`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                {isArabic ? "فتح صفحة الوحدة" : "Open unit page"}
                              </button>
                            )}
                          </div>

                          {canWrite &&
                            !lead.isArchived &&
                            !["COMPLETED", "CANCELLED"].includes(String(selectedTour.status).toUpperCase()) && (
                              <div className="mt-4 border-t border-[var(--nc-border)] pt-4">
                                <p className="text-[11px] font-semibold text-[var(--nc-text-secondary)]">
                                  {isArabic ? "تحديث الحالة" : "Update status"}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={Boolean(updatingTourId)}
                                    onClick={() => void handleUpdateTourStatus(selectedTour.id, "COMPLETED")}
                                    className={leadVisual.primaryButton}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    {updatingTourId === selectedTour.id
                                      ? labels.saving
                                      : isArabic ? "مكتملة" : "Completed"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={Boolean(updatingTourId)}
                                    onClick={() => void handleUpdateTourStatus(selectedTour.id, "FOLLOW_UP")}
                                    className={leadVisual.secondaryButton}
                                  >
                                    {isArabic ? "متابعة" : "Follow-up"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={Boolean(updatingTourId)}
                                    onClick={() => void handleUpdateTourStatus(selectedTour.id, "CANCELLED")}
                                    className={leadVisual.dangerGhostButton}
                                  >
                                    {isArabic ? "إلغاء الجولة" : "Cancel tour"}
                                  </button>
                                </div>
                              </div>
                            )}
                        </>
                      ) : (
                        renderEmptyState(isArabic ? "اختر جولة لعرض تفاصيلها" : "Select a tour to see its details")
                      )}
                    </aside>
                  </div>
                )}
              </div>
            )}

            {activeTab === "opportunities" && (
              <div className="space-y-4">
                {/* Header bar: title + search + new opportunity */}
                <div className={`${leadVisual.softPanel} p-4`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                          {isArabic ? "فرص العميل" : "Lead opportunities"}
                        </h3>
                        <span className="text-xs font-semibold text-[var(--nc-text-secondary)]">
                          <bdi dir="ltr">({lead.opportunities.length})</bdi>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                        {isArabic
                          ? "عرض وإدارة فرص البيع للعميل وحدد الفرصة لعرض تفاصيلها."
                          : "View and manage the lead opportunities and select one to see its details."}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative min-w-0 sm:min-w-64">
                        <Search
                          className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nc-text-dim)] ${isArabic ? "right-3" : "left-3"}`}
                          aria-hidden="true"
                        />
                        <input
                          type="search"
                          value={opportunitySearch}
                          onChange={(event) => setOpportunitySearch(event.target.value)}
                          placeholder={isArabic ? "ابحث في الفرص..." : "Search opportunities..."}
                          className={`${inputClass} ${isArabic ? "pr-10" : "pl-10"}`}
                        />
                      </div>
                      {canWrite && !lead.isArchived && (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/operations/opportunities?leadId=${encodeURIComponent(lead.id)}`)
                          }
                          className={leadVisual.primaryButton}
                        >
                          {isArabic ? "فرصة جديدة" : "New opportunity"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {lead.opportunities.length === 0 ? (
                  <div className="flex h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--nc-border)]">
                    <Briefcase className="h-8 w-8 text-[var(--nc-text-dim)]" aria-hidden="true" />
                    <p className="text-xs font-medium text-[var(--nc-text-secondary)]">
                      {isArabic ? "لا توجد فرص مسجلة" : "No opportunities recorded"}
                    </p>
                    {canWrite && !lead.isArchived && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/operations/opportunities?leadId=${encodeURIComponent(lead.id)}`)
                        }
                        className="text-[11px] font-bold text-[var(--nc-accent)]"
                      >
                        {isArabic ? "إنشاء فرصة جديدة" : "Create new opportunity"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
                    {/* Opportunities list — right in RTL */}
                    <section className={`${leadVisual.softPanel} p-4`}>
                      {filteredOpportunities.length === 0 ? (
                        renderEmptyState(isArabic ? "لا توجد نتائج مطابقة" : "No matching opportunities")
                      ) : (
                        <div data-leads-hide-scrollbar style={{ scrollbarWidth: "none" }} className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-[var(--nc-border)] text-[11px] text-[var(--nc-text-secondary)]">
                                <th className="pb-2 text-start font-medium">{isArabic ? "الفرصة" : "Opportunity"}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "نوع العقار" : "Property type"}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "المرحلة" : "Stage"}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "قيمة متوقعة" : "Expected value"}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "احتمالية النجاح" : "Probability"}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "تاريخ المتابعة" : "Follow-up date"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredOpportunities.map((opportunity) => (
                                <tr
                                  key={opportunity.id}
                                  onClick={() => setSelectedOpportunityId(opportunity.id)}
                                  className={`cursor-pointer border-b border-[var(--nc-border)] transition last:border-0 ${
                                    selectedOpportunity?.id === opportunity.id
                                      ? "bg-[var(--nc-accent)]/10"
                                      : "hover:bg-[var(--nc-surface-solid)]"
                                  }`}
                                >
                                  <td className="py-2.5 font-bold text-[var(--nc-text-primary)]">
                                    {opportunityIdentity(opportunity)}
                                  </td>
                                  <td className="py-2.5 text-[var(--nc-text-secondary)]">
                                    {unitTypeOf(opportunity.unitId) || labels.notSpecified}
                                  </td>
                                  <td className="py-2.5">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${opportunityStatusToneClass(opportunity.status)}`}>
                                      {opportunityStatusLabel(opportunity.status, langKey)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 font-bold text-[var(--nc-text-primary)]">
                                    <bdi dir="ltr">{englishMoney(opportunity.value)} {isArabic ? "ر.س" : "SAR"}</bdi>
                                  </td>
                                  <td className="py-2.5 text-[var(--nc-text-secondary)]">
                                    <bdi dir="ltr">{opportunity.probability}%</bdi>
                                  </td>
                                  <td className="py-2.5 text-[var(--nc-text-secondary)]">
                                    <bdi dir="ltr">{shortDate(opportunity.closeDate)}</bdi>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    {/* Opportunity details — left in RTL */}
                    <aside className={`${leadVisual.softPanel} p-4`}>
                      {selectedOpportunity ? (
                        <>
                          <div className="border-b border-[var(--nc-border)] pb-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                                <p className="text-[11px] font-semibold text-[var(--nc-text-secondary)]">
                                  {isArabic ? "تفاصيل الفرصة" : "Opportunity details"}
                                </p>
                              </div>
                              <span className={`inline-flex min-h-6 items-center rounded-full border px-2.5 text-[11px] font-bold ${opportunityStatusToneClass(selectedOpportunity.status)}`}>
                                {opportunityStatusLabel(selectedOpportunity.status, langKey)}
                              </span>
                            </div>
                            <h3 className="mt-2 text-base font-black text-[var(--nc-text-primary)]">
                              {opportunityIdentity(selectedOpportunity)}
                            </h3>
                          </div>

                          <dl className="mt-4 space-y-3 text-xs">
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "العقار / الوحدة" : "Property / unit"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                {unitLabelOf(selectedOpportunity.unitId) || labels.notSpecified}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "نوع العقار" : "Property type"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                {unitTypeOf(selectedOpportunity.unitId) || labels.notSpecified}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "المرحلة" : "Stage"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                {opportunityStatusLabel(selectedOpportunity.status, langKey)}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "القيمة المتوقعة" : "Expected value"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                <bdi dir="ltr">{englishMoney(selectedOpportunity.value)} {isArabic ? "ر.س" : "SAR"}</bdi>
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "احتمالية النجاح" : "Probability"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                <bdi dir="ltr">{selectedOpportunity.probability}%</bdi>
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "تاريخ المتابعة" : "Follow-up date"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                <bdi dir="ltr">{shortDate(selectedOpportunity.closeDate)}</bdi>
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "العروض المرتبطة" : "Linked offers"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                <bdi dir="ltr">{selectedOpportunity.offers.length}</bdi>
                              </dd>
                            </div>
                          </dl>

                          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--nc-border)] pt-4">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/operations/opportunities?opportunityId=${encodeURIComponent(selectedOpportunity.id)}&leadId=${encodeURIComponent(lead.id)}`,
                                )
                              }
                              className={`${leadVisual.primaryButton} w-full justify-center`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              {isArabic ? "عرض تفاصيل الفرصة" : "Open opportunity details"}
                            </button>
                            {selectedOpportunity.unitId && (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/operations/properties?unitId=${encodeURIComponent(selectedOpportunity.unitId!)}&leadId=${encodeURIComponent(lead.id)}`,
                                  )
                                }
                                className={`${leadVisual.secondaryButton} w-full justify-center`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                {isArabic ? "فتح صفحة الوحدة" : "Open unit page"}
                              </button>
                            )}
                            {selectedOpportunity.offers.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setActiveTab("offers")}
                                className={`${leadVisual.secondaryButton} w-full justify-center`}
                              >
                                {isArabic ? "عرض العروض المرتبطة" : "View linked offers"}
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        renderEmptyState(isArabic ? "اختر فرصة لعرض تفاصيلها" : "Select an opportunity to see its details")
                      )}
                    </aside>
                  </div>
                )}
              </div>
            )}

            {activeTab === "offers" && (
              <div className="space-y-4">
                {/* Header bar: title + search + new offer */}
                <div className={`${leadVisual.softPanel} p-4`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                          {isArabic ? "عروض العميل" : "Lead offers"}
                        </h3>
                        <span className="text-xs font-semibold text-[var(--nc-text-secondary)]">
                          <bdi dir="ltr">({allOffers.length})</bdi>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                        {isArabic
                          ? "عرض وإدارة الأسعار المقدمة للعميل وحدد العرض لعرض تفاصيله."
                          : "View and manage the lead offers and select one to see its details."}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative min-w-0 sm:min-w-64">
                        <Search
                          className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nc-text-dim)] ${isArabic ? "right-3" : "left-3"}`}
                          aria-hidden="true"
                        />
                        <input
                          type="search"
                          value={offerSearch}
                          onChange={(event) => setOfferSearch(event.target.value)}
                          placeholder={isArabic ? "ابحث في العروض..." : "Search offers..."}
                          className={`${inputClass} ${isArabic ? "pr-10" : "pl-10"}`}
                        />
                      </div>
                      {canWrite && !lead.isArchived && (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/operations/offers?leadId=${encodeURIComponent(lead.id)}`)
                          }
                          className={leadVisual.primaryButton}
                        >
                          {isArabic ? "عرض جديد" : "New offer"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {offerActionError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
                    {offerActionError}
                  </div>
                )}

                {allOffers.length === 0 ? (
                  <div className="flex h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--nc-border)]">
                    <FileText className="h-8 w-8 text-[var(--nc-text-dim)]" aria-hidden="true" />
                    <p className="text-xs font-medium text-[var(--nc-text-secondary)]">
                      {isArabic ? "لا توجد عروض مسجلة" : "No offers recorded"}
                    </p>
                    {canWrite && !lead.isArchived && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/operations/offers?leadId=${encodeURIComponent(lead.id)}`)
                        }
                        className="text-[11px] font-bold text-[var(--nc-accent)]"
                      >
                        {isArabic ? "إنشاء عرض جديد" : "Create new offer"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
                    {/* Offers list — right in RTL */}
                    <section className={`${leadVisual.softPanel} p-4`}>
                      {filteredOffers.length === 0 ? (
                        renderEmptyState(isArabic ? "لا توجد نتائج مطابقة" : "No matching offers")
                      ) : (
                        <div data-leads-hide-scrollbar style={{ scrollbarWidth: "none" }} className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-[var(--nc-border)] text-[11px] text-[var(--nc-text-secondary)]">
                                <th className="pb-2 text-start font-medium">{isArabic ? "العرض" : "Offer"}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "الفرصة المرتبطة" : "Linked opportunity"}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "القيمة" : "Value"}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "الحالة" : "Status"}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "تاريخ الإنشاء" : "Created"}</th>
                                <th className="pb-2 text-start font-medium">{isArabic ? "تاريخ الانتهاء" : "Valid until"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredOffers.map((offer) => (
                                <tr
                                  key={offer.id}
                                  onClick={() => setSelectedOfferId(offer.id)}
                                  className={`cursor-pointer border-b border-[var(--nc-border)] transition last:border-0 ${
                                    selectedOffer?.id === offer.id
                                      ? "bg-[var(--nc-accent)]/10"
                                      : "hover:bg-[var(--nc-surface-solid)]"
                                  }`}
                                >
                                  <td className="py-2.5 font-bold text-[var(--nc-text-primary)]">
                                    {offerIdentity(offer)}
                                  </td>
                                  <td className="py-2.5 text-[var(--nc-text-secondary)]">
                                    {offerLinkedOpportunityLabel(offer) || labels.notSpecified}
                                  </td>
                                  <td className="py-2.5 font-bold text-[var(--nc-text-primary)]">
                                    <bdi dir="ltr">{englishMoney(offer.price)} {isArabic ? "ر.س" : "SAR"}</bdi>
                                  </td>
                                  <td className="py-2.5">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${offerStatusToneClass(offer.status)}`}>
                                      {displayEnum(offer.status, "offerStatus", displayLocale)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-[var(--nc-text-secondary)]">
                                    <bdi dir="ltr">{shortDate(offer.createdAt)}</bdi>
                                  </td>
                                  <td className="py-2.5 text-[var(--nc-text-secondary)]">
                                    <bdi dir="ltr">{shortDate(offer.validUntil)}</bdi>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    {/* Offer details — left in RTL */}
                    <aside className={`${leadVisual.softPanel} p-4`}>
                      {selectedOffer ? (
                        <>
                          <div className="border-b border-[var(--nc-border)] pb-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                                <p className="text-[11px] font-semibold text-[var(--nc-text-secondary)]">
                                  {isArabic ? "تفاصيل العرض" : "Offer details"}
                                </p>
                              </div>
                              <span className={`inline-flex min-h-6 items-center rounded-full border px-2.5 text-[11px] font-bold ${offerStatusToneClass(selectedOffer.status)}`}>
                                {displayEnum(selectedOffer.status, "offerStatus", displayLocale)}
                              </span>
                            </div>
                            <h3 className="mt-2 text-base font-black text-[var(--nc-text-primary)]">
                              {offerIdentity(selectedOffer)}
                            </h3>
                          </div>

                          <dl className="mt-4 space-y-3 text-xs">
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "العقار / الوحدة" : "Property / unit"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                {unitLabelOf(selectedOffer.unitId) || labels.notSpecified}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "الفرصة المرتبطة" : "Linked opportunity"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                {offerLinkedOpportunityLabel(selectedOffer) || labels.notSpecified}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "قيمة العرض" : "Offer value"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                <bdi dir="ltr">{englishMoney(selectedOffer.price)} {isArabic ? "ر.س" : "SAR"}</bdi>
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "تاريخ الإنشاء" : "Created"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                <bdi dir="ltr">{shortDate(selectedOffer.createdAt)}</bdi>
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-[var(--nc-text-secondary)]">{isArabic ? "صلاحية العرض" : "Valid until"}</dt>
                              <dd className="mt-1 font-bold text-[var(--nc-text-primary)]">
                                <bdi dir="ltr">{shortDate(selectedOffer.validUntil)}</bdi>
                              </dd>
                            </div>
                          </dl>

                          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--nc-border)] pt-4">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/operations/offers?offerId=${encodeURIComponent(selectedOffer.id)}&leadId=${encodeURIComponent(lead.id)}`,
                                )
                              }
                              className={`${leadVisual.primaryButton} w-full justify-center`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              {isArabic ? "فتح تفاصيل العرض" : "Open offer details"}
                            </button>
                            {selectedOffer.unitId && (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/operations/properties?unitId=${encodeURIComponent(selectedOffer.unitId!)}&leadId=${encodeURIComponent(lead.id)}`,
                                  )
                                }
                                className={`${leadVisual.secondaryButton} w-full justify-center`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                {isArabic ? "فتح صفحة الوحدة" : "Open unit page"}
                              </button>
                            )}
                            {canWrite &&
                              !lead.isArchived &&
                              selectedOffer.unitId &&
                              String(selectedOffer.status).toUpperCase() === "PENDING" && (
                                <button
                                  type="button"
                                  disabled={Boolean(acceptingOfferId)}
                                  onClick={() => void handleAcceptOffer(selectedOffer.id, selectedOffer.unitId)}
                                  className={`${leadVisual.secondaryButton} w-full justify-center`}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  {acceptingOfferId === selectedOffer.id
                                    ? labels.saving
                                    : isArabic ? "قبول العرض" : "Accept offer"}
                                </button>
                              )}
                          </div>
                        </>
                      ) : (
                        renderEmptyState(isArabic ? "اختر عرضًا لعرض تفاصيله" : "Select an offer to see its details")
                      )}
                    </aside>
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(240px,0.7fr)]">
                {/* Timeline — right in RTL */}
                <section className={`${leadVisual.softPanel} p-4`}>
                  <div className="flex items-center gap-2 border-b border-[var(--nc-border)] pb-3">
                    <History className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                      {isArabic ? "سجل العميل" : "Lead history"}
                    </h3>
                    <span className="text-xs font-semibold text-[var(--nc-text-secondary)]">
                      <bdi dir="ltr">({filteredHistory.length})</bdi>
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--nc-text-secondary)]">
                    {isArabic
                      ? "جميع الأحداث والتغييرات المرتبطة بهذا العميل."
                      : "All events and changes related to this lead."}
                  </p>

                  {lead.history.length === 0 ? (
                    <div className="mt-3">{renderEmptyState(labels.noHistory)}</div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="mt-3">
                      {renderEmptyState(isArabic ? "لا توجد نتائج مطابقة" : "No matching events")}
                    </div>
                  ) : (
                    <div data-leads-hide-scrollbar style={{ scrollbarWidth: "none" }} className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[var(--nc-border)] text-[11px] text-[var(--nc-text-secondary)]">
                            <th className="pb-2 text-start font-medium">{isArabic ? "الحدث" : "Event"}</th>
                            <th className="pb-2 text-start font-medium">{isArabic ? "التفاصيل" : "Details"}</th>
                            <th className="pb-2 text-start font-medium">{isArabic ? "تم بواسطة" : "By"}</th>
                            <th className="pb-2 text-start font-medium">{isArabic ? "التاريخ والوقت" : "Date & time"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleHistory.map((entry) => (
                            <tr key={entry.id} className="border-b border-[var(--nc-border)] last:border-0">
                              <td className="py-2.5 font-bold text-[var(--nc-text-primary)]">
                                {leadHistoryActionLabel(entry.action, langKey)}
                              </td>
                              <td className="max-w-[320px] py-2.5 text-[var(--nc-text-secondary)]">
                                <span className="line-clamp-2">{historyDetailsText(entry)}</span>
                              </td>
                              <td className="py-2.5 text-[var(--nc-text-secondary)]">
                                {entry.userName || labels.notSpecified}
                              </td>
                              <td className="whitespace-nowrap py-2.5 text-[var(--nc-text-secondary)]">
                                <bdi dir="ltr">{shortDateTime(entry.createdAt)}</bdi>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <LeadListPager
                    page={safeHistoryPage}
                    totalPages={historyTotalPages}
                    isArabic={isArabic}
                    onPageChange={setHistoryPage}
                  />
                </section>

                {/* Filters — left in RTL */}
                <aside className={`${leadVisual.softPanel} p-4`}>
                  <div className="flex items-center gap-2 border-b border-[var(--nc-border)] pb-3">
                    <Search className="h-4 w-4 text-[var(--nc-accent)]" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                      {isArabic ? "تصفية السجل" : "Filter history"}
                    </h3>
                  </div>

                  <div className="relative mt-3">
                    <Search
                      className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nc-text-dim)] ${isArabic ? "right-3" : "left-3"}`}
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={historySearch}
                      onChange={(event) => setHistorySearch(event.target.value)}
                      placeholder={isArabic ? "ابحث في السجل..." : "Search history..."}
                      className={`${inputClass} ${isArabic ? "pr-10" : "pl-10"}`}
                    />
                  </div>

                  <div className="mt-3 space-y-1">
                    {(
                      [
                        { id: "all", label: isArabic ? "كل الأحداث" : "All events", count: lead.history.length },
                        { id: "communication", label: isArabic ? "التواصل" : "Communication", count: historyCounts.communication },
                        { id: "tours", label: isArabic ? "الجولات" : "Tours", count: historyCounts.tours },
                        { id: "deals", label: isArabic ? "الفرص والعروض" : "Opportunities & offers", count: historyCounts.deals },
                        { id: "data", label: isArabic ? "تحديثات البيانات" : "Data updates", count: historyCounts.data },
                        { id: "system", label: isArabic ? "النظام" : "System", count: historyCounts.system },
                      ] as Array<{ id: "all" | HistoryCategory; label: string; count: number }>
                    ).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setHistoryCategory(option.id)}
                        className={`flex min-h-9 w-full items-center justify-between rounded-lg border px-3 text-xs font-semibold transition ${
                          historyCategory === option.id
                            ? "border-[var(--nc-accent)]/40 bg-[var(--nc-accent)]/10 text-[var(--nc-accent)]"
                            : "border-transparent text-[var(--nc-text-secondary)] hover:bg-[var(--nc-surface-solid)]"
                        }`}
                      >
                        <span>{option.label}</span>
                        <bdi dir="ltr">{option.count}</bdi>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-[var(--nc-border)] pt-3">
                    <label className="text-[11px] font-semibold text-[var(--nc-text-secondary)]" htmlFor="lead-history-period">
                      {isArabic ? "تحديد فترة" : "Period"}
                    </label>
                    <select
                      id="lead-history-period"
                      value={historyPeriod}
                      onChange={(event) =>
                        setHistoryPeriod(event.target.value as "all" | "7" | "30" | "90")
                      }
                      className={`${inputClass} mt-1.5`}
                    >
                      <option value="all">{isArabic ? "كل الفترات" : "All time"}</option>
                      <option value="7">{isArabic ? "آخر 7 أيام" : "Last 7 days"}</option>
                      <option value="30">{isArabic ? "آخر 30 يومًا" : "Last 30 days"}</option>
                      <option value="90">{isArabic ? "آخر 90 يومًا" : "Last 90 days"}</option>
                    </select>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit dialog (unified form) */}
      {showEditDialog && (
        <LeadFormDialog
          mode="edit"
          lang={langKey}
          labels={labels}
          direction={direction}
          viewerRole={viewerRole}
          viewerUserId={viewerUserId}
          initial={{
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            phone: lead.phone,
            email: lead.email,
            city: lead.city,
            source: lead.source,
            projectId: lead.project?.id || null,
          }}
          onClose={() => setShowEditDialog(false)}
          onSaved={() => {
            setShowEditDialog(false);
            toast.success(labels.leadUpdated);
            router.refresh();
          }}
        />
      )}

      {/* Archive dialog */}
      {showArchiveDialog && (
        <div
          className={leadVisual.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-lead-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !archiveSaving) setShowArchiveDialog(false);
          }}
        >
          <div
            dir={direction}
            className={`${leadVisual.modal} max-w-md p-5`}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="archive-lead-title" className="text-base font-bold">
                {labels.archiveAction}: {leadName || lead.phone}
              </h2>
              <button
                type="button"
                onClick={() => setShowArchiveDialog(false)}
                className={leadVisual.closeButton}
                aria-label={labels.cancel}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <label className="mb-1.5 mt-4 block text-xs font-bold text-[var(--nc-text-secondary)]" htmlFor="archive-reason">
              {labels.archiveReasonLabel} *
            </label>
            <textarea
              id="archive-reason"
              value={archiveReason}
              onChange={(event) => setArchiveReason(event.target.value)}
              placeholder={labels.archiveReasonPlaceholder}
              rows={3}
              className={leadVisual.textarea}
            />
            {archiveError && (
              <p className="mt-2 text-xs font-semibold text-red-500">{archiveError}</p>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 border-t border-[var(--nc-border)] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowArchiveDialog(false)}
                disabled={archiveSaving}
                className={leadVisual.secondaryButton}
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleArchive()}
                disabled={archiveSaving}
                className={leadVisual.primaryButton}
              >
                {archiveSaving ? labels.saving : labels.archiveConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send email dialog */}
      {showEmailModal && (
        <div
          className={leadVisual.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-email-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !emailSending) setShowEmailModal(false);
          }}
        >
          <form
            onSubmit={handleSendEmail}
            dir={direction}
            className={leadVisual.modal}
          >
            <div className={leadVisual.modalHeader}>
              <h2 id="send-email-title" className="text-base font-bold">
                {labels.sendEmail}: {leadName || lead.phone}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEmailError("");
                  setShowEmailModal(false);
                }}
                className={leadVisual.closeButton}
                aria-label={labels.cancel}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className={leadVisual.modalBody}>
              {emailError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
                  {emailError}
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]" htmlFor="email-to">
                  {labels.emailTo} *
                </label>
                <input
                  id="email-to"
                  type="email"
                  dir="ltr"
                  value={emailTo}
                  onChange={(event) => setEmailTo(event.target.value)}
                  required
                  className={`${inputClass} text-left`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]" htmlFor="email-subject">
                  {labels.emailSubject} *
                </label>
                <input
                  id="email-subject"
                  type="text"
                  value={emailSubject}
                  onChange={(event) => setEmailSubject(event.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]" htmlFor="email-body">
                  {labels.emailBody} *
                </label>
                <textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(event) => setEmailBody(event.target.value)}
                  required
                  rows={7}
                  className={leadVisual.textarea}
                />
              </div>
            </div>

            <div className={leadVisual.modalFooter}>
              <button
                type="button"
                onClick={() => {
                  setEmailError("");
                  setShowEmailModal(false);
                }}
                disabled={emailSending}
                className={leadVisual.secondaryButton}
              >
                {labels.cancel}
              </button>
              <button
                type="submit"
                disabled={emailSending}
                className={leadVisual.primaryButton}
              >
                {emailSending ? labels.sending : labels.send}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* WhatsApp dialog */}
      {showWhatsAppModal && (
        <div
          className={leadVisual.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-whatsapp-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !whatsAppSending) {
              setShowWhatsAppModal(false);
              setWhatsAppError("");
            }
          }}
        >
          <form
            onSubmit={handleSendWhatsApp}
            dir={direction}
            className={leadVisual.modal}
          >
            <div className={leadVisual.modalHeader}>
              <div>
                <h2 id="send-whatsapp-title" className="text-base font-bold">
                  {isArabic ? "مراسلة واتساب" : "WhatsApp message"}:{" "}
                  {leadName || lead.phone}
                </h2>
                <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                  <bdi dir="ltr">{lead.phone}</bdi>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowWhatsAppModal(false);
                  setWhatsAppError("");
                }}
                className={leadVisual.closeButton}
                aria-label={labels.cancel}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className={leadVisual.modalBody}>
              {whatsAppError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
                  {whatsAppError}
                </div>
              )}
              {!normalizedWhatsAppPhone && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-300">
                  {isArabic
                    ? "رقم العميل يحتاج تصحيحًا قبل مراسلته عبر واتساب."
                    : "The lead phone number must be corrected before WhatsApp messaging."}
                </div>
              )}
              <div>
                <label
                  className="mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]"
                  htmlFor="whatsapp-message"
                >
                  {isArabic ? "نص الرسالة" : "Message"} *
                </label>
                <textarea
                  id="whatsapp-message"
                  value={whatsAppMessage}
                  onChange={(event) => setWhatsAppMessage(event.target.value)}
                  required
                  rows={7}
                  className={leadVisual.textarea}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/operations/whatsapp?leadId=${encodeURIComponent(
                      lead.id,
                    )}&phone=${encodeURIComponent(lead.phone)}`,
                  )
                }
                className={leadVisual.secondaryButton}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                {isArabic ? "فتح مركز واتساب" : "Open WhatsApp center"}
              </button>
            </div>

            <div className={leadVisual.modalFooter}>
              {whatsAppFallbackUrl && whatsAppMessage.trim() && (
                <a
                  href={whatsAppFallbackUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleWhatsAppFallback}
                  className={leadVisual.secondaryButton}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {isArabic ? "فتح واتساب مباشرة" : "Open direct WhatsApp"}
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowWhatsAppModal(false);
                  setWhatsAppError("");
                }}
                disabled={whatsAppSending}
                className={leadVisual.secondaryButton}
              >
                {labels.cancel}
              </button>
              <button
                type="submit"
                disabled={
                  whatsAppSending ||
                  !normalizedWhatsAppPhone ||
                  !whatsAppMessage.trim()
                }
                className={leadVisual.primaryButton}
              >
                {whatsAppSending
                  ? labels.sending
                  : isArabic
                    ? "إرسال عبر النظام"
                    : "Send via system"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
