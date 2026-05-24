// prisma/seed.ts
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🧹 جاري تنظيف قاعدة البيانات القديمة لضمان تغذية سليمة...");
  
  // تنظيف الجداول بالترتيب لتجنب تعارض العلاقات (Foreign Keys)
  await prisma.task.deleteMany({});
  await prisma.leadActivity.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log("🔑 جاري تشفير كلمات المرور الافتراضية بنظام Bcrypt...");
  
  // تشفير كلمة المرور الافتراضية '123456' بقوة ملح تبلغ 10 جولات (Salt Rounds)
  const securePassword = await bcrypt.hash("123456", 10);

  console.log("🏗️ جاري إنشاء الشركة العقارية التجريبية (Tenant)...");
  
  // 1. إنشاء شركة عقارية (Tenant)
  const tenant = await prisma.tenant.create({
    data: {
      companyName: "شركة دار الأعمار العقارية",
      subdomain: "dar-al-amar",
      subscriptionPlan: "professional",
    },
  });

  // 2. إنشاء مستخدمين بكلمات مرور مشفرة تماماً
  const manager = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "أحمد الغامدي",
      email: "ahmed@dar.com",
      passwordHash: securePassword, // حفظ الهاش المشفر وليس النص العادي
      role: "SALES_MANAGER",
    },
  });

  const salesEmployee = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "بندر العتيبي",
      email: "bandar@dar.com",
      passwordHash: securePassword, // حفظ الهاش المشفر وليس النص العادي
      role: "SALES_EMPLOYEE",
    },
  });

  // 3. إنشاء مشاريع عقارية
  const project1 = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      name: "نرجس ريزيدنس 101",
      city: "الرياض",
      status: "UNDER_CONSTRUCTION",
      unitsTotal: 120,
      unitsSold: 85,
      unitsBooked: 15,
      minPrice: 1200000,
      maxPrice: 1800000,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      name: "واحة الملقا الفاخرة",
      city: "الرياض",
      status: "COMPLETED",
      unitsTotal: 45,
      unitsSold: 40,
      unitsBooked: 3,
      minPrice: 2800000,
      maxPrice: 4500000,
    },
  });

  // 4. إنشاء عملاء محتملين (Leads) وربطهم بالمشاريع والمسؤولين
  await prisma.lead.createMany({
    data: [
      {
        tenantId: tenant.id,
        projectId: project1.id,
        assignedTo: salesEmployee.id,
        firstName: "سليمان بن عبد العزيز",
        lastName: "الراشد",
        phone: "0505123456",
        email: "sulaiman@example.com",
        city: "الرياض",
        source: "إعلانات سناب شات",
        status: "VISIT_SCHEDULED",
        leadScore: 85,
      },
      {
        tenantId: tenant.id,
        projectId: project2.id,
        assignedTo: salesEmployee.id,
        firstName: "منى محمد",
        lastName: "الشمري",
        phone: "0555987654",
        email: "mona@example.com",
        city: "الرياض",
        source: "حملة ميتا إعلانية",
        status: "NEW",
        leadScore: 60,
      },
    ],
  });

  console.log("✅ تمت إعادة تهيئة وتغذية قاعدة البيانات ببيانات مشفرة وآمنة تماماً!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });