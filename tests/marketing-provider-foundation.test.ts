import { beforeEach, describe, expect, it } from "vitest";
import {
  CampaignDraft,
  MarketingProviderAdapter,
  MarketingProviderContext,
  ProviderCampaignSnapshot,
  assertCampaignDraft,
} from "@/lib/marketing/campaign-contract";
import {
  clearMarketingProviderRegistry,
  getMarketingProviderAdapter,
  registerMarketingProviderAdapter,
} from "@/lib/marketing/provider-registry";
import { executeCampaignCommand } from "@/lib/marketing/campaign-orchestrator";

const draft: CampaignDraft = {
  name: "حملة مشروع النخبة",
  objective: "LEAD_GENERATION",
  budget: {
    kind: "DAILY",
    amount: 500,
    currency: "SAR",
  },
  audience: {
    locations: ["Riyadh"],
    ageMin: 25,
    ageMax: 55,
  },
  creative: {
    headline: "امتلك وحدتك الآن",
    primaryText: "اكتشف الوحدات العقارية المتاحة.",
    destinationUrl: "https://example.com/projects/elite",
  },
};

const context: MarketingProviderContext = {
  tenantId: "tenant-1",
  userId: "user-1",
  connectionId: "connection-1",
  provider: "META",
  accountId: "account-1",
  credentials: {
    accessToken: "encrypted-at-rest-decrypted-server-side",
  },
};

function snapshot(status: ProviderCampaignSnapshot["status"]): ProviderCampaignSnapshot {
  return {
    provider: "META",
    providerCampaignId: "remote-campaign-1",
    status,
    synchronizedAt: new Date().toISOString(),
  };
}

const adapter: MarketingProviderAdapter = {
  provider: "META",
  async validate() {
    return { valid: true, errors: [] };
  },
  async publish(receivedContext) {
    expect(receivedContext.tenantId).toBe("tenant-1");
    return snapshot("ACTIVE");
  },
  async pause() {
    return snapshot("PAUSED");
  },
  async resume() {
    return snapshot("ACTIVE");
  },
  async sync() {
    return snapshot("ACTIVE");
  },
};

describe("marketing provider foundation", () => {
  beforeEach(() => {
    clearMarketingProviderRegistry();
  });

  it("validates a provider-neutral campaign draft", () => {
    expect(() => assertCampaignDraft(draft)).not.toThrow();
  });

  it("rejects invalid or insecure campaign inputs", () => {
    expect(() =>
      assertCampaignDraft({
        ...draft,
        budget: { ...draft.budget, amount: 0 },
      }),
    ).toThrow("CAMPAIGN_BUDGET_INVALID");

    expect(() =>
      assertCampaignDraft({
        ...draft,
        creative: {
          ...draft.creative,
          destinationUrl: "http://example.com",
        },
      }),
    ).toThrow("CAMPAIGN_DESTINATION_URL_INVALID");
  });

  it("registers and resolves provider adapters explicitly", () => {
    registerMarketingProviderAdapter(adapter);
    expect(getMarketingProviderAdapter("META")).toBe(adapter);
    expect(() => getMarketingProviderAdapter("GOOGLE")).toThrow(
      "MARKETING_PROVIDER_NOT_REGISTERED",
    );
  });

  it("routes publish and control commands through tenant context", async () => {
    registerMarketingProviderAdapter(adapter);

    await expect(
      executeCampaignCommand(context, {
        type: "PUBLISH",
        draft,
      }),
    ).resolves.toMatchObject({
      provider: "META",
      status: "ACTIVE",
    });

    await expect(
      executeCampaignCommand(context, {
        type: "PAUSE",
        providerCampaignId: "remote-campaign-1",
      }),
    ).resolves.toMatchObject({
      status: "PAUSED",
    });
  });

  it("fails closed without tenant context", async () => {
    registerMarketingProviderAdapter(adapter);

    await expect(
      executeCampaignCommand(
        { ...context, tenantId: "" },
        { type: "PUBLISH", draft },
      ),
    ).rejects.toThrow("TENANT_CONTEXT_REQUIRED");
  });
});
