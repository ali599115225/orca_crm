import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ContractTemplateVersion,
  ContractVersion,
  FinancialCorrection,
  FinancialObligation,
  IdempotencyRecord,
  PaymentAllocation,
  PaymentEvidence,
  PaymentRecord,
  RefundRequest,
  ScopedResource,
  SignatoryAuthorityEvidence,
} from "@/lib/contract-finance/contracts";
import type {
  ContractFinanceRepository,
  ContractFinanceTransaction,
} from "@/lib/contract-finance/repository";

type SqlRow = Record<string, unknown>;
type SqlClient = Pick<typeof prisma, "$queryRaw" | "$executeRaw">;

const text = (value: unknown) => String(value);
const nullableText = (value: unknown) => (value == null ? null : String(value));
const date = (value: unknown) => (value instanceof Date ? value : new Date(String(value)));
const nullableDate = (value: unknown) => (value == null ? null : date(value));
const integer = (value: unknown) => Number(value);

function scopeFromRow(row: SqlRow): ScopedResource {
  return {
    tenantId: text(row.tenant_id),
    branchId: nullableText(row.branch_id),
    departmentId: nullableText(row.department_id),
    teamId: nullableText(row.team_id),
    resourceType: text(row.resource_type),
    resourceId: text(row.resource_id),
  };
}

function contractVersionFromRow(row: SqlRow): ContractVersion {
  return {
    id: text(row.id),
    tenantId: text(row.tenant_id),
    contractId: text(row.contract_id),
    version: integer(row.version),
    previousVersionId: nullableText(row.previous_version_id),
    templateVersionId: text(row.template_version_id),
    templateContentHash: text(row.template_content_hash),
    contentHash: text(row.content_hash),
    contentSnapshot: text(row.content_snapshot),
    state: text(row.state) as ContractVersion["state"],
    scope: scopeFromRow(row),
    issuedAt: nullableDate(row.issued_at),
    signedAt: nullableDate(row.signed_at),
    acceptedAt: nullableDate(row.accepted_at),
    activatedAt: nullableDate(row.activated_at),
  };
}

function paymentFromRow(row: SqlRow): PaymentRecord {
  return {
    id: text(row.id),
    tenantId: text(row.tenant_id),
    evidenceId: text(row.evidence_id),
    amount: { currency: text(row.currency), minorUnits: integer(row.amount_minor) },
    scope: scopeFromRow(row),
    completedAt: date(row.completed_at),
  };
}

function refundFromRow(row: SqlRow): RefundRequest {
  return {
    id: text(row.id),
    tenantId: text(row.tenant_id),
    paymentId: text(row.payment_id),
    amount: { currency: text(row.currency), minorUnits: integer(row.amount_minor) },
    reason: text(row.reason),
    initiatedByUserId: text(row.initiated_by_user_id),
    approvedByUserId: nullableText(row.approved_by_user_id),
    state: text(row.state) as RefundRequest["state"],
    scope: scopeFromRow(row),
  };
}

class SqlTransaction implements ContractFinanceTransaction {
  constructor(private readonly tx: SqlClient) {}

  async findIdempotency(tenantId: string, operation: string, keyHash: string) {
    const rows = await this.tx.$queryRaw<SqlRow[]>(Prisma.sql`
      SELECT tenant_id, operation, key_hash, payload_hash, result_ref
      FROM exec008_idempotency
      WHERE tenant_id = ${tenantId}::uuid AND operation = ${operation} AND key_hash = ${keyHash}
      LIMIT 1
    `);
    const row = rows[0];
    return row
      ? ({ tenantId: text(row.tenant_id), operation: text(row.operation), keyHash: text(row.key_hash), payloadHash: text(row.payload_hash), resultRef: text(row.result_ref) } satisfies IdempotencyRecord)
      : null;
  }

