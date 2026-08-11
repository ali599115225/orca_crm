import { createHash, randomUUID } from "node:crypto";
import { evaluateOrganizationAuthority } from "@/lib/organization/authority";
import type { OrganizationPermissionKey, OrganizationResourceScope } from "@/lib/organization/contracts";
import type {
  CommunicationChannel,
  CommunicationEvent,
  CommunicationPurpose,
  CommunicationThread,
  ConsentEvidence,
  ConsentState,
  WorkflowActor,
  WorkflowCommunicationRepository,
  WorkflowDefinitionVersion,
  WorkflowEscalation,
  WorkflowRun,
} from "./contracts";

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function normalizeCommunicationIdentity(channel: CommunicationChannel, raw: string): string {
  const input = String(raw ?? "").trim();
  if (channel === "EMAIL") {
    const normalized = input.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error("INVALID_COMMUNICATION_IDENTITY");
    }
    return normalized;
  }
  let digits = input.replace(/\D/g, "");
  while (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length < 10 || digits.length > 15) {
    throw new Error("INVALID_COMMUNICATION_IDENTITY");
  }
  return digits;
}

export function communicationIdentityHash(
  tenantId: string,
  channel: CommunicationChannel,
  raw: string,
): string {
  return hash(`${tenantId}:${channel}:${normalizeCommunicationIdentity(channel, raw)}`);
}

export class WorkflowCommunicationService {
  constructor(private readonly repository: WorkflowCommunicationRepository) {}

  async publishWorkflowVersion(input: {
    actor: WorkflowActor;
    workflowId: string;
    triggerEvent: string;
    actions: unknown;
    approvalRequired?: boolean;
    approvalPermission?: OrganizationPermissionKey | null;
    resource: OrganizationResourceScope;
  }): Promise<WorkflowDefinitionVersion> {
    if (input.resource.tenantId !== input.actor.tenantId) {
      throw new Error("TENANT_SCOPE_MISMATCH");
    }
    const actionsJson = stable(input.actions);
    const definitionHash = hash(stable({
      triggerEvent: input.triggerEvent,
      actions: input.actions,
      approvalRequired: Boolean(input.approvalRequired),
      approvalPermission: input.approvalPermission ?? null,
      resource: input.resource,
    }));
    return this.repository.transaction(async (tx) => {
      const latest = await tx.findLatestWorkflowVersion(input.actor.tenantId, input.workflowId);
      if (latest?.definitionHash === definitionHash) return latest;
      const value: WorkflowDefinitionVersion = {
        id: randomUUID(),
        tenantId: input.actor.tenantId,
        workflowId: input.workflowId,
        version: (latest?.version ?? 0) + 1,
        definitionHash,
        triggerEvent: input.triggerEvent,
        actionsJson,
        approvalRequired: Boolean(input.approvalRequired),
        approvalPermission: input.approvalPermission ?? null,
        resource: input.resource,
        createdBy: input.actor.userId,
        createdAt: input.actor.now ?? new Date(),
      };
      await tx.insertWorkflowVersion(value);
      return value;
    });
  }

