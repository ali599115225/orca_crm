import { loadEnvConfig } from "@next/env";

function asNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  return Number(value || 0);
}

async function scalar(prisma: any, sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe(sql);
  return asNumber(rows?.[0]?.count);
}

async function main() {
  loadEnvConfig(process.cwd());
  const { rawPrisma } = await import("../lib/prisma");

  const checks = {
    opportunitiesWithoutPassport: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM opportunities o
       LEFT JOIN deal_passports d ON d.opportunity_id = o.id AND d.tenant_id = o.tenant_id
       WHERE d.id IS NULL`,
    ),
    contractsWithoutPassport: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM contracts c
       LEFT JOIN deal_passports d ON d.contract_id = c.id AND d.tenant_id = c.tenant_id
       WHERE d.id IS NULL`,
    ),
    passportsWithoutEvents: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM deal_passports d
       LEFT JOIN deal_events e ON e.deal_id = d.id
       WHERE e.id IS NULL`,
    ),
    linkedOpportunityContractPassportMismatch: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM contracts c
       JOIN offers f ON f.id = c.offer_id
       JOIN opportunities o ON o.id = f.linked_opportunity_id
       LEFT JOIN deal_passports by_contract
         ON by_contract.contract_id = c.id AND by_contract.tenant_id = c.tenant_id
       LEFT JOIN deal_passports by_opportunity
         ON by_opportunity.opportunity_id = o.id AND by_opportunity.tenant_id = o.tenant_id
       WHERE by_contract.id IS NULL
          OR by_opportunity.id IS NULL
          OR by_contract.id <> by_opportunity.id`,
    ),
    passportTenantMismatch: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM deal_passports d
       LEFT JOIN opportunities o ON o.id = d.opportunity_id
       LEFT JOIN contracts c ON c.id = d.contract_id
       WHERE (o.id IS NOT NULL AND o.tenant_id <> d.tenant_id)
          OR (c.id IS NOT NULL AND c.tenant_id <> d.tenant_id)`,
    ),
    eventTenantMismatch: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM deal_events e
       JOIN deal_passports d ON d.id = e.deal_id
       WHERE e.tenant_id <> d.tenant_id`,
    ),
    blankCorrelation: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM deal_events
       WHERE correlation_id IS NULL OR BTRIM(correlation_id) = ''`,
    ),
    invalidActorType: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM deal_events
       WHERE actor_type NOT IN ('USER', 'SYSTEM', 'PROVIDER', 'BACKFILL')`,
    ),
    sequenceGapsOrProjectionMismatch: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM deal_passports d
       LEFT JOIN (
         SELECT deal_id, COUNT(*)::int AS event_count, COALESCE(MAX(sequence), 0)::int AS max_sequence
         FROM deal_events
         GROUP BY deal_id
       ) e ON e.deal_id = d.id
       WHERE COALESCE(e.event_count, 0) <> COALESCE(e.max_sequence, 0)
          OR d.last_sequence <> COALESCE(e.max_sequence, 0)`,
    ),
    lastEventMismatch: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM deal_passports d
       LEFT JOIN LATERAL (
         SELECT id, occurred_at
         FROM deal_events e
         WHERE e.deal_id = d.id
         ORDER BY sequence DESC
         LIMIT 1
       ) latest ON TRUE
       WHERE d.last_event_id IS DISTINCT FROM latest.id
          OR d.last_event_at IS DISTINCT FROM latest.occurred_at`,
    ),
    crossDealCausation: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM deal_events child
       JOIN deal_events parent ON parent.id = child.causation_id
       WHERE child.deal_id <> parent.deal_id OR child.tenant_id <> parent.tenant_id`,
    ),
    causationNotEarlier: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM deal_events child
       JOIN deal_events parent ON parent.id = child.causation_id
       WHERE parent.sequence >= child.sequence`,
    ),
    invalidFinancialActivationCausation: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM deal_events financial
       LEFT JOIN deal_events signed ON signed.id = financial.causation_id
       WHERE financial.event_type = 'financials.activated'
         AND (
           signed.id IS NULL
           OR signed.event_type <> 'contract.signed'
           OR signed.deal_id <> financial.deal_id
           OR signed.tenant_id <> financial.tenant_id
           OR signed.correlation_id <> financial.correlation_id
         )`,
    ),
    // PHASE02_LEGACY_FINANCIAL_EVENT_RULE:
    // Every SIGNED contract needs contract.signed. financials.activated is required only
    // when both a PaymentPlan and a SALE invoice exist for the same tenant/contract.
    signedContractsMissingEvents: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM contracts c
       JOIN deal_passports d ON d.contract_id = c.id AND d.tenant_id = c.tenant_id
       WHERE c.status = 'SIGNED'
         AND (
           NOT EXISTS (
             SELECT 1 FROM deal_events e
             WHERE e.deal_id = d.id AND e.idempotency_key = 'contract.signed:' || c.id::text
           )
           OR (
             EXISTS (
               SELECT 1 FROM payment_plans p
               WHERE p.contract_id = c.id AND p.tenant_id = c.tenant_id
             )
             AND EXISTS (
               SELECT 1 FROM invoices i
               WHERE i.contract_id = c.id
                 AND i.tenant_id = c.tenant_id
                 AND i.type = 'SALE'
             )
             AND NOT EXISTS (
               SELECT 1 FROM deal_events e
               WHERE e.deal_id = d.id AND e.idempotency_key = 'financials.activated:' || c.id::text
             )
           )
         )`,
    ),
    completedSalePaymentsMissingEvents: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM payment_transactions p
       JOIN invoices i ON i.id = p.invoice_id
       JOIN deal_passports d ON d.contract_id = i.contract_id AND d.tenant_id = p.tenant_id
       WHERE p.status = 'COMPLETED'
         AND i.contract_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM deal_events e
           WHERE e.deal_id = d.id AND e.idempotency_key = 'payment.completed:' || p.id::text
         )`,
    ),
    paidSaleInvoicesWithoutCompletionEvidence: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM invoices i
       JOIN deal_passports d ON d.contract_id = i.contract_id AND d.tenant_id = i.tenant_id
       WHERE i.contract_id IS NOT NULL
         AND LOWER(i.status) = 'paid'
         AND NOT EXISTS (
           SELECT 1
           FROM deal_events e
           WHERE e.deal_id = d.id
             AND e.event_type = 'payment.completed'
             AND e.payload ->> 'invoiceId' = i.id::text
         )`,
    ),
    payloadCausationLeak: await scalar(
      rawPrisma,
      `SELECT COUNT(*)::bigint AS count
       FROM deal_events
       WHERE payload ? 'causationId'`,
    ),
  };

  console.log(JSON.stringify(checks, null, 2));
  await rawPrisma.$disconnect();

  const failures = Object.entries(checks).filter(([, value]) => value > 0);
  if (failures.length > 0) {
    console.error(`PHASE02_CLOSURE_FAILED checks=${failures.map(([name]) => name).join(',')}`);
    process.exitCode = 2;
    return;
  }
  console.log("PHASE02_CLOSURE_PASS");
}

main().catch((error) => {
  console.error("PHASE02_VERIFY_FATAL", error);
  process.exitCode = 1;
});
