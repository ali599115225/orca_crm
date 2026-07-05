// lib/leads/model.ts
// Shared, dependency-free Leads domain model. `status` is the single source
// of truth for a lead's position in the funnel; the legacy `stage` text
// column is deprecated and must never be read or written by new code.

export type LeadStatusValue =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "VISIT_SCHEDULED"
  | "VISITED"
  | "OFFER_MADE"
  | "NEGOTIATION"
  | "RESERVED"
  | "CONTRACT_SIGNED"
  | "WON"
  | "LOST";

export const LEAD_STATUS_VALUES: readonly LeadStatusValue[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "VISIT_SCHEDULED",
  "VISITED",
  "OFFER_MADE",
  "NEGOTIATION",
  "RESERVED",
  "CONTRACT_SIGNED",
  "WON",
  "LOST",
];

export function isLeadStatus(value: unknown): value is LeadStatusValue {
  return typeof value === "string" && (LEAD_STATUS_VALUES as readonly string[]).includes(value);
}

/**
 * Single translation point for legacy kanban stage names.
 * Returns null when the value cannot be translated safely — notably the
 * ambiguous "closed", which must be requested explicitly as WON or LOST.
 */
export function legacyStageToStatus(value: string): LeadStatusValue | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (isLeadStatus(raw.toUpperCase())) return raw.toUpperCase() as LeadStatusValue;

  switch (raw.toLowerCase()) {
    case "new":
      return "NEW";
    case "contacted":
      return "CONTACTED";
    case "qualified":
      return "QUALIFIED";
    case "tour scheduled":
    case "tour_scheduled":
      return "VISIT_SCHEDULED";
    case "offer sent":
    case "offer_sent":
      return "OFFER_MADE";
    case "negotiation":
      return "NEGOTIATION";
    default:
      return null;
  }
}

// ── Central RBAC role groups (existing DB roles only — no parallel system) ──

export const LEADS_READER_ROLES = [
  "ADMIN",
  "owner",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
  "rental_manager",
] as const;

export const LEADS_WRITER_ROLES = [
  "ADMIN",
  "owner",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
] as const;

export const LEADS_MANAGER_ROLES = ["ADMIN", "owner", "SALES_MANAGER"] as const;

export const LEAD_ASSIGNABLE_ROLES = ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE", "MARKETING"] as const;

export function isLeadsManagerRole(role: string): boolean {
  return (LEADS_MANAGER_ROLES as readonly string[]).includes(role);
}

export function isLeadsWriterRole(role: string): boolean {
  return (LEADS_WRITER_ROLES as readonly string[]).includes(role);
}

// ── Error contract (codes for the UI to localize — never raw server text) ───

export type LeadActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "DUPLICATE_ACTIVE"
  | "DUPLICATE_ARCHIVED"
  | "PLAN_LIMIT"
  | "INTERNAL";

export interface LeadActionFailure {
  success: false;
  error: string;
  code: LeadActionErrorCode;
  duplicateLeadId?: string;
}

export function leadFailure(
  code: LeadActionErrorCode,
  error: string,
  extra?: Partial<LeadActionFailure>,
): LeadActionFailure {
  return { success: false, code, error, ...extra };
}
