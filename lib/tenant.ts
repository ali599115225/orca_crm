import { headers } from "next/headers";
import { prisma } from "./prisma";
import { getSession } from "./session"; // استدعاء الجلسة
import { cache } from "react";

/**
 * وظيفة برمجية تجلب بيانات الشركة النشطة (Tenant) تلقائياً
 * مع إعطاء الأولوية المطلقة لجلسة المستخدم المسجل دخوله حالياً لضمان دقة البيانات
 * تم تغليفها بـ cache لتفادي تكرار الاستعلامات في الطلب الواحد
 */
export const getActiveTenant = cache(async function getActiveTenantInternal() {
  // 1. أولاً: التحقق مما إذا كان هناك مستخدم مسجل دخوله حالياً ونستخرج شركته مباشرة
  const session = await getSession();
  if (session && session.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId as string },
    });
    if (tenant && tenant.isActive) {
      return tenant; // إرجاع شركة الموظف المسجل دخوله فوراً
    }
  }

  // 2. ثانياً (في حال عدم وجود جلسة - مثل صفحة الدخول العامة): نعتمد على نطاق المتصفح الفرعي
  const headersList = await headers();
  const host = headersList.get("host") || "";
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