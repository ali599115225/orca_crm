"use client";

// Official lead detail page. Tabs: overview, communication & activity,
// tasks, tours, opportunities, offers, history. Status change, assignment,
// edit, and archive are permission-gated (re-verified on the server).
// `status` is the single source of truth; raw enums and raw server errors
// are never rendered.
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  localizeEmailProviderError,
  localizeLeadError,
  localizeSystemLeadActivityDescription,
  localizeSystemLeadTaskTitle,
  taskStatusLabel,
} from "@/features/leads/copy/leadsCopy";
import LeadFormDialog from "@/features/leads/components/LeadFormDialog";
import EngagementTabs, { type EngagementTab } from "@/features/leads/components/EngagementTabs";
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

  const communicationTotalPages = Math.max(
    1,
    Math.ceil(timeline.length / LEAD_DETAIL_PAGE_SIZE),
  );
  const tasksTotalPages = Math.max(
    1,
    Math.ceil(lead.tasks.length / LEAD_DETAIL_PAGE_SIZE),
  );
  const historyTotalPages = Math.max(
    1,
    Math.ceil(lead.history.length / LEAD_DETAIL_PAGE_SIZE),
  );

  const safeCommunicationPage = Math.min(
    communicationPage,
    communicationTotalPages,
  );
  const safeTasksPage = Math.min(tasksPage, tasksTotalPages);
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);

  const visibleTimeline = timeline.slice(
    (safeCommunicationPage - 1) * LEAD_DETAIL_PAGE_SIZE,
    safeCommunicationPage * LEAD_DETAIL_PAGE_SIZE,
  );
  const visibleTasks = lead.tasks.slice(
    (safeTasksPage - 1) * LEAD_DETAIL_PAGE_SIZE,
    safeTasksPage * LEAD_DETAIL_PAGE_SIZE,
  );
  const visibleHistory = lead.history.slice(
    (safeHistoryPage - 1) * LEAD_DETAIL_PAGE_SIZE,
    safeHistoryPage * LEAD_DETAIL_PAGE_SIZE,
  );

  useEffect(() => {
    setCommunicationPage((current) =>
      Math.min(current, communicationTotalPages),
    );
  }, [communicationTotalPages]);

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
    <div className={leadVisual.emptyState}>{message}</div>
  );

  return (
    <section dir={direction} className={leadVisual.page}>
      <div className={leadVisual.pageStack}>
        {/* Header */}
        <div className={`${leadVisual.panel} p-4 sm:p-5`}>
          <button
            type="button"
            onClick={() => router.push("/operations/leads")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--nc-text-secondary)] transition hover:text-[var(--nc-text-primary)]"
          >
            <BackIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {labels.back}
          </button>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="min-w-0 truncate text-2xl font-extrabold tracking-[-0.02em] text-[var(--nc-text-primary)] sm:text-3xl">
                  <bdi dir="auto">{leadName || lead.phone}</bdi>
                </h1>
                <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-bold ${leadStatusTone(lead.status)}`}>
                  {displayEnum(lead.status, "leadStatus", displayLocale)}
                </span>
                {lead.isArchived && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <Archive className="h-3 w-3" aria-hidden="true" />
                    {labels.archivedBadge}
                  </span>
                )}
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-[var(--nc-text-secondary)]">
                <span className="inline-flex shrink-0">
                  <bdi dir="ltr" className="tabular-nums">{lead.phone}</bdi>
                </span>
                {lead.email ? (
                  <>
                    <span aria-hidden="true" className="opacity-50">·</span>
                    <span className="min-w-0 break-all">
                      <bdi dir="ltr">{lead.email}</bdi>
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                    onClick={() => setShowEditDialog(true)}
                    className={leadVisual.ghostButton}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    {labels.editAction}
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
                </>
              )}

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
            </div>
          </div>

          {lead.isArchived && (
            <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-800 dark:text-amber-200">
              <p>{labels.archivedInfo}</p>
              <p className="mt-1">
                {lead.archivedByName ? (
                  <>
                    {labels.archivedBy}: <bdi dir="auto">{lead.archivedByName}</bdi>
                  </>
                ) : null}
                {lead.archivedAt ? ` · ${formatDisplayDateTime(lead.archivedAt)}` : null}
              </p>
              {lead.archiveReason && (
                <p className="mt-1">
                  {labels.archiveReasonShown}: {lead.archiveReason}
                </p>
              )}
            </div>
          )}

          {/* Assignment row */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--nc-border)] pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--nc-text-secondary)]">
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              {labels.assignAction}:
            </span>
            {canManage && !lead.isArchived ? (
              <SettingsSelect
                aria-label={labels.assignAction}
                value={lead.assignedTo || ""}
                disabled={assignSaving}
                onChange={(value) => void handleAssign(value)}
                options={assigneeOptions}
                className={selectClass}
              />
            ) : (
              <span className="text-xs font-bold text-[var(--nc-text-primary)]">
                <bdi dir="auto">
                  {lead.assignedUser
                    ? displayPerson(lead.assignedUser.name, displayLocale, { route: "/operations/leads" })
                    : labels.unassigned}
                </bdi>
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className={`${leadVisual.panel} p-4 sm:p-5`}>
          <div
            className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1"
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

          <div className="mt-4">
            {activeTab === "overview" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className={infoCardClass}>
                  <div className="flex items-center gap-3">
                    <span className={leadVisual.iconTile}>
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className={leadVisual.sectionTitle}>{labels.leadInfo}</h3>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                    <div>
                      <p className={infoLabelClass}>{labels.city}</p>
                      <p className={infoValueClass}>
                        {displayGeo(lead.city, "city", displayLocale, { route: "/operations/leads" })}
                      </p>
                    </div>
                    <div>
                      <p className={infoLabelClass}>{labels.source}</p>
                      <p className={infoValueClass}>
                        {displayEnum(lead.source, "leadSource", displayLocale)}
                      </p>
                    </div>
                    <div>
                      <p className={infoLabelClass}>{labels.scoreLabel}</p>
                      <p className={infoValueClass}>{formatNumber(lead.leadScore, isArabic)}/100</p>
                    </div>
                    <div>
                      <p className={infoLabelClass}>{labels.registrationDate}</p>
                      <p className={infoValueClass}>{formatDisplayDate(lead.createdAt)}</p>
                    </div>
                    <div>
                      <p className={infoLabelClass}>{labels.lastContact}</p>
                      <p className={infoValueClass}>
                        {lead.lastContactedAt
                          ? formatDisplayDate(lead.lastContactedAt)
                          : labels.notSpecified}
                      </p>
                    </div>
                    <div>
                      <p className={infoLabelClass}>{labels.currentStatus}</p>
                      <p className={infoValueClass}>
                        {displayEnum(lead.status, "leadStatus", displayLocale)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={infoCardClass}>
                  <div className="flex items-center gap-3">
                    <span className={leadVisual.iconTile}>
                      <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className={leadVisual.sectionTitle}>{labels.contactInfo}</h3>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className={infoLabelClass}>{labels.phoneLabel}</p>
                      <p className={`${infoValueClass} text-start`}>
                        <bdi dir="ltr" className="inline-block tabular-nums">{lead.phone}</bdi>
                      </p>
                    </div>
                    <div>
                      <p className={infoLabelClass}>{labels.emailLabel}</p>
                      <p className={`${infoValueClass} break-all text-start`}>
                        {lead.email ? <bdi dir="ltr">{lead.email}</bdi> : "—"}
                      </p>
                    </div>
                    <div>
                      <p className={infoLabelClass}>{labels.advisorInfo}</p>
                      <p className={infoValueClass}>
                        {lead.assignedUser
                          ? displayPerson(lead.assignedUser.name, displayLocale, {
                              route: "/operations/leads",
                            })
                          : labels.unassigned}
                      </p>
                    </div>
                    <div>
                      <p className={infoLabelClass}>{labels.projectInfo}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-[var(--nc-text-primary)]">
                          {lead.project?.name ? <bdi dir="auto">{lead.project.name}</bdi> : "—"}
                        </p>
                        {lead.project?.id && (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/operations/projects?projectId=${encodeURIComponent(
                                  lead.project!.id,
                                )}&leadId=${encodeURIComponent(lead.id)}`,
                              )
                            }
                            className={leadVisual.secondaryButton}
                          >
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            {isArabic ? "فتح المشاريع" : "Open projects"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "communication" && (
              <div className="space-y-3">
                {timeline.length === 0 ? (
                  renderEmptyState(labels.noActivities)
                ) : (
                  visibleTimeline.map((entry) => (
                    <div key={entry.id} className={infoCardClass}>
                      {entry.kind === "email" ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-xs font-bold text-[var(--nc-text-secondary)]">
                              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                              {entry.message.direction === "outbound"
                                ? labels.emailDirectionOut
                                : labels.emailDirectionIn}
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-[var(--nc-text-primary)]">
                              {entry.message.subject}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[var(--nc-text-secondary)]" dir="ltr">
                              {entry.message.to}
                            </p>
                            {entry.message.status === "FAILED" && (
                              <p className="mt-2 text-xs font-semibold text-red-500">
                                {localizeEmailProviderError(
                                  entry.message.errorMessage,
                                  langKey,
                                )}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-[var(--nc-text-secondary)]">
                            {formatDisplayDateTime(entry.at)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--nc-text-secondary)]">
                              {activityTypeLabel(entry.activity.activityType, langKey)}
                              {entry.activity.userName
                                ? ` · ${labels.activityBy} ${entry.activity.userName}`
                                : ""}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[var(--nc-text-primary)]">
                              {localizeSystemLeadActivityDescription(
                                entry.activity.description,
                                langKey,
                              )}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-[var(--nc-text-secondary)]">
                            {formatDisplayDateTime(entry.at)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <LeadListPager
                  page={safeCommunicationPage}
                  totalPages={communicationTotalPages}
                  isArabic={isArabic}
                  onPageChange={setCommunicationPage}
                />
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-3">
                {canWrite && !lead.isArchived && (
                  <div className={`${leadVisual.softPanel} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--nc-text-primary)]">
                        {isArabic ? "مهام العميل" : "Lead tasks"}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                        {isArabic
                          ? "أنشئ مهمة متابعة وأغلقها من نفس الصفحة."
                          : "Create and complete follow-up tasks from this page."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/operations/tasks?leadId=${encodeURIComponent(lead.id)}`,
                          )
                        }
                        className={leadVisual.secondaryButton}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        {isArabic ? "صفحة المهام" : "Tasks page"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTaskError("");
                          setShowTaskForm((value) => !value);
                        }}
                        className={leadVisual.compactPrimaryButton}
                      >
                        {showTaskForm
                          ? labels.cancel
                          : isArabic
                            ? "إضافة مهمة"
                            : "Add task"}
                      </button>
                    </div>
                  </div>
                )}

                {showTaskForm && canWrite && !lead.isArchived && (
                  <form
                    onSubmit={handleCreateTask}
                    className={`${leadVisual.card} space-y-3 p-4`}
                  >
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
                        className={leadVisual.compactPrimaryButton}
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
                  visibleTasks.map((task) => (
                    <div key={task.id} className={infoCardClass}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[var(--nc-text-primary)]">
                            {localizeSystemLeadTaskTitle(task.title, langKey)}
                          </p>
                          {task.description && (
                            <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                              {task.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                            {labels.taskAssignee}:{" "}
                            {task.assignedUserName
                              ? displayPerson(task.assignedUserName, displayLocale, {
                                  route: "/operations/leads",
                                })
                              : labels.unassigned}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                          <div className="flex flex-col items-start gap-1 sm:items-end">
                            <span className={`inline-flex min-h-6 items-center rounded-full border px-2.5 text-[11px] font-bold ${taskStatusTone(task.status)}`}>
                              {taskStatusLabel(task.status, langKey)}
                            </span>
                            <span className="text-xs text-[var(--nc-text-secondary)]">
                              {labels.taskDue}: {formatDisplayDate(task.dueDate)}
                            </span>
                          </div>
                          {canWrite &&
                            !lead.isArchived &&
                            task.status !== "COMPLETED" && (
                              <button
                                type="button"
                                disabled={Boolean(completingTaskId)}
                                onClick={() => void handleCompleteTask(task.id)}
                                className={leadVisual.compactPrimaryButton}
                              >
                                {completingTaskId === task.id
                                  ? labels.saving
                                  : isArabic
                                    ? "إكمال"
                                    : "Complete"}
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <LeadListPager
                  page={safeTasksPage}
                  totalPages={tasksTotalPages}
                  isArabic={isArabic}
                  onPageChange={setTasksPage}
                />
              </div>
            )}

            {(activeTab === "tours" || activeTab === "offers" || activeTab === "opportunities") && (
              <EngagementTabs
                leadId={lead.id}
                leadName={leadName || lead.phone}
                activeTab={activeTab as EngagementTab}
                labels={labels}
                isArabic={isArabic}
                direction={direction}
                displayLocale={displayLocale}
                canWrite={canWrite && !lead.isArchived}
                onDataChanged={() => router.refresh()}
                onNavigate={(path) => router.push(path)}
              />
            )}

            {activeTab === "history" && (
              <div className="space-y-3">
                {lead.history.length === 0 ? (
                  renderEmptyState(labels.noHistory)
                ) : (
                  visibleHistory.map((entry) => (
                    <div key={entry.id} className={infoCardClass}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--nc-text-primary)]">
                            {leadHistoryActionLabel(entry.action, langKey)}
                          </p>
                          {entry.userName && (
                            <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
                              {labels.activityBy} {entry.userName}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-[var(--nc-text-secondary)]">
                          {formatDisplayDateTime(entry.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <LeadListPager
                  page={safeHistoryPage}
                  totalPages={historyTotalPages}
                  isArabic={isArabic}
                  onPageChange={setHistoryPage}
                />
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

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