  async insertIdempotency(record: IdempotencyRecord) {
    await this.tx.$executeRaw(Prisma.sql`
      INSERT INTO exec008_idempotency (tenant_id, operation, key_hash, payload_hash, result_ref)
      VALUES (${record.tenantId}::uuid, ${record.operation}, ${record.keyHash}, ${record.payloadHash}, ${record.resultRef})
    `);
  }

  async findTemplateVersion(tenantId: string, templateVersionId: string) {
    const rows = await this.tx.$queryRaw<SqlRow[]>(Prisma.sql`
      SELECT id, tenant_id, template_key, version, content_hash, content_snapshot, issued_at
      FROM exec008_contract_template_versions
      WHERE tenant_id = ${tenantId}::uuid AND id = ${templateVersionId}::uuid
      LIMIT 1
    `);
    const row = rows[0];
    return row
      ? ({ id: text(row.id), tenantId: text(row.tenant_id), templateKey: text(row.template_key), version: integer(row.version), contentHash: text(row.content_hash), contentSnapshot: text(row.content_snapshot), issuedAt: nullableDate(row.issued_at) } satisfies ContractTemplateVersion)
      : null;
  }

  async findContractVersion(tenantId: string, contractVersionId: string) {
    const rows = await this.tx.$queryRaw<SqlRow[]>(Prisma.sql`
      SELECT * FROM exec008_contract_versions
      WHERE tenant_id = ${tenantId}::uuid AND id = ${contractVersionId}::uuid
      LIMIT 1
    `);
    return rows[0] ? contractVersionFromRow(rows[0]) : null;
  }

  async findCurrentContractVersion(tenantId: string, contractId: string) {
    const rows = await this.tx.$queryRaw<SqlRow[]>(Prisma.sql`
      SELECT * FROM exec008_contract_versions
      WHERE tenant_id = ${tenantId}::uuid AND contract_id = ${contractId}::uuid
      ORDER BY version DESC
      LIMIT 1
      FOR UPDATE
    `);
    return rows[0] ? contractVersionFromRow(rows[0]) : null;
  }

  async insertContractVersion(version: ContractVersion) {
    await this.tx.$executeRaw(Prisma.sql`
      INSERT INTO exec008_contract_versions (
        id, tenant_id, contract_id, version, previous_version_id, template_version_id,
        template_content_hash, content_hash, content_snapshot, state,
        branch_id, department_id, team_id, resource_type, resource_id,
        issued_at, signed_at, accepted_at, activated_at
      ) VALUES (
        ${version.id}::uuid, ${version.tenantId}::uuid, ${version.contractId}::uuid, ${version.version},
        ${version.previousVersionId}::uuid, ${version.templateVersionId}::uuid,
        ${version.templateContentHash}, ${version.contentHash}, ${version.contentSnapshot}, ${version.state},
        ${version.scope.branchId}::uuid, ${version.scope.departmentId}::uuid, ${version.scope.teamId}::uuid,
        ${version.scope.resourceType}, ${version.scope.resourceId},
        ${version.issuedAt}, ${version.signedAt}, ${version.acceptedAt}, ${version.activatedAt}
      )
    `);
  }

  async markContractVersionSigned(input: { tenantId: string; contractVersionId: string; signedAt: Date; evidence: SignatoryAuthorityEvidence }) {
    const rows = await this.tx.$queryRaw<SqlRow[]>(Prisma.sql`
      UPDATE exec008_contract_versions
      SET state = 'SIGNED', signed_at = ${input.signedAt}
      WHERE tenant_id = ${input.tenantId}::uuid AND id = ${input.contractVersionId}::uuid AND state = 'ISSUED'
      RETURNING *
    `);
    if (!rows[0]) throw new Error("Contract version is not signable.");
    await this.tx.$executeRaw(Prisma.sql`
      INSERT INTO exec008_signatory_authority_evidence (
        tenant_id, contract_version_id, actor_user_id, assignment_id, resource_type, resource_id, captured_at
      ) VALUES (
        ${input.evidence.tenantId}::uuid, ${input.contractVersionId}::uuid, ${input.evidence.actorUserId}::uuid,
        ${input.evidence.assignmentId}::uuid, ${input.evidence.resourceType}, ${input.evidence.resourceId}, ${input.evidence.capturedAt}
      )
    `);
    return contractVersionFromRow(rows[0]);
  }

