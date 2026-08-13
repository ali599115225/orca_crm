import { describe, expect, it } from "vitest";
import fs from "node:fs";
import {
  MARKETING_PROVIDERS,
} from "@/lib/marketing/campaign-contract";
import { registerProductionMarketingAdapters } from "@/lib/marketing/provider-adapter";
import {
  clearMarketingProviderRegistry,
  getMarketingProviderAdapter,
} from "@/lib/marketing/provider-registry";

const source = fs.readFileSync(
  "app/actions/marketing-campaigns.ts",
  "utf8",
);

describe("marketing campaign server actions", () => {
  it("uses the same provider identifier as platform connections", () => {
    expect(MARKETING_PROVIDERS).toContain("TWITTER");
    expect(MARKETING_PROVIDERS).not.toContain("X");
  });

  it("isolates every campaign and connection lookup by tenant", () => {
    expect(source).toContain("tenantId: tenant.id");
    expect(source).toContain("tenantId_platform");
    expect(source).toContain("channel.campaign.tenantId !== tenant.id");
  });

  it("decrypts credentials only on the server and never serializes them", () => {
    expect(source).toContain("decryptText(connection.encryptedApiKey)");
    expect(source).not.toContain("encryptedApiKey: connection.encryptedApiKey");

    const serializer = source.slice(
      source.indexOf("function serializeCampaign"),
      source.indexOf("async function requireMarketingContext"),
    );

    expect(serializer).not.toContain("encryptedApiKey");
    expect(serializer).not.toContain("apiKey");
  });

  it("fails closed when a provider connector is not registered", () => {
    expect(source).toContain("CONNECTOR_NOT_READY");
    expect(source).toContain("MARKETING_PROVIDER_NOT_REGISTERED");
    expect(source).toContain("registerProductionMarketingAdapters");
  });

  it("registers production adapters before executing campaign commands", () => {
    const commandIndex = source.indexOf("const snapshot = await executeCampaignCommand");
    const registerIndex = source.indexOf("registerProductionMarketingAdapters()");
    expect(registerIndex).toBeGreaterThan(-1);
    expect(registerIndex).toBeLessThan(commandIndex);
    expect(source).toContain("MARKETING_CONNECTION_REQUIRED");
  });

  it("supports draft creation and provider control commands", () => {
    expect(source).toContain("createMarketingCampaignAction");
    expect(source).toContain("executeMarketingCampaignCommandAction");
    expect(source).toContain("PUBLISH");
    expect(source).toContain("PAUSE");
    expect(source).toContain("RESUME");
    expect(source).toContain("SYNC");
  });

  it("keeps marketing commands fail-closed until a real production connector is registered", () => {
    clearMarketingProviderRegistry();
    registerProductionMarketingAdapters();
    expect(() => getMarketingProviderAdapter("META")).toThrow(
      "MARKETING_PROVIDER_NOT_REGISTERED",
    );
  });
});
