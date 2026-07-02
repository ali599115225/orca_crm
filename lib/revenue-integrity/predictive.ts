import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { rawPrisma } from "@/lib/prisma";
import { appendRevenueEvent } from "./events";

const FEATURE_NAMES = ["ageDays", "probability", "logValue", "tourCount", "offerCount", "openRiskCount", "overdueInvoiceCount"] as const;
type FeatureName = (typeof FEATURE_NAMES)[number];
type FeatureVector = Record<FeatureName, number>;

type OpportunityRow = {
  id: string;
  status: string;
  value: unknown;
  probability: unknown;
  created_at: Date;
  tour_count: unknown;
  offer_count: unknown;
  open_risk_count: unknown;
  overdue_invoice_count: unknown;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function loadOpportunityRows(tenantId: string, labeledOnly: boolean): Promise<OpportunityRow[]> {
  const statusClause = labeledOnly
    ? Prisma.sql`AND UPPER(COALESCE(o.status::text,'')) IN ('WON','LOST')`
    : Prisma.sql`AND UPPER(COALESCE(o.status::text,'')) NOT IN ('WON','LOST','CLOSED','CANCELLED')`;
  return rawPrisma.$queryRaw<OpportunityRow[]>`
    SELECT
      o.id,
      COALESCE(o.status::text,'') AS status,
      COALESCE(o.value,0) AS value,
      COALESCE(o.probability,50) AS probability,
      o.created_at,
      (SELECT COUNT(*) FROM tours t WHERE t.tenant_id = o.tenant_id AND t.opportunity_id = o.id) AS tour_count,
      (SELECT COUNT(*) FROM offers f WHERE f.tenant_id = o.tenant_id AND f.linked_opportunity_id = o.id) AS offer_count,
      (SELECT COUNT(*) FROM revenue_risk_signals r WHERE r.tenant_id = o.tenant_id AND r.opportunity_id = o.id AND r.status IN ('OPEN','ACKNOWLEDGED')) AS open_risk_count,
      (SELECT COUNT(*) FROM invoices i WHERE i.tenant_id = o.tenant_id AND i.contract_id IN (
        SELECT c.id FROM contracts c JOIN offers f2 ON f2.id = c.offer_id WHERE f2.linked_opportunity_id = o.id
      ) AND i.due_date < NOW() AND LOWER(COALESCE(i.status::text,'')) NOT IN ('paid','cancelled','void')) AS overdue_invoice_count
    FROM opportunities o
    WHERE o.tenant_id = ${tenantId}::uuid ${statusClause}
    ORDER BY o.created_at ASC, o.id ASC
  `;
}

function toFeatures(row: OpportunityRow, now = Date.now()): FeatureVector {
  return {
    ageDays: Math.max(0, (now - new Date(row.created_at).getTime()) / 86_400_000),
    probability: Math.min(100, Math.max(0, numberValue(row.probability))) / 100,
    logValue: Math.log1p(Math.max(0, numberValue(row.value))),
    tourCount: numberValue(row.tour_count),
    offerCount: numberValue(row.offer_count),
    openRiskCount: numberValue(row.open_risk_count),
    overdueInvoiceCount: numberValue(row.overdue_invoice_count),
  };
}

function stableDatasetHash(rows: OpportunityRow[]) {
  return createHash("sha256")
    .update(rows.map((row) => [row.id, row.status, row.value, row.probability, row.created_at].join("|")).join("\n"))
    .digest("hex");
}

function meansAndStd(rows: FeatureVector[]) {
  const means = {} as FeatureVector;
  const stds = {} as FeatureVector;
  for (const feature of FEATURE_NAMES) {
    const values = rows.map((row) => row[feature]);
    const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(values.length, 1);
    means[feature] = mean;
    stds[feature] = Math.sqrt(variance) || 1;
  }
  return { means, stds };
}

function standardize(row: FeatureVector, means: FeatureVector, stds: FeatureVector) {
  return FEATURE_NAMES.map((feature) => (row[feature] - means[feature]) / stds[feature]);
}

function sigmoid(value: number) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

function dot(weights: number[], values: number[]) {
  return weights.reduce((sum, weight, index) => sum + weight * values[index], 0);
}

function trainLogisticRegression(x: number[][], y: number[]) {
  const weights = new Array(x[0].length).fill(0);
  let bias = 0;
  const learningRate = 0.035;
  const regularization = 0.002;

  for (let iteration = 0; iteration < 800; iteration += 1) {
    const gradient = new Array(weights.length).fill(0);
    let biasGradient = 0;
    for (let rowIndex = 0; rowIndex < x.length; rowIndex += 1) {
      const prediction = sigmoid(dot(weights, x[rowIndex]) + bias);
      const error = prediction - y[rowIndex];
      for (let featureIndex = 0; featureIndex < weights.length; featureIndex += 1) {
        gradient[featureIndex] += error * x[rowIndex][featureIndex];
      }
      biasGradient += error;
    }
    for (let featureIndex = 0; featureIndex < weights.length; featureIndex += 1) {
      weights[featureIndex] -= learningRate * (gradient[featureIndex] / x.length + regularization * weights[featureIndex]);
    }
    bias -= learningRate * (biasGradient / x.length);
  }

  return { weights, bias };
}

function evaluateModel(x: number[][], y: number[], weights: number[], bias: number) {
  let correct = 0;
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let logLoss = 0;
  for (let index = 0; index < x.length; index += 1) {
    const probability = Math.min(1 - 1e-9, Math.max(1e-9, sigmoid(dot(weights, x[index]) + bias)));
    const predicted = probability >= 0.5 ? 1 : 0;
    if (predicted === y[index]) correct += 1;
    if (predicted === 1 && y[index] === 1) truePositive += 1;
    if (predicted === 1 && y[index] === 0) falsePositive += 1;
    if (predicted === 0 && y[index] === 1) falseNegative += 1;
    logLoss += -(y[index] * Math.log(probability) + (1 - y[index]) * Math.log(1 - probability));
  }
  return {
    accuracy: correct / Math.max(x.length, 1),
    precision: truePositive / Math.max(truePositive + falsePositive, 1),
    recall: truePositive / Math.max(truePositive + falseNegative, 1),
    logLoss: logLoss / Math.max(x.length, 1),
    rows: x.length,
  };
}

export async function trainPredictiveModel(tenantId: string, actorId: string | null, minimumRows = 30) {
  const rows = await loadOpportunityRows(tenantId, true);
  const won = rows.filter((row) => String(row.status).toUpperCase() === "WON").length;
  const lost = rows.length - won;
  const datasetVersion = (await rawPrisma.revenueDatasetSnapshot.aggregate({ where: { tenantId }, _max: { version: true } }))._max.version || 0;
  const features = rows.map((row) => toFeatures(row));
  const dataset = await rawPrisma.revenueDatasetSnapshot.create({
    data: {
      tenantId,
      version: datasetVersion + 1,
      rowCount: rows.length,
      featureSchema: { features: FEATURE_NAMES, label: "status in WON/LOST" } as any,
      labelDistribution: { won, lost } as any,
      dataHash: stableDatasetHash(rows),
      periodStart: rows[0]?.created_at || null,
      periodEnd: rows.at(-1)?.created_at || null,
    },
  });

  const modelVersion = (await rawPrisma.revenueModelVersion.aggregate({ where: { tenantId }, _max: { version: true } }))._max.version || 0;
  if (rows.length < minimumRows || won === 0 || lost === 0) {
    const notReady = await rawPrisma.revenueModelVersion.create({
      data: {
        tenantId,
        version: modelVersion + 1,
        status: "NOT_READY",
        algorithm: "LOGISTIC_REGRESSION",
        datasetSnapshotId: dataset.id,
        featureSchema: { features: FEATURE_NAMES } as any,
        artifact: {} as any,
        metrics: { rows: rows.length, won, lost, minimumRows } as any,
        minimumRows,
        failureReason: rows.length < minimumRows ? "INSUFFICIENT_LABELED_ROWS" : "LABEL_CLASS_MISSING",
        createdBy: actorId,
      },
    });
    await appendRevenueEvent({
      tenantId, actorId, aggregateType: "RevenueModelVersion", aggregateId: notReady.id,
      eventType: "PREDICTIVE_MODEL_NOT_READY", idempotencyKey: `model-not-ready:${notReady.id}`,
      after: { id: notReady.id, status: notReady.status, rows: rows.length, won, lost, minimumRows },
    });
    return notReady;
  }

  const { means, stds } = meansAndStd(features);
  const x = features.map((row) => standardize(row, means, stds));
  const y = rows.map((row) => String(row.status).toUpperCase() === "WON" ? 1 : 0);
  const splitIndex = Math.max(1, Math.floor(rows.length * 0.8));
  const trainX = x.slice(0, splitIndex);
  const trainY = y.slice(0, splitIndex);
  const testX = x.slice(splitIndex).length ? x.slice(splitIndex) : x.slice(-1);
  const testY = y.slice(splitIndex).length ? y.slice(splitIndex) : y.slice(-1);
  const model = trainLogisticRegression(trainX, trainY);
  const metrics = evaluateModel(testX, testY, model.weights, model.bias);

  await rawPrisma.revenueModelVersion.updateMany({
    where: { tenantId, status: "ACTIVE" },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });
  const active = await rawPrisma.revenueModelVersion.create({
    data: {
      tenantId,
      version: modelVersion + 1,
      status: "ACTIVE",
      algorithm: "LOGISTIC_REGRESSION",
      datasetSnapshotId: dataset.id,
      featureSchema: { features: FEATURE_NAMES, means, stds } as any,
      artifact: { weights: model.weights, bias: model.bias } as any,
      metrics: { ...metrics, trainingRows: trainX.length, validationRows: testX.length, won, lost } as any,
      minimumRows,
      driftScore: 0,
      driftStatus: "STABLE",
      activatedAt: new Date(),
      createdBy: actorId,
    },
  });
  await appendRevenueEvent({
    tenantId, actorId, aggregateType: "RevenueModelVersion", aggregateId: active.id,
    eventType: "PREDICTIVE_MODEL_ACTIVATED", idempotencyKey: `model-active:${active.id}`,
    after: { id: active.id, version: active.version, metrics },
  });
  return active;
}

function explain(features: FeatureVector, standardized: number[], weights: number[]) {
  return FEATURE_NAMES.map((feature, index) => ({
    feature,
    value: features[feature],
    contribution: standardized[index] * weights[index],
  })).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

export async function scoreOpenOpportunities(tenantId: string, actorId: string | null) {
  const model = await rawPrisma.revenueModelVersion.findFirst({
    where: { tenantId, status: "ACTIVE" },
    orderBy: { version: "desc" },
  });
  if (!model) return { status: "NOT_READY", scored: 0, reason: "NO_ACTIVE_MODEL" };

  const schema = model.featureSchema as any;
  const artifact = model.artifact as any;
  const means = schema.means as FeatureVector;
  const stds = schema.stds as FeatureVector;
  const weights = artifact.weights as number[];
  const bias = Number(artifact.bias || 0);
  if (!means || !stds || !Array.isArray(weights)) throw new Error("INVALID_MODEL_ARTIFACT");

  const rows = await loadOpportunityRows(tenantId, false);
  const currentFeatures = rows.map((row) => toFeatures(row));
  const currentStats = currentFeatures.length ? meansAndStd(currentFeatures) : { means, stds };
  const driftScore = FEATURE_NAMES.reduce((sum, feature) => sum + Math.abs((currentStats.means[feature] - means[feature]) / stds[feature]), 0) / FEATURE_NAMES.length;
  const driftStatus = driftScore >= 1.5 ? "DRIFT_ALERT" : driftScore >= 0.75 ? "WATCH" : "STABLE";
  await rawPrisma.revenueModelVersion.update({
    where: { id: model.id },
    data: { driftScore, driftStatus },
  });

  let scored = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const features = currentFeatures[index];
    const standardized = standardize(features, means, stds);
    const probability = sigmoid(dot(weights, standardized) + bias);
    const confidence = Math.min(1, Math.abs(probability - 0.5) * 2);
    const explanation = explain(features, standardized, weights);
    const existing = await rawPrisma.revenuePrediction.findFirst({
      where: { tenantId, modelVersionId: model.id, opportunityId: rows[index].id },
    });
    if (existing) {
      await rawPrisma.revenuePrediction.update({
        where: { id: existing.id },
        data: { probability, confidence, explanation: explanation as any, featureSnapshot: features as any, scoredAt: new Date() },
      });
    } else {
      await rawPrisma.revenuePrediction.create({
        data: {
          tenantId, modelVersionId: model.id, opportunityId: rows[index].id,
          probability, confidence, explanation: explanation as any, featureSnapshot: features as any,
        },
      });
    }
    scored += 1;
  }

  await appendRevenueEvent({
    tenantId, actorId, aggregateType: "RevenueModelVersion", aggregateId: model.id,
    eventType: "PREDICTIVE_SCORING_COMPLETED", idempotencyKey: `model-score:${model.id}:${new Date().toISOString().slice(0, 13)}`,
    after: { scored, driftScore, driftStatus },
  });
  return { status: "ACTIVE", scored, modelId: model.id, driftScore, driftStatus };
}
