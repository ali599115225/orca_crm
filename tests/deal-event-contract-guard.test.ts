import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/realtime/publish-sync-event", () => ({
  publishSyncEvent: vi.fn().mockResolvedValue(undefined),
}));

import { appendDealEventInTx } from "@/lib/domain/deal-passport/append-event";
import type {
  DealEntityType,
  DealEventType,
  DealPassportStatus,
} from "@/lib/domain/deal-passport/types";

const frozenEventTypes = [
  "contract.approval.requested",
  "contract.approval.approved",
  "contract.approval.rejected",
  "contract.snapshot.created",
  "contract.document.generated",
  "contract.document.sent",
  "invoice.issued",
  "signatory.signed",
  "installment.overdue",
  "amendment.created",
  "amendment.approved",
  "amendment.applied",
] satisfies DealEventType[];

const frozenEntityTypes = [
  "approval",
  "snapshot",
  "document",
  "invoice",
  "signatory",
  "installment",
  "amendment",
] satisfies DealEntityType[];

function makePassport(
  id: string,
  tenantId: string,
  status: DealPassportStatus,
) {
  return {
    id,
    tenantId,
    status,
    version: 0,
    lastSequence: 0,
    lastEventId: null,
    lastEventAt: null,
    opportunityId: null,
    contractId: null,
    currentOfferId: null,
    closedAt: null,
  };
}

function createTx(initialPassports: ReturnType<typeof makePassport>[]) {
  const passports = new Map(
    initialPassports.map((passport) => [passport.id, { ...passport }]),
  );

  const events: any[] = [];

  const tx = {
    dealPassport: {
      findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
        const passport = passports.get(where.id);
        return passport ? { ...passport } : null;
      }),

      update: vi.fn().mockImplementation(async ({ where, data }: any) => {
        const passport = passports.get(where.id);
        if (!passport) throw new Error("Missing passport.");

        if (data.version?.increment) {
          passport.version += data.version.increment;
        }

        if (data.lastSequence?.increment) {
          passport.lastSequence += data.lastSequence.increment;
        }

        for (const [key, value] of Object.entries(data)) {
          if (key === "version" || key === "lastSequence") continue;
          (passport as any)[key] = value;
        }

        return { ...passport };
      }),
    },

    dealEvent: {
      findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
        if (where.id) {
          return (
            events.find(
              (event) =>
                event.id === where.id &&
                event.tenantId === where.tenantId &&
                event.dealId === where.dealId,
            ) ?? null
          );
        }

        return (
          events.find(
            (event) =>
              event.tenantId === where.tenantId &&
              event.idempotencyKey === where.idempotencyKey,
          ) ?? null
        );
      }),

      create: vi.fn().mockImplementation(async ({ data }: any) => {
        const event = {
          id: `event-${data.dealId}-${data.sequence}`,
          ...data,
        };
        events.push(event);
        return event;
      }),
    },
  };

  return { tx, passports, events };
}

function baseInput(
  dealId: string,
  eventType: DealEventType,
  idempotencyKey: string,
) {
  return {
    tenantId: "tenant-1",
    dealId,
    eventType,
    idempotencyKey,
    correlationId: `corr:${idempotencyKey}`,
    actorType: "SYSTEM" as const,
  };
}

