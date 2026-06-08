// app/operations/settings/page.tsx
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import SettingsView from '@/components/views/SettingsView';
import { getActiveTenant } from '@/lib/tenant';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  // Default values
  let tenant = {
    companyName: 'ORCA CRM',
    subdomain: 'orca',
    subscriptionPlan: 'BASIC',
    extraAgents: 0,
    growthWarning: false,
  };
  let users: any[] = [];
  try {
    const activeTenant = await getActiveTenant();
    const session = await getSession();
    
    // Fetch tenant details from DB
    const dbTenant = await prisma.tenant.findUnique({
      where: { id: activeTenant.id },
      select: {
        companyName:      true,
        subdomain:        true,
        subscriptionPlan: true,
        extraAgents:      true,
        _count:           { select: { leads: true } },
      }
    });

    if (dbTenant) {
      const PLAN_LEAD_LIMITS: Record<string, number> = {
        BASIC: 200, SILVER: 1000, GOLD: 5000, SUPER: 99999,
      };
      const limit = PLAN_LEAD_LIMITS[dbTenant.subscriptionPlan] ?? 200;
      const growthWarning = dbTenant._count.leads > limit * 0.8;

      tenant = {
        companyName:      dbTenant.companyName,
        subdomain:        dbTenant.subdomain,
        subscriptionPlan: dbTenant.subscriptionPlan,
        extraAgents:      dbTenant.extraAgents ?? 0,
        growthWarning,
      };
    }

    // Fetch all users associated with this tenant
    const dbUsers = await prisma.user.findMany({
      where: { tenantId: activeTenant.id },
      orderBy: { createdAt: 'asc' },
    });

    users = dbUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString()
    }));

  } catch (err) {
    console.error('[SettingsPage] DB fetch error:', err);
  }

  return (
    <Suspense fallback={
      <div className="flex-1 py-3 space-y-4 px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-[var(--nc-surface)] dark:bg-white/5 animate-pulse" />
        ))}
      </div>
    }>
      <SettingsView 
        tenant={tenant} 
        users={users} 
      />
    </Suspense>
  );
}
