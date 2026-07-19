// app/operations/settings/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import SettingsView from "@/components/views/SettingsView";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { runWithTenantContext } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // Default values
  let tenant = {
    companyName: "ORCA",
    subdomain: "orca",
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
            },
          }),
          prisma.user.findMany({
            where: { tenantId: activeTenant.id },
            orderBy: { createdAt: "asc" },
          }),
        ]),
    );

    if (dbTenant) {
      tenant = {
        companyName: dbTenant.companyName,
        subdomain: dbTenant.subdomain,
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
