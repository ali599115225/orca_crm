import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockGetTenantAndUser = vi.fn();
const mockLeadGroupBy = vi.fn();
const mockOpportunityFindMany = vi.fn();

vi.mock("@/lib/api-helpers", () => ({
  getTenantAndUser: (...args: unknown[]) => mockGetTenantAndUser(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      groupBy: (...args: unknown[]) => mockLeadGroupBy(...args),
    },
    opportunity: {
      findMany: (...args: unknown[]) => mockOpportunityFindMany(...args),
    },
  },
}));

import { GET } from "@/app/api/v1/reports/leads-performance/route";

function countRow(status: string, count: number) {
  return { status, _count: { _all: count } };
}

describe("GET /api/v1/reports/leads-performance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantAndUser.mockResolvedValue({ tenantId: "tenant-1" });
  });

  it("returns funnel counts from actual Lead.status rows, not multipliers", async () => {
    mockLeadGroupBy.mockResolvedValue([
      countRow("NEW", 10),
      countRow("CONTACTED", 8),
      countRow("QUALIFIED", 6),
      countRow("VISIT_SCHEDULED", 4),
      countRow("OFFER_MADE", 3),
      countRow("CONTRACT_SIGNED", 2),
      countRow("WON", 1),
      countRow("LOST", 5),
    ]);
    mockOpportunityFindMany.mockResolvedValue([]);

    const response = await GET(
      new NextRequest("http://localhost/api/v1/reports/leads-performance"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.funnel).toEqual({
      new: 10,
      contacted: 8,
      qualified: 6,
      tourScheduled: 4,
      offerSent: 3,
      closed: 3,
    });
    expect(body.data.funnel.contacted).not.toBe(Math.round(39 * 0.7));
    expect(body.data.cacSar).toBeNull();
    expect(body.data.cacSar).not.toBe(1200);
    expect(body.data.avgTimeToCloseDays).toBeNull();
    expect(body.data.avgTimeToCloseDays).not.toBe(18);
  });

  it("returns null close timing when no closed rows exist", async () => {
    mockLeadGroupBy.mockResolvedValue([countRow("NEW", 4)]);
    mockOpportunityFindMany.mockResolvedValue([]);

    const response = await GET(
      new NextRequest("http://localhost/api/v1/reports/leads-performance"),
    );
    const body = await response.json();

    expect(body.data.avgTimeToCloseDays).toBeNull();
    expect(body.data.cacSar).toBeNull();
    expect(body.data.funnel.closed).toBe(0);
  });
});
