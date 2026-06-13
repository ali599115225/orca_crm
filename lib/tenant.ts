import { headers } from "next/headers";
import { prisma } from "./prisma";
import { getSession } from "./session";
import { cache } from "react";
import { tenantContext } from "./tenant-context";

export const getActiveTenant = cache(async function getActiveTenantInternal(hostOverride?: string) {
  const session = await getSession();
  const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  const isSuperAdmin = session && superAdminEmails.includes(String(session.email).toLowerCase());

  if (session && session.tenantId && !isSuperAdmin) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId as string },
    });
    if (tenant && tenant.isActive) {
      tenantContext.enterWith({ tenantId: tenant.id, userId: (session.userId as string) || undefined });
      return tenant;
    }
  }

  let host = hostOverride || "";
  if (!host) {
    try {
      const headersList = await headers();
      host = headersList.get("host") || "";
    } catch (e) {}
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

  if (!tenant) {
    // Fallback: try ANY active tenant before throwing
    tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
    });
  }

  if (!tenant) {
    console.error("[Tenant] No active tenant found — operations inaccessible");
    throw new Error("عذراً، لا يوجد أي منشأة عقارية مسجلة أو نشطة في هذا النظام حالياً.");
  }

  if (session?.userId) {
    tenantContext.enterWith({ tenantId: tenant.id, userId: session.userId as string });
  }

  return tenant;
});
