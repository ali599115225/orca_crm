import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  CommunicationEvent,
  CommunicationThread,
  ConsentEvidence,
  WorkflowActor,
  WorkflowAttempt,
  WorkflowCommunicationRepository,
  WorkflowCommunicationTransaction,
  WorkflowDefinitionVersion,
  WorkflowEscalation,
  WorkflowRun,
} from "@/lib/workflow-communication/contracts";
import {
  canExpireCommunicationContent,
  resolveThreadPartyIdentity,
} from "@/lib/workflow-communication/contracts";
import {
  communicationIdentityHash,
  normalizeCommunicationIdentity,
  WorkflowCommunicationService,
} from "@/lib/workflow-communication/service";

const tenantId = "11111111-1111-4111-8111-111111111111";
const tenantOther = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const requesterId = "22222222-2222-4222-8222-222222222222";
const approverId = "33333333-3333-4333-8333-333333333333";
const workflowId = "44444444-4444-4444-8444-444444444444";
const branchId = "55555555-5555-4555-8555-555555555555";
const now = new Date("2026-08-11T06:00:00.000Z");

function actor(userId = requesterId, overrides: Partial<WorkflowActor> = {}): WorkflowActor {
  return {
    tenantId,
    userId,
    assignments: [{
      id: userId === requesterId
        ? "66666666-6666-4666-8666-666666666666"
        : "77777777-7777-4777-8777-777777777777",
      tenantId,
      userId,
      securityRole: "GENERAL_MANAGER",
      scopeType: "COMPANY",
      active: true,
    }],
    now,
    ...overrides,
  };
}

class MemoryRepository implements WorkflowCommunicationRepository {
  versions: WorkflowDefinitionVersion[] = [];
  runs = new Map<string, WorkflowRun>();
  attempts: WorkflowAttempt[] = [];
  escalations: WorkflowEscalation[] = [];
  threads = new Map<string, CommunicationThread>();
  events: CommunicationEvent[] = [];
  consents: ConsentEvidence[] = [];

  async transaction<T>(work: (tx: WorkflowCommunicationTransaction) => Promise<T>): Promise<T> {
    const tx: WorkflowCommunicationTransaction = {
      findLatestWorkflowVersion: async (t, w) =>
        this.versions.filter((v) => v.tenantId === t && v.workflowId === w)
          .sort((a, b) => b.version - a.version)[0] ?? null,
      insertWorkflowVersion: async (value) => { this.versions.push(value); },
      findWorkflowVersion: async (t, id) =>
        this.versions.find((v) => v.tenantId === t && v.id === id) ?? null,
      findRun: async (t, id) => {
        const value = this.runs.get(id) ?? null;
        return value?.tenantId === t ? value : null;
      },
      findRunByKey: async (t, key) =>
        [...this.runs.values()].find((v) => v.tenantId === t && v.idempotencyKeyHash === key) ?? null,
      insertRun: async (value) => { this.runs.set(value.id, value); },
      updateRun: async (value) => { this.runs.set(value.id, value); },
      insertAttempt: async (value) => { this.attempts.push(value); },
      insertEscalation: async (value) => { this.escalations.push(value); },
      findThread: async (t, channel, identityHash) =>
        [...this.threads.values()].find(
          (v) => v.tenantId === t && v.channel === channel && v.identityHash === identityHash,
        ) ?? null,
      findThreadById: async (t, id) => {
        const value = this.threads.get(id) ?? null;
        return value?.tenantId === t ? value : null;
      },
      insertThread: async (value) => { this.threads.set(value.id, value); },
      updateThread: async (value) => { this.threads.set(value.id, value); },
      findCommunicationEventByProviderHash: async (t, channel, providerIdentityHash) =>
        this.events.find(
          (v) => v.tenantId === t && v.channel === channel && v.providerIdentityHash === providerIdentityHash,
        ) ?? null,
      insertCommunicationEvent: async (value) => { this.events.push(value); },
      latestConsent: async (t, threadId, purpose) =>
        this.consents.filter((v) => v.tenantId === t && v.threadId === threadId && v.purpose === purpose)
          .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime())[0] ?? null,
      insertConsent: async (value) => { this.consents.push(value); },
    };
    return work(tx);
  }
}

