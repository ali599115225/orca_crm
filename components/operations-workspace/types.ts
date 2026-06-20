import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type OperationsModule = "whatsapp" | "email" | "tasks" | "helpdesk";

export type WorkspaceLanguage = "AR" | "EN";

export interface WorkspaceKpi {
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface WorkspaceBadge {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
}

export interface WorkspaceListItemAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: "neutral" | "danger";
  disabled?: boolean;
}

export interface WorkspaceListItem {
  id: string;
  title: string;
  snippet: string;
  timestamp: string;
  avatar: string;
  badge: WorkspaceBadge;
  selected: boolean;
  onSelect: () => void;
  actions: WorkspaceListItemAction[];
}

export interface WorkspaceSelectOption {
  value: string;
  label: string;
}

export interface WorkspacePagination {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

export interface WorkspaceDetailAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: "secondary" | "danger";
  disabled?: boolean;
}

export interface WorkspaceContextItem {
  label: string;
  value: string;
}

export interface WorkspaceTimelineItem {
  id: string;
  body: ReactNode;
  time?: string;
  side?: "in" | "out" | "neutral";
}

export interface WorkspaceComposer {
  mode: "message" | "note";
  value: string;
  placeholder: string;
  bodyLabel?: string;
  sendLabel: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  attachLabel?: string;
  onAttach?: () => void;
  fields?: Array<{
    id: string;
    label: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
    type?: "text" | "email" | "date" | "time" | "select";
    dir?: "rtl" | "ltr";
    required?: boolean;
    options?: WorkspaceSelectOption[];
  }>;
  extra?: ReactNode;
}

export interface WorkspaceDetail {
  avatar: string;
  title: string;
  meta: ReactNode;
  actions: WorkspaceDetailAction[];
  context: [WorkspaceContextItem, WorkspaceContextItem, WorkspaceContextItem];
  timeline: WorkspaceTimelineItem[];
  composer?: WorkspaceComposer;
  emptyTitle: string;
  emptyDescription: string;
}

export interface UnifiedOperationsWorkspaceProps {
  module: OperationsModule;
  language: WorkspaceLanguage;
  title: string;
  description: string;
  kpis: [WorkspaceKpi, WorkspaceKpi, WorkspaceKpi, WorkspaceKpi];
  listTitle: string;
  listSubtitle: string;
  newLabel: string;
  onNew: () => void;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  filterValue: string;
  filterLabel: string;
  filterOptions: WorkspaceSelectOption[];
  onFilterChange: (value: string) => void;
  items: WorkspaceListItem[];
  pagination: WorkspacePagination;
  detail: WorkspaceDetail | null;
  emptyDetailTitle: string;
  emptyDetailDescription: string;
}
