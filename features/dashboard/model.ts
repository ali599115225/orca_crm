export type DashboardDataState<T> =
  | { status: "ready"; data: T }
  | { status: "error"; data: null; code: "DATA_UNAVAILABLE" };

export type DashboardKpiKey =
  | "activeLeads"
  | "todayTours"
  | "activeOffers"
  | "signedContractsThisMonth";

export interface DashboardTaskItem {
  id: string;
  title: string;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "OVERDUE";
  leadName: string | null;
  assignedName: string | null;
  isOverdue: boolean;
}

export interface DashboardLeadItem {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  city: string;
  status: string;
  createdAt: string;
  projectName: string | null;
}

export interface DashboardWhatsAppData {
  conversationsCount: number;
  newLeadsCount: number;
  unreadMessagesCount: number;
}

export type DashboardPipelineStageKey =
  | "opportunity"
  | "tour"
  | "offer"
  | "contract"
  | "closed";

export interface DashboardPipelineStage {
  key: DashboardPipelineStageKey;
  count: number;
}

export interface DashboardPipelineData {
  stages: DashboardPipelineStage[];
  total: number;
  legacyFallbackCount: number;
}

export interface DashboardReadModel {
  generatedAt: string;
  timezone: "Asia/Riyadh";
  kpis: Record<DashboardKpiKey, DashboardDataState<number>>;
  pipeline: DashboardDataState<DashboardPipelineData>;
  operations: {
    tasks: DashboardDataState<{
      items: DashboardTaskItem[];
      total: number;
    }>;
    recentLeads: DashboardDataState<{
      items: DashboardLeadItem[];
      newThisWeek: number;
    }>;
    whatsapp: DashboardDataState<DashboardWhatsAppData>;
  };
}

export interface DashboardCapabilities {
  canIssueContract: boolean;
}
