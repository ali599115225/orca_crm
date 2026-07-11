// components/views/LeadsWorkspace.tsx — ORCA Leads list (standalone)
// List-only page: search, filter, sort, server pagination, KPIs, and the
// unified create form. Row click navigates to the official detail page at
// /operations/leads/[id]. `status` is the single source of truth — the
// legacy `stage` field is never read here.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  BadgeCheck,
  Plus,
  RotateCcw,
  Search,
  TrendingUp,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { displayPerson, displayGeo, displayEnum } from "@/lib/display";
import type { DisplayLocale } from "@/lib/display";
import InteractiveSurface from "@/components/ui/InteractiveSurface";
import { formatNumber, formatDate } from "@/components/leads/helpers";
import { LEAD_STATUS_VALUES, type LeadStatusValue } from "@/lib/leads/model";
import { getLeadsAction, type GetLeadsResult, type LeadListRow, type LeadSortField } from "@/app/actions/leads";
import { leadsCopy } from "@/features/leads/copy/leadsCopy";
import LeadFormDialog from "@/features/leads/components/LeadFormDialog";
import SettingsSelect from "@/components/settings/SettingsSelect";
import type { SettingsSelectOption } from "@/components/settings/SettingsSelect";
import { leadStatusTone, leadVisual } from "@/features/leads/visual";

const PAGE_SIZE = 5;

type SortOption = "newest" | "oldest" | "score" | "name";

const SORT_MAP: Record<SortOption, { sort: LeadSortField; dir: "asc" | "desc" }> = {
  newest: { sort: "createdAt", dir: "desc" },
  oldest: { sort: "createdAt", dir: "asc" },
  score: { sort: "leadScore", dir: "desc" },
  name: { sort: "firstName", dir: "asc" },
};

interface LeadsWorkspaceProps {
  viewerRole: string;
  viewerUserId: string;
}