  async markContractVersionActivated(input: { tenantId: string; contractVersionId: string; activatedAt: Date }) {
    const rows = await this.tx.$queryRaw<SqlRow[]>(Prisma.sql`
      UPDATE exec008_contract_versions
      SET state = 'ACTIVATED', activated_at = ${input.activatedAt}
      WHERE tenant_id = ${input.tenantId}::uuid AND id = ${input.contractVersionId}::uuid AND state IN ('SIGNED','ACCEPTED')
      RETURNING *
    `);
    if (!rows[0]) throw new Error("Contract version is not activatable.");
    return contractVersionFromRow(rows[0]);
  }

  async findObligation(tenantId: string, obligationId: string) {
    const rows = await this.tx.$queryRaw<SqlRow[]>(Prisma.sql`
      SELECT o.*, COALESCE((SELECT sum(a.amount_minor) FROM exec008_payment_allocations a WHERE a.tenant_id=o.tenant_id AND a.obligation_id=o.id),0) AS allocated_minor
      FROM exec008_financial_obligations o
      WHERE o.tenant_id = ${tenantId}::uuid AND o.id = ${obligationId}::uuid
      LIMIT 1
      FOR UPDATE
    `);
    const row = rows[0];
    return row
      ? ({ id: text(row.id), tenantId: text(row.tenant_id), sourceType: text(row.source_type), sourceId: text(row.source_id), amount: { currency: text(row.currency), minorUnits: integer(row.amount_minor) }, correctedMinorUnits: integer(row.corrected_minor), allocatedMinorUnits: integer(row.allocated_minor), finalized: Boolean(row.finalized), scope: scopeFromRow(row) } satisfies FinancialObligation)
      : null;
  }

  async insertCorrection(correction: FinancialCorrection) {
    await this.tx.$executeRaw(Prisma.sql`
      INSERT INTO exec008_financial_corrections (id, tenant_id, obligation_id, currency, amount_minor, reason, actor_user_id, created_at)
      VALUES (${correction.id}::uuid, ${correction.tenantId}::uuid, ${correction.obligationId}::uuid, ${correction.amount.currency}, ${correction.amount.minorUnits}, ${correction.reason}, ${correction.actorUserId}::uuid, ${correction.createdAt})
    `);
  }

  async findPaymentEvidence(tenantId: string, evidenceId: string) {
    const rows = await this.tx.$queryRaw<SqlRow[]>(Prisma.sql`
      SELECT * FROM exec008_payment_evidence
      WHERE tenant_id = ${tenantId}::uuid AND id = ${evidenceId}::uuid
      LIMIT 1
    `);
    const row = rows[0];
    return row
      ? ({ id: text(row.id), tenantId: text(row.tenant_id), provider: text(row.provider), providerReference: text(row.provider_reference), amount: { currency: text(row.currency), minorUnits: integer(row.amount_minor) }, scope: scopeFromRow(row), verified: Boolean(row.verified), verifiedAt: nullableDate(row.verified_at), payloadHash: text(row.payload_hash) } satisfies PaymentEvidence)
      : null;
  }

  async findPayment(tenantId: string, paymentId: string) {
    const rows = await this.tx.$queryRaw<SqlRow[]>(Prisma.sql`
      SELECT * FROM exec008_payments WHERE tenant_id = ${tenantId}::uuid AND id = ${paymentId}::uuid LIMIT 1
    `);
    return rows[0] ? paymentFromRow(rows[0]) : null;
  }

