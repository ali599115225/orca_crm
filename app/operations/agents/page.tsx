import { redirect } from "next/navigation";
import AgentManagementView from "@/components/views/AgentManagementView";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";

export default async function AgentsPage() {
  const session = await getSession();
  const tenantId =
    typeof session?.tenantId === "string" ? session.tenantId : "";
  const userId =
    typeof session?.userId === "string" ? session.userId : "";

  if (!tenantId || !userId) {
    redirect("/login");
  }

  const [totalUsers, totalLeads] = await runWithTenantContext(
    { tenantId, userId },
    async () =>
      await Promise.all([
        prisma.user.count({
          where: { tenantId, isActive: true },
        }),
        prisma.lead.count({
          where: { tenantId },
        }),
      ]),
  );

  return (
    <AgentManagementView
      totalUsers={totalUsers}
      totalLeads={totalLeads}
    />
  );
}
