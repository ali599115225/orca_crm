import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbState = vi.hoisted(() => ({
  contracts: [] as Array<{ id: string; tenantId: string }>,
  dealPassports: [] as Array<{
    id: string;
    tenantId: string;
    contractId: string | null;
    opportunityId: string | null;
    status: string;
    lastSequence: number;
  }>,
  dealEvents: [] as Array<{
    id: string;
    tenantId: string;
    dealId: string;
    sequence: number;
    eventType: string;
    eventVersion: number;
    idempotencyKey: string;
    correlationId: string;
    causationId: string | null;
    actorType: string;
    actorId: string | null;
    entityType: string | null;
    entityId: string | null;
    beforeState: any;
    afterState: any;
    payload: any;
    occurredAt: Date;
    createdAt: Date;
  }>,
  auditLogs: [] as any[],
  financeCaseEvents: [] as any[],
  telemetryEvents: [] as any[],
  spies: {
    contractFindFirst: vi.fn(),
    dealPassportFindFirst: vi.fn(),
    dealEventFindMany: vi.fn(),
    auditLogSpy: vi.fn(),
    financeCaseEventSpy: vi.fn(),
    telemetryEventSpy: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contract: {
      findFirst: vi.fn(async (args: any) => {
        dbState.spies.contractFindFirst(args);
        const { where } = args;
        return (
          dbState.contracts.find(
            (c) => c.id === where.id && c.tenantId === where.tenantId,
          ) || null
        );
      }),
    },
    dealPassport: {
      findFirst: vi.fn(async (args: any) => {
        dbState.spies.dealPassportFindFirst(args);
        const { where } = args;
        return (
          dbState.dealPassports.find(
            (p) =>
              p.tenantId === where.tenantId &&
              p.contractId === where.contractId,
          ) || null
        );
      }),
    },
    dealEvent: {
      findMany: vi.fn(async (query: any) => {
        dbState.spies.dealEventFindMany(query);
        const { where, orderBy, take } = query;
        let matched = dbState.dealEvents.filter((e) => {
          if (e.tenantId !== where.tenantId) return false;
          if (e.dealId !== where.dealId) return false;
          if (where.sequence?.gt !== undefined && !(e.sequence > where.sequence.gt)) {
            return false;
          }
          return true;
        });

        if (orderBy?.sequence === "asc") {
          matched.sort((a, b) => a.sequence - b.sequence);
        } else if (orderBy?.sequence === "desc") {
          matched.sort((a, b) => b.sequence - a.sequence);
        }

        if (typeof take === "number") {
          matched = matched.slice(0, take);
        }

        return matched;
      }),
    },
    auditLog: {
      findMany: vi.fn(async (...args: any[]) => {
        dbState.spies.auditLogSpy(...args);
        return dbState.auditLogs;
      }),
      findFirst: vi.fn(async (...args: any[]) => {
        dbState.spies.auditLogSpy(...args);
        return dbState.auditLogs[0] || null;
      }),
    },
    financeCaseEvent: {
      findMany: vi.fn(async (...args: any[]) => {
        dbState.spies.financeCaseEventSpy(...args);
        return dbState.financeCaseEvents;
      }),
      findFirst: vi.fn(async (...args: any[]) => {
        dbState.spies.financeCaseEventSpy(...args);
        return dbState.financeCaseEvents[0] || null;
      }),
    },
    telemetryEvent: {
      findMany: vi.fn(async (...args: any[]) => {
        dbState.spies.telemetryEventSpy(...args);
        return dbState.telemetryEvents;
      }),
      findFirst: vi.fn(async (...args: any[]) => {
        dbState.spies.telemetryEventSpy(...args);
        return dbState.telemetryEvents[0] || null;
      }),
    },
  },
}));

import { listDealTimelineByContract } from "@/lib/domain/deal-passport/read-model";

