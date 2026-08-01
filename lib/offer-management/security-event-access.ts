import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { rawPrisma } from "@/lib/prisma";
import { signHmacSha256, type HmacKey } from "@/lib/offer-management/hmac";

export type EmployeeDatabaseSession = Readonly<{ userId: string; tenantId: string }>;
export type SecurityEventInvestigationRequest = Readonly<{
  securityEventId: string;
  reason: string;
  correlationId: string;
}>;
export type GovernedRawIpReadResult = Readonly<{
  securityEventId: string;
  rawIp: string | null;
  correlationId: string;
  committedAt: Date;
}>;

type InvestigationPurpose =
  | "AUTH_ABUSE_INVESTIGATION"
  | "ACCEPTANCE_REPLAY_INVESTIGATION"
  | "SUSPECTED_ACCOUNT_TAKEOVER";
type AuthorityMetadata = Readonly<{
  securityEventId: string;
  tenantId: string;
  principalId: string;
  branchId: string | null;
  serviceLine: "SALES" | "LEASING" | null;
  offerVersionId: string | null;
  eventType: string;
  occurredAt: Date;
}>;
type AssignmentCandidate = Readonly<{
  id: string;
  scopeType: "COMPANY" | "BRANCH";
  branchId: string | null;
  startsAt: Date | null;
  createdAt: Date;
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const KEY_VERSION = /^DB-AUTH-K[1-9][0-9]*$/;
const PERMISSION = "security.customer_event_raw_ip.read" as const;
const ENVELOPE_VERSION = "ORCA-DB-AUTH-1" as const;
const FIELD_LIMITS = {
  version: 32,
  key_version: 32,
  permission_key: 96,
  scope_type: 32,
  service_line: 32,
  purpose_code: 64,
  correlation_id: 147,
} as const;

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function assertCanonicalString(name: string, input: string, limit: number): string {
  const value = input.normalize("NFC");
  if (!value || /[\r\n\0=]/u.test(value) || value === "~") {
    throw new Error(`INVALID_DB_AUTH_FIELD:${name}`);
  }
  if (byteLength(value) > limit) throw new Error(`DB_AUTH_FIELD_TOO_LONG:${name}`);
  return value;
}

function assertUuid(name: string, value: string): string {
  if (!UUID.test(value)) throw new Error(`INVALID_DB_AUTH_UUID:${name}`);
  return value;
}

function parseInvestigationRequest(input: SecurityEventInvestigationRequest): SecurityEventInvestigationRequest {
  const value = input as unknown as Record<string, unknown>;
  const allowed = new Set(["securityEventId", "reason", "correlationId"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error("UNKNOWN_SECURITY_EVENT_ACCESS_PROPERTY");
  }
  if (typeof value.securityEventId !== "string" || !UUID.test(value.securityEventId)) {
    throw new Error("INVALID_SECURITY_EVENT_ID");
  }
  if (typeof value.reason !== "string" || !value.reason.trim() || byteLength(value.reason.normalize("NFC")) > 512) {
    throw new Error("INVALID_SECURITY_EVENT_ACCESS_REASON");
  }
  if (typeof value.correlationId !== "string") throw new Error("INVALID_CORRELATION_ID");
  return {
    securityEventId: value.securityEventId,
    reason: assertCanonicalString("reason", value.reason, 512),
    correlationId: assertCanonicalString("correlation_id", value.correlationId, FIELD_LIMITS.correlation_id),
  };
}

function loadActiveKey(): HmacKey {
  const activeVersion = process.env.ORCA_EXEC007_DB_AUTH_ACTIVE_KEY_VERSION?.trim() ?? "";
  if (!KEY_VERSION.test(activeVersion)) throw new Error("EXEC007_DB_AUTH_ACTIVE_KEY_VERSION_INVALID");
  const raw = process.env.ORCA_EXEC007_DB_AUTH_KEYRING;
  if (!raw) throw new Error("EXEC007_DB_AUTH_KEYRING_MISSING");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("EXEC007_DB_AUTH_KEYRING_INVALID");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("EXEC007_DB_AUTH_KEYRING_INVALID");
  }
  const encoded = (parsed as Record<string, unknown>)[activeVersion];
  if (typeof encoded !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) {
    throw new Error("EXEC007_DB_AUTH_ACTIVE_KEY_MISSING");
  }
  const secret = Buffer.from(encoded, "base64");
  if (secret.length !== 32) throw new Error("EXEC007_DB_AUTH_KEY_LENGTH_INVALID");
  return { version: activeVersion, secret };
}

export function selectSecurityEventAuthorityAssignment(
  metadata: Pick<AuthorityMetadata, "branchId">,
  candidates: readonly AssignmentCandidate[],
): AssignmentCandidate {
  const eligible = candidates.filter((candidate) =>
    metadata.branchId
      ? candidate.scopeType === "COMPANY" ||
        (candidate.scopeType === "BRANCH" && candidate.branchId === metadata.branchId)
      : candidate.scopeType === "COMPANY",
  );
  eligible.sort((left, right) => {
    const leftRank = metadata.branchId && left.scopeType === "BRANCH" ? 0 : 1;
    const rightRank = metadata.branchId && right.scopeType === "BRANCH" ? 0 : 1;
    if (leftRank !== rightRank) return leftRank - rightRank;
    const leftStart = left.startsAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const rightStart = right.startsAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    if (leftStart !== rightStart) return leftStart - rightStart;
    const created = left.createdAt.getTime() - right.createdAt.getTime();
    if (created !== 0) return created;
    return left.id.toLowerCase().localeCompare(right.id.toLowerCase());
  });
  const selected = eligible[0];
  if (!selected) throw new Error("AUTHORITY_ASSIGNMENT_NOT_FOUND");
  return selected;
}

export function buildDbAuthorizationEnvelope(input: Readonly<{
  keyVersion: string;
  tenantId: string;
  actorUserId: string;
  assignmentId: string;
  scopeType: "COMPANY" | "BRANCH";
  branchId: string | null;
  serviceLine: "SALES" | "LEASING" | null;
  securityEventId: string;
  purposeCode: InvestigationPurpose;
  correlationId: string;
  issuedAt: Date;
  expiresAt: Date;
  nonce: string;
}>): string {
  if (!KEY_VERSION.test(input.keyVersion)) throw new Error("INVALID_DB_AUTH_KEY_VERSION");
  if (!/^[0-9a-f]{64}$/.test(input.nonce)) throw new Error("INVALID_DB_AUTH_NONCE");
  const values = [
    ["version", ENVELOPE_VERSION],
    ["key_version", input.keyVersion],
    ["tenant_id", assertUuid("tenant_id", input.tenantId)],
    ["actor_user_id", assertUuid("actor_user_id", input.actorUserId)],
    ["assignment_id", assertUuid("assignment_id", input.assignmentId)],
    ["permission_key", PERMISSION],
    ["scope_type", input.scopeType],
    ["branch_id", input.branchId ? assertUuid("branch_id", input.branchId) : "~"],
    ["service_line", input.serviceLine ?? "~"],
    ["security_event_id", assertUuid("security_event_id", input.securityEventId)],
    ["purpose_code", input.purposeCode],
    ["correlation_id", assertCanonicalString("correlation_id", input.correlationId, FIELD_LIMITS.correlation_id)],
    ["issued_at", input.issuedAt.toISOString()],
    ["expires_at", input.expiresAt.toISOString()],
    ["nonce", input.nonce],
  ] as const;
  for (const [name, value] of values) {
    const limit = FIELD_LIMITS[name as keyof typeof FIELD_LIMITS];
    if (limit && byteLength(value) > limit) throw new Error(`DB_AUTH_FIELD_TOO_LONG:${name}`);
  }
  const envelope = values.map(([name, value]) => `${name}=${value}`).join("\n");
  if (byteLength(envelope) > 2048) throw new Error("DB_AUTH_ENVELOPE_TOO_LONG");
  return envelope;
}

async function readForPurpose(
  session: EmployeeDatabaseSession,
  requestInput: SecurityEventInvestigationRequest,
  purposeCode: InvestigationPurpose,
): Promise<GovernedRawIpReadResult> {
  assertUuid("session.userId", session.userId);
  assertUuid("session.tenantId", session.tenantId);
  const request = parseInvestigationRequest(requestInput);
  const key = loadActiveKey();

  const committed = await rawPrisma.$transaction(async (tx) => {
    const revalidated = await tx.$queryRaw<Array<{ ok: boolean }>>(Prisma.sql`
      SELECT TRUE AS ok
      FROM public.users u
      JOIN public.tenants t ON t.id = u.tenant_id
      WHERE u.id = ${session.userId}::uuid
        AND u.tenant_id = ${session.tenantId}::uuid
        AND u.is_active = TRUE
        AND t.is_active = TRUE
    `);
    if (revalidated.length !== 1) throw new Error("EMPLOYEE_DATABASE_SESSION_INVALID");

    const metadataRows = await tx.$queryRaw<Array<{
      security_event_id: string; tenant_id: string; principal_id: string;
      branch_id: string | null; service_line: "SALES" | "LEASING" | null;
      offer_version_id: string | null; event_type: string; occurred_at: Date;
    }>>(Prisma.sql`
      SELECT * FROM public.fn_exec007_get_security_event_authority_metadata(
        ${session.tenantId}::uuid, ${request.securityEventId}::uuid
      )
    `);
    if (metadataRows.length !== 1) throw new Error("SECURITY_EVENT_NOT_FOUND");
    const row = metadataRows[0];
    const metadata: AuthorityMetadata = {
      securityEventId: row.security_event_id,
      tenantId: row.tenant_id,
      principalId: row.principal_id,
      branchId: row.branch_id,
      serviceLine: row.service_line,
      offerVersionId: row.offer_version_id,
      eventType: row.event_type,
      occurredAt: row.occurred_at,
    };

    const assignmentRows = await tx.$queryRaw<Array<{
      id: string; scope_type: "COMPANY" | "BRANCH"; branch_id: string | null;
      starts_at: Date | null; created_at: Date;
    }>>(Prisma.sql`
      SELECT a.id, a.scope_type, a.branch_id, a.starts_at, a.created_at
      FROM public.user_scope_assignments a
      WHERE a.tenant_id = ${session.tenantId}::uuid
        AND a.user_id = ${session.userId}::uuid
        AND a.security_role = 'COMPLIANCE_AUDIT'
        AND a.scope_type IN ('COMPANY','BRANCH')
        AND a.is_active = TRUE
        AND (a.starts_at IS NULL OR a.starts_at <= transaction_timestamp())
        AND (a.ends_at IS NULL OR a.ends_at > transaction_timestamp())
    `);
    const assignment = selectSecurityEventAuthorityAssignment(
      metadata,
      assignmentRows.map((candidate) => ({
        id: candidate.id,
        scopeType: candidate.scope_type,
        branchId: candidate.branch_id,
        startsAt: candidate.starts_at,
        createdAt: candidate.created_at,
      })),
    );

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 30_000);
    const envelope = buildDbAuthorizationEnvelope({
      keyVersion: key.version,
      tenantId: session.tenantId,
      actorUserId: session.userId,
      assignmentId: assignment.id,
      scopeType: assignment.scopeType,
      branchId: metadata.branchId,
      serviceLine: metadata.serviceLine,
      securityEventId: request.securityEventId,
      purposeCode,
      correlationId: request.correlationId,
      issuedAt,
      expiresAt,
      nonce: randomBytes(32).toString("hex"),
    });
    const signature = signHmacSha256(envelope, key);
    await tx.$queryRaw(Prisma.sql`SELECT set_config('orca.db_auth.envelope', ${envelope}, TRUE)`);
    await tx.$queryRaw(Prisma.sql`SELECT set_config('orca.db_auth.signature', ${signature}, TRUE)`);
    await tx.$queryRaw(Prisma.sql`SELECT set_config('orca.db_auth.key_version', ${key.version}, TRUE)`);
    const result = await tx.$queryRaw<Array<{ raw_ip: string | null }>>(Prisma.sql`
      SELECT public.fn_exec007_guard_security_event_read(${request.reason})::text AS raw_ip
    `);
    if (result.length !== 1) throw new Error("GOVERNED_RAW_IP_RESULT_INVALID");
    return { rawIp: result[0].raw_ip };
  });

  return {
    securityEventId: request.securityEventId,
    rawIp: committed.rawIp,
    correlationId: request.correlationId,
    committedAt: new Date(),
  };
}

export function readRawIpForAuthAbuseInvestigation(
  session: EmployeeDatabaseSession,
  request: SecurityEventInvestigationRequest,
): Promise<GovernedRawIpReadResult> {
  return readForPurpose(session, request, "AUTH_ABUSE_INVESTIGATION");
}

export function readRawIpForAcceptanceReplayInvestigation(
  session: EmployeeDatabaseSession,
  request: SecurityEventInvestigationRequest,
): Promise<GovernedRawIpReadResult> {
  return readForPurpose(session, request, "ACCEPTANCE_REPLAY_INVESTIGATION");
}

export function readRawIpForSuspectedAccountTakeover(
  session: EmployeeDatabaseSession,
  request: SecurityEventInvestigationRequest,
): Promise<GovernedRawIpReadResult> {
  return readForPurpose(session, request, "SUSPECTED_ACCOUNT_TAKEOVER");
}
