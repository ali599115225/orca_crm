// lib/tenant.ts
import { headers } from "next/headers";
import { prisma } from "./prisma";

/**
 * وظيفة برمجية تجلب بيانات الشركة النشطة (Tenant) تلقائياً
 * بناءً على النطاق الفرعي (Subdomain) المستدعى في المتصفح.
 */
export async function getActiveTenant() {
  const headersList = await headers();
  const host = headersList.get("host") || ""; // مثل: dar-al-amar.localhost:3000
  
  // تقسيم النطاق للحصول على الـ Subdomain
  const domainParts = host.split(".");
  let subdomain = "dar-al-amar"; // قيمة افتراضية للبيئة التجريبية المحلية (Fallback)

  if (domainParts.length > 2) {
    subdomain = domainParts[0];
  }

  // 1. البحث عن الشركة بمطابقة النطاق الفرعي المباشر
  let tenant = await prisma.tenant.findFirst({
    where: { 
      subdomain: subdomain,
      isActive: true 
    },
  });

  // 2. صمام أمان سحابي لتجاوز تعقيدات نطاقات Vercel المجانية المؤقتة أثناء التجربة والتطوير
  if (!tenant) {
    // إذا لم نجد نطاقاً مطابقاً (بسبب روابط فيرسيل الطويلة العشوائية)،
    // نجلب أول شركة عقارية نشطة مسجلة في قاعدة بيانات شركتكم لكي لا يتعطل المطور أو الموظف.
    tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
    });
  }

  if (!tenant) {
    throw new Error("عذراً، لا يوجد أي منشأة عقارية مسجلة أو نشطة في هذا النظام حالياً.");
  }

  return tenant;
}