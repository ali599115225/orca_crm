import { rawPrisma } from "@/lib/prisma";
import { appendRevenueEvent } from "./events";
import {
  computeExpiresAt,
  computeFeatureHash,
  computeHorizonDays,
  computeRiskBand,
  buildWindowKey,
  type IntelligenceCategory,
  type RiskBand,
} from "./predictive-helpers";

const MODEL_VERSION = "RI-DETERMINISTIC-v1";
const MODEL_ALGORITHM = "RULE_BASED_DETERMINISTIC";
const RADAR_FRESHNESS_HOURS = 24;

type SeverityWeight = { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number };

const SEVERITY_WEIGHTS: SeverityWeight = { CRITICAL: 40, HIGH: 25, MEDIUM: 15, LOW: 5 };

export type PredictionReason = {
  code: string;
  label: string;
  weight: number;
  detail: string;
};

export type SourceSignal = {
  type: string;
  id: string;
  severity?: string;
  value?: number;
};

export type ScoreResult = {
  score: number;
  confidence: number;
  reasons: PredictionReason[];
  sourceSignals: SourceSignal[];
};

type RiskSignalRow = {
  id: string;
  ruleCode: string;
  severity: string;
  status: string;
  revenueAtRisk: unknown;
  opportunityId: string | null;
  invoiceId: string | null;
  subjectType: string;
  subjectId: string;
  metadata: unknown;
};

type InvoiceRow = {
  id: string;
  totalAmount: unknown;
  dueDate: Date;
  status: string;
  contractId: string | null;
};

type OpportunityRow = {
  id: string;
  status: string;
  value: unknown;
  probability: unknown;
  createdAt: Date;
  tourCount: unknown;
  offerCount: unknown;
};

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampInt(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function windowKeyForNow(): string {
  return buildWindowKey();
}

export function computeRevenueLeakScore(
  openRisks: RiskSignalRow[],
  totalRulesEvaluated: number,
): ScoreResult {
  const reasons: PredictionReason[] = [];
  const signals: SourceSignal[] = [];

  if (openRisks.length === 0) {
    return {
      score: 0,
      confidence: totalRulesEvaluated > 0 ? 90 : 30,
      reasons: [{ code: "NO_RISKS", label: "No open risk signals", weight: 0, detail: "Zero active risk signals detected" }],
      sourceSignals: [],
    };
  }

  let severityPoints = 0;
  const severityCounts: Record<string, number> = {};
  for (const risk of openRisks) {
    const weight = SEVERITY_WEIGHTS[risk.severity as keyof SeverityWeight] ?? 5;
    severityPoints += weight;
    severityCounts[risk.severity] = (severityCounts[risk.severity] || 0) + 1;
    signals.push({
      type: "RISK_SIGNAL",
      id: risk.id,
      severity: risk.severity,
      value: num(risk.revenueAtRisk),
    });
  }

  const countPoints = clamp01(openRisks.length * 0.08) * 50;
  const revenuePoints = clamp01(
    openRisks.reduce((sum, risk) => sum + num(risk.revenueAtRisk), 0) / 1_000_000,
  ) * 30;

  const rawScore = severityPoints + countPoints + revenuePoints;
  const score = clampInt(rawScore);

  for (const [severity, count] of Object.entries(severityCounts)) {
    reasons.push({
      code: `SEVERITY_${severity}`,
      label: `${count} ${severity.toLowerCase()} risk(s)`,
      weight: SEVERITY_WEIGHTS[severity as keyof SeverityWeight] ?? 5,
      detail: `${count} open ${severity} severity signal(s) contributing to leak probability`,
    });
  }

  if (countPoints > 0) {
    reasons.push({
      code: "RISK_VOLUME",
      label: `${openRisks.length} open risk(s)`,
      weight: Math.round(countPoints),
      detail: `Volume of open risks adds ${Math.round(countPoints)} pts to leak probability`,
    });
  }

  const confidence = totalRulesEvaluated > 0
    ? clampInt(50 + Math.min(totalRulesEvaluated, 10) * 5)
    : 30;

  return { score, confidence, reasons, sourceSignals: signals };
}

export function computeCollectionDelayScore(
  overdueInvoices: InvoiceRow[],
  now: Date,
): ScoreResult {
  const reasons: PredictionReason[] = [];
  const signals: SourceSignal[] = [];

  if (overdueInvoices.length === 0) {
    return {
      score: 0,
      confidence: 85,
      reasons: [{ code: "NO_OVERDUE", label: "No overdue invoices", weight: 0, detail: "All invoices are current" }],
      sourceSignals: [],
    };
  }

  let agingPoints = 0;
  let maxDaysOverdue = 0;
  let totalOverdueAmount = 0;

  for (const invoice of overdueInvoices) {
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / 86_400_000));
    maxDaysOverdue = Math.max(maxDaysOverdue, daysOverdue);
    totalOverdueAmount += num(invoice.totalAmount);
    signals.push({
      type: "OVERDUE_INVOICE",
      id: invoice.id,
      severity: daysOverdue > 30 ? "CRITICAL" : daysOverdue > 7 ? "HIGH" : "MEDIUM",
      value: num(invoice.totalAmount),
    });
    agingPoints += clamp01(daysOverdue / 90) * 30;
  }

  const countPoints = clamp01(overdueInvoices.length * 0.15) * 50;
  const agingFactor = clamp01(agingPoints / Math.max(overdueInvoices.length, 1) / 30) * 30;
  const amountPoints = clamp01(totalOverdueAmount / 500_000) * 20;

  const score = clampInt(countPoints + agingFactor + amountPoints);

  reasons.push({
    code: "OVERDUE_COUNT",
    label: `${overdueInvoices.length} overdue invoice(s)`,
    weight: Math.round(countPoints),
    detail: `${overdueInvoices.length} invoice(s) past due date`,
  });

  if (maxDaysOverdue > 0) {
    reasons.push({
      code: "MAX_AGING_DAYS",
      label: `Max ${maxDaysOverdue} days overdue`,
      weight: Math.round(agingFactor),
      detail: `Oldest overdue is ${maxDaysOverdue} days past due`,
    });
  }

  if (totalOverdueAmount > 0) {
    reasons.push({
      code: "OVERDUE_AMOUNT",
      label: `${totalOverdueAmount.toFixed(0)} SAR overdue`,
      weight: Math.round(amountPoints),
      detail: `Total overdue amount contributes to delay probability`,
    });
  }

  const confidence = clampInt(60 + Math.min(overdueInvoices.length, 5) * 6);

  return { score, confidence, reasons, sourceSignals: signals };
}

