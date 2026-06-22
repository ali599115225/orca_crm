export type DealEventType =
  | "opportunity.created"
  | "deal.opened"
  | "tour.scheduled"
  | "tour.status_changed"
  | "offer.created"
  | "offer.accepted"
  | "contract.issued"
  | "contract.signed"
  | "financials.activated"
  | "payment.completed"
  | "payment_plan.restructured"
  | "contract.cancelled";

export type DealPassportStatus =
  | "OPEN"
  | "TOUR_SCHEDULED"
  | "TOUR_COMPLETED"
  | "TOUR_CANCELLED"
  | "TOUR_NO_SHOW"
  | "TOUR_FOLLOW_UP"
  | "OFFERED"
  | "OFFER_ACCEPTED"
  | "CONTRACT_ISSUED"
  | "CONTRACT_SIGNED"
  | "FINANCIALS_ACTIVE"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_PLAN_RESTRUCTURED"
  | "CANCELLED";

export type DealEntityType =
  | "opportunity"
  | "tour"
  | "offer"
  | "contract"
  | "payment_plan"
  | "invoice"
  | "payment";

export type DealActorType = "USER" | "SYSTEM" | "PROVIDER" | "BACKFILL";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRecord = Record<string, JsonValue>;

export interface DealCommandContext {
  tenantId: string;
  actorId?: string | null;
  actorType?: DealActorType;
  correlationId?: string | null;
}

export interface ResolveDealInput extends DealCommandContext {
  opportunityId?: string | null;
  contractId?: string | null;
}

export interface AppendDealEventInput {
  tenantId: string;
  dealId: string;
  eventType: DealEventType;
  eventVersion?: number;
  idempotencyKey: string;
  correlationId: string;
  causationId?: string | null;
  actorType?: DealActorType;
  actorId?: string | null;
  entityType?: DealEntityType;
  entityId?: string | null;
  beforeState?: JsonRecord | null;
  afterState?: JsonRecord | null;
  payload?: JsonRecord;
  occurredAt?: Date;
  projection?: {
    opportunityId?: string | null;
    contractId?: string | null;
    currentOfferId?: string | null;
    status?: DealPassportStatus;
    closedAt?: Date | null;
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
