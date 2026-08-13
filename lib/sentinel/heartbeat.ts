import { Prisma, SentinelHeartbeatStatus, SentinelIncidentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeSentinelAudit } from "./audit";
import { createIncident, acknowledgeIncident, resolveIncident } from "./incident";
import {
  getHeartbeatServiceConfig,
  HEARTBEAT_SERVICES,
  normalizeHeartbeatServiceId,
  type HeartbeatServicesConfig,
} from "./heartbeat-config";

type HeartbeatStatus = SentinelHeartbeatStatus;
type IncidentStatus = SentinelIncidentStatus;

interface RecordHeartbeatInput {
  serviceId: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

interface HeartbeatOptions {
  services?: HeartbeatServicesConfig;
}

type HeartbeatResult = {
  success: boolean;
  serviceId?: string;
  status?: HeartbeatStatus;
  error?: string;
  skippedServices?: string[];
  changedServices?: string[];
};

type HeartbeatRow = {
  serviceId: string;
  status: HeartbeatStatus;
  lastSeenAt: Date;
  version?: string | null;
  metadata?: unknown;
};

type ActiveIncident = {
  id: string;
  status: IncidentStatus;
};

const MAX_VERSION_LENGTH = 64;
const MAX_METADATA_BYTES = 10_240;
const MAX_METADATA_KEYS = 10;
const MAX_METADATA_DEPTH = 3;
const MAX_RETRIES = 3;
const ACTIVE_INCIDENT_STATUSES: readonly IncidentStatus[] = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"];

const VERSION_PATTERNS = [
  /^[0-9a-f]{7,40}$/i,
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
];

const SENSITIVE_PATTERNS = [
  /authorization/i,
  /cookie/i,
  /set-cookie/i,
  /token/i,
  /secret/i,
  /password/i,
  /api[-_]?key/i,
  /bearer\s+/i,
  /DATABASE_URL/i,
  /CRON_SECRET/i,
  /SUPER_ADMIN_EMAILS/i,
];

function isP2002(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  ) || (typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002");
}

function activeIncidentWhere(fingerprint: string) {
  return {
    fingerprint,
    status: { in: [...ACTIVE_INCIDENT_STATUSES] },
  };
}

function heartbeatFingerprint(serviceId: string): string {
  return `heartbeat:${serviceId}`;
}

function validateVersion(version: string | undefined): string | null {
  if (version === undefined) return null;
  if (typeof version !== "string" || version.length === 0) return "Version must be a non-empty string.";
  if (version.length > MAX_VERSION_LENGTH) return "Version exceeds 64 characters.";
  if (!VERSION_PATTERNS.some((pattern) => pattern.test(version))) {
    return "Version must be a git SHA or semantic version.";
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function validateJsonValue(value: unknown, depth: number, seen: WeakSet<object>): string | null {
  if (depth > MAX_METADATA_DEPTH) return "Metadata nesting exceeds depth 3.";
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    if (typeof value === "number" && !Number.isFinite(value)) return "Metadata contains a non-finite number.";
    if (typeof value === "string" && SENSITIVE_PATTERNS.some((pattern) => pattern.test(value))) {
      return "Metadata contains sensitive values.";
    }
    return null;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return "Metadata contains cyclic values.";
    seen.add(value);
    try {
      for (const item of value) {
        const error = validateJsonValue(item, depth + 1, seen);
        if (error) return error;
      }
    } finally {
      seen.delete(value);
    }
    return null;
  }
  if (isPlainObject(value)) {
    if (seen.has(value)) return "Metadata contains cyclic values.";
    seen.add(value);
    try {
      for (const [key, nested] of Object.entries(value)) {
        if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))) {
          return "Metadata contains sensitive keys.";
        }
        const error = validateJsonValue(nested, depth + 1, seen);
        if (error) return error;
      }
    } finally {
      seen.delete(value);
    }
    return null;
  }
  return "Metadata contains unsafe or non-serializable values.";
}

function validateMetadata(metadata: Record<string, unknown> | undefined): string | null {
  if (metadata === undefined) return null;
  if (!isPlainObject(metadata)) return "Metadata must be a plain object.";
  if (Object.keys(metadata).length > MAX_METADATA_KEYS) return "Metadata exceeds 10 top-level keys.";
  const valueError = validateJsonValue(metadata, 0, new WeakSet<object>());
  if (valueError) return valueError;
  const bytes = Buffer.byteLength(JSON.stringify(metadata), "utf8");
  if (bytes > MAX_METADATA_BYTES) return "Metadata exceeds 10 KB.";
  return null;
}

