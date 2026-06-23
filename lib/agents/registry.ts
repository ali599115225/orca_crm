export const AGENT_TYPES = [
  "SAHER",
  "SANAD",
  "MANSOUR",
  "BASEER",
  "KHABEER",
  "SENTINEL",
  "CHAT_BOT",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];
export type AgentExecutionMode =
  | "ANALYSIS_ONLY"
  | "PROPOSE_WITH_APPROVAL"
  | "SYSTEM_MONITORING";

export interface AgentDefinition {
  type: AgentType;
  nameAr: string;
  nameEn: string;
  responsibilityAr: string;
  responsibilityEn: string;
  executionMode: AgentExecutionMode;
  manualRun: "NONE" | "SAHER_TELEMETRY";
  requiresApprovalForExternalAction: boolean;
  tenantScoped: boolean;
}

export const AGENT_REGISTRY: Record<AgentType, AgentDefinition> = {
  SAHER: {
    type: "SAHER",
    nameAr: "ساهر",
    nameEn: "Saher",
    responsibilityAr: "تأهيل العملاء واقتراح الإجراءات ومراقبة التشغيل",
    responsibilityEn: "Lead qualification, action proposals, and operational monitoring",
    executionMode: "PROPOSE_WITH_APPROVAL",
    manualRun: "SAHER_TELEMETRY",
    requiresApprovalForExternalAction: true,
    tenantScoped: true,
  },
  SANAD: {
    type: "SANAD",
    nameAr: "سند",
    nameEn: "Sanad",
    responsibilityAr: "متابعة الأقساط والتنبيهات المالية",
    responsibilityEn: "Installment monitoring and financial reminders",
    executionMode: "PROPOSE_WITH_APPROVAL",
    manualRun: "NONE",
    requiresApprovalForExternalAction: true,
    tenantScoped: true,
  },
  MANSOUR: {
    type: "MANSOUR",
    nameAr: "منصور",
    nameEn: "Mansour",
    responsibilityAr: "مساعد محادثات المالك والمستأجر",
    responsibilityEn: "Owner and tenant conversational assistant",
    executionMode: "ANALYSIS_ONLY",
    manualRun: "NONE",
    requiresApprovalForExternalAction: true,
    tenantScoped: true,
  },
  BASEER: {
    type: "BASEER",
    nameAr: "بصير",
    nameEn: "Baseer",
    responsibilityAr: "تحليل الأداء والتقارير التشغيلية",
    responsibilityEn: "Operational performance and reporting analysis",
    executionMode: "ANALYSIS_ONLY",
    manualRun: "NONE",
    requiresApprovalForExternalAction: false,
    tenantScoped: true,
  },
  KHABEER: {
    type: "KHABEER",
    nameAr: "خبير",
    nameEn: "Khabeer",
    responsibilityAr: "تحليل المبيعات والعروض وفرص التحويل",
    responsibilityEn: "Sales, offer, and conversion analysis",
    executionMode: "ANALYSIS_ONLY",
    manualRun: "NONE",
    requiresApprovalForExternalAction: false,
    tenantScoped: true,
  },
  SENTINEL: {
    type: "SENTINEL",
    nameAr: "الحارس",
    nameEn: "Sentinel",
    responsibilityAr: "مراقبة صحة المنصة وإدارة الحوادث",
    responsibilityEn: "Platform health monitoring and incident control",
    executionMode: "SYSTEM_MONITORING",
    manualRun: "NONE",
    requiresApprovalForExternalAction: true,
    tenantScoped: false,
  },
  CHAT_BOT: {
    type: "CHAT_BOT",
    nameAr: "مساعد محادثة",
    nameEn: "Chat Assistant",
    responsibilityAr: "مقعد مساعد محادثة عام",
    responsibilityEn: "General chat-assistant seat",
    executionMode: "ANALYSIS_ONLY",
    manualRun: "NONE",
    requiresApprovalForExternalAction: true,
    tenantScoped: true,
  },
};

export function normalizeAgentType(value: unknown): AgentType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return (AGENT_TYPES as readonly string[]).includes(normalized)
    ? (normalized as AgentType)
    : null;
}

export function getAgentDefinition(value: unknown): AgentDefinition | null {
  const type = normalizeAgentType(value);
  return type ? AGENT_REGISTRY[type] : null;
}
