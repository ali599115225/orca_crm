import { headers } from "next/headers";
import { getSession } from "./session";
import { cache } from "react";
import { setTenantContext } from "./tenant-context";
import {
  tenantResolutionFindActiveById,
  tenantResolutionFindActiveBySubdomain,
  tenantResolutionFindFirstActive,
} from "./system-prisma-boundary";

export const getActiveTenant = cache(
  async function getActiveTenantInternal(hostOverride?: string) {
    const session = await getSession();

    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const isSuperAdmin =
      session &&
      superAdminEmails.includes(String(session.email).toLowerCase());

    if (session?.tenantId) {
      const tenant = await tenantResolutionFindActiveById(
        session.tenantId as string,
      );

      if (tenant) {
        setTenantContext({
          tenantId: tenant.id,
          userId: (session.userId as string) || undefined,
        });

        return tenant;
      }
    }

    let host = hostOverride || "";

    if (!host) {
      try {
        const headersList = await headers();
        host = headersList.get("host") || "";
      } catch {
        host = "";
      }
    }

    const domainParts = host.split(".");
    let subdomain = "dar-al-amar";

    if (domainParts.length > 2) {
      subdomain = domainParts[0];
    }

    let tenant =
      await tenantResolutionFindActiveBySubdomain(subdomain);

    if (!tenant && isSuperAdmin) {
      tenant = await tenantResolutionFindFirstActive();
    }

    if (!tenant) {
      console.error(
        "[Tenant] No active tenant found — operations inaccessible",
      );

      throw new Error(
        "عذراً، لا يوجد أي منشأة عقارية مسجلة أو نشطة في هذا النظام حالياً.",
      );
    }

    if (session?.userId) {
      setTenantContext({
        tenantId: tenant.id,
        userId: session.userId as string,
      });
    }

    return tenant;
  },
);
