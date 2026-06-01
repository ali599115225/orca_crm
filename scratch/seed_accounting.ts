import { prisma } from "../lib/prisma";

async function main() {
  const tenant = await prisma.tenant.findFirst();

  if (!tenant) {
    console.log("No tenant found");
    return;
  }

  const existing = await (prisma as any).ledgerEntry.count({ where: { tenantId: tenant.id } });
  if (existing > 0) {
    console.log("Ledger entries already exist. Deleting them...");
    await (prisma as any).ledgerEntry.deleteMany({ where: { tenantId: tenant.id } });
  }

  const MOCK_LEDGER = [
    { date: new Date("2026-05-01"), description: "إيجار شقة A-101 — فيصل العمري",    type: "إيراد",  amount: 45000, category: "إيجار" },
    { date: new Date("2026-05-03"), description: "صيانة مبنى B — شركة الإعمار",       type: "مصروف", amount: 8500,  category: "صيانة" },
    { date: new Date("2026-05-10"), description: "عمولة بيع وحدة مشروع النخبة",       type: "إيراد",  amount: 32000, category: "مبيعات" },
    { date: new Date("2026-05-12"), description: "رواتب الموظفين — مايو ٢٠٢٦",        type: "مصروف", amount: 55000, category: "رواتب" },
    { date: new Date("2026-05-15"), description: "إيجار مكتب C-22 — أحمد الغامدي",   type: "إيراد",  amount: 36000, category: "إيجار" },
    { date: new Date("2026-05-18"), description: "فاتورة كهرباء وخدمات المباني",      type: "مصروف", amount: 12000, category: "مرافق" },
    { date: new Date("2026-05-22"), description: "عائد استثمار محفظة الأصول العقارية",type: "إيراد",  amount: 120000,category: "استثمار" },
    { date: new Date("2026-05-28"), description: "رسوم تسويق وإعلانات الربع الثاني",  type: "مصروف", amount: 18000, category: "تسويق" },
  ];

  for (const entry of MOCK_LEDGER) {
    await (prisma as any).ledgerEntry.create({
      data: {
        tenantId: tenant.id,
        date: entry.date,
        description: entry.description,
        type: entry.type,
        amount: entry.amount,
        category: entry.category,
      }
    });
  }

  console.log("Successfully seeded LedgerEntries!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