export function computeDealFallScore(
  opportunity: OpportunityRow,
  openRisks: RiskSignalRow[],
  now: Date,
): ScoreResult {
  const reasons: PredictionReason[] = [];
  const signals: SourceSignal[] = [];

  const ageDays = Math.max(0, (now.getTime() - new Date(opportunity.createdAt).getTime()) / 86_400_000);
  const probability = clamp01(num(opportunity.probability) / 100);
  const tourCount = num(opportunity.tourCount);
  const offerCount = num(opportunity.offerCount);

  let fallPoints = 0;

  const agePoints = clamp01(ageDays / 120) * 25;
  if (agePoints > 5) {
    reasons.push({
      code: "OPP_AGE",
      label: `Opportunity age: ${Math.round(ageDays)} days`,
      weight: Math.round(agePoints),
      detail: `Stale opportunity (${Math.round(ageDays)} days old) increases fall risk`,
    });
    fallPoints += agePoints;
  }

  const lowProbPoints = clamp01((0.5 - probability) * 1.2) * 30;
  if (lowProbPoints > 0) {
    reasons.push({
      code: "LOW_PROBABILITY",
      label: `Win probability: ${Math.round(probability * 100)}%`,
      weight: Math.round(lowProbPoints),
      detail: `Low base probability (${Math.round(probability * 100)}%) increases fall risk`,
    });
    fallPoints += lowProbPoints;
  }

  if (tourCount === 0) {
    reasons.push({
      code: "NO_TOURS",
      label: "No tours scheduled",
      weight: 15,
      detail: "Zero tours indicates low engagement",
    });
    fallPoints += 15;
    signals.push({ type: "MISSING_ACTIVITY", id: opportunity.id, severity: "HIGH" });
  }

  if (offerCount === 0 && ageDays > 14) {
    reasons.push({
      code: "NO_OFFERS",
      label: "No offers after 14+ days",
      weight: 15,
      detail: "No offer generated despite opportunity age",
    });
    fallPoints += 15;
    signals.push({ type: "MISSING_OFFER", id: opportunity.id, severity: "HIGH" });
  }

  const riskPoints = clamp01(openRisks.length * 0.1) * 30;
  if (riskPoints > 0) {
    reasons.push({
      code: "OPEN_RISKS",
      label: `${openRisks.length} open risk(s) on opportunity`,
      weight: Math.round(riskPoints),
      detail: "Active risk signals increase deal fall probability",
    });
    fallPoints += riskPoints;
    for (const risk of openRisks) {
      signals.push({ type: "RISK_SIGNAL", id: risk.id, severity: risk.severity });
    }
  }

  const score = clampInt(fallPoints);
  const confidence = clampInt(50 + (tourCount > 0 ? 10 : 0) + (offerCount > 0 ? 10 : 0) + Math.min(ageDays / 60, 20) * 10);

  return { score, confidence, reasons, sourceSignals: signals };
}

