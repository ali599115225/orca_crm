import { describe, expect, it } from "vitest";
import fs from "node:fs";

const oauth = fs.readFileSync(
  "lib/marketing/tiktok-oauth.ts",
  "utf8",
);
const start = fs.readFileSync(
  "app/api/integrations/tiktok/oauth/start/route.ts",
  "utf8",
);
const callback = fs.readFileSync(
  "app/api/integrations/tiktok/oauth/callback/route.ts",
  "utf8",
);
const pending = fs.readFileSync(
  "app/api/integrations/tiktok/oauth/pending/route.ts",
  "utf8",
);
const connection = fs.readFileSync(
  "lib/marketing/tiktok-connection.ts",
  "utf8",
);

describe("TikTok OAuth foundation", () => {
  it("signs short-lived OAuth state and verifies it safely", () => {
    expect(oauth).toContain('createHmac("sha256"');
    expect(oauth).toContain("timingSafeEqual");
    expect(oauth).toContain("expiresAt");
    expect(oauth).toContain("tenantId");
    expect(oauth).toContain("userId");
  });

  it("binds OAuth initiation and callback to the active tenant", () => {
    expect(start).toContain("getActiveTenant");
    expect(callback).toContain(
      "statePayload.tenantId !== tenant.id",
    );
    expect(callback).toContain(
      "statePayload.userId !== session.userId",
    );
  });

  it("keeps tokens encrypted and out of browser JSON", () => {
    expect(callback).toContain(
      "encryptedPendingAuthorization",
    );
    expect(connection).toContain(
      "encryptText(input.accessToken)",
    );
    expect(pending).not.toContain(
      "data: pending.accessToken",
    );
  });

  it("supports explicit advertiser selection", () => {
    expect(callback).toContain(
      'tiktok: "select"',
    );
    expect(pending).toContain(
      "TIKTOK_ADVERTISER_SELECTION_INVALID",
    );
    expect(pending).toContain(
      "pending.advertisers.find",
    );
  });

  it("stores the authorized account within tenant scope", () => {
    expect(connection).toContain("tenantId_platform");
    expect(connection).toContain('platform: "TIKTOK"');
    expect(connection).toContain('status: "CONNECTED"');
  });
});
