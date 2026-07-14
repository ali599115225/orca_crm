import {
  MarketingProvider,
  MarketingProviderAdapter,
  MarketingProviderError,
} from "@/lib/marketing/campaign-contract";

const adapters = new Map<MarketingProvider, MarketingProviderAdapter>();

export function registerMarketingProviderAdapter(
  adapter: MarketingProviderAdapter,
  options: { replace?: boolean } = {},
): void {
  if (adapters.has(adapter.provider) && !options.replace) {
    throw new MarketingProviderError(
      "MARKETING_PROVIDER_ALREADY_REGISTERED",
      adapter.provider,
    );
  }

  adapters.set(adapter.provider, adapter);
}

export function getMarketingProviderAdapter(
  provider: MarketingProvider,
): MarketingProviderAdapter {
  const adapter = adapters.get(provider);

  if (!adapter) {
    throw new MarketingProviderError(
      "MARKETING_PROVIDER_NOT_REGISTERED",
      provider,
    );
  }

  return adapter;
}

export function listRegisteredMarketingProviders(): MarketingProvider[] {
  return Array.from(adapters.keys());
}

export function clearMarketingProviderRegistry(): void {
  adapters.clear();
}
