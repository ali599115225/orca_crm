import type {
  DashboardPipelineStage,
  DashboardPipelineStageKey,
} from "./model";

export interface LegacyOpportunitySnapshot {
  status: string;
  tours: Array<{ status: string; startAt: Date }>;
  offers: Array<{
    status: string;
    validUntil: Date;
    createdAt: Date;
    contract: {
      status: string;
      signedAt: Date | null;
      cancelledAt: Date | null;
    } | null;
  }>;
}

const CLOSED_PASSPORT_STATUSES = new Set([
  "CONTRACT_SIGNED",
  "FINANCIALS_ACTIVE",
  "PAYMENT_COMPLETED",
  "PAYMENT_PLAN_RESTRUCTURED",
  "EARLY_SETTLED",
]);

export function stageFromPassportStatus(
  status: string,
): DashboardPipelineStageKey | null {
  if (status === "CANCELLED") return null;
  if (CLOSED_PASSPORT_STATUSES.has(status)) return "closed";
  if (status === "CONTRACT_ISSUED") return "contract";
  if (status === "OFFERED" || status === "OFFER_ACCEPTED") return "offer";
  if (
    status === "TOUR_SCHEDULED" ||
    status === "TOUR_COMPLETED" ||
    status === "TOUR_NO_SHOW" ||
    status === "TOUR_FOLLOW_UP"
  ) {
    return "tour";
  }

  // A cancelled visit does not cancel the deal itself. It returns to opportunity.
  return "opportunity";
}

export function stageFromLegacyOpportunity(
  snapshot: LegacyOpportunitySnapshot,
  now: Date,
): DashboardPipelineStageKey | null {
  if (snapshot.status === "LOST") return null;

  const offer = snapshot.offers[0] || null;
  const contract = offer?.contract || null;

  if (
    contract &&
    !contract.cancelledAt &&
    contract.status === "SIGNED" &&
    contract.signedAt
  ) {
    return "closed";
  }

  if (
    contract &&
    !contract.cancelledAt &&
    contract.status === "PENDING_SIGNATURE"
  ) {
    return "contract";
  }

  if (
    offer &&
    (offer.status === "PENDING" || offer.status === "ACCEPTED") &&
    offer.validUntil.getTime() >= now.getTime()
  ) {
    return "offer";
  }

  const tour = snapshot.tours[0] || null;
  if (tour && tour.status !== "CANCELLED") return "tour";

  return "opportunity";
}

export function buildPipelineStages(
  passportStatuses: string[],
  legacySnapshots: LegacyOpportunitySnapshot[],
  now: Date,
): { stages: DashboardPipelineStage[]; legacyFallbackCount: number } {
  const counts: Record<DashboardPipelineStageKey, number> = {
    opportunity: 0,
    tour: 0,
    offer: 0,
    contract: 0,
    closed: 0,
  };

  for (const status of passportStatuses) {
    const stage = stageFromPassportStatus(status);
    if (stage) counts[stage] += 1;
  }

  let legacyFallbackCount = 0;
  for (const snapshot of legacySnapshots) {
    const stage = stageFromLegacyOpportunity(snapshot, now);
    if (!stage) continue;
    counts[stage] += 1;
    legacyFallbackCount += 1;
  }

  const orderedKeys: DashboardPipelineStageKey[] = [
    "opportunity",
    "tour",
    "offer",
    "contract",
    "closed",
  ];

  return {
    stages: orderedKeys.map((key) => ({ key, count: counts[key] })),
    legacyFallbackCount,
  };
}
