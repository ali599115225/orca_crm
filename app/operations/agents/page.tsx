import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getDeploymentLicenseMode } from "@/lib/deployment-license";
import { normalizeAgentPlan } from "@/lib/agents/entitlements";
import AgentManagementView from "@/components/views/AgentManagementView";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  let tenantPlan = "basic";
  let totalLeads = 0;
  let totalUsers = 0;
  const licenseMode = getDeploymentLicenseMode();

  try {
    const tenant = await getActiveTenant();
    tenantPlan = normalizeAgentPlan(tenant.subscriptionPlan);

    const [leadCount, userCount] = await Promise.all([
      prisma.lead.count({ where: { tenantId: tenant.id } }),
      prisma.user.count({ where: { tenantId: tenant.id } }),
    ]);

    totalLeads = leadCount;
    totalUsers = userCount;
  } catch (error) {
    console.error("[AgentsPage] tenant fetch error:", error);
  }

  return (
    <AgentManagementView
      tenantPlan={tenantPlan}
      licenseMode={licenseMode}
      totalLeads={totalLeads}
      totalUsers={totalUsers}
    />
  );
}