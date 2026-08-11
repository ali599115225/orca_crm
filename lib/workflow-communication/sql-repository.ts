import "server-only";
import type { Prisma } from "@prisma/client";
import { rawPrisma } from "@/lib/prisma";
import type { OrganizationPermissionKey, OrganizationResourceScope } from "@/lib/organization/contracts";
import type {
  CommunicationChannel,
  CommunicationEvent,
  CommunicationThread,
  ConsentEvidence,
  ConsentState,
  WorkflowAttempt,
  WorkflowCommunicationRepository,
  WorkflowCommunicationTransaction,
  WorkflowDefinitionVersion,
  WorkflowEscalation,
  WorkflowRun,
  WorkflowRunState,
} from "./contracts";

type SqlClient = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;

function date(value: Date | string | null): Date | null {
  return value === null ? null : value instanceof Date ? value : new Date(value);
}

function mapVersion(row: any): WorkflowDefinitionVersion {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workflowId: row.workflow_id,
    version: row.version,
    definitionHash: row.definition_hash,
    triggerEvent: row.trigger_event,
    actionsJson: row.actions_json,
    approvalRequired: row.approval_required,
    approvalPermission: (row.approval_permission ?? null) as OrganizationPermissionKey | null,
    resource: row.resource_scope as OrganizationResourceScope,
    createdBy: row.created_by,
    createdAt: date(row.created_at) as Date,
  };
}

function mapRun(row: any): WorkflowRun {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workflowVersionId: row.workflow_version_id,
    idempotencyKeyHash: row.idempotency_key_hash,
    payloadHash: row.payload_hash,
    state: row.state as WorkflowRunState,
    requestedByUserId: row.requested_by_user_id,
    approvedByUserId: row.approved_by_user_id,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    deadlineAt: date(row.deadline_at),
    nextAttemptAt: date(row.next_attempt_at),
    lastError: row.last_error,
    resultHash: row.result_hash,
    createdAt: date(row.created_at) as Date,
    updatedAt: date(row.updated_at) as Date,
  };
}

function mapThread(row: any): CommunicationThread {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    channel: row.channel as CommunicationChannel,
    identityHash: row.identity_hash,
    identityState: row.identity_state,
    partyId: row.party_id,
    retentionPolicyKey: row.retention_policy_key,
    retentionUntil: date(row.retention_until),
    legalHold: row.legal_hold,
  };
}

function mapEvent(row: any): CommunicationEvent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    threadId: row.thread_id,
    channel: row.channel as CommunicationChannel,
    providerIdentity: row.provider_identity,
    providerIdentityHash: row.provider_identity_hash,
    direction: row.direction,
    purpose: row.purpose,
    contentHash: row.content_hash,
    occurredAt: date(row.occurred_at) as Date,
  };
}

function mapConsent(row: any): ConsentEvidence {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    threadId: row.thread_id,
    purpose: row.purpose,
    state: row.state as ConsentState,
    source: row.source,
    actorUserId: row.actor_user_id,
    effectiveAt: date(row.effective_at) as Date,
  };
}

class SqlTx implements WorkflowCommunicationTransaction {
  constructor(private readonly db: SqlClient) {}

  async findLatestWorkflowVersion(tenantId: string, workflowId: string) {
    const rows = await this.db.$queryRaw<any[]>`
      SELECT * FROM exec009_workflow_versions
      WHERE tenant_id = ${tenantId}::uuid AND workflow_id = ${workflowId}::uuid
      ORDER BY version DESC LIMIT 1`;
    return rows[0] ? mapVersion(rows[0]) : null;
  }

  async insertWorkflowVersion(value: WorkflowDefinitionVersion) {
    await this.db.$executeRaw`
      INSERT INTO exec009_workflow_versions
      (id, tenant_id, workflow_id, version, definition_hash, trigger_event, actions_json,
       approval_required, approval_permission, resource_scope, created_by, created_at)
      VALUES (${value.id}::uuid, ${value.tenantId}::uuid, ${value.workflowId}::uuid, ${value.version},
       ${value.definitionHash}, ${value.triggerEvent}, ${value.actionsJson}, ${value.approvalRequired},
       ${value.approvalPermission}, ${JSON.stringify(value.resource)}::jsonb, ${value.createdBy}::uuid, ${value.createdAt})`;
  }

