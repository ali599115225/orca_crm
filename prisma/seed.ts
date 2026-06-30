import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { assertSeedExecutionAllowed } from './seed-guard';

// Production safety guard: must run before DB client initialization.
assertSeedExecutionAllowed();

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';
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
  console.log("🧹 جاري التنظيف الشامل...");

  await prisma.generalLedger.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.invoice.deleteMany({});
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
  await prisma.rentalLease.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.opportunity.deleteMany({});
  await prisma.tour.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.automationWorkflow.deleteMany({});
  await prisma.telemetryEvent.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log("🔑 جاري إنشاء البيانات التجريبية...");

  const securePassword = await bcrypt.hash("Orca@Secure2026!", 10);

  // ═══════════════════════════════════════════════════════════════
  // TENANT + USERS
  // ═══════════════════════════════════════════════════════════════
  const tenant = await prisma.tenant.create({
    data: {
      companyName: "شركة دار الأعمار العقارية",
      subdomain: "dar-al-amar",
      subscriptionPlan: "professional",
      isActive: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "علي المدير",
      email: "admin@dar-al-amar.com",
      passwordHash: securePassword,
      role: "ADMIN",
    },
  });

  const salesManager = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "محمد الغامدي",
      email: "manager@dar-al-amar.com",
      passwordHash: securePassword,
      role: "SALES_MANAGER",
    },
  });

  const salesEmployee = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "فهد الشهري",
      email: "sales@dar-al-amar.com",
      passwordHash: securePassword,
      role: "SALES_EMPLOYEE",
    },
  });

  console.log("✅ تم إنشاء المستخدمين");

  // ═══════════════════════════════════════════════════════════════
  // 10 مشاريع عقارية متنوعة
  // ═══════════════════════════════════════════════════════════════
  const projectsData = [
    { name: "نرجس ريزيدنس 101", city: "الرياض", status: "UNDER_CONSTRUCTION" as const, unitsTotal: 45, minPrice: 850000, maxPrice: 1800000 },
    { name: "برج الياسمين الفاخر", city: "الرياض", status: "COMPLETED" as const, unitsTotal: 120, minPrice: 1200000, maxPrice: 3500000 },
    { name: "فلل قرطبة السكنية", city: "الرياض", status: "UNDER_CONSTRUCTION" as const, unitsTotal: 25, minPrice: 2500000, maxPrice: 5500000 },
    { name: "مجمع النخيل التجاري", city: "جدة", status: "PLANNING" as const, unitsTotal: 80, minPrice: 500000, maxPrice: 2000000 },
    { name: "شقق الملقا الذكية", city: "الرياض", status: "UNDER_CONSTRUCTION" as const, unitsTotal: 60, minPrice: 950000, maxPrice: 2200000 },
    { name: "واحة الغدير", city: "الرياض", status: "COMPLETED" as const, unitsTotal: 35, minPrice: 1800000, maxPrice: 4200000 },
    { name: "برج حطين السكني", city: "الرياض", status: "UNDER_CONSTRUCTION" as const, unitsTotal: 90, minPrice: 1500000, maxPrice: 4800000 },
    { name: "فلل النرجس الشمالية", city: "الرياض", status: "PLANNING" as const, unitsTotal: 18, minPrice: 3200000, maxPrice: 6500000 },
    { name: "مجمع التعاون السكني", city: "الرياض", status: "COMPLETED" as const, unitsTotal: 55, minPrice: 750000, maxPrice: 1600000 },
    { name: "شواطئ جدة السكنية", city: "جدة", status: "UNDER_CONSTRUCTION" as const, unitsTotal: 100, minPrice: 1100000, maxPrice: 3800000 },
  ];

  const projects = [];
  for (const pData of projectsData) {
    const project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: pData.name,
        city: pData.city,
        status: pData.status,
        unitsTotal: pData.unitsTotal,
        minPrice: pData.minPrice,
        maxPrice: pData.maxPrice,
      },
    });
    projects.push({ ...project, ...pData });
  }

  console.log("✅ تم إنشاء 10 مشاريع عقارية");

  // ═══════════════════════════════════════════════════════════════
  // وحدات لكل مشروع (5-8 وحدات لكل مشروع = ~60 وحدة)
  // ═══════════════════════════════════════════════════════════════
  const units: any[] = [];
  const unitStatuses = ["Available", "Available", "Available", "Reserved", "Sold", "Hold"];
  const districts = ["الياسمين", "النرجس", "قرطبة", "الملقا", "الغدير", "حطين", "التعاون", "الزهراء", "الروضة", "السلامة"];
  const types = ["شقة سكنية", "فيلا", "شقة فاخرة", "دوبلكس", "بنتهاوس"];

  for (let pIdx = 0; pIdx < projects.length; pIdx++) {
    const project = projects[pIdx];
    const unitCount = 5 + Math.floor(Math.random() * 4);

    for (let u = 0; u < unitCount; u++) {
      const floor = Math.floor(u / 4) + 1;
      const unitNum = `${String.fromCharCode(65 + pIdx)}${floor}${(u % 4) + 1}`;
      const price = project.minPrice + Math.floor(Math.random() * (project.maxPrice - project.minPrice));
      const status = unitStatuses[Math.floor(Math.random() * unitStatuses.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const district = districts[Math.floor(Math.random() * districts.length)];
      const beds = type === "فيلا" ? 5 + Math.floor(Math.random() * 3) : type === "بنتهاوس" ? 4 : 2 + Math.floor(Math.random() * 3);
      const area = type === "فيلا" ? 350 + Math.floor(Math.random() * 300) : 80 + Math.floor(Math.random() * 200);

      const unit = await prisma.unit.create({
        data: {
          tenantId: tenant.id,
          projectId: project.id,
          unitNumber: unitNum,
          floorPosition: floor,
          priceSar: price,
          type: type,
          area: `${area} م²`,
          beds: beds,
          city: project.city,
          district: district,
          status: status,
          description: `${type} فاخرة في ${project.name} - حي ${district}`,
          lat: 24.7 + Math.random() * 0.2,
          lng: 46.6 + Math.random() * 0.2,
          agentName: ["المستشار رائد الغامدي", "المستشار فواز الشهري", "المستشار عبدالرحمن العتيبي"][Math.floor(Math.random() * 3)],
          tourType: Math.random() > 0.5 ? "360" : "video",
          tourUrl: "https://vinc360.com/sample",
          media: [`https://picsum.photos/seed/${unitNum}/400/300`],
        },
      });
      units.push(unit);
    }
  }

  console.log(`✅ تم إنشاء ${units.length} وحدة عقارية`);

  // ═══════════════════════════════════════════════════════════════
  // عقود لوحدات Sold/Reserved
  // ═══════════════════════════════════════════════════════════════
  const soldUnits = units.filter(u => u.status === "Sold" || u.status === "Reserved");
  const buyerNames = ["سليمان الراشد", "عبدالملك الحربي", "ناصر العتيبي", "خالد الدوسري", "بدر السديري", "تركي الشمري", "ماجد القحطاني", "عمر الزهراني"];
  let contractsCount = 0;

  for (const unit of soldUnits.slice(0, 8)) {
    const buyer = buyerNames[Math.floor(Math.random() * buyerNames.length)];
    const contract = await prisma.contract.create({
      data: {
        tenantId: tenant.id,
        unitId: unit.id,
        buyerName: buyer,
        buyerPhone: `05${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        totalVolumeSar: Number(unit.priceSar),
        signedAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 86400000),
        status: unit.status === "Sold" ? "Active" : "Pending",
      },
    });

    // أقساط لكل عقد
    const installmentCount = 2 + Math.floor(Math.random() * 4);
    const installmentAmount = Number(unit.priceSar) / installmentCount;
    for (let i = 0; i < installmentCount; i++) {
      await prisma.installment.create({
        data: {
          tenantId: tenant.id,
          contractId: contract.id,
          installmentNumber: i + 1,
          amountSar: installmentAmount,
          dueDate: new Date(Date.now() + (i + 1) * 90 * 86400000),
          paymentStatus: i === 0 ? "Paid" : Math.random() > 0.5 ? "Pending" : "Paid",
        },
      });
    }
    contractsCount++;
  }

  console.log(`✅ تم إنشاء ${contractsCount} عقد مع أقساط`);

  // ═══════════════════════════════════════════════════════════════
  // عقود إيجار
  // ═══════════════════════════════════════════════════════════════
  const rentalNames = ["أحمد السالم", "يوسف المطيري", "سلطان العنزي", "منصور الحارثي", "راشد البقمي"];
  for (let i = 0; i < 5; i++) {
    const lease = await prisma.rentalLease.create({
      data: {
        tenantId: tenant.id,
        unitName: `شقة ${String.fromCharCode(65 + i)}-${101 + i}`,
        tenantName: rentalNames[i],
        startDate: new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000),
        endDate: new Date(Date.now() + 365 * 86400000),
        rentAmount: 30000 + Math.floor(Math.random() * 70000),
        deposit: 10000 + Math.floor(Math.random() * 20000),
        status: Math.random() > 0.3 ? "active" : "expired",
      },
    });

    // فواتير إيجار
    const quarterlySubtotal = new Prisma.Decimal(Number(lease.rentAmount) / 4);
    const vatRate = new Prisma.Decimal(15.00);
    const vatAmount = quarterlySubtotal.mul(vatRate).div(100);
    const totalAmount = quarterlySubtotal.add(vatAmount);
    for (let j = 0; j < 3; j++) {
      await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          leaseId: lease.id,
          invoiceNumber: j + 1,
          dueDate: new Date(Date.now() + (j + 1) * 90 * 86400000),
          subtotal: quarterlySubtotal,
          vatRate: vatRate,
          vatAmount: vatAmount,
          totalAmount: totalAmount,
          status: j === 0 ? "paid" : "unpaid",
        },
      });
    }
  }

  console.log("✅ تم إنشاء 5 عقود إيجار مع فواتير");

  // ═══════════════════════════════════════════════════════════════
  // عملاء محتملين (Leads) - 20 عميل
  // ═══════════════════════════════════════════════════════════════
  const leadsData = [
    { firstName: "عبدالرحمن", lastName: "المالكي", phone: "0501234567", city: "الرياض", source: "إعلانات سناب شات", status: "NEW" as const, score: 75 },
    { firstName: "سلطان", lastName: "العتيبي", phone: "0552345678", city: "جدة", source: "حملة ميتا", status: "CONTACTED" as const, score: 82 },
    { firstName: "فهد", lastName: "الدوسري", phone: "0543456789", city: "الرياض", source: "زيارة مباشرة", status: "VISIT_SCHEDULED" as const, score: 90 },
    { firstName: "تركي", lastName: "الشمراني", phone: "0564567890", city: "الدمام", source: "إحالة عميل", status: "VISITED" as const, score: 85 },
    { firstName: "بدر", lastName: "القحطاني", phone: "0575678901", city: "الرياض", source: "موقع إلكتروني", status: "OFFER_MADE" as const, score: 92 },
    { firstName: "ماجد", lastName: "الزهراني", phone: "0586789012", city: "الرياض", source: "واتساب", status: "RESERVED" as const, score: 95 },
    { firstName: "خالد", lastName: "الحربي", phone: "0597890123", city: "مكة", source: "إعلانات جوجل", status: "NEW" as const, score: 60 },
    { firstName: "ناصر", lastName: "الغامدي", phone: "0508901234", city: "الرياض", source: "معرض عقاري", status: "CONTACTED" as const, score: 78 },
    { firstName: "سعود", lastName: "السديري", phone: "0519012345", city: "الرياض", source: "إعلانات سناب شات", status: "WON" as const, score: 98 },
    { firstName: "عمر", lastName: "الشمري", phone: "0520123456", city: "تبوك", source: "حملة ميتا", status: "LOST" as const, score: 45 },
    { firstName: "يوسف", lastName: "المطيري", phone: "0531234567", city: "الرياض", source: "إحالة عميل", status: "NEW" as const, score: 70 },
    { firstName: "راشد", lastName: "البقمي", phone: "0542345678", city: "جدة", source: "موقع إلكتروني", status: "CONTACTED" as const, score: 65 },
    { firstName: "حمد", lastName: "البلوي", phone: "0553456789", city: "الرياض", source: "زيارة مباشرة", status: "VISIT_SCHEDULED" as const, score: 88 },
    { firstName: "مشعل", lastName: "العتيبي", phone: "0564567891", city: "الرياض", source: "واتساب", status: "NEW" as const, score: 72 },
    { firstName: "وليد", lastName: "الأحمدي", phone: "0575678902", city: "الدمام", source: "إعلانات جوجل", status: "CONTACTED" as const, score: 68 },
    { firstName: "عبدالعزيز", lastName: "الفهيد", phone: "0586789013", city: "الرياض", source: "معرض عقاري", status: "VISITED" as const, score: 80 },
    { firstName: "صالح", lastName: "الراجحي", phone: "0597890124", city: "الرياض", source: "إعلانات سناب شات", status: "OFFER_MADE" as const, score: 93 },
    { firstName: "محمد", lastName: "العمري", phone: "0508901235", city: "أبها", source: "حملة ميتا", status: "NEW" as const, score: 55 },
    { firstName: "أحمد", lastName: "السبيعي", phone: "0519012346", city: "الرياض", source: "إحالة عميل", status: "WON" as const, score: 97 },
    { firstName: "إبراهيم", lastName: "الموسى", phone: "0520123457", city: "الرياض", source: "موقع إلكتروني", status: "CONTACTED" as const, score: 73 },
  ];

  const leads = [];
  for (const lData of leadsData) {
    const lead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        projectId: projects[Math.floor(Math.random() * projects.length)].id,
        assignedTo: [admin.id, salesManager.id, salesEmployee.id][Math.floor(Math.random() * 3)],
        firstName: lData.firstName,
        lastName: lData.lastName,
        phone: lData.phone,
        email: `${lData.firstName.toLowerCase()}.${lData.lastName.toLowerCase()}@email.com`,
        city: lData.city,
        source: lData.source,
        status: lData.status,
        leadScore: lData.score,
        score: lData.score,
      },
    });
    leads.push(lead);
  }

  console.log("✅ تم إنشاء 20 عميل محتمل");

  // ═══════════════════════════════════════════════════════════════
  // مهام (Tasks) - 15 مهمة
  // ═══════════════════════════════════════════════════════════════
  const taskTitles = [
    "الاتصال بالعميل لتنسيق موعد معاينة",
    "إرسال عرض سعر مفصل",
    "متابعة طلب التمويل البنكي",
    "ترتيب زيارة ميدانية للمشروع",
    "إعداد عقد مبدئي للمراجعة",
    "متابعة مستندات العميل",
    "تقديم عرض تمويل مخصص",
    "إرسال كتيب المشروع التعريفي",
    "ترتيب اجتماع مع المدير المالي",
    "متابعة دفعة الحجز",
    "تنسيق جولة افتراضية 360",
    "إعداد تقرير مقارنة أسعار",
    "متابعة حالة العرض المقدم",
    "ترتيب توقيع العقد النهائي",
    "إرسال تذكير بموعد السداد",
  ];

  for (let i = 0; i < 15; i++) {
    const lead = leads[Math.floor(Math.random() * leads.length)];
    await prisma.task.create({
      data: {
        tenantId: tenant.id,
        leadId: lead.id,
        assignedTo: [admin.id, salesManager.id, salesEmployee.id][Math.floor(Math.random() * 3)],
        title: taskTitles[i],
        description: "مهمة متابعة تتطلب اهتمام فوري من فريق المبيعات",
        dueDate: new Date(Date.now() + Math.floor(Math.random() * 14) * 86400000),
        priority: (["LOW", "MEDIUM", "HIGH"] as const)[Math.floor(Math.random() * 3)],
        status: (["PENDING", "PENDING", "COMPLETED"] as const)[Math.floor(Math.random() * 3)],
      },
    });
  }

  console.log("✅ تم إنشاء 15 مهمة");

  // ═══════════════════════════════════════════════════════════════
  // جهات اتصال (Contacts) - 10
  // ═══════════════════════════════════════════════════════════════
  for (let i = 0; i < 10; i++) {
    const lead = leads[i];
    await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        leadId: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        phone: lead.phone,
        email: lead.email,
        preferredContactTime: ["صباحاً", "ظهراً", "مساءً"][Math.floor(Math.random() * 3)],
        budgetRange: ["500K-1M", "1M-2M", "2M-5M"][Math.floor(Math.random() * 3)],
        notes: "عميل مهتم بالاستثمار العقاري في منطقة الرياض",
      },
    });
  }

  console.log("✅ تم إنشاء 10 جهات اتصال");

  // ═══════════════════════════════════════════════════════════════
  // فرص (Opportunities) - 8
  // ═══════════════════════════════════════════════════════════════
  for (let i = 0; i < 8; i++) {
    const lead = leads[i];
    await prisma.opportunity.create({
      data: {
        tenantId: tenant.id,
        leadId: lead.id,
        value: 800000 + Math.floor(Math.random() * 4000000),
        probability: 30 + Math.floor(Math.random() * 60),
        closeDate: new Date(Date.now() + Math.floor(Math.random() * 60) * 86400000),
        status: ["OPEN", "QUALIFIED", "PROPOSAL", "NEGOTIATION"][Math.floor(Math.random() * 4)],
      },
    });
  }

  console.log("✅ تم إنشاء 8 فرص بيعية");

  // ═══════════════════════════════════════════════════════════════
  // جولات (Tours) - 6
  // ═══════════════════════════════════════════════════════════════
  for (let i = 0; i < 6; i++) {
    const lead = leads[Math.floor(Math.random() * leads.length)];
    await prisma.tour.create({
      data: {
        tenantId: tenant.id,
        leadId: lead.id,
        assignedTo: salesEmployee.id,
        startAt: new Date(Date.now() + Math.floor(Math.random() * 7) * 86400000),
        endAt: new Date(Date.now() + (Math.floor(Math.random() * 7) + 1) * 86400000),
        location: `${projects[Math.floor(Math.random() * projects.length)].name} - الرياض`,
        status: (["SCHEDULED", "COMPLETED", "CANCELLED"] as const)[Math.floor(Math.random() * 3)],
        attendees: 1 + Math.floor(Math.random() * 3),
        notes: "جولة معاينة ميدانية للعميل",
      },
    });
  }

  console.log("✅ تم إنشاء 6 جولات عقارية");

  // ═══════════════════════════════════════════════════════════════
  // عروض (Offers) - 6
  // ═══════════════════════════════════════════════════════════════
  for (let i = 0; i < 6; i++) {
    const lead = leads[Math.floor(Math.random() * leads.length)];
    await prisma.offer.create({
      data: {
        tenantId: tenant.id,
        linkedOpportunityId: (await prisma.opportunity.findFirst({ where: { leadId: lead.id, tenantId: tenant.id } }))?.id || (await prisma.opportunity.findFirst({ where: { tenantId: tenant.id } }))!.id,
        price: 900000 + Math.floor(Math.random() * 3000000),
        validUntil: new Date(Date.now() + 30 * 86400000),
        status: ["PENDING", "ACCEPTED", "REJECTED"][Math.floor(Math.random() * 3)],
      },
    });
  }

  console.log("✅ تم إنشاء 6 عروض عقارية");

  // ═══════════════════════════════════════════════════════════════
  // تذاكر دعم (Tickets) - 5
  // ═══════════════════════════════════════════════════════════════
  const ticketSubjects = [
    "مشكلة في تسجيل الدخول",
    "طلب تحديث بيانات المشروع",
    "استفسار عن نظام الفوترة",
    "طلب إضافة مستخدم جديد",
    "مشكلة في عرض التقارير",
  ];

  for (let i = 0; i < 5; i++) {
    await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        title: ticketSubjects[i],
        description: "تذكرة دعم فني تحتاج إلى مراجعة من فريق الدعم",
        status: ["OPEN", "IN_PROGRESS", "RESOLVED"][Math.floor(Math.random() * 3)],
      },
    });
  }

  console.log("✅ تم إنشاء 5 تذاكر دعم");

  // ═══════════════════════════════════════════════════════════════
  // محادثات منصور (MansourChat) - 4
  // ═══════════════════════════════════════════════════════════════
  for (let i = 0; i < 4; i++) {
    const lead = leads[Math.floor(Math.random() * leads.length)];
    await prisma.mansourChat.create({
      data: {
        tenantId: tenant.id,
        leadId: lead.id,
        contactName: `${lead.firstName} ${lead.lastName}`,
        contactPhone: lead.phone,
        lastMessage: "شكراً لتواصلكم، سيتم الرد عليكم قريباً",
        status: ["INTERESTED", "QUALIFIED", "NEGOTIATING"][Math.floor(Math.random() * 3)],
        messagesJson: JSON.stringify([
          { from: "client", text: "مرحباً، أبحث عن فيلا في الرياض", time: new Date(Date.now() - 3600000).toISOString() },
          { from: "mansour", text: "أهلاً وسهلاً! لدينا خيارات ممتازة في حي النرجس وقرطبة", time: new Date(Date.now() - 3000000).toISOString() },
          { from: "client", text: "ما هي الأسعار المتاحة؟", time: new Date(Date.now() - 2400000).toISOString() },
        ]),
      },
    });
  }

  console.log("✅ تم إنشاء 4 محادثات منصور");

  // ═══════════════════════════════════════════════════════════════
  // ملخص نهائي
  // ═══════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════");
  console.log("🎉 تمت التغذية بنجاح كامل!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`📊 ملخص البيانات:`);
  console.log(`   • مستأجر: 1`);
  console.log(`   • مستخدمين: 3 (مدير + مدير مبيعات + موظف مبيعات)`);
  console.log(`   • مشاريع: 10`);
  console.log(`   • وحدات: ${units.length}`);
  console.log(`   • عقود بيع: ${contractsCount}`);
  console.log(`   • عقود إيجار: 5`);
  console.log(`   • عملاء محتملين: 20`);
  console.log(`   • مهام: 15`);
  console.log(`   • جهات اتصال: 10`);
  console.log(`   • فرص بيعية: 8`);
  console.log(`   • جولات: 6`);
  console.log(`   • عروض: 6`);
  console.log(`   • تذاكر دعم: 5`);
  console.log(`   • محادثات منصور: 4`);
  console.log("═══════════════════════════════════════════════════");
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
