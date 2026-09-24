import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { getDashboardReadModel } from "@/features/dashboard/server/getDashboardReadModel";
import { getDashboardCapabilities } from "@/features/dashboard/server/dashboardPermissions";
import CleanroomDashboard from "@/features/dashboard/components/CleanroomDashboard";

export const metadata = {
  title: "لوحة التحكم - ORCA",
  description: "مركز العمليات العقارية",
};

export default async function DashboardPage() {
  const [session, tenant] = await Promise.all([
    getSession(),
    getActiveTenant(),
  ]);

  const [model, capabilities] = await Promise.all([
    getDashboardReadModel(tenant.id),
    getDashboardCapabilities(session),
  ]);

  return (
    <CleanroomDashboard
      user={{
        name: typeof session?.name === "string" ? session.name : null,
      }}
      model={model}
      capabilities={capabilities}
    />
  );
}