describe("F4-B3 Deal Timeline Read Model", () => {
  beforeEach(() => {
    dbState.contracts = [];
    dbState.dealPassports = [];
    dbState.dealEvents = [];
    dbState.auditLogs = [];
    dbState.financeCaseEvents = [];
    dbState.telemetryEvents = [];
    dbState.spies.contractFindFirst.mockClear();
    dbState.spies.dealPassportFindFirst.mockClear();
    dbState.spies.dealEventFindMany.mockClear();
    dbState.spies.auditLogSpy.mockClear();
    dbState.spies.financeCaseEventSpy.mockClear();
    dbState.spies.telemetryEventSpy.mockClear();
  });

  it("proves tenant isolation: contract from another tenant is rejected", async () => {
    dbState.contracts = [{ id: "c-100", tenantId: "tenant-alpha" }];
    dbState.dealPassports = [
      {
        id: "dp-100",
        tenantId: "tenant-alpha",
        contractId: "c-100",
        opportunityId: "opp-100",
        status: "OPEN",
        lastSequence: 1,
      },
    ];
    dbState.dealEvents = [
      {
        id: "ev-1",
        tenantId: "tenant-alpha",
        dealId: "dp-100",
        sequence: 1,
        eventType: "contract.issued",
        eventVersion: 1,
        idempotencyKey: "key-1",
        correlationId: "corr-1",
        causationId: null,
        actorType: "USER",
        actorId: "usr-1",
        entityType: "contract",
        entityId: "c-100",
        beforeState: null,
        afterState: null,
        payload: {},
        occurredAt: new Date("2026-09-24T10:00:00Z"),
        createdAt: new Date("2026-09-24T10:00:00Z"),
      },
    ];

    // Request from tenant-beta for tenant-alpha's contract
    await expect(
      listDealTimelineByContract({
        tenantId: "tenant-beta",
        contractId: "c-100",
      }),
    ).rejects.toThrow("Contract not found in this tenant.");

    // Validate that missing tenantId or contractId is rejected
    await expect(
      listDealTimelineByContract({
        tenantId: "",
        contractId: "c-100",
      }),
    ).rejects.toThrow("tenantId is required.");

    await expect(
      listDealTimelineByContract({
        tenantId: "tenant-alpha",
        contractId: "",
      }),
    ).rejects.toThrow("contractId is required.");
  });

  it("proves tenant isolation on DealEvent query: events from another tenant are not leaked", async () => {
    dbState.contracts = [{ id: "c-100", tenantId: "tenant-alpha" }];
    dbState.dealPassports = [
      {
        id: "dp-100",
        tenantId: "tenant-alpha",
        contractId: "c-100",
        opportunityId: "opp-100",
        status: "OPEN",
        lastSequence: 1,
      },
    ];
    dbState.dealEvents = [
      // Foreign tenant event with the same dealId
      {
        id: "ev-foreign",
        tenantId: "tenant-foreign",
        dealId: "dp-100",
        sequence: 1,
        eventType: "contract.issued",
        eventVersion: 1,
        idempotencyKey: "key-foreign",
        correlationId: "corr-foreign",
        causationId: null,
        actorType: "USER",
        actorId: "usr-foreign",
        entityType: "contract",
        entityId: "c-100",
        beforeState: null,
        afterState: null,
        payload: { secret: "leaked" },
        occurredAt: new Date("2026-09-24T10:00:00Z"),
        createdAt: new Date("2026-09-24T10:00:00Z"),
      },
    ];

    const result = await listDealTimelineByContract({
      tenantId: "tenant-alpha",
      contractId: "c-100",
    });

    expect(result.events).toHaveLength(0);
    expect(dbState.spies.dealEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-alpha",
          dealId: "dp-100",
        }),
      }),
    );
  });

  it("proves contract → DealPassport resolution and return payload shape", async () => {
    dbState.contracts = [{ id: "c-200", tenantId: "tenant-1" }];
    dbState.dealPassports = [
      {
        id: "dp-200",
        tenantId: "tenant-1",
        contractId: "c-200",
        opportunityId: "opp-200",
        status: "FINANCIALS_ACTIVE",
        lastSequence: 2,
      },
    ];
    dbState.dealEvents = [
      {
        id: "ev-1",
        tenantId: "tenant-1",
        dealId: "dp-200",
        sequence: 1,
        eventType: "contract.issued",
        eventVersion: 1,
        idempotencyKey: "idem-1",
        correlationId: "corr-1",
        causationId: null,
        actorType: "USER",
        actorId: "u-1",
        entityType: "contract",
        entityId: "c-200",
        beforeState: { state: "draft" },
        afterState: { state: "issued" },
        payload: { note: "Contract sent to buyer" },
        occurredAt: new Date("2026-09-24T08:00:00Z"),
        createdAt: new Date("2026-09-24T08:00:00Z"),
      },
      {
        id: "ev-2",
        tenantId: "tenant-1",
        dealId: "dp-200",
        sequence: 2,
        eventType: "financials.activated",
        eventVersion: 1,
        idempotencyKey: "idem-2",
        correlationId: "corr-2",
        causationId: "ev-1",
        actorType: "SYSTEM",
        actorId: null,
        entityType: "payment_plan",
        entityId: "pp-1",
        beforeState: null,
        afterState: { active: true },
        payload: { scheduleCount: 12 },
        occurredAt: new Date("2026-09-24T09:00:00Z"),
        createdAt: new Date("2026-09-24T09:00:00Z"),
      },
    ];

    const result = await listDealTimelineByContract({
      tenantId: "tenant-1",
      contractId: "c-200",
    });

    expect(result).toEqual({
      contractId: "c-200",
      dealId: "dp-200",
      opportunityId: "opp-200",
      dealStatus: "FINANCIALS_ACTIVE",
      lastSequence: 2,
      events: expect.any(Array),
      page: {
        afterSequence: 0,
        nextCursor: null,
        hasMore: false,
      },
    });

    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toEqual({
      id: "ev-1",
      sequence: 1,
      eventType: "contract.issued",
      eventVersion: 1,
      actorType: "USER",
      actorId: "u-1",
      entityType: "contract",
      entityId: "c-200",
      correlationId: "corr-1",
      causationId: null,
      beforeState: { state: "draft" },
      afterState: { state: "issued" },
      payload: { note: "Contract sent to buyer" },
      occurredAt: new Date("2026-09-24T08:00:00Z"),
      createdAt: new Date("2026-09-24T08:00:00Z"),
    });

    // Verify idempotencyKey is NOT exposed on events
    for (const ev of result.events) {
      expect(ev).not.toHaveProperty("idempotencyKey");
    }
  });

  it("proves sequence ASC ordering regardless of insertion order", async () => {
    dbState.contracts = [{ id: "c-300", tenantId: "t-1" }];
    dbState.dealPassports = [
      {
        id: "dp-300",
        tenantId: "t-1",
        contractId: "c-300",
        opportunityId: null,
        status: "CONTRACT_SIGNED",
        lastSequence: 3,
      },
    ];
    // Intentionally unordered events
    dbState.dealEvents = [
      {
        id: "ev-3",
        tenantId: "t-1",
        dealId: "dp-300",
        sequence: 3,
        eventType: "contract.signed",
        eventVersion: 1,
        idempotencyKey: "k-3",
        correlationId: "c-3",
        causationId: null,
        actorType: "USER",
        actorId: null,
        entityType: "contract",
        entityId: "c-300",
        beforeState: null,
        afterState: null,
        payload: {},
        occurredAt: new Date("2026-09-24T12:00:00Z"),
        createdAt: new Date("2026-09-24T12:00:00Z"),
      },
      {
        id: "ev-1",
        tenantId: "t-1",
        dealId: "dp-300",
        sequence: 1,
        eventType: "opportunity.created",
        eventVersion: 1,
        idempotencyKey: "k-1",
        correlationId: "c-1",
        causationId: null,
        actorType: "SYSTEM",
        actorId: null,
        entityType: "opportunity",
        entityId: "opp-1",
        beforeState: null,
        afterState: null,
        payload: {},
        occurredAt: new Date("2026-09-24T10:00:00Z"),
        createdAt: new Date("2026-09-24T10:00:00Z"),
      },
      {
        id: "ev-2",
        tenantId: "t-1",
        dealId: "dp-300",
        sequence: 2,
        eventType: "contract.issued",
        eventVersion: 1,
        idempotencyKey: "k-2",
        correlationId: "c-2",
        causationId: null,
        actorType: "USER",
        actorId: null,
        entityType: "contract",
        entityId: "c-300",
        beforeState: null,
        afterState: null,
        payload: {},
        occurredAt: new Date("2026-09-24T11:00:00Z"),
        createdAt: new Date("2026-09-24T11:00:00Z"),
      },
    ];

    const result = await listDealTimelineByContract({
      tenantId: "t-1",
      contractId: "c-300",
    });

    expect(dbState.spies.dealEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { sequence: "asc" },
      }),
    );

    const sequences = result.events.map((e) => e.sequence);
    expect(sequences).toEqual([1, 2, 3]);
  });

  it("proves identical and inverted timestamps do not affect sequence ordering", async () => {
    dbState.contracts = [{ id: "c-time", tenantId: "t-time" }];
    dbState.dealPassports = [
      {
        id: "dp-time",
        tenantId: "t-time",
        contractId: "c-time",
        opportunityId: null,
        status: "OPEN",
        lastSequence: 3,
      },
    ];
    dbState.dealEvents = [
      {
        id: "ev-1",
        tenantId: "t-time",
        dealId: "dp-time",
        sequence: 1,
        eventType: "contract.issued",
        eventVersion: 1,
        idempotencyKey: "k-1",
        correlationId: "c-1",
        causationId: null,
        actorType: "USER",
        actorId: null,
        entityType: "contract",
        entityId: "c-time",
        beforeState: null,
        afterState: null,
        payload: {},
        // Sequence 1 has later timestamp than Sequence 2
        occurredAt: new Date("2026-09-24T15:00:00Z"),
        createdAt: new Date("2026-09-24T15:00:00Z"),
      },
      {
        id: "ev-2",
        tenantId: "t-time",
        dealId: "dp-time",
        sequence: 2,
        eventType: "contract.signed",
        eventVersion: 1,
        idempotencyKey: "k-2",
        correlationId: "c-2",
        causationId: null,
        actorType: "USER",
        actorId: null,
        entityType: "contract",
        entityId: "c-time",
        beforeState: null,
        afterState: null,
        payload: {},
        // Sequence 2 has earlier timestamp than Sequence 1
        occurredAt: new Date("2026-09-24T10:00:00Z"),
        createdAt: new Date("2026-09-24T10:00:00Z"),
      },
      {
        id: "ev-3",
        tenantId: "t-time",
        dealId: "dp-time",
        sequence: 3,
        eventType: "financials.activated",
        eventVersion: 1,
        idempotencyKey: "k-3",
        correlationId: "c-3",
        causationId: null,
        actorType: "SYSTEM",
        actorId: null,
        entityType: "payment_plan",
        entityId: "pp-1",
        beforeState: null,
        afterState: null,
        payload: {},
        // Sequence 3 has identical timestamp to Sequence 1
        occurredAt: new Date("2026-09-24T15:00:00Z"),
        createdAt: new Date("2026-09-24T15:00:00Z"),
      },
    ];

    const result = await listDealTimelineByContract({
      tenantId: "t-time",
      contractId: "c-time",
    });

    const sequences = result.events.map((e) => e.sequence);
    expect(sequences).toEqual([1, 2, 3]);

    // Query must NOT orderBy timestamp
    expect(dbState.spies.dealEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { sequence: "asc" },
      }),
    );
  });

  it("proves cursor pagination and stable pagination across pages", async () => {
    dbState.contracts = [{ id: "c-page", tenantId: "tenant-page" }];
    dbState.dealPassports = [
      {
        id: "dp-page",
        tenantId: "tenant-page",
        contractId: "c-page",
        opportunityId: null,
        status: "OPEN",
        lastSequence: 5,
      },
    ];
    dbState.dealEvents = Array.from({ length: 5 }, (_, i) => ({
      id: `ev-${i + 1}`,
      tenantId: "tenant-page",
      dealId: "dp-page",
      sequence: i + 1,
      eventType: `event.type.${i + 1}`,
      eventVersion: 1,
      idempotencyKey: `key-${i + 1}`,
      correlationId: `corr-${i + 1}`,
      causationId: null,
      actorType: "USER",
      actorId: `usr-${i + 1}`,
      entityType: "contract",
      entityId: "c-page",
      beforeState: null,
      afterState: null,
      payload: { index: i + 1 },
      occurredAt: new Date(`2026-09-24T10:0${i}:00Z`),
      createdAt: new Date(`2026-09-24T10:0${i}:00Z`),
    }));

    // Page 1: limit 2, default afterSequence (0)
    const page1 = await listDealTimelineByContract({
      tenantId: "tenant-page",
      contractId: "c-page",
      limit: 2,
    });
    expect(page1.events.map((e) => e.sequence)).toEqual([1, 2]);
    expect(page1.page).toEqual({
      afterSequence: 0,
      nextCursor: 2,
      hasMore: true,
    });
    // Check that take: limit + 1 (3) was passed to detect hasMore
    expect(dbState.spies.dealEventFindMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        take: 3,
        where: expect.objectContaining({ sequence: { gt: 0 } }),
      }),
    );

    // Page 2: limit 2, afterSequence 2
    const page2 = await listDealTimelineByContract({
      tenantId: "tenant-page",
      contractId: "c-page",
      afterSequence: page1.page.nextCursor!,
      limit: 2,
    });
    expect(page2.events.map((e) => e.sequence)).toEqual([3, 4]);
    expect(page2.page).toEqual({
      afterSequence: 2,
      nextCursor: 4,
      hasMore: true,
    });

    // Page 3: limit 2, afterSequence 4 (last page)
    const page3 = await listDealTimelineByContract({
      tenantId: "tenant-page",
      contractId: "c-page",
      afterSequence: page2.page.nextCursor!,
      limit: 2,
    });
    expect(page3.events.map((e) => e.sequence)).toEqual([5]);
    expect(page3.page).toEqual({
      afterSequence: 4,
      nextCursor: null,
      hasMore: false,
    });

    // Page 4: afterSequence 5 (empty page)
    const page4 = await listDealTimelineByContract({
      tenantId: "tenant-page",
      contractId: "c-page",
      afterSequence: 5,
      limit: 2,
    });
    expect(page4.events).toHaveLength(0);
    expect(page4.page).toEqual({
      afterSequence: 5,
      nextCursor: null,
      hasMore: false,
    });

    // Prove stable pagination: all events collected across pages equal original set without gaps or duplicates
    const collected = [
      ...page1.events,
      ...page2.events,
      ...page3.events,
    ];
    expect(collected.map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5]);
    expect(collected.map((e) => e.id)).toEqual([
      "ev-1",
      "ev-2",
      "ev-3",
      "ev-4",
      "ev-5",
    ]);
  });

  it("proves no AuditLog fallback and no FinanceCaseEvent merge", async () => {
    dbState.contracts = [{ id: "c-pure", tenantId: "t-pure" }];
    dbState.dealPassports = [
      {
        id: "dp-pure",
        tenantId: "t-pure",
        contractId: "c-pure",
        opportunityId: null,
        status: "OPEN",
        lastSequence: 1,
      },
    ];
    dbState.dealEvents = [
      {
        id: "ev-deal",
        tenantId: "t-pure",
        dealId: "dp-pure",
        sequence: 1,
        eventType: "contract.issued",
        eventVersion: 1,
        idempotencyKey: "k-pure",
        correlationId: "c-pure",
        causationId: null,
        actorType: "USER",
        actorId: null,
        entityType: "contract",
        entityId: "c-pure",
        beforeState: null,
        afterState: null,
        payload: {},
        occurredAt: new Date("2026-09-24T10:00:00Z"),
        createdAt: new Date("2026-09-24T10:00:00Z"),
      },
    ];
    dbState.auditLogs = [
      {
        id: "audit-1",
        entityType: "contract",
        entityId: "c-pure",
        action: "UPDATE",
      },
    ];
    dbState.financeCaseEvents = [
      {
        id: "fce-1",
        contractId: "c-pure",
        eventType: "CASE_OPENED",
      },
    ];
    dbState.telemetryEvents = [
      {
        id: "tel-1",
        contractId: "c-pure",
      },
    ];

    const result = await listDealTimelineByContract({
      tenantId: "t-pure",
      contractId: "c-pure",
    });

    // Verify DealEvent was queried
    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe("ev-deal");

    // Verify non-canonical sources were NEVER touched
    expect(dbState.spies.auditLogSpy).not.toHaveBeenCalled();
    expect(dbState.spies.financeCaseEventSpy).not.toHaveBeenCalled();
    expect(dbState.spies.telemetryEventSpy).not.toHaveBeenCalled();
  });

  it("proves empty existing contract timeline returns empty structure, not an error", async () => {
    // Contract exists for tenant, but NO DealPassport exists for it
    dbState.contracts = [{ id: "c-unlinked", tenantId: "t-unlinked" }];
    dbState.dealPassports = [];
    dbState.dealEvents = [];

    const result = await listDealTimelineByContract({
      tenantId: "t-unlinked",
      contractId: "c-unlinked",
    });

    expect(result).toEqual({
      contractId: "c-unlinked",
      dealId: null,
      opportunityId: null,
      dealStatus: null,
      lastSequence: 0,
      events: [],
      page: {
        afterSequence: 0,
        nextCursor: null,
        hasMore: false,
      },
    });

    // DealEvent findMany should not be called since there is no passport
    expect(dbState.spies.dealEventFindMany).not.toHaveBeenCalled();
  });

  it("proves beforeState / afterState / payload are preserved intact", async () => {
    const complexBefore = {
      status: "DRAFT",
      amount: 500000,
      milestones: [
        { id: 1, pct: 20, done: false },
        { id: 2, pct: 80, done: false },
      ],
      metadata: { source: "web", internalRef: null },
    };

    const complexAfter = {
      status: "ACTIVE",
      amount: 500000,
      milestones: [
        { id: 1, pct: 20, done: true },
        { id: 2, pct: 80, done: false },
      ],
      metadata: { source: "web", internalRef: "REF-999" },
    };

    const complexPayload = {
      approvedBy: "manager@orca.sa",
      riskScore: 0.12,
      tags: ["vip", "residential"],
    };

    dbState.contracts = [{ id: "c-payload", tenantId: "t-payload" }];
    dbState.dealPassports = [
      {
        id: "dp-payload",
        tenantId: "t-payload",
        contractId: "c-payload",
        opportunityId: null,
        status: "OPEN",
        lastSequence: 1,
      },
    ];
    dbState.dealEvents = [
      {
        id: "ev-json",
        tenantId: "t-payload",
        dealId: "dp-payload",
        sequence: 1,
        eventType: "amendment.applied",
        eventVersion: 2,
        idempotencyKey: "idem-json",
        correlationId: "corr-json",
        causationId: "cause-123",
        actorType: "USER",
        actorId: "usr-456",
        entityType: "amendment",
        entityId: "amend-789",
        beforeState: complexBefore,
        afterState: complexAfter,
        payload: complexPayload,
        occurredAt: new Date("2026-09-24T14:30:00Z"),
        createdAt: new Date("2026-09-24T14:30:00Z"),
      },
    ];

    const result = await listDealTimelineByContract({
      tenantId: "t-payload",
      contractId: "c-payload",
    });

    expect(result.events).toHaveLength(1);
    const event = result.events[0];
    expect(event.beforeState).toEqual(complexBefore);
    expect(event.afterState).toEqual(complexAfter);
    expect(event.payload).toEqual(complexPayload);
    expect(event.causationId).toBe("cause-123");
    expect(event.actorId).toBe("usr-456");
    expect(event.entityType).toBe("amendment");
    expect(event.entityId).toBe("amend-789");
    expect(event.eventVersion).toBe(2);
  });

  it("proves invalid afterSequence / limit rejected", async () => {
    dbState.contracts = [{ id: "c-valid", tenantId: "t-valid" }];

    // Invalid afterSequence values
    await expect(
      listDealTimelineByContract({
        tenantId: "t-valid",
        contractId: "c-valid",
        afterSequence: -1,
      }),
    ).rejects.toThrow("Invalid afterSequence: must be an integer >= 0.");

    await expect(
      listDealTimelineByContract({
        tenantId: "t-valid",
        contractId: "c-valid",
        afterSequence: 1.5,
      }),
    ).rejects.toThrow("Invalid afterSequence: must be an integer >= 0.");

    await expect(
      listDealTimelineByContract({
        tenantId: "t-valid",
        contractId: "c-valid",
        afterSequence: NaN,
      }),
    ).rejects.toThrow("Invalid afterSequence: must be an integer >= 0.");

    await expect(
      listDealTimelineByContract({
        tenantId: "t-valid",
        contractId: "c-valid",
        afterSequence: "0" as any,
      }),
    ).rejects.toThrow("Invalid afterSequence: must be an integer >= 0.");

    // Invalid limit values
    await expect(
      listDealTimelineByContract({
        tenantId: "t-valid",
        contractId: "c-valid",
        limit: 0,
      }),
    ).rejects.toThrow("Invalid limit: must be an integer between 1 and 100.");

    await expect(
      listDealTimelineByContract({
        tenantId: "t-valid",
        contractId: "c-valid",
        limit: -5,
      }),
    ).rejects.toThrow("Invalid limit: must be an integer between 1 and 100.");

    await expect(
      listDealTimelineByContract({
        tenantId: "t-valid",
        contractId: "c-valid",
        limit: 101,
      }),
    ).rejects.toThrow("Invalid limit: must be an integer between 1 and 100.");

    await expect(
      listDealTimelineByContract({
        tenantId: "t-valid",
        contractId: "c-valid",
        limit: 50.5,
      }),
    ).rejects.toThrow("Invalid limit: must be an integer between 1 and 100.");

    await expect(
      listDealTimelineByContract({
        tenantId: "t-valid",
        contractId: "c-valid",
        limit: "50" as any,
      }),
    ).rejects.toThrow("Invalid limit: must be an integer between 1 and 100.");
  });

  it("proves source code hygiene: canonical source isolation via static analysis", () => {
    const fileContent = fs.readFileSync(
      path.join(process.cwd(), "lib/domain/deal-passport/read-model.ts"),
      "utf8",
    );

    // Ensure non-canonical sources are strictly absent
    expect(fileContent).not.toMatch(/auditLog/i);
    expect(fileContent).not.toMatch(/financeCaseEvent/i);
    expect(fileContent).not.toMatch(/telemetryEvent/i);
    expect(fileContent).not.toMatch(/offset/i);
    expect(fileContent).not.toMatch(/skip\s*:/);

    // Ensure sequence ASC is the only order
    expect(fileContent).toMatch(/orderBy:\s*\{\s*sequence:\s*["']asc["'],?\s*\}/);

    // Ensure take limit + 1 is present
    expect(fileContent).toMatch(/take:\s*limit\s*\+\s*1/);

    // Ensure idempotencyKey is not exposed in event projection
    expect(fileContent).not.toMatch(/idempotencyKey:\s*row\.idempotencyKey/);

    // Ensure no caller-injected Prisma/database client exists in the interface or signature
    expect(fileContent).not.toMatch(/client\??\s*:/i);
    expect(fileContent).not.toMatch(/overrideClient/i);
  });
});
