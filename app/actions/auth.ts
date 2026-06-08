// app/actions/auth.ts
"use server";

import { prisma, rawPrisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { encrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";

/**
 * حركة تسجيل الدخول والتحقق المشفر من الهوية والشركة النشطة
 */
export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string || "").trim().toLowerCase();
  const rl = rateLimit(`login:${email}`, 5, 60000);
  if (!rl.allowed) {
    return { success: false, error: "محاولات دخول كثيرة جداً. الرجاء الانتظار دقيقة." };
  }

  try {
    const password = formData.get("password") as string;

    if (!email || !password) {
      throw new Error("البريد الإلكتروني وكلمة المرور مطلوبة لدخول النظام.");
    }

    console.log("[LOGIN ACTION] login attempt:", email);
    const user = await rawPrisma.user.findFirst({
      where: {
        email,
        isActive: true,
      },
      include: {
        tenant: true,
      }
    });

    if (!user || !user.tenant || !user.tenant.isActive) {
      throw new Error("بيانات الدخول غير صحيحة، أو أن الحساب غير نشط حالياً.");
    }

    if (!user.passwordHash) {
      throw new Error("بيانات الدخول غير صحيحة.");
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    }

    const host = formData.get("clientHost") as string || "orca.az-ez.pro";
    const proto = formData.get("clientProto") as string || "https";
    const isSecureConnection = proto === "https";

    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    const isSuperAdmin = superAdminEmails.includes(user.email.toLowerCase());

    const cookieStore = await cookies();

    // 🛡️ حماية الدخول المتقاطع بين المستأجرين (Cross-Tenant Protection)
    // إذا كان الكوكي مختلف، نسمح بالدخول ونحدّث الكوكي تلقائياً
    const deviceTenant = cookieStore.get("device_tenant_subdomain")?.value;
    if (deviceTenant && deviceTenant !== user.tenant.subdomain) {
      console.log(`[LOGIN ACTION] Device tenant mismatch: ${deviceTenant} → ${user.tenant.subdomain}, updating cookie`);
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

    const PLATFORM_ARCHITECT_EMAILS = (process.env.PLATFORM_ARCHITECT_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
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

    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax" | "strict" | "none";
      path: string;
      maxAge: number;
      domain?: string;
    } = {
      httpOnly: true,
      secure: isSecureConnection,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
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

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
    return { success: false, error: message };
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

  return { success: true };
}
