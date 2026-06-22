import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/realtime/purge-sync-events", () => ({
  purgeExpiredSyncEvents: vi.fn(),
}));

import { GET } from "@/app/api/cron/realtime-retention/route";
import { purgeExpiredSyncEvents } from "@/lib/realtime/purge-sync-events";

const purgeMock = vi.mocked(purgeExpiredSyncEvents);

describe("realtime retention cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects missing or invalid authorization", async () => {
    const missing = await GET(
      new NextRequest("http://localhost/api/cron/realtime-retention"),
    );
    const invalid = await GET(
      new NextRequest("http://localhost/api/cron/realtime-retention", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(purgeMock).not.toHaveBeenCalled();
  });

  it("purges one bounded batch for a valid cron request", async () => {
    purgeMock.mockResolvedValue(42);

    const response = await GET(
      new NextRequest("http://localhost/api/cron/realtime-retention", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(purgeMock).toHaveBeenCalledWith(5_000);
    expect(body.deleted).toBe(42);
    expect(body.batchSize).toBe(5_000);
  });
});