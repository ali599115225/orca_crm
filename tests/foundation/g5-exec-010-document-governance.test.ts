import { describe, expect, it } from "vitest";
import type {
  DocumentEvidence, Exec010Actor, Exec010Repository, Exec010Transaction, ExportAudit,
  MetricDefinition, MetricResult, PrivacyRequestEvidence,
} from "@/lib/document-governance/contracts";
import {
  canExpireDocumentContent, DocumentGovernanceService, normalizeDocumentName, validateDetectedDocumentType,
} from "@/lib/document-governance/service";

const tenantId = "11111111-1111-4111-8111-111111111111";
const tenantOther = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userId = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-08-11T08:30:00.000Z");
const resource = { tenantId, resourceType: "DOCUMENT", resourceId: "doc-scope-1" };

function actor(overrides: Partial<Exec010Actor> = {}): Exec010Actor {
  return {
    tenantId, userId, now,
    assignments: [{ id: "33333333-3333-4333-8333-333333333333", tenantId, userId,
      securityRole: "GENERAL_MANAGER", scopeType: "COMPANY", active: true }],
    ...overrides,
  };
}

class MemoryRepo implements Exec010Repository {
  documents = new Map<string, DocumentEvidence>();
  privacy = new Map<string, PrivacyRequestEvidence>();
  metrics: MetricDefinition[] = [];
  metricResults: MetricResult[] = [];
  exports = new Map<string, ExportAudit>();
  async transaction<T>(work: (tx: Exec010Transaction) => Promise<T>) {
    const tx: Exec010Transaction = {
      findDocument: async (t, id) => { const v = this.documents.get(id) ?? null; return v?.tenantId === t ? v : null; },
      insertDocument: async (v) => { this.documents.set(v.id, v); },
      updateDocument: async (v) => { this.documents.set(v.id, v); },
      findPrivacyRequestByKey: async (t, k) => { const v = this.privacy.get(k) ?? null; return v?.tenantId === t ? v : null; },
      insertPrivacyRequest: async (v) => { this.privacy.set(v.requestKeyHash, v); },
      findLatestMetricDefinition: async (t, k) => this.metrics.filter((v) => v.tenantId === t && v.metricKey === k).sort((a,b) => b.version-a.version)[0] ?? null,
      insertMetricDefinition: async (v) => { this.metrics.push(v); },
      insertMetricResult: async (v) => { this.metricResults.push(v); },
      findExportByJobKey: async (t, k) => { const v = this.exports.get(k) ?? null; return v?.tenantId === t ? v : null; },
      insertExportAudit: async (v) => { this.exports.set(v.jobKeyHash, v); },
    };
    return work(tx);
  }
}

async function register(service: DocumentGovernanceService, extra: Record<string, unknown> = {}) {
  return service.registerDocument({ actor: actor(), resource, displayName: "contract.pdf", clientMediaType: "text/html",
    detectedMediaType: "application/pdf", content: "safe-pdf-evidence", source: "UPLOAD", ...extra });
}

