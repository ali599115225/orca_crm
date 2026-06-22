export type DealEventType =
  | "deal.opened"
  | "offer.created"
  | "offer.accepted"
  | "contract.issued";

export type DealPassportStatus =
  | "OPEN"
  | "OFFERED"
  | "OFFER_ACCEPTED"
  | "CONTRACT_ISSUED";

export type DealEntityType = "opportunity" | "offer" | "contract";

export type JsonRecord = Record<string, string | number | boolean | null>;

export interface DealCommandContext {
  tenantId: string;
  actorId?: string | null;
  correlationId?: string | null;
}

export interface ResolveDealInput extends DealCommandContext {
  opportunityId?: string | null;
  contractId?: string | null;
}

export interface AppendDealEventInput extends DealCommandContext {
  dealId: string;
  eventType: DealEventType;
  idempotencyKey: string;
  entityType?: DealEntityType;
  entityId?: string | null;
  payload?: JsonRecord;
  projection?: {
    opportunityId?: string | null;
    contractId?: string | null;
    currentOfferId?: string | null;
    status?: DealPassportStatus;
  };
}

export interface ResolveDealResult {
  passport: any | null;
  created: boolean;
  skipped: boolean;
}

export interface AppendDealEventResult {
  passport: any | null;
  event: any | null;
  idempotent: boolean;
  skipped: boolean;
}
