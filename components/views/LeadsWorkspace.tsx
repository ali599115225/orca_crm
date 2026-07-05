// components/views/LeadsWorkspace.tsx — ORCA Leads list (standalone)
// List-only page: search, filter, sort, server pagination, KPIs, and the
// unified create form. Row click navigates to the official detail page at
// /operations/leads/[id]. `status` is the single source of truth — the
// legacy `stage` field is never read here.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, RotateCcw, Archive } from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { displayPerson, displayGeo, displayEnum } from "@/lib/display";
import type { DisplayLocale } from "@/lib/display";
import InteractiveSurface from "@/components/ui/InteractiveSurface";
import LeadsKpis from "@/components/leads/LeadsKpis";
import { formatNumber, formatDate, EmptyState, LeadStatusBadge, PaginationBar } from "@/components/leads/helpers";
import { LEAD_STATUS_VALUES, type LeadStatusValue } from "@/lib/leads/model";
import { getLeadsAction, type GetLeadsResult, type LeadListRow, type LeadSortField } from "@/app/actions/leads";
import { leadsCopy } from "@/app/operations/leads/leadsCopy";
import LeadFormDialog from "@/app/operations/leads/LeadFormDialog";
import SettingsSelect from "@/components/settings/SettingsSelect";
import type { SettingsSelectOption } from "@/components/settings/SettingsSelect";

const PAGE_SIZE = 10;

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
    <section dir={direction} className="min-h-full px-4 pb-8 pt-8 lg:px-6">
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs text-[var(--nc-text-secondary)]">{labels.breadcrumb}</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--nc-text-primary)]">{labels.title}</h1>
            <p className="mt-1 text-sm text-[var(--nc-text-secondary)]">{labels.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#D9AD55] px-5 py-2 text-sm font-bold text-[#07182D] transition-colors hover:bg-[#EDC66D]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {labels.addLead}
          </button>
        </div>

        {kpis && (
          <LeadsKpis
            labels={labels}
            totalLeads={kpis.total}
            newLeads={kpis.newCount}
            qualified={kpis.qualifiedCount}
            conversion={kpis.conversion}
            isArabic={isArabic}
            formatNumber={formatNumber}
          />
        )}

        <div className="rounded-3xl border border-[var(--nc-border)] bg-[var(--nc-surface)] p-4 shadow-sm">
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
                className={`min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition-colors focus:border-[#D9AD55] ${isArabic ? "pr-9 pl-3" : "pl-9 pr-3"}`}
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
                className="min-h-[42px] text-xs font-semibold [&>button]:min-h-[42px]"
              />

              <SettingsSelect
                aria-label={labels.sortLabel}
                value={sortOption}
                onChange={(value) => {
                  setSortOption(value as SortOption);
                  setPage(1);
                }}
                options={sortOptions}
                className="min-h-[42px] text-xs font-semibold [&>button]:min-h-[42px]"
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
                    ? "inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[#D9AD55]/50 bg-[#D9AD55]/15 px-3 text-xs font-bold text-[var(--nc-text-primary)]"
                    : "nc-btn-ghost inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-3 text-xs font-bold"
                }
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                {labels.showArchived}
              </button>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface-soft)]">
                <p className="text-sm font-medium text-[var(--nc-text-secondary)]">{labels.loading}</p>
              </div>
            ) : loadFailed ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-4">
                <p className="text-sm font-medium text-[var(--nc-text-secondary)]">{labels.loadError}</p>
                <button
                  type="button"
                  onClick={() => void loadLeads()}
                  className="nc-btn-ghost inline-flex min-h-[40px] items-center gap-2 rounded-xl px-4 text-xs font-bold"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {labels.retry}
                </button>
              </div>
            ) : rows.length === 0 ? (
              <EmptyState message={labels.noLeads} />
            ) : (
              <>
                <div
                  className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px_minmax(0,1fr)] gap-3 px-4 pb-2 text-xs font-bold text-[var(--nc-text-secondary)] md:grid"
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
                        className="!bg-[var(--nc-surface-soft)] !border-[var(--nc-border)] px-4 py-3 text-start"
                      >
                        <span className="grid w-full grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_72px_minmax(0,1fr)] md:gap-3">
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="block truncate text-sm font-bold text-[var(--nc-text-primary)]">
                                {leadDisplayName(lead)}
                              </span>
                              {lead.isArchived && (
                                <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--nc-text-secondary)]">
                                  {labels.archivedBadge}
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[var(--nc-text-secondary)]" dir="ltr">
                              {lead.phone}
                            </span>
                          </span>

                          <span className="min-w-0">
                            <LeadStatusBadge status={lead.status} displayLocale={displayLocale} />
                          </span>

                          <span className="min-w-0 truncate text-xs font-semibold text-[var(--nc-text-secondary)]">
                            {displayEnum(lead.source, "leadSource", displayLocale)}
                            {" · "}
                            {displayGeo(lead.city, "city", displayLocale, { route: "/operations/leads" })}
                          </span>

                          <span className="min-w-0 truncate text-xs font-semibold text-[var(--nc-text-secondary)]">
                            {lead.assignedUserName
                              ? displayPerson(lead.assignedUserName, displayLocale, { route: "/operations/leads" })
                              : labels.unassigned}
                          </span>

                          <span className="text-center text-xs font-bold text-[var(--nc-text-primary)]">
                            {formatNumber(lead.leadScore, isArabic)}
                          </span>

                          <span className="min-w-0 truncate text-xs font-semibold text-[var(--nc-text-secondary)]">
                            {formatDate(lead.createdAt, isArabic, labels.notSpecified)}
                          </span>
                        </span>
                      </InteractiveSurface>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--nc-text-secondary)]">
                  <span>
                    {formatNumber(result?.total || 0, isArabic)} {labels.resultsCount}
                  </span>
                </div>

                <PaginationBar
                  page={page}
                  totalPages={result?.totalPages || 1}
                  labels={labels}
                  isArabic={isArabic}
                  onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                  onNext={() => setPage((value) => Math.min(result?.totalPages || 1, value + 1))}
                />
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