function validatePublicInput(input: RecordHeartbeatInput): string | null {
  const candidate = input as unknown as Record<string, unknown>;
  for (const forbidden of ["status", "expectedIntervalSeconds", "lastSeenAt"]) {
    if (forbidden in candidate) return `${forbidden} is server-owned and is not accepted.`;
  }
  if (!input.serviceId || typeof input.serviceId !== "string" || input.serviceId.trim().length === 0) {
    return "serviceId is required.";
  }
  return validateVersion(input.version) ?? validateMetadata(input.metadata);
}

async function writeHeartbeatAudit(
  serviceId: string,
  before: HeartbeatStatus,
  after: HeartbeatStatus,
  cause: "HEARTBEAT" | "RECONCILIATION",
): Promise<void> {
  const isRecovery = cause === "HEARTBEAT";
  await writeSentinelAudit({
    eventType: "SENTINEL_HEARTBEAT_STATUS_CHANGED",
    scope: "PLATFORM",
    severity: after === "DOWN" ? "HIGH" : after === "DEGRADED" ? "MEDIUM" : "LOW",
    source: isRecovery ? "HEARTBEAT" : "SYSTEM",
    decision: `Heartbeat ${serviceId} transitioned from ${before} to ${after}`,
    reason: isRecovery ? "Healthy heartbeat received" : "Sentinel heartbeat reconciliation",
    riskLevel: after === "DOWN" ? "HIGH" : after === "DEGRADED" ? "MEDIUM" : "LOW",
    beforeState: before,
    afterState: after,
    correlationId: heartbeatFingerprint(serviceId),
  });
}

async function findActiveHeartbeatIncident(serviceId: string): Promise<ActiveIncident | null> {
  const incident = await prisma.sentinelIncident.findFirst({
    where: activeIncidentWhere(heartbeatFingerprint(serviceId)),
    select: { id: true, status: true },
    orderBy: { detectedAt: "desc" },
  });
  return incident as ActiveIncident | null;
}

async function readIncidentStatus(id: string): Promise<IncidentStatus | null> {
  const incident = await prisma.sentinelIncident.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  return (incident?.status as IncidentStatus | undefined) ?? null;
}

async function resolveHeartbeatIncidentIdempotently(id: string): Promise<boolean> {
  const status = await readIncidentStatus(id);
  if (status === "RESOLVED" || status === "FALSE_POSITIVE") return true;

  if (status === "OPEN") {
    const acknowledged = await acknowledgeIncident(id);
    if (!acknowledged.success) {
      const afterAck = await readIncidentStatus(id);
      return afterAck === "RESOLVED" || afterAck === "FALSE_POSITIVE";
    }
    const resolved = await resolveIncident(id);
    if (resolved.success) return true;
    const afterResolve = await readIncidentStatus(id);
    return afterResolve === "RESOLVED" || afterResolve === "FALSE_POSITIVE";
  }

  if (status === "ACKNOWLEDGED" || status === "IN_PROGRESS") {
    const resolved = await resolveIncident(id);
    if (resolved.success) return true;
    const afterResolve = await readIncidentStatus(id);
    return afterResolve === "RESOLVED" || afterResolve === "FALSE_POSITIVE";
  }

  return false;
}

async function retryActiveIncidentResolution(serviceId: string): Promise<void> {
  const incident = await findActiveHeartbeatIncident(serviceId);
  if (!incident) return;
  await resolveHeartbeatIncidentIdempotently(incident.id);
}

async function createOrGetHeartbeatIncident(serviceId: string): Promise<ActiveIncident | null> {
  const fingerprint = heartbeatFingerprint(serviceId);
  const existing = await findActiveHeartbeatIncident(serviceId);
  if (existing) return existing;

  try {
    const result = await createIncident({
      title: `Heartbeat service down: ${serviceId}`.slice(0, 255),
      summary: `Sentinel heartbeat service ${serviceId} crossed the DOWN threshold.`,
      severity: "HIGH",
      affectedService: serviceId,
      diagnosticMetadata: { source: "sentinel_heartbeat", serviceId },
      fingerprint,
    });
    if (result.success && result.incident && typeof result.incident === "object") {
      const id = (result.incident as { id?: unknown }).id;
      const status = (result.incident as { status?: unknown }).status;
      if (typeof id === "string") {
        return {
          id,
          status: typeof status === "string" ? (status as IncidentStatus) : "OPEN",
        };
      }
    }
  } catch (error) {
    if (!isP2002(error)) throw error;
  }

  return findActiveHeartbeatIncident(serviceId);
}

async function reconcileDownIncident(serviceId: string, staleRow: HeartbeatRow): Promise<void> {
  const incident = await createOrGetHeartbeatIncident(serviceId);
  if (!incident) return;

  const current = await prisma.sentinelHeartbeat.findUnique({
    where: { serviceId },
    select: { serviceId: true, status: true, lastSeenAt: true },
  });
  if (current?.status !== "DOWN" || current.lastSeenAt.getTime() !== staleRow.lastSeenAt.getTime()) {
    await resolveHeartbeatIncidentIdempotently(incident.id);
  }
}

