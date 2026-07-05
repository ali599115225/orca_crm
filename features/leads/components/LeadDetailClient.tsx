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
  Mail,
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
  localizeLeadError,
  taskStatusLabel,
} from "@/features/leads/copy/leadsCopy";
import LeadFormDialog from "@/features/leads/components/LeadFormDialog";
import EngagementTabs, { type EngagementTab } from "@/features/leads/components/EngagementTabs";

type DetailTab =
  | "overview"
  | "communication"
  | "tasks"
  | "tours"
  | "opportunities"
  | "offers"
  | "history";

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
    const formData = new FormData();
    formData.append("to", emailTo);
    formData.append("subject", emailSubject);
    formData.append("htmlBody", emailBody);
    formData.append("leadId", lead.id);
    const result = await sendEmailAction(formData);
    setEmailSending(false);

    if (result.success) {
      toast.success(labels.emailSent);
      setShowEmailModal(false);
      setEmailSubject("");
      setEmailBody("");
      router.refresh();
    } else {
      toast.error(localizeLeadError({ code: "INTERNAL" }, langKey));
    }
  };

  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const infoCardClass =
    "rounded-lg border border-[#0A1F3A]/10 bg-white p-4 dark:border-white/10 dark:bg-[#0A1F3A]";
  const infoLabelClass = "text-xs text-[#0A1F3A]/60 dark:text-white/60";
  const infoValueClass = "mt-1 text-sm font-semibold text-[#0A1F3A] dark:text-white";
  const selectClass =
    "min-h-[42px] text-xs font-semibold [&>button]:min-h-[42px] [&>button]:rounded-lg [&>button]:border-[#0A1F3A]/10 [&>button]:bg-white [&>button]:text-[#0A1F3A] dark:[&>button]:border-white/10 dark:[&>button]:bg-[#0A1F3A] dark:[&>button]:text-white";
  const inputClass =
    "min-h-[44px] w-full rounded-lg border border-[#0A1F3A]/10 bg-white px-3 text-sm font-semibold text-[#0A1F3A] outline-none transition-colors focus:border-[#D9AD55] dark:border-white/10 dark:bg-[#0A1F3A] dark:text-white";
  const renderEmptyState = (message: string) => (
    <div className="rounded-lg border border-dashed border-[#0A1F3A]/10 bg-white px-4 py-8 text-center dark:border-white/10 dark:bg-[#0A1F3A]">
      <p className="text-sm font-medium text-[#0A1F3A]/60 dark:text-white/60">{message}</p>
    </div>
  );

  return (
    <section
      dir={direction}
      className="min-h-full bg-white dark:bg-[#07182D]"
      style={{ padding: "24px 32px 48px", maxWidth: 1600, margin: "0 auto", width: "100%" }}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="rounded-xl border border-[#0A1F3A]/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0A1F3A]">
          <button
            type="button"
            onClick={() => router.push("/operations/leads")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A1F3A]/60 transition-colors hover:text-[#0A1F3A] dark:text-white/60 dark:hover:text-white"
          >
            <BackIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {labels.back}
          </button>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-3xl font-black text-[#0A1F3A] dark:text-white">
                  {leadName || lead.phone}
                </h1>
                <span className="inline-block rounded bg-[#D9AD55]/10 px-2 py-1 text-xs font-bold text-[#D9AD55]">
                  {displayEnum(lead.status, "leadStatus", displayLocale)}
                </span>
                {lead.isArchived && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <Archive className="h-3 w-3" aria-hidden="true" />
                    {labels.archivedBadge}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-[#0A1F3A]/70 dark:text-white/70">
                <span dir="ltr">{lead.phone}</span>
                {lead.email ? <span dir="ltr"> · {lead.email}</span> : null}
              </p>
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
                    className="nc-btn-ghost inline-flex min-h-[42px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    {labels.editAction}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEmailModal(true)}
                    className="nc-btn-ghost inline-flex min-h-[42px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    {labels.sendEmail}
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
                  className="nc-btn-ghost inline-flex min-h-[42px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold"
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
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-[#D9AD55] px-4 text-xs font-bold text-[#07182D] transition-colors hover:bg-[#EDC66D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
                {lead.archivedByName ? `${labels.archivedBy}: ${lead.archivedByName}` : null}
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
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#0A1F3A]/10 pt-4 dark:border-white/10">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A1F3A]/60 dark:text-white/60">
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
              <span className="text-xs font-semibold text-[#0A1F3A] dark:text-white">
                {lead.assignedUser
                  ? displayPerson(lead.assignedUser.name, displayLocale, { route: "/operations/leads" })
                  : labels.unassigned}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-xl border border-[#0A1F3A]/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0A1F3A]">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={labels.title}>
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
                    active
                      ? "min-h-[36px] rounded-lg bg-[#D9AD55] px-3 py-1.5 text-xs font-bold text-[#07182D] transition-colors hover:bg-[#EDC66D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55] focus-visible:ring-offset-2"
                      : "nc-btn-ghost min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold"
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
                  <h3 className="text-sm font-bold text-[#0A1F3A] dark:text-white">{labels.leadInfo}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3">
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
                  <h3 className="text-sm font-bold text-[#0A1F3A] dark:text-white">
                    {labels.contactInfo}
                  </h3>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className={infoLabelClass}>{labels.phoneLabel}</p>
                      <p className={infoValueClass} dir="ltr">
                        {lead.phone}
                      </p>
                    </div>
                    <div>
                      <p className={infoLabelClass}>{labels.emailLabel}</p>
                      <p className={infoValueClass} dir="ltr">
                        {lead.email || "—"}
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
                      <p className={infoValueClass}>{lead.project?.name || "—"}</p>
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
                  timeline.map((entry) => (
                    <div key={entry.id} className={infoCardClass}>
                      {entry.kind === "email" ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-xs font-bold text-[#0A1F3A]/60 dark:text-white/60">
                              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                              {entry.message.direction === "outbound"
                                ? labels.emailDirectionOut
                                : labels.emailDirectionIn}
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-[#0A1F3A] dark:text-white">
                              {entry.message.subject}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[#0A1F3A]/60 dark:text-white/60" dir="ltr">
                              {entry.message.to}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-[#0A1F3A]/60 dark:text-white/60">
                            {formatDisplayDateTime(entry.at)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#0A1F3A]/60 dark:text-white/60">
                              {activityTypeLabel(entry.activity.activityType, langKey)}
                              {entry.activity.userName
                                ? ` · ${labels.activityBy} ${entry.activity.userName}`
                                : ""}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#0A1F3A] dark:text-white">
                              {entry.activity.description}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-[#0A1F3A]/60 dark:text-white/60">
                            {formatDisplayDateTime(entry.at)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-3">
                {lead.tasks.length === 0 ? (
                  renderEmptyState(labels.noTasks)
                ) : (
                  lead.tasks.map((task) => (
                    <div key={task.id} className={infoCardClass}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#0A1F3A] dark:text-white">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="mt-1 text-xs text-[#0A1F3A]/60 dark:text-white/60">
                              {task.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-[#0A1F3A]/60 dark:text-white/60">
                            {labels.taskAssignee}:{" "}
                            {task.assignedUserName
                              ? displayPerson(task.assignedUserName, displayLocale, {
                                  route: "/operations/leads",
                                })
                              : labels.unassigned}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                          <span className="inline-flex min-h-[24px] items-center rounded-full border border-[#0A1F3A]/10 bg-white px-2.5 text-[11px] font-bold text-[#0A1F3A] dark:border-white/10 dark:bg-[#0A1F3A] dark:text-white">
                            {taskStatusLabel(task.status, langKey)}
                          </span>
                          <span className="text-xs text-[#0A1F3A]/60 dark:text-white/60">
                            {labels.taskDue}: {formatDisplayDate(task.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
              />
            )}

            {activeTab === "history" && (
              <div className="space-y-3">
                {lead.history.length === 0 ? (
                  renderEmptyState(labels.noHistory)
                ) : (
                  lead.history.map((entry) => (
                    <div key={entry.id} className={infoCardClass}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#0A1F3A] dark:text-white">
                            {leadHistoryActionLabel(entry.action, langKey)}
                          </p>
                          {entry.userName && (
                            <p className="mt-1 text-xs text-[#0A1F3A]/60 dark:text-white/60">
                              {labels.activityBy} {entry.userName}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-[#0A1F3A]/60 dark:text-white/60">
                          {formatDisplayDateTime(entry.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-lead-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !archiveSaving) setShowArchiveDialog(false);
          }}
        >
          <div
            dir={direction}
            className="w-[calc(100vw-1.5rem)] max-w-md rounded-xl border border-[#0A1F3A]/10 bg-white p-5 text-[#0A1F3A] shadow-2xl dark:border-white/10 dark:bg-[#0A1F3A] dark:text-white sm:w-full"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="archive-lead-title" className="text-base font-bold">
                {labels.archiveAction}: {leadName || lead.phone}
              </h2>
              <button
                type="button"
                onClick={() => setShowArchiveDialog(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#0A1F3A]/10 bg-white text-[#0A1F3A]/60 transition-colors hover:text-[#0A1F3A] dark:border-white/10 dark:bg-[#0A1F3A] dark:text-white/60 dark:hover:text-white"
                aria-label={labels.cancel}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <label className="mb-1.5 mt-4 block text-xs font-bold text-[#0A1F3A]/60 dark:text-white/60" htmlFor="archive-reason">
              {labels.archiveReasonLabel} *
            </label>
            <textarea
              id="archive-reason"
              value={archiveReason}
              onChange={(event) => setArchiveReason(event.target.value)}
              placeholder={labels.archiveReasonPlaceholder}
              rows={3}
              className="w-full rounded-lg border border-[#0A1F3A]/10 bg-white px-3 py-2 text-sm font-semibold text-[#0A1F3A] outline-none transition-colors focus:border-[#D9AD55] dark:border-white/10 dark:bg-[#0A1F3A] dark:text-white"
            />
            {archiveError && (
              <p className="mt-2 text-xs font-semibold text-red-500">{archiveError}</p>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowArchiveDialog(false)}
                disabled={archiveSaving}
                className="nc-btn-ghost min-h-[42px] rounded-lg px-4 py-2 text-sm font-bold"
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleArchive()}
                disabled={archiveSaving}
                className="min-h-[42px] rounded-lg bg-[#D9AD55] px-5 py-2 text-sm font-bold text-[#07182D] transition-colors hover:bg-[#EDC66D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
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
            className="flex max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-xl flex-col overflow-hidden rounded-xl border border-[#0A1F3A]/10 bg-white text-[#0A1F3A] shadow-2xl dark:border-white/10 dark:bg-[#0A1F3A] dark:text-white sm:w-full"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#0A1F3A]/10 px-5 py-4 dark:border-white/10">
              <h2 id="send-email-title" className="text-base font-bold">
                {labels.sendEmail}: {leadName || lead.phone}
              </h2>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#0A1F3A]/10 bg-white text-[#0A1F3A]/60 transition-colors hover:text-[#0A1F3A] dark:border-white/10 dark:bg-[#0A1F3A] dark:text-white/60 dark:hover:text-white"
                aria-label={labels.cancel}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#0A1F3A]/60 dark:text-white/60" htmlFor="email-to">
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
                <label className="mb-1.5 block text-xs font-bold text-[#0A1F3A]/60 dark:text-white/60" htmlFor="email-subject">
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
                <label className="mb-1.5 block text-xs font-bold text-[#0A1F3A]/60 dark:text-white/60" htmlFor="email-body">
                  {labels.emailBody} *
                </label>
                <textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(event) => setEmailBody(event.target.value)}
                  required
                  rows={7}
                  className="w-full rounded-lg border border-[#0A1F3A]/10 bg-white px-3 py-2 text-sm font-semibold text-[#0A1F3A] outline-none transition-colors focus:border-[#D9AD55] dark:border-white/10 dark:bg-[#0A1F3A] dark:text-white"
                />
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#0A1F3A]/10 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#0A1F3A] sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                disabled={emailSending}
                className="nc-btn-ghost min-h-[42px] rounded-lg px-4 py-2 text-sm font-bold"
              >
                {labels.cancel}
              </button>
              <button
                type="submit"
                disabled={emailSending}
                className="min-h-[42px] rounded-lg bg-[#D9AD55] px-5 py-2 text-sm font-bold text-[#07182D] transition-colors hover:bg-[#EDC66D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailSending ? labels.sending : labels.send}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
