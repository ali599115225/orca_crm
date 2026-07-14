/**
 * Revenue Integrity visual contract.
 * Follows the same workspace hierarchy used by the closed Tasks page.
 */
export const revenueVisual = {
  page:
    "nc-page nc-stack orca-container pb-4 text-[var(--nc-text-primary)]",
  shell: "nc-stack",
  workspaceHero: "orca-workspace-hero",
  workspaceMetrics: "orca-workspace-metrics xl:grid-cols-5",
  workspaceTabs:
    "flex min-h-[60px] gap-2 overflow-x-auto rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  tabWorkspaceGrid:
    "grid min-h-0 items-stretch gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]",
  panel:
    "orca-workspace-panel flex min-w-0 flex-col overflow-hidden lg:h-[430px]",
  softCard:
    "rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] p-3",
  interactiveCard:
    "rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] p-3 transition-colors duration-150 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  metricCard:
    "orca-workspace-metric min-h-[96px]",
  pageTitle:
    "mt-1 text-2xl font-black tracking-[-0.02em] text-[var(--nc-text-primary)]",
  pageDescription:
    "mt-1 max-w-3xl text-sm leading-6 text-[var(--nc-text-secondary)]",
  sectionTitle: "text-base font-black text-[var(--nc-text-primary)]",
  sectionDescription:
    "mt-1 text-xs leading-5 text-[var(--nc-text-dim)]",
  label: "block text-xs font-bold leading-5 text-[var(--nc-text-secondary)]",
  meta: "text-xs leading-5 text-[var(--nc-text-dim)]",
  input:
    "mt-2 min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition placeholder:text-[var(--nc-text-secondary)] focus-visible:border-[var(--nc-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  select:
    "mt-2 min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition focus-visible:border-[var(--nc-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  textarea:
    "mt-2 w-full max-w-full min-w-0 box-border resize-none overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 text-sm font-semibold leading-6 text-[var(--nc-text-primary)] outline-none transition placeholder:text-[var(--nc-text-secondary)] focus-visible:border-[var(--nc-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  primaryButton:
    "nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--nc-accent)] px-4 text-xs font-black text-[var(--orca-ui-on-primary)] transition hover:bg-[var(--nc-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50",
  secondaryButton:
    "nc-btn nc-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50",
  successGhostButton:
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-500/30 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300",
  dangerGhostButton:
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-500/30 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300",
  tab:
    "min-w-max shrink-0 min-h-[44px] rounded-xl border border-transparent px-3.5 text-xs font-bold text-[var(--nc-text-secondary)] transition hover:bg-[var(--nc-surface-strong)] hover:text-[var(--nc-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  activeTab:
    "min-w-max shrink-0 min-h-[44px] rounded-xl border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-3.5 text-xs font-black text-[var(--nc-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  emptyState:
    "flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-5 text-center text-sm font-medium text-[var(--nc-text-secondary)]",
  errorNotice:
    "rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-700 dark:text-rose-300",
  successNotice:
    "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300",
  modalOverlay:
    "fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-4",
  modal:
    "flex max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-y-auto rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-5 text-[var(--nc-text-primary)] shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-full",
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
