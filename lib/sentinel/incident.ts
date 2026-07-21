// lib/sentinel/incident.ts
// Sentinel Incident management

import { prisma } from "@/lib/prisma";
import { writeSentinelAudit } from "./audit";
import {
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentEscalationLevel,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_ESCALATION_LEVELS,
} from "./types";

// ── Constants ──

const MAX_TITLE_LENGTH = 255;
const MAX_SUMMARY_LENGTH = 2000;
const MAX_AFFECTED_SERVICE_LENGTH = 100;
const MAX_FINGERPRINT_LENGTH = 64;
const MAX_REQUEST_ID_LENGTH = 80;
const MAX_CORRELATION_ID_LENGTH = 255;
const MAX_METADATA_BYTES = 10_240;

const SENSITIVE_PATTERNS = [
  /authorization/i,
  /cookie/i,
  /set-cookie/i,
  /bearer\s+/i,
  /session_token/i,
  /ENCRYPTION_KEY/i,
  /DATABASE_URL/i,
  /CRON_SECRET/i,
  /SUPER_ADMIN_EMAILS/i,
];

const ESCALATION_ORDER: readonly string[] = [
  "SENTINEL",
  "ON_CALL_OPERATOR",
  "PLATFORM_OWNER",
  "MANUAL_INTERVENTION",
];

const ALLOWED_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  OPEN: new Set(["ACKNOWLEDGED", "FALSE_POSITIVE"]),
  ACKNOWLEDGED: new Set(["IN_PROGRESS", "RESOLVED", "FALSE_POSITIVE"]),
  IN_PROGRESS: new Set(["RESOLVED", "FALSE_POSITIVE"]),
  RESOLVED: new Set([]),
  FALSE_POSITIVE: new Set([]),
};

// ── Types ──

export interface CreateIncidentParams {
  tenantId?: string | null;
  title: string;
  summary?: string | null;
  severity?: IncidentSeverity;
  affectedService?: string | null;
  diagnosticMetadata?: Record<string, unknown> | null;
  fingerprint?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  assignedToId?: string | null;
  relatedTaskOrderId?: string | null;
}

export interface IncidentResult {
  success: boolean;
  incident?: unknown;
  error?: string;
}

// ── Sanitization ──

function sanitizeString(value: string, maxLength: number): string {
  return value.replace(/[\x00-\x1f\x7f-\x9f]/g, "").slice(0, maxLength);
}

function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_PATTERNS.some((p) => p.test(key))) {
      result[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string" && SENSITIVE_PATTERNS.some((p) => p.test(value))) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ── Validation ──

function validateCreateParams(params: CreateIncidentParams): string | null {
  if (!params.title || typeof params.title !== "string" || params.title.trim().length === 0) {
    return "Title is required.";
  }
  if (params.severity !== undefined && !INCIDENT_SEVERITIES.includes(params.severity as IncidentSeverity)) {
    return `Invalid severity. Must be one of: ${INCIDENT_SEVERITIES.join(", ")}.`;
  }
  return null;
}

// ── Audit helper ──

async function writeIncidentAudit(
  eventType: string,
  incidentId: string,
  extra?: Record<string, unknown>,
) {
  await writeSentinelAudit({
    eventType,
    correlationId: incidentId,
    ...extra,
  });
}

// ── Core functions ──

export async function createIncident(params: CreateIncidentParams): Promise<IncidentResult> {
  const validationError = validateCreateParams(params);
  if (validationError) return { success: false, error: validationError };

  // A platform-owner command may identify a target Tenant, but that request
  // value is never accepted as an operation context. Revalidate the target
  // against current database state before persisting the incident.
  if (params.tenantId) {
    const targetTenant = await prisma.tenant.findFirst({
      where: { id: params.tenantId, isActive: true },
      select: { id: true },
    });
    if (!targetTenant) {
      return { success: false, error: "Target tenant is missing or inactive." };
    }
  }

  const title = sanitizeString(params.title.trim(), MAX_TITLE_LENGTH);
  const summary = params.summary ? sanitizeString(params.summary, MAX_SUMMARY_LENGTH) : null;
  const affectedService = params.affectedService
    ? sanitizeString(params.affectedService, MAX_AFFECTED_SERVICE_LENGTH).trim()
    : null;
  const fingerprint = params.fingerprint
    ? sanitizeString(params.fingerprint, MAX_FINGERPRINT_LENGTH).trim()
    : null;
  const correlationId = params.correlationId
    ? sanitizeString(params.correlationId, MAX_CORRELATION_ID_LENGTH).trim()
    : null;
  const requestId = params.requestId
    ? sanitizeString(params.requestId, MAX_REQUEST_ID_LENGTH).trim()
    : null;
  const diagnosticMetadata = params.diagnosticMetadata
    ? sanitizeMetadata(params.diagnosticMetadata)
    : null;

  if (diagnosticMetadata) {
    const bytes = Buffer.byteLength(JSON.stringify(diagnosticMetadata), "utf8");
    if (bytes > MAX_METADATA_BYTES) {
      return { success: false, error: "Diagnostic metadata exceeds 10 KB." };
    }
  }

  const incident = await prisma.sentinelIncident.create({
    data: {
      tenantId: params.tenantId || null,
      title,
      summary,
      severity: params.severity || "MEDIUM",
      status: "OPEN",
      escalationLevel: "SENTINEL",
      affectedService,
      diagnosticMetadata: (diagnosticMetadata ?? undefined) as Record<string, unknown> | undefined,
      fingerprint,
      correlationId,
      requestId,
      assignedToId: params.assignedToId || null,
      relatedTaskOrderId: params.relatedTaskOrderId || null,
    },
  });

  await writeIncidentAudit("SENTINEL_INCIDENT_OPENED", incident.id, {
    tenantId: params.tenantId || undefined,
    severity: params.severity || "MEDIUM",
    riskLevel: params.severity || "MEDIUM",
    decision: `Incident opened: ${title}`,
    reason: "System detected incident",
  });

  return { success: true, incident };
}

export async function getIncidentById(id: string) {
  return prisma.sentinelIncident.findUnique({ where: { id } });
}

export async function listActiveIncidents(tenantId?: string | null) {
  const where: Record<string, unknown> = {
    status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] },
  };
  if (tenantId !== undefined) {
    where.tenantId = tenantId;
  }
  return prisma.sentinelIncident.findMany({
    where: where as any,
    orderBy: [{ severity: "desc" as const }, { detectedAt: "desc" as const }],
    take: 50,
  });
}

