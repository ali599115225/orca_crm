import { beforeEach, describe, expect, it, vi } from "vitest";

function createStore() {
  const suggestions: any[] = [];
  const events: any[] = [];
  const audits: any[] = [];
  const outbox: any[] = [];
  const leads: any[] = [];
  const opportunities: any[] = [];
  const units: any[] = [];
  const contacts: any[] = [];
  const nextActions: any[] = [];
  const tasks: any[] = [];
  let idCounter = 0;

  function nextId() {
    idCounter += 1;
    return `id-${idCounter}`;
  }

  function makeTx() {
    return {
      revenueActionSuggestion: {
        findFirst: async ({ where }: any) => {
          return suggestions.find((s) => {
            if (where.id && s.id !== where.id) return false;
            if (where.tenantId && s.tenantId !== where.tenantId) return false;
            if (where.status) {
              if (typeof where.status === "object" && where.status.in) {
                if (!where.status.in.includes(s.status)) return false;
              } else if (s.status !== where.status) return false;
            }
            if (where.sourceType && s.sourceType !== where.sourceType) return false;
            if (where.sourceId && s.sourceId !== where.sourceId) return false;
            if (where.sourceTextHash && s.sourceTextHash !== where.sourceTextHash) return false;
            return true;
          }) || null;
        },
        create: async ({ data }: any) => {
          const record = { id: nextId(), status: "PENDING_APPROVAL", createdAt: new Date(), updatedAt: new Date(), ...data };
          suggestions.push(record);
          return { ...record };
        },
        update: async ({ where, data }: any) => {
          const record = suggestions.find((s) => s.id === where.id);
          if (!record) throw new Error("NOT_FOUND");
          Object.assign(record, data, { updatedAt: new Date() });
          return { ...record };
        },
      },
      revenueDomainEvent: {
        findFirst: async ({ where }: any) => {
          return events.find((e) => {
            if (where.tenantId && e.tenantId !== where.tenantId) return false;
            if (where.idempotencyKey && e.idempotencyKey !== where.idempotencyKey) return false;
            return true;
          }) || null;
        },
        create: async ({ data }: any) => {
          const record = { id: nextId(), occurredAt: new Date(), createdAt: new Date(), ...data };
          events.push(record);
          return { ...record };
        },
      },
      revenueAuditEntry: {
        create: async ({ data }: any) => {
          const record = { id: nextId(), createdAt: new Date(), ...data };
          audits.push(record);
          return { ...record };
        },
      },
      revenueOutboxMessage: {
        create: async ({ data }: any) => {
          const record = { id: nextId(), status: "PENDING", attempts: 0, nextAttemptAt: new Date(), createdAt: new Date(), updatedAt: new Date(), ...data };
          outbox.push(record);
          return { ...record };
        },
      },
      revenueNextAction: {
        create: async ({ data }: any) => {
          const record = { id: nextId(), status: "OPEN", createdAt: new Date(), updatedAt: new Date(), ...data };
          nextActions.push(record);
          return { ...record };
        },
      },
      lead: {
        findFirst: async ({ where }: any) => {
          return leads.find((l) => {
            if (where.id && l.id !== where.id) return false;
            if (where.tenantId && l.tenantId !== where.tenantId) return false;
            return true;
          }) || null;
        },
      },
      opportunity: {
        findFirst: async ({ where }: any) => {
          return opportunities.find((o) => {
            if (where.id && o.id !== where.id) return false;
            if (where.tenantId && o.tenantId !== where.tenantId) return false;
            return true;
          }) || null;
        },
      },
      unit: {
        findFirst: async ({ where }: any) => {
          return units.find((u) => {
            if (where.id && u.id !== where.id) return false;
            if (where.tenantId && u.tenantId !== where.tenantId) return false;
            return true;
          }) || null;
        },
      },
      contact: {
        findFirst: async ({ where }: any) => {
          return contacts.find((c) => {
            if (where.id && c.id !== where.id) return false;
            if (where.tenantId && c.tenantId !== where.tenantId) return false;
            return true;
          }) || null;
        },
      },
      task: {
        create: async ({ data }: any) => {
          const record = { id: nextId(), createdAt: new Date(), ...data };
          tasks.push(record);
          return { ...record };
        },
      },
    };
  }

  const txProxy = makeTx();

  const prismaMock = {
    ...makeTx(),
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(txProxy),
  };

  return { prismaMock, suggestions, events, audits, outbox, leads, opportunities, units, contacts, nextActions, tasks };
}