export function computeInterventionPriority(
  leakScore: number,
  collectionDelayScore: number,
  dealFallScore: number,
  leakConfidence: number,
  collectionConfidence: number,
  dealConfidence: number,
): ScoreResult {
  const weightedLeak = leakScore * (leakConfidence / 100) * 0.4;
  const weightedCollection = collectionDelayScore * (collectionConfidence / 100) * 0.3;
  const weightedDeal = dealFallScore * (dealConfidence / 100) * 0.3;
  const score = clampInt(weightedLeak + weightedCollection + weightedDeal);

  const reasons: PredictionReason[] = [];
  if (leakScore > 30) {
    reasons.push({
      code: "LEAK_CONTRIBUTION",
      label: `Revenue leak: ${leakScore}/100`,
      weight: Math.round(weightedLeak),
      detail: "Revenue leak risk contributes to intervention priority",
    });
  }
  if (collectionDelayScore > 30) {
    reasons.push({
      code: "COLLECTION_CONTRIBUTION",
      label: `Collection delay: ${collectionDelayScore}/100`,
      weight: Math.round(weightedCollection),
      detail: "Collection delay risk contributes to intervention priority",
    });
  }
  if (dealFallScore > 30) {
    reasons.push({
      code: "DEAL_FALL_CONTRIBUTION",
      label: `Deal fall: ${dealFallScore}/100`,
      weight: Math.round(weightedDeal),
      detail: "Deal fall risk contributes to intervention priority",
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      code: "LOW_PRIORITY",
      label: "All scores below threshold",
      weight: 0,
      detail: "No category exceeds the intervention threshold",
    });
  }

  const confidence = clampInt((leakConfidence + collectionConfidence + dealConfidence) / 3);

  return { score, confidence, reasons, sourceSignals: [] };
}

export function recommendAction(
  category: string,
  score: number,
  reasons: PredictionReason[],
  signals: SourceSignal[],
): { actionType: string; payload: Record<string, unknown> } | null {
  if (score < 20) return null;

  if (category === "REVENUE_LEAK") {
    const hasOverdue = signals.some((signal) => signal.type === "OVERDUE_INVOICE");
    const hasRisk = signals.some((signal) => signal.type === "RISK_SIGNAL");
    if (hasOverdue) {
      return { actionType: "COLLECTION_FOLLOW_UP", payload: { reason: "Revenue leak with overdue invoices detected" } };
    }
    if (hasRisk) {
      const criticalRisk = reasons.find((reason) => reason.code.startsWith("SEVERITY_CRITICAL"));
      return {
        actionType: criticalRisk ? "CREATE_TASK" : "FOLLOW_UP",
        payload: { reason: "Revenue leak risk requires immediate attention" },
      };
    }
    return { actionType: "FOLLOW_UP", payload: { reason: "Revenue leak indicators detected" } };
  }

  if (category === "COLLECTION_DELAY") {
    return { actionType: "COLLECTION_FOLLOW_UP", payload: { reason: "Collection delay detected" } };
  }

  if (category === "DEAL_FALL") {
    const noTours = reasons.some((reason) => reason.code === "NO_TOURS");
    const noOffers = reasons.some((reason) => reason.code === "NO_OFFERS");
    if (noTours) return { actionType: "SCHEDULE_TOUR", payload: { reason: "No tours scheduled - engagement needed" } };
    if (noOffers) return { actionType: "CREATE_OFFER", payload: { reason: "No offer generated - offer needed" } };
    return { actionType: "FOLLOW_UP", payload: { reason: "Deal fall indicators detected" } };
  }

  return null;
}

async function loadOpenRisksForOpportunity(tenantId: string, opportunityId: string): Promise<RiskSignalRow[]> {
  return rawPrisma.$queryRawUnsafe<RiskSignalRow[]>(`
    SELECT id, rule_code AS "ruleCode", severity, status, revenue_at_risk AS "revenueAtRisk",
           opportunity_id AS "opportunityId", invoice_id AS "invoiceId",
           subject_type AS "subjectType", subject_id AS "subjectId", metadata
    FROM revenue_risk_signals
    WHERE tenant_id = $1::uuid
      AND opportunity_id = $2::uuid
      AND status IN ('OPEN', 'ACKNOWLEDGED')
    ORDER BY
      CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
      detected_at DESC
  `, tenantId, opportunityId);
}

async function loadAllOpenRisks(tenantId: string): Promise<RiskSignalRow[]> {
  return rawPrisma.$queryRawUnsafe<RiskSignalRow[]>(`
    SELECT id, rule_code AS "ruleCode", severity, status, revenue_at_risk AS "revenueAtRisk",
           opportunity_id AS "opportunityId", invoice_id AS "invoiceId",
           subject_type AS "subjectType", subject_id AS "subjectId", metadata
    FROM revenue_risk_signals
    WHERE tenant_id = $1::uuid
      AND status IN ('OPEN', 'ACKNOWLEDGED')
    ORDER BY
      CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
      detected_at DESC
  `, tenantId);
}

async function loadOverdueInvoicesForOpportunity(tenantId: string, opportunityId: string): Promise<InvoiceRow[]> {
  return rawPrisma.$queryRawUnsafe<InvoiceRow[]>(`
    SELECT i.id, i.total_amount AS "totalAmount", i.due_date AS "dueDate",
           COALESCE(i.status::text, 'open') AS status, i.contract_id AS "contractId"
    FROM invoices i
    WHERE i.tenant_id = $1::uuid
      AND i.due_date < NOW()
      AND LOWER(COALESCE(i.status::text, '')) NOT IN ('paid', 'cancelled', 'void')
      AND i.contract_id IN (
        SELECT c.id FROM contracts c
        JOIN offers f ON f.id = c.offer_id
        WHERE f.linked_opportunity_id = $2::uuid
      )
    ORDER BY i.due_date ASC
  `, tenantId, opportunityId);
}