async function transitionTo(
  id: string,
  newStatus: IncidentStatus,
  updateExtra: Record<string, unknown> = {},
): Promise<IncidentResult> {
  const current = await prisma.sentinelIncident.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!current) return { success: false, error: "Incident not found." };

  const allowed = ALLOWED_TRANSITIONS[current.status];
  if (!allowed || !allowed.has(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${current.status} to ${newStatus}.`,
    };
  }

  const data: Record<string, unknown> = { status: newStatus, ...updateExtra };
  const result = await prisma.sentinelIncident.updateMany({
    where: { id, status: current.status },
    data,
  });
  if (result.count !== 1) {
    return { success: false, error: "Incident not found or status changed." };
  }

  const incident = await prisma.sentinelIncident.findUnique({ where: { id } });
  return { success: true, incident };
}

export async function acknowledgeIncident(id: string): Promise<IncidentResult> {
  const result = await transitionTo(id, "ACKNOWLEDGED", { acknowledgedAt: new Date() });
  if (result.success) await writeIncidentAudit("SENTINEL_INCIDENT_ACKNOWLEDGED", id);
  return result;
}

export async function startIncidentWork(id: string): Promise<IncidentResult> {
  const result = await transitionTo(id, "IN_PROGRESS", { workStartedAt: new Date() });
  if (result.success) await writeIncidentAudit("SENTINEL_INCIDENT_IN_PROGRESS", id);
  return result;
}

export async function resolveIncident(id: string): Promise<IncidentResult> {
  const result = await transitionTo(id, "RESOLVED", { resolvedAt: new Date() });
  if (result.success) await writeIncidentAudit("SENTINEL_INCIDENT_CLOSED", id);
  return result;
}

export async function markIncidentFalsePositive(id: string): Promise<IncidentResult> {
  const closedAt = new Date();
  const result = await transitionTo(id, "FALSE_POSITIVE", {
    falsePositiveAt: closedAt,
    resolvedAt: closedAt,
  });
  if (result.success) await writeIncidentAudit("SENTINEL_INCIDENT_CLOSED", id, { reason: "Marked false positive" });
  return result;
}

export async function assignIncident(id: string, assignedToId: string): Promise<IncidentResult> {
  const incident = await prisma.sentinelIncident.findUnique({ where: { id } });
  if (!incident) return { success: false, error: "Incident not found." };
  if (["RESOLVED", "FALSE_POSITIVE"].includes(incident.status)) {
    return { success: false, error: "Cannot assign a closed incident." };
  }
  const updated = await prisma.sentinelIncident.updateMany({
    where: { id, status: incident.status },
    data: { assignedToId },
  });
  if (updated.count !== 1) {
    return { success: false, error: "Incident not found or status changed." };
  }
  const result = await prisma.sentinelIncident.findUnique({ where: { id } });
  return { success: true, incident: result };
}

export async function escalateIncident(
  id: string,
  newLevel: IncidentEscalationLevel,
): Promise<IncidentResult> {
  if (!INCIDENT_ESCALATION_LEVELS.includes(newLevel)) {
    return { success: false, error: "Invalid escalation level." };
  }

  const current = await prisma.sentinelIncident.findUnique({
    where: { id },
    select: { id: true, status: true, escalationLevel: true },
  });
  if (!current) return { success: false, error: "Incident not found." };
  if (["RESOLVED", "FALSE_POSITIVE"].includes(current.status)) {
    return { success: false, error: "Cannot escalate a closed incident." };
  }

  const currentIndex = ESCALATION_ORDER.indexOf(current.escalationLevel);
  const newIndex = ESCALATION_ORDER.indexOf(newLevel);
  if (currentIndex < 0 || newIndex <= currentIndex) {
    return { success: false, error: "Escalation level must increase." };
  }

  const updated = await prisma.sentinelIncident.updateMany({
    where: {
      id,
      status: current.status,
      escalationLevel: current.escalationLevel,
    },
    data: {
      escalationLevel: newLevel,
    },
  });
  if (updated.count !== 1) {
    return { success: false, error: "Incident not found or status changed." };
  }

  const incident = await prisma.sentinelIncident.findUnique({ where: { id } });
  return { success: true, incident };
}
