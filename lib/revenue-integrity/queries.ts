import { rawPrisma } from "@/lib/prisma";
import { listProviderApplications, listProviderConnections } from "./trust-gates";

function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loadRevenueIntegrityDashboard(tenantId: string) {
  const latestRun = await rawPrisma.revenueRuleRun.findFirst({
    where: { tenantId },
    orderBy: { startedAt: "desc" },
  });

  const [
    risks,
    suggestions,
    providers,
    applications,
    events,
    audits,
    outbox,
    model,
    predictions,
  ] = await Promise.all([
    rawPrisma.revenueRiskSignal.findMany({
      where: {
        tenantId,
      },
      orderBy: [{ status: "asc" }, { severity: "desc" }, { detectedAt: "desc" }],
    }),
    rawPrisma.revenueActionSuggestion.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    listProviderConnections(tenantId),
    listProviderApplications(tenantId),
    rawPrisma.revenueDomainEvent.findMany({
      where: { tenantId },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
    rawPrisma.revenueAuditEntry.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    rawPrisma.revenueOutboxMessage.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true },
    }),
    rawPrisma.revenueModelVersion.findFirst({
      where: { tenantId },
      orderBy: { version: "desc" },
    }),
    rawPrisma.revenuePrediction.findMany({
      where: { tenantId },
      orderBy: { scoredAt: "desc" },
      take: 100,
    }),
  ]);

  const openRisks = risks.filter((risk: any) =>
    ["OPEN", "ACKNOWLEDGED"].includes(String(risk.status)),
  );
  const revenueAtRisk = openRisks.reduce(
    (sum: number, risk: any) => sum + numberValue(risk.revenueAtRisk),
    0,
  );
  const pendingSuggestions = suggestions.filter(
    (suggestion: any) => suggestion.status === "PENDING_APPROVAL",
  ).length;

  return {
    summary: {
      openRisks: openRisks.length,
      criticalRisks: openRisks.filter((risk: any) => risk.severity === "CRITICAL").length,
      revenueAtRisk,
      pendingSuggestions,
      connectedProviders: providers.filter((provider: any) => provider.status === "CONNECTED").length,
      deadLetters: outbox
        .filter((item: any) => item.status === "DEAD_LETTER")
        .reduce((sum: number, item: any) => sum + Number(item._count?._all || 0), 0),
      activeModel: model?.status === "ACTIVE" ? model.version : null,
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
    risks: risks.map((risk: any) => ({
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
    suggestions: suggestions.map((suggestion: any) => ({
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
    })),
    providers,
    applications,
    events: events.map((event: any) => ({
      id: event.id,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType,
      correlationId: event.correlationId,
      occurredAt: iso(event.occurredAt),
      metadata: event.metadata,
    })),
    audits: audits.map((entry: any) => ({
      id: entry.id,
      actorId: entry.actorId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      correlationId: entry.correlationId,
      createdAt: iso(entry.createdAt),
    })),
    outbox: outbox.map((item: any) => ({
      status: item.status,
      count: Number(item._count?._all || 0),
    })),
    model: model
      ? {
          id: model.id,
          version: model.version,
          status: model.status,
          algorithm: model.algorithm,
          metrics: model.metrics,
          minimumRows: model.minimumRows,
          driftScore: model.driftScore == null ? null : numberValue(model.driftScore),
          driftStatus: model.driftStatus,
          activatedAt: iso(model.activatedAt),
          failureReason: model.failureReason,
          createdAt: iso(model.createdAt),
        }
      : null,
    predictions: predictions.map((prediction: any) => ({
      id: prediction.id,
      opportunityId: prediction.opportunityId,
      probability: numberValue(prediction.probability),
      confidence: numberValue(prediction.confidence),
      explanation: prediction.explanation,
      featureSnapshot: prediction.featureSnapshot,
      outcome: prediction.outcome,
      scoredAt: iso(prediction.scoredAt),
    })),
  };
}

export type RevenueIntegrityDashboard = Awaited<
  ReturnType<typeof loadRevenueIntegrityDashboard>
>;

export async function loadRevenueSuggestions(tenantId: string) {
  const suggestions = await rawPrisma.revenueActionSuggestion.findMany({
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
