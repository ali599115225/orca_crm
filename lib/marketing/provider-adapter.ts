/**
 * Production marketing connectors are not implemented in this repository yet.
 * Registration stays intentionally empty so the orchestrator fails closed with
 * MARKETING_PROVIDER_NOT_REGISTERED and the channel becomes CONNECTOR_NOT_READY.
 */
export function registerProductionMarketingAdapters(): void {
  // Intentionally no-op until a real provider-specific remote adapter is implemented.
}
