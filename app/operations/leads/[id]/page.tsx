import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getLeadDetailAction } from "@/app/actions/leads";
import LeadDetailClient from "./LeadDetailClient";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const result = await getLeadDetailAction(id);

  if (!result.success) {
    notFound();
  }

  return (
    <LeadDetailClient
      lead={result.lead}
      viewerRole={String(result.viewerRole || session.role || "")}
      viewerUserId={String(session.userId || "")}
    />
  );
}
