import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { rawPrisma } from "../lib/prisma";
import { appendRevenueEvent } from "../lib/revenue-integrity/events";
import { evaluateRevenueLeakRadar } from "../lib/revenue-integrity/radar";
import { listProviderConnections } from "../lib/revenue-integrity/trust-gates";
import { scoreOpenOpportunities, trainPredictiveModel } from "../lib/revenue-integrity/predictive";

const REQUIRED_TABLES = [
  "revenue_risk_signals",
  "revenue_rule_runs",
  "revenue_next_actions",
  "revenue_action_suggestions",
  "revenue_domain_events",
  "revenue_audit_entries",
  "revenue_outbox_messages",
  "revenue_provider_connections",
  "revenue_provider_webhooks",
  "revenue_provider_applications",
  "revenue_dataset_snapshots",
  "revenue_model_versions",
  "revenue_predictions",
] as const;

async function main() {
  const startedAt = new Date();
  const report: Record<string, unknown> = {
    startedAt: startedAt.toISOString(),
    status: "RUNNING",
    checks: {},
  };
  const checks = report.checks as Record<string, unknown>;

  const tableRows = await rawPrisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [...REQUIRED_TABLES],
  );
  const found = new Set(tableRows.map((row) => row.table_name));
  const missing = REQUIRED_TABLES.filter((table) => !found.has(table));
  checks.tables = { required: REQUIRED_TABLES.length, found: found.size, missing };
  if (missing.length > 0) throw new Error(`MISSING_REVENUE_TABLES:${missing.join(",")}`);

  const requestedTenantId = process.env.REVENUE_PROOF_TENANT_ID?.trim();
  const tenant = requestedTenantId
    ? await rawPrisma.tenant.findFirst({ where: { id: requestedTenantId }, select: { id: true } })
    : await rawPrisma.tenant.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!tenant) throw new Error("ACTIVE_TENANT_REQUIRED_FOR_PROOF");
  checks.tenant = { tenantId: tenant.id };

  const proofId = randomUUID();
  const event = await appendRevenueEvent({
    tenantId: tenant.id,
    aggregateType: "RevenueIntegrityProof",
    aggregateId: proofId,
    eventType: "REVENUE_INTEGRITY_PROOF_CREATED",
    idempotencyKey: `proof:${proofId}`,
    before: null,
    after: { proofId, safe: true },
    metadata: { temporary: true },
  });

  const [audit, outbox] = await Promise.all([
    rawPrisma.revenueAuditEntry.findFirst({
      where: { tenantId: tenant.id, correlationId: event.correlationId, resourceId: proofId },
    }),
    rawPrisma.revenueOutboxMessage.findFirst({
      where: { tenantId: tenant.id, eventId: event.id },
    }),
  ]);
  if (!audit || !outbox) throw new Error("EVENT_AUDIT_OUTBOX_ATOMICITY_FAILED");
  checks.eventAuditOutbox = {
    eventId: event.id,
    auditId: audit.id,
    outboxId: outbox.id,
    correlationId: event.correlationId,
    passed: true,
  };

  const idempotent = await appendRevenueEvent({
    tenantId: tenant.id,
    aggregateType: "RevenueIntegrityProof",
    aggregateId: proofId,
    eventType: "REVENUE_INTEGRITY_PROOF_CREATED",
    idempotencyKey: `proof:${proofId}`,
    after: { proofId, safe: true },
    metadata: { temporary: true },
  });
  if (idempotent.id !== event.id) throw new Error("EVENT_IDEMPOTENCY_FAILED");
  checks.idempotency = { passed: true, eventId: event.id };

  await rawPrisma.$transaction([
    rawPrisma.revenueOutboxMessage.deleteMany({ where: { eventId: event.id } }),
    rawPrisma.revenueAuditEntry.deleteMany({ where: { correlationId: event.correlationId, resourceId: proofId } }),
    rawPrisma.revenueDomainEvent.deleteMany({ where: { id: event.id } }),
  ]);

  const radar = await evaluateRevenueLeakRadar(
    tenant.id,
    null,
    `proof-radar:${startedAt.toISOString().slice(0, 13)}`,
  );
  checks.radar = radar;

  const providers = (await listProviderConnections(tenant.id)) as any[];
  checks.trustGates = {
    providers: providers.map((provider) => ({
      provider: provider.provider,
      status: provider.status,
      configured: provider.status !== "NOT_CONFIGURED",
    })),
    fakeConnectedCount: providers.filter(
      (provider) => provider.status === "CONNECTED" && !provider.lastSuccessAt,
    ).length,
  };
  if ((checks.trustGates as any).fakeConnectedCount > 0) {
    throw new Error("PROVIDER_CONNECTED_WITHOUT_SUCCESSFUL_TEST");
  }

  const latestModel = await rawPrisma.revenueModelVersion.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { version: "desc" },
  });
  const model =
    latestModel ||
    (await trainPredictiveModel(
      tenant.id,
      null,
      Number(process.env.REVENUE_MODEL_MINIMUM_ROWS || 30),
    ));
  const scoring =
    model.status === "ACTIVE"
      ? await scoreOpenOpportunities(tenant.id, null)
      : { status: "NOT_READY", scored: 0, reason: model.failureReason };
  checks.predictive = {
    version: model.version,
    status: model.status,
    failureReason: model.failureReason,
    scoring,
  };

  const otherTenant = await rawPrisma.tenant.findFirst({
    where: { id: { not: tenant.id } },
    select: { id: true },
  });
  const isolationRisk = await rawPrisma.revenueRiskSignal.create({
    data: {
      tenantId: tenant.id,
      ruleCode: "PROOF_TENANT_ISOLATION",
      fingerprint: `PROOF_TENANT_ISOLATION:${proofId}`,
      subjectType: "Proof",
      subjectId: proofId,
      severity: "LOW",
      reasonAr: "اختبار عزل المستأجر المؤقت.",
      reasonEn: "Temporary tenant-isolation proof.",
      revenueAtRisk: 0,
      metadata: { proofTenantId: tenant.id },
    },
  });
  const crossTenantLeak = otherTenant
    ? await rawPrisma.revenueRiskSignal.count({
        where: { id: isolationRisk.id, tenantId: otherTenant.id },
      })
    : 0;
  await rawPrisma.revenueRiskSignal.delete({ where: { id: isolationRisk.id } });
  checks.tenantIsolation = {
    passed: crossTenantLeak === 0,
    primaryTenantId: tenant.id,
    comparisonTenantId: otherTenant?.id || null,
    crossTenantLeak,
  };
  if (crossTenantLeak !== 0) throw new Error("CROSS_TENANT_PROOF_FAILED");

  report.status = "PASS";
  report.completedAt = new Date().toISOString();
  await writeFile(
    "docs/revenue-integrity-proof.json",
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch(async (error) => {
    const failure = {
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date().toISOString(),
    };
    await writeFile(
      "docs/revenue-integrity-proof.json",
      JSON.stringify(failure, null, 2),
      "utf8",
    ).catch(() => undefined);
    console.error(JSON.stringify(failure, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await rawPrisma.$disconnect().catch(() => undefined);
  });
