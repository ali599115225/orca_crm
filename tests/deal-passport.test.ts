import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/realtime/publish-sync-event", () => ({
  publishSyncEvent: vi.fn(),
}));

import {
  appendDealEventInTx,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { publishSyncEvent } from "@/lib/realtime/publish-sync-event";
import { SYNC_TOPICS } from "@/lib/realtime/topics";

const publishSyncEventMock = vi.mocked(publishSyncEvent);

function createDealTx() {
  const passports: any[] = [];
  const events: any[] = [];

  return {
    passports,
    events,
    tx: {
      dealPassport: {
        findMany: async ({ where }: any) =>
          passports.filter((passport) => {
            if (passport.tenantId !== where.tenantId) return false;
            return where.OR.some((anchor: any) => {
              if (anchor.opportunityId) {
                return passport.opportunityId === anchor.opportunityId;
              }
              if (anchor.contractId) {
                return passport.contractId === anchor.contractId;
              }
              return false;
            });
          }),
        create: async ({ data }: any) => {
          const passport = {
            id: `deal-${passports.length + 1}`,
            currentOfferId: null,
            version: 0,
            lastSequence: 0,
            lastEventId: null,
            lastEventAt: null,
            createdAt: new Date(),
            ...data,
          };
          passports.push(passport);
          return { ...passport };
        },
        findUnique: async ({ where }: any) =>
          passports.find((passport) => passport.id === where.id) || null,
        update: async ({ where, data }: any) => {
          const passport = passports.find((item) => item.id === where.id);
          if (!passport) throw new Error("Passport not found.");
          const next = { ...data };
          if (typeof data.version?.increment === "number") {
            next.version = passport.version + data.version.increment;
          }
          if (typeof data.lastSequence?.increment === "number") {
            next.lastSequence = passport.lastSequence + data.lastSequence.increment;
          }
          Object.assign(passport, next);
          return { ...passport };
        },
      },
      dealEvent: {
        findFirst: async ({ where }: any) => {
          if (where.id) {
            return (
              events.find(
                (event) =>
                  event.id === where.id &&
                  (!where.tenantId || event.tenantId === where.tenantId) &&
                  (!where.dealId || event.dealId === where.dealId),
              ) || null
            );
          }
          return (
            events.find(
              (event) =>
                event.tenantId === where.tenantId &&
                event.idempotencyKey === where.idempotencyKey,
            ) || null
          );
        },
        create: async ({ data }: any) => {
          if (
            events.some(
              (event) =>
                event.dealId === data.dealId &&
                event.sequence === data.sequence,
            )
          ) {
            throw new Error("Duplicate sequence.");
          }
          if (
            events.some(
              (event) =>
                event.tenantId === data.tenantId &&
                event.idempotencyKey === data.idempotencyKey,
            )
          ) {
            throw new Error("Duplicate idempotency key.");
          }
          const event = { id: `event-${events.length + 1}`, ...data };
          events.push(event);
          return { ...event };
        },
      },
    },
  };
}

describe("Deal Passport", () => {
  beforeEach(() => {
    publishSyncEventMock.mockReset();
    publishSyncEventMock.mockResolvedValue({} as never);
  });
  it("does not duplicate a passport or event on replay", async () => {
    const { tx, passports, events } = createDealTx();
    const deal = await resolveDealInTx(tx, {
      tenantId: "tenant-1",
      opportunityId: "opp-1",
    });

    const first = await appendDealEventInTx(tx, {
      tenantId: "tenant-1",
      dealId: deal.passport.id,
      eventType: "offer.created",
      idempotencyKey: "offer.created:offer-1",
      correlationId: "corr-offer-1",
      actorId: "user-1",
      entityType: "offer",
      entityId: "offer-1",
      projection: {
        opportunityId: "opp-1",
        currentOfferId: "offer-1",
        status: "OFFERED",
      },
    });

    const replayDeal = await resolveDealInTx(tx, {
      tenantId: "tenant-1",
      opportunityId: "opp-1",
    });
    const replayEvent = await appendDealEventInTx(tx, {
      tenantId: "tenant-1",
      dealId: replayDeal.passport.id,
      eventType: "offer.created",
      idempotencyKey: "offer.created:offer-1",
      correlationId: "corr-replay",
      actorId: "user-1",
      entityType: "offer",
      entityId: "offer-1",
    });

    expect(passports).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(replayDeal.created).toBe(false);
    expect(replayEvent.idempotent).toBe(true);
    expect(replayEvent.event.id).toBe(first.event.id);
    expect(passports[0]).toMatchObject({
      lastSequence: 1,
      lastEventId: first.event.id,
      status: "OFFERED",
    });
    expect(publishSyncEventMock).toHaveBeenCalledTimes(1);
    expect(publishSyncEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        topic: SYNC_TOPICS.DEALS,
        eventType: "offer.created",
        aggregateType: "deal",
        aggregateId: deal.passport.id,
        aggregateVersion: 1,
        sourceEventId: first.event.id,
        idempotencyKey: `deal-event:${first.event.id}`,
        payload: expect.objectContaining({
          status: "OFFERED",
          actorUserId: "user-1",
          relatedIds: expect.arrayContaining(["opp-1", "offer-1"]),
        }),
      }),
      tx,
    );
  });

  it("keeps sequence continuous and records mandatory event metadata", async () => {
    const { tx, events, passports } = createDealTx();
    const deal = await resolveDealInTx(tx, {
      tenantId: "tenant-1",
      opportunityId: "opp-1",
    });

    const path = [
      ["deal.opened", "deal.opened:opportunity:opp-1", "opportunity", "opp-1", "OPEN"],
      ["offer.created", "offer.created:offer-1", "offer", "offer-1", "OFFERED"],
      ["offer.accepted", "offer.accepted:offer-1", "offer", "offer-1", "OFFER_ACCEPTED"],
      ["contract.issued", "contract.issued:contract-1", "contract", "contract-1", "CONTRACT_ISSUED"],
      ["contract.signed", "contract.signed:contract-1", "contract", "contract-1", "CONTRACT_SIGNED"],
      ["financials.activated", "financials.activated:contract-1", "contract", "contract-1", "FINANCIALS_ACTIVE"],
      ["payment.completed", "payment.completed:payment-1", "payment", "payment-1", "PAYMENT_COMPLETED"],
    ] as const;

    for (const [eventType, idempotencyKey, entityType, entityId, status] of path) {
      await appendDealEventInTx(tx, {
        tenantId: "tenant-1",
        dealId: deal.passport.id,
        eventType,
        idempotencyKey,
        correlationId: "corr-lifecycle-1",
        actorId: "user-1",
        entityType,
        entityId,
        projection: {
          opportunityId: "opp-1",
          contractId:
            eventType.startsWith("contract.") ||
            eventType.startsWith("financials.") ||
            eventType.startsWith("payment.")
              ? "contract-1"
              : undefined,
          status,
        },
      });
    }

    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(events.map((event) => event.sequence)).size).toBe(7);
    expect(events.every((event) => event.correlationId === "corr-lifecycle-1")).toBe(true);
    expect(events.every((event) => event.actorType === "USER")).toBe(true);
    expect(events.every((event) => event.eventVersion === 1)).toBe(true);
    expect(passports[0].lastEventId).toBe(events.at(-1).id);
    expect(passports[0].lastEventAt).toEqual(events.at(-1).occurredAt);
  });

  it("stores causation independently and keeps payment completion idempotent", async () => {
    const { tx, events } = createDealTx();
    const deal = await resolveDealInTx(tx, {
      tenantId: "tenant-1",
      contractId: "contract-1",
    });

    const signed = await appendDealEventInTx(tx, {
      tenantId: "tenant-1",
      dealId: deal.passport.id,
      eventType: "contract.signed",
      idempotencyKey: "contract.signed:contract-1",
      actorId: "user-1",
      correlationId: "corr-1",
      entityType: "contract",
      entityId: "contract-1",
      beforeState: { status: "PENDING_SIGNATURE" },
      afterState: { status: "SIGNED" },
      projection: {
        contractId: "contract-1",
        status: "CONTRACT_SIGNED",
      },
    });

    await appendDealEventInTx(tx, {
      tenantId: "tenant-1",
      dealId: deal.passport.id,
      eventType: "financials.activated",
      idempotencyKey: "financials.activated:contract-1",
      causationId: signed.event.id,
      actorId: "user-1",
      correlationId: "corr-1",
      entityType: "contract",
      entityId: "contract-1",
      payload: {
        invoiceId: "invoice-1",
        paymentPlanId: "plan-1",
      },
      projection: {
        contractId: "contract-1",
        status: "FINANCIALS_ACTIVE",
      },
    });

    const payment = await appendDealEventInTx(tx, {
      tenantId: "tenant-1",
      dealId: deal.passport.id,
      eventType: "payment.completed",
      idempotencyKey: "payment.completed:payment-1",
      causationId: events[1].id,
      actorType: "PROVIDER",
      correlationId: "corr-1",
      entityType: "payment",
      entityId: "payment-1",
      payload: { invoiceId: "invoice-1" },
      projection: {
        contractId: "contract-1",
        status: "PAYMENT_COMPLETED",
      },
    });

    const replayPayment = await appendDealEventInTx(tx, {
      tenantId: "tenant-1",
      dealId: deal.passport.id,
      eventType: "payment.completed",
      idempotencyKey: "payment.completed:payment-1",
      correlationId: "corr-replay",
      entityType: "payment",
      entityId: "payment-1",
    });

    expect(events).toHaveLength(3);
    expect(events[1]).toMatchObject({
      eventType: "financials.activated",
      correlationId: "corr-1",
      causationId: signed.event.id,
      payload: {
        invoiceId: "invoice-1",
        paymentPlanId: "plan-1",
      },
    });
    expect(events[1].payload).not.toHaveProperty("causationId");
    expect(payment.event.actorType).toBe("PROVIDER");
    expect(replayPayment.idempotent).toBe(true);
    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3]);
  });

  it("rejects causation from another deal or tenant", async () => {
    const { tx } = createDealTx();
    const first = await resolveDealInTx(tx, {
      tenantId: "tenant-1",
      opportunityId: "opp-1",
    });
    const second = await resolveDealInTx(tx, {
      tenantId: "tenant-1",
      opportunityId: "opp-2",
    });
    const parent = await appendDealEventInTx(tx, {
      tenantId: "tenant-1",
      dealId: first.passport.id,
      eventType: "deal.opened",
      idempotencyKey: "deal.opened:opportunity:opp-1",
      correlationId: "corr-1",
      entityType: "opportunity",
      entityId: "opp-1",
    });

    await expect(
      appendDealEventInTx(tx, {
        tenantId: "tenant-1",
        dealId: second.passport.id,
        eventType: "offer.created",
        idempotencyKey: "offer.created:offer-2",
        correlationId: "corr-2",
        causationId: parent.event.id,
        entityType: "offer",
        entityId: "offer-2",
      }),
    ).rejects.toThrow("same deal and tenant");
  });

  it("fails the command when durable sync publication fails", async () => {
    const { tx } = createDealTx();
    const deal = await resolveDealInTx(tx, {
      tenantId: "tenant-1",
      opportunityId: "opp-1",
    });

    publishSyncEventMock.mockRejectedValueOnce(new Error("sync unavailable"));

    await expect(
      appendDealEventInTx(tx, {
        tenantId: "tenant-1",
        dealId: deal.passport.id,
        eventType: "offer.created",
        idempotencyKey: "offer.created:offer-fail",
        correlationId: "corr-fail",
        actorId: "user-1",
        entityType: "offer",
        entityId: "offer-fail",
      }),
    ).rejects.toThrow("sync unavailable");

    expect(publishSyncEventMock).toHaveBeenCalledTimes(1);
  });

  it("scopes idempotency and passport resolution by tenant", async () => {
    const { tx, passports, events } = createDealTx();
    const tenantOne = await resolveDealInTx(tx, {
      tenantId: "tenant-1",
      opportunityId: "opp-shared",
    });
    const tenantTwo = await resolveDealInTx(tx, {
      tenantId: "tenant-2",
      opportunityId: "opp-shared",
    });

    for (const [tenantId, dealId] of [
      ["tenant-1", tenantOne.passport.id],
      ["tenant-2", tenantTwo.passport.id],
    ] as const) {
      await appendDealEventInTx(tx, {
        tenantId,
        dealId,
        eventType: "deal.opened",
        idempotencyKey: "deal.opened:opportunity:opp-shared",
        correlationId: `corr-${tenantId}`,
        entityType: "opportunity",
        entityId: "opp-shared",
      });
    }

    expect(passports).toHaveLength(2);
    expect(tenantOne.passport.id).not.toBe(tenantTwo.passport.id);
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.tenantId).sort()).toEqual([
      "tenant-1",
      "tenant-2",
    ]);
    expect(passports[0]).not.toHaveProperty("buyerName");
    expect(passports[0]).not.toHaveProperty("totalVolumeSar");
  });
});
