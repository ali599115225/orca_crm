import RevenueIntegrityView from "@/components/revenue-integrity/RevenueIntegrityView";
import RevenueIntegrityRouteState from "@/components/revenue-integrity/RevenueIntegrityRouteState";
import { requireRevenuePermission } from "@/lib/revenue-integrity/authorization";
import { loadRevenueIntegrityDashboard } from "@/lib/revenue-integrity/queries";

export const dynamic = "force-dynamic";

export default async function RevenueIntegrityPage() {
  try {
    const auth = await requireRevenuePermission("revenue.risk.read");
    const dashboard = await loadRevenueIntegrityDashboard(
      auth.tenantId,
      auth.capabilities,
    );

    return (
      <RevenueIntegrityView
        initialData={dashboard}
        capabilities={auth.capabilities}
      />
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (
      code === "AUTHENTICATION_REQUIRED" ||
      code === "UNAUTHORIZED"
    ) {
      return <RevenueIntegrityRouteState state="unauthorized" />;
    }

    if (
      code.startsWith("FORBIDDEN") ||
      code === "CROSS_TENANT_ACCESS_DENIED"
    ) {
      return <RevenueIntegrityRouteState state="forbidden" />;
    }

    throw error;
  }
}
