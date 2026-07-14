import {
  assertCampaignDraft,
  CampaignCommand,
  MarketingProviderContext,
  MarketingProviderError,
  ProviderCampaignSnapshot,
} from "@/lib/marketing/campaign-contract";
import { getMarketingProviderAdapter } from "@/lib/marketing/provider-registry";

function assertContext(context: MarketingProviderContext): void {
  if (!context.tenantId) {
    throw new MarketingProviderError(
      "TENANT_CONTEXT_REQUIRED",
      context.provider,
    );
  }

  if (!context.userId) {
    throw new MarketingProviderError(
      "USER_CONTEXT_REQUIRED",
      context.provider,
    );
  }

  if (!context.connectionId || !context.accountId) {
    throw new MarketingProviderError(
      "MARKETING_CONNECTION_REQUIRED",
      context.provider,
    );
  }

  if (Object.keys(context.credentials).length === 0) {
    throw new MarketingProviderError(
      "MARKETING_CREDENTIALS_REQUIRED",
      context.provider,
    );
  }
}

function assertRemoteId(value: string, provider: MarketingProviderContext["provider"]): void {
  if (!value?.trim()) {
    throw new MarketingProviderError(
      "PROVIDER_CAMPAIGN_ID_REQUIRED",
      provider,
    );
  }
}

export async function executeCampaignCommand(
  context: MarketingProviderContext,
  command: CampaignCommand,
): Promise<ProviderCampaignSnapshot> {
  assertContext(context);

  const adapter = getMarketingProviderAdapter(context.provider);

  switch (command.type) {
    case "PUBLISH": {
      assertCampaignDraft(command.draft);

      const validation = await adapter.validate(context, command.draft);

      if (!validation.valid) {
        throw new MarketingProviderError(
          `CAMPAIGN_VALIDATION_FAILED:${validation.errors.join(",")}`,
          context.provider,
        );
      }

      return adapter.publish(context, command.draft);
    }

    case "PAUSE":
      assertRemoteId(command.providerCampaignId, context.provider);
      return adapter.pause(context, command.providerCampaignId);

    case "RESUME":
      assertRemoteId(command.providerCampaignId, context.provider);
      return adapter.resume(context, command.providerCampaignId);

    case "SYNC":
      assertRemoteId(command.providerCampaignId, context.provider);
      return adapter.sync(context, command.providerCampaignId);
  }
}