  async findWorkflowVersion(tenantId: string, versionId: string) {
    const rows = await this.db.$queryRaw<any[]>`
      SELECT * FROM exec009_workflow_versions
      WHERE tenant_id = ${tenantId}::uuid AND id = ${versionId}::uuid LIMIT 1`;
    return rows[0] ? mapVersion(rows[0]) : null;
  }

  async findRun(tenantId: string, runId: string) {
    const rows = await this.db.$queryRaw<any[]>`
      SELECT * FROM exec009_workflow_runs
      WHERE tenant_id = ${tenantId}::uuid AND id = ${runId}::uuid LIMIT 1 FOR UPDATE`;
    return rows[0] ? mapRun(rows[0]) : null;
  }

  async findRunByKey(tenantId: string, keyHash: string) {
    const rows = await this.db.$queryRaw<any[]>`
      SELECT * FROM exec009_workflow_runs
      WHERE tenant_id = ${tenantId}::uuid AND idempotency_key_hash = ${keyHash} LIMIT 1 FOR UPDATE`;
    return rows[0] ? mapRun(rows[0]) : null;
  }

  async insertRun(value: WorkflowRun) {
    await this.db.$executeRaw`
      INSERT INTO exec009_workflow_runs
      (id, tenant_id, workflow_version_id, idempotency_key_hash, payload_hash, state,
       requested_by_user_id, approved_by_user_id, attempt_count, max_attempts, deadline_at,
       next_attempt_at, last_error, result_hash, created_at, updated_at)
      VALUES (${value.id}::uuid, ${value.tenantId}::uuid, ${value.workflowVersionId}::uuid,
       ${value.idempotencyKeyHash}, ${value.payloadHash}, ${value.state}, ${value.requestedByUserId}::uuid,
       ${value.approvedByUserId}::uuid, ${value.attemptCount}, ${value.maxAttempts}, ${value.deadlineAt},
       ${value.nextAttemptAt}, ${value.lastError}, ${value.resultHash}, ${value.createdAt}, ${value.updatedAt})`;
  }

  async updateRun(value: WorkflowRun) {
    await this.db.$executeRaw`
      UPDATE exec009_workflow_runs SET
        state = ${value.state}, approved_by_user_id = ${value.approvedByUserId}::uuid,
        attempt_count = ${value.attemptCount}, max_attempts = ${value.maxAttempts},
        deadline_at = ${value.deadlineAt}, next_attempt_at = ${value.nextAttemptAt},
        last_error = ${value.lastError}, result_hash = ${value.resultHash}, updated_at = ${value.updatedAt}
      WHERE tenant_id = ${value.tenantId}::uuid AND id = ${value.id}::uuid`;
  }

  async insertAttempt(value: WorkflowAttempt) {
    await this.db.$executeRaw`
      INSERT INTO exec009_workflow_attempts
      (id, tenant_id, run_id, attempt_number, outcome, error_code, created_at)
      VALUES (${value.id}::uuid, ${value.tenantId}::uuid, ${value.runId}::uuid, ${value.attemptNumber},
       ${value.outcome}, ${value.errorCode}, ${value.createdAt})`;
  }

  async insertEscalation(value: WorkflowEscalation) {
    await this.db.$executeRaw`
      INSERT INTO exec009_workflow_escalations
      (id, tenant_id, run_id, reason, state, created_at)
      VALUES (${value.id}::uuid, ${value.tenantId}::uuid, ${value.runId}::uuid, ${value.reason}, ${value.state}, ${value.createdAt})`;
  }