async function publish(
  service: WorkflowCommunicationService,
  input: Partial<Parameters<WorkflowCommunicationService["publishWorkflowVersion"]>[0]> = {},
) {
  return service.publishWorkflowVersion({
    actor: actor(),
    workflowId,
    triggerEvent: "lead.created",
    actions: [{ type: "notify" }],
    resource: { tenantId, resourceType: "AUTOMATION_WORKFLOW", resourceId: workflowId },
    ...input,
  });
}

async function inbound(
  service: WorkflowCommunicationService,
  input: Partial<Parameters<WorkflowCommunicationService["recordInboundCommunication"]>[0]> = {},
) {
  return service.recordInboundCommunication({
    tenantId,
    channel: "WHATSAPP",
    rawIdentity: "+966 50 123 4567",
    providerIdentity: "wamid.1",
    content: "hello",
    ...input,
  });
}

describe("EXEC-009 — durable workflow truth", () => {
  it("publishes immutable semantic versions and preserves prior versions", async () => {
    const repo = new MemoryRepository();
    const service = new WorkflowCommunicationService(repo);
    const v1 = await publish(service);
    const replay = await publish(service);
    const v2 = await publish(service, { actions: [{ type: "notify" }, { type: "task" }] });
    expect(v1.version).toBe(1);
    expect(replay.id).toBe(v1.id);
    expect(v2.version).toBe(2);
    expect(repo.versions).toHaveLength(2);
    expect(repo.versions[0]?.definitionHash).toBe(v1.definitionHash);
  });

  it("pins one exact version and makes trigger replay idempotent", async () => {
    const repo = new MemoryRepository();
    const service = new WorkflowCommunicationService(repo);
    const v1 = await publish(service);
    const first = await service.startWorkflowRun({
      actor: actor(), workflowVersionId: v1.id, idempotencyKey: "trigger-1", payload: { leadId: "L1" },
    });
    const replay = await service.startWorkflowRun({
      actor: actor(), workflowVersionId: v1.id, idempotencyKey: "trigger-1", payload: { leadId: "L1" },
    });
    await publish(service, { actions: [{ type: "changed" }] });
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.value.id).toBe(first.value.id);
    expect(first.value.workflowVersionId).toBe(v1.id);
    expect(repo.runs.size).toBe(1);
  });

  it("fails closed on conflicting idempotency reuse", async () => {
    const repo = new MemoryRepository();
    const service = new WorkflowCommunicationService(repo);
    const version = await publish(service);
    await service.startWorkflowRun({
      actor: actor(), workflowVersionId: version.id, idempotencyKey: "same-key", payload: { a: 1 },
    });
    await expect(service.startWorkflowRun({
      actor: actor(), workflowVersionId: version.id, idempotencyKey: "same-key", payload: { a: 2 },
    })).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
    expect(repo.runs.size).toBe(1);
  });

  it("never converts timeout to success", async () => {
    const repo = new MemoryRepository();
    const service = new WorkflowCommunicationService(repo);
    const version = await publish(service);
    const started = await service.startWorkflowRun({
      actor: actor(), workflowVersionId: version.id, idempotencyKey: "timeout", payload: {}, timeoutMs: 1000,
    });
    await expect(service.completeWorkflowRun({
      actor: actor(requesterId, { now: new Date(now.getTime() + 2000) }),
      runId: started.value.id,
      result: { ok: true },
    })).rejects.toThrow(/WORKFLOW_TIMEOUT_NOT_SUCCESS/);
  });

  it("uses bounded retry, no blind non-retriable retry, and explicit dead letter escalation", async () => {
    const repo = new MemoryRepository();
    const service = new WorkflowCommunicationService(repo);
    const version = await publish(service);
    const retriable = await service.startWorkflowRun({
      actor: actor(), workflowVersionId: version.id, idempotencyKey: "retry", payload: {}, maxAttempts: 2,
    });
    const r1 = await service.recordAttemptFailure({
      actor: actor(), runId: retriable.value.id, errorCode: "TEMP", retriable: true,
    });
    const r2 = await service.recordAttemptFailure({
      actor: actor(), runId: retriable.value.id, errorCode: "TEMP", retriable: true,
    });
    expect(r1.state).toBe("RETRY_WAIT");
    expect(r1.nextAttemptAt).not.toBeNull();
    expect(r2.state).toBe("DEAD_LETTER");
    expect(repo.attempts).toHaveLength(2);
    expect(repo.escalations).toHaveLength(1);

    const nonRetriable = await service.startWorkflowRun({
      actor: actor(), workflowVersionId: version.id, idempotencyKey: "no-retry", payload: {}, maxAttempts: 5,
    });
    const failed = await service.recordAttemptFailure({
      actor: actor(), runId: nonRetriable.value.id, errorCode: "INVALID", retriable: false,
    });
    expect(failed.state).toBe("FAILED");
    expect(failed.nextAttemptAt).toBeNull();
  });
});