async function transitionHeartbeat(
  row: HeartbeatRow,
  nextStatus: HeartbeatStatus,
  data: Record<string, unknown>,
): Promise<boolean> {
  const result = await prisma.sentinelHeartbeat.updateMany({
    where: {
      serviceId: row.serviceId,
      status: row.status,
      lastSeenAt: row.lastSeenAt,
    },
    data: {
      status: nextStatus,
      ...data,
    },
  });
  return result.count === 1;
}

async function readHeartbeat(serviceId: string): Promise<HeartbeatRow | null> {
  return prisma.sentinelHeartbeat.findUnique({
    where: { serviceId },
    select: {
      serviceId: true,
      status: true,
      lastSeenAt: true,
      version: true,
      metadata: true,
    },
  }) as Promise<HeartbeatRow | null>;
}

export async function recordHeartbeat(
  input: RecordHeartbeatInput,
  options: HeartbeatOptions = {},
): Promise<HeartbeatResult> {
  const validationError = validatePublicInput(input);
  if (validationError) return { success: false, error: validationError };

  const services = options.services ?? HEARTBEAT_SERVICES;
  const serviceId = normalizeHeartbeatServiceId(input.serviceId);
  if (!getHeartbeatServiceConfig(serviceId, services)) {
    return { success: false, serviceId, error: "Unknown heartbeat service." };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const existing = await readHeartbeat(serviceId);
    const now = new Date();
    if (!existing) {
      try {
        const data: Prisma.SentinelHeartbeatCreateInput = {
            serviceId,
            status: "HEALTHY",
            lastSeenAt: now,
            version: input.version ?? null,
        };
        if (input.metadata !== undefined) data.metadata = input.metadata as Prisma.InputJsonValue;

        await prisma.sentinelHeartbeat.create({
          data,
        });
        await retryActiveIncidentResolution(serviceId);
        return { success: true, serviceId, status: "HEALTHY" };
      } catch (error) {
        if (!isP2002(error) || attempt === MAX_RETRIES - 1) throw error;
        continue;
      }
    }

    // Omitted version/metadata preserve the stored values; provided values replace them.
    const data: Record<string, unknown> = { lastSeenAt: now };
    if (input.version !== undefined) data.version = input.version;
    if (input.metadata !== undefined) data.metadata = input.metadata as Prisma.InputJsonValue;

    const changed = await transitionHeartbeat(existing, "HEALTHY", data);
    if (!changed) continue;

    if (existing.status === "DEGRADED" || existing.status === "DOWN") {
      await writeHeartbeatAudit(serviceId, existing.status, "HEALTHY", "HEARTBEAT");
    }
    await retryActiveIncidentResolution(serviceId);
    return { success: true, serviceId, status: "HEALTHY" };
  }

  return { success: false, serviceId, error: "Heartbeat update conflicted too many times." };
}

export async function reconcileStaleHeartbeats(
  options: HeartbeatOptions = {},
): Promise<HeartbeatResult> {
  const services = options.services ?? HEARTBEAT_SERVICES;
  const rows = await prisma.sentinelHeartbeat.findMany({
    select: {
      serviceId: true,
      status: true,
      lastSeenAt: true,
      version: true,
      metadata: true,
    },
  }) as HeartbeatRow[];

  const now = new Date();
  const skippedServices: string[] = [];
  const changedServices: string[] = [];

  for (const row of rows) {
    const serviceConfig = getHeartbeatServiceConfig(row.serviceId, services);
    if (!serviceConfig) {
      skippedServices.push(row.serviceId);
      continue;
    }

    const elapsedMs = now.getTime() - row.lastSeenAt.getTime();
    const intervalMs = serviceConfig.expectedIntervalSeconds * 1000;
    const desiredStatus: HeartbeatStatus | null =
      elapsedMs >= 3 * intervalMs ? "DOWN" : elapsedMs >= 2 * intervalMs ? "DEGRADED" : null;

    if (!desiredStatus) continue;
    if (desiredStatus === "DEGRADED") {
      if (row.status !== "HEALTHY") continue;
      const changed = await transitionHeartbeat(row, "DEGRADED", {});
      if (!changed) continue;
      changedServices.push(row.serviceId);
      await writeHeartbeatAudit(row.serviceId, "HEALTHY", "DEGRADED", "RECONCILIATION");
      continue;
    }

    if (row.status === "DOWN") {
      await reconcileDownIncident(row.serviceId, row);
      continue;
    }

    const changed = await transitionHeartbeat(row, "DOWN", {});
    if (!changed) continue;
    changedServices.push(row.serviceId);
    await writeHeartbeatAudit(row.serviceId, row.status, "DOWN", "RECONCILIATION");
    await reconcileDownIncident(row.serviceId, row);
  }

  return {
    success: true,
    skippedServices,
    changedServices,
  };
}