  async findThread(tenantId: string, channel: CommunicationChannel, identityHash: string) {
    const rows = await this.db.$queryRaw<any[]>`
      SELECT * FROM exec009_communication_threads
      WHERE tenant_id = ${tenantId}::uuid AND channel = ${channel} AND identity_hash = ${identityHash} LIMIT 1 FOR UPDATE`;
    return rows[0] ? mapThread(rows[0]) : null;
  }

  async findThreadById(tenantId: string, threadId: string) {
    const rows = await this.db.$queryRaw<any[]>`
      SELECT * FROM exec009_communication_threads
      WHERE tenant_id = ${tenantId}::uuid AND id = ${threadId}::uuid LIMIT 1 FOR UPDATE`;
    return rows[0] ? mapThread(rows[0]) : null;
  }

  async insertThread(value: CommunicationThread) {
    await this.db.$executeRaw`
      INSERT INTO exec009_communication_threads
      (id, tenant_id, channel, identity_hash, identity_state, party_id, retention_policy_key, retention_until, legal_hold)
      VALUES (${value.id}::uuid, ${value.tenantId}::uuid, ${value.channel}, ${value.identityHash}, ${value.identityState},
       ${value.partyId}::uuid, ${value.retentionPolicyKey}, ${value.retentionUntil}, ${value.legalHold})`;
  }

  async updateThread(value: CommunicationThread) {
    await this.db.$executeRaw`
      UPDATE exec009_communication_threads SET
        identity_state = ${value.identityState}, party_id = ${value.partyId}::uuid,
        retention_policy_key = ${value.retentionPolicyKey}, retention_until = ${value.retentionUntil},
        legal_hold = ${value.legalHold}, updated_at = now()
      WHERE tenant_id = ${value.tenantId}::uuid AND id = ${value.id}::uuid`;
  }

  async findCommunicationEventByProviderHash(tenantId: string, channel: CommunicationChannel, providerIdentityHash: string) {
    const rows = await this.db.$queryRaw<any[]>`
      SELECT * FROM exec009_communication_events
      WHERE tenant_id = ${tenantId}::uuid AND channel = ${channel}
        AND provider_identity_hash = ${providerIdentityHash} LIMIT 1`;
    return rows[0] ? mapEvent(rows[0]) : null;
  }

  async insertCommunicationEvent(value: CommunicationEvent) {
    await this.db.$executeRaw`
      INSERT INTO exec009_communication_events
      (id, tenant_id, thread_id, channel, provider_identity, provider_identity_hash, direction, purpose, content_hash, occurred_at)
      VALUES (${value.id}::uuid, ${value.tenantId}::uuid, ${value.threadId}::uuid, ${value.channel},
       ${value.providerIdentity}, ${value.providerIdentityHash}, ${value.direction}, ${value.purpose}, ${value.contentHash}, ${value.occurredAt})`;
  }

  async latestConsent(tenantId: string, threadId: string, purpose: any) {
    const rows = await this.db.$queryRaw<any[]>`
      SELECT * FROM exec009_communication_consents
      WHERE tenant_id = ${tenantId}::uuid AND thread_id = ${threadId}::uuid AND purpose = ${purpose}
      ORDER BY effective_at DESC, created_at DESC LIMIT 1`;
    return rows[0] ? mapConsent(rows[0]) : null;
  }

  async insertConsent(value: ConsentEvidence) {
    await this.db.$executeRaw`
      INSERT INTO exec009_communication_consents
      (id, tenant_id, thread_id, purpose, state, source, actor_user_id, effective_at)
      VALUES (${value.id}::uuid, ${value.tenantId}::uuid, ${value.threadId}::uuid, ${value.purpose}, ${value.state},
       ${value.source}, ${value.actorUserId}::uuid, ${value.effectiveAt})`;
  }
}

export class SqlWorkflowCommunicationRepository implements WorkflowCommunicationRepository {
  async transaction<T>(work: (tx: WorkflowCommunicationTransaction) => Promise<T>): Promise<T> {
    return rawPrisma.$transaction(async (tx) => work(new SqlTx(tx)));
  }
}
