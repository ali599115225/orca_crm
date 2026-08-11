import { createHash, randomUUID } from "node:crypto";
import { basename } from "node:path";
import { evaluateOrganizationAuthority } from "@/lib/organization/authority";
import type { OrganizationPermissionKey } from "@/lib/organization/contracts";
import type {
  DocumentEvidence,
  Exec010Actor,
  Exec010Repository,
  ExportAudit,
  ExportFormat,
  ExportPolicy,
  GovernedPurpose,
  GovernedResource,
  MetricDefinition,
  MetricResult,
  PrivacyRequestEvidence,
  PrivacyRequestType,
} from "./contracts";

const ACTIVE_OR_EXECUTABLE_MEDIA = new Set([
  "application/x-msdownload",
  "application/x-executable",
  "application/x-sh",
  "application/javascript",
  "text/javascript",
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
]);

const DEFAULT_ALLOWED_MEDIA = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/csv",
  "application/json",
]);

const SECRET_FIELD = /(password|secret|token|credential|api[_-]?key|private[_-]?key|encrypted.*secret)/i;

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function normalizeDocumentName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed.includes("\0")) throw new Error("INVALID_DOCUMENT_NAME");
  const normalized = trimmed.replace(/\\/g, "/");
  if (normalized.includes("../") || normalized.startsWith("../") || normalized.startsWith("/")) {
    throw new Error("UNSAFE_DOCUMENT_PATH");
  }
  return basename(normalized);
}

export function validateDetectedDocumentType(input: {
  detectedMediaType: string;
  allowedMediaTypes?: readonly string[];
}): string {
  const detected = input.detectedMediaType.trim().toLowerCase();
  if (ACTIVE_OR_EXECUTABLE_MEDIA.has(detected)) throw new Error("ACTIVE_CONTENT_DENIED");
  const allowed = input.allowedMediaTypes ? new Set(input.allowedMediaTypes.map((v) => v.toLowerCase())) : DEFAULT_ALLOWED_MEDIA;
  if (!allowed.has(detected)) throw new Error("UNSUPPORTED_DOCUMENT_TYPE");
  return detected;
}

export function canExpireDocumentContent(document: DocumentEvidence, now = new Date()): boolean {
  return Boolean(!document.legalHold && document.retentionUntil && document.retentionUntil <= now);
}

export class DocumentGovernanceService {
  constructor(private readonly repository: Exec010Repository) {}

  private assertAuthority(actor: Exec010Actor, resource: GovernedResource, permission: OrganizationPermissionKey): void {
    const decision = evaluateOrganizationAuthority({
      actorTenantId: actor.tenantId,
      actorUserId: actor.userId,
      permission,
      resource,
      assignments: actor.assignments,
      enabledBranchServices: actor.enabledBranchServices,
      now: actor.now,
    });
    if (!decision.allowed) throw new Error(`EXEC010_AUTHORITY_DENIED:${decision.code}`);
  }

  async registerDocument(input: {
    actor: Exec010Actor;
    resource: GovernedResource;
    displayName: string;
    clientMediaType?: string | null;
    detectedMediaType: string;
    content: Uint8Array | string;
    source: string;
    retentionPolicyKey?: string | null;
    retentionUntil?: Date | null;
    allowedMediaTypes?: readonly string[];
    readPermission?: OrganizationPermissionKey;
  }): Promise<DocumentEvidence> {
    this.assertAuthority(input.actor, input.resource, input.readPermission ?? "contracts.records.read");
    const displayName = normalizeDocumentName(input.displayName);
    const detectedMediaType = validateDetectedDocumentType({ detectedMediaType: input.detectedMediaType, allowedMediaTypes: input.allowedMediaTypes });
    const content = typeof input.content === "string" ? Buffer.from(input.content) : Buffer.from(input.content);
    const value: DocumentEvidence = {
      id: randomUUID(), tenantId: input.actor.tenantId, resource: input.resource, displayName,
      detectedMediaType, contentHash: createHash("sha256").update(content).digest("hex"), byteLength: content.byteLength,
      source: input.source, actorUserId: input.actor.userId, retentionPolicyKey: input.retentionPolicyKey ?? null,
      retentionUntil: input.retentionUntil ?? null, legalHold: false, contentExpired: false, createdAt: input.actor.now ?? new Date(),
    };
    await this.repository.transaction(async (tx) => tx.insertDocument(value));
    return value;
  }

