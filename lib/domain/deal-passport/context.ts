import { randomUUID } from "node:crypto";
import type { DealActorType } from "./types";

export function ensureDealCorrelationId(
  value: string | null | undefined,
  prefix = "deal",
): string {
  const provided = String(value || "").trim();
  if (provided) return provided.slice(0, 200);
  return `${prefix}:${randomUUID()}`;
}

export function resolveDealActorType(
  actorId: string | null | undefined,
  actorType?: DealActorType,
): DealActorType {
  return actorType || (actorId ? "USER" : "SYSTEM");
}
