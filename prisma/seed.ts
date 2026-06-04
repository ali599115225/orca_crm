import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ خطأ: DATABASE_URL فارغ!");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 جاري الاتصال بقاعدة البيانات...");
  console.log("🧹 جاري التنظيف...");

  await prisma.generalLedger.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.installment.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.mansourChat.deleteMany({});
  await prisma.leadActivity.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.payrollCommission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.agentSlot.deleteMany({});
  await prisma.usageMeter.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.followupSequence.deleteMany({});
  await prisma.platformConnection.deleteMany({});
  await prisma.agentLease.deleteMany({});
  await prisma.agentTelemetryLog.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log("🔑 جاري إنشاء البيانات التجريبية...");

  const securePassword = await bcrypt.hash("123456", 10);

  // Tenant
  const tenant = await prisma.tenant.create({
    data: {
      companyName: "شركة دار الأعمار العقارية",
      subdomain: "dar-al-amar",
      subscriptionPlan: "professional",
    },
  });

  // User
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "علي المدير",
      email: "admin@dar-al-amar.com",
      passwordHash: securePassword,
      role: "ADMIN",
    },
  });

  // Project
  const project = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      name: "نرجس ريزيدنس 101",
      city: "الرياض",
      status: "UNDER_CONSTRUCTION",
    },
  });

  // Unit — بدون tenantId لأنه غير موجود في schema
  const unit = await prisma.unit.create({
    data: {
      projectId: project.id,
      unitNumber: "A-101",
      floorPosition: 1,
      priceSar: 100000,
      status: "Reserved",
    },
  });

  // Contract — بدون tenantId
  const contract = await prisma.contract.create({
    data: {
      unitId: unit.id,
      buyerName: "سليمان الراشد",
      buyerPhone: "0505123456",
      totalVolumeSar: 100000,
    },
  });

  // Installments — بدون tenantId
  await prisma.installment.createMany({
    data: [
      {
        contractId: contract.id,
        installmentNumber: 1,
        amountSar: 50000,
        dueDate: new Date("2026-07-01"),
        paymentStatus: "Paid",
      },
      {
        contractId: contract.id,
        installmentNumber: 2,
        amountSar: 50000,
        dueDate: new Date("2026-12-01"),
        paymentStatus: "Pending",
      },
    ],
  });

  // Receipt — بدون tenantId
  const receipt = await prisma.receipt.create({
    data: {
      invoiceId: contract.id,
      amount: 50000,
      paymentMethod: "BANK_TRANSFER",
      status: "COMPLETED",
    },
  });

  // GeneralLedger — بدون tenantId
  // GeneralLedger — سجل واحد فقط لأن receiptId @unique
await prisma.generalLedger.create({
  data: {
    receiptId: receipt.id,
    debit: 50000,
    credit: 50000,
    description: "دفعة أولى - عقد رقم " + contract.id,
  },
});

  console.log("🎉 تمت التغذية بنجاح كامل!");
}

main()
  .catch((e) => {
    console.error("❌ خطأ أثناء الـ Seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });