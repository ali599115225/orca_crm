import { redirect } from "next/navigation";
import {
  assertServerActionRole,
  TENANT_ROLES,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { getSession } from "@/lib/session";
import PropertiesWorkspace from "@/components/real-estate/properties/PropertiesWorkspace";
import RentFlexPropertyAvailabilityPanel from "@/components/rent-flex/RentFlexPropertyAvailabilityPanel";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const verified = await assertServerActionRole(session, TENANT_ROLES);
    const canWrite = new Set<string>(TENANT_WRITE_ROLES).has(
      String(verified.role || ""),
    );
    return (
      <>
        <RentFlexPropertyAvailabilityPanel canWrite={canWrite} />
        <PropertiesWorkspace canWrite={canWrite} />
      </>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED") redirect("/login");
    if (message === "FORBIDDEN") {
      return (
        <div className="m-6 rounded-3xl border border-rose-500/25 bg-rose-500/10 p-8 text-center text-sm font-bold text-rose-200">
          لا تملك صلاحية الوصول إلى العقارات والوحدات.
        </div>
      );
    }
    throw error;
  }
}
