// app/actions/register.ts
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encrypt } from "@/lib/session";
import { cookies } from "next/headers";

/**
 * تسجيل منشأة عقارية جديدة وحقن بيانات تجريبية نموذجية لتهيئة لوحة التحكم فورياً للعمل [1.2.1, 1.2.2]
 */
export async function registerTenantAction(formData: FormData) {
  try {
    const companyName = formData.get("companyName") as string;
    const subdomain = formData.get("subdomain") as string;
    const adminName = formData.get("adminName") as string;
    const adminEmail = formData.get("adminEmail") as string;
    const adminPassword = formData.get("adminPassword") as string;

    if (!companyName || !subdomain || !adminName || !adminEmail || !adminPassword) {
      throw new Error("جميع الحقول مطلوبة لإتمام عملية تسجيل منشأتك العقارية.");
    }

    const cleanSubdomain = subdomain
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");

    if (cleanSubdomain.length < 3) {
      throw new Error("النطاق الفرعي (Subdomain) يجب أن يتكون من 3 أحرف إنجليزية على الأقل وبدون رموز خاصة.");
    }

    // 1. التحقق من عدم حجز النطاق الفرعي مسبقاً
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain: cleanSubdomain },
    });

    if (existingTenant) {
      throw new Error("عذراً، هذا النطاق الفرعي محجوز لشركة تطوير عقاري أخرى بالفعل.");
    }

    // 2. التحقق من عدم تسجيل البريد الإلكتروني مسبقاً
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.trim().toLowerCase() },
    });

    if (existingUser) {
      throw new Error("عذراً، هذا البريد الإلكتروني مسجل مسبقاً في النظام.");
    }

    // 3. تشفير كلمة المرور بنظام Bcrypt الآمن [1.1.2]
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 4. معالجة إنشاء الشركة والبيانات التجريبية النموذجية في عملية برمجية تبادلية واحدة (Database Transaction) [1.1.2]
    const result = await prisma.$transaction(async (tx) => {
      
      // أ. إنشاء المنشأة بقيمة فارغة للملف (لتنشيط لافتة التفعيل والـ Onboarding) [1.2.1, 1.2.2]
      const newTenant = await tx.tenant.create({
        data: {
          companyName: "منشأة جديدة قيد التأسيس", // نترك الاسم التجاري فارغاً لتعميره لاحقاً
          subdomain: cleanSubdomain,
          subscriptionPlan: "basic",
        },
      });

      // ب. إنشاء حساب المدير العام (Admin) وربطه بالمنشأة [1.1.2, 1.2.1]
      const newAdmin = await tx.user.create({
        data: {
          tenantId: newTenant.id,
          name: adminName,
          email: adminEmail.trim().toLowerCase(),
          passwordHash: hashedPassword,
          role: "ADMIN",
        },
      });

      // ج. حقن مشروع عقاري تجريبي ذكي للعميل الجديد [1.2.2]
      const demoProject = await tx.project.create({
        data: {
          tenantId: newTenant.id,
          name: "مشروع واحة النخبة السكني (تجريبي)",
          city: "الرياض",
          status: "UNDER_CONSTRUCTION",
          unitsTotal: 45,
          unitsSold: 28,
          unitsBooked: 5,
          minPrice: 1450000,
          maxPrice: 2200000,
        }
      });

      // د. حقن 3 عملاء محتملين سعوديين ديمو لتعبئة الرسوم والتقارير حياً [1.2.2]
      const lead1 = await tx.lead.create({
        data: {
          tenantId: newTenant.id,
          projectId: demoProject.id,
          assignedTo: newAdmin.id,
          firstName: "سليمان",
          lastName: "الحربي",
          phone: "0501112223",
          email: "sulaiman.demo@example.com",
          city: "الرياض",
          source: "إعلانات سناب شات",
          status: "NEW",
          leadScore: 70,
        }
      });

      const lead2 = await tx.lead.create({
        data: {
          tenantId: newTenant.id,
          projectId: demoProject.id,
          assignedTo: newAdmin.id,
          firstName: "سارة",
          lastName: "العتيبي",
          phone: "0553334445",
          email: "sara.demo@example.com",
          city: "الرياض",
          source: "حملة ميتا إعلانية",
          status: "VISIT_SCHEDULED",
          leadScore: 85,
        }
      });

      const lead3 = await tx.lead.create({
        data: {
          tenantId: newTenant.id,
          projectId: demoProject.id,
          assignedTo: newAdmin.id,
          firstName: "فيصل",
          lastName: "الشمري",
          phone: "0545556667",
          email: "faisal.demo@example.com",
          city: "جدة",
          source: "زيارة مباشرة المقر",
          status: "RESERVED",
          leadScore: 95,
        }
      });

      // هـ. حقن مهمتين معلقتين بجدول المتابعات لربط الأقسام والعمليات [1.2.2]
      await tx.task.create({
        data: {
          tenantId: newTenant.id,
          leadId: lead1.id,
          assignedTo: newAdmin.id,
          title: "الاتصال بسليمان لتنسيق موعد زيارة المعاينة لفيلا العرض",
          description: "تحديد وقت مناسب للعميل لمعاينة النماذج السكنية وحالتها الهندسية.",
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // غداً
          priority: "HIGH",
          status: "PENDING",
        }
      });

      await tx.task.create({
        data: {
          tenantId: newTenant.id,
          leadId: lead2.id,
          assignedTo: newAdmin.id,
          title: "تجهيز الحسبة التمويلية وتفصيل أقساط بنك الراجحي لسارة",
          description: "حساب نسبة الاستقطاع القصوى DSR وإرسال العرض المبدئي عبر الـ PDF.",
          dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // بعد غد
          priority: "MEDIUM",
          status: "PENDING",
        }
      });

      return { newTenant, newAdmin };
    });

    // 5. توقيع الـ JWT وتسجيل الدخول التلقائي
    const sessionPayload = {
      userId: result.newAdmin.id,
      tenantId: result.newTenant.id,
      tenantSubdomain: result.newTenant.subdomain,
      role: result.newAdmin.role,
      name: result.newAdmin.name,
    };

    const sessionToken = await encrypt(sessionPayload);
    const cookieStore = await cookies();

    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 ساعة صلاحية الجلسة
    });

    return { success: true, subdomain: result.newTenant.subdomain };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}