import { randomUUID } from "node:crypto";
import { rawPrisma } from "@/lib/prisma";
import { appendRevenueEvent } from "./events";
import type { RadarRunResult } from "./contracts";

export type DetectedRisk = {
  ruleCode: string;
  subjectType: string;
  subjectId: string;
  opportunityId?: string | null;
  invoiceId?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasonAr: string;
  reasonEn: string;
  revenueAtRisk: number;
  assigneeId?: string | null;
  dueAt?: Date | null;
  metadata?: Record<string, unknown>;
};

type CapabilityMap = Map<string, Set<string>>;

async function queryRows<T = Record<string, unknown>>(sql: string, ...values: unknown[]): Promise<T[]> {
  return rawPrisma.$queryRawUnsafe<T[]>(sql, ...values);
}

async function loadCapabilities(): Promise<CapabilityMap> {
  const rows = await queryRows<{ table_name: string; column_name: string }>(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  const map: CapabilityMap = new Map();
  for (const row of rows) {
    if (!map.has(row.table_name)) map.set(row.table_name, new Set());
    map.get(row.table_name)!.add(row.column_name);
  }
  return map;
}

function has(cap: CapabilityMap, table: string, ...columns: string[]) {
  const set = cap.get(table);
  return Boolean(set && columns.every((column) => set.has(column)));
}

function asNumber(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function fingerprint(risk: DetectedRisk) {
  return `${risk.ruleCode}:${risk.subjectType}:${risk.subjectId}`;
}

async function upsertRiskSignal(tenantId: string, actorId: string | null, risk: DetectedRisk) {
  const key = fingerprint(risk);
  const existing = await rawPrisma.revenueRiskSignal.findFirst({ where: { tenantId, fingerprint: key } });
  const common = {
    ruleCode: risk.ruleCode,
    subjectType: risk.subjectType,
    subjectId: risk.subjectId,
    opportunityId: risk.opportunityId || null,
    invoiceId: risk.invoiceId || null,
    severity: risk.severity,
    reasonAr: risk.reasonAr,
    reasonEn: risk.reasonEn,
    revenueAtRisk: risk.revenueAtRisk,
    assigneeId: risk.assigneeId || null,
    dueAt: risk.dueAt || null,
    lastSeenAt: new Date(),
    metadata: (risk.metadata || {}) as any,
  } as const;

  if (!existing) {
    const created = await rawPrisma.revenueRiskSignal.create({
      data: { tenantId, fingerprint: key, ...common },
    });
    await appendRevenueEvent({
      tenantId,
      actorId,
      aggregateType: "RevenueRiskSignal",
      aggregateId: created.id,
      eventType: "REVENUE_RISK_DETECTED",
      idempotencyKey: `risk-detected:${created.id}`,
      after: created,
      metadata: { ruleCode: risk.ruleCode },
    });
    return created.id;
  }

  const reopening = existing.status === "RESOLVED" || existing.status === "DISMISSED";
  const updated = await rawPrisma.revenueRiskSignal.update({
    where: { id: existing.id },
    data: {
      ...common,
      ...(reopening
        ? {
            status: "OPEN",
            detectedAt: new Date(),
            resolvedAt: null,
            resolvedBy: null,
            resolutionReason: null,
          }
        : {}),
    },
  });

  if (reopening) {
    await appendRevenueEvent({
      tenantId,
      actorId,
      aggregateType: "RevenueRiskSignal",
      aggregateId: updated.id,
      eventType: "REVENUE_RISK_REOPENED",
      idempotencyKey: `risk-reopened:${updated.id}:${updated.detectedAt.toISOString()}`,
      before: existing,
      after: updated,
      metadata: { ruleCode: risk.ruleCode },
    });
  }
  return updated.id;
}

export async function evaluateRevenueLeakRadar(
  tenantId: string,
  actorId: string | null = null,
  requestedIdempotencyKey?: string,
): Promise<RadarRunResult> {
  const idempotencyKey = requestedIdempotencyKey || `radar:${new Date().toISOString().slice(0, 16)}`;
  const existingRun = await rawPrisma.revenueRuleRun.findFirst({ where: { tenantId, idempotencyKey } });
  if (existingRun?.completedAt) {
    const result = existingRun.result as any;
    return {
      runId: existingRun.id,
      detected: Number(result?.detected || existingRun.detectedCount || 0),
      resolved: Number(result?.resolved || existingRun.resolvedCount || 0),
      evaluatedRules: Array.isArray(result?.evaluatedRules) ? result.evaluatedRules : [],
      skippedRules: Array.isArray(existingRun.skippedRules) ? (existingRun.skippedRules as any) : [],
    };
  }

  const run = existingRun || (await rawPrisma.revenueRuleRun.create({
    data: { tenantId, idempotencyKey, skippedRules: [], result: {} },
  }));

  const cap = await loadCapabilities();
  const detected: DetectedRisk[] = [];
  const evaluatedRules: string[] = [];
  const skippedRules: Array<{ ruleCode: string; reason: string }> = [];

  const evaluate = async (ruleCode: string, requirements: Array<[string, ...string[]]>, fn: () => Promise<DetectedRisk[]>) => {
    const missing = requirements.filter(([table, ...columns]) => !has(cap, table, ...columns));
    if (missing.length) {
      skippedRules.push({ ruleCode, reason: missing.map(([table, ...columns]) => `${table}(${columns.join(",")})`).join("; ") });
      return;
    }
    evaluatedRules.push(ruleCode);
    detected.push(...(await fn()));
  };

  await evaluate("LEAD_UNASSIGNED", [["leads", "id", "tenant_id", "assigned_to", "created_at", "status"]], async () => {
    const rows = await queryRows<any>(`
      SELECT id, assigned_to, created_at
      FROM leads
      WHERE tenant_id = $1::uuid
        AND assigned_to IS NULL
        AND created_at < NOW() - INTERVAL '15 minutes'
        AND UPPER(COALESCE(status::text,'')) NOT IN ('WON','LOST','CLOSED','CANCELLED')
    `, tenantId);
    return rows.map((row) => ({
      ruleCode: "LEAD_UNASSIGNED", subjectType: "Lead", subjectId: row.id, severity: "CRITICAL",
      reasonAr: "عميل جديد بلا مسؤول بعد مهلة الإسناد.", reasonEn: "New lead remained unassigned beyond the assignment SLA.",
      revenueAtRisk: 0, dueAt: new Date(), metadata: { createdAt: row.created_at },
    }));
  });

  await evaluate("FIRST_RESPONSE_BREACH", [
    ["leads", "id", "tenant_id", "created_at", "status"],
    ["lead_activities", "lead_id", "created_at"],
  ], async () => {
    const rows = await queryRows<any>(`
      SELECT l.id, l.assigned_to, l.created_at
      FROM leads l
      WHERE l.tenant_id = $1::uuid
        AND l.created_at < NOW() - INTERVAL '30 minutes'
        AND UPPER(COALESCE(l.status::text,'')) NOT IN ('WON','LOST','CLOSED','CANCELLED')
        AND NOT EXISTS (
          SELECT 1 FROM lead_activities a
          WHERE a.lead_id = l.id AND a.created_at > l.created_at
        )
    `, tenantId);
    return rows.map((row) => ({
      ruleCode: "FIRST_RESPONSE_BREACH", subjectType: "Lead", subjectId: row.id, severity: "CRITICAL",
      reasonAr: "تم تجاوز مهلة الرد الأول على العميل.", reasonEn: "First-response SLA was breached.",
      revenueAtRisk: 0, assigneeId: row.assigned_to, dueAt: new Date(), metadata: { createdAt: row.created_at },
    }));
  });

  await evaluate("NO_NEXT_ACTION", [
    ["opportunities", "id", "tenant_id", "status", "created_at"],
    ["revenue_next_actions", "tenant_id", "opportunity_id", "status", "due_at"],
  ], async () => {
    const valueExpr = has(cap, "opportunities", "value") ? "COALESCE(o.value,0)" : "0";
    const assignedExpr = has(cap, "opportunities", "assigned_to") ? "o.assigned_to" : "NULL::uuid";
    const rows = await queryRows<any>(`
      SELECT o.id, ${valueExpr} AS value, ${assignedExpr} AS assigned_to, o.created_at
      FROM opportunities o
      WHERE o.tenant_id = $1::uuid
        AND UPPER(COALESCE(o.status::text,'')) NOT IN ('WON','LOST','CLOSED','CANCELLED')
        AND o.created_at < NOW() - INTERVAL '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM revenue_next_actions n
          WHERE n.tenant_id = o.tenant_id AND n.opportunity_id = o.id AND n.status = 'OPEN'
        )
    `, tenantId);
    return rows.map((row) => ({
      ruleCode: "NO_NEXT_ACTION", subjectType: "Opportunity", subjectId: row.id, opportunityId: row.id,
      severity: "CRITICAL", reasonAr: "فرصة مفتوحة بلا إجراء تالٍ وموعد واضح.",
      reasonEn: "Open opportunity has no scheduled next action.", revenueAtRisk: asNumber(row.value),
      assigneeId: row.assigned_to, dueAt: new Date(), metadata: { createdAt: row.created_at },
    }));
  });

  await evaluate("TOUR_WITHOUT_OUTCOME", [["tours", "id", "tenant_id", "start_at", "status"]], async () => {
    const opportunityExpr = has(cap, "tours", "opportunity_id") ? "opportunity_id" : "NULL::uuid";
    const assignedExpr = has(cap, "tours", "assigned_to") ? "assigned_to" : "NULL::uuid";
    const rows = await queryRows<any>(`
      SELECT id, ${opportunityExpr} AS opportunity_id, ${assignedExpr} AS assigned_to, start_at, status
      FROM tours
      WHERE tenant_id = $1::uuid
        AND start_at < NOW() - INTERVAL '2 hours'
        AND UPPER(COALESCE(status::text,'')) IN ('SCHEDULED','PENDING','IN_PROGRESS')
    `, tenantId);
    return rows.map((row) => ({
      ruleCode: "TOUR_WITHOUT_OUTCOME", subjectType: "Tour", subjectId: row.id, opportunityId: row.opportunity_id,
      severity: "HIGH", reasonAr: "انتهى موعد الجولة دون تسجيل نتيجة.", reasonEn: "Tour time passed without a recorded outcome.",
      revenueAtRisk: 0, assigneeId: row.assigned_to, dueAt: new Date(), metadata: { startAt: row.start_at, status: row.status },
    }));
  });

  await evaluate("POSITIVE_TOUR_NO_OFFER", [
    ["tours", "id", "tenant_id", "opportunity_id", "start_at", "status"],
    ["offers", "id", "tenant_id", "linked_opportunity_id"],
  ], async () => {
    const rows = await queryRows<any>(`
      SELECT t.id, t.opportunity_id, t.assigned_to, t.start_at
      FROM tours t
      WHERE t.tenant_id = $1::uuid
        AND t.opportunity_id IS NOT NULL
        AND t.start_at < NOW() - INTERVAL '24 hours'
        AND UPPER(COALESCE(t.status::text,'')) IN ('COMPLETED','VISITED','POSITIVE')
        AND NOT EXISTS (
          SELECT 1 FROM offers o
          WHERE o.tenant_id = t.tenant_id AND o.linked_opportunity_id = t.opportunity_id
        )
    `, tenantId);
    return rows.map((row) => ({
      ruleCode: "POSITIVE_TOUR_NO_OFFER", subjectType: "Tour", subjectId: row.id, opportunityId: row.opportunity_id,
      severity: "CRITICAL", reasonAr: "جولة إيجابية بلا عرض خلال المهلة.", reasonEn: "Positive tour has no offer within the required window.",
      revenueAtRisk: 0, assigneeId: row.assigned_to, dueAt: new Date(), metadata: { startAt: row.start_at },
    }));
  });

  await evaluate("ACCEPTED_OFFER_NO_CONTRACT", [
    ["offers", "id", "tenant_id", "status", "price", "linked_opportunity_id", "created_at"],
    ["contracts", "offer_id", "tenant_id"],
  ], async () => {
    const rows = await queryRows<any>(`
      SELECT o.id, o.price, o.linked_opportunity_id, o.created_at
      FROM offers o
      WHERE o.tenant_id = $1::uuid
        AND UPPER(COALESCE(o.status::text,'')) = 'ACCEPTED'
        AND o.created_at < NOW() - INTERVAL '2 hours'
        AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.tenant_id = o.tenant_id AND c.offer_id = o.id)
    `, tenantId);
    return rows.map((row) => ({
      ruleCode: "ACCEPTED_OFFER_NO_CONTRACT", subjectType: "Offer", subjectId: row.id,
      opportunityId: row.linked_opportunity_id, severity: "CRITICAL",
      reasonAr: "عرض مقبول بلا عقد.", reasonEn: "Accepted offer has no contract.",
      revenueAtRisk: asNumber(row.price), dueAt: new Date(), metadata: { acceptedAt: row.created_at },
    }));
  });

  await evaluate("SIGNED_CONTRACT_NO_INVOICE", [
    ["contracts", "id", "tenant_id", "status", "total_volume_sar", "signed_at"],
    ["invoices", "contract_id", "tenant_id"],
  ], async () => {
    const rows = await queryRows<any>(`
      SELECT c.id, c.total_volume_sar, c.signed_at
      FROM contracts c
      WHERE c.tenant_id = $1::uuid
        AND UPPER(COALESCE(c.status::text,'')) = 'SIGNED'
        AND c.signed_at < NOW() - INTERVAL '2 hours'
        AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.tenant_id = c.tenant_id AND i.contract_id = c.id)
    `, tenantId);
    return rows.map((row) => ({
      ruleCode: "SIGNED_CONTRACT_NO_INVOICE", subjectType: "Contract", subjectId: row.id,
      severity: "CRITICAL", reasonAr: "عقد موقع بلا فاتورة.", reasonEn: "Signed contract has no invoice.",
      revenueAtRisk: asNumber(row.total_volume_sar), dueAt: new Date(), metadata: { signedAt: row.signed_at },
    }));
  });

  await evaluate("OVERDUE_INVOICE", [["invoices", "id", "tenant_id", "status", "due_date", "total_amount"]], async () => {
    const rows = await queryRows<any>(`
      SELECT id, total_amount, due_date, contract_id
      FROM invoices
      WHERE tenant_id = $1::uuid
        AND due_date < NOW()
        AND LOWER(COALESCE(status::text,'')) NOT IN ('paid','cancelled','void')
    `, tenantId);
    return rows.map((row) => ({
      ruleCode: "OVERDUE_INVOICE", subjectType: "Invoice", subjectId: row.id, invoiceId: row.id,
      severity: "CRITICAL", reasonAr: "فاتورة متأخرة عن الاستحقاق.", reasonEn: "Invoice is overdue.",
      revenueAtRisk: asNumber(row.total_amount), dueAt: new Date(row.due_date), metadata: { contractId: row.contract_id },
    }));
  });

  await evaluate("INVENTORY_CONFLICT", [["offers", "id", "tenant_id", "unit_id", "status", "price"]], async () => {
    const rows = await queryRows<any>(`
      SELECT unit_id, COUNT(*) AS conflict_count, SUM(price) AS value_at_risk
      FROM offers
      WHERE tenant_id = $1::uuid AND unit_id IS NOT NULL
        AND UPPER(COALESCE(status::text,'')) IN ('ACCEPTED','ACTIVE','RESERVED')
      GROUP BY unit_id HAVING COUNT(*) > 1
    `, tenantId);
    return rows.map((row) => ({
      ruleCode: "INVENTORY_CONFLICT", subjectType: "Unit", subjectId: row.unit_id,
      severity: "CRITICAL", reasonAr: "تعارض حجز أو عرض نشط على الوحدة نفسها.",
      reasonEn: "Multiple active reservations or accepted offers target the same unit.",
      revenueAtRisk: asNumber(row.value_at_risk), dueAt: new Date(), metadata: { conflictCount: asNumber(row.conflict_count) },
    }));
  });

  evaluatedRules.push("COMPLIANCE_BLOCK");
  const requiredProviders = ["ZATCA", "EJAR", "PAYLINK", "NGENIUS", "RESEND", "SIGNATURE"];
  const connections = await rawPrisma.revenueProviderConnection.findMany({ where: { tenantId } });
  const byProvider = new Map<string, any>(connections.map((item: any) => [String(item.provider), item] as [string, any]));
  for (const provider of requiredProviders) {
    const connection = byProvider.get(provider);
    if (!connection || connection.status !== "CONNECTED") {
      detected.push({
        ruleCode: "COMPLIANCE_BLOCK", subjectType: "Provider", subjectId: provider, severity: provider === "ZATCA" ? "HIGH" : "MEDIUM",
        reasonAr: `بوابة ${provider} غير جاهزة إنتاجياً.`, reasonEn: `${provider} production trust gate is not ready.`,
        revenueAtRisk: 0, dueAt: null, metadata: { status: connection?.status || "NOT_CONFIGURED", lastError: connection?.lastError || null },
      });
    }
  }

  const activeFingerprints: string[] = [];
  for (const risk of detected) {
    activeFingerprints.push(fingerprint(risk));
    await upsertRiskSignal(tenantId, actorId, risk);
  }

  const openSignals = await rawPrisma.revenueRiskSignal.findMany({
    where: { tenantId, status: { in: ["OPEN", "ACKNOWLEDGED"] }, ruleCode: { in: evaluatedRules } },
  });
  let resolved = 0;
  for (const signal of openSignals) {
    if (activeFingerprints.includes(signal.fingerprint)) continue;
    const updated = await rawPrisma.revenueRiskSignal.update({
      where: { id: signal.id },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolvedBy: actorId, resolutionReason: "AUTO_RESOLVED_BY_RULE_ENGINE" },
    });
    await appendRevenueEvent({
      tenantId, actorId, aggregateType: "RevenueRiskSignal", aggregateId: signal.id,
      eventType: "REVENUE_RISK_AUTO_RESOLVED", idempotencyKey: `risk-auto-resolved:${signal.id}:${updated.updatedAt.toISOString()}`,
      before: signal, after: updated, metadata: { ruleCode: signal.ruleCode },
    });
    resolved += 1;
  }

  const result = { detected: detected.length, resolved, evaluatedRules, skippedRules };
  await rawPrisma.revenueRuleRun.update({
    where: { id: run.id },
    data: { completedAt: new Date(), detectedCount: detected.length, resolvedCount: resolved, skippedRules: skippedRules as any, result: result as any },
  });

  await appendRevenueEvent({
    tenantId, actorId, aggregateType: "RevenueRuleRun", aggregateId: run.id,
    eventType: "REVENUE_RADAR_EVALUATED", idempotencyKey: `radar-evaluated:${run.id}`,
    after: result, metadata: { idempotencyKey },
  });

  return { runId: run.id, ...result };
}

export async function resolveRevenueRisk(tenantId: string, actorId: string, riskId: string, reason: string) {
  if (!reason.trim()) throw new Error("RESOLUTION_REASON_REQUIRED");
  const risk = await rawPrisma.revenueRiskSignal.findFirst({ where: { id: riskId, tenantId } });
  if (!risk) throw new Error("RISK_NOT_FOUND");
  const updated = await rawPrisma.revenueRiskSignal.update({
    where: { id: risk.id },
    data: { status: "RESOLVED", resolvedAt: new Date(), resolvedBy: actorId, resolutionReason: reason.trim() },
  });
  await appendRevenueEvent({
    tenantId, actorId, aggregateType: "RevenueRiskSignal", aggregateId: risk.id,
    eventType: "REVENUE_RISK_RESOLVED", idempotencyKey: `risk-resolved:${risk.id}:${updated.updatedAt.toISOString()}`,
    before: risk, after: updated,
  });
  return updated;
}

export async function acknowledgeRevenueRisk(tenantId: string, actorId: string, riskId: string) {
  const risk = await rawPrisma.revenueRiskSignal.findFirst({ where: { id: riskId, tenantId } });
  if (!risk) throw new Error("RISK_NOT_FOUND");
  const updated = await rawPrisma.revenueRiskSignal.update({
    where: { id: risk.id },
    data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date(), acknowledgedBy: actorId },
  });
  await appendRevenueEvent({
    tenantId, actorId, aggregateType: "RevenueRiskSignal", aggregateId: risk.id,
    eventType: "REVENUE_RISK_ACKNOWLEDGED", idempotencyKey: `risk-ack:${risk.id}:${updated.updatedAt.toISOString()}`,
    before: risk, after: updated,
  });
  return updated;
}
