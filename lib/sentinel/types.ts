// lib/sentinel/types.ts
// Sentinel Command Layer — types, modes, permissions, delegation

// ── Sentinel Identity ──
export const SENTINEL_ACTOR = {
  actorType: "SENTINEL" as const,
  actorId: "platform_sentinel",
  scope: "PLATFORM" as const,
  visibleToCustomer: false,
  countedInPlanAgents: false,
} as const;

// ── Operating Modes ──
export const OPERATING_MODES = [
  "NORMAL_MODE",
  "VACATION_MODE",
  "EMERGENCY_MODE",
  "APPROVAL_MODE",
] as const;

export type OperatingMode = (typeof OPERATING_MODES)[number];

// ── Task Order Types ──
export const TASK_ASSIGNEE_TYPES = [
  "AGENT",
  "EXTERNAL_TEAM",
  "OWNER",
] as const;

export type TaskAssigneeType = (typeof TASK_ASSIGNEE_TYPES)[number];

export const TASK_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_RISK_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type TaskRiskLevel = (typeof TASK_RISK_LEVELS)[number];

export const TASK_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_APPROVAL",
  "DONE",
  "CANCELLED",
  "FAILED",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_SOURCES = [
  "SYSTEM",
  "CUSTOMER_TICKET",
  "PAYMENT",
  "WHATSAPP",
  "DATABASE",
  "SERVER",
  "MANUAL",
] as const;

export type TaskSource = (typeof TASK_SOURCES)[number];

// ── Sentinel Agent Delegation ──
export const SENTINEL_AGENT_DELEGATION: Record<string, {
  agentName: string;
  responsibilities: string[];
}> = {
  MANSOUR: {
    agentName: "Mansour (منصور)",
    responsibilities: [
      "متابعة العملاء التجاريين",
      "فرص التجديد",
      "رسائل البيع أو الاشتراك",
    ],
  },
  SAHER: {
    agentName: "Saher (ساهر)",
    responsibilities: [
      "رسائل العملاء",
      "واتساب",
      "إشعارات الأعطال للعملاء",
      "الردود العامة الآمنة",
    ],
  },
  SANAD: {
    agentName: "Sanad (سند)",
    responsibilities: [
      "التذاكر",
      "الشكاوى",
      "الدعم",
      "ترتيب الأولويات",
    ],
  },
  BASEER: {
    agentName: "Baseer (بصير)",
    responsibilities: [
      "تحليل البيانات",
      "عدد المتأثرين",
      "أنماط الأعطال",
      "مؤشرات الأداء",
    ],
  },
  KHABEER: {
    agentName: "Khabeer (خبير)",
    responsibilities: [
      "تقييم المخاطر",
      "اقتراح قرار إداري",
      "مراجعة أثر القرارات",
    ],
  },
};

// ── External Operations Team ──
export const EXTERNAL_TEAM_ROLES = [
  "صيانة",
  "مراقبة",
  "حماية",
  "Incident Response",
  "دعم تقني",
] as const;

// ── Permission Matrix ──
export const SENTINEL_PERMISSIONS = {
  // ✅ Allowed automatically
  AUTO_ALLOWED: [
    "OPEN_INCIDENT",
    "CLASSIFY_TICKETS",
    "SUMMARIZE_CUSTOMER_COMPLAINTS",
    "SEND_INTERNAL_ALERT",
    "DELEGATE_TO_AGENT",
    "DELEGATE_TO_EXTERNAL_TEAM",
    "ACTIVATE_FALLBACK_MESSAGE",
    "SEND_PAYMENT_REMINDER",
    "ACTIVATE_SUBSCRIPTION_IF_PAID",
  ],
  // ⚠️ Requires approval
  REQUIRES_APPROVAL: [
    "MODIFY_SUBSCRIPTION",
    "CANCEL_SUBSCRIPTION",
    "CHANGE_CUSTOMER_PLAN",
    "MODIFY_PAYMENT_SETTINGS",
    "DEPLOY_PRODUCTION_CODE",
    "MODIFY_DATABASE",
    "EXECUTE_MIGRATION",
    "DISABLE_AGENT",
    "SEND_BULK_MESSAGES",
    "CHANGE_PRICES",
    "CHANGE_USER_PERMISSIONS",
  ],
  // ❌ Forbidden
  FORBIDDEN: [
    "DELETE_CUSTOMER_DATA",
    "EXPOSE_TENANT_DATA",
    "GRANT_FULL_ADMIN",
    "BYPASS_PLAN_LIMIT",
    "EXECUTE_UNLOGGED_COMMAND",
    "ACT_WITHOUT_AUDIT_LOG",
  ],
} as const;

// ── Vacation Mode Rules ──
export const VACATION_MODE_RULES = {
  ALLOWED: [
    "SEND_ALERTS",
    "CLASSIFY_INCIDENTS",
    "MANAGE_TICKETS",
    "SEND_REMINDERS",
    "ACTIVATE_FALLBACK",
    "CREATE_TASK_ORDERS",
    "GENERATE_DAILY_SUMMARY",
  ],
  BLOCKED: [
    "DEPLOY_CODE",
    "MODIFY_DATABASE",
    "DELETE_DATA",
    "CHANGE_PAYMENT",
    "CHANGE_PRICES",
    "CANCEL_SUBSCRIPTIONS",
    "MODIFY_PERMISSIONS",
  ],
} as const;

// ── Incident Types ──
export const INCIDENT_SEVERITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
  "FALSE_POSITIVE",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_ESCALATION_LEVELS = [
  "SENTINEL",
  "ON_CALL_OPERATOR",
  "PLATFORM_OWNER",
  "MANUAL_INTERVENTION",
] as const;

export type IncidentEscalationLevel = (typeof INCIDENT_ESCALATION_LEVELS)[number];

export const INCIDENT_SERVICES = [
  "APPLICATION",
  "DATABASE",
  "CRON",
  "WEBHOOK",
  "PAYMENT",
  "WHATSAPP",
  "ZATCA",
  "EMAIL",
  "AGENT_SAHER",
  "AGENT_SANAD",
  "UNKNOWN",
] as const;

export type IncidentService = (typeof INCIDENT_SERVICES)[number];

// ── Audit Event Types ──
export const SENTINEL_AUDIT_EVENTS = [
  "SENTINEL_COMMAND",
  "SENTINEL_MODE_CHANGE",
  "SENTINEL_TASK_CREATED",
  "SENTINEL_TASK_COMPLETED",
  "SENTINEL_APPROVAL_REQUESTED",
  "SENTINEL_APPROVAL_GRANTED",
  "SENTINEL_APPROVAL_DENIED",
  "SENTINEL_ALERT_SENT",
  "SENTINEL_INCIDENT_OPENED",
  "SENTINEL_INCIDENT_CLOSED",
] as const;
