// scratch/seed_mock_data.ts
import dotenv from "dotenv";
dotenv.config({ path: "c:/Users/ali59/Desktop/REDC/.env" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

// إنشاء اتصال مخصص مع Neon PostgreSQL باستخدام adapter-pg لتجنب أي تعليق
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 15000,
  max: 1,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CITIES = ["الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة", "الخبر"];
const LEAD_SOURCES = ["إعلانات سناب شات", "حملة جوجل Search", "حملة ميتا إعلانية", "تيك توك", "موقع الشركة العقاري", "اتصال مباشر"];
const LEAD_STATUSES = ["NEW", "CONTACTED", "VISIT_SCHEDULED", "VISITED", "OFFER_MADE", "RESERVED", "CONTRACT_SIGNED", "WON", "LOST"];

async function main() {
  console.log("🚀 جاري بدء عملية التغذية بالبيانات الوهمية الشاملة...");

  // تشفير كلمة مرور موحدة '123456' لتسريع العملية
  console.log("🔑 جاري تشفير كلمة المرور الافتراضية...");
  const securePassword = await bcrypt.hash("123456", 10);

  // 1. تحديث باقة المطور العقاري الخاصة بالمستخدم (شركة العلي العقارية) لتفعيل الوكلاء
  console.log("🏢 جاري تهيئة حساب شركة العلي العقارية (النظام الخاص بك)...");
  const myTenant = await prisma.tenant.findUnique({
    where: { subdomain: "orca-crm-one" }
  });

  if (myTenant) {
    await prisma.tenant.update({
      where: { id: myTenant.id },
      data: {
        subscriptionPlan: "gold",
        whatsappConnected: true,
        extraAgents: 10,
        isActive: true,
      }
    });

    // حذف البيانات القديمة لشركة العلي لإعادة تغذيتها بشكل فخم ومقنع
    await prisma.task.deleteMany({ where: { tenantId: myTenant.id } });
    await prisma.leadActivity.deleteMany({ where: { tenantId: myTenant.id } });
    await prisma.lead.deleteMany({ where: { tenantId: myTenant.id } });
    await prisma.project.deleteMany({ where: { tenantId: myTenant.id } });
    await prisma.ticket.deleteMany({ where: { tenantId: myTenant.id } });

    // إضافة 15 مشروع لشركة العلي
    const myProjectsData = Array.from({ length: 15 }).map((_, i) => ({
      tenantId: myTenant.id,
      name: `مجمع النخبة السكني ${100 + i + 1}`,
      city: i % 3 === 0 ? "الرياض" : i % 3 === 1 ? "جدة" : "الدمام",
      status: i % 4 === 0 ? "PLANNING" : i % 4 === 1 ? "UNDER_CONSTRUCTION" : i % 4 === 2 ? "COMPLETED" : "SOLD_OUT",
      unitsTotal: 80 + i * 10,
      unitsSold: 40 + i * 5,
      unitsBooked: 10 + i,
      minPrice: 1100000 + i * 100000,
      maxPrice: 2200000 + i * 150000,
    }));
    await prisma.project.createMany({ data: myProjectsData });
    const myProjects = await prisma.project.findMany({ where: { tenantId: myTenant.id } });

    // جلب مستخدمين مبيعات شركة العلي لربط الليدات بهم
    const myUsers = await prisma.user.findMany({ where: { tenantId: myTenant.id } });
    
    // في حال عدم وجود موظفي مبيعات، نقوم بإنشائهم
    let salesUser = myUsers.find(u => u.role === "SALES_EMPLOYEE" || u.role === "ADMIN");
    if (!salesUser) {
      salesUser = await prisma.user.create({
        data: {
          tenantId: myTenant.id,
          name: "عبد الله المالكي",
          email: "sales.ali@outlook.sa",
          passwordHash: securePassword,
          role: "SALES_EMPLOYEE",
        }
      });
    }

    // إضافة 35 عميل مهتم لشركة العلي
    const myLeadsData = Array.from({ length: 35 }).map((_, i) => {
      const proj = myProjects[i % myProjects.length];
      const randomDays = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - randomDays);

      return {
        tenantId: myTenant.id,
        projectId: proj.id,
        assignedTo: salesUser?.id,
        firstName: `عميل تجريبي ${i + 1}`,
        lastName: `العلي`,
        phone: `0555555${i.toString().padStart(3, "0")}`,
        email: `client${i}@example.com`,
        city: proj.city,
        source: LEAD_SOURCES[i % LEAD_SOURCES.length],
        status: LEAD_STATUSES[i % LEAD_STATUSES.length] as any,
        leadScore: 40 + (i * 3) % 60,
        createdAt,
      };
    });

    for (const leadData of myLeadsData) {
      await prisma.lead.create({ data: leadData });
    }

    const myLeads = await prisma.lead.findMany({ where: { tenantId: myTenant.id } });

    // إضافة أنشطة ومهام لشركة العلي
    for (const lead of myLeads.slice(0, 15)) {
      await prisma.leadActivity.create({
        data: {
          tenantId: myTenant.id,
          leadId: lead.id,
          userId: salesUser?.id,
          activityType: "CALL_COMPLETED",
          description: "تم الاتصال بالعميل وشرح تفاصيل المشروع ومناقشة الدفعة الأولى.",
        }
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);
      await prisma.task.create({
        data: {
          tenantId: myTenant.id,
          leadId: lead.id,
          assignedTo: salesUser!.id,
          title: "متابعة العميل هاتفياً وتأكيد موعد الزيارة للموقع",
          dueDate,
          priority: "HIGH",
          status: "PENDING",
        }
      });
    }

    // إضافة تذاكر دعم لشركة العلي
    await prisma.ticket.createMany({
      data: [
        {
          tenantId: myTenant.id,
          title: "مشكلة في ربط خط الواتساب السحابي",
          description: "تظهر علامة فصل الاتصال عند تفعيل الرمز الشريطي QR Code في صفحة الإعدادات.",
          status: "OPEN",
        },
        {
          tenantId: myTenant.id,
          title: "استفسار عن طريقة ترقية سعة الوكلاء",
          description: "نحتاج لإضافة وكيلين إضافيين للباقة الذهبية، هل الدفع يكون شهرياً أم سنوياً؟",
          status: "OPEN",
        }
      ]
    });

    console.log("✅ تمت تهيئة وتغذية حساب شركة العلي العقارية بنجاح!");
  }

  // 2. تنظيف الشركات القديمة الأخرى لتفادي التكرار
  console.log("🧹 جاري تنظيف باقي الحسابات والمطورين الآخرين...");
  await prisma.tenant.deleteMany({
    where: {
      subdomain: { notIn: ["dar-al-amar", "orca-crm-one"] }
    }
  });

  // 3. إنشاء 3 شركات ذهبية (بين 100 و 300 مشروع)
  console.log("👑 جاري إنشاء 3 شركات ذهبية (بين 100 و 300 مشروع لكل شركة)...");
  const goldTenantsConfig = [
    { name: "شركة الإنماء العقارية الكبرى", subdomain: "alinma-gold", projCount: 150 },
    { name: "مجموعة الرواد للتطوير العقاري", subdomain: "alrowad-gold", projCount: 220 },
    { name: "مجمعات صرح الوطن الذهبية", subdomain: "sarh-gold", projCount: 110 }
  ];

  for (const tc of goldTenantsConfig) {
    const tenant = await prisma.tenant.create({
      data: {
        companyName: tc.name,
        subdomain: tc.subdomain,
        subscriptionPlan: "gold",
        whatsappConnected: true,
        extraAgents: 8,
        isActive: true,
      }
    });

    // إنشاء مستخدمين للشركة
    const admin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: `أدمن ${tc.name}`,
        email: `admin@${tc.subdomain}.com`,
        passwordHash: securePassword,
        role: "ADMIN",
      }
    });

    const sales = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: `مستشار مبيعات ${tc.name}`,
        email: `sales@${tc.subdomain}.com`,
        passwordHash: securePassword,
        role: "SALES_EMPLOYEE",
      }
    });

    // توليد مشاريع بكثافة عالية (100 - 300) باستخدام createMany
    const projectsData = Array.from({ length: tc.projCount }).map((_, i) => ({
      tenantId: tenant.id,
      name: `برج النخبة الذهبي ${i + 1}`,
      city: CITIES[i % CITIES.length],
      status: i % 5 === 0 ? "PLANNING" : i % 5 === 1 ? "UNDER_CONSTRUCTION" : i % 5 === 2 ? "COMPLETED" : "SOLD_OUT",
      unitsTotal: 100 + (i % 5) * 20,
      unitsSold: 60 + (i % 5) * 10,
      unitsBooked: 10 + (i % 5) * 2,
      minPrice: 1200000 + (i % 3) * 200000,
      maxPrice: 3000000 + (i % 3) * 400000,
    }));
    await prisma.project.createMany({ data: projectsData });

    // جلب جزء من المشاريع لربط الليدات بها
    const sampleProjects = await prisma.project.findMany({
      where: { tenantId: tenant.id },
      take: 10
    });

    // إنشاء 20 عميل محتمل
    const leadsData = Array.from({ length: 20 }).map((_, i) => {
      const proj = sampleProjects[i % sampleProjects.length];
      const randomDays = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - randomDays);

      return {
        tenantId: tenant.id,
        projectId: proj.id,
        assignedTo: sales.id,
        firstName: `عميل ذهبي ${i + 1}`,
        lastName: `التميمي`,
        phone: `0599901${tc.projCount}${i.toString().padStart(2, "0")}`,
        email: `client${i}@${tc.subdomain}.com`,
        city: proj.city,
        source: LEAD_SOURCES[i % LEAD_SOURCES.length],
        status: LEAD_STATUSES[i % LEAD_STATUSES.length] as any,
        leadScore: 60 + (i % 4) * 10,
        createdAt,
      };
    });

    for (const ld of leadsData) {
      await prisma.lead.create({ data: ld });
    }

    const leads = await prisma.lead.findMany({ where: { tenantId: tenant.id }, take: 5 });
    for (const lead of leads) {
      await prisma.leadActivity.create({
        data: {
          tenantId: tenant.id,
          leadId: lead.id,
          userId: sales.id,
          activityType: "VISIT_COMPLETED",
          description: "تم زيارة مكتب المبيعات ومعاينة شقة العرض بالموقع ونالت إعجاب العميل.",
        }
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      await prisma.task.create({
        data: {
          tenantId: tenant.id,
          leadId: lead.id,
          assignedTo: sales.id,
          title: "متابعة العميل مع البنك للحسبة التمويلية",
          dueDate,
          priority: "HIGH",
          status: "PENDING",
        }
      });
    }

    // إضافة تذاكر دعم
    await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        title: "طلب تدريب على تصفير حسابات المبيعات",
        description: "نرغب بجلسة تدريبية لفريق المبيعات على لوحة التحكم السحابية.",
        status: "OPEN",
      }
    });
  }

  // 4. إنشاء 3 شركات فضية (بين 5 و 10 مشاريع)
  console.log("🥈 جاري إنشاء 3 شركات فضية (بين 5 و 10 مشاريع لكل شركة)...");
  const silverTenantsConfig = [
    { name: "مكتب ركاز العقاري", subdomain: "rekaz-silver", projCount: 6 },
    { name: "واحات التطوير العقارية", subdomain: "waha-silver", projCount: 8 },
    { name: "مؤسسة أبعاد السكنية", subdomain: "abaad-silver", projCount: 7 }
  ];

  for (const tc of silverTenantsConfig) {
    const tenant = await prisma.tenant.create({
      data: {
        companyName: tc.name,
        subdomain: tc.subdomain,
        subscriptionPlan: "silver",
        whatsappConnected: true,
        extraAgents: 3,
        isActive: true,
      }
    });

    const admin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: `أدمن ${tc.name}`,
        email: `admin@${tc.subdomain}.com`,
        passwordHash: securePassword,
        role: "ADMIN",
      }
    });

    const sales = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: `مسؤول مبيعات ${tc.name}`,
        email: `sales@${tc.subdomain}.com`,
        passwordHash: securePassword,
        role: "SALES_EMPLOYEE",
      }
    });

    // توليد مشاريع (5 - 10)
    const projectsData = Array.from({ length: tc.projCount }).map((_, i) => ({
      tenantId: tenant.id,
      name: `مجمع ريزيدنس الفضي ${i + 1}`,
      city: CITIES[i % CITIES.length],
      status: i % 3 === 0 ? "UNDER_CONSTRUCTION" : "COMPLETED",
      unitsTotal: 50 + i * 5,
      unitsSold: 30 + i * 2,
      unitsBooked: 5,
      minPrice: 900000,
      maxPrice: 1500000,
    }));
    await prisma.project.createMany({ data: projectsData });
    const sampleProjects = await prisma.project.findMany({ where: { tenantId: tenant.id } });

    // إنشاء 12 عميل محتمل
    const leadsData = Array.from({ length: 12 }).map((_, i) => {
      const proj = sampleProjects[i % sampleProjects.length];
      const randomDays = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - randomDays);

      return {
        tenantId: tenant.id,
        projectId: proj.id,
        assignedTo: sales.id,
        firstName: `عميل فضي ${i + 1}`,
        lastName: `المالكي`,
        phone: `0588801${tc.projCount}${i.toString().padStart(2, "0")}`,
        email: `client${i}@${tc.subdomain}.com`,
        city: proj.city,
        source: LEAD_SOURCES[i % LEAD_SOURCES.length],
        status: LEAD_STATUSES[i % LEAD_STATUSES.length] as any,
        leadScore: 50 + (i % 3) * 10,
        createdAt,
      };
    });

    for (const ld of leadsData) {
      await prisma.lead.create({ data: ld });
    }

    const leads = await prisma.lead.findMany({ where: { tenantId: tenant.id }, take: 3 });
    for (const lead of leads) {
      await prisma.leadActivity.create({
        data: {
          tenantId: tenant.id,
          leadId: lead.id,
          userId: sales.id,
          activityType: "PHONE_CALL",
          description: "تم الاتصال بالعميل وجدولة موعد لزيارة مجمعاتنا السكنية الفضية.",
        }
      });
    }
  }

  // 5. إنشاء 3 شركات أساسية (بين 1 و 3 مشاريع)
  console.log("🥉 جاري إنشاء 3 شركات أساسية (بين 1 و 3 مشاريع لكل شركة)...");
  const basicTenantsConfig = [
    { name: "الوسيط المستقل للعقار", subdomain: "broker-basic", projCount: 1 },
    { name: "مكتب اليسر السكني", subdomain: "yusr-basic", projCount: 2 },
    { name: "مؤسسة سهل العقارية", subdomain: "sahl-basic", projCount: 3 }
  ];

  for (const tc of basicTenantsConfig) {
    const tenant = await prisma.tenant.create({
      data: {
        companyName: tc.name,
        subdomain: tc.subdomain,
        subscriptionPlan: "basic",
        whatsappConnected: true,
        extraAgents: 1,
        isActive: true,
      }
    });

    const admin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: `أدمن ${tc.name}`,
        email: `admin@${tc.subdomain}.com`,
        passwordHash: securePassword,
        role: "ADMIN",
      }
    });

    // توليد مشاريع (1 - 3)
    const projectsData = Array.from({ length: tc.projCount }).map((_, i) => ({
      tenantId: tenant.id,
      name: `فيلا يسر المحدودة ${i + 1}`,
      city: CITIES[i % CITIES.length],
      status: "COMPLETED",
      unitsTotal: 10,
      unitsSold: 7,
      unitsBooked: 1,
      minPrice: 850000,
      maxPrice: 1200000,
    }));
    await prisma.project.createMany({ data: projectsData });
    const sampleProjects = await prisma.project.findMany({ where: { tenantId: tenant.id } });

    // إنشاء 6 عملاء محتملين
    const leadsData = Array.from({ length: 6 }).map((_, i) => {
      const proj = sampleProjects[i % sampleProjects.length];
      const randomDays = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - randomDays);

      return {
        tenantId: tenant.id,
        projectId: proj.id,
        assignedTo: admin.id,
        firstName: `عميل أساسي ${i + 1}`,
        lastName: `العتيبي`,
        phone: `0577701${tc.projCount}${i.toString().padStart(2, "0")}`,
        email: `client${i}@${tc.subdomain}.com`,
        city: proj.city,
        source: LEAD_SOURCES[i % LEAD_SOURCES.length],
        status: LEAD_STATUSES[i % LEAD_STATUSES.length] as any,
        leadScore: 40 + (i % 2) * 10,
        createdAt,
      };
    });

    for (const ld of leadsData) {
      await prisma.lead.create({ data: ld });
    }
  }

  console.log("⭐ تمت تعبئة وتغذية قاعدة البيانات بكافة الشركات والباقات والوكلاء والأقسام بنجاح كامل!");
}

main()
  .catch((e) => {
    console.error("❌ خطأ أثناء تغذية البيانات:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
