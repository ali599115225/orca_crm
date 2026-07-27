const REQUIRED_TENANT_MODEL_VALUES = [
  "User",
  "Project",
  "Lead",
  "LeadActivity",
  "Task",
  "Ticket",
  "AgentSlot",
  "UsageMeter",
  "PayrollCommission",
  "Unit",
  "Contract",
  "PaymentPlan",
  "Installment",
  "RentalLease",
  "Invoice",
  "ZatcaDevice",
  "ZatcaQueue",
  "AgentTelemetryLog",
  "AuditLog",
  "GovernmentOutbox",
  "FollowupSequence",
  "MansourChat",
  "PlatformConnection",
  "AgentLease",
  "CommissionPayment",
  "Receipt",
  "GeneralLedger",
  "Account",
  "AccountBalance",
  "JournalEntry",
  "PaymentTransaction",
  "Contact",
  "Opportunity",
  "DealPassport",
  "DealEvent",
  "Tour",
  "Offer",
  "AutomationWorkflow",
  "TelemetryEvent",
  "UserFavorite",
  "MaintenanceTicket",
  "WhatsAppContact",
  "WhatsAppMessage",
  "EmailMessage",
  "WhatsAppConnection",
  "WhatsAppPhoneNumber",
  "WhatsAppSignupSession",
  "WhatsAppTemplate",
  "WhatsAppIntegrationAudit",
  "WhatsAppConsent",
  "WhatsAppOptOut",
  "SyncEvent",
  "RevenueRiskSignal",
  "RevenueRuleRun",
  "RevenueNextAction",
  "RevenueActionSuggestion",
  "RevenueDomainEvent",
  "RevenueAuditEntry",
  "RevenueOutboxMessage",
  "RevenueProviderConnection",
  "RevenueProviderWebhook",
  "RevenueProviderApplication",
  "RevenueDatasetSnapshot",
  "RevenueModelVersion",
  "RevenuePrediction",
  "RevenueIntelligenceScore",
  "RevenuePredictiveRun",
  "MarketingCampaign",
  "MarketingCampaignChannel",
  "Document",
  "CustomerPrincipal",
  "CustomerPrincipalIdentity",
  "CustomerPrincipalSubjectGrant",
  "CustomerSession",
  "CustomerAuthChallenge",
  "CommercialOffer",
  "OfferVersion",
  "PricingPolicyVersion",
  "OfferPricingSnapshot",
  "OfferPricingComponent",
  "OfferApprovalRequirement",
  "OfferApprovalDecision",
  "AcceptanceIntent",
  "DeclineIntent",
  "AcceptanceEvidence",
  "DeclineEvidence",
  "AcceptanceCompletionAttempt",
  "PreparationRequest",
  "OfferStateHistory",
  "OfferVersionStateHistory",
  "IdempotencyRecord",
  "DelegatedBusinessOperation",
  "RecordRetentionAssignment",
  "CustomerSecurityEvent",
  "SecurityEventReadAudit",
  "DispositionAudit",
  "LegalHoldRecord",
] as const;

const OPTIONAL_TENANT_MODEL_VALUES = [
  // Platform-wide Sentinel incident records may exist before a tenant is known.
  "SentinelIncident",
  // Sentinel task orders can represent control-plane orchestration across tenants.
  "SentinelTaskOrder",
  // Webhook ingress may be persisted before tenant binding is resolved.
  "WhatsAppWebhookEvent",
] as const;

export const REQUIRED_TENANT_MODELS = [...REQUIRED_TENANT_MODEL_VALUES];
export const OPTIONAL_TENANT_MODELS = [...OPTIONAL_TENANT_MODEL_VALUES];

export type RequiredTenantModel = (typeof REQUIRED_TENANT_MODEL_VALUES)[number];
export type OptionalTenantModel = (typeof OPTIONAL_TENANT_MODEL_VALUES)[number];
export type TenantModelPolicyName = RequiredTenantModel | OptionalTenantModel;

const REQUIRED_TENANT_MODEL_SET = new Set<string>(REQUIRED_TENANT_MODELS);
const OPTIONAL_TENANT_MODEL_SET = new Set<string>(OPTIONAL_TENANT_MODELS);

if (REQUIRED_TENANT_MODELS.length !== 97) {
  throw new Error(`Invalid required tenant model registry size: ${REQUIRED_TENANT_MODELS.length}`);
}

if (OPTIONAL_TENANT_MODELS.length !== 3) {
  throw new Error(`Invalid optional tenant model registry size: ${OPTIONAL_TENANT_MODELS.length}`);
}

for (const model of REQUIRED_TENANT_MODELS) {
  if (OPTIONAL_TENANT_MODEL_SET.has(model)) {
    throw new Error(`Tenant model registry overlap detected for model "${model}"`);
  }
}

export function isRequiredTenantModel(model: string): model is RequiredTenantModel {
  return REQUIRED_TENANT_MODEL_SET.has(model);
}

export function isOptionalTenantModel(model: string): model is OptionalTenantModel {
  return OPTIONAL_TENANT_MODEL_SET.has(model);
}
