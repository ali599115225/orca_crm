import "server-only";
import type { Prisma } from "@prisma/client";
import { rawPrisma } from "@/lib/prisma";
import type {
  DocumentEvidence,
  Exec010Repository,
  Exec010Transaction,
  ExportAudit,
  MetricDefinition,
  MetricResult,
  PrivacyRequestEvidence,
} from "./contracts";

type SqlClient = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
const asDate = (value: Date | string | null) => value === null ? null : value instanceof Date ? value : new Date(value);

function mapDocument(row: any): DocumentEvidence {
  return {
    id: row.id, tenantId: row.tenant_id, resource: row.resource_scope, displayName: row.display_name,
    detectedMediaType: row.detected_media_type, contentHash: row.content_hash, byteLength: Number(row.byte_length),
    source: row.source, actorUserId: row.actor_user_id, retentionPolicyKey: row.retention_policy_key,
    retentionUntil: asDate(row.retention_until), legalHold: row.legal_hold, contentExpired: row.content_expired,
    createdAt: asDate(row.created_at) as Date,
  };
}

function mapPrivacy(row: any): PrivacyRequestEvidence {
  return { id: row.id, tenantId: row.tenant_id, subjectType: row.subject_type, subjectId: row.subject_id,
    type: row.request_type, purpose: row.purpose, requestKeyHash: row.request_key_hash, payloadHash: row.payload_hash,
    actorUserId: row.actor_user_id, state: row.state, createdAt: asDate(row.created_at) as Date };
}

function mapMetric(row: any): MetricDefinition {
  return { id: row.id, tenantId: row.tenant_id, metricKey: row.metric_key, version: row.version,
    definitionHash: row.definition_hash, sourceLineage: row.source_lineage, windowKey: row.window_key,
    timezone: row.timezone, approved: row.approved, createdAt: asDate(row.created_at) as Date };
}

function mapExport(row: any): ExportAudit {
  return { id: row.id, tenantId: row.tenant_id, actorUserId: row.actor_user_id, resource: row.resource_scope,
    purpose: row.purpose, dataClass: row.data_class, fields: row.fields, queryDigest: row.query_digest,
    resultCount: row.result_count, format: row.export_format, jobKeyHash: row.job_key_hash,
    payloadHash: row.payload_hash, createdAt: asDate(row.created_at) as Date };
}

class SqlTx implements Exec010Transaction {
  constructor(private readonly db: SqlClient) {}
  async findDocument(tenantId: string, id: string) {
    const rows = await this.db.$queryRaw<any[]>`SELECT * FROM exec010_document_evidence WHERE tenant_id=${tenantId}::uuid AND id=${id}::uuid LIMIT 1 FOR UPDATE`;
    return rows[0] ? mapDocument(rows[0]) : null;
  }
  async insertDocument(v: DocumentEvidence) {
    await this.db.$executeRaw`INSERT INTO exec010_document_evidence
      (id,tenant_id,resource_scope,display_name,detected_media_type,content_hash,byte_length,source,actor_user_id,retention_policy_key,retention_until,legal_hold,content_expired,created_at)
      VALUES (${v.id}::uuid,${v.tenantId}::uuid,${JSON.stringify(v.resource)}::jsonb,${v.displayName},${v.detectedMediaType},${v.contentHash},${v.byteLength},${v.source},${v.actorUserId}::uuid,${v.retentionPolicyKey},${v.retentionUntil},${v.legalHold},${v.contentExpired},${v.createdAt})`;
  }
  async updateDocument(v: DocumentEvidence) {
    await this.db.$executeRaw`UPDATE exec010_document_evidence SET display_name=${v.displayName}, retention_policy_key=${v.retentionPolicyKey}, retention_until=${v.retentionUntil}, legal_hold=${v.legalHold}, content_expired=${v.contentExpired} WHERE tenant_id=${v.tenantId}::uuid AND id=${v.id}::uuid`;
  }
  async findPrivacyRequestByKey(tenantId: string, key: string) {
    const rows = await this.db.$queryRaw<any[]>`SELECT * FROM exec010_privacy_requests WHERE tenant_id=${tenantId}::uuid AND request_key_hash=${key} LIMIT 1 FOR UPDATE`;
    return rows[0] ? mapPrivacy(rows[0]) : null;
  }
  async insertPrivacyRequest(v: PrivacyRequestEvidence) {
    await this.db.$executeRaw`INSERT INTO exec010_privacy_requests
      (id,tenant_id,subject_type,subject_id,request_type,purpose,request_key_hash,payload_hash,actor_user_id,state,created_at)
      VALUES (${v.id}::uuid,${v.tenantId}::uuid,${v.subjectType},${v.subjectId},${v.type},${v.purpose},${v.requestKeyHash},${v.payloadHash},${v.actorUserId}::uuid,${v.state},${v.createdAt})`;
  }
  async findLatestMetricDefinition(tenantId: string, metricKey: string) {
    const rows = await this.db.$queryRaw<any[]>`SELECT * FROM exec010_metric_definitions WHERE tenant_id=${tenantId}::uuid AND metric_key=${metricKey} ORDER BY version DESC LIMIT 1 FOR UPDATE`;
    return rows[0] ? mapMetric(rows[0]) : null;
  }
  async insertMetricDefinition(v: MetricDefinition) {
    await this.db.$executeRaw`INSERT INTO exec010_metric_definitions
      (id,tenant_id,metric_key,version,definition_hash,source_lineage,window_key,timezone,approved,created_at)
      VALUES (${v.id}::uuid,${v.tenantId}::uuid,${v.metricKey},${v.version},${v.definitionHash},${v.sourceLineage}::text[],${v.windowKey},${v.timezone},${v.approved},${v.createdAt})`;
  }
  async insertMetricResult(v: MetricResult) {
    await this.db.$executeRaw`INSERT INTO exec010_metric_results
      (id,tenant_id,metric_definition_id,input_digest,value_minor_units,created_at)
      VALUES (${v.id}::uuid,${v.tenantId}::uuid,${v.metricDefinitionId}::uuid,${v.inputDigest},${v.valueMinorUnits},${v.createdAt})`;
  }
  async findExportByJobKey(tenantId: string, key: string) {
    const rows = await this.db.$queryRaw<any[]>`SELECT * FROM exec010_export_audits WHERE tenant_id=${tenantId}::uuid AND job_key_hash=${key} LIMIT 1`;
    return rows[0] ? mapExport(rows[0]) : null;
  }
  async insertExportAudit(v: ExportAudit) {
    await this.db.$executeRaw`INSERT INTO exec010_export_audits
      (id,tenant_id,actor_user_id,resource_scope,purpose,data_class,fields,query_digest,result_count,export_format,job_key_hash,payload_hash,created_at)
      VALUES (${v.id}::uuid,${v.tenantId}::uuid,${v.actorUserId}::uuid,${JSON.stringify(v.resource)}::jsonb,${v.purpose},${v.dataClass},${v.fields}::text[],${v.queryDigest},${v.resultCount},${v.format},${v.jobKeyHash},${v.payloadHash},${v.createdAt})`;
  }
}

export class SqlDocumentGovernanceRepository implements Exec010Repository {
  constructor(private readonly externalClient?: Prisma.TransactionClient) {}
  async transaction<T>(work: (tx: Exec010Transaction) => Promise<T>): Promise<T> {
    if (this.externalClient) return work(new SqlTx(this.externalClient));
    return rawPrisma.$transaction(async (tx) => work(new SqlTx(tx)));
  }
}
