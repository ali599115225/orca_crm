/**
 * Revenue Integrity visual contract.
 * Mirrors the approved Dashboard contract (features/dashboard/visual.ts)
 * and the closed Leads page (features/leads/visual.ts). Do not introduce
 * local hex values or tokens that are not defined in app/globals.css.
 */
export const revenueVisual = {
  page: "min-h-full bg-[var(--nc-bg)] px-4 py-6 text-[var(--nc-text-primary)] sm:px-6 lg:px-8 lg:py-8",
  shell: "mx-auto w-full max-w-[1600px] space-y-6",
  panel:
    "rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-5 shadow-sm",
  softCard:
    "rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-4",
  interactiveCard:
    "rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-4 shadow-sm transition duration-200 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:shadow-md focus:outline-none focus-visible:border-[var(--nc-accent-border)] focus-visible:bg-[var(--nc-accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  metricCard:
    "group flex min-h-32 flex-col items-center justify-center rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-5 text-center shadow-sm transition duration-200 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:shadow-md",
  pageTitle:
    "text-2xl font-extrabold tracking-[-0.02em] text-[var(--nc-text-primary)] sm:text-3xl",
  pageDescription:
    "mt-1 max-w-3xl text-sm font-medium leading-6 text-[var(--nc-text-secondary)]",
  sectionTitle: "text-base font-bold text-[var(--nc-text-primary)]",
  sectionDescription:
    "mt-1 text-xs leading-5 text-[var(--nc-text-dim)]",
  label: "block text-xs font-semibold leading-5 text-[var(--nc-text-secondary)]",
  meta: "text-xs font-medium leading-5 text-[var(--nc-text-dim)]",
  input:
    "mt-2 min-h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition placeholder:text-[var(--nc-text-secondary)] focus-visible:border-[var(--nc-accent)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  select:
    "mt-2 min-h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition focus-visible:border-[var(--nc-accent)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  textarea:
    "mt-2 w-full max-w-full min-w-0 box-border resize-none overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 text-sm font-semibold leading-6 text-[var(--nc-text-primary)] outline-none transition placeholder:text-[var(--nc-text-secondary)] focus-visible:border-[var(--nc-accent)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  primaryButton:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--nc-accent)] px-4 text-sm font-bold text-[var(--orca-ui-on-primary)] transition hover:bg-[var(--nc-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nc-bg)] disabled:cursor-not-allowed disabled:opacity-50",
  secondaryButton:
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-xs font-bold text-[var(--nc-text-primary)] transition hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50",
  successGhostButton:
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50",
  dangerGhostButton:
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-500/30 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 dark:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50",
  tab:
    "min-w-max shrink-0 rounded-lg border border-transparent px-3.5 py-2 text-xs font-bold text-[var(--nc-text-primary)] transition hover:border-[var(--nc-glass-border)] hover:bg-[var(--nc-accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  activeTab:
    "min-w-max shrink-0 rounded-lg border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-3.5 py-2 text-xs font-bold text-[var(--nc-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  emptyState:
    "rounded-xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-6 text-center text-sm font-medium text-[var(--nc-text-secondary)]",
  errorNotice:
    "rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-700 dark:text-rose-300",
  successNotice:
    "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300",
  modalOverlay:
    "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4",
  modal:
    "flex max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-y-auto rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-5 text-[var(--nc-text-primary)] shadow-2xl sm:w-full",
  goldScrollbar:
    "overflow-x-auto [&::-webkit-scrollbar-thumb]:bg-[var(--nc-accent-border)] [&::-webkit-scrollbar-thumb:hover]:bg-[var(--nc-accent)]",
} as const;

/** Semantic status tones — colors carry meaning only, matching Leads badges. */
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