  async assertDocumentAccess(input: { actor: Exec010Actor; documentId: string; permission: OrganizationPermissionKey }): Promise<DocumentEvidence> {
    return this.repository.transaction(async (tx) => {
      const document = await tx.findDocument(input.actor.tenantId, input.documentId);
      if (!document) throw new Error("DOCUMENT_NOT_FOUND");
      this.assertAuthority(input.actor, document.resource, input.permission);
      return document;
    });
  }

  async setDocumentRetention(input: { actor: Exec010Actor; documentId: string; retentionPolicyKey: string; retentionUntil: Date | null; legalHold?: boolean }): Promise<DocumentEvidence> {
    if (!input.retentionPolicyKey.trim()) throw new Error("RETENTION_POLICY_KEY_REQUIRED");
    return this.repository.transaction(async (tx) => {
      const document = await tx.findDocument(input.actor.tenantId, input.documentId);
      if (!document) throw new Error("DOCUMENT_NOT_FOUND");
      this.assertAuthority(input.actor, document.resource, "export.execute");
      const next = { ...document, retentionPolicyKey: input.retentionPolicyKey, retentionUntil: input.retentionUntil, legalHold: input.legalHold ?? document.legalHold };
      await tx.updateDocument(next);
      return next;
    });
  }

  async expireDocumentContent(input: { actor: Exec010Actor; documentId: string }): Promise<DocumentEvidence> {
    return this.repository.transaction(async (tx) => {
      const document = await tx.findDocument(input.actor.tenantId, input.documentId);
      if (!document) throw new Error("DOCUMENT_NOT_FOUND");
      this.assertAuthority(input.actor, document.resource, "export.execute");
      if (!canExpireDocumentContent(document, input.actor.now ?? new Date())) throw new Error("DOCUMENT_RETENTION_OR_HOLD_BLOCKS_EXPIRY");
      const next = { ...document, contentExpired: true };
      await tx.updateDocument(next);
      return next;
    });
  }

  async submitPrivacyRequest(input: { actor: Exec010Actor; subjectType: string; subjectId: string; type: PrivacyRequestType; purpose: GovernedPurpose; requestKey: string; payload?: unknown }): Promise<{ value: PrivacyRequestEvidence; replayed: boolean }> {
    if (!input.purpose) throw new Error("PRIVACY_PURPOSE_REQUIRED");
    const requestKeyHash = sha256(`${input.actor.tenantId}:${input.requestKey}`);
    const payloadHash = sha256(stable({ subjectType: input.subjectType, subjectId: input.subjectId, type: input.type, purpose: input.purpose, payload: input.payload ?? null }));
    return this.repository.transaction(async (tx) => {
      const existing = await tx.findPrivacyRequestByKey(input.actor.tenantId, requestKeyHash);
      if (existing) {
        if (existing.payloadHash !== payloadHash) throw new Error("PRIVACY_REQUEST_REPLAY_CONFLICT");
        return { value: existing, replayed: true };
      }
      const value: PrivacyRequestEvidence = { id: randomUUID(), tenantId: input.actor.tenantId, subjectType: input.subjectType, subjectId: input.subjectId, type: input.type, purpose: input.purpose, requestKeyHash, payloadHash, actorUserId: input.actor.userId, state: "PENDING", createdAt: input.actor.now ?? new Date() };
      await tx.insertPrivacyRequest(value);
      return { value, replayed: false };
    });
  }