describe("EXEC-009 — approval and escalation authority", () => {
  it("requires independent exact-scope approval, enabled service, and replays safely", async () => {
    const repo = new MemoryRepository();
    const service = new WorkflowCommunicationService(repo);
    const version = await publish(service, {
      approvalRequired: true,
      approvalPermission: "discount.approve",
      resource: { tenantId, branchId, resourceType: "AUTOMATION_WORKFLOW", resourceId: workflowId },
    });
    const run = await service.startWorkflowRun({
      actor: actor(), workflowVersionId: version.id, idempotencyKey: "approve", payload: {},
    });
    expect(run.value.state).toBe("WAITING_APPROVAL");
    await expect(service.approveWorkflowRun({ actor: actor(), runId: run.value.id }))
      .rejects.toThrow(/SELF_APPROVAL_DENIED/);

    const scopedApprover = actor(approverId, {
      assignments: [{
        id: "88888888-8888-4888-8888-888888888888",
        tenantId,
        userId: approverId,
        securityRole: "GENERAL_MANAGER",
        scopeType: "BRANCH",
        branchId,
        active: true,
      }],
      enabledBranchServices: [{ branchId, serviceLine: "SALES", enabled: true }],
    });
    const approved = await service.approveWorkflowRun({ actor: scopedApprover, runId: run.value.id });
    const replay = await service.approveWorkflowRun({ actor: scopedApprover, runId: run.value.id });
    expect(approved.state).toBe("PENDING");
    expect(approved.approvedByUserId).toBe(approverId);
    expect(replay).toEqual(approved);
  });

  it("fails closed for wrong tenant, wrong scope, expired, missing, or disabled-service authority", async () => {
    const repo = new MemoryRepository();
    const service = new WorkflowCommunicationService(repo);
    const version = await publish(service, {
      approvalRequired: true,
      approvalPermission: "discount.approve",
      resource: { tenantId, branchId, resourceType: "AUTOMATION_WORKFLOW", resourceId: workflowId },
    });
    const run = await service.startWorkflowRun({
      actor: actor(), workflowVersionId: version.id, idempotencyKey: "denials", payload: {},
    });

    await expect(service.approveWorkflowRun({
      actor: actor(approverId, { tenantId: tenantOther }), runId: run.value.id,
    })).rejects.toThrow(/WORKFLOW_RUN_NOT_FOUND/);

    await expect(service.approveWorkflowRun({
      actor: actor(approverId, {
        assignments: [{
          id: "99999999-9999-4999-8999-999999999999", tenantId, userId: approverId,
          securityRole: "GENERAL_MANAGER", scopeType: "BRANCH",
          branchId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa", active: true,
        }],
        enabledBranchServices: [{ branchId, serviceLine: "SALES", enabled: true }],
      }),
      runId: run.value.id,
    })).rejects.toThrow(/APPROVAL_AUTHORITY_DENIED/);

    await expect(service.approveWorkflowRun({
      actor: actor(approverId, {
        assignments: [{
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", tenantId, userId: approverId,
          securityRole: "GENERAL_MANAGER", scopeType: "COMPANY", active: true,
          endsAt: new Date(now.getTime() - 1),
        }],
        enabledBranchServices: [{ branchId, serviceLine: "SALES", enabled: true }],
      }),
      runId: run.value.id,
    })).rejects.toThrow(/APPROVAL_AUTHORITY_DENIED/);

    await expect(service.approveWorkflowRun({
      actor: actor(approverId, {
        assignments: [],
        enabledBranchServices: [{ branchId, serviceLine: "SALES", enabled: true }],
      }),
      runId: run.value.id,
    })).rejects.toThrow(/APPROVAL_AUTHORITY_DENIED/);

    await expect(service.approveWorkflowRun({
      actor: actor(approverId, {
        assignments: [{
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", tenantId, userId: approverId,
          securityRole: "GENERAL_MANAGER", scopeType: "BRANCH", branchId, active: true,
        }],
        enabledBranchServices: [],
      }),
      runId: run.value.id,
    })).rejects.toThrow(/SERVICE_DISABLED/);
  });
});

