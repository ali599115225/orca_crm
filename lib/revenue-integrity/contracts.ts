export const REVENUE_PROVIDERS = [
  "ZATCA",
  "EJAR",
  "PAYLINK",
  "NGENIUS",
  "RESEND",
  "SMTP",
  "DIALOG360",
  "SIGNATURE",
  "CUSTOM_PAYMENT",
] as const;

export type RevenueProvider = (typeof REVENUE_PROVIDERS)[number];

export const REVENUE_PERMISSIONS = [
  "revenue.risk.read",
  "revenue.risk.manage",
  "revenue.action.read",
  "revenue.action.approve",
  "revenue.trust.read",
  "revenue.trust.manage",
  "revenue.audit.read",
  "revenue.predictive.read",
  "revenue.predictive.manage",
] as const;

export type RevenuePermission = (typeof REVENUE_PERMISSIONS)[number];

export type SuggestedActionType =
  | "CREATE_TASK"
  | "SCHEDULE_TOUR"
  | "CREATE_OFFER"
  | "COLLECTION_FOLLOW_UP"
  | "FOLLOW_UP";

export type ExtractedConversationEntities = {
  budget?: number;
  amount?: number;
  city?: string;
  propertyType?: string;
  requestedDate?: string;
  requestedTime?: string;
  paymentPromiseDate?: string;
  objection?: string;
  leadId?: string;
  opportunityId?: string;
  unitId?: string;
  contactId?: string;
};

export type RadarRunResult = {
  runId: string;
  detected: number;
  resolved: number;
  evaluatedRules: string[];
  skippedRules: Array<{ ruleCode: string; reason: string }>;
};

export type ProviderCredentials = Record<string, unknown>;

export type PredictiveRunResult = {
  runId: string;
  scored: number;
  failed: number;
  failedEntities: Array<{ entityId: string; error: string }>;
  windowKey: string;
};
