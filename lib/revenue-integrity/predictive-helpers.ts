import { createHash } from "node:crypto";

export type IntelligenceCategory =
  | "REVENUE_LEAK"
  | "COLLECTION_DELAY"
  | "DEAL_FALL"
  | "INTERVENTION_PRIORITY";

export type RiskBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type IntelligenceStatus = "READY" | "INSUFFICIENT_DATA";

export const HORIZON_DAYS: Record<IntelligenceCategory, number> = {
  COLLECTION_DELAY: 7,
  INTERVENTION_PRIORITY: 7,
  DEAL_FALL: 14,
  REVENUE_LEAK: 30,
};

export function computeRiskBand(score: number): RiskBand {
  if (score >= 85) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export function computeHorizonDays(category: IntelligenceCategory): number {
  return HORIZON_DAYS[category];
}

export function computeExpiresAt(generatedAt: Date, horizonDays: number): Date {
  return new Date(generatedAt.getTime() + horizonDays * 86_400_000);
}

export function computeFeatureHash(features: Record<string, unknown>): string {
  const sortedKeys = Object.keys(features).sort();
  const canonical: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    canonical[key] = features[key];
  }
  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

export function buildWindowKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 13);
}
