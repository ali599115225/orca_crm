"use client";

import Link from "next/link";
import {
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  MessageCircleMore,
  UserRound,
} from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  displayEntity,
  displayEnum,
  displayGeo,
  displayPerson,
  type DisplayLocale,
} from "@/lib/display";
import {
  formatDisplayDate,
  formatDisplayTime,
} from "@/lib/display/dateTime";
import type { DashboardReadModel } from "../model";
import {
  localizeDashboardTaskTitle,
  type DashboardCopy,
} from "../copy/dashboardCopy";
import { dashboardVisual } from "../visual";
import DashboardSectionState from "./DashboardSectionState";

type OperationTab = "tasks" | "recentLeads" | "whatsapp";

interface DailyOperationsCenterProps {
  operations: DashboardReadModel["operations"];
  copy: DashboardCopy;
  locale: DisplayLocale;
  isArabic: boolean;
  searchQuery: string;
  onRetry: () => void;
}

const tabOrder: OperationTab[] = ["tasks", "recentLeads", "whatsapp"];

function badgeCount(value: number): string {
  return value > 99 ? "99+" : String(value);
}

function priorityTone(priority: string): string {
  if (priority === "HIGH") {
    return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (priority === "MEDIUM") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

function leadStatusTone(status: string): string {
  if (["WON", "CONTRACT_SIGNED"].includes(status)) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "LOST") {
    return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (["OFFER_MADE", "NEGOTIATION", "RESERVED"].includes(status)) {
    return "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }
  if (["VISIT_SCHEDULED", "VISITED"].includes(status)) {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

export default function DailyOperationsCenter({
  operations,
  copy,
  locale,
  isArabic,
  searchQuery,
  onRetry,
}: DailyOperationsCenterProps) {
  const [activeTab, setActiveTab] = useState<OperationTab>("tasks");
  const tabRefs = useRef<Record<OperationTab, HTMLButtonElement | null>>({
    tasks: null,
    recentLeads: null,
    whatsapp: null,
  });

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();

  const filteredTasks = useMemo(() => {
    if (operations.tasks.status !== "ready") return [];
    if (!normalizedSearch) return operations.tasks.data.items;

    return operations.tasks.data.items.filter((task) => {
      const localizedTitle = localizeDashboardTaskTitle(task.title, locale);

      return [
        task.title,
        localizedTitle,
        task.leadName,
        task.assignedName,
        task.priority,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase().includes(normalizedSearch),
        );
    });
  }, [locale, normalizedSearch, operations.tasks]);

  const filteredLeads = useMemo(() => {
    if (operations.recentLeads.status !== "ready") return [];
    if (!normalizedSearch) return operations.recentLeads.data.items;

    return operations.recentLeads.data.items.filter((lead) =>
      [
        `${lead.firstName} ${lead.lastName || ""}`,
        lead.phone,
        lead.city,
        lead.status,
        lead.projectName,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase().includes(normalizedSearch),
        ),
    );
  }, [normalizedSearch, operations.recentLeads]);

  const whatsappMatchesSearch = useMemo(() => {
    if (operations.whatsapp.status !== "ready") return false;
    if (!normalizedSearch) return true;

    const data = operations.whatsapp.data;
    return [
      copy.whatsapp,
      copy.conversations,
      copy.newWhatsappLeads,
      copy.unreadMessages,
      data.conversationsCount,
      data.newLeadsCount,
      data.unreadMessagesCount,
    ].some((value) =>
      String(value).toLocaleLowerCase().includes(normalizedSearch),
    );
  }, [copy, normalizedSearch, operations.whatsapp]);

  const taskCount =
    operations.tasks.status === "ready"
      ? normalizedSearch
        ? filteredTasks.length
        : operations.tasks.data.total
      : null;

  const leadCount =
    operations.recentLeads.status === "ready"
      ? normalizedSearch
        ? filteredLeads.length
        : operations.recentLeads.data.newThisWeek
      : null;

  const whatsappCount =
    operations.whatsapp.status === "ready"
      ? whatsappMatchesSearch
        ? operations.whatsapp.data.unreadMessagesCount
        : 0
      : null;

  const tabs: Array<{ key: OperationTab; label: string; count: number | null }> = [
    { key: "tasks", label: copy.tasks, count: taskCount },
    { key: "recentLeads", label: copy.recentLeads, count: leadCount },
    { key: "whatsapp", label: copy.whatsapp, count: whatsappCount },
  ];

  const activateTab = (tab: OperationTab) => {
    setActiveTab(tab);
    tabRefs.current[tab]?.focus();
  };

  const moveFocus = (current: OperationTab, direction: -1 | 1) => {
    const currentIndex = tabOrder.indexOf(current);
    const nextIndex =
      (currentIndex + direction + tabOrder.length) % tabOrder.length;
    activateTab(tabOrder[nextIndex]);
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    tab: OperationTab,
  ) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveFocus(tab, isArabic ? 1 : -1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveFocus(tab, isArabic ? -1 : 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      activateTab(tabOrder[0]);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      activateTab(tabOrder[tabOrder.length - 1]);
    }
  };

  const renderTasks = () => {
    if (operations.tasks.status === "error") {
      return (
        <DashboardSectionState
          kind="error"
          message={copy.dataUnavailable}
          retryLabel={copy.retry}
          onRetry={onRetry}
        />
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <DashboardSectionState
          kind="empty"
          message={normalizedSearch ? copy.noSearchResults : copy.noTasks}
        />
      );
    }

    return (
      <div className="space-y-2">
        {filteredTasks.map((task) => {
          const localizedTitle = localizeDashboardTaskTitle(task.title, locale);
          const displayedLeadName = task.leadName
            ? displayPerson(task.leadName, locale, {
                route: "/operations/dashboard",
                entityId: task.id,
                fieldName: "leadName",
              })
            : null;
          const displayedAssignedName = task.assignedName
            ? displayPerson(task.assignedName, locale, {
                route: "/operations/dashboard",
                entityId: task.id,
                fieldName: "agentName",
              })
            : null;
          const priorityLabel =
            task.priority === "HIGH"
              ? copy.high
              : task.priority === "MEDIUM"
                ? copy.medium
                : copy.low;

          return (
            <div key={task.id} className={`${dashboardVisual.contentCard} p-3.5`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold text-[var(--nc-text-primary)]">
                    <bdi dir="auto">{localizedTitle}</bdi>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--nc-text-secondary)]">
                    {displayedLeadName && (
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                        <bdi dir="auto">{displayedLeadName}</bdi>
                      </span>
                    )}
                    {displayedAssignedName && (
                      <span>
                        <bdi dir="auto">{displayedAssignedName}</bdi>
                      </span>
                    )}
                    <span>{formatDisplayTime(new Date(task.dueDate))}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {task.isOverdue && (
                    <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-700 dark:text-red-300">
                      {copy.overdue}
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${priorityTone(task.priority)}`}
                  >
                    {priorityLabel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-2">
          <Link href="/operations/tasks" className={dashboardVisual.secondaryLink}>
            {copy.viewAllTasks}
            {isArabic ? (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </Link>
        </div>
      </div>
    );
  };

  const renderLeads = () => {
    if (operations.recentLeads.status === "error") {
      return (
        <DashboardSectionState
          kind="error"
          message={copy.dataUnavailable}
          retryLabel={copy.retry}
          onRetry={onRetry}
        />
      );
    }

    if (filteredLeads.length === 0) {
      return (
        <DashboardSectionState
          kind="empty"
          message={normalizedSearch ? copy.noSearchResults : copy.noLeads}
        />
      );
    }

    return (
      <div className="space-y-2">
        {filteredLeads.map((lead) => {
          const fullName = `${lead.firstName} ${lead.lastName || ""}`.trim();
          const displayedName = displayPerson(fullName, locale, {
            route: "/operations/dashboard",
            entityId: lead.id,
          });

          return (
            <Link
              key={lead.id}
              href={`/operations/leads/${lead.id}`}
              className={`${dashboardVisual.interactiveContentCard} flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--nc-text-primary)]">
                  <bdi dir="auto">{displayedName}</bdi>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--nc-text-secondary)]">
                  <bdi dir="ltr">{lead.phone}</bdi>
                  <span aria-hidden="true">•</span>
                  <span>
                    {displayGeo(lead.city, "city", locale, {
                      route: "/operations/dashboard",
                    })}
                  </span>
                  {lead.projectName && (
                    <>
                      <span aria-hidden="true">•</span>
                      <bdi dir="auto">
                        {displayEntity(lead.projectName, "project", locale, {
                          route: "/operations/dashboard",
                          entityId: lead.id,
                          fieldName: "projectName",
                        })}
                      </bdi>
                    </>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${leadStatusTone(lead.status)}`}
                >
                  {displayEnum(lead.status, "leadStatus", locale)}
                </span>
                <span className="text-xs text-[var(--nc-text-dim)]">
                  {formatDisplayDate(new Date(lead.createdAt))}
                </span>
              </div>
            </Link>
          );
        })}

        <div className="pt-2">
          <Link href="/operations/leads" className={dashboardVisual.secondaryLink}>
            {copy.viewAllLeads}
            {isArabic ? (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </Link>
        </div>
      </div>
    );
  };

  const renderWhatsapp = () => {
    if (operations.whatsapp.status === "error") {
      return (
        <DashboardSectionState
          kind="error"
          message={copy.dataUnavailable}
          retryLabel={copy.retry}
          onRetry={onRetry}
        />
      );
    }

    if (!whatsappMatchesSearch) {
      return (
        <DashboardSectionState kind="empty" message={copy.noSearchResults} />
      );
    }

    const metrics = [
      {
        key: "conversations",
        label: copy.conversations,
        value: operations.whatsapp.data.conversationsCount,
      },
      {
        key: "newLeads",
        label: copy.newWhatsappLeads,
        value: operations.whatsapp.data.newLeadsCount,
      },
      {
        key: "unread",
        label: copy.unreadMessages,
        value: operations.whatsapp.data.unreadMessagesCount,
      },
    ];

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.key} className={`${dashboardVisual.contentCard} p-4`}>
              <p className="text-xs font-bold text-[var(--nc-text-secondary)]">
                {metric.label}
              </p>
              <strong className="mt-3 block text-3xl font-black text-[var(--nc-text-primary)]">
                {metric.value}
              </strong>
            </div>
          ))}
        </div>

        <Link href="/operations/whatsapp" className={dashboardVisual.secondaryLink}>
          {copy.openWhatsapp}
          {isArabic ? (
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
        </Link>
      </div>
    );
  };

  return (
    <section className={`${dashboardVisual.sectionPanel} p-5 sm:p-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className={dashboardVisual.iconTile}>
            <CheckSquare2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className={dashboardVisual.sectionTitle}>
              {copy.operationsTitle}
            </h2>
            <p className="mt-1 text-xs text-[var(--nc-text-secondary)]">
              {copy.operationsDescription}
            </p>
          </div>
        </div>

        {normalizedSearch && (
          <div className={dashboardVisual.statusBadge}>
            {copy.searchLabel}: <bdi dir="auto">{searchQuery}</bdi>
          </div>
        )}
      </div>

      <div
        className="mt-5 flex max-w-full gap-2 overflow-x-auto border-b border-[var(--nc-glass-border)] pb-3"
        role="tablist"
        aria-label={copy.operationsTitle}
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              ref={(node: HTMLButtonElement | null) => {
                tabRefs.current[tab.key] = node;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`dashboard-panel-${tab.key}`}
              id={`dashboard-tab-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.key)}
              className={
                selected
                  ? dashboardVisual.tabActive
                  : dashboardVisual.tabIdle
              }
            >
              {tab.key === "whatsapp" && (
                <MessageCircleMore className="h-4 w-4" aria-hidden="true" />
              )}
              {tab.label}
              <span className={dashboardVisual.counterBadge}>
                {tab.count === null ? "—" : badgeCount(tab.count)}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="pt-5"
        role="tabpanel"
        id={`dashboard-panel-${activeTab}`}
        aria-labelledby={`dashboard-tab-${activeTab}`}
      >
        {activeTab === "tasks" && renderTasks()}
        {activeTab === "recentLeads" && renderLeads()}
        {activeTab === "whatsapp" && renderWhatsapp()}
      </div>
    </section>
  );
}