describe("F4-B1 canonical DealEvent contract guard", () => {
  it("contains the frozen canonical event/entity contract", () => {
    expect(frozenEventTypes).toHaveLength(12);
    expect(frozenEntityTypes).toHaveLength(7);
  });

  it("preserves an existing mapped lifecycle transition", async () => {
    const state = createTx([
      makePassport("deal-1", "tenant-1", "OPEN"),
    ]);

    const result = await appendDealEventInTx(
      state.tx,
      baseInput("deal-1", "contract.issued", "mapped-1"),
    );

    expect(result.passport.status).toBe("CONTRACT_ISSUED");
  });

  it.each([
    ["installment.overdue", "installment"],
    ["invoice.issued", "invoice"],
    ["contract.document.generated", "document"],
    ["amendment.applied", "amendment"],
  ] as const)(
    "%s preserves current passport status",
    async (eventType, entityType) => {
      const state = createTx([
        makePassport("deal-1", "tenant-1", "FINANCIALS_ACTIVE"),
      ]);

      const result = await appendDealEventInTx(state.tx, {
        ...baseInput("deal-1", eventType, `key:${eventType}`),
        entityType,
        entityId: `${entityType}-1`,
      });

      expect(result.passport.status).toBe("FINANCIALS_ACTIVE");
      expect(result.passport.status).not.toBe("OPEN");
    },
  );

  it("keeps explicit caller projection authoritative", async () => {
    const state = createTx([
      makePassport("deal-1", "tenant-1", "CONTRACT_SIGNED"),
    ]);

    const result = await appendDealEventInTx(state.tx, {
      ...baseInput(
        "deal-1",
        "contract.document.generated",
        "explicit-projection",
      ),
      projection: { status: "FINANCIALS_ACTIVE" },
    });

    expect(result.passport.status).toBe("FINANCIALS_ACTIVE");
  });

  it("same idempotency key on same deal returns existing event", async () => {
    const state = createTx([
      makePassport("deal-1", "tenant-1", "CONTRACT_SIGNED"),
    ]);

    const input = baseInput(
      "deal-1",
      "invoice.issued",
      "invoice-issued-1",
    );

    const first = await appendDealEventInTx(state.tx, input);
    const second = await appendDealEventInTx(state.tx, input);

    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(second.event.id).toBe(first.event.id);
    expect(state.events).toHaveLength(1);
    expect(state.passports.get("deal-1")?.lastSequence).toBe(1);
    expect(state.passports.get("deal-1")?.status).toBe("CONTRACT_SIGNED");
  });

  it("same idempotency key cannot belong to another deal", async () => {
    const state = createTx([
      makePassport("deal-1", "tenant-1", "OPEN"),
      makePassport("deal-2", "tenant-1", "OPEN"),
    ]);

    await appendDealEventInTx(
      state.tx,
      baseInput("deal-1", "invoice.issued", "shared-key"),
    );

    await expect(
      appendDealEventInTx(
        state.tx,
        baseInput("deal-2", "invoice.issued", "shared-key"),
      ),
    ).rejects.toThrow(
      "Deal Event idempotency key belongs to another deal.",
    );
  });

  it("rejects causation from another deal", async () => {
    const state = createTx([
      makePassport("deal-1", "tenant-1", "OPEN"),
      makePassport("deal-2", "tenant-1", "OPEN"),
    ]);

    const cause = await appendDealEventInTx(
      state.tx,
      baseInput("deal-2", "contract.issued", "cause-other-deal"),
    );

    await expect(
      appendDealEventInTx(state.tx, {
        ...baseInput("deal-1", "invoice.issued", "target"),
        causationId: cause.event.id,
      }),
    ).rejects.toThrow(
      "Deal Event causation must reference the same deal and tenant.",
    );
  });

  it("rejects causation from another tenant", async () => {
    const state = createTx([
      makePassport("deal-1", "tenant-1", "OPEN"),
      makePassport("deal-x", "tenant-2", "OPEN"),
    ]);

    const cause = await appendDealEventInTx(state.tx, {
      tenantId: "tenant-2",
      dealId: "deal-x",
      eventType: "contract.issued",
      idempotencyKey: "foreign-cause",
      correlationId: "foreign-cause",
      actorType: "SYSTEM",
    });

    await expect(
      appendDealEventInTx(state.tx, {
        ...baseInput("deal-1", "invoice.issued", "tenant-target"),
        causationId: cause.event.id,
      }),
    ).rejects.toThrow(
      "Deal Event causation must reference the same deal and tenant.",
    );
  });

  it("rejects passport tenant mismatch", async () => {
    const state = createTx([
      makePassport("deal-1", "tenant-1", "OPEN"),
    ]);

    await expect(
      appendDealEventInTx(state.tx, {
        tenantId: "tenant-2",
        dealId: "deal-1",
        eventType: "invoice.issued",
        idempotencyKey: "wrong-tenant",
        correlationId: "wrong-tenant",
        actorType: "SYSTEM",
      }),
    ).rejects.toThrow("Deal Passport tenant mismatch.");
  });

  it("assigns deterministic increasing sequences", async () => {
    const state = createTx([
      makePassport("deal-1", "tenant-1", "CONTRACT_SIGNED"),
    ]);

    const first = await appendDealEventInTx(
      state.tx,
      baseInput("deal-1", "invoice.issued", "sequence-1"),
    );

    const second = await appendDealEventInTx(
      state.tx,
      baseInput(
        "deal-1",
        "contract.document.generated",
        "sequence-2",
      ),
    );

    expect(first.event.sequence).toBe(1);
    expect(second.event.sequence).toBe(2);
    expect(state.passports.get("deal-1")?.lastSequence).toBe(2);
    expect(state.passports.get("deal-1")?.status).toBe(
      "CONTRACT_SIGNED",
    );
  });
});