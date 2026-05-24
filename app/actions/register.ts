// app/actions/register.ts
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encrypt } from "@/lib/session";
import { cookies } from "next/headers";

/**
 * حركة تسجيل منشأة تطوير عقاري جديدة وإنشاء حساب مسؤول النظام لها
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

    // تنظيف النطاق الفرعي: تحويل الحروف للإنجليزية الصغيرة وإزالة المسافات والرموز الخاصة
    const cleanSubdomain = subdomain
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");

    if (cleanSubdomain.length < 3) {
      throw new Error("النطاق الفرعي (Subdomain) يجب أن يتكون من 3 أحرف إنجليزية على الأقل وبدون رموز خاصة.");
    }

    // 1. التحقق من عدم حجز النطاق الفرعي مسبقاً في النظام (SaaS Subdomain Check)
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain: cleanSubdomain },
    });

    if (existingTenant) {
      throw new Error("عذراً، هذا النطاق الفرعي (Subdomain) محجوز لشركة تطوير عقاري أخرى بالفعل.");
    }

    // 2. التحقق من عدم تسجيل البريد الإلكتروني مسبقاً
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.trim().toLowerCase() },
    });

    if (existingUser) {
      throw new Error("عذراً، هذا البريد الإلكتروني مسجل مسبقاً في النظام.");
    }

    // 3. تشفير كلمة المرور بنظام Bcrypt الآمن
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 4. معالجة إنشاء الشركة والمدير العام في قاعدة البيانات كعملية واحدة متكاملة (Transaction)
    const result = await prisma.$transaction(async (tx) => {
      // أ. إنشاء المنشأة (Tenant)
      const newTenant = await tx.tenant.create({
        data: {
          companyName,
          subdomain: cleanSubdomain,
          subscriptionPlan: "basic", // تفعيل الباقة الأساسية افتراضياً
        },
      });

      // ب. إنشاء حساب المدير العام (Admin) وربطه بالمنشأة
      const newAdmin = await tx.user.create({
        data: {
          tenantId: newTenant.id,
          name: adminName,
          email: adminEmail.trim().toLowerCase(),
          passwordHash: hashedPassword,
          role: "ADMIN",
        },
      });

      return { newTenant, newAdmin };
    });

    // 5. إنشاء وتوقيع الـ JWT للجلسة تلقائياً لتسجيل الدخول الفوري
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