import { describe, expect, it } from "vitest";

import {
  filterEventsAfter,
  parseClientSyncPage,
  retryDelayMs,
  shouldInvalidateFromSync,
  selectRealtimeLeader,
  type ClientSyncEvent,
} from "@/lib/realtime/client-runtime";

describe("realtime client runtime", () => {
  it("elects one visible non-stale tab deterministically", () => {
    const now = 10_000;
    const leader = selectRealtimeLeader(
      [
        { id: "tab-c", visible: true, lastSeenAt: now },
        { id: "tab-a", visible: true, lastSeenAt: now - 100 },
        { id: "tab-b", visible: false, lastSeenAt: now },
        { id: "tab-0", visible: true, lastSeenAt: now - 5_000 },
      ],
      now,
      3_500,
    );

    expect(leader).toBe("tab-a");
  });

  it("filters replayed events by cursor", () => {
    const events = [
      {
        cursor: "7",
        topic: "deals",
        eventType: "offer.created",
        aggregateType: "deal",
        aggregateId: "deal-1",
      },
      {
        cursor: "8",
        topic: "deals",
        eventType: "offer.accepted",
        aggregateType: "deal",
        aggregateId: "deal-1",
      },
    ] satisfies ClientSyncEvent[];

    expect(filterEventsAfter(events, "7").map((event) => event.cursor)).toEqual([
      "8",
    ]);
  });

  it("accepts strictly ordered pages and rejects malformed ordering", () => {
    const page = parseClientSyncPage({
      events: [
        {
          cursor: "11",
          topic: "deals",
          eventType: "contract.signed",
          aggregateType: "deal",
          aggregateId: "deal-1",
        },
        {
          cursor: "12",
          topic: "deals",
          eventType: "financials.activated",
          aggregateType: "deal",
          aggregateId: "deal-1",
        },
      ],
      nextCursor: "12",
      hasMore: false,
      resetRequired: false,
    });

    expect(page.nextCursor).toBe("12");

    expect(() =>
      parseClientSyncPage({
        events: [
          {
            cursor: "12",
            topic: "deals",
            eventType: "first",
            aggregateType: "deal",
            aggregateId: "deal-1",
          },
          {
            cursor: "12",
            topic: "deals",
            eventType: "duplicate",
            aggregateType: "deal",
            aggregateId: "deal-1",
          },
        ],
        nextCursor: "12",
        hasMore: false,
        resetRequired: false,
      }),
    ).toThrow("strictly ordered");
  });

  it("invalidates deal collections and matching contract workspaces", () => {
    const detail = {
      events: [
        {
          cursor: "15",
          topic: "deals",
          eventType: "payment.completed",
          aggregateType: "deal",
          aggregateId: "deal-1",
          payload: {
            relatedIds: ["contract-1", "payment-1"],
          },
        },
      ],
      nextCursor: "15",
      resetRequired: false,
    };

    expect(shouldInvalidateFromSync(detail, "deals")).toBe(true);
    expect(
      shouldInvalidateFromSync(detail, "deals", "contract-1"),
    ).toBe(true);
    expect(
      shouldInvalidateFromSync(detail, "deals", "contract-2"),
    ).toBe(false);
    expect(
      shouldInvalidateFromSync(
        { events: [], nextCursor: "15", resetRequired: true },
        "deals",
        "contract-2",
      ),
    ).toBe(true);
  });

  it("caps retry backoff at thirty seconds", () => {
    expect(retryDelayMs(1)).toBe(2_000);
    expect(retryDelayMs(2)).toBe(4_000);
    expect(retryDelayMs(10)).toBe(30_000);
  });
});