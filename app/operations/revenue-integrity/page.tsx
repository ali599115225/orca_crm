import RevenueIntegrityView from "@/components/revenue-integrity/RevenueIntegrityView";
import { requireRevenuePermission } from "@/lib/revenue-integrity/authorization";
import { loadRevenueIntegrityDashboard } from "@/lib/revenue-integrity/queries";

export const dynamic = "force-dynamic";

export default async function RevenueIntegrityPage() {
  const auth = await requireRevenuePermission("revenue.risk.read");
  const dashboard = await loadRevenueIntegrityDashboard(auth.tenantId);

  return <RevenueIntegrityView initialData={dashboard} />;
}