export default function LeadsWorkspace({ viewerRole, viewerUserId }: LeadsWorkspaceProps) {
  const router = useRouter();
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const displayLocale: DisplayLocale = isArabic ? "ar" : "en";
  const labels = isArabic ? leadsCopy.ar : leadsCopy.en;
  const direction = isArabic ? "rtl" : "ltr";

  const [result, setResult] = useState<GetLeadsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatusValue | "ALL">("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const requestSeq = useRef(0);

  const loadLeads = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setLoadFailed(false);

    const { sort, dir } = SORT_MAP[sortOption];
    const response = await getLeadsAction({
      page,
      limit: PAGE_SIZE,
      q: query,
      status: statusFilter,
      sort,
      dir,
      includeArchived: showArchived,
    });

    if (seq !== requestSeq.current) return;
    if (!response.success) {
      setLoadFailed(true);
      setResult(null);
    } else {
      setResult(response);
    }
    setLoading(false);
  }, [page, query, statusFilter, sortOption, showArchived]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  // Debounced server-side search.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const rows: LeadListRow[] = result?.data || [];
  const kpis = result?.kpis;

  const leadDisplayName = (lead: LeadListRow): string => {
    const name = `${lead.firstName || ""} ${lead.lastName || ""}`.trim().replace(/\s+/g, " ");
    return name || (lead.phone || "").trim() || labels.notSpecified;
  };

  const statusOptions: SettingsSelectOption[] = useMemo(
    () =>
      LEAD_STATUS_VALUES.map((value) => ({
        value,
        label: displayEnum(value, "leadStatus", displayLocale),
      })),
    [displayLocale],
  );

  const sortOptions: SettingsSelectOption[] = useMemo(
    () => [
      { value: "newest", label: labels.sortNewest },
      { value: "oldest", label: labels.sortOldest },
      { value: "score", label: labels.sortScore },
      { value: "name", label: labels.sortName },
    ],
    [labels],
  );

  const allStatusesOption: SettingsSelectOption = useMemo(
    () => ({ value: "ALL", label: labels.allStatuses }),
    [labels],
  );

  const openLead = (leadId: string) => {
    router.push(`/operations/leads/${leadId}`);
  };

  return (
    <section dir={direction} className={leadVisual.page}>
      <div className={leadVisual.pageStack}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={leadVisual.pageEyebrow}>{labels.breadcrumb}</p>
            <h1 className={leadVisual.pageTitle}>{labels.title}</h1>
            <p className={leadVisual.pageDescription}>{labels.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className={leadVisual.primaryButton}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {labels.addLead}
          </button>
        </div>

        {kpis && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: labels.totalLeads,
                value: formatNumber(kpis.total, isArabic),
                note: labels.leadRegistry,
                icon: UsersRound,
              },
              {
                label: labels.newLeads,
                value: formatNumber(kpis.newCount, isArabic),
                note: labels.thisWeek,
                icon: UserPlus,
              },
              {
                label: labels.qualified,
                value: formatNumber(kpis.qualifiedCount, isArabic),
                note: labels.readyFollowUp,
                icon: BadgeCheck,
              },
              {
                label: labels.conversion,
                value: `${formatNumber(kpis.conversion, isArabic)}%`,
                note: labels.closedRate,
                icon: TrendingUp,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={leadVisual.metricCard}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className={leadVisual.label}>{item.label}</p>
                      <strong className="mt-3 block text-3xl font-extrabold tabular-nums tracking-tight text-[var(--nc-text-primary)]">
                        {item.value}
                      </strong>
                    </div>
                    <span className={leadVisual.metricIconTile}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-4 text-xs font-medium leading-5 text-[var(--nc-text-secondary)]">
                    {item.note}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className={`${leadVisual.panel} p-4 sm:p-5`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nc-text-secondary)] ${isArabic ? "right-3" : "left-3"}`}
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={labels.searchPlaceholder}
                aria-label={labels.searchPlaceholder}
                className={`${leadVisual.input} ${isArabic ? "pr-9 pl-3" : "pl-9 pr-3"}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SettingsSelect
                aria-label={labels.statusFilter}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value as LeadStatusValue | "ALL");
                  setPage(1);
                }}
                options={[allStatusesOption, ...statusOptions]}
                className={leadVisual.select}
              />

              <SettingsSelect
                aria-label={labels.sortLabel}
                value={sortOption}
                onChange={(value) => {
                  setSortOption(value as SortOption);
                  setPage(1);
                }}
                options={sortOptions}
                className={leadVisual.select}
              />

              <button
                type="button"
                onClick={() => {
                  setShowArchived((value) => !value);
                  setPage(1);
                }}
                aria-pressed={showArchived}
                className={
                  showArchived
                    ? `${leadVisual.secondaryButton} border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent-text)]`
                    : leadVisual.secondaryButton
                }
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                {labels.showArchived}
              </button>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className={leadVisual.emptyState}>
                <p className="text-sm font-medium text-[var(--nc-text-secondary)]">{labels.loading}</p>
              </div>
            ) : loadFailed ? (
              <div className={`${leadVisual.emptyState} flex flex-col items-center gap-3`}>
                <p className="text-sm font-medium text-[var(--nc-text-secondary)]">{labels.loadError}</p>
                <button
                  type="button"
                  onClick={() => void loadLeads()}
                  className={leadVisual.secondaryButton}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {labels.retry}
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className={leadVisual.emptyState}>
                <p className="text-sm font-medium text-[var(--nc-text-secondary)]">{labels.noLeads}</p>
              </div>
            ) : (
              <>
                <div
                  className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px_minmax(0,1fr)] gap-3 px-4 pb-2 text-center text-xs font-semibold text-[var(--nc-text-secondary)] md:grid"
                  aria-hidden="true"
                >
                  <span>{labels.lead}</span>
                  <span>{labels.status}</span>
                  <span>{labels.source}</span>
                  <span>{labels.owner}</span>
                  <span className="text-center">{labels.score}</span>
                  <span>{labels.createdAtLabel}</span>
                </div>

                <ul className="space-y-2" aria-label={labels.leadsList}>
                  {rows.map((lead) => (
                    <li key={lead.id}>
                      <InteractiveSurface
                        variant="row"
                        onClick={() => openLead(lead.id)}
                        aria-label={`${labels.lead}: ${leadDisplayName(lead)}`}
                        className={`${leadVisual.interactiveRow} px-4 py-3 text-start`}
                      >
                        <span className="grid w-full grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px_minmax(0,1fr)] md:gap-3 md:text-center">
                          <span className="min-w-0 md:text-center">
                            <span className="flex items-center gap-2 md:justify-center">
                              <span className="block min-w-0 truncate text-sm font-bold text-[var(--nc-text-primary)]">
                                <bdi dir="auto">{leadDisplayName(lead)}</bdi>
                              </span>
                              {lead.isArchived && (
                                <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-2 py-0.5 text-[10px] font-bold text-[var(--nc-text-secondary)]">
                                  {labels.archivedBadge}
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block truncate text-start text-xs font-medium text-[var(--nc-text-secondary)] md:text-center">
                              <bdi dir="ltr" className="inline-block tabular-nums">{lead.phone}</bdi>
                            </span>
                          </span>

                          <span className="min-w-0 md:flex md:justify-center">
                            <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-bold ${leadStatusTone(lead.status)}`}>
                              {displayEnum(lead.status, "leadStatus", displayLocale)}
                            </span>
                          </span>

                          <span className="min-w-0 truncate text-xs font-semibold text-[var(--nc-text-secondary)] md:text-center">
                            <bdi dir="auto">{displayEnum(lead.source, "leadSource", displayLocale)}</bdi>
                            <span aria-hidden="true"> · </span>
                            <bdi dir="auto">
                              {displayGeo(lead.city, "city", displayLocale, { route: "/operations/leads" })}
                            </bdi>
                          </span>

                          <span className="min-w-0 truncate text-xs font-semibold text-[var(--nc-text-secondary)] md:text-center">
                            <bdi dir="auto">
                              {lead.assignedUserName
                                ? displayPerson(lead.assignedUserName, displayLocale, { route: "/operations/leads" })
                                : labels.unassigned}
                            </bdi>
                          </span>

                          <span className="text-center text-xs font-bold tabular-nums text-[var(--nc-text-primary)]">
                            {formatNumber(lead.leadScore, isArabic)}
                          </span>

                          <span className="min-w-0 truncate text-xs font-semibold text-[var(--nc-text-secondary)] md:text-center">
                            {formatDate(lead.createdAt, isArabic, labels.notSpecified)}
                          </span>
                        </span>
                      </InteractiveSurface>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-medium text-[var(--nc-text-secondary)]">
                  <span>
                    {formatNumber(result?.total || 0, isArabic)} {labels.resultsCount}
                  </span>
                </div>

                {(result?.totalPages || 1) > 1 && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-[var(--nc-border)] pt-4 text-sm font-medium text-[var(--nc-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {labels.page} {formatNumber(page, isArabic)} {labels.of}{" "}
                      {formatNumber(result?.totalPages || 1, isArabic)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                        className={leadVisual.secondaryButton}
                      >
                        {labels.previous}
                      </button>
                      <button
                        type="button"
                        disabled={page >= (result?.totalPages || 1)}
                        onClick={() => setPage((value) => Math.min(result?.totalPages || 1, value + 1))}
                        className={leadVisual.compactPrimaryButton}
                      >
                        {labels.next}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showCreateDialog && (
        <LeadFormDialog
          mode="create"
          lang={isArabic ? "ar" : "en"}
          labels={labels}
          direction={direction}
          viewerRole={viewerRole}
          viewerUserId={viewerUserId}
          onClose={() => setShowCreateDialog(false)}
          onSaved={(leadId) => {
            setShowCreateDialog(false);
            if (leadId) {
              openLead(leadId);
            } else {
              void loadLeads();
            }
          }}
          onRestored={(leadId) => {
            setShowCreateDialog(false);
            openLead(leadId);
          }}
        />
      )}
    </section>
  );
}
