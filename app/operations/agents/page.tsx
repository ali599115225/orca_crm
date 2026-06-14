// app/operations/agents/page.tsx
import { prisma } from '@/lib/prisma';
import { getActiveTenant } from '@/lib/tenant';
import AgentManagementView from '@/components/views/AgentManagementView';

export default async function AgentsPage() {
  let tenantPlan = 'diamond';
  let totalLeads = 0;
  let totalUsers = 0;

  try {
    const tenant = await getActiveTenant();
    if (tenant) {
      const planMap: Record<string, string> = {
        BASIC: 'basic',
        SILVER: 'pro',
        GOLD: 'diamond',
        SUPER: 'diamond',
        basic: 'basic',
        pro: 'pro',
        diamond: 'diamond',
      };
      tenantPlan = planMap[tenant.subscriptionPlan] ?? 'basic';

      const [leadCount, userCount] = await Promise.all([
        prisma.lead.count({ where: { tenantId: tenant.id } }),
        prisma.user.count({ where: { tenantId: tenant.id } }),
      ]);
      totalLeads = leadCount;
      totalUsers = userCount;
    }
  } catch (err) {
    console.error('[AgentsPage] tenant fetch error:', err);
  }

  return (
    <AgentManagementView
      tenantPlan={tenantPlan}
      totalLeads={totalLeads}
      totalUsers={totalUsers}
    />
  );
}
