import type { LeadStatusValue } from "@/lib/leads/model";

export const leadVisual = {
  page:
    "nc-page nc-stack orca-container pb-4 text-[var(--nc-text-primary)]",
  pageStack: "nc-stack",
  workspaceHero: "orca-workspace-hero",
  detailHero: "orca-workspace-hero !block",
  workspaceMetrics: "orca-workspace-metrics grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
  workspacePanel:
    "orca-workspace-panel flex min-w-0 flex-col overflow-hidden",
  workspaceToolbar:
    "orca-workspace-toolbar shrink-0 border-b border-[var(--nc-border)]",
  workspacePagination:
    "orca-workspace-pagination shrink-0 border-t border-[var(--nc-border)]",
  workspaceTabs:
    "flex min-h-[60px] flex-nowrap items-center gap-2 overflow-x-auto border-b border-[var(--nc-border)] px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  panel:
    "orca-workspace-panel",
  softPanel:
    "rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)]",
  card:
    "rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]",
  metricCard:
    "orca-workspace-metric min-h-[96px]",
  interactiveRow:
    "!min-h-[64px] !rounded-xl !border-[var(--nc-border)] !bg-[var(--nc-surface-strong)] transition-colors duration-150 hover:!border-[var(--nc-accent-border)] hover:!bg-[var(--nc-accent-soft)] focus-visible:!border-[var(--nc-accent-border)] focus-visible:!bg-[var(--nc-accent-soft)] focus-visible:!ring-2 focus-visible:!ring-[var(--nc-accent)]",
  pageEyebrow: "text-xs font-bold text-[var(--nc-accent)]",
  pageTitle:
    "mt-1 text-2xl font-black tracking-[-0.02em] text-[var(--nc-text-primary)]",
  pageDescription:
    "mt-1 max-w-3xl text-sm leading-6 text-[var(--nc-text-secondary)]",
  sectionTitle: "text-sm font-black text-[var(--nc-text-primary)]",
  label: "text-xs font-bold leading-5 text-[var(--nc-text-secondary)]",
  value: "mt-1 text-sm font-bold leading-5 text-[var(--nc-text-primary)]",
  meta: "text-xs leading-5 text-[var(--nc-text-dim)]",
  input:
    "min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition placeholder:text-[var(--nc-text-dim)] focus-visible:border-[var(--nc-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  textarea:
    "w-full resize-none overflow-y-auto rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-3 py-2.5 text-sm font-semibold leading-6 text-[var(--nc-text-primary)] outline-none transition placeholder:text-[var(--nc-text-dim)] focus-visible:border-[var(--nc-accent-border)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  select:
    "min-h-[44px] rounded-xl border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-sm font-semibold text-[var(--nc-text-primary)]",
  primaryButton:
    "nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--nc-accent)] px-4 text-xs font-black text-[var(--orca-ui-on-primary)] transition hover:bg-[var(--nc-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50",
  secondaryButton:
    "nc-btn nc-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50",
  ghostButton:
    "nc-btn nc-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50",
  dangerGhostButton:
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-500/30 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300",
  compactPrimaryButton:
    "nc-btn-primary inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[var(--nc-accent)] px-3 text-xs font-black text-[var(--orca-ui-on-primary)] transition hover:bg-[var(--nc-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50",
  iconTile:
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)] text-[var(--nc-text-secondary)]",
  metricIconTile:
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)] text-[var(--nc-text-secondary)] transition hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] group-hover:text-[var(--nc-accent)]",
  modalOverlay:
    "fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-4",
  modal:
    "flex max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)] shadow-2xl sm:w-full",
  modalHeader:
    "flex min-h-[72px] shrink-0 items-start justify-between gap-4 border-b border-[var(--nc-border)] px-5 py-4",
  modalBody:
    "min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  modalFooter:
    "flex min-h-[68px] shrink-0 flex-col-reverse gap-2 border-t border-[var(--nc-border)] px-5 py-3 sm:flex-row sm:justify-end",
  closeButton:
    "nc-btn nc-btn-ghost inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-[var(--nc-border)] text-[var(--nc-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  tab:
    "shrink-0 min-h-[44px] rounded-xl border border-transparent px-3 text-xs font-bold text-[var(--nc-text-secondary)] transition hover:bg-[var(--nc-surface-strong)] hover:text-[var(--nc-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  activeTab:
    "shrink-0 min-h-[44px] rounded-xl border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-3 text-xs font-black text-[var(--nc-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent-soft)]",
  emptyState:
    "flex min-h-[156px] items-center justify-center rounded-xl border border-dashed border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-4 py-5 text-center text-sm font-medium text-[var(--nc-text-secondary)]",
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
