// lib/tenant.ts
import { headers } from "next/headers";
import { prisma } from "./prisma";

/**
 * وظيفة برمجية تجلب بيانات الشركة النشطة (Tenant) تلقائياً
 * بناءً على النطاق الفرعي (Subdomain) المستدعى في المتصفح.
 */
export async function getActiveTenant() {
  const headersList = await headers();
  const host = headersList.get("host") || ""; // مثل: dar-al-amar.orcacrm.sa:3000
  
  // تقسيم النطاق للحصول على الـ Subdomain
  const domainParts = host.split(".");
  let subdomain = "dar-al-amar"; // قيمة افتراضية للبيئة التجريبية المحلية (Fallback)

  if (domainParts.length > 2) {
    subdomain = domainParts[0];
  }

  // البحث عن الشركة في قاعدة البيانات
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
  });

  if (!tenant) {
    throw new Error("عذراً، هذه الشركة غير مسجلة في نظام ORCA العقاري.");
  }

  if (!tenant.isActive) {
    throw new Error("عذراً، حساب هذه الشركة معطل حالياً. يرجى التواصل مع الدعم الفني.");
  }

  return tenant;
}