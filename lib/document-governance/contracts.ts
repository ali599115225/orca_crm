import type { OrganizationScopeAssignment, OrganizationServiceLine } from "@/lib/organization/contracts";

export type GovernedPurpose = "MARKETING" | "OPERATIONAL" | "SERVICE" | "LEGAL" | "REPORTING";
export type PrivacyRequestType = "ACCESS" | "EXPORT" | "CORRECTION" | "DELETION" | "OBJECTION";
export type ExportFormat = "CSV" | "JSON" | "PDF";

export interface Exec010Actor {
  tenantId: string;
  userId: string;
  assignments: OrganizationScopeAssignment[];
  enabledBranchServices?: Array<{ branchId: string; serviceLine: OrganizationServiceLine; enabled: boolean }>;
  now?: Date;
}

export interface GovernedResource {
  tenantId: string;
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  resourceType: string;
  resourceId: string;
}

export interface DocumentEvidence {
  id: string;
  tenantId: string;
  resource: GovernedResource;
  displayName: string;
  detectedMediaType: string;
  contentHash: string;
  byteLength: number;
  source: string;
  actorUserId: string;
  retentionPolicyKey: string | null;
  retentionUntil: Date | null;
  legalHold: boolean;
  contentExpired: boolean;
  createdAt: Date;
}

export interface PrivacyRequestEvidence {
  id: string;
  tenantId: string;
  subjectType: string;
  subjectId: string;
  type: PrivacyRequestType;
  purpose: GovernedPurpose;
  requestKeyHash: string;
  payloadHash: string;
  actorUserId: string;
  state: "PENDING" | "COMPLETED" | "DENIED";
  createdAt: Date;
}

export interface MetricDefinition {
  id: string;
  tenantId: string;
  metricKey: string;
  version: number;
  definitionHash: string;
  sourceLineage: string[];
  windowKey: string;
  timezone: string;
  approved: boolean;
  createdAt: Date;
}

export interface MetricResult {
  id: string;
  tenantId: string;
  metricDefinitionId: string;
  inputDigest: string;
  valueMinorUnits: string;
  createdAt: Date;
}

export interface ExportPolicy {
  maxRows: number;
  allowedFields: readonly string[];
  forbiddenFields?: readonly string[];
}

export interface ExportAudit {
  id: string;
  tenantId: string;
  actorUserId: string;
  resource: GovernedResource;
  purpose: GovernedPurpose;
  dataClass: string;
  fields: string[];
  queryDigest: string;
  resultCount: number;
  format: ExportFormat;
  jobKeyHash: string;
  payloadHash: string;
  createdAt: Date;
}

export interface Exec010Transaction {
  findDocument(tenantId: string, id: string): Promise<DocumentEvidence | null>;
  insertDocument(value: DocumentEvidence): Promise<void>;
  updateDocument(value: DocumentEvidence): Promise<void>;
  findPrivacyRequestByKey(tenantId: string, requestKeyHash: string): Promise<PrivacyRequestEvidence | null>;
  insertPrivacyRequest(value: PrivacyRequestEvidence): Promise<void>;
  findLatestMetricDefinition(tenantId: string, metricKey: string): Promise<MetricDefinition | null>;
  insertMetricDefinition(value: MetricDefinition): Promise<void>;
  insertMetricResult(value: MetricResult): Promise<void>;
  findExportByJobKey(tenantId: string, jobKeyHash: string): Promise<ExportAudit | null>;
  insertExportAudit(value: ExportAudit): Promise<void>;
}

export interface Exec010Repository {
  transaction<T>(work: (tx: Exec010Transaction) => Promise<T>): Promise<T>;
}