describe("EXEC-009 — communication identity and consent truth", () => {
  it("normalizes identity, keeps unknown sender unbound, deduplicates provider identity, and rejects conflicts", async () => {
    expect(normalizeCommunicationIdentity("WHATSAPP", "+966 50 123 4567")).toBe("966501234567");
    expect(normalizeCommunicationIdentity("EMAIL", " Test@Example.COM ")).toBe("test@example.com");
    const repo = new MemoryRepository();
    const service = new WorkflowCommunicationService(repo);
    const first = await inbound(service);
    const duplicate = await inbound(service);
    expect(first.thread).toMatchObject({ identityState: "UNKNOWN", partyId: null });
    expect(duplicate.duplicate).toBe(true);
    expect(repo.events).toHaveLength(1);
    await expect(inbound(service, { content: "conflicting body" }))
      .rejects.toThrow(/PROVIDER_IDENTITY_CONFLICT/);
  });

  it("fails closed on ambiguous sender binding and allows one verified party identity", () => {
    const thread: CommunicationThread = {
      id: "thread-1", tenantId, channel: "WHATSAPP", identityHash: "hash",
      identityState: "UNKNOWN", partyId: null, retentionPolicyKey: null,
      retentionUntil: null, legalHold: false,
    };
    expect(resolveThreadPartyIdentity(thread, [])).toMatchObject({ identityState: "UNKNOWN", partyId: null });
    expect(resolveThreadPartyIdentity(thread, ["party-a", "party-b"]))
      .toMatchObject({ identityState: "AMBIGUOUS", partyId: null });
    expect(resolveThreadPartyIdentity(thread, ["party-a"]))
      .toMatchObject({ identityState: "VERIFIED", partyId: "party-a" });
  });

  it("separates tenant/channel thread identity and stores explicit event semantics", async () => {
    expect(communicationIdentityHash(tenantId, "WHATSAPP", "+966501234567"))
      .not.toBe(communicationIdentityHash(tenantOther, "WHATSAPP", "+966501234567"));
    const repo = new MemoryRepository();
    const service = new WorkflowCommunicationService(repo);
    const result = await inbound(service, { purpose: "SERVICE", providerIdentity: "wamid.explicit" });
    expect(result.event).toMatchObject({
      tenantId, channel: "WHATSAPP", direction: "INBOUND",
      purpose: "SERVICE", providerIdentity: "wamid.explicit",
    });
  });

  it("requires marketing consent, preserves opt-out, and keeps operational purpose separate", async () => {
    const repo = new MemoryRepository();
    const service = new WorkflowCommunicationService(repo);
    const { thread } = await inbound(service);
    await expect(service.assertSendAllowed({ tenantId, threadId: thread.id, purpose: "MARKETING" }))
      .rejects.toThrow(/MARKETING_CONSENT_REQUIRED/);
    await expect(service.assertSendAllowed({ tenantId, threadId: thread.id, purpose: "OPERATIONAL" }))
      .resolves.toBeUndefined();

    const consent = await service.appendConsent({
      tenantId, threadId: thread.id, purpose: "MARKETING", state: "OPTED_IN", source: "MANUAL",
    });
    await expect(service.assertSendAllowed({ tenantId, threadId: thread.id, purpose: "MARKETING" }))
      .resolves.toBeUndefined();
    const optedOut = await service.appendConsent({
      tenantId, threadId: thread.id, purpose: "MARKETING", state: "OPTED_OUT", source: "WEBHOOK",
      effectiveAt: new Date(now.getTime() + 1000),
    });
    const replay = await service.appendConsent({
      tenantId, threadId: thread.id, purpose: "MARKETING", state: "OPTED_OUT", source: "WEBHOOK",
      effectiveAt: new Date(now.getTime() + 2000),
    });
    expect(replay.id).toBe(optedOut.id);
    expect(repo.consents.map((entry) => entry.id)).toContain(consent.id);
    expect(repo.consents).toHaveLength(2);
    await expect(service.assertSendAllowed({ tenantId, threadId: thread.id, purpose: "MARKETING" }))
      .rejects.toThrow(/MARKETING_CONSENT_REQUIRED/);
    await expect(service.appendConsent({
      tenantId, threadId: thread.id, purpose: "MARKETING", state: "OPTED_IN", source: "SILENT",
      effectiveAt: new Date(now.getTime() + 3000),
    })).rejects.toThrow(/OPT_OUT_CANNOT_BE_SILENTLY_REENABLED/);
  });

  it("uses configurable retention and legal hold without deleting audit identity", async () => {
    const repo = new MemoryRepository();
    const service = new WorkflowCommunicationService(repo);
    const { thread, event } = await inbound(service);
    const expired = await service.setRetention({
      tenantId, threadId: thread.id, retentionPolicyKey: "POLICY_MESSAGE_CONTENT",
      retentionUntil: new Date(now.getTime() - 1000),
    });
    expect(canExpireCommunicationContent(expired, now)).toBe(true);
    const held = await service.setRetention({
      tenantId, threadId: thread.id, retentionPolicyKey: "POLICY_MESSAGE_CONTENT",
      retentionUntil: new Date(now.getTime() - 1000), legalHold: true,
    });
    expect(canExpireCommunicationContent(held, now)).toBe(false);
    expect(repo.events.find((entry) => entry.id === event.id)?.providerIdentityHash)
      .toBe(event.providerIdentityHash);
    await expect(service.setRetention({
      tenantId: tenantOther, threadId: thread.id, retentionPolicyKey: "X", retentionUntil: null,
    })).rejects.toThrow(/COMMUNICATION_THREAD_NOT_FOUND/);
  });
});

