export { resolveDealInTx } from "./resolve-deal";
export { appendDealEventInTx } from "./append-event";
export { ensureDealCorrelationId, resolveDealActorType } from "./context";
export type {
  AppendDealEventInput,
  AppendDealEventResult,
  DealActorType,
  DealCommandContext,
  DealEntityType,
  DealEventType,
  DealPassportStatus,
  JsonRecord,
  JsonValue,
  ResolveDealInput,
  ResolveDealResult,
} from "./types";
