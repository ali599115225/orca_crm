// prisma/seed-stress.ts — DS1-C Stress Test Tenant Seed
// Idempotent, tenant-scoped. Follows seed-demo.ts pattern.
// Run: npx tsx prisma/seed-stress.ts
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error("❌ DATABASE_URL empty!"); process.exit(1); }

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TENANT_SUBDOMAIN = "stress";
const TOTAL_PROJECTS = 20;
const TOTAL_LEADS = 500;
const TOTAL_CONTACTS = 120;
const TOTAL_OPPORTUNITIES = 80;
const TOTAL_OFFERS = 60;
const TOTAL_TASKS = 80;
const TOTAL_TOURS = 40;
const TOTAL_CONTRACTS = 50;
const TOTAL_INVOICES = 100;
const TOTAL_PAYMENTS = 100;
const TOTAL_INSTALLMENTS = 120;
const TOTAL_WHATSAPP_MSGS = 30;
const TOTAL_EMAIL_MSGS = 20;
const TOTAL_TELEMETRY = 40;

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number, decimals = 2): number { return parseFloat((Math.random() * (max - min) + min).toFixed(decimals)); }
function futureDate(daysAhead: number): Date { const d = new Date(); d.setDate(d.getDate() + daysAhead); return d; }
function pastDate(daysAgo: number): Date { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d; }
function randomPhone(): string { return `0599000${String(randInt(100, 999)).padStart(3, '0')}`; }
function randomEmail(name: string): string { return `${name.replace(/\s+/g, '.').toLowerCase()}.${randInt(1, 999)}@stress.test`; }

const CITIES = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر", "أبها", "تبوك"];
const FIRST_NAMES = ["فهد", "عبدالله", "محمد", "سلمان", "نورة", "سارة", "خالد", "عمر", "منصور", "لمى", "هند", "بدر", "مشعل", "راشد", "وليد", "ناصر", "سلطان", "فيصل", "تركي", "ماجد"];
const LAST_NAMES = ["الشهري", "الغامدي", "القحطاني", "الدوسري", "العتيبي", "المطيري", "الشمري", "الحربي", "الزهراني", "السلمي"];
const SOURCES = ["WHATSAPP", "WEBSITE", "REFERRAL", "Google Ads", "Meta Ads", "Snapchat Ads", "TikTok Ads"];
const PROJECT_NAMES = [
  "برج النخلة", "فلل الياسمين", "شقق الملقا", "مجمع السدرة", "واحة الرفيعة",
  "أبراج العليا", "فلل قرطبة", "شقق الصحافة", "مجمع النرجس", "واحة العقيق",
  "برج حطين", "فلل الربيع", "شقق العقيق", "مجمع الغدير", "واحة الياسمين",
  "أبراج الملك", "فلل السويدي", "شقق الياسمين", "مجمع التعاون", "واحة النخيل"
];
const UNIT_TYPES = ["شقة سكنية", "فيلا مستقلة", "فيلا علوية", "مكتب تجاري", "دوبلكس", "بنتهاوس"];
const LEAD_STATUSES = ["NEW", "CONTACTED", "VISIT_SCHEDULED", "VISITED", "OFFER_MADE", "RESERVED", "CONTRACT_SIGNED", "WON", "LOST"];
const TASK_TITLES = [
  "متابعة اتصال هاتفي", "إرسال بروشور المشروع", "تأكيد موعد الجولة", "إعداد عرض سعر", "مراجعة العقد",
  "إرسال كتيب إلكتروني", "تنسيق موعد المعاينة", "تحديث بيانات العميل", "إرسال فيديو المشروع", "جدولة اجتماع"
];