async function loadAllOverdueInvoices(tenantId: string): Promise<InvoiceRow[]> {
  return rawPrisma.$queryRawUnsafe<InvoiceRow[]>(`
    SELECT i.id, i.total_amount AS "totalAmount", i.due_date AS "dueDate",
           COALESCE(i.status::text, 'open') AS status, i.contract_id AS "contractId"
    FROM invoices i
    WHERE i.tenant_id = $1::uuid
      AND i.due_date < NOW()
      AND LOWER(COALESCE(i.status::text, '')) NOT IN ('paid', 'cancelled', 'void')
    ORDER BY i.due_date ASC
  `, tenantId);
}

async function loadOpenOpportunities(tenantId: string): Promise<OpportunityRow[]> {
  return rawPrisma.$queryRawUnsafe<OpportunityRow[]>(`
    SELECT
      o.id,
      COALESCE(o.status::text, '') AS status,
      COALESCE(o.value, 0) AS value,
      COALESCE(o.probability, 50) AS probability,
      o.created_at AS "createdAt",
      (SELECT COUNT(*) FROM tours t WHERE t.tenant_id = o.tenant_id AND t.opportunity_id = o.id) AS "tourCount",
      (SELECT COUNT(*) FROM offers f WHERE f.tenant_id = o.tenant_id AND f.linked_opportunity_id = o.id) AS "offerCount"
    FROM opportunities o
    WHERE o.tenant_id = $1::uuid
      AND UPPER(COALESCE(o.status::text, '')) NOT IN ('WON', 'LOST', 'CLOSED', 'CANCELLED')
    ORDER BY o.created_at ASC, o.id ASC
  `, tenantId);
}

async function loadLatestRadarRunInfo(tenantId: string): Promise<{ evaluatedRules: number; completedAt: Date | null }> {
  const run = await rawPrisma.revenueRuleRun.findFirst({
    where: { tenantId, completedAt: { not: null } },
    orderBy: { startedAt: "desc" },
  });
  if (!run) return { evaluatedRules: 0, completedAt: null };
  const result = run.result as any;
  const evaluatedRules = Array.isArray(result?.evaluatedRules) ? result.evaluatedRules.length : 0;
  return { evaluatedRules, completedAt: run.completedAt };
}

export function isRadarFresh(radarCompletedAt: Date | null, now: Date = new Date()): boolean {
  if (!radarCompletedAt) return false;
  const hoursSinceRadar = (now.getTime() - radarCompletedAt.getTime()) / 3_600_000;
  return hoursSinceRadar <= RADAR_FRESHNESS_HOURS;
}

function buildFeatureSnapshot(
  category: IntelligenceCategory,
  inputs: {
    riskCount: number;
    invoiceCount: number;
    opportunityAge?: number;
    probability?: number;
    tourCount?: number;
    offerCount?: number;
  },
): Record<string, unknown> {
  const base: Record<string, unknown> = { category, riskCount: inputs.riskCount, invoiceCount: inputs.invoiceCount };
  if (inputs.opportunityAge !== undefined) base.opportunityAge = inputs.opportunityAge;
  if (inputs.probability !== undefined) base.probability = inputs.probability;
  if (inputs.tourCount !== undefined) base.tourCount = inputs.tourCount;
  if (inputs.offerCount !== undefined) base.offerCount = inputs.offerCount;
  return base;
}

async function getPreviousBand(
  tenantId: string,
  entityType: string,
  entityId: string,
  category: IntelligenceCategory,
  windowKey: string,
): Promise<RiskBand | null> {
  const previous = await rawPrisma.revenueIntelligenceScore.findFirst({
    where: {
      tenantId,
      entityType,
      entityId,
      category,
      status: "READY",
      windowKey: { not: windowKey },
    },
    orderBy: { generatedAt: "desc" },
    select: { riskBand: true },
  });
  return previous?.riskBand as RiskBand | null;
}

async function upsertIntelligenceScore(
  tenantId: string,
  entityType: string,
  entityId: string,
  category: IntelligenceCategory,
  windowKey: string,
  params: {
    status: "READY" | "INSUFFICIENT_DATA";
    score: number | null;
    confidence: number | null;
    riskBand: RiskBand | null;
    horizonDays: number | null;
    featureHash: string | null;
    expiresAt: Date | null;
    reasons: PredictionReason[];
    sourceSignals: SourceSignal[];
    recommendation: { actionType: string; payload: Record<string, unknown> } | null;
    generatedAt: Date;
  },
) {
  const data = {
    tenantId,
    entityType,
    entityId,
    category,
    status: params.status,
    score: params.score,
    confidence: params.confidence,
    riskBand: params.riskBand,
    horizonDays: params.horizonDays,
    featureHash: params.featureHash,
    expiresAt: params.expiresAt,
    reasons: params.reasons as any,
    sourceSignals: params.sourceSignals as any,
    recommendedAction: params.recommendation?.actionType || null,
    recommendedActionPayload: (params.recommendation?.payload || null) as any,
    modelVersion: MODEL_VERSION,
    modelAlgorithm: MODEL_ALGORITHM,
    windowKey,
    generatedAt: params.generatedAt,
  };

  return rawPrisma.revenueIntelligenceScore.upsert({
    where: {
      tenantId_entityType_entityId_category_windowKey: {
        tenantId,
        entityType,
        entityId,
        category,
        windowKey,
      },
    },
    update: data,
    create: data,
  });
}

