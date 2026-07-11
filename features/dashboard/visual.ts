export const dashboardVisual = {
  page: "min-h-full bg-[var(--nc-bg)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
  shell: "mx-auto w-full max-w-[1600px] space-y-6",
  panel:
    "rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] shadow-sm",
  sectionPanel:
    "rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)] shadow-sm",
  softPanel:
    "rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)]",
  contentCard:
    "rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] shadow-sm",
  interactiveContentCard:
    "rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] shadow-sm transition duration-200 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:shadow-md focus:outline-none focus-visible:border-[var(--nc-accent-border)] focus-visible:bg-[var(--nc-accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  metricCard:
    "group flex min-h-32 flex-col justify-between rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-5 text-start shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:shadow-md focus:outline-none focus-visible:border-[var(--nc-accent-border)] focus-visible:bg-[var(--nc-accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  stageCard:
    "group rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-4 text-start shadow-sm transition duration-200 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:shadow-md focus:outline-none focus-visible:border-[var(--nc-accent-border)] focus-visible:bg-[var(--nc-accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  title:
    "text-2xl font-black tracking-tight text-[var(--nc-text-primary)] sm:text-3xl",
  sectionTitle: "text-lg font-bold text-[var(--nc-text-primary)]",
  body: "text-sm text-[var(--nc-text-secondary)]",
  meta: "text-xs text-[var(--nc-text-dim)]",
  primaryButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--nc-accent)] px-4 text-sm font-bold text-[var(--orca-ui-on-primary)] transition hover:bg-[var(--nc-accent-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nc-bg)] disabled:cursor-not-allowed disabled:opacity-50",
  secondaryLink:
    "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[var(--nc-accent)] transition hover:bg-[var(--nc-accent-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  iconTile:
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)] text-[var(--nc-text-secondary)]",
  metricIconTile:
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)] text-[var(--nc-text-secondary)] transition-colors duration-200 group-hover:border-[var(--nc-accent-border)] group-hover:bg-[var(--nc-accent-soft)] group-hover:text-[var(--nc-accent)] group-focus-visible:border-[var(--nc-accent-border)] group-focus-visible:bg-[var(--nc-accent-soft)] group-focus-visible:text-[var(--nc-accent)]",
  statusBadge:
    "inline-flex items-center rounded-full border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--nc-accent)]",
  tabActive:
    "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-3.5 text-sm font-bold text-[var(--nc-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  tabIdle:
    "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-transparent px-3.5 text-sm font-bold text-[var(--nc-text-secondary)] transition hover:border-[var(--nc-glass-border)] hover:bg-[var(--nc-surface-soft)] hover:text-[var(--nc-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  counterBadge:
    "rounded-full bg-[var(--nc-surface-strong)] px-2 py-0.5 text-xs text-[var(--nc-text-secondary)]",
  progressTrack:
    "h-1.5 overflow-hidden rounded-full bg-[var(--nc-glass-border)]",
  progressBar:
    "h-full rounded-full bg-[var(--nc-accent)] transition-[width] duration-300",
} as const;
