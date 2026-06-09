import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error("❌ DATABASE_URL فارغ!"); process.exit(1); }

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 جاري إنشاء شركة العرض التجريبي...");

  let tenantId = "";
  const existing = await prisma.tenant.findFirst({ where: { subdomain: "demo" } });
  if (existing) {
    console.log("⚠️ شركة العرض موجودة مسبقاً. جاري التحديث...");
    tenantId = existing.id;
    await prisma.leadActivity.deleteMany({ where: { tenantId } });
    await prisma.task.deleteMany({ where: { tenantId } });
    await prisma.lead.deleteMany({ where: { tenantId } });
    await prisma.installment.deleteMany({ where: { tenantId } });
    await prisma.contract.deleteMany({ where: { tenantId } });
    await prisma.unit.deleteMany({ where: { tenantId } });
    await prisma.project.deleteMany({ where: { tenantId } });
    await prisma.tour.deleteMany({ where: { tenantId } });
    await prisma.offer.deleteMany({ where: { tenantId } });
    await prisma.opportunity.deleteMany({ where: { tenantId } });
    await prisma.mansourChat.deleteMany({ where: { tenantId } });
    await prisma.agentSlot.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
  } else {
    const t = await prisma.tenant.create({
      data: { companyName: "ORCA Demo Real Estate", subdomain: "demo", subscriptionPlan: "gold", isActive: true, paymentStatus: "PAID", billingCycle: "MONTHLY" },
    });
    tenantId = t.id;
  }

  const password = await bcrypt.hash("Demo@2026", 10);

  const admin = await prisma.user.create({ data: { tenantId, name: "أحمد المدير", email: "admin@demo.orca-crm.com", passwordHash: password, role: "ADMIN" } });
  const sara = await prisma.user.create({ data: { tenantId, name: "سارة المبيعات", email: "sara@demo.orca-crm.com", passwordHash: password, role: "SALES_MANAGER" } });
  const khalid = await prisma.user.create({ data: { tenantId, name: "خالد مندوب", email: "khalid@demo.orca-crm.com", passwordHash: password, role: "SALES_EMPLOYEE" } });

  const p1 = await prisma.project.create({ data: { tenantId, name: "شمال الرياض – فلل النرجس", city: "الرياض", status: "UNDER_CONSTRUCTION", unitsTotal: 45, unitsSold: 28, minPrice: 1200000, maxPrice: 3500000 } });
  const p2 = await prisma.project.create({ data: { tenantId, name: "جدة – شقق المروة", city: "جدة", status: "UNDER_CONSTRUCTION", unitsTotal: 120, unitsSold: 45, minPrice: 450000, maxPrice: 950000 } });
  const p3 = await prisma.project.create({ data: { tenantId, name: "الدمام – تاون هاوس", city: "الدمام", status: "PLANNING", unitsTotal: 30, unitsSold: 0, minPrice: 850000, maxPrice: 1800000 } });

  const units = [];
  const unitDefs = [
    { p: p1, num: "V-001", type: "فيلا", price: 2800000, area: "450 م²", status: "Available", beds: 5, desc: "فيلا مستقلة مع حديقة خاصة ومسبح" },
    { p: p1, num: "V-002", type: "فيلا", price: 3200000, area: "520 م²", status: "Available", beds: 6, desc: "فيلا فاخرة مع إطلالة على الحديقة المركزية" },
    { p: p1, num: "V-003", type: "فيلا", price: 1500000, area: "300 م²", status: "Sold", beds: 4 },
    { p: p2, num: "A-001", type: "شقة", price: 520000, area: "180 م²", status: "Available", beds: 3, desc: "شقة ثلاث غرف مع سطح خاص" },
    { p: p2, num: "A-002", type: "شقة", price: 680000, area: "220 م²", status: "Hold", beds: 4, desc: "شقة أربع غرف – تحت الحجز" },
    { p: p2, num: "A-003", type: "شقة", price: 450000, area: "150 م²", status: "Available", beds: 2 },
    { p: p3, num: "TH-001", type: "تاون هاوس", price: 1200000, area: "280 م²", status: "Available", beds: 4 },
  ];
  for (let i = 0; i < unitDefs.length; i++) {
    const u = unitDefs[i];
    units.push(await prisma.unit.create({
      data: { tenantId, projectId: u.p.id, unitNumber: u.num, floorPosition: i + 1, type: u.type, priceSar: u.price, area: u.area, status: u.status, city: u.p.city, beds: u.beds, description: u.desc || null },
    }));
  }

  const leads = [];
  const leadDefs = [
    { first: "محمد", last: "العنزي", phone: "0555000111", status: "NEW", source: "WhatsApp", city: "الرياض", score: 92, project: p1 },
    { first: "نورة", last: "الشريف", phone: "0555000222", status: "VISIT_SCHEDULED", source: "Instagram", city: "جدة", score: 78, project: p2 },
    { first: "فهد", last: "الدوسري", phone: "0555000333", status: "VISITED", source: "Google Ads", city: "الدمام", score: 85, project: p3 },
    { first: "سارة", last: "القحطاني", phone: "0555000444", status: "OFFER_MADE", source: "Referral", city: "الرياض", score: 90, project: p1 },
    { first: "عبدالله", last: "الغامدي", phone: "0555000555", status: "CONTRACT_SIGNED", source: "WhatsApp", city: "الرياض", score: 95, project: p1 },
    { first: "هند", last: "العمري", phone: "0555000666", status: "LOST", source: "Website", city: "جدة", score: 30, project: p2 },
  ];
  for (const l of leadDefs) {
    leads.push(await prisma.lead.create({
      data: { tenantId, firstName: l.first, lastName: l.last, phone: l.phone, status: l.status as any, source: l.source, city: l.city, leadScore: l.score, projectId: l.project.id },
    }));
  }

  await prisma.leadActivity.createMany({ data: [
    { tenantId, leadId: leads[0].id, activityType: "NOTE", description: "عميل مهتم جداً – طلب كتيب أسعار" },
    { tenantId, leadId: leads[1].id, activityType: "CALL", description: "اتصال هاتفي – العميل ستأتي للزيارة الخميس القادم" },
    { tenantId, leadId: leads[4].id, activityType: "CONTRACT", description: "تم توقيع عقد الحجز" },
  ]});

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  await prisma.task.createMany({ data: [
    { tenantId, leadId: leads[0].id, title: "متابعة عرض السعر", assignedTo: sara.id, dueDate: tomorrow, priority: "HIGH", status: "PENDING" },
    { tenantId, leadId: leads[2].id, title: "إرسال كتيب المشروع", assignedTo: khalid.id, dueDate: tomorrow, priority: "HIGH", status: "PENDING" },
    { tenantId, leadId: leads[3].id, title: "متابعة العرض المقدم", assignedTo: sara.id, dueDate: tomorrow, priority: "HIGH", status: "PENDING" },
  ]});

  await prisma.agentSlot.createMany({ data: [
    { tenantId, agentType: "MANSOUR", slotNumber: 1, isActive: true },
    { tenantId, agentType: "SAHER", slotNumber: 2, isActive: true },
    { tenantId, agentType: "SANAD", slotNumber: 3, isActive: true },
    { tenantId, agentType: "BASEER", slotNumber: 4, isActive: true },
    { tenantId, agentType: "KHABEER", slotNumber: 5, isActive: true },
  ]});

  for (const chat of [
    { name: "محمد العنزي", phone: "0555000111", msg: "هل فيه فلل متوفرة في النرجس؟", leadId: leads[0].id },
    { name: "عبدالله الغامدي", phone: "0555000555", msg: "تم توقيع العقد ✓", leadId: leads[4].id },
    { name: "نورة الشريف", phone: "0555000222", msg: "شكراً لكم على المتابعة", leadId: leads[1].id },
  ]) {
    await prisma.mansourChat.create({
      data: { tenantId, contactName: chat.name, contactPhone: chat.phone, lastMessage: chat.msg, messagesJson: "[]", leadId: chat.leadId },
    });
  }

  console.log("\n═══════════════════════════════════════");
  console.log("✅ شركة العرض التجريبي جاهزة!");
  console.log("═══════════════════════════════════════");
  console.log("🏢 ORCA Demo Real Estate (subdomain: demo)");
  console.log("👤 Admin:   admin@demo.orca-crm.com / Demo@2026");
  console.log("👤 Manager: sara@demo.orca-crm.com / Demo@2026");
  console.log("👤 Agent:   khalid@demo.orca-crm.com / Demo@2026");
  console.log(`📊 ${leads.length} Leads, ${units.length} Units, 3 Projects`);
  console.log("═══════════════════════════════════════");
}

main().catch(e => { console.error(e); process.exit(1); });