export async function scoreOpportunityIntelligence(
  tenantId: string,
  actorId: string | null,
  opportunityId: string,
) {
  const now = new Date();
  const window = windowKeyForNow();

  const [opportunityRows, radarInfo] = await Promise.all([
    rawPrisma.$queryRawUnsafe<OpportunityRow[]>(`
      SELECT
        o.id,
        COALESCE(o.status::text, '') AS status,
        COALESCE(o.value, 0) AS value,
        COALESCE(o.probability, 50) AS probability,
        o.created_at AS "createdAt",
        (SELECT COUNT(*) FROM tours t WHERE t.tenant_id = o.tenant_id AND t.opportunity_id = o.id) AS "tourCount",
        (SELECT COUNT(*) FROM offers f WHERE f.tenant_id = o.tenant_id AND f.linked_opportunity_id = o.id) AS "offerCount"
      FROM opportunities o
      WHERE o.tenant_id = $1::uuid AND o.id = $2::uuid
    `, tenantId, opportunityId),
    loadLatestRadarRunInfo(tenantId),
  ]);

  if (opportunityRows.length === 0) throw new Error("OPPORTUNITY_NOT_FOUND");
  const opportunity = opportunityRows[0];

  const radarFresh = isRadarFresh(radarInfo.completedAt, now);

  if (!radarFresh) {
    const insufficientReasons: PredictionReason[] = [{
      code: "RADAR_STALE",
      label: "Radar data is stale or missing",
      weight: 0,
      detail: `No completed radar run within the last ${RADAR_FRESHNESS_HOURS} hours`,
    }];

    const categories: IntelligenceCategory[] = ["REVENUE_LEAK", "COLLECTION_DELAY", "DEAL_FALL", "INTERVENTION_PRIORITY"];
    const scores = [];

    for (const category of categories) {
      const horizonDays = computeHorizonDays(category);
      const score = await upsertIntelligenceScore(tenantId, "Opportunity", opportunityId, category, window, {
        status: "INSUFFICIENT_DATA",
        score: null,
        confidence: null,
        riskBand: null,
        horizonDays,
        featureHash: null,
        expiresAt: computeExpiresAt(now, horizonDays),
        reasons: insufficientReasons,
        sourceSignals: [],
        recommendation: null,
        generatedAt: now,
      });
      scores.push(score);

      await appendRevenueEvent({
        tenantId,
        actorId,
        aggregateType: "RevenueIntelligenceScore",
        aggregateId: score.id,
        eventType: "PREDICTIVE_INSUFFICIENT_DATA",
        idempotencyKey: `insufficient-data:${opportunityId}:${category}:${window}`,
        after: {
          opportunityId,
          category,
          window,
          modelVersion: MODEL_VERSION,
          missingInputs: ["radar_run_fresh"],
        },
      });
    }

    return {
      opportunityId,
      window,
      status: "INSUFFICIENT_DATA" as const,
      scores: scores.map((s) => ({
        id: s.id,
        category: s.category,
        status: s.status,
        score: s.score,
        confidence: s.confidence,
        riskBand: s.riskBand,
        horizonDays: s.horizonDays,
        expiresAt: s.expiresAt?.toISOString() ?? null,
        reasons: s.reasons,
        modelVersion: s.modelVersion,
        generatedAt: s.generatedAt.toISOString(),
      })),
    };
  }

  const [risks, invoices] = await Promise.all([
    loadOpenRisksForOpportunity(tenantId, opportunityId),
    loadOverdueInvoicesForOpportunity(tenantId, opportunityId),
  ]);

  const leakResult = computeRevenueLeakScore(risks, radarInfo.evaluatedRules);
  const collectionResult = computeCollectionDelayScore(invoices, now);
  const dealFallResult = computeDealFallScore(opportunity, risks, now);
  const priorityResult = computeInterventionPriority(
    leakResult.score, collectionResult.score, dealFallResult.score,
    leakResult.confidence, collectionResult.confidence, dealFallResult.confidence,
  );

  const categoryResults: Array<{ category: IntelligenceCategory; result: ScoreResult }> = [
    { category: "REVENUE_LEAK", result: leakResult },
    { category: "COLLECTION_DELAY", result: collectionResult },
    { category: "DEAL_FALL", result: dealFallResult },
    { category: "INTERVENTION_PRIORITY", result: priorityResult },
  ];

  const scores = [];
  for (const { category, result } of categoryResults) {
    const horizonDays = computeHorizonDays(category);
    const riskBand = computeRiskBand(result.score);
    const featureSnapshot = buildFeatureSnapshot(category, {
      riskCount: risks.length,
      invoiceCount: invoices.length,
      opportunityAge: Math.max(0, (now.getTime() - new Date(opportunity.createdAt).getTime()) / 86_400_000),
      probability: num(opportunity.probability),
      tourCount: num(opportunity.tourCount),
      offerCount: num(opportunity.offerCount),
    });
    const featureHash = computeFeatureHash(featureSnapshot);
    const expiresAt = computeExpiresAt(now, horizonDays);

    let recommendation: { actionType: string; payload: Record<string, unknown> } | null = null;
    if (category !== "INTERVENTION_PRIORITY") {
      recommendation = recommendAction(category, result.score, result.reasons, result.sourceSignals);
    } else {
      const dominant = [
        { name: "REVENUE_LEAK" as const, score: leakResult.score },
        { name: "COLLECTION_DELAY" as const, score: collectionResult.score },
        { name: "DEAL_FALL" as const, score: dealFallResult.score },
      ].sort((a, b) => b.score - a.score)[0];
      recommendation = recommendAction(dominant.name, result.score, result.reasons, result.sourceSignals);
    }

    const previousBand = await getPreviousBand(tenantId, "Opportunity", opportunityId, category, window);

    const score = await upsertIntelligenceScore(tenantId, "Opportunity", opportunityId, category, window, {
      status: "READY",
      score: result.score,
      confidence: result.confidence,
      riskBand,
      horizonDays,
      featureHash,
      expiresAt,
      reasons: result.reasons,
      sourceSignals: result.sourceSignals,
      recommendation,
      generatedAt: now,
    });
    scores.push(score);

    if (previousBand && previousBand !== riskBand) {
      await appendRevenueEvent({
        tenantId,
        actorId,
        aggregateType: "RevenueIntelligenceScore",
        aggregateId: score.id,
        eventType: "PREDICTIVE_BAND_CHANGED",
        idempotencyKey: `band-changed:${opportunityId}:${category}:${window}`,
        after: {
          opportunityId,
          category,
          window,
          previousBand,
          currentBand: riskBand,
          modelVersion: MODEL_VERSION,
        },
      });
    }
  }

  await appendRevenueEvent({
    tenantId,
    actorId,
    aggregateType: "RevenueIntelligenceScore",
    aggregateId: scores[0].id,
    eventType: "PREDICTIVE_INTELLIGENCE_SCORED",
    idempotencyKey: `intelligence-scored:${opportunityId}:${window}`,
    after: {
      opportunityId,
      window,
      modelVersion: MODEL_VERSION,
      scores: scores.map((s) => ({
        category: s.category,
        score: s.score,
        confidence: s.confidence,
        riskBand: s.riskBand,
      })),
    },
  });

  return {
    opportunityId,
    window,
    status: "READY" as const,
    scores: scores.map((s) => ({
      id: s.id,
      category: s.category,
      status: s.status,
      score: s.score,
      confidence: s.confidence,
      riskBand: s.riskBand,
      horizonDays: s.horizonDays,
      featureHash: s.featureHash,
      expiresAt: s.expiresAt?.toISOString() ?? null,
      reasons: s.reasons,
      sourceSignals: s.sourceSignals,
      recommendedAction: s.recommendedAction,
      recommendedActionPayload: s.recommendedActionPayload,
      modelVersion: s.modelVersion,
      modelAlgorithm: s.modelAlgorithm,
      generatedAt: s.generatedAt.toISOString(),
    })),
  };
}

