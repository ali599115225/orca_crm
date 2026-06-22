import { describe, expect, it } from "vitest";
import {
  appendDealEventInTx,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";

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
            ...data,
          };
          passports.push(passport);
          return passport;
        },
        findUnique: async ({ where }: any) =>
          passports.find((passport) => passport.id === where.id) || null,
        update: async ({ where, data }: any) => {
          const passport = passports.find((item) => item.id === where.id);
          if (!passport) throw new Error("Passport not found.");
          Object.assign(passport, {
            ...data,
            version:
              typeof data.version?.increment === "number"
                ? passport.version + data.version.increment
                : data.version ?? passport.version,
            lastSequence:
              typeof data.lastSequence?.increment === "number"
                ? passport.lastSequence + data.lastSequence.increment
                : data.lastSequence ?? passport.lastSequence,
          });
          return { ...passport };
        },
      },
      dealEvent: {
        findFirst: async ({ where }: any) =>
          events.find(
            (event) =>
              event.tenantId === where.tenantId &&
              event.idempotencyKey === where.idempotencyKey,
          ) || null,
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
          return event;
        },
      },
    },
  };
}

describe("Deal Passport", () => {
  it("does not duplicate a passport or event on replay", async () => {
    const { tx, passports, events } = createDealTx();
    const deal = await resolveDealInTx(tx, {
      tenantId: "tenant-1",
      opportunityId: "opp-1",
    });

    await appendDealEventInTx(tx, {
      tenantId: "tenant-1",
      dealId: deal.passport.id,
      eventType: "offer.created",
      idempotencyKey: "offer.created:offer-1",
      entityType: "offer",
      entityId: "offer-1",
      projection: {
        opportunityId: "opp-1",
        currentOfferId: "offer-1",
        status: "OFFERED",
      },
    });

    const replay = await resolveDealInTx(tx, {
      tenantId: "tenant-1",
      opportunityId: "opp-1",
    });
    const replayEvent = await appendDealEventInTx(tx, {
      tenantId: "tenant-1",
      dealId: replay.passport.id,
      eventType: "offer.created",
      idempotencyKey: "offer.created:offer-1",
      entityType: "offer",
      entityId: "offer-1",
    });

    expect(passports).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(replay.created).toBe(false);
    expect(replayEvent.idempotent).toBe(true);
    expect(passports[0].lastSequence).toBe(1);
  });

  it("keeps sequence continuous and unique across the offer-to-contract path", async () => {
    const { tx, events } = createDealTx();
    const deal = await resolveDealInTx(tx, {
      tenantId: "tenant-1",
      opportunityId: "opp-1",
    });

    for (const event of [
      ["deal.opened", "deal.opened:opportunity:opp-1", "opportunity", "opp-1"],
      ["offer.created", "offer.created:offer-1", "offer", "offer-1"],
      ["offer.accepted", "offer.accepted:offer-1", "offer", "offer-1"],
      ["contract.issued", "contract.issued:contract-1", "contract", "contract-1"],
    ] as const) {
      await appendDealEventInTx(tx, {
        tenantId: "tenant-1",
        dealId: deal.passport.id,
        eventType: event[0],
        idempotencyKey: event[1],
        entityType: event[2],
        entityId: event[3],
        projection: {
          opportunityId: "opp-1",
          contractId: event[0] === "contract.issued" ? "contract-1" : null,
        },
      });
    }

    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3, 4]);
    expect(new Set(events.map((event) => event.sequence)).size).toBe(4);
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

    await appendDealEventInTx(tx, {
      tenantId: "tenant-1",
      dealId: tenantOne.passport.id,
      eventType: "deal.opened",
      idempotencyKey: "deal.opened:opportunity:opp-shared",
      entityType: "opportunity",
      entityId: "opp-shared",
    });
    await appendDealEventInTx(tx, {
      tenantId: "tenant-2",
      dealId: tenantTwo.passport.id,
      eventType: "deal.opened",
      idempotencyKey: "deal.opened:opportunity:opp-shared",
      entityType: "opportunity",
      entityId: "opp-shared",
    });

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
