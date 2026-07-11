import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getLeadDetailAction } from "@/app/actions/leads";
import LeadDetailClient from "@/features/leads/components/LeadDetailClient";
import LeadsRouteState from "@/features/leads/components/LeadsRouteState";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const result = await getLeadDetailAction(id);

  if (!result.success) {
    if (result.code === "UNAUTHORIZED") {
      redirect("/login");
    }
    if (result.code === "NOT_FOUND") {
      notFound();
    }
    if (result.code === "FORBIDDEN") {
      return <LeadsRouteState state="forbidden" />;
    }
    throw new Error("LEADS_DETAIL_LOAD_FAILED");
  }

  return (
    <LeadDetailClient
      lead={result.lead}
      viewerRole={String(result.viewerRole || session.role || "")}
      viewerUserId={String(session.userId || "")}
    />
  );
}
