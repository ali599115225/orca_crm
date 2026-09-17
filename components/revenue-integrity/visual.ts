import { operationsVisual } from "@/features/operations/visual";

/**
 * Revenue Integrity visual contract.
 * Follows the same workspace hierarchy used by the closed Tasks page.
 */
export const revenueVisual = {
  page: operationsVisual.page,
  shell: operationsVisual.pageStack,
  workspaceHero: operationsVisual.hero,
  workspaceMetrics: `${operationsVisual.metrics} xl:grid-cols-5`,
  workspaceTabs:
    "flex min-h-[60px] gap-2 overflow-x-auto rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  tabWorkspaceGrid:
    "grid min-h-0 items-start gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]",
  panel: `${operationsVisual.panel} flex min-w-0 flex-col overflow-hidden`,
  softCard: `${operationsVisual.softPanel} p-3`,
  interactiveCard: `${operationsVisual.interactiveContentCard} p-3`,
  metricCard: operationsVisual.metricCard,
  pageTitle: operationsVisual.title,
  pageDescription: operationsVisual.description,
  sectionTitle: operationsVisual.sectionTitle,
  sectionDescription:
    "mt-1 text-xs leading-5 text-[var(--nc-text-dim)]",
  label: "block text-xs font-bold leading-5 text-[var(--nc-text-secondary)]",
  meta: operationsVisual.meta,
  input:
    "mt-2 min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition placeholder:text-[var(--nc-text-secondary)] focus-visible:border-[var(--nc-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  select:
    "mt-2 min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition focus-visible:border-[var(--nc-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  textarea:
    "mt-2 w-full max-w-full min-w-0 box-border resize-none overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 text-sm font-semibold leading-6 text-[var(--nc-text-primary)] outline-none transition placeholder:text-[var(--nc-text-secondary)] focus-visible:border-[var(--nc-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  primaryButton: operationsVisual.primaryButton,
  secondaryButton: operationsVisual.secondaryButton,
  successGhostButton:
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-500/30 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300",
  dangerGhostButton:
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-500/30 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300",
  tab: operationsVisual.tab,
  activeTab: operationsVisual.activeTab,
  emptyState: operationsVisual.emptyState,
  errorNotice:
    "rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-700 dark:text-rose-300",
  successNotice:
    "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300",
  modalOverlay: operationsVisual.dialogOverlay,
  modal: `${operationsVisual.dialog} max-w-md p-5`,
  goldScrollbar:
    "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
} as const;

export function revenueStatusTone(status: string): string {
  if (["CONNECTED", "ACTIVE", "EXECUTED", "RESOLVED", "DELIVERED", "APPROVED", "READY"].includes(status)) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (["CRITICAL", "ERROR", "FAILED", "DEAD_LETTER", "REJECTED"].includes(status)) {
    return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  if (["HIGH", "PENDING_APPROVAL", "PENDING", "RETRY", "ACKNOWLEDGED", "MEDIUM"].includes(status)) {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-[var(--nc-text-secondary)]";
}
