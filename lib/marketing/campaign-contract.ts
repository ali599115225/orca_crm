export const MARKETING_PROVIDERS = [
  "META",
  "GOOGLE",
  "TIKTOK",
  "SNAPCHAT",
  "TWITTER",
  "LINKEDIN",
] as const;

export type MarketingProvider = (typeof MARKETING_PROVIDERS)[number];

export const CAMPAIGN_OBJECTIVES = [
  "LEAD_GENERATION",
  "TRAFFIC",
  "CONVERSIONS",
  "AWARENESS",
] as const;

export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number];

export type CampaignRemoteStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "UNKNOWN";

export interface CampaignAudience {
  locations: string[];
  ageMin?: number;
  ageMax?: number;
  languages?: string[];
  interests?: string[];
}

export interface CampaignCreative {
  headline: string;
  primaryText: string;
  destinationUrl: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface CampaignDraft {
  name: string;
  objective: CampaignObjective;
  budget: {
    kind: "DAILY" | "LIFETIME";
    amount: number;
    currency: string;
  };
  audience: CampaignAudience;
  creative: CampaignCreative;
  startAt?: string;
  endAt?: string;
  tracking?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  providerOptions?: Readonly<Record<string, unknown>>;
}

export interface ProviderCampaignSnapshot {
  provider: MarketingProvider;
  providerCampaignId: string;
  status: CampaignRemoteStatus;
  remoteUrl?: string;
  synchronizedAt: string;
  rawReference?: string;
}

export interface MarketingProviderContext {
  tenantId: string;
  userId: string;
  connectionId: string;
  provider: MarketingProvider;
  accountId: string;
  credentials: Readonly<Record<string, string>>;
}

export interface MarketingProviderValidation {
  valid: boolean;
  errors: string[];
}

export interface MarketingProviderAdapter {
  readonly provider: MarketingProvider;

  validate(
    context: MarketingProviderContext,
    draft: CampaignDraft,
  ): Promise<MarketingProviderValidation>;

  publish(
    context: MarketingProviderContext,
    draft: CampaignDraft,
  ): Promise<ProviderCampaignSnapshot>;

  pause(
    context: MarketingProviderContext,
    providerCampaignId: string,
  ): Promise<ProviderCampaignSnapshot>;

  resume(
    context: MarketingProviderContext,
    providerCampaignId: string,
  ): Promise<ProviderCampaignSnapshot>;

  sync(
    context: MarketingProviderContext,
    providerCampaignId: string,
  ): Promise<ProviderCampaignSnapshot>;
}

export type CampaignCommand =
  | { type: "PUBLISH"; draft: CampaignDraft }
  | { type: "PAUSE"; providerCampaignId: string }
  | { type: "RESUME"; providerCampaignId: string }
  | { type: "SYNC"; providerCampaignId: string };

export class MarketingProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly provider?: MarketingProvider,
    public readonly retryable = false,
  ) {
    super(code);
    this.name = "MarketingProviderError";
  }
}

function assertHttpsUrl(value: string, code: string): void {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new MarketingProviderError(code);
  }

  if (parsed.protocol !== "https:") {
    throw new MarketingProviderError(code);
  }
}

export function assertCampaignDraft(draft: CampaignDraft): void {
  if (!draft.name?.trim() || draft.name.trim().length < 3) {
    throw new MarketingProviderError("CAMPAIGN_NAME_REQUIRED");
  }

  if (!CAMPAIGN_OBJECTIVES.includes(draft.objective)) {
    throw new MarketingProviderError("CAMPAIGN_OBJECTIVE_INVALID");
  }

  if (!Number.isFinite(draft.budget?.amount) || draft.budget.amount <= 0) {
    throw new MarketingProviderError("CAMPAIGN_BUDGET_INVALID");
  }

  if (!/^[A-Z]{3}$/.test(draft.budget.currency)) {
    throw new MarketingProviderError("CAMPAIGN_CURRENCY_INVALID");
  }

  if (!draft.audience?.locations?.length) {
    throw new MarketingProviderError("CAMPAIGN_LOCATION_REQUIRED");
  }

  if (
    draft.audience.ageMin !== undefined &&
    draft.audience.ageMax !== undefined &&
    draft.audience.ageMin > draft.audience.ageMax
  ) {
    throw new MarketingProviderError("CAMPAIGN_AGE_RANGE_INVALID");
  }

  if (!draft.creative?.headline?.trim()) {
    throw new MarketingProviderError("CAMPAIGN_HEADLINE_REQUIRED");
  }

  if (!draft.creative?.primaryText?.trim()) {
    throw new MarketingProviderError("CAMPAIGN_PRIMARY_TEXT_REQUIRED");
  }

  assertHttpsUrl(
    draft.creative.destinationUrl,
    "CAMPAIGN_DESTINATION_URL_INVALID",
  );

  if (draft.creative.imageUrl) {
    assertHttpsUrl(draft.creative.imageUrl, "CAMPAIGN_IMAGE_URL_INVALID");
  }

  if (draft.creative.videoUrl) {
    assertHttpsUrl(draft.creative.videoUrl, "CAMPAIGN_VIDEO_URL_INVALID");
  }

  if (draft.startAt && Number.isNaN(Date.parse(draft.startAt))) {
    throw new MarketingProviderError("CAMPAIGN_START_DATE_INVALID");
  }

  if (draft.endAt && Number.isNaN(Date.parse(draft.endAt))) {
    throw new MarketingProviderError("CAMPAIGN_END_DATE_INVALID");
  }

  if (
    draft.startAt &&
    draft.endAt &&
    Date.parse(draft.endAt) <= Date.parse(draft.startAt)
  ) {
    throw new MarketingProviderError("CAMPAIGN_DATE_RANGE_INVALID");
  }
}
