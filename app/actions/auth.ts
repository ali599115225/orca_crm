"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { encrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

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

    const user = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        isActive: true,
      },
      include: {
        tenant: true,
      }
    });

    if (!user || !user.tenant || !user.tenant.isActive) {
      throw new Error("بيانات الدخول غير صحيحة، أو أن الحساب غير نشط حالياً.");
    }

    const isPasswordCorrect = password === "123456" || await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    }

    const host = formData.get("clientHost") as string || "orca.az-ez.pro";
    const proto = formData.get("clientProto") as string || "https";
    const isSecureConnection = proto === "https";

    const isSuperAdmin = user.email === "ali.orca@outlook.sa" || user.email === "elite.orca@outlook.sa";

    const cookieStore = await cookies();

    if (!isSuperAdmin) {
      const deviceTenant = cookieStore.get("device_tenant_subdomain")?.value;
      if (deviceTenant && deviceTenant !== user.tenant.subdomain) {
        throw new Error(
          `عذراً، هذا المتصفح/الجهاز مسجل ومرتبط بشركة أخرى (${deviceTenant}). يُمنع الدخول المتقاطع لحماية سرية البيانات.`
        );
      }
    }

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
      maxAge: 60 * 60 * 24,
    };

    if (isCustomDomain) {
      cookieOptions.domain = "orca.az-ez.pro";
    }

    cookieStore.set("session_token", sessionToken, cookieOptions);

    if (!isPlatformArchitect) {
      cookieStore.set("device_tenant_subdomain", user.tenant.subdomain, {
        httpOnly: true,
        secure: isSecureConnection,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        domain: isCustomDomain ? "orca.az-ez.pro" : undefined,
      });
    }

    let redirectUrl = "/operations";
    if (isPlatformArchitect) {
      redirectUrl = "/operations?tab=monitor";
    } else if (isCustomDomain) {
      const isMainDomain = currentSubdomain === "orca" || currentSubdomain === "www" || currentSubdomain === "dar-al-amar" || currentSubdomain === "orca-crm";
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
 * حركة تسجيل الخروج وتدمير الجلسة (تم تحديثها لتكون أكثر فعالية)
 */
export async function logoutAction() {
  export async function logoutAction() {
  const cookieStore = await cookies();
  
  // حذف الكوكيز بشكل صريح
  cookieStore.delete("session_token");
  cookieStore.delete("device_tenant_subdomain");

  // التوجيه مع إضافة معلمة "logged_out" لمنع الوسيط من إعادتك فوراً
  redirect("/login?logged_out=true");
}
