import { operationsVisual } from "@/features/operations/visual";

export const dashboardVisual = {
  page: "orca-dashboard-v1",
  shell: "orca-dashboard-v1-shell",

  execRow: "orca-dashboard-v1-executive-grid",
  kpiGrid: operationsVisual.metrics,

  dashPanel: operationsVisual.panelPadded,
  dashPanelHeader: "orca-dashboard-v1-panel-head",
  dashPanelBody: "orca-dashboard-v1-panel-body",
  dashPanelFooter: "orca-dashboard-v1-panel-footer",
  hScroll: "orca-dashboard-v1-hscroll",

  panel: operationsVisual.panelPadded,
  sectionPanel: operationsVisual.panelPadded,
  softPanel: operationsVisual.softPanel,
  contentCard: operationsVisual.contentCard,
  interactiveContentCard: operationsVisual.interactiveContentCard,
  metricCard: operationsVisual.linkedMetricCard,
  stageCard: operationsVisual.interactiveContentCard,

  title: operationsVisual.title,
  sectionTitle: operationsVisual.sectionTitle,
  body: operationsVisual.body,
  meta: operationsVisual.meta,

  primaryButton: operationsVisual.primaryButton,
  ghostButton: operationsVisual.ghostButton,
  headerPrimaryButton: operationsVisual.primaryButton,
  headerSecondaryButton: operationsVisual.secondaryButton,
  headerGhostButton: operationsVisual.ghostButton,
  headerIconButton: operationsVisual.iconButton,
  secondaryLink: operationsVisual.secondaryLink,

  iconTile: operationsVisual.iconTile,
  metricIconTile: operationsVisual.metricIconTile,
  statusBadge: operationsVisual.statusBadge,
  tabActive: operationsVisual.activeTab,
  tabIdle: operationsVisual.tab,
  counterBadge: operationsVisual.counterBadge,
  progressTrack: operationsVisual.progressTrack,
  progressBar: operationsVisual.progressBar,
} as const;