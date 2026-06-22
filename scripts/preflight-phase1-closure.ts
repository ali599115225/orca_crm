import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const { prisma } = await import("../lib/prisma");

  const issues: string[] = [];

  const duplicateSaleInvoices = await prisma.$queryRaw<Array<{ contract_id: string; count: bigint }>>`
    SELECT "contract_id", COUNT(*) AS "count"
    FROM "invoices"
    WHERE "type" = 'SALE' AND "contract_id" IS NOT NULL
    GROUP BY "contract_id"
    HAVING COUNT(*) > 1
  `;
  for (const row of duplicateSaleInvoices) {
    issues.push(`DUPLICATE_SALE_INVOICE contract=${row.contract_id} count=${row.count}`);
  }

  const acceptedWithoutUnit = await prisma.offer.findMany({
    where: { status: "ACCEPTED", unitId: null },
    select: { id: true, tenantId: true },
  });
  for (const offer of acceptedWithoutUnit) {
    issues.push(`ACCEPTED_OFFER_WITHOUT_UNIT offer=${offer.id} tenant=${offer.tenantId}`);
  }

  const duplicateAcceptedUnits = await prisma.$queryRaw<
    Array<{ unit_id: string; count: bigint }>
  >`
    SELECT "unit_id", COUNT(*) AS "count"
    FROM "offers"
    WHERE "status" = 'ACCEPTED' AND "unit_id" IS NOT NULL
    GROUP BY "unit_id"
    HAVING COUNT(*) > 1
  `;
  for (const row of duplicateAcceptedUnits) {
    issues.push(
      `DUPLICATE_ACCEPTED_OFFER_UNIT unit=${row.unit_id} count=${row.count}`,
    );
  }
  const contractScopeMismatch = await prisma.$queryRaw<
    Array<{ contract_id: string; tenant_id: string; unit_tenant_id: string }>
  >`
    SELECT c."id" AS "contract_id", c."tenant_id", u."tenant_id" AS "unit_tenant_id"
    FROM "contracts" c
    JOIN "units" u ON u."id" = c."unit_id"
    WHERE c."tenant_id" <> u."tenant_id"
  `;
  for (const row of contractScopeMismatch) {
    issues.push(
      `CONTRACT_UNIT_TENANT_MISMATCH contract=${row.contract_id} contractTenant=${row.tenant_id} unitTenant=${row.unit_tenant_id}`,
    );
  }

  const offerScopeMismatch = await prisma.$queryRaw<
    Array<{ contract_id: string; contract_tenant_id: string; offer_tenant_id: string }>
  >`
    SELECT c."id" AS "contract_id", c."tenant_id" AS "contract_tenant_id", o."tenant_id" AS "offer_tenant_id"
    FROM "contracts" c
    JOIN "offers" o ON o."id" = c."offer_id"
    WHERE c."offer_id" IS NOT NULL AND c."tenant_id" <> o."tenant_id"
  `;
  for (const row of offerScopeMismatch) {
    issues.push(
      `CONTRACT_OFFER_TENANT_MISMATCH contract=${row.contract_id} contractTenant=${row.contract_tenant_id} offerTenant=${row.offer_tenant_id}`,
    );
  }

  const invalidAmounts = await prisma.contract.findMany({
    where: { totalVolumeSar: { lte: 0 } },
    select: { id: true, tenantId: true, totalVolumeSar: true },
  });
  for (const contract of invalidAmounts) {
    issues.push(
      `INVALID_CONTRACT_AMOUNT contract=${contract.id} tenant=${contract.tenantId} amount=${contract.totalVolumeSar}`,
    );
  }

  console.log(
    `PREFLIGHT contracts=${await prisma.contract.count()} acceptedOffers=${await prisma.offer.count({ where: { status: "ACCEPTED" } })} issues=${issues.length}`,
  );
  for (const issue of issues) console.error(`BLOCKER ${issue}`);

  await prisma.$disconnect();
  if (issues.length > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error("PREFLIGHT_FATAL", error);
  process.exitCode = 1;
});