  async publishMetricDefinition(input: { tenantId: string; metricKey: string; sourceLineage: string[]; windowKey: string; timezone: string; formula: unknown; approved: boolean; now?: Date }): Promise<MetricDefinition> {
    if (!input.metricKey.trim() || input.sourceLineage.length === 0 || !input.windowKey.trim() || !input.timezone.trim()) throw new Error("INVALID_METRIC_DEFINITION");
    const definitionHash = sha256(stable({ sourceLineage: [...input.sourceLineage].sort(), windowKey: input.windowKey, timezone: input.timezone, formula: input.formula, approved: input.approved }));
    return this.repository.transaction(async (tx) => {
      const latest = await tx.findLatestMetricDefinition(input.tenantId, input.metricKey);
      if (latest?.definitionHash === definitionHash) return latest;
      const value: MetricDefinition = { id: randomUUID(), tenantId: input.tenantId, metricKey: input.metricKey, version: (latest?.version ?? 0) + 1, definitionHash, sourceLineage: [...input.sourceLineage], windowKey: input.windowKey, timezone: input.timezone, approved: input.approved, createdAt: input.now ?? new Date() };
      await tx.insertMetricDefinition(value);
      return value;
    });
  }

  async recordMetricResult(input: { definition: MetricDefinition; input: unknown; valueMinorUnits: string; now?: Date }): Promise<MetricResult> {
    if (!/^-?\d+$/.test(input.valueMinorUnits)) throw new Error("EXACT_MINOR_UNITS_REQUIRED");
    if (!input.definition.approved) throw new Error("UNAPPROVED_METRIC_NOT_RELEASE_TRUTH");
    const value: MetricResult = { id: randomUUID(), tenantId: input.definition.tenantId, metricDefinitionId: input.definition.id, inputDigest: sha256(stable(input.input)), valueMinorUnits: input.valueMinorUnits, createdAt: input.now ?? new Date() };
    await this.repository.transaction(async (tx) => tx.insertMetricResult(value));
    return value;
  }

  async authorizeExport(input: { actor: Exec010Actor; resource: GovernedResource; purpose: GovernedPurpose; dataClass: string; fields: string[]; query: unknown; resultCount: number; format: ExportFormat; jobKey: string; policy: ExportPolicy }): Promise<{ audit: ExportAudit; replayed: boolean }> {
    this.assertAuthority(input.actor, input.resource, "export.execute");
    if (!Number.isSafeInteger(input.policy.maxRows) || input.policy.maxRows < 0) throw new Error("INVALID_EXPORT_POLICY_LIMIT");
    if (!Number.isSafeInteger(input.resultCount) || input.resultCount < 0 || input.resultCount > input.policy.maxRows) throw new Error("EXPORT_LIMIT_EXCEEDED");
    const allowed = new Set(input.policy.allowedFields);
    const forbidden = new Set(input.policy.forbiddenFields ?? []);
    const fields = [...new Set(input.fields)].sort();
    if (fields.length === 0 || fields.some((field) => !allowed.has(field) || forbidden.has(field) || SECRET_FIELD.test(field))) throw new Error("EXPORT_FIELD_DENIED");
    const queryDigest = sha256(stable(input.query));
    const jobKeyHash = sha256(`${input.actor.tenantId}:${input.jobKey}`);
    const payloadHash = sha256(stable({ resource: input.resource, purpose: input.purpose, dataClass: input.dataClass, fields, queryDigest, resultCount: input.resultCount, format: input.format }));
    return this.repository.transaction(async (tx) => {
      const existing = await tx.findExportByJobKey(input.actor.tenantId, jobKeyHash);
      if (existing) {
        if (existing.payloadHash !== payloadHash) throw new Error("EXPORT_REPLAY_CONFLICT");
        return { audit: existing, replayed: true };
      }
      const audit: ExportAudit = { id: randomUUID(), tenantId: input.actor.tenantId, actorUserId: input.actor.userId, resource: input.resource, purpose: input.purpose, dataClass: input.dataClass, fields, queryDigest, resultCount: input.resultCount, format: input.format, jobKeyHash, payloadHash, createdAt: input.actor.now ?? new Date() };
      await tx.insertExportAudit(audit);
      return { audit, replayed: false };
    });
  }
}
