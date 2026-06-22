import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const { prisma } = await import("../lib/prisma");

  const completed = await prisma.paymentTransaction.aggregate({
    where: { status: "COMPLETED" },
    _count: { id: true },
    _sum: { amount: true },
  });
  const legacyContracts = await prisma.contract.count({
    where: { legacyFinancial: true, spineVersion: 1 },
  });
  const invalidCutoverContracts = await prisma.contract.count({
    where: {
      OR: [
        { spineVersion: { gte: 2 }, legacyFinancial: true },
        { spineVersion: 1, legacyFinancial: false },
      ],
    },
  });

  console.log(
    `CUTOVER_VERIFY completedPayments=${completed._count.id} completedAmount=${Number(completed._sum.amount || 0).toFixed(2)} legacyContracts=${legacyContracts} invalidCutoverContracts=${invalidCutoverContracts}`,
  );

  await prisma.$disconnect();
  if (invalidCutoverContracts > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error("CUTOVER_VERIFY_FATAL", error);
  process.exitCode = 1;
});
