import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import DashboardView from "./DashboardView";
import { getDashboardReadModel } from "@/features/dashboard/server/getDashboardReadModel";
import { getDashboardCapabilities } from "@/features/dashboard/server/dashboardPermissions";

export const metadata = {
  title: "لوحة العمليات - أوركا",
  description: "ملخص موثوق لمسار الصفقات والعمليات اليومية.",
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
    <DashboardView
      user={{
        name: typeof session?.name === "string" ? session.name : null,
      }}
      model={model}
      capabilities={capabilities}
    />
  );
}
