import type { LeadStatusValue } from "@/lib/leads/model";
import { operationsVisual } from "@/features/operations/visual";

export const leadVisual = {
  page: operationsVisual.page,
  pageStack: operationsVisual.pageStack,
  workspaceHero: operationsVisual.hero,
  detailHero: "orca-workspace-hero !block",
  workspaceMetrics: operationsVisual.metrics,
  workspacePanel: `${operationsVisual.panel} flex min-w-0 flex-col overflow-hidden`,
  workspaceToolbar: `${operationsVisual.toolbar} shrink-0 border-b border-[var(--nc-border)]`,
  workspacePagination: `${operationsVisual.pagination} shrink-0 border-t border-[var(--nc-border)]`,
  workspaceTabs:
    "flex min-h-[60px] flex-nowrap items-center gap-2 overflow-x-auto border-b border-[var(--nc-border)] px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  panel: operationsVisual.panel,
  softPanel: operationsVisual.softPanel,
  card:
    "rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]",
  metricCard: operationsVisual.metricCard,
  interactiveRow:
    "!min-h-[64px] !rounded-xl !border-[var(--nc-border)] !bg-[var(--nc-surface-strong)] transition-colors duration-150 hover:!border-[var(--nc-accent-border)] hover:!bg-[var(--nc-accent-soft)] focus-visible:!border-[var(--nc-accent-border)] focus-visible:!bg-[var(--nc-accent-soft)] focus-visible:!ring-2 focus-visible:!ring-[var(--nc-accent)]",
  pageEyebrow: operationsVisual.eyebrow,
  pageTitle: operationsVisual.title,
  pageDescription: operationsVisual.description,
  sectionTitle: operationsVisual.sectionTitle,
  label: "text-xs font-bold leading-5 text-[var(--nc-text-secondary)]",
  value: "mt-1 text-sm font-bold leading-5 text-[var(--nc-text-primary)]",
  meta: operationsVisual.meta,
  input:
    "min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition placeholder:text-[var(--nc-text-dim)] focus-visible:border-[var(--nc-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  textarea:
    "w-full resize-none overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 text-sm font-semibold leading-6 text-[var(--nc-text-primary)] outline-none transition placeholder:text-[var(--nc-text-dim)] focus-visible:border-[var(--nc-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  select:
    "min-h-[44px] rounded-xl border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-sm font-semibold text-[var(--nc-text-primary)]",
  primaryButton: operationsVisual.primaryButton,
  secondaryButton: operationsVisual.secondaryButton,
  ghostButton: operationsVisual.ghostButton,
  dangerGhostButton:
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-500/30 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300",
  compactPrimaryButton: operationsVisual.primaryButton,
  iconTile: operationsVisual.iconTile,
  metricIconTile: operationsVisual.metricIconTile,
  modalOverlay: operationsVisual.dialogOverlay,
  modal: operationsVisual.dialog,
  modalHeader: operationsVisual.dialogHeader,
  modalBody: operationsVisual.dialogBody,
  modalFooter: operationsVisual.dialogFooter,
  closeButton: operationsVisual.closeButton,
  tab: operationsVisual.tab,
  activeTab: operationsVisual.activeTab,
  emptyState: operationsVisual.emptyState,
} as const;

const statusTone: Record<LeadStatusValue, string> = {
  NEW: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  CONTACTED: "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  QUALIFIED: "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  VISIT_SCHEDULED: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  VISITED: "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  OFFER_MADE: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  NEGOTIATION: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  RESERVED: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  CONTRACT_SIGNED: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  WON: "border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-300",
  LOST: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
};

export function leadStatusTone(status?: string | null): string {
  if (!status || !(status in statusTone)) {
    return "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-[var(--nc-text-secondary)]";
  }

  return statusTone[status as LeadStatusValue];
}

export function taskStatusTone(status?: string | null): string {
  switch (String(status || "").toUpperCase()) {
    case "COMPLETED":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "IN_PROGRESS":
      return "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "CANCELLED":
      return "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    default:
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
}