describe("EXEC-009 — sealed boundary regressions", () => {
  it("consumes EXEC-004 authority, preserves EXEC-003 workflow mutation boundary, and keeps provider activation outside the package", () => {
    const serviceSource = readFileSync(join(process.cwd(), "lib/workflow-communication/service.ts"), "utf8");
    const sendSource = readFileSync(join(process.cwd(), "lib/whatsapp/send-service.ts"), "utf8");
    const webhookSource = readFileSync(join(process.cwd(), "app/api/whatsapp/webhook/route.ts"), "utf8");
    const workflowRoute = readFileSync(join(process.cwd(), "app/api/v1/automation/workflows/route.ts"), "utf8");
    expect(serviceSource).toContain("evaluateOrganizationAuthority");
    expect(serviceSource).not.toMatch(/PLATFORM_OWNER|SYSTEM_ADMINISTRATOR/);
    expect(sendSource).toContain("WHATSAPP_OPTED_OUT");
    expect(sendSource).toContain('status: "pending"');
    expect(webhookSource).toContain("metaMessageId");
    expect(webhookSource).toContain("dedupeKey");
    expect(workflowRoute).toContain("runWithExec003CookiePermission");
    expect(workflowRoute).toContain("automationWorkflow.create");
    expect(workflowRoute).not.toContain("WorkflowCommunicationService");
  });

  it("does not overwrite upstream EXEC-005/006/007/008 truth", () => {
    const sources = [
      readFileSync(join(process.cwd(), "lib/workflow-communication/service.ts"), "utf8"),
      readFileSync(join(process.cwd(), "lib/workflow-communication/sql-repository.ts"), "utf8"),
    ].join("\n");
    expect(sources).not.toMatch(/UPDATE\s+(parties|unit_commitments|offers|exec008_contract_versions|exec008_financial_obligations)/i);
    expect(sources).not.toMatch(/DELETE\s+FROM\s+(parties|unit_commitments|offers|exec008_)/i);
  });
});
