export const dashboardVisual = {
  page: "nc-page nc-stack orca-container orca-dashboard-final pb-4",
  shell: "flex flex-col gap-4",

  execRow: "dashboard-exec-row",
  kpiGrid: "dashboard-kpi-grid",
  dashPanel:
    "dashboard-panel orca-workspace-panel border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]",
  dashPanelHeader: "dashboard-panel-header",
  dashPanelBody: "dashboard-panel-body",
  dashPanelFooter: "dashboard-panel-footer",
  hScroll: "dashboard-hscroll",
  panel:
    "orca-workspace-panel border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]",
  sectionPanel:
    "orca-workspace-panel border border-[var(--nc-border)] bg-[var(--nc-surface-strong)]",
  softPanel:
    "orca-workspace-note border border-[var(--nc-border)] bg-[var(--nc-surface-soft)]",
  contentCard:
    "rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] shadow-sm",
  interactiveContentCard:
    "rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] shadow-sm transition-[border-color,background-color,box-shadow] duration-150 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-surface-soft)] hover:shadow-sm focus:outline-none focus-visible:border-[var(--nc-accent-border)] focus-visible:bg-[var(--nc-surface-soft)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  metricCard:
    "orca-workspace-metric group flex flex-col justify-between !p-3 text-start transition-[border-color,background-color,box-shadow] duration-150 hover:!border-[var(--nc-accent-border)] hover:!bg-[var(--nc-surface-soft)] hover:!shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  stageCard:
    "group rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] p-4 text-start shadow-sm transition duration-200 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:shadow-md focus:outline-none focus-visible:border-[var(--nc-accent-border)] focus-visible:bg-[var(--nc-accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  title:
    "text-2xl font-black tracking-tight text-[var(--nc-text-primary)] sm:text-3xl",
  sectionTitle: "text-lg font-bold text-[var(--nc-text-primary)]",
  body: "text-sm text-[var(--nc-text-secondary)]",
  meta: "text-xs text-[var(--nc-text-dim)]",
  primaryButton:
    "nc-btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50",
  ghostButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-transparent bg-transparent px-4 text-sm font-bold text-[var(--nc-text-secondary)] transition-colors duration-150 hover:border-[var(--nc-border)] hover:bg-[var(--nc-surface-soft)] hover:text-[var(--nc-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] disabled:cursor-not-allowed disabled:opacity-50",
  headerPrimaryButton:
    "nc-btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] disabled:cursor-not-allowed disabled:opacity-50",
  headerSecondaryButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-4 text-sm font-bold text-[var(--nc-text-primary)] transition-colors duration-150 hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] disabled:cursor-not-allowed disabled:opacity-50",
  headerGhostButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-transparent bg-transparent px-4 text-sm font-bold text-[var(--nc-text-secondary)] transition-colors duration-150 hover:border-[var(--nc-border)] hover:bg-[var(--nc-surface-soft)] hover:text-[var(--nc-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] disabled:cursor-not-allowed disabled:opacity-50",
  headerIconButton:
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-transparent bg-transparent text-[var(--nc-text-secondary)] transition-colors duration-150 hover:border-[var(--nc-border)] hover:bg-[var(--nc-surface-soft)] hover:text-[var(--nc-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] disabled:cursor-not-allowed disabled:opacity-50",
  secondaryLink:
    "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[var(--nc-accent)] transition hover:bg-[var(--nc-accent-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)]",
  iconTile:
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] text-[var(--nc-text-secondary)]",
  metricIconTile:
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] text-[var(--nc-text-secondary)] transition-colors duration-150 group-hover:border-[var(--nc-accent-border)] group-hover:bg-[var(--nc-surface-strong)] group-hover:text-[var(--nc-accent)] group-focus-visible:border-[var(--nc-accent-border)] group-focus-visible:bg-[var(--nc-surface-strong)] group-focus-visible:text-[var(--nc-accent)]",
  statusBadge:
    "inline-flex items-center rounded-full border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--nc-accent)]",
  tabActive:
    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-2 text-xs font-bold text-[var(--nc-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] sm:gap-2 sm:px-3.5 sm:text-sm",
  tabIdle:
    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2 text-xs font-bold text-[var(--nc-text-secondary)] transition hover:border-[var(--nc-border)] hover:bg-[var(--nc-surface-soft)] hover:text-[var(--nc-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] sm:gap-2 sm:px-3.5 sm:text-sm",
  counterBadge:
    "rounded-full bg-[var(--nc-surface-strong)] px-2 py-0.5 text-xs text-[var(--nc-text-secondary)]",
  progressTrack:
    "h-1.5 overflow-hidden rounded-full bg-[var(--nc-border)]",
  progressBar:
    "h-full rounded-full bg-[var(--nc-accent)] transition-[width] duration-300",
} as const;