export async function scoreAllOpportunitiesIntelligence(
  tenantId: string,
  actorId: string | null,
) {
  const now = new Date();
  const window = windowKeyForNow();

  const [opportunities, allRisks, allInvoices, radarInfo] = await Promise.all([
    loadOpenOpportunities(tenantId),
    loadAllOpenRisks(tenantId),
    loadAllOverdueInvoices(tenantId),
    loadLatestRadarRunInfo(tenantId),
  ]);

  const radarFresh = isRadarFresh(radarInfo.completedAt, now);

  const risksByOpportunity = new Map<string, RiskSignalRow[]>();
  for (const risk of allRisks) {
    if (!risk.opportunityId) continue;
    const list = risksByOpportunity.get(risk.opportunityId) || [];
    list.push(risk);
    risksByOpportunity.set(risk.opportunityId, list);
  }

  const invoicesByContract = new Map<string, InvoiceRow[]>();
  for (const invoice of allInvoices) {
    if (!invoice.contractId) continue;
    const list = invoicesByContract.get(invoice.contractId) || [];
    list.push(invoice);
    invoicesByContract.set(invoice.contractId, list);
  }

  const opportunityContracts = await rawPrisma.$queryRawUnsafe<Array<{ opportunityId: string; contractId: string }>>(`
    SELECT f.linked_opportunity_id AS "opportunityId", c.id AS "contractId"
    FROM contracts c
    JOIN offers f ON f.id = c.offer_id
    WHERE f.tenant_id = $1::uuid AND f.linked_opportunity_id IS NOT NULL
  `, tenantId);

  const invoicesByOpportunity = new Map<string, InvoiceRow[]>();
  for (const mapping of opportunityContracts) {
    const contractInvoices = invoicesByContract.get(mapping.contractId) || [];
    const existing = invoicesByOpportunity.get(mapping.opportunityId) || [];
    invoicesByOpportunity.set(mapping.opportunityId, [...existing, ...contractInvoices]);
  }

  let scored = 0;
  let insufficient = 0;
  const failedEntities: Array<{ entityId: string; error: string }> = [];
  const results = [];

  for (const opportunity of opportunities) {
    try {
      const risks = risksByOpportunity.get(opportunity.id) || [];
      const invoices = invoicesByOpportunity.get(opportunity.id) || [];

      if (!radarFresh) {
        const insufficientReasons: PredictionReason[] = [{
          code: "RADAR_STALE",
          label: "Radar data is stale or missing",
          weight: 0,
          detail: `No completed radar run within the last ${RADAR_FRESHNESS_HOURS} hours`,
        }];

        const categories: IntelligenceCategory[] = ["REVENUE_LEAK", "COLLECTION_DELAY", "DEAL_FALL", "INTERVENTION_PRIORITY"];
        for (const category of categories) {
          const horizonDays = computeHorizonDays(category);
          await upsertIntelligenceScore(tenantId, "Opportunity", opportunity.id, category, window, {
            status: "INSUFFICIENT_DATA",
            score: null,
            confidence: null,
            riskBand: null,
            horizonDays,
            featureHash: null,
            expiresAt: computeExpiresAt(now, horizonDays),
            reasons: insufficientReasons,
            sourceSignals: [],
            recommendation: null,
            generatedAt: now,
          });

          await appendRevenueEvent({
            tenantId,
            actorId,
            aggregateType: "RevenueIntelligenceScore",
            aggregateId: opportunity.id,
            eventType: "PREDICTIVE_INSUFFICIENT_DATA",
            idempotencyKey: `insufficient-data:${opportunity.id}:${category}:${window}`,
            after: {
              opportunityId: opportunity.id,
              category,
              window,
              modelVersion: MODEL_VERSION,
              missingInputs: ["radar_run_fresh"],
            },
          }).catch(() => undefined);
        }
        insufficient += 1;
        results.push({ opportunityId: opportunity.id, status: "INSUFFICIENT_DATA" });
        continue;
      }

      const leakResult = computeRevenueLeakScore(risks, radarInfo.evaluatedRules);
      const collectionResult = computeCollectionDelayScore(invoices, now);
      const dealFallResult = computeDealFallScore(opportunity, risks, now);
      const priorityResult = computeInterventionPriority(
        leakResult.score, collectionResult.score, dealFallResult.score,
        leakResult.confidence, collectionResult.confidence, dealFallResult.confidence,
      );

      const categoryResults: Array<{ category: IntelligenceCategory; result: ScoreResult }> = [
        { category: "REVENUE_LEAK", result: leakResult },
        { category: "COLLECTION_DELAY", result: collectionResult },
        { category: "DEAL_FALL", result: dealFallResult },
        { category: "INTERVENTION_PRIORITY", result: priorityResult },
      ];

      for (const { category, result } of categoryResults) {
        const horizonDays = computeHorizonDays(category);
        const riskBand = computeRiskBand(result.score);
        const featureSnapshot = buildFeatureSnapshot(category, {
          riskCount: risks.length,
          invoiceCount: invoices.length,
          opportunityAge: Math.max(0, (now.getTime() - new Date(opportunity.createdAt).getTime()) / 86_400_000),
          probability: num(opportunity.probability),
          tourCount: num(opportunity.tourCount),
          offerCount: num(opportunity.offerCount),
        });
        const featureHash = computeFeatureHash(featureSnapshot);
        const expiresAt = computeExpiresAt(now, horizonDays);

        let recommendation: { actionType: string; payload: Record<string, unknown> } | null = null;
        if (category !== "INTERVENTION_PRIORITY") {
          recommendation = recommendAction(category, result.score, result.reasons, result.sourceSignals);
        } else {
          const dominant = [
            { name: "REVENUE_LEAK" as const, score: leakResult.score },
            { name: "COLLECTION_DELAY" as const, score: collectionResult.score },
            { name: "DEAL_FALL" as const, score: dealFallResult.score },
          ].sort((a, b) => b.score - a.score)[0];
          recommendation = recommendAction(dominant.name, result.score, result.reasons, result.sourceSignals);
        }

        const previousBand = await getPreviousBand(tenantId, "Opportunity", opportunity.id, category, window);

        await upsertIntelligenceScore(tenantId, "Opportunity", opportunity.id, category, window, {
          status: "READY",
          score: result.score,
          confidence: result.confidence,
          riskBand,
          horizonDays,
          featureHash,
          expiresAt,
          reasons: result.reasons,
          sourceSignals: result.sourceSignals,
          recommendation,
          generatedAt: now,
        });

        if (previousBand && previousBand !== riskBand) {
          await appendRevenueEvent({
            tenantId,
            actorId,
            aggregateType: "RevenueIntelligenceScore",
            aggregateId: opportunity.id,
            eventType: "PREDICTIVE_BAND_CHANGED",
            idempotencyKey: `band-changed:${opportunity.id}:${category}:${window}`,
            after: {
              opportunityId: opportunity.id,
              category,
              window,
              previousBand,
              currentBand: riskBand,
              modelVersion: MODEL_VERSION,
            },
          }).catch(() => undefined);
        }
      }
      scored += 1;
      results.push({
        opportunityId: opportunity.id,
        status: "READY",
        leakScore: leakResult.score,
        collectionDelayScore: collectionResult.score,
        dealFallScore: dealFallResult.score,
        priorityScore: priorityResult.score,
      });
    } catch (error) {
      failedEntities.push({
        entityId: opportunity.id,
        error: error instanceof Error ? error.message.slice(0, 200) : "UNKNOWN_ERROR",
      });

      await appendRevenueEvent({
        tenantId,
        actorId,
        aggregateType: "RevenueIntelligenceScore",
        aggregateId: opportunity.id,
        eventType: "PREDICTIVE_ENTITY_FAILED",
        idempotencyKey: `entity-failed:${opportunity.id}:${window}`,
        after: {
          opportunityId: opportunity.id,
          window,
          modelVersion: MODEL_VERSION,
          error: error instanceof Error ? error.message.slice(0, 500) : "UNKNOWN_ERROR",
        },
      }).catch(() => undefined);
    }
  }

  if (scored > 0 || insufficient > 0) {
    await appendRevenueEvent({
      tenantId,
      actorId,
      aggregateType: "RevenueIntelligenceScore",
      aggregateId: results[0]?.opportunityId || tenantId,
      eventType: "PREDICTIVE_INTELLIGENCE_BATCH_SCORED",
      idempotencyKey: `intelligence-batch:${window}`,
      after: { scored, insufficient, failed: failedEntities.length, window, modelVersion: MODEL_VERSION },
    });
  }

  return { scored, insufficient, failed: failedEntities.length, failedEntities, window, results };
}