describe("EXEC-010 — document trust and access", () => {
  it("does not trust extension or client MIME and uses server-detected allowlist", async () => {
    const service = new DocumentGovernanceService(new MemoryRepo());
    const value = await register(service, { displayName: "payload.exe", clientMediaType: "application/x-msdownload", detectedMediaType: "application/pdf" });
    expect(value.detectedMediaType).toBe("application/pdf");
    expect(value.displayName).toBe("payload.exe");
    expect(value.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects executable/active and unsupported detected types", () => {
    expect(() => validateDetectedDocumentType({ detectedMediaType: "text/html" })).toThrow(/ACTIVE_CONTENT_DENIED/);
    expect(() => validateDetectedDocumentType({ detectedMediaType: "application/x-unknown" })).toThrow(/UNSUPPORTED_DOCUMENT_TYPE/);
  });

  it("rejects path traversal and normalizes safe names", () => {
    expect(() => normalizeDocumentName("../secret.pdf")).toThrow(/UNSAFE_DOCUMENT_PATH/);
    expect(() => normalizeDocumentName("/etc/passwd")).toThrow(/UNSAFE_DOCUMENT_PATH/);
    expect(normalizeDocumentName("folder/report.pdf")).toBe("report.pdf");
  });

  it("requires same-tenant exact authority and object-id possession is insufficient", async () => {
    const repo = new MemoryRepo(); const service = new DocumentGovernanceService(repo); const doc = await register(service);
    await expect(service.assertDocumentAccess({ actor: actor({ tenantId: tenantOther }), documentId: doc.id, permission: "contracts.records.read" })).rejects.toThrow(/DOCUMENT_NOT_FOUND/);
    await expect(service.assertDocumentAccess({ actor: actor({ assignments: [] }), documentId: doc.id, permission: "contracts.records.read" })).rejects.toThrow(/EXEC010_AUTHORITY_DENIED/);
    await expect(service.assertDocumentAccess({ actor: actor(), documentId: doc.id, permission: "contracts.records.read" })).resolves.toMatchObject({ id: doc.id, contentHash: doc.contentHash });
  });

  it("keeps content identity stable while retention/display lifecycle changes", async () => {
    const repo = new MemoryRepo(); const service = new DocumentGovernanceService(repo); const doc = await register(service);
    const held = await service.setDocumentRetention({ actor: actor(), documentId: doc.id, retentionPolicyKey: "DOC_POLICY", retentionUntil: new Date(now.getTime()-1), legalHold: true });
    expect(held.contentHash).toBe(doc.contentHash); expect(canExpireDocumentContent(held, now)).toBe(false);
    await expect(service.expireDocumentContent({ actor: actor(), documentId: doc.id })).rejects.toThrow(/RETENTION_OR_HOLD/);
    const unheld = await service.setDocumentRetention({ actor: actor(), documentId: doc.id, retentionPolicyKey: "DOC_POLICY", retentionUntil: new Date(now.getTime()-1), legalHold: false });
    expect(canExpireDocumentContent(unheld, now)).toBe(true);
    const expired = await service.expireDocumentContent({ actor: actor(), documentId: doc.id });
    expect(expired.contentExpired).toBe(true); expect(expired.contentHash).toBe(doc.contentHash);
  });
});

describe("EXEC-010 — privacy rights and purpose", () => {
  it("requires explicit purpose and stores attributable tenant/subject evidence", async () => {
    const repo = new MemoryRepo(); const service = new DocumentGovernanceService(repo);
    const result = await service.submitPrivacyRequest({ actor: actor(), subjectType: "PARTY", subjectId: "p1", type: "ACCESS", purpose: "LEGAL", requestKey: "req-1" });
    expect(result.value).toMatchObject({ tenantId, subjectType: "PARTY", subjectId: "p1", actorUserId: userId, purpose: "LEGAL", state: "PENDING" });
  });

  it("replays exact rights requests and fails closed on conflicting reuse", async () => {
    const repo = new MemoryRepo(); const service = new DocumentGovernanceService(repo);
    const first = await service.submitPrivacyRequest({ actor: actor(), subjectType: "PARTY", subjectId: "p1", type: "CORRECTION", purpose: "LEGAL", requestKey: "same", payload: { field: "name" } });
    const replay = await service.submitPrivacyRequest({ actor: actor(), subjectType: "PARTY", subjectId: "p1", type: "CORRECTION", purpose: "LEGAL", requestKey: "same", payload: { field: "name" } });
    expect(replay.replayed).toBe(true); expect(replay.value.id).toBe(first.value.id); expect(repo.privacy.size).toBe(1);
    await expect(service.submitPrivacyRequest({ actor: actor(), subjectType: "PARTY", subjectId: "p1", type: "DELETION", purpose: "MARKETING", requestKey: "same" })).rejects.toThrow(/REPLAY_CONFLICT/);
  });
});

describe("EXEC-010 — metric lineage", () => {
  it("versions deterministic definitions and preserves prior lineage", async () => {
    const repo = new MemoryRepo(); const service = new DocumentGovernanceService(repo);
    const v1 = await service.publishMetricDefinition({ tenantId, metricKey: "revenue_collected", sourceLineage: ["exec008_payment_transactions"], windowKey: "CALENDAR_MONTH", timezone: "Asia/Riyadh", formula: { op: "SUM_MINOR_UNITS" }, approved: true, now });
    const replay = await service.publishMetricDefinition({ tenantId, metricKey: "revenue_collected", sourceLineage: ["exec008_payment_transactions"], windowKey: "CALENDAR_MONTH", timezone: "Asia/Riyadh", formula: { op: "SUM_MINOR_UNITS" }, approved: true, now });
    const v2 = await service.publishMetricDefinition({ tenantId, metricKey: "revenue_collected", sourceLineage: ["exec008_payment_transactions"], windowKey: "CALENDAR_MONTH", timezone: "Asia/Riyadh", formula: { op: "SUM_SETTLED_MINOR_UNITS" }, approved: true, now });
    expect(v1.version).toBe(1); expect(replay.id).toBe(v1.id); expect(v2.version).toBe(2); expect(repo.metrics).toHaveLength(2);
  });

  it("requires exact minor-unit results and blocks unapproved KPI truth", async () => {
    const repo = new MemoryRepo(); const service = new DocumentGovernanceService(repo);
    const approved = await service.publishMetricDefinition({ tenantId, metricKey: "cash", sourceLineage: ["payments"], windowKey: "DAY", timezone: "Asia/Riyadh", formula: "SUM", approved: true });
    await expect(service.recordMetricResult({ definition: approved, input: { a: 1 }, valueMinorUnits: "125007" })).resolves.toMatchObject({ valueMinorUnits: "125007", metricDefinitionId: approved.id });
    await expect(service.recordMetricResult({ definition: approved, input: {}, valueMinorUnits: "12.50" })).rejects.toThrow(/EXACT_MINOR_UNITS_REQUIRED/);
    const unapproved = await service.publishMetricDefinition({ tenantId, metricKey: "invented_target", sourceLineage: ["unknown"], windowKey: "MONTH", timezone: "Asia/Riyadh", formula: "UNKNOWN", approved: false });
    await expect(service.recordMetricResult({ definition: unapproved, input: {}, valueMinorUnits: "1" })).rejects.toThrow(/UNAPPROVED_METRIC/);
  });
});

describe("EXEC-010 — export authorization and audit", () => {
  const policy = { maxRows: 100, allowedFields: ["id", "name", "amount"], forbiddenFields: ["internal"] } as const;
  it("denies missing authority, excessive rows, non-allowlisted and secret fields", async () => {
    const service = new DocumentGovernanceService(new MemoryRepo());
    const base = { resource, purpose: "REPORTING" as const, dataClass: "CUSTOMER_REPORT", fields: ["id"], query: { status: "OPEN" }, resultCount: 10, format: "CSV" as const, jobKey: "j1", policy };
    await expect(service.authorizeExport({ actor: actor({ assignments: [] }), ...base })).rejects.toThrow(/AUTHORITY_DENIED/);
    await expect(service.authorizeExport({ actor: actor(), ...base, resultCount: 101 })).rejects.toThrow(/EXPORT_LIMIT_EXCEEDED/);
    await expect(service.authorizeExport({ actor: actor(), ...base, fields: ["email"] })).rejects.toThrow(/EXPORT_FIELD_DENIED/);
    await expect(service.authorizeExport({ actor: actor(), ...base, fields: ["apiKey"] })).rejects.toThrow(/EXPORT_FIELD_DENIED/);
  });

  it("records minimized attributable audit and handles replay/conflict", async () => {
    const repo = new MemoryRepo(); const service = new DocumentGovernanceService(repo);
    const input = { actor: actor(), resource, purpose: "REPORTING" as const, dataClass: "FINANCE", fields: ["amount", "id", "id"], query: { month: "2026-08" }, resultCount: 2, format: "CSV" as const, jobKey: "job-1", policy };
    const first = await service.authorizeExport(input); const replay = await service.authorizeExport(input);
    expect(first.audit).toMatchObject({ tenantId, actorUserId: userId, purpose: "REPORTING", dataClass: "FINANCE", resultCount: 2, format: "CSV", fields: ["amount", "id"] });
    expect(first.audit.queryDigest).toMatch(/^[a-f0-9]{64}$/); expect(replay.replayed).toBe(true); expect(repo.exports.size).toBe(1);
    await expect(service.authorizeExport({ ...input, resultCount: 3 })).rejects.toThrow(/EXPORT_REPLAY_CONFLICT/);
  });

  it("fails closed across tenant/resource scope through EXEC-004", async () => {
    const service = new DocumentGovernanceService(new MemoryRepo());
    await expect(service.authorizeExport({ actor: actor({ tenantId: tenantOther }), resource, purpose: "REPORTING", dataClass: "X", fields: ["id"], query: {}, resultCount: 1, format: "JSON", jobKey: "x", policy })).rejects.toThrow(/TENANT_SCOPE_MISMATCH/);
    const assigned = actor({ assignments: [{ id: "x", tenantId, userId, securityRole: "GENERAL_MANAGER", scopeType: "ASSIGNED_RESOURCE", assignedResourceType: "DOCUMENT", assignedResourceId: "other", active: true }] });
    await expect(service.authorizeExport({ actor: assigned, resource, purpose: "REPORTING", dataClass: "X", fields: ["id"], query: {}, resultCount: 1, format: "JSON", jobKey: "y", policy })).rejects.toThrow(/RESOURCE_SCOPE_DENIED/);
  });
});
