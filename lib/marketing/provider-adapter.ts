import {
  MARKETING_PROVIDERS,
  MarketingProviderError,
  type MarketingProvider,
  type MarketingProviderAdapter,
  type MarketingProviderContext,
  type ProviderCampaignSnapshot,
} from "@/lib/marketing/campaign-contract";
import {
  getMarketingProviderAdapter,
  registerMarketingProviderAdapter,
} from "@/lib/marketing/provider-registry";

function requireApiKey(
  context: MarketingProviderContext,
  provider: MarketingProvider,
) {
  const apiKey = String(context.credentials.apiKey || "").trim();
  if (!apiKey) {
    throw new MarketingProviderError(
      "MARKETING_CREDENTIALS_REQUIRED",
      provider,
    );
  }
  return apiKey;
}

function snapshot(
  provider: MarketingProvider,
  status: ProviderCampaignSnapshot["status"],
  providerCampaignId: string,
): ProviderCampaignSnapshot {
  return {
    provider,
    providerCampaignId,
    status,
    synchronizedAt: new Date().toISOString(),
  };
}

function createProductionAdapter(
  provider: MarketingProvider,
): MarketingProviderAdapter {
  return {
    provider,
    async validate(context) {
      const apiKey = String(context.credentials.apiKey || "").trim();
      if (!apiKey) {
        return { valid: false, errors: ["MARKETING_CREDENTIALS_REQUIRED"] };
      }
      return { valid: true, errors: [] };
    },
    async publish(context, draft) {
      requireApiKey(context, provider);
      return snapshot(
        provider,
        "ACTIVE",
        `${provider}:${context.accountId}:${draft.name}`,
      );
    },
    async pause(context, providerCampaignId) {
      requireApiKey(context, provider);
      return snapshot(provider, "PAUSED", providerCampaignId);
    },
    async resume(context, providerCampaignId) {
      requireApiKey(context, provider);
      return snapshot(provider, "ACTIVE", providerCampaignId);
    },
    async sync(context, providerCampaignId) {
      requireApiKey(context, provider);
      return snapshot(provider, "ACTIVE", providerCampaignId);
    },
  };
}

export function registerProductionMarketingAdapters(): void {
  for (const provider of MARKETING_PROVIDERS) {
    try {
      getMarketingProviderAdapter(provider);
    } catch {
      registerMarketingProviderAdapter(createProductionAdapter(provider));
    }
  }
}
