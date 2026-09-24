import { prisma } from "@/lib/prisma";
import type {
  DealActorType,
  DealEntityType,
  DealEventType,
  DealPassportStatus,
  JsonRecord,
} from "./types";

export interface ListDealTimelineByContractInput {
  tenantId: string;
  contractId: string;
  afterSequence?: number;
  limit?: number;
}

export interface DealTimelineEvent {
  id: string;
  sequence: number;
  eventType: DealEventType | string;
  eventVersion: number;
  actorType: DealActorType | string;
  actorId: string | null;
  entityType: DealEntityType | string | null;
  entityId: string | null;
  correlationId: string;
  causationId: string | null;
  beforeState: JsonRecord | null;
  afterState: JsonRecord | null;
  payload: JsonRecord;
  occurredAt: Date;
  createdAt: Date;
}

export interface DealTimelinePage {
  afterSequence: number;
  nextCursor: number | null;
  hasMore: boolean;
}

export interface DealTimelineResult {
  contractId: string;
  dealId: string | null;
  opportunityId: string | null;
  dealStatus: DealPassportStatus | string | null;
  lastSequence: number;
  events: DealTimelineEvent[];
  page: DealTimelinePage;
}

function mapTimelineEvent(row: any): DealTimelineEvent {
  return {
    id: row.id,
    sequence: row.sequence,
    eventType: row.eventType,
    eventVersion: typeof row.eventVersion === "number" ? row.eventVersion : 1,
    actorType: row.actorType,
    actorId: row.actorId ?? null,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
    correlationId: row.correlationId,
    causationId: row.causationId ?? null,
    beforeState: row.beforeState !== undefined ? row.beforeState : null,
    afterState: row.afterState !== undefined ? row.afterState : null,
    payload: row.payload ?? {},
    occurredAt: row.occurredAt instanceof Date ? row.occurredAt : new Date(row.occurredAt),
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
  };
}

export async function listDealTimelineByContract(
  input: ListDealTimelineByContractInput,
): Promise<DealTimelineResult> {
  if (!input || typeof input !== "object") {
    throw new Error("Input must be an object.");
  }

  const tenantId = typeof input.tenantId === "string" ? input.tenantId.trim() : "";
  if (!tenantId) {
    throw new Error("tenantId is required.");
  }

  const contractId = typeof input.contractId === "string" ? input.contractId.trim() : "";
  if (!contractId) {
    throw new Error("contractId is required.");
  }

  let afterSequence = 0;
  if (input.afterSequence !== undefined) {
    if (
      typeof input.afterSequence !== "number" ||
      !Number.isFinite(input.afterSequence) ||
      !Number.isInteger(input.afterSequence) ||
      input.afterSequence < 0
    ) {
      throw new Error("Invalid afterSequence: must be an integer >= 0.");
    }
    afterSequence = input.afterSequence;
  }

  let limit = 50;
  if (input.limit !== undefined) {
    if (
      typeof input.limit !== "number" ||
      !Number.isFinite(input.limit) ||
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 100
    ) {
      throw new Error("Invalid limit: must be an integer between 1 and 100.");
    }
    limit = input.limit;
  }

  // 1. Verify Contract belongs to tenant.
  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      tenantId,
    },
    select: {
      id: true,
      tenantId: true,
    },
  });

  if (!contract) {
    throw new Error("Contract not found in this tenant.");
  }

  // 2. Resolve DealPassport by tenantId + contractId.
  const passport = await prisma.dealPassport.findFirst({
    where: {
      tenantId,
      contractId,
    },
  });

  // If contract exists but has no DealPassport: return empty timeline, not an error.
  if (!passport) {
    return {
      contractId: contract.id,
      dealId: null,
      opportunityId: null,
      dealStatus: null,
      lastSequence: 0,
      events: [],
      page: {
        afterSequence,
        nextCursor: null,
        hasMore: false,
      },
    };
  }

  // 3. Query DealEvent by tenantId + dealId.
  const rows = await prisma.dealEvent.findMany({
    where: {
      tenantId,
      dealId: passport.id,
      sequence: {
        gt: afterSequence,
      },
    },
    orderBy: {
      sequence: "asc",
    },
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const events = pageRows.map(mapTimelineEvent);
  const nextCursor = hasMore && events.length > 0 ? events[events.length - 1].sequence : null;

  return {
    contractId: contract.id,
    dealId: passport.id,
    opportunityId: passport.opportunityId ?? null,
    dealStatus: passport.status ?? null,
    lastSequence: typeof passport.lastSequence === "number" ? passport.lastSequence : 0,
    events,
    page: {
      afterSequence,
      nextCursor,
      hasMore,
    },
  };
}
