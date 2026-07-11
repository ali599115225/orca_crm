import { rawPrisma } from "@/lib/prisma";
import type { RevenueCapabilities } from "./authorization";

function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

const FULL_ACCESS: RevenueCapabilities = {
  canReadRisks: true,
  canManageRisks: true,
  canReadActions: true,
  canApproveActions: true,
  canReadTrust: true,
  canManageTrust: true,
  canReadAudit: true,
  canReadPredictive: true,
  canManagePredictive: true,
};

export async function loadRevenueIntegrityDashboard(
  tenantId: string,
  capabilities: RevenueCapabilities = FULL_ACCESS,
) {
  const latestRun = capabilities.canReadRisks
    ? await rawPrisma.revenueRuleRun.findFirst({
        where: { tenantId },
        orderBy: { startedAt: "desc" },
      })
    : null;

  const [
    risks,
    suggestions,
    events,
    audits,
    outbox,
    model,
    predictions,
  ] = await Promise.all([
    capabilities.canReadRisks
      ? rawPrisma.revenueRiskSignal.findMany({
          where: { tenantId },
          orderBy: [
            { status: "asc" },
            { severity: "desc" },
            { detectedAt: "desc" },
          ],
        })
      : Promise.resolve([]),
    capabilities.canReadActions
      ? rawPrisma.revenueActionSuggestion.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    capabilities.canReadAudit
      ? rawPrisma.revenueDomainEvent.findMany({
          where: { tenantId },
          orderBy: { occurredAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    capabilities.canReadAudit
      ? rawPrisma.revenueAuditEntry.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    capabilities.canReadAudit
      ? rawPrisma.revenueOutboxMessage.groupBy({
          by: ["status"],
          where: { tenantId },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    capabilities.canReadPredictive
      ? rawPrisma.revenueModelVersion.findFirst({
          where: { tenantId },
          orderBy: { version: "desc" },
        })
      : Promise.resolve(null),
    capabilities.canReadPredictive
      ? rawPrisma.revenuePrediction.findMany({
          where: { tenantId },
          orderBy: { scoredAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  const openRisks = (risks as any[]).filter((risk: any) =>
    ["OPEN", "ACKNOWLEDGED"].includes(String(risk.status)),
  );
  const revenueAtRisk = openRisks.reduce(
    (sum: number, risk: any) =>
      sum + numberValue(risk.revenueAtRisk),
    0,
  );
  const pendingSuggestions = (suggestions as any[]).filter(
    (suggestion: any) =>
      suggestion.status === "PENDING_APPROVAL",
  ).length;

  return {
    summary: {
      openRisks: openRisks.length,
      criticalRisks: openRisks.filter(
        (risk: any) => risk.severity === "CRITICAL",
      ).length,
      revenueAtRisk,
      pendingSuggestions,
      deadLetters: (outbox as any[])
        .filter((item: any) => item.status === "DEAD_LETTER")
        .reduce(
          (sum: number, item: any) =>
            sum + Number(item._count?._all || 0),
          0,
        ),
      activeModel:
        (model as any)?.status === "ACTIVE"
          ? (model as any).version
          : null,
    },
    latestRun: latestRun
      ? {
          id: latestRun.id,
          startedAt: iso(latestRun.startedAt),
          completedAt: iso(latestRun.completedAt),
          detectedCount: latestRun.detectedCount,
          resolvedCount: latestRun.resolvedCount,
          skippedRules: latestRun.skippedRules,
        }
      : null,
    risks: (risks as any[]).map((risk: any) => ({
      id: risk.id,
      ruleCode: risk.ruleCode,
      subjectType: risk.subjectType,
      subjectId: risk.subjectId,
      opportunityId: risk.opportunityId,
      invoiceId: risk.invoiceId,
      severity: risk.severity,
      status: risk.status,
      reasonAr: risk.reasonAr,
      reasonEn: risk.reasonEn,
      revenueAtRisk: numberValue(risk.revenueAtRisk),
      assigneeId: risk.assigneeId,
      dueAt: iso(risk.dueAt),
      detectedAt: iso(risk.detectedAt),
      lastSeenAt: iso(risk.lastSeenAt),
      resolutionReason: risk.resolutionReason,
      metadata: risk.metadata,
    })),
    suggestions: (suggestions as any[]).map(
      (suggestion: any) => ({
        id: suggestion.id,
        sourceType: suggestion.sourceType,
        sourceId: suggestion.sourceId,
        opportunityId: suggestion.opportunityId,
        leadId: suggestion.leadId,
        unitId: suggestion.unitId,
        intent: suggestion.intent,
        extractedEntities: suggestion.extractedEntities,
        actionType: suggestion.actionType,
        actionPayload: suggestion.actionPayload,
        confidence: numberValue(suggestion.confidence),
        rationaleAr: suggestion.rationaleAr,
        rationaleEn: suggestion.rationaleEn,
        status: suggestion.status,
        decisionReason: suggestion.decisionReason,
        executionResult: suggestion.executionResult,
        createdAt: iso(suggestion.createdAt),
        decidedAt: iso(suggestion.decidedAt),
        executedAt: iso(suggestion.executedAt),
      }),
    ),
    events: (events as any[]).map((event: any) => ({
      id: event.id,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      correlationId: event.correlationId,
      occurredAt: iso(event.occurredAt),
      metadata: event.metadata,
    })),
    audits: (audits as any[]).map((entry: any) => ({
      id: entry.id,
      actorId: entry.actorId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      correlationId: entry.correlationId,
      createdAt: iso(entry.createdAt),
    })),
    outbox: (outbox as any[]).map((item: any) => ({
      status: item.status,
      count: Number(item._count?._all || 0),
    })),
    model: model
      ? {
          id: (model as any).id,
          version: (model as any).version,
          status: (model as any).status,
          algorithm: (model as any).algorithm,
          metrics: (model as any).metrics,
          minimumRows: (model as any).minimumRows,
          driftScore:
            (model as any).driftScore == null
              ? null
              : numberValue((model as any).driftScore),
          driftStatus: (model as any).driftStatus,
          activatedAt: iso((model as any).activatedAt),
          failureReason: (model as any).failureReason,
          createdAt: iso((model as any).createdAt),
        }
      : null,
    predictions: (predictions as any[]).map(
      (prediction: any) => ({
        id: prediction.id,
        opportunityId: prediction.opportunityId,
        probability: numberValue(prediction.probability),
        confidence: numberValue(prediction.confidence),
        explanation: prediction.explanation,
        featureSnapshot: prediction.featureSnapshot,
        outcome: prediction.outcome,
        scoredAt: iso(prediction.scoredAt),
      }),
    ),
  };
}

export type RevenueIntegrityDashboard = Awaited<
  ReturnType<typeof loadRevenueIntegrityDashboard>
>;

export async function loadRevenueSuggestions(
  tenantId: string,
) {
  const suggestions =
    await rawPrisma.revenueActionSuggestion.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

  return suggestions.map((suggestion: any) => ({
    id: suggestion.id,
    sourceType: suggestion.sourceType,
    sourceId: suggestion.sourceId,
    actionType: suggestion.actionType,
    intent: suggestion.intent,
    rationaleAr: suggestion.rationaleAr,
    rationaleEn: suggestion.rationaleEn,
    confidence: numberValue(suggestion.confidence),
    status: suggestion.status,
    decisionReason: suggestion.decisionReason,
    executionResult: suggestion.executionResult,
    createdAt: iso(suggestion.createdAt),
    decidedAt: iso(suggestion.decidedAt),
    executedAt: iso(suggestion.executedAt),
  }));
}
