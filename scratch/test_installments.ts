// scratch/test_installments.ts
import dotenv from "dotenv";
dotenv.config({ path: "c:/Users/ali59/Desktop/REDC/.env" });

async function run() {
  console.log("🚀 تهيئة بيانات الأقساط للتجربة...");
  console.log("DATABASE_URL:", process.env.DATABASE_URL);

  const { prisma } = await import("../lib/prisma");
  const { runInstallmentAgentAction } = await import("../app/actions/sanadAgent");

  // 1. جلب شركة الإنماء العقارية الكبرى
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: "alinma-gold" },
  });

  if (!tenant) {
    console.error("❌ لم يتم العثور على شركة الإنماء العقارية الكبرى.");
    return;
  }

  // 2. جلب أو إنشاء مشروع
  let project = await prisma.project.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: "برج الجوهرة الفاخر",
        city: "الرياض",
        status: "UNDER_CONSTRUCTION",
      },
    });
  }

  // 3. جلب أو إنشاء وحدة عقارية
  let unit = await prisma.unit.findFirst({
    where: { projectId: project.id },
  });

  if (!unit) {
    unit = await prisma.unit.create({
      data: {
        projectId: project.id,
        unitNumber: "٩٩٩",
        floorPosition: 14,
        priceSar: 2500000.0,
        status: "Available",
      },
    });
  }

  // 4. إنشاء عقد بيع نهائي
  let contract = await prisma.contract.findFirst({
    where: { unitId: unit.id },
  });

  if (!contract) {
    contract = await prisma.contract.create({
      data: {
        unitId: unit.id,
        buyerName: "أحمد بن عبد العزيز",
        buyerPhone: "+966557516311", // رقم جوال المشتري
        totalVolumeSar: 2500000.0,
      },
    });
  }

  // 5. إنشاء قسط معلق يستحق غداً (Due soon)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // إزالة أي أقساط سابقة لنفس العقد لتجنب التكرار
  await prisma.installment.deleteMany({
    where: { contractId: contract.id },
  });

  const installment = await prisma.installment.create({
    data: {
      contractId: contract.id,
      installmentNumber: 1,
      amountSar: 125000.00,
      dueDate: tomorrow,
      paymentStatus: "Pending",
    },
  });

  console.log(`✅ تم إنشاء قسط تجريبي معلق بنجاح:`);
  console.log(`- المشتري: ${contract.buyerName}`);
  console.log(`- الوحدة: الشقة رقم ${unit.unitNumber}`);
  console.log(`- المبلغ: ${installment.amountSar} ر.س`);
  console.log(`- تاريخ الاستحقاق: ${tomorrow.toLocaleDateString("ar-SA")}`);

  // 6. تشغيل محرك تحصيل الوكيل سند
  console.log("\n🤖 تشغيل محرك تحصيل الوكيل سند...");
  const result = await runInstallmentAgentAction();
  console.log("النتيجة:", result);

  // 7. التحقق من سجل التتبع للوكيل سند في قاعدة البيانات
  console.log("\n📊 جلب سجل التتبع الحركي الأخير للوكيل سند...");
  const log = await prisma.agentTelemetryLog.findFirst({
    where: {
      tenantId: tenant.id,
      agentId: "Sanad",
    },
    orderBy: { createdAt: "desc" },
  });

  if (log) {
    console.log(`- السجل المكتوب: "${log.logMessageAr}"`);
    console.log(`- نوع الإجراء: ${log.actionType}`);
    console.log(`- الخطورة: ${log.severity}`);
  } else {
    console.log("❌ لم يتم كتابة سجل تتبع للوكيل سند.");
  }
}

run()
  .catch((e) => {
    console.error("❌ حدث خطأ غير متوقع:", e);
  })
  .finally(async () => {
    const { prisma } = await import("../lib/prisma");
    await prisma.$disconnect();
  });