export async function runIntelligenceBatch(
  tenantId: string,
  actorId: string | null,
) {
  const window = windowKeyForNow();
  const idempotencyKey = `predictive:${window}`;

  const existingRun = await rawPrisma.revenuePredictiveRun.findFirst({
    where: { tenantId, idempotencyKey },
  });

  if (existingRun?.completedAt) {
    return {
      runId: existingRun.id,
      skipped: true,
      scored: existingRun.scoredCount,
      failed: existingRun.failedCount,
      failedEntities: existingRun.failedEntities as Array<{ entityId: string; error: string }>,
      windowKey: window,
    };
  }

  const run = existingRun || await rawPrisma.revenuePredictiveRun.create({
    data: { tenantId, idempotencyKey },
  });

  try {
    const result = await scoreAllOpportunitiesIntelligence(tenantId, actorId);

    await rawPrisma.revenuePredictiveRun.update({
      where: { id: run.id },
      data: {
        completedAt: new Date(),
        scoredCount: result.scored,
        failedCount: result.failed,
        failedEntities: result.failedEntities as any,
        result: { scored: result.scored, insufficient: result.insufficient, failed: result.failed, window: result.window } as any,
      },
    });

    return {
      runId: run.id,
      skipped: false,
      scored: result.scored,
      insufficient: result.insufficient,
      failed: result.failed,
      failedEntities: result.failedEntities,
      windowKey: window,
    };
  } catch (error) {
    await rawPrisma.revenuePredictiveRun.update({
      where: { id: run.id },
      data: {
        completedAt: new Date(),
        failedCount: 1,
        failedEntities: [{ entityId: tenantId, error: error instanceof Error ? error.message.slice(0, 200) : "BATCH_FAILED" }] as any,
        result: { error: error instanceof Error ? error.message.slice(0, 500) : "BATCH_FAILED" } as any,
      },
    });

    throw error;
  }
}

