import { describe, expect, it } from "vitest";
import fs from "node:fs";
import {
  MARKETING_PROVIDERS,
} from "@/lib/marketing/campaign-contract";

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
  });

  it("supports draft creation and provider control commands", () => {
    expect(source).toContain("createMarketingCampaignAction");
    expect(source).toContain("executeMarketingCampaignCommandAction");
    expect(source).toContain("PUBLISH");
    expect(source).toContain("PAUSE");
    expect(source).toContain("RESUME");
    expect(source).toContain("SYNC");
  });
});
