import { redirect } from 'next/navigation';
import AgentManagementView from "@/components/views/AgentManagementView";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDeploymentLicenseMode } from "@/lib/deployment-license";

export default async function AgentsPage() {
  const session = await getSession();
  if (!session?.tenantId) {
    redirect('/login');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId as string },
    select: {
      subscriptionPlan: true,
    }
  });

  if (!tenant) {
    redirect('/login');
  }

  const totalUsers = await prisma.user.count({
    where: { tenantId: session.tenantId, isActive: true },
  });

  const totalLeads = await prisma.lead.count({
    where: { tenantId: session.tenantId },
  });

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