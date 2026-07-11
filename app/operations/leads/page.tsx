import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { LEADS_READER_ROLES } from "@/lib/leads/model";
import LeadsWorkspace from "@/features/leads/components/LeadsWorkspace";
import LeadsRouteState from "@/features/leads/components/LeadsRouteState";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  try {
    const verified = await assertServerActionRole(session, LEADS_READER_ROLES);

    return (
      <LeadsWorkspace
        viewerRole={String(verified.role || "")}
        viewerUserId={String(verified.userId || "")}
      />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED") {
      redirect("/login");
    }
    if (message === "FORBIDDEN") {
      return <LeadsRouteState state="forbidden" />;
    }
    throw error;
  }
}
