import { getLeadDetailAction } from "@/app/actions/leads";
import { notFound } from "next/navigation";
import LeadDetailClient from "./LeadDetailClient";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const result = await getLeadDetailAction(params.id);

  if (!result.success || !result.lead) {
    notFound();
  }

  // Convert Date objects to ISO strings for client component
  const lead = {
    ...result.lead,
    createdAt: result.lead.createdAt.toISOString(),
    emailMessages: result.lead.emailMessages.map(msg => ({
      ...msg,
      createdAt: msg.createdAt.toISOString(),
      sentAt: msg.sentAt?.toISOString() || null,
    })),
    leadActivities: result.lead.leadActivities.map(activity => ({
      ...activity,
      createdAt: activity.createdAt.toISOString(),
    })),
  };

  return <LeadDetailClient lead={lead} />;
}
