import { headers } from "next/headers";
import { prisma } from "./prisma";
import { getSession } from "./session"; // استدعاء الجلسة
import { cache } from "react";

/**
 * وظيفة برمجية تجلب بيانات الشركة النشطة (Tenant) تلقائياً
 * مع إعطاء الأولوية المطلقة لجلسة المستخدم المسجل دخوله حالياً لضمان دقة البيانات
 * تم تغليفها بـ cache لتفادي تكرار الاستعلامات في الطلب الواحد
 */
export const getActiveTenant = cache(async function getActiveTenantInternal(hostOverride?: string) {
  // 1. أولاً: التحقق من الجلسة والصلاحيات الفوقية للمشرف العام
  const session = await getSession();
  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  const isSuperAdmin = session && superAdminEmails.includes(String(session.email).toLowerCase());

  // إذا لم يكن مشرفاً عاماً، نلتزم تماماً بشركته المحددة بالجلسة (العزل الصارم والحماية من التطفل)
  if (session && session.tenantId && !isSuperAdmin) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId as string },
    });
    if (tenant && tenant.isActive) {
      return tenant; // إرجاع شركة الموظف المسجل دخوله فوراً لمنع التداخل
    }
  }

  // 2. إذا كان مشرفاً عاماً أو لا توجد جلسة نشطة: نعتمد على نطاق المتصفح الفرعي لتمكينه من رؤية بيانات الشركة النشطة بالرابط
  let host = hostOverride || "";
  if (!host) {
    try {
      const headersList = await headers();
      host = headersList.get("host") || "";
    } catch (e) {
      // تجاهل أخطاء جلب الهيدرز في بيئة الـ Server Actions
    }
  }
  const domainParts = host.split(".");
  let subdomain = "dar-al-amar";

  if (domainParts.length > 2) {
    subdomain = domainParts[0];
  }

  let tenant = await prisma.tenant.findFirst({
    where: { 
      subdomain: subdomain,
      isActive: true 
    },
  });

  // 3. صمام الأمان السحابي للتجربة المحلية
  if (!tenant) {
    tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
    });
  }

  if (!tenant) {
    throw new Error("عذراً، لا يوجد أي منشأة عقارية مسجلة أو نشطة في هذا النظام حالياً.");
  }

  return tenant;
});