export async function loadIntelligenceScores(
  tenantId: string,
  options?: {
    category?: string;
    entityType?: string;
    entityId?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const PAGE_SIZE_DEFAULT = 5;
  const PAGE_SIZE_MAX = 20;
  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.min(Math.max(options?.pageSize || PAGE_SIZE_DEFAULT, 1), PAGE_SIZE_MAX);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { tenantId };
  if (options?.category) where.category = options.category;
  if (options?.entityType) where.entityType = options.entityType;
  if (options?.entityId) where.entityId = options.entityId;

  const [items, total] = await Promise.all([
    rawPrisma.revenueIntelligenceScore.findMany({
      where,
      orderBy: [{ generatedAt: "desc" }],
      skip,
      take: pageSize,
    }),
    rawPrisma.revenueIntelligenceScore.count({ where }),
  ]);

  return {
    items: items.map((score) => ({
      id: score.id,
      entityType: score.entityType,
      entityId: score.entityId,
      category: score.category,
      status: score.status,
      score: score.score,
      confidence: score.confidence,
      riskBand: score.riskBand,
      horizonDays: score.horizonDays,
      featureHash: score.featureHash,
      expiresAt: score.expiresAt?.toISOString() ?? null,
      reasons: score.reasons,
      sourceSignals: score.sourceSignals,
      recommendedAction: score.recommendedAction,
      recommendedActionPayload: score.recommendedActionPayload,
      modelVersion: score.modelVersion,
      modelAlgorithm: score.modelAlgorithm,
      windowKey: score.windowKey,
      generatedAt: score.generatedAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