  async insertPayment(payment: PaymentRecord) {
    await this.tx.$executeRaw(Prisma.sql`
      INSERT INTO exec008_payments (id, tenant_id, evidence_id, currency, amount_minor, branch_id, department_id, team_id, resource_type, resource_id, completed_at)
      VALUES (${payment.id}::uuid, ${payment.tenantId}::uuid, ${payment.evidenceId}::uuid, ${payment.amount.currency}, ${payment.amount.minorUnits}, ${payment.scope.branchId}::uuid, ${payment.scope.departmentId}::uuid, ${payment.scope.teamId}::uuid, ${payment.scope.resourceType}, ${payment.scope.resourceId}, ${payment.completedAt})
    `);
  }

  async insertPaymentAllocation(allocation: PaymentAllocation) {
    await this.tx.$executeRaw(Prisma.sql`
      INSERT INTO exec008_payment_allocations (id, tenant_id, payment_id, obligation_id, currency, amount_minor, created_at)
      VALUES (${allocation.id}::uuid, ${allocation.tenantId}::uuid, ${allocation.paymentId}::uuid, ${allocation.obligationId}::uuid, ${allocation.amount.currency}, ${allocation.amount.minorUnits}, ${allocation.createdAt})
    `);
  }

  async allocatedMinorUnitsForObligation(tenantId: string, obligationId: string) {
    const rows = await this.tx.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COALESCE(sum(amount_minor),0)::bigint AS total
      FROM exec008_payment_allocations
      WHERE tenant_id = ${tenantId}::uuid AND obligation_id = ${obligationId}::uuid
    `);
    return Number(rows[0]?.total ?? BigInt(0));
  }

  async findRefund(tenantId: string, refundId: string) {
    const rows = await this.tx.$queryRaw<SqlRow[]>(Prisma.sql`
      SELECT * FROM exec008_refunds WHERE tenant_id = ${tenantId}::uuid AND id = ${refundId}::uuid LIMIT 1
    `);
    return rows[0] ? refundFromRow(rows[0]) : null;
  }

  async insertRefund(refund: RefundRequest) {
    await this.tx.$executeRaw(Prisma.sql`
      INSERT INTO exec008_refunds (id, tenant_id, payment_id, currency, amount_minor, reason, initiated_by_user_id, approved_by_user_id, state, branch_id, department_id, team_id, resource_type, resource_id)
      VALUES (${refund.id}::uuid, ${refund.tenantId}::uuid, ${refund.paymentId}::uuid, ${refund.amount.currency}, ${refund.amount.minorUnits}, ${refund.reason}, ${refund.initiatedByUserId}::uuid, ${refund.approvedByUserId}::uuid, ${refund.state}, ${refund.scope.branchId}::uuid, ${refund.scope.departmentId}::uuid, ${refund.scope.teamId}::uuid, ${refund.scope.resourceType}, ${refund.scope.resourceId})
    `);
  }

  async markRefundApproved(input: { tenantId: string; refundId: string; approvedByUserId: string }) {
    const rows = await this.tx.$queryRaw<SqlRow[]>(Prisma.sql`
      UPDATE exec008_refunds
      SET state = 'APPROVED', approved_by_user_id = ${input.approvedByUserId}::uuid, approved_at = now()
      WHERE tenant_id = ${input.tenantId}::uuid AND id = ${input.refundId}::uuid AND state = 'REQUESTED'
      RETURNING *
    `);
    if (!rows[0]) throw new Error("Refund is not approvable.");
    return refundFromRow(rows[0]);
  }

  async refundedMinorUnitsForPayment(tenantId: string, paymentId: string) {
    const rows = await this.tx.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COALESCE(sum(amount_minor),0)::bigint AS total
      FROM exec008_refunds
      WHERE tenant_id = ${tenantId}::uuid AND payment_id = ${paymentId}::uuid AND state IN ('REQUESTED','APPROVED','EXECUTED')
    `);
    return Number(rows[0]?.total ?? BigInt(0));
  }
}

export class SqlContractFinanceRepository implements ContractFinanceRepository {
  async transaction<T>(work: (transaction: ContractFinanceTransaction) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => work(new SqlTransaction(tx)), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }
}
