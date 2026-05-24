// app/actions/auth.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { encrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs"; // استدعاء مكتبة التشفير

/**
 * حركة تسجيل الدخول والتحقق المشفر من الهوية والشركة النشطة
 */
export async function loginAction(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      throw new Error("البريد الإلكتروني وكلمة المرور مطلوبة لدخول النظام.");
    }

    // 1. جلب الشركة العقارية الحالية النشطة من الرابط الفرعي (Subdomain)
    const tenant = await getActiveTenant();

    // 2. البحث عن الموظف المسجل لهذه الشركة
    const user = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        tenantId: tenant.id, // حماية SaaS: الموظف ينتمي لهذه الشركة العقارية حصراً
        isActive: true,
      },
    });

    if (!user) {
      throw new Error("بيانات الدخول غير صحيحة، أو أن الحساب غير نشط حالياً.");
    }

    // 3. مقارنة وتحليل كلمة المرور المدخلة مع الهاش المشفر في قاعدة البيانات آمنة تماماً
    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    }

    // 4. إنشاء حمولة الجلسة (Session Payload)
    const sessionPayload = {
      userId: user.id,
      tenantId: tenant.id,
      tenantSubdomain: tenant.subdomain,
      role: user.role,
      name: user.name,
    };

    // 5. تشفير وحفظ الجلسة في ملفات الكوكيز الآمنة
    const sessionToken = await encrypt(sessionPayload);
    const cookieStore = await cookies();
    
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 ساعة صلاحية
    });

    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * حركة تسجيل الخروج وتدمير الجلسة
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
  revalidatePath("/");
}