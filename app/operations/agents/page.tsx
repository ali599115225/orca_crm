import { redirect } from 'next/navigation';
import AgentManagementView from "@/components/views/AgentManagementView";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDeploymentLicenseMode } from "@/lib/deployment-license";
import { runWithTenantContext } from "@/lib/tenant-context";

export default async function AgentsPage() {
  const session = await getSession();
  if (!session?.tenantId) {
    redirect('/login');
  }

  const [tenant, totalUsers, totalLeads] = await runWithTenantContext(
    { tenantId: session.tenantId as string, userId: session.userId as string | undefined },
    async () =>
      await Promise.all([
        prisma.tenant.findUnique({
          where: { id: session.tenantId as string },
          select: { subscriptionPlan: true },
        }),
        prisma.user.count({
          where: { tenantId: session.tenantId as string, isActive: true },
        }),
        prisma.lead.count({
          where: { tenantId: session.tenantId as string },
        }),
      ]),
  );

  if (!tenant) {
    redirect('/login');
  }

  const licenseMode = getDeploymentLicenseMode();

  return (
    <AgentManagementView
      tenantPlan={tenant.subscriptionPlan}
      licenseMode={licenseMode}
      totalUsers={totalUsers}
      totalLeads={totalLeads}
    />
  );
}