async function main() {
  console.log("🚀 ORCA Stress Demo Tenant Seed — DS1-C");
  console.log("");

  const securePassword = await bcrypt.hash("Stress@2026!", 10);

  // ── Tenant ──
  let tenantId = "";
  const existing = await prisma.tenant.findFirst({ where: { subdomain: TENANT_SUBDOMAIN } });
  if (existing) {
    console.log("⚠️ Tenant 'stress' exists. Resetting its data...");
    tenantId = existing.id;
    // Clean only this tenant's data
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
    await prisma.contact.deleteMany({ where: { tenantId } });
    await prisma.mansourChat.deleteMany({ where: { tenantId } });
    await prisma.whatsAppMessage.deleteMany({ where: { tenantId } });
    await prisma.whatsAppContact.deleteMany({ where: { tenantId } });
    await prisma.emailMessage.deleteMany({ where: { tenantId } });
    await prisma.rentalInvoice.deleteMany({ where: { tenantId } });
    await prisma.rentalLease.deleteMany({ where: { tenantId } });
    await prisma.paymentTransaction.deleteMany({ where: { tenantId } });
    await prisma.agentSlot.deleteMany({ where: { tenantId } });
    await prisma.agentTelemetryLog.deleteMany({ where: { tenantId } });
    await prisma.usageMeter.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.update({ where: { id: tenantId }, data: { companyName: "ORCA Stress Demo Real Estate", subscriptionPlan: "gold", paymentStatus: "PAID", billingCycle: "YEARLY", subscriptionExpiresAt: futureDate(365), isActive: true, whatsappConnected: false } });
  } else {
    const t = await prisma.tenant.create({
      data: { companyName: "ORCA Stress Demo Real Estate", subdomain: TENANT_SUBDOMAIN, subscriptionPlan: "gold", isActive: true, paymentStatus: "PAID", billingCycle: "YEARLY", subscriptionExpiresAt: futureDate(365), whatsappConnected: false },
    });
    tenantId = t.id;
  }

  console.log(`✅ Tenant: ${tenantId}`);

  // ── Users (10) ──
  const roles = ["ADMIN", "SALES_MANAGER", "SALES_MANAGER", "SALES_EMPLOYEE", "SALES_EMPLOYEE", "SALES_EMPLOYEE", "SALES_EMPLOYEE", "SALES_EMPLOYEE", "MARKETING", "MARKETING"];
  const userEmails = ["admin@stress.test", "manager1@stress.test", "manager2@stress.test", "sales1@stress.test", "sales2@stress.test", "sales3@stress.test", "sales4@stress.test", "sales5@stress.test", "mkt1@stress.test", "mkt2@stress.test"];
  const users: any[] = [];
  for (let i = 0; i < roles.length; i++) {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const u = await prisma.user.create({
      data: { tenantId, name, email: userEmails[i], passwordHash: securePassword, role: roles[i] as any, isActive: true },
    });
    users.push(u);
  }
  console.log(`✅ Users: ${users.length}`);

  // ── Projects (20) ──
  const projects: any[] = [];
  for (let i = 0; i < TOTAL_PROJECTS; i++) {
    const p = await prisma.project.create({
      data: {
        tenantId, name: PROJECT_NAMES[i], city: pick(CITIES),
        status: pick(["PLANNING", "UNDER_CONSTRUCTION", "COMPLETED", "SOLD_OUT"]) as any,
        unitsTotal: randInt(20, 80), unitsSold: randInt(0, 30), unitsBooked: randInt(0, 15),
        minPrice: randInt(500000, 2000000), maxPrice: randInt(2000000, 6000000),
      },
    });
    projects.push(p);
  }
  console.log(`✅ Projects: ${projects.length}`);

  // ── Units (200) ──
  const units: any[] = [];
  for (let i = 0; i < 200; i++) {
    const p = pick(projects);
    const minP = typeof p.minPrice === 'object' ? Number(p.minPrice) : (p.minPrice || 500000);
    const maxP = typeof p.maxPrice === 'object' ? Number(p.maxPrice) : (p.maxPrice || 3000000);
    const u = await prisma.unit.create({
      data: {
        tenantId, projectId: p.id, unitNumber: `U-${String(i + 1).padStart(3, '0')}`,
        floorPosition: randInt(1, 15), priceSar: randInt(Math.max(500000, minP), Math.min(5000000, Math.round(maxP))),
        type: pick(UNIT_TYPES), area: `${randInt(80, 400)} م²`, beds: randInt(1, 5), city: p.city, district: "حي تجريبي",
        status: pick(["Available", "Hold", "Sold"]),
      },
    });
    units.push(u);
  }
  console.log(`✅ Units: ${units.length}`);

  // ── Leads (500) ──
  const leads: any[] = [];
  for (let i = 0; i < TOTAL_LEADS; i++) {
    const firstName = pick(FIRST_NAMES); const lastName = pick(LAST_NAMES);
    const l = await prisma.lead.create({
      data: {
        tenantId, projectId: pick(projects).id, firstName, lastName, phone: randomPhone(),
        email: i % 3 === 0 ? randomEmail(firstName) : null, city: pick(CITIES), source: pick(SOURCES),
        status: pick(LEAD_STATUSES) as any, leadScore: randInt(20, 100), assignedTo: pick(users).id,
      },
    });
    leads.push(l);
  }
  console.log(`✅ Leads: ${leads.length}`);

  // ── Contacts (120) ──
  const contacts: any[] = [];
  for (let i = 0; i < TOTAL_CONTACTS; i++) {
    const c = await prisma.contact.create({
      data: {
        tenantId, name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, phone: randomPhone(),
        email: i % 4 === 0 ? randomEmail(`${pick(FIRST_NAMES)}`) : null,
        preferredContactTime: pick(["صباحًا", "مساءً", "أي وقت"]),
        budgetRange: pick(["500,000 - 1,000,000", "1M - 3M", "3M - 5M", "أكثر من 5M"]),
        notes: `ملاحظات العميل ${i + 1}: ${pick(["مهتم بمشروع سكني", "يبحث عن استثمار", "يريد فيلا", "مستعجل للشراء", "يحتاج تمويل"])}`,
      },
    });
    contacts.push(c);
  }
  console.log(`✅ Contacts: ${contacts.length}`);

  // ── Opportunities (80) ──
  const opportunities: any[] = [];
  for (let i = 0; i < TOTAL_OPPORTUNITIES; i++) {
    const l = pick(leads);
    const o = await prisma.opportunity.create({
      data: {
        tenantId, leadId: l.id, value: randInt(300000, 5000000),
        probability: randInt(20, 95), closeDate: futureDate(randInt(7, 90)),
        status: pick(["OPEN", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"]),
      },
    });
    opportunities.push(o);
  }
  console.log(`✅ Opportunities: ${opportunities.length}`);

  // ── Offers (60) ──
  const offers: any[] = [];
  for (let i = 0; i < TOTAL_OFFERS; i++) {
    const opp = pick(opportunities);
    const o = await prisma.offer.create({
      data: {
        tenantId, linkedOpportunityId: opp.id,
        price: randInt(opp.value * 0.8, opp.value * 1.2),
        validUntil: futureDate(randInt(3, 30)),
        status: pick(["PENDING", "ACCEPTED", "REJECTED"]),
        documentUrl: i % 5 === 0 ? `https://docs.orca.az-ez.pro/offers/offer_${i}.pdf` : null,
      },
    });
    offers.push(o);
  }
  console.log(`✅ Offers: ${offers.length}`);

  // ── Tasks (80) ──
  const tasks: any[] = [];
  for (let i = 0; i < TOTAL_TASKS; i++) {
    const t = await prisma.task.create({
      data: {
        tenantId, leadId: pick(leads).id, assignedTo: pick(users).id,
        title: pick(TASK_TITLES), description: `وصف المهمة ${i + 1}`,
        dueDate: i < 40 ? pastDate(randInt(1, 30)) : futureDate(randInt(1, 14)),
        priority: pick(["LOW", "MEDIUM", "HIGH"]) as any, status: i < 40 ? "COMPLETED" : "PENDING",
      },
    });
    tasks.push(t);
  }
  console.log(`✅ Tasks: ${tasks.length} (${tasks.filter(t => t.status === "COMPLETED").length} completed, ${tasks.filter(t => t.status === "PENDING").length} pending)`);

  // ── Tours (40) ──
  const tours: any[] = [];
  for (let i = 0; i < TOTAL_TOURS; i++) {
    const startAt = futureDate(randInt(1, 14));
    const t = await prisma.tour.create({
      data: {
        tenantId, leadId: pick(leads).id, assignedTo: pick(users).id,
        startAt, endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
        location: pick(["موقع المشروع", "مكتب المبيعات", "معرض العقار"]), status: pick(["SCHEDULED", "COMPLETED", "CANCELLED"]),
        attendees: randInt(1, 5), notes: `جولة ${i + 1} - ${pick(["تمت", "معلقة", "ملغاة"])}`,
      },
    });
    tours.push(t);
  }
  console.log(`✅ Tours: ${tours.length}`);

  // ── Contracts (50) — on sold units ──
  const soldUnits = units.filter(u => u.status === "Sold").slice(0, TOTAL_CONTRACTS);
  const contracts: any[] = [];
  for (const unit of soldUnits) {
    const priceVal = typeof unit.priceSar === 'object' ? Number(unit.priceSar) : unit.priceSar;
    const c = await prisma.contract.create({
      data: {
        tenantId, unitId: unit.id,
        buyerName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, buyerPhone: randomPhone(),
        totalVolumeSar: priceVal, signedAt: pastDate(randInt(1, 180)),
        status: "Active", vatType: "STANDARD", vatRate: 15.00,
      },
    });
    contracts.push(c);
  }
  // If not enough sold units, create contracts on any units
  while (contracts.length < TOTAL_CONTRACTS) {
    const unit = pick(units);
    const priceVal = typeof unit.priceSar === 'object' ? Number(unit.priceSar) : unit.priceSar;
    const c = await prisma.contract.create({
      data: {
        tenantId, unitId: unit.id,
        buyerName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, buyerPhone: randomPhone(),
        totalVolumeSar: priceVal, signedAt: pastDate(randInt(1, 180)),
        status: "Active", vatType: "STANDARD", vatRate: 15.00,
      },
    });
    contracts.push(c);
  }
  console.log(`✅ Contracts: ${contracts.length}`);

  // ── Installments (120) ──
  const installments: any[] = [];
  let instNum = 0;
  for (let i = 0; i < TOTAL_INSTALLMENTS; i++) {
    const c = pick(contracts);
    instNum++;
    const dueDate = pastDate(randInt(0, 30));
    const isPaid = Math.random() > 0.35;
    const amt = Math.floor(c.totalVolumeSar / 12);
    const inst = await prisma.installment.create({
      data: {
        tenantId, contractId: c.id, installmentNumber: instNum,
        amountSar: amt, vatAmount: Math.round(amt * 0.15),
        dueDate, paymentStatus: isPaid ? "Paid" : "Pending",
      },
    });
    installments.push(inst);
  }
  console.log(`✅ Installments: ${installments.length}`);

  // ── Rental Leases (for invoices) ──
  const leases: any[] = [];
  for (let i = 0; i < 20; i++) {
    const unit = pick(units);
    const l = await prisma.rentalLease.create({
      data: {
        tenantId, unitId: unit.id, unitName: unit.unitNumber, tenantName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        startDate: pastDate(randInt(30, 365)), endDate: futureDate(randInt(30, 365)),
        rentAmount: randInt(20000, 80000), deposit: randInt(20000, 80000),
        status: pick(["active", "expired"]),
      },
    });
    leases.push(l);
  }

  // ── Invoices (100) ──
  const invoices: any[] = [];
  for (let i = 0; i < TOTAL_INVOICES; i++) {
    const lease = pick(leases);
    const subtotal = Number(lease.rentAmount);
    const vatRate = 15;
    const vatAmount = Math.round(subtotal * vatRate / 100);
    const iv = await prisma.rentalInvoice.create({
      data: {
        tenantId, leaseId: lease.id, invoiceNumber: 1000 + i, invoicePrefix: "INV",
        issueDate: pastDate(randInt(1, 60)), dueDate: futureDate(randInt(1, 30)),
        subtotal, vatRate, vatAmount, totalAmount: subtotal + vatAmount,
        status: Math.random() > 0.4 ? "paid" : "unpaid",
      },
    });
    invoices.push(iv);
  }
  console.log(`✅ Invoices: ${invoices.length}`);

  // ── Payments (100) ──
  const payments: any[] = [];
  for (let i = 0; i < TOTAL_PAYMENTS; i++) {
    const inv = pick(invoices);
    const amount = Number(inv.totalAmount);
    const pmt = await prisma.paymentTransaction.create({
      data: {
        tenantId, invoiceId: inv.id, amount, fee: 0, netAmount: amount, currency: "SAR",
        method: "MOCK", status: "COMPLETED", provider: "manual", paidAt: pastDate(randInt(1, 60)),
        gatewayStatus: "mock",
      },
    });
    payments.push(pmt);
  }
  console.log(`✅ Payments: ${payments.length}`);

  // ── Agent Slots (5) ──
  const agentTypes = ["SAHER", "SANAD", "BASEER", "KHABEER", "MANSOUR"];
  const slots: any[] = [];
  for (let i = 0; i < agentTypes.length; i++) {
    const s = await prisma.agentSlot.create({
      data: { tenantId, slotNumber: i + 1, agentType: agentTypes[i], isActive: true },
    });
    slots.push(s);
    await prisma.usageMeter.create({
      data: { tenantId, agentSlotId: s.id, metricType: "MESSAGES", limitValue: 99999, usageValue: randInt(100, 5000), resetAt: futureDate(30) },
    });
  }
  console.log(`✅ Agent Slots: ${slots.length}`);

  // ── Agent Telemetry (40) ──
  for (let i = 0; i < TOTAL_TELEMETRY; i++) {
    await prisma.agentTelemetryLog.create({
      data: {
        tenantId, agentId: pick(agentTypes), actionType: pick(["Lead_Screening", "Link_Dispatched", "Payment_Confirmed", "Security_Lock"]),
        logMessageAr: `«سجل الوكيل ${pick(agentTypes)} — حدث ${i + 1}»`, severity: pick(["Info", "Warning", "Critical"]),
      },
    });
  }
  console.log(`✅ Agent Telemetry: ${TOTAL_TELEMETRY}`);

  // ── WhatsApp Messages (30 mock) ──
  const waPhones: string[] = [];
  for (let i = 0; i < 15; i++) waPhones.push(randomPhone());
  for (let i = 0; i < TOTAL_WHATSAPP_MSGS; i++) {
    const phone = pick(waPhones);
    await prisma.whatsAppContact.create({
      data: { tenantId, phone, name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, provider: "meta" },
    }).catch(() => {});
    await prisma.whatsAppMessage.create({
      data: {
        tenantId, phone, direction: i % 2 === 0 ? "inbound" : "outbound", provider: "meta",
        messageText: i % 2 === 0 ? `مرحباً، أرغب في الاستفسار عن مشروع ${pick(PROJECT_NAMES)}` : `أهلاً بك، شكراً لتواصلك. سأرسل لك التفاصيل قريباً.`,
        messageType: "text", status: "received",
      },
    });
  }
  console.log(`✅ WhatsApp Messages: ${TOTAL_WHATSAPP_MSGS}`);

  // ── Email Messages (20 mock) ──
  for (let i = 0; i < TOTAL_EMAIL_MSGS; i++) {
    try {
      await prisma.emailMessage.create({
        data: {
          tenantId, direction: i % 2 === 0 ? "inbound" : "outbound", provider: "mock",
          from: `sender${i}@stress.test`, to: `recipient${i}@stress.test`,
          subject: pick(["استفسار عن مشروع", "تأكيد حجز وحدة", "طلب عرض سعر", "تحديث العقد", "إشعار دفعة"]),
          htmlBody: `<p>محتوى تجريبي للبريد ${i + 1}</p>`, textBody: `محتوى تجريبي للبريد ${i + 1}`,
          status: i % 3 === 0 ? "DRAFT" : "SENT",
        },
      });
    } catch (e) {
      // Skip if EmailMessage model doesn't exist
    }
  }
  console.log(`✅ Email Messages: ${TOTAL_EMAIL_MSGS}`);

  // ═══════════════════════════════════════════════════════════
  // Post-Seed Verification — fail fast on incomplete data
  // ═══════════════════════════════════════════════════════════
  console.log("");
  console.log("🔍 Verifying seed data...");
  console.log("");

  const expected: { model: string; count: number; actual?: number }[] = [
    { model: "User", count: 10 },
    { model: "Project", count: 20 },
    { model: "Unit", count: 200 },
    { model: "Lead", count: 500 },
    { model: "Contact", count: 120 },
    { model: "Opportunity", count: 80 },
    { model: "Offer", count: 60 },
    { model: "Task", count: 80 },
    { model: "Tour", count: 40 },
    { model: "Contract", count: 50 },
    { model: "RentalLease", count: 20 },
    { model: "RentalInvoice", count: 100 },
    { model: "PaymentTransaction", count: 100 },
    { model: "Installment", count: 120 },
    { model: "AgentSlot", count: 5 },
    { model: "AgentTelemetryLog", count: 40 },
    { model: "WhatsAppMessage", count: 30 },
    { model: "EmailMessage", count: 20 },
  ];

  const modelToPrismaFn: Record<string, () => Promise<number>> = {
    User: () => prisma.user.count({ where: { tenantId } }),
    Project: () => prisma.project.count({ where: { tenantId } }),
    Unit: () => prisma.unit.count({ where: { tenantId } }),
    Lead: () => prisma.lead.count({ where: { tenantId } }),
    Contact: () => prisma.contact.count({ where: { tenantId } }),
    Opportunity: () => prisma.opportunity.count({ where: { tenantId } }),
    Offer: () => prisma.offer.count({ where: { tenantId } }),
    Task: () => prisma.task.count({ where: { tenantId } }),
    Tour: () => prisma.tour.count({ where: { tenantId } }),
    Contract: () => prisma.contract.count({ where: { tenantId } }),
    RentalLease: () => prisma.rentalLease.count({ where: { tenantId } }),
    RentalInvoice: () => prisma.rentalInvoice.count({ where: { tenantId } }),
    PaymentTransaction: () => prisma.paymentTransaction.count({ where: { tenantId } }),
    Installment: () => prisma.installment.count({ where: { tenantId } }),
    AgentSlot: () => prisma.agentSlot.count({ where: { tenantId } }),
    AgentTelemetryLog: () => prisma.agentTelemetryLog.count({ where: { tenantId } }),
    WhatsAppMessage: () => prisma.whatsAppMessage.count({ where: { tenantId } }),
    EmailMessage: () => prisma.emailMessage.count({ where: { tenantId } }),
  };

  const failed: string[] = [];

  for (const e of expected) {
    try {
      e.actual = await modelToPrismaFn[e.model]();
    } catch {
      e.actual = -1;
    }
    const status = e.actual >= e.count ? "✅" : "❌";
    console.log(`  ${status} ${e.model.padEnd(22)} expected ≥ ${String(e.count).padStart(3)}  actual = ${String(e.actual).padStart(3)}`);
    if (e.actual < e.count) failed.push(e.model);
  }

  console.log("");

  if (failed.length > 0) {
    console.error(`❌ VERIFICATION FAILED — ${failed.length} model(s) below threshold:`);
    for (const m of failed) {
      const e = expected.find(x => x.model === m)!;
      console.error(`   ${m}: expected ≥ ${e.count}, got ${e.actual}`);
    }
    console.error("");
    console.error("❌ Seed incomplete. Data was not committed or was deleted mid-run.");
    console.error("   Check for timeout, DB errors, or partial Prisma writes.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("═══════════════════════════════════════");
  console.log("✅ Stress seed completed and verified successfully");
  console.log(`   Tenant: ORCA Stress Demo Real Estate (subdomain: stress)`);
  console.log("═══════════════════════════════════════");

  await prisma.$disconnect();
}

main().catch((e) => { console.error("❌ Seed failed:", e); prisma.$disconnect(); process.exit(1); });
