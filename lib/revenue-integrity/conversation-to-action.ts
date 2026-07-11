import { createHash } from "node:crypto";
import { rawPrisma } from "@/lib/prisma";
import { createOffer, scheduleTour } from "@/lib/domain/transaction-spine";
import { appendRevenueEvent } from "./events";
import type { ExtractedConversationEntities, SuggestedActionType } from "./contracts";

export type ConversationAnalysisInput = {
  tenantId: string;
  actorId: string;
  sourceType: "WHATSAPP" | "EMAIL" | "SUPPORT" | "MANUAL";
  sourceId: string;
  text: string;
  leadId?: string;
  opportunityId?: string;
  unitId?: string;
  contactId?: string;
};

function normalizeDigits(value: string) {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const eastern = "۰۱۲۳۴۵۶۷۸۹";
  return value
    .replace(/[٠-٩]/g, (digit) => String(arabic.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(eastern.indexOf(digit)));
}

function numericAmount(raw: string, suffix?: string): number | undefined {
  const value = Number(normalizeDigits(raw).replace(/[,\s]/g, ""));
  if (!Number.isFinite(value)) return undefined;
  const normalizedSuffix = String(suffix || "").toLowerCase();
  if (["مليون", "million", "m"].includes(normalizedSuffix)) return value * 1_000_000;
  if (["ألف", "الف", "thousand", "k"].includes(normalizedSuffix)) return value * 1_000;
  return value;
}

function extractEntities(input: ConversationAnalysisInput): ExtractedConversationEntities {
  const text = normalizeDigits(input.text);
  const entities: ExtractedConversationEntities = {
    leadId: input.leadId,
    opportunityId: input.opportunityId,
    unitId: input.unitId,
    contactId: input.contactId,
  };

  const budgetMatch = text.match(/(?:ميزاني(?:ة|تي)|budget)\s*[:\-]?\s*([\d,.]+)\s*(مليون|ألف|الف|million|thousand|m|k)?/i);
  if (budgetMatch) entities.budget = numericAmount(budgetMatch[1], budgetMatch[2]);

  const amountMatch = text.match(/(?:المبلغ|دفعة|سداد|amount|payment)\s*[:\-]?\s*([\d,.]+)\s*(مليون|ألف|الف|million|thousand|m|k)?/i);
  if (amountMatch) entities.amount = numericAmount(amountMatch[1], amountMatch[2]);

  const cityNames = [
    ["الرياض", "Riyadh"], ["جدة", "Jeddah"], ["الدمام", "Dammam"],
    ["مكة", "Makkah"], ["المدينة", "Madinah"], ["الخبر", "Khobar"],
  ] as const;
  for (const [ar, en] of cityNames) {
    if (text.includes(ar) || text.toLowerCase().includes(en.toLowerCase())) {
      entities.city = en;
      break;
    }
  }

  const propertyTypes: Array<[RegExp, string]> = [
    [/(فيلا|villa)/i, "VILLA"], [/(شقة|apartment)/i, "APARTMENT"],
    [/(أرض|ارض|land)/i, "LAND"], [/(مكتب|office)/i, "OFFICE"],
    [/(تجاري|commercial)/i, "COMMERCIAL"],
  ];
  for (const [pattern, type] of propertyTypes) {
    if (pattern.test(text)) {
      entities.propertyType = type;
      break;
    }
  }

  const isoDate = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const dmyDate = text.match(/\b(\d{1,2})[-\/]([01]?\d)[-\/](20\d{2})\b/);
  if (isoDate) entities.requestedDate = isoDate[1];
  else if (dmyDate) entities.requestedDate = `${dmyDate[3]}-${dmyDate[2].padStart(2, "0")}-${dmyDate[1].padStart(2, "0")}`;

  const time = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (time) entities.requestedTime = `${time[1].padStart(2, "0")}:${time[2]}`;

  const promiseMatch = text.match(/(?:أسدد|سأدفع|وعد.*دفع|pay on|payment on)[^\d]*(20\d{2}-\d{2}-\d{2})/i);
  if (promiseMatch) entities.paymentPromiseDate = promiseMatch[1];

  const objections: Array<[RegExp, string]> = [
    [/(السعر مرتفع|غالي|expensive|too high)/i, "PRICE"],
    [/(الموقع|location)/i, "LOCATION"],
    [/(تمويل|mortgage|finance)/i, "FINANCING"],
    [/(غير جاهز|not ready|later)/i, "TIMING"],
  ];
  for (const [pattern, value] of objections) {
    if (pattern.test(text)) {
      entities.objection = value;
      break;
    }
  }

  return entities;
}

function inferIntent(text: string, entities: ExtractedConversationEntities) {
  const value = text.toLowerCase();
  if (/(زيارة|جولة|معاينة|موعد|visit|tour|viewing)/i.test(value)) return "SCHEDULE_TOUR";
  if (/(عرض|سعر نهائي|خصم|offer|quotation|discount)/i.test(value)) return "REQUEST_OFFER";
  if (/(دفعة|سداد|فاتورة|قسط|payment|invoice|installment)/i.test(value)) return "PAYMENT_FOLLOW_UP";
  if (entities.objection) return "HANDLE_OBJECTION";
  if (/(مهتم|أرغب|أريد|interested|looking for|want)/i.test(value)) return "PROPERTY_INTEREST";
  return "FOLLOW_UP";
}

function buildSuggestion(intent: string, entities: ExtractedConversationEntities): {
  actionType: SuggestedActionType;
  payload: Record<string, unknown>;
  rationaleAr: string;
  rationaleEn: string;
  confidence: number;
} {
  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  if (intent === "SCHEDULE_TOUR") {
    const date = entities.requestedDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const time = entities.requestedTime || "17:00";
    return {
      actionType: "SCHEDULE_TOUR",
      payload: { startAt: `${date}T${time}:00`, location: entities.city || "Site visit", attendees: 1 },
      rationaleAr: "المحادثة تحتوي طلباً واضحاً لتحديد جولة أو معاينة.",
      rationaleEn: "The conversation contains a clear request for a tour or viewing.",
      confidence: entities.requestedDate ? 0.93 : 0.82,
    };
  }

  if (intent === "REQUEST_OFFER") {
    return {
      actionType: "CREATE_OFFER",
      payload: {
        price: entities.amount || entities.budget || 0,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      rationaleAr: "العميل طلب عرضاً أو سعراً تفاوضياً.",
      rationaleEn: "The customer requested an offer or negotiated price.",
      confidence: entities.amount || entities.budget ? 0.9 : 0.76,
    };
  }

  if (intent === "PAYMENT_FOLLOW_UP") {
    return {
      actionType: "COLLECTION_FOLLOW_UP",
      payload: { dueAt: entities.paymentPromiseDate ? `${entities.paymentPromiseDate}T09:00:00` : dueAt, amount: entities.amount || 0 },
      rationaleAr: "المحادثة تتضمن سداداً أو وعداً بالدفع وتحتاج متابعة تحصيل.",
      rationaleEn: "The conversation includes a payment commitment requiring collection follow-up.",
      confidence: entities.paymentPromiseDate || entities.amount ? 0.92 : 0.78,
    };
  }

  return {
    actionType: "FOLLOW_UP",
    payload: { dueAt, objection: entities.objection || null },
    rationaleAr: "تحتاج المحادثة إلى متابعة بشرية منظمة بإجراء وموعد.",
    rationaleEn: "The conversation requires a structured human follow-up with a due date.",
    confidence: entities.objection ? 0.84 : 0.68,
  };
}

export async function analyzeConversationToAction(input: ConversationAnalysisInput) {
  const text = String(input.text || "").trim();
  if (text.length < 3) throw new Error("CONVERSATION_TEXT_REQUIRED");
  if (!input.sourceId.trim()) throw new Error("SOURCE_ID_REQUIRED");

  if (input.leadId) {
    const lead = await rawPrisma.lead.findFirst({ where: { id: input.leadId, tenantId: input.tenantId } });
    if (!lead) throw new Error("CROSS_TENANT_LEAD_ACCESS_DENIED");
  }
  if (input.opportunityId) {
    const opportunity = await rawPrisma.opportunity.findFirst({ where: { id: input.opportunityId, tenantId: input.tenantId } });
    if (!opportunity) throw new Error("CROSS_TENANT_OPPORTUNITY_ACCESS_DENIED");
  }
  if (input.unitId) {
    const unit = await rawPrisma.unit.findFirst({ where: { id: input.unitId, tenantId: input.tenantId } });
    if (!unit) throw new Error("CROSS_TENANT_UNIT_ACCESS_DENIED");
  }
  if (input.contactId) {
    const contact = await rawPrisma.contact.findFirst({ where: { id: input.contactId, tenantId: input.tenantId } });
    if (!contact) throw new Error("CROSS_TENANT_CONTACT_ACCESS_DENIED");
  }

  const entities = extractEntities({ ...input, text });
  const intent = inferIntent(text, entities);
  const suggestion = buildSuggestion(intent, entities);
  const sourceTextHash = createHash("sha256").update(text).digest("hex");

  const existing = await rawPrisma.revenueActionSuggestion.findFirst({
    where: {
      tenantId: input.tenantId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceTextHash,
      status: { in: ["PENDING_APPROVAL", "APPROVED", "EXECUTED"] },
    },
  });
  if (existing) return existing;

  const created = await rawPrisma.revenueActionSuggestion.create({
    data: {
      tenantId: input.tenantId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceTextHash,
      opportunityId: input.opportunityId || null,
      contactId: input.contactId || null,
      leadId: input.leadId || null,
      unitId: input.unitId || null,
      intent,
      extractedEntities: entities as any,
      actionType: suggestion.actionType,
      actionPayload: suggestion.payload as any,
      confidence: suggestion.confidence,
      rationaleAr: suggestion.rationaleAr,
      rationaleEn: suggestion.rationaleEn,
      createdBy: input.actorId,
    },
  });

  await appendRevenueEvent({
    tenantId: input.tenantId,
    actorId: input.actorId,
    aggregateType: "RevenueActionSuggestion",
    aggregateId: created.id,
    eventType: "ACTION_SUGGESTION_CREATED",
    idempotencyKey: `suggestion-created:${created.id}`,
    after: created,
    metadata: { intent, sourceType: input.sourceType },
  });

  return created;
}

async function createTaskFromSuggestion(suggestion: any, actorId: string) {
  const payload = (suggestion.actionPayload || {}) as Record<string, unknown>;
  const entities = (suggestion.extractedEntities || {}) as Record<string, unknown>;
  const leadId = suggestion.leadId || entities.leadId;
  if (!leadId) throw new Error("LEAD_ID_REQUIRED_FOR_TASK");

  const lead = await (rawPrisma as any).lead.findFirst({
    where: { id: String(leadId), tenantId: suggestion.tenantId },
    select: { id: true, assignedTo: true },
  });
  if (!lead) throw new Error("LEAD_NOT_FOUND");

  const dueAt = new Date(String(payload.dueAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()));
  const title = suggestion.actionType === "COLLECTION_FOLLOW_UP" ? "متابعة تحصيل" : "متابعة العميل";
  const task = await (rawPrisma as any).task.create({
    data: {
      tenantId: suggestion.tenantId,
      leadId: lead.id,
      assignedTo: lead.assignedTo || actorId,
      title,
      description: `${suggestion.rationaleAr}\nSource: ${suggestion.sourceType}/${suggestion.sourceId}`,
      dueDate: dueAt,
      priority: suggestion.actionType === "COLLECTION_FOLLOW_UP" ? "HIGH" : "MEDIUM",
      status: "PENDING",
    },
  });

  const nextAction = await rawPrisma.revenueNextAction.create({
    data: {
      tenantId: suggestion.tenantId,
      targetType: "Lead",
      targetId: lead.id,
      opportunityId: suggestion.opportunityId || null,
      actionType: suggestion.actionType,
      title,
      description: suggestion.rationaleAr,
      assignedTo: lead.assignedTo || actorId,
      dueAt,
      sourceSuggestionId: suggestion.id,
    },
  });

  return { kind: "TASK", taskId: task.id, nextActionId: nextAction.id };
}

async function executeSuggestion(suggestion: any, actorId: string) {
  const payload = (suggestion.actionPayload || {}) as Record<string, unknown>;
  const entities = (suggestion.extractedEntities || {}) as Record<string, unknown>;

  if (["CREATE_TASK", "FOLLOW_UP", "COLLECTION_FOLLOW_UP"].includes(suggestion.actionType)) {
    return createTaskFromSuggestion(suggestion, actorId);
  }

  if (suggestion.actionType === "SCHEDULE_TOUR") {
    const leadId = suggestion.leadId || entities.leadId;
    const opportunityId = suggestion.opportunityId || entities.opportunityId;
    const unitId = suggestion.unitId || entities.unitId;
    if (!leadId) throw new Error("LEAD_ID_REQUIRED_FOR_TOUR");
    const startAt = new Date(String(payload.startAt));
    if (Number.isNaN(startAt.getTime())) throw new Error("VALID_TOUR_DATE_REQUIRED");
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    const tour = await scheduleTour({
      tenantId: suggestion.tenantId,
      userId: actorId,
      actorId,
      assignedTo: actorId,
      leadId: String(leadId),
      opportunityId: opportunityId ? String(opportunityId) : undefined,
      unitId: unitId ? String(unitId) : undefined,
      location: String(payload.location || "Site visit"),
      startAt,
      endAt,
      attendees: Number(payload.attendees || 1),
      notes: `Approved from suggestion ${suggestion.id}`,
      correlationId: suggestion.id,
    });
    return { kind: "TOUR", tourId: tour.id };
  }

  if (suggestion.actionType === "CREATE_OFFER") {
    const opportunityId = suggestion.opportunityId || entities.opportunityId;
    const unitId = suggestion.unitId || entities.unitId;
    const price = Number(payload.price || entities.amount || entities.budget || 0);
    if (!opportunityId || !unitId || !Number.isFinite(price) || price <= 0) {
      throw new Error("OPPORTUNITY_UNIT_AND_PRICE_REQUIRED_FOR_OFFER");
    }
    const validUntil = new Date(String(payload.validUntil || new Date(Date.now() + 7 * 86400000).toISOString()));
    const offer = await createOffer({
      tenantId: suggestion.tenantId,
      userId: actorId,
      opportunityId: String(opportunityId),
      unitId: String(unitId),
      price,
      validUntil,
      documentUrl: undefined,
      correlationId: suggestion.id,
    });
    return { kind: "OFFER", offerId: offer.id };
  }

  throw new Error(`UNSUPPORTED_ACTION_TYPE:${suggestion.actionType}`);
}

export async function approveActionSuggestion(tenantId: string, actorId: string, suggestionId: string) {
  const suggestion = await rawPrisma.revenueActionSuggestion.findFirst({
    where: { id: suggestionId, tenantId },
  });
  if (!suggestion) throw new Error("SUGGESTION_NOT_FOUND");

  if (suggestion.status === "APPROVED") return suggestion;
  if (suggestion.status === "REJECTED") throw new Error("CANNOT_APPROVE_REJECTED");
  if (suggestion.status === "EXECUTED") throw new Error("CANNOT_APPROVE_EXECUTED");
  if (suggestion.status === "FAILED") throw new Error("CANNOT_APPROVE_FAILED");
  if (suggestion.status !== "PENDING_APPROVAL") throw new Error("INVALID_SUGGESTION_STATUS");

  const approved = await rawPrisma.$transaction(async (tx: any) => {
    const updated = await tx.revenueActionSuggestion.update({
      where: { id: suggestion.id },
      data: { status: "APPROVED", decidedBy: actorId, decidedAt: new Date() },
    });
    await appendRevenueEvent({
      tenantId, actorId, aggregateType: "RevenueActionSuggestion", aggregateId: suggestion.id,
      eventType: "ACTION_SUGGESTION_APPROVED", idempotencyKey: `suggestion-approved:${suggestion.id}`,
      before: suggestion, after: updated,
    }, tx);
    return updated;
  });

  return approved;
}

export async function rejectActionSuggestion(tenantId: string, actorId: string, suggestionId: string, reason: string) {
  if (!reason.trim()) throw new Error("REJECTION_REASON_REQUIRED");
  const suggestion = await rawPrisma.revenueActionSuggestion.findFirst({
    where: { id: suggestionId, tenantId },
  });
  if (!suggestion) throw new Error("SUGGESTION_NOT_FOUND");

  if (suggestion.status === "REJECTED") return suggestion;
  if (suggestion.status === "APPROVED") throw new Error("CANNOT_REJECT_APPROVED");
  if (suggestion.status === "EXECUTED") throw new Error("CANNOT_REJECT_EXECUTED");
  if (suggestion.status === "FAILED") throw new Error("CANNOT_REJECT_FAILED");
  if (suggestion.status !== "PENDING_APPROVAL") throw new Error("INVALID_SUGGESTION_STATUS");

  const rejected = await rawPrisma.$transaction(async (tx: any) => {
    const updated = await tx.revenueActionSuggestion.update({
      where: { id: suggestion.id },
      data: { status: "REJECTED", decidedBy: actorId, decidedAt: new Date(), decisionReason: reason.trim() },
    });
    await appendRevenueEvent({
      tenantId, actorId, aggregateType: "RevenueActionSuggestion", aggregateId: suggestion.id,
      eventType: "ACTION_SUGGESTION_REJECTED", idempotencyKey: `suggestion-rejected:${suggestion.id}`,
      before: suggestion, after: updated,
    }, tx);
    return updated;
  });

  return rejected;
}

/** Action types that cannot execute without a linked lead. */
export const LEAD_REQUIRED_ACTION_TYPES = [
  "FOLLOW_UP",
  "COLLECTION_FOLLOW_UP",
  "CREATE_TASK",
  "SCHEDULE_TOUR",
] as const;

function resolvedSuggestionLeadId(suggestion: any): string | null {
  const entities = (suggestion.extractedEntities || {}) as Record<string, unknown>;
  const leadId = suggestion.leadId || entities.leadId;
  return leadId ? String(leadId) : null;
}

export function suggestionRequiresLeadLink(suggestion: {
  actionType: string;
  leadId?: string | null;
  extractedEntities?: unknown;
}): boolean {
  return (
    (LEAD_REQUIRED_ACTION_TYPES as readonly string[]).includes(
      suggestion.actionType,
    ) && !resolvedSuggestionLeadId(suggestion)
  );
}

function isLeadLinkRecoverableFailure(suggestion: any): boolean {
  const error =
    suggestion.executionResult &&
    typeof suggestion.executionResult.error === "string"
      ? suggestion.executionResult.error
      : "";
  return error.includes("LEAD_ID_REQUIRED");
}

export async function linkActionSuggestionLead(
  tenantId: string,
  actorId: string,
  suggestionId: string,
  leadId: string,
) {
  const normalizedLeadId = String(leadId || "").trim();
  if (!normalizedLeadId) throw new Error("LEAD_ID_REQUIRED_FOR_LINK");

  const suggestion = await rawPrisma.revenueActionSuggestion.findFirst({
    where: { id: suggestionId, tenantId },
  });
  if (!suggestion) throw new Error("SUGGESTION_NOT_FOUND");

  if (suggestion.status === "EXECUTED") throw new Error("CANNOT_LINK_EXECUTED");
  if (suggestion.status === "REJECTED") throw new Error("CANNOT_LINK_REJECTED");
  if (
    suggestion.status === "FAILED" &&
    !isLeadLinkRecoverableFailure(suggestion)
  ) {
    throw new Error("CANNOT_LINK_FAILED");
  }

  const lead = await rawPrisma.lead.findFirst({
    where: { id: normalizedLeadId, tenantId },
  });
  if (!lead) throw new Error("CROSS_TENANT_LEAD_ACCESS_DENIED");

  if (suggestion.leadId === lead.id && suggestion.status !== "FAILED") {
    return suggestion;
  }

  const healsFailure = suggestion.status === "FAILED";

  return rawPrisma.$transaction(async (tx: any) => {
    const updated = await tx.revenueActionSuggestion.update({
      where: { id: suggestion.id },
      data: {
        leadId: lead.id,
        ...(healsFailure
          ? { status: "APPROVED", executionResult: null as any }
          : {}),
      },
    });
    await appendRevenueEvent({
      tenantId,
      actorId,
      aggregateType: "RevenueActionSuggestion",
      aggregateId: suggestion.id,
      eventType: "ACTION_SUGGESTION_LEAD_LINKED",
      idempotencyKey: `suggestion-lead-linked:${suggestion.id}:${lead.id}`,
      before: suggestion,
      after: updated,
      metadata: { leadId: lead.id, healedFailure: healsFailure },
    }, tx);
    return updated;
  });
}

export async function executeActionSuggestion(tenantId: string, actorId: string, suggestionId: string) {
  const suggestion = await rawPrisma.revenueActionSuggestion.findFirst({
    where: { id: suggestionId, tenantId },
  });
  if (!suggestion) throw new Error("SUGGESTION_NOT_FOUND");

  if (suggestion.status === "EXECUTED") return suggestion;
  if (suggestion.status === "FAILED") return suggestion;
  if (suggestion.status !== "APPROVED") throw new Error("CANNOT_EXECUTE_NOT_APPROVED");

  // Precondition, not an execution failure: the suggestion stays APPROVED and
  // executable after the operator links a lead.
  if (suggestionRequiresLeadLink(suggestion)) {
    throw new Error("LEAD_LINK_REQUIRED");
  }

  let executionResult: Record<string, unknown>;
  let finalStatus: "EXECUTED" | "FAILED";

  try {
    executionResult = await executeSuggestion(suggestion, actorId);
    finalStatus = "EXECUTED";
  } catch (error) {
    executionResult = { error: error instanceof Error ? error.message : "UNKNOWN_EXECUTION_ERROR" };
    finalStatus = "FAILED";
  }

  const result = await rawPrisma.$transaction(async (tx: any) => {
    const updated = await tx.revenueActionSuggestion.update({
      where: { id: suggestion.id },
      data: { status: finalStatus, executionResult: executionResult as any, executedAt: new Date() },
    });
    const eventType = finalStatus === "EXECUTED"
      ? "ACTION_SUGGESTION_EXECUTED"
      : "ACTION_SUGGESTION_EXECUTION_FAILED";
    await appendRevenueEvent({
      tenantId, actorId, aggregateType: "RevenueActionSuggestion", aggregateId: suggestion.id,
      eventType, idempotencyKey: `suggestion-executed:${suggestion.id}`,
      before: suggestion, after: updated,
      metadata: { executionResult },
    }, tx);
    return updated;
  });

  if (finalStatus === "FAILED") {
    throw new Error(`EXECUTION_FAILED:${executionResult.error}`);
  }

  return result;
}
