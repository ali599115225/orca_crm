// app/operations/settings/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import SettingsView from "@/components/views/SettingsView";
import { getActiveTenant } from "@/lib/tenant";
import { getDeploymentLicenseMode } from "@/lib/deployment-license";
import { getSession } from "@/lib/session";
import { runWithTenantContext } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const licenseMode = getDeploymentLicenseMode();
  // Default values
  let tenant = {
    companyName: "ORCA",
    subdomain: "orca",
    subscriptionPlan: "BASIC",
    extraAgents: 0,
    licenseMode,
    growthWarning: false,
  };
  let users: any[] = [];
  try {
    const activeTenant = await getActiveTenant();
    const session = await getSession();

    const [dbTenant, dbUsers] = await runWithTenantContext(
      {
        tenantId: activeTenant.id,
        userId: session?.userId as string | undefined,
      },
      async () =>
        await Promise.all([
          prisma.tenant.findUnique({
            where: { id: activeTenant.id },
            select: {
              companyName: true,
              subdomain: true,
              subscriptionPlan: true,
              extraAgents: true,
              _count: { select: { leads: true } },
            },
          }),
          prisma.user.findMany({
            where: { tenantId: activeTenant.id },
            orderBy: { createdAt: "asc" },
          }),
        ]),
    );

    if (dbTenant) {
      const PLAN_LEAD_LIMITS: Record<string, number> = {
        BASIC: 200,
        SILVER: 1000,
        GOLD: 5000,
        SUPER: 99999,
      };

      const limit = PLAN_LEAD_LIMITS[dbTenant.subscriptionPlan] ?? 200;
      const growthWarning = licenseMode === "DEDICATED_COPY" ? false : dbTenant._count.leads > limit * 0.8;

      tenant = {
        companyName: dbTenant.companyName,
        subdomain: dbTenant.subdomain,
        subscriptionPlan: dbTenant.subscriptionPlan,
        extraAgents: dbTenant.extraAgents ?? 0,
        licenseMode,
        growthWarning,
      };
    }
    users = dbUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("[SettingsPage] DB fetch error:", err);
  }

  return (
    <Suspense
      fallback={
        <div className="flex-1 py-3 space-y-4 px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-[var(--nc-surface)] dark:bg-white/5 animate-pulse"
            />
          ))}
        </div>
      }
    >
      <SettingsView tenant={tenant} users={users} />
    </Suspense>
  );
}