let store: ReturnType<typeof createStore>;

vi.mock("@/lib/prisma", () => ({
  get rawPrisma() {
    return store.prismaMock;
  },
}));

vi.mock("@/lib/domain/transaction-spine", () => ({
  createOffer: vi.fn(),
  scheduleTour: vi.fn(),
}));

import {
  analyzeConversationToAction,
  approveActionSuggestion,
  executeActionSuggestion,
  rejectActionSuggestion,
} from "@/lib/revenue-integrity/conversation-to-action";
import { scheduleTour } from "@/lib/domain/transaction-spine";

const scheduleTourMock = vi.mocked(scheduleTour);

const TENANT_A = "00000000-0000-0000-0000-000000000001";
const TENANT_B = "00000000-0000-0000-0000-000000000002";
const ACTOR = "00000000-0000-0000-0000-000000000099";

let srcCounter = 0;

async function createSuggestion(overrides: Record<string, any> = {}) {
  srcCounter += 1;
  return analyzeConversationToAction({
    tenantId: TENANT_A,
    actorId: ACTOR,
    sourceType: "MANUAL",
    sourceId: `src-${srcCounter}`,
    text: "أرغب بزيارة فيلا في الرياض غدًا الساعة 17:00",
    ...overrides,
  });
}

describe("Conversation-to-Action", () => {
  beforeEach(() => {
    store = createStore();
    srcCounter = 0;
    scheduleTourMock.mockReset();
    scheduleTourMock.mockImplementation(async (input: any) => ({
      id: `tour-${Date.now()}`,
      ...input,
    }));
  });

  it("1. same-tenant approval succeeds", async () => {
    const suggestion = await createSuggestion();
    const approved = await approveActionSuggestion(TENANT_A, ACTOR, suggestion.id);
    expect(approved.status).toBe("APPROVED");
    expect(approved.tenantId).toBe(TENANT_A);
  });

  it("2. cross-tenant approval is rejected", async () => {
    const suggestion = await createSuggestion();
    await expect(
      approveActionSuggestion(TENANT_B, ACTOR, suggestion.id),
    ).rejects.toThrow("SUGGESTION_NOT_FOUND");
  });

  it("3. pending rejection succeeds", async () => {
    const suggestion = await createSuggestion();
    const rejected = await rejectActionSuggestion(TENANT_A, ACTOR, suggestion.id, "Not relevant");
    expect(rejected.status).toBe("REJECTED");
  });

  it("4. execution before approval is rejected", async () => {
    const suggestion = await createSuggestion();
    await expect(
      executeActionSuggestion(TENANT_A, ACTOR, suggestion.id),
    ).rejects.toThrow("CANNOT_EXECUTE_NOT_APPROVED");
    const fresh = store.suggestions.find((s) => s.id === suggestion.id);
    expect(fresh!.status).toBe("PENDING_APPROVAL");
  });

  it("5. approval followed by real supported execution succeeds", async () => {
    const leadId = "lead-1";
    store.leads.push({ id: leadId, tenantId: TENANT_A, assignedTo: ACTOR });

    const suggestion = await createSuggestion({
      text: "أرغب بزيارة فيلا في الرياض",
      leadId,
    });

    const approved = await approveActionSuggestion(TENANT_A, ACTOR, suggestion.id);
    expect(approved.status).toBe("APPROVED");

    const executed = await executeActionSuggestion(TENANT_A, ACTOR, suggestion.id);
    expect(executed.status).toBe("EXECUTED");
    expect(executed.executionResult).toBeTruthy();
    expect((executed.executionResult as any).kind).toBe("TOUR");
  });

  it("6. repeated approval creates no duplicate Event/Audit/Outbox", async () => {
    const suggestion = await createSuggestion();
    await approveActionSuggestion(TENANT_A, ACTOR, suggestion.id);
    const eventsAfterFirst = store.events.length;
    const auditsAfterFirst = store.audits.length;
    const outboxAfterFirst = store.outbox.length;

    const second = await approveActionSuggestion(TENANT_A, ACTOR, suggestion.id);
    expect(second.status).toBe("APPROVED");
    expect(store.events.length).toBe(eventsAfterFirst);
    expect(store.audits.length).toBe(auditsAfterFirst);
    expect(store.outbox.length).toBe(outboxAfterFirst);
  });

  it("7. repeated execution creates no duplicate effect or records", async () => {
    const leadId = "lead-dup";
    store.leads.push({ id: leadId, tenantId: TENANT_A, assignedTo: ACTOR });

    const suggestion = await createSuggestion({ text: "أرغب بزيارة فيلا في الرياض", leadId });
    await approveActionSuggestion(TENANT_A, ACTOR, suggestion.id);
    await executeActionSuggestion(TENANT_A, ACTOR, suggestion.id);

    const eventsAfterFirst = store.events.length;
    const auditsAfterFirst = store.audits.length;
    const outboxAfterFirst = store.outbox.length;
    const tasksAfterFirst = store.tasks.length;

    const second = await executeActionSuggestion(TENANT_A, ACTOR, suggestion.id);
    expect(second.status).toBe("EXECUTED");
    expect(store.events.length).toBe(eventsAfterFirst);
    expect(store.audits.length).toBe(auditsAfterFirst);
    expect(store.outbox.length).toBe(outboxAfterFirst);
    expect(store.tasks.length).toBe(tasksAfterFirst);
  });

  it("8. successful transition creates Event, Audit, and Outbox atomically", async () => {
    const suggestion = await createSuggestion();
    await approveActionSuggestion(TENANT_A, ACTOR, suggestion.id);

    const approvalEvents = store.events.filter((e) => e.eventType === "ACTION_SUGGESTION_APPROVED");
    const approvalAudits = store.audits.filter((a) => a.action === "ACTION_SUGGESTION_APPROVED");
    const approvalOutbox = store.outbox.filter((o) => {
      const payload = o.payload as any;
      return payload?.eventType === "ACTION_SUGGESTION_APPROVED";
    });

    expect(approvalEvents.length).toBe(1);
    expect(approvalAudits.length).toBe(1);
    expect(approvalOutbox.length).toBe(1);
    expect(approvalEvents[0].tenantId).toBe(TENANT_A);
    expect(approvalAudits[0].tenantId).toBe(TENANT_A);
    expect(approvalOutbox[0].tenantId).toBe(TENANT_A);
  });

  it("9. unsupported executor persists FAILED with a reason", async () => {
    const suggestion = await createSuggestion({ text: "أرغب بزيارة فيلا في الرياض" });
    const approved = await approveActionSuggestion(TENANT_A, ACTOR, suggestion.id);
    expect(approved.status).toBe("APPROVED");

    const stored = store.suggestions.find((s) => s.id === suggestion.id)!;
    stored.actionType = "SEND_CONTRACT_V_EMAIL";

    await expect(
      executeActionSuggestion(TENANT_A, ACTOR, suggestion.id),
    ).rejects.toThrow("EXECUTION_FAILED:");

    const failed = store.suggestions.find((s) => s.id === suggestion.id);
    expect(failed!.status).toBe("FAILED");
    expect((failed!.executionResult as any).error).toContain("UNSUPPORTED_ACTION_TYPE");
  });

  it("10. external action never reports simulated EXECUTED success", async () => {
    const suggestion = await createSuggestion({ text: "أرغب بزيارة فيلا في الرياض" });
    await approveActionSuggestion(TENANT_A, ACTOR, suggestion.id);

    const stored = store.suggestions.find((s) => s.id === suggestion.id)!;
    stored.actionType = "SEND_WHATSAPP_TEMPLATE";

    let caughtError: Error | null = null;
    try {
      await executeActionSuggestion(TENANT_A, ACTOR, suggestion.id);
    } catch (e) {
      caughtError = e as Error;
    }

    const final = store.suggestions.find((s) => s.id === suggestion.id);
    expect(final!.status).not.toBe("EXECUTED");
    expect(final!.status).toBe("FAILED");
    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toContain("EXECUTION_FAILED");
  });

  it("11. tenant ownership validation rejects cross-tenant foreign key", async () => {
    store.leads.push({ id: "foreign-lead", tenantId: TENANT_B, assignedTo: ACTOR });

    await expect(
      analyzeConversationToAction({
        tenantId: TENANT_A,
        actorId: ACTOR,
        sourceType: "MANUAL",
        sourceId: `src-cross-${Date.now()}`,
        text: "أرغب بزيارة فيلا في الرياض غدًا الساعة 17:00",
        leadId: "foreign-lead",
      }),
    ).rejects.toThrow("CROSS_TENANT_LEAD_ACCESS_DENIED");

    const createdSuggestions = store.suggestions.filter(
      (s) => String(s.sourceId).startsWith("src-cross-"),
    );
    expect(createdSuggestions.length).toBe(0);
  });
});