  async startWorkflowRun(input: {
    actor: WorkflowActor;
    workflowVersionId: string;
    idempotencyKey: string;
    payload: unknown;
    maxAttempts?: number;
    timeoutMs?: number | null;
  }): Promise<{ value: WorkflowRun; replayed: boolean }> {
    const maxAttempts = input.maxAttempts ?? 3;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
      throw new Error("INVALID_MAX_ATTEMPTS");
    }
    const keyHash = hash(`${input.actor.tenantId}:${input.idempotencyKey}`);
    const payloadHash = hash(stable({ version: input.workflowVersionId, payload: input.payload }));
    return this.repository.transaction(async (tx) => {
      const existing = await tx.findRunByKey(input.actor.tenantId, keyHash);
      if (existing) {
        if (existing.payloadHash !== payloadHash) throw new Error("IDEMPOTENCY_CONFLICT");
        return { value: existing, replayed: true };
      }
      const version = await tx.findWorkflowVersion(input.actor.tenantId, input.workflowVersionId);
      if (!version) throw new Error("WORKFLOW_VERSION_NOT_FOUND");
      const now = input.actor.now ?? new Date();
      const value: WorkflowRun = {
        id: randomUUID(),
        tenantId: input.actor.tenantId,
        workflowVersionId: version.id,
        idempotencyKeyHash: keyHash,
        payloadHash,
        state: version.approvalRequired ? "WAITING_APPROVAL" : "PENDING",
        requestedByUserId: input.actor.userId,
        approvedByUserId: null,
        attemptCount: 0,
        maxAttempts,
        deadlineAt:
          input.timeoutMs && input.timeoutMs > 0
            ? new Date(now.getTime() + input.timeoutMs)
            : null,
        nextAttemptAt: null,
        lastError: null,
        resultHash: null,
        createdAt: now,
        updatedAt: now,
      };
      await tx.insertRun(value);
      return { value, replayed: false };
    });
  }

  async approveWorkflowRun(input: {
    actor: WorkflowActor;
    runId: string;
  }): Promise<WorkflowRun> {
    return this.repository.transaction(async (tx) => {
      const run = await tx.findRun(input.actor.tenantId, input.runId);
      if (!run) throw new Error("WORKFLOW_RUN_NOT_FOUND");
      if (run.state !== "WAITING_APPROVAL") {
        if (run.approvedByUserId === input.actor.userId) return run;
        throw new Error("RUN_NOT_WAITING_APPROVAL");
      }
      if (!run.requestedByUserId || run.requestedByUserId === input.actor.userId) {
        throw new Error("SELF_APPROVAL_DENIED");
      }
      const version = await tx.findWorkflowVersion(input.actor.tenantId, run.workflowVersionId);
      if (!version || !version.approvalRequired || !version.approvalPermission) {
        throw new Error("APPROVAL_EVIDENCE_MISSING");
      }
      const decision = evaluateOrganizationAuthority({
        actorTenantId: input.actor.tenantId,
        actorUserId: input.actor.userId,
        permission: version.approvalPermission,
        resource: version.resource,
        assignments: input.actor.assignments,
        enabledBranchServices: input.actor.enabledBranchServices,
        initiatedByUserId: run.requestedByUserId,
        now: input.actor.now,
      });
      if (!decision.allowed) throw new Error(`APPROVAL_AUTHORITY_DENIED:${decision.code}`);
      const now = input.actor.now ?? new Date();
      const next = { ...run, state: "PENDING" as const, approvedByUserId: input.actor.userId, updatedAt: now };
      await tx.updateRun(next);
      return next;
    });
  }

  async recordAttemptFailure(input: {
    actor: WorkflowActor;
    runId: string;
    errorCode: string;
    retriable: boolean;
    timedOut?: boolean;
  }): Promise<WorkflowRun> {
    return this.repository.transaction(async (tx) => {
      const run = await tx.findRun(input.actor.tenantId, input.runId);
      if (!run) throw new Error("WORKFLOW_RUN_NOT_FOUND");
      if (["COMPLETED", "FAILED", "DEAD_LETTER", "CANCELLED"].includes(run.state)) return run;
      const now = input.actor.now ?? new Date();
      const attemptNumber = run.attemptCount + 1;
      await tx.insertAttempt({
        id: randomUUID(), tenantId: run.tenantId, runId: run.id, attemptNumber,
        outcome: input.timedOut ? "TIMED_OUT" : "FAILED", errorCode: input.errorCode, createdAt: now,
      });
      const exhausted = attemptNumber >= run.maxAttempts;
      const terminal = !input.retriable || exhausted;
      const state = terminal ? (exhausted && input.retriable ? "DEAD_LETTER" : "FAILED") : "RETRY_WAIT";
      const delaySeconds = Math.min(3600, 60 * Math.pow(2, Math.max(0, attemptNumber - 1)));
      const next: WorkflowRun = {
        ...run,
        state,
        attemptCount: attemptNumber,
        nextAttemptAt: terminal ? null : new Date(now.getTime() + delaySeconds * 1000),
        lastError: input.errorCode,
        updatedAt: now,
      };
      await tx.updateRun(next);
      if (state === "DEAD_LETTER") {
        const escalation: WorkflowEscalation = {
          id: randomUUID(), tenantId: run.tenantId, runId: run.id,
          reason: input.errorCode, state: "OPEN", createdAt: now,
        };
        await tx.insertEscalation(escalation);
      }
      return next;
    });
  }

  async completeWorkflowRun(input: {
    actor: WorkflowActor;
    runId: string;
    result: unknown;
  }): Promise<WorkflowRun> {
    return this.repository.transaction(async (tx) => {
      const run = await tx.findRun(input.actor.tenantId, input.runId);
      if (!run) throw new Error("WORKFLOW_RUN_NOT_FOUND");
      const now = input.actor.now ?? new Date();
      if (run.deadlineAt && now > run.deadlineAt) throw new Error("WORKFLOW_TIMEOUT_NOT_SUCCESS");
      if (run.state === "COMPLETED") return run;
      if (!["PENDING", "RUNNING", "RETRY_WAIT"].includes(run.state)) throw new Error("WORKFLOW_RUN_NOT_COMPLETABLE");
      const next: WorkflowRun = {
        ...run,
        state: "COMPLETED",
        resultHash: hash(stable(input.result)),
        nextAttemptAt: null,
        lastError: null,
        updatedAt: now,
      };
      await tx.updateRun(next);
      await tx.insertAttempt({
        id: randomUUID(), tenantId: run.tenantId, runId: run.id,
        attemptNumber: Math.max(1, run.attemptCount + 1), outcome: "COMPLETED", errorCode: null, createdAt: now,
      });
      return next;
    });
  }

  async recordInboundCommunication(input: {
    tenantId: string;
    channel: CommunicationChannel;
    rawIdentity: string;
    providerIdentity: string;
    content: string;
    purpose?: CommunicationPurpose;
    occurredAt?: Date;
  }): Promise<{ thread: CommunicationThread; event: CommunicationEvent; duplicate: boolean }> {
    const identityHash = communicationIdentityHash(input.tenantId, input.channel, input.rawIdentity);
    const providerIdentity = String(input.providerIdentity ?? "").trim();
    if (!providerIdentity) throw new Error("PROVIDER_IDENTITY_REQUIRED");
    const providerIdentityHash = hash(`${input.tenantId}:${input.channel}:${providerIdentity}`);
    const contentHash = hash(String(input.content ?? ""));
    return this.repository.transaction(async (tx) => {
      let thread = await tx.findThread(input.tenantId, input.channel, identityHash);
      if (!thread) {
        thread = {
          id: randomUUID(), tenantId: input.tenantId, channel: input.channel,
          identityHash, identityState: "UNKNOWN", partyId: null,
          retentionPolicyKey: null, retentionUntil: null, legalHold: false,
        };
        await tx.insertThread(thread);
      }
      const existing = await tx.findCommunicationEventByProviderHash(input.tenantId, input.channel, providerIdentityHash);
      if (existing) {
        if (existing.threadId !== thread.id || existing.contentHash !== contentHash) {
          throw new Error("PROVIDER_IDENTITY_CONFLICT");
        }
        return { thread, event: existing, duplicate: true };
      }
      const event: CommunicationEvent = {
        id: randomUUID(), tenantId: input.tenantId, threadId: thread.id, channel: input.channel,
        providerIdentity, providerIdentityHash, direction: "INBOUND",
        purpose: input.purpose ?? "OPERATIONAL", contentHash,
        occurredAt: input.occurredAt ?? new Date(),
      };
      await tx.insertCommunicationEvent(event);
      return { thread, event, duplicate: false };
    });
  }

  async appendConsent(input: {
    tenantId: string;
    threadId: string;
    purpose: CommunicationPurpose;
    state: ConsentState;
    source: string;
    actorUserId?: string | null;
    effectiveAt?: Date;
  }): Promise<ConsentEvidence> {
    return this.repository.transaction(async (tx) => {
      const thread = await tx.findThreadById(input.tenantId, input.threadId);
      if (!thread) throw new Error("COMMUNICATION_THREAD_NOT_FOUND");
      const previous = await tx.latestConsent(input.tenantId, input.threadId, input.purpose);
      if (previous?.state === "OPTED_OUT" && input.state === "OPTED_IN") {
        throw new Error("OPT_OUT_CANNOT_BE_SILENTLY_REENABLED");
      }
      if (previous?.state === input.state) return previous;
      const evidence: ConsentEvidence = {
        id: randomUUID(), tenantId: input.tenantId, threadId: input.threadId,
        purpose: input.purpose, state: input.state, source: input.source,
        actorUserId: input.actorUserId ?? null, effectiveAt: input.effectiveAt ?? new Date(),
      };
      await tx.insertConsent(evidence);
      return evidence;
    });
  }

  async assertSendAllowed(input: {
    tenantId: string;
    threadId: string;
    purpose: CommunicationPurpose;
  }): Promise<void> {
    await this.repository.transaction(async (tx) => {
      const thread = await tx.findThreadById(input.tenantId, input.threadId);
      if (!thread) throw new Error("COMMUNICATION_THREAD_NOT_FOUND");
      if (input.purpose !== "MARKETING") return;
      const consent = await tx.latestConsent(input.tenantId, input.threadId, "MARKETING");
      if (!consent || consent.state !== "OPTED_IN") throw new Error("MARKETING_CONSENT_REQUIRED");
    });
  }

  async setRetention(input: {
    tenantId: string;
    threadId: string;
    retentionPolicyKey: string;
    retentionUntil: Date | null;
    legalHold?: boolean;
  }): Promise<CommunicationThread> {
    return this.repository.transaction(async (tx) => {
      const thread = await tx.findThreadById(input.tenantId, input.threadId);
      if (!thread) throw new Error("COMMUNICATION_THREAD_NOT_FOUND");
      if (!input.retentionPolicyKey.trim()) throw new Error("RETENTION_POLICY_REQUIRED");
      const next = {
        ...thread,
        retentionPolicyKey: input.retentionPolicyKey.trim(),
        retentionUntil: input.retentionUntil,
        legalHold: input.legalHold ?? thread.legalHold,
      };
      await tx.updateThread(next);
      return next;
    });
  }
}
