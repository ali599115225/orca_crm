// app/operations/agents/page.tsx
import { prisma } from '@/lib/prisma';
import AgentManagementView from '@/components/views/AgentManagementView';

export default async function AgentsPage() {
  // ─── جلب بيانات المستأجر الحقيقية ────────────────────────────────────────
  let tenantPlan = 'diamond'; // fallback
  let totalLeads = 0;
  let totalUsers = 0;

  try {
    const tenant = await prisma.tenant.findFirst({
      select: {
        subscriptionPlan: true,
        _count: {
          select: { leads: true, users: true }
        }
      }
    });

    if (tenant) {
      // نُحوّل SUPER إلى diamond لأن SettingsView لا تعرف SUPER
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
      totalLeads = tenant._count.leads;
      totalUsers = tenant._count.users;
    }
  } catch (err) {
    console.error('[AgentsPage] DB fetch error:', err);
    // نستمر مع القيم الافتراضية
  }

  return (
    <AgentManagementView
      tenantPlan={tenantPlan}
      totalLeads={totalLeads}
      totalUsers={totalUsers}
    />
  );
}
