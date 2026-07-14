import { describe, expect, it } from "vitest";
import fs from "node:fs";

const source = fs.readFileSync(
  "app/actions/advertising-integrations.ts",
  "utf8",
);

describe("custom advertising provider actions", () => {
  it("uses tenant-scoped storage and authorization", () => {
    expect(source).toContain("getActiveTenant");
    expect(source).toContain("assertServerActionRole");
    expect(source).toContain("tenantId: tenant.id");
    expect(source).toContain('"CUSTOM_ADVERTISING"');
  });

  it("encrypts credentials and never returns them", () => {
    expect(source).toContain("encryptText");
    expect(source).toContain("hasCredentials");
    expect(source).not.toContain("credential: row.");
    expect(source).not.toContain("encryptedCredentials: row.");
  });

  it("supports API OAuth and external-link modes", () => {
    expect(source).toContain('"API"');
    expect(source).toContain('"OAUTH"');
    expect(source).toContain('"EXTERNAL_LINK"');
  });

  it("requires HTTPS and operational paths", () => {
    expect(source).toContain('url.protocol !== "https:"');
    expect(source).toContain("createCampaignPath");
    expect(source).toContain("pauseCampaignPath");
    expect(source).toContain("resumeCampaignPath");
    expect(source).toContain("syncCampaignPath");
  });

  it("does not simulate provider connectivity", () => {
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("testPlatformConnectionAction");
  });
});
