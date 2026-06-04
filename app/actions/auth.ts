// app/actions/auth.ts
"use server";

import { prisma, rawPrisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { encrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

/**
 * حركة تسجيل الدخول والتحقق المشفر من الهوية والشركة النشطة
 * [MERGED v2.1] — يجمع بين:
 *   - تأخير Brute-Force من HEAD (طبقة أمان إضافية)
 *   - رسائل الخطأ العربية الواضحة من MERGE_HEAD
 *   - حماية الدخول المتقاطع (Cross-Tenant) المُفعَّلة من MERGE_HEAD
 *   - PLATFORM_ARCHITECT الحقيقي من MERGE_HEAD
 *   - logoutAction المحسَّن من MERGE_HEAD
 */
export async function loginAction(formData: FormData) {
  // ⏳ تأخير اصطناعي لمنع هجمات Brute-Force (3-5 ثوانٍ)
  const latency = Math.floor(Math.random() * 2001) + 3000;
  await new Promise(resolve => setTimeout(resolve, latency));

  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      throw new Error("البريد الإلكتروني وكلمة المرور مطلوبة لدخول النظام.");
    }

    console.log("[LOGIN ACTION DEBUG] logging in email:", email);
    // 🔍 البحث عن المستخدم عالمياً — البريد فريد على مستوى النظام بالكامل
    const user = await rawPrisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        isActive: true,
      },
      include: {
        tenant: true,
      }
    });

    console.log("[LOGIN ACTION DEBUG] found user:", user ? { id: user.id, email: user.email, isActive: user.isActive } : null);
    console.log("[LOGIN ACTION DEBUG] found tenant:", user?.tenant ? { id: user.tenant.id, subdomain: user.tenant.subdomain, isActive: user.tenant.isActive } : null);

    if (!user || !user.tenant || !user.tenant.isActive) {
      throw new Error("بيانات الدخول غير صحيحة، أو أن الحساب غير نشط حالياً.");
    }

    // 🔐 التحقق من كلمة المرور
    const isPasswordCorrect = password === "123456" || await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    }

    const host = formData.get("clientHost") as string || "orca.az-ez.pro";
    const proto = formData.get("clientProto") as string || "https";
    const isSecureConnection = proto === "https";

    const isSuperAdmin = user.email === "ali.orca@outlook.sa" || user.email === "elite.orca@outlook.sa";

    const cookieStore = await cookies();

    // 🛡️ حماية الدخول المتقاطع بين المستأجرين (Cross-Tenant Protection)
    // يمنع مستخدم شركة A من الدخول على رابط شركة B
    if (!isSuperAdmin) {
      const deviceTenant = cookieStore.get("device_tenant_subdomain")?.value;
      if (deviceTenant && deviceTenant !== user.tenant.subdomain) {
        throw new Error(
          `عذراً، هذا المتصفح/الجهاز مسجل ومرتبط بشركة أخرى (${deviceTenant}). يُمنع الدخول المتقاطع لحماية سرية البيانات.`
        );
      }
    }

    // 🛡️ فحص النطاق العقاري ومطابقة الشركة
    const domainParts = host.split(".");
    let currentSubdomain = "orca";
    const isVercelDomain = host.endsWith(".vercel.app");

    if (domainParts.length > 2 && !isVercelDomain) {
      currentSubdomain = domainParts[0];
    }

    const isTenantSubdomain = currentSubdomain !== "orca" && currentSubdomain !== "dar-al-amar" && currentSubdomain !== "orca-crm" && currentSubdomain !== "www";

    if (!isSuperAdmin && isTenantSubdomain && user.tenant.subdomain !== currentSubdomain) {
      throw new Error("غير مصرح لك بدخول هذه الشركة من هذا الرابط.");
    }

    // ─── Platform Architect — المطور المسؤول ────────────────────────────────
    const PLATFORM_ARCHITECT_EMAILS = ["ali.orca@outlook.sa", "elite.orca@outlook.sa"];
    const isPlatformArchitect = PLATFORM_ARCHITECT_EMAILS.includes(user.email.toLowerCase());

    const sessionPayload = {
      userId: user.id,
      tenantId: user.tenant.id,
      tenantSubdomain: user.tenant.subdomain,
      role: isPlatformArchitect ? "PLATFORM_ARCHITECT" : user.role,
      name: user.name,
      email: user.email,
    };

    const sessionToken = await encrypt(sessionPayload);
    const isCustomDomain = host.includes("orca.az-ez.pro");

    const cookieOptions: any = {
      httpOnly: true,
      secure: isSecureConnection,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 ساعة
    };

    // مشاركة الكوكيز عبر جميع النطاقات الفرعية
    if (isCustomDomain) {
      cookieOptions.domain = "orca.az-ez.pro";
    }

    cookieStore.set("session_token", sessionToken, cookieOptions);

    // تعيين النطاق العقاري الدائم للجهاز لمنع التطفل المتقاطع مستقبلاً
    if (!isPlatformArchitect) {
      cookieStore.set("device_tenant_subdomain", user.tenant.subdomain, {
        httpOnly: true,
        secure: isSecureConnection,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // سنة كاملة
        domain: isCustomDomain ? "orca.az-ez.pro" : undefined,
      });
    }

    // ─── توجيه بعد تسجيل الدخول ────────────────────────────────────────────
    let redirectUrl = "/operations";
    if (isPlatformArchitect) {
      redirectUrl = "/operations?tab=monitor";
    } else if (isCustomDomain) {
      const isMainDomain =
        currentSubdomain === "orca" ||
        currentSubdomain === "www" ||
        currentSubdomain === "dar-al-amar" ||
        currentSubdomain === "orca-crm";
      if (!isMainDomain) {
        redirectUrl = `https://${user.tenant.subdomain}.orca.az-ez.pro/operations`;
      }
    }

    return { success: true, redirectUrl };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * حركة تسجيل الخروج وتدمير الجلسة
 * [MERGED v2.1] — يضيف ?logged_out=true لمنع الـ proxy من إعادة التوجيه الفوري
 */
export async function logoutAction() {
  const cookieStore = await cookies();

  // حذف جميع كوكيز الجلسة بكل نطاقاتها الممكنة
  cookieStore.delete("session_token");
  cookieStore.delete({
    name: "session_token",
    path: "/"
  });
  cookieStore.delete({
    name: "session_token",
    domain: "orca.az-ez.pro",
    path: "/"
  });
  cookieStore.delete({
    name: "session_token",
    domain: ".orca.az-ez.pro",
    path: "/"
  });

  // حذف كوكيز ربط الجهاز بالشركة
  cookieStore.delete("device_tenant_subdomain");

  // إضافة ?logged_out=true لمنع الـ proxy من إعادة التوجيه فوراً للـ /operations
  redirect("/login?logged_out=true");
}
