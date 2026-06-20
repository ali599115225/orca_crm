import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import HelpdeskView from "@/components/views/HelpdeskView";

export const dynamic = "force-dynamic";

export default async function HelpdeskPage() {
  let initialTickets: any[] = [];
  let tenantName = "ORCA";

  try {
    const tenant = await getActiveTenant();
    tenantName = tenant.companyName || "ORCA";

    const tickets = await prisma.ticket.findMany({
      where: { tenantId: tenant.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    initialTickets = tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      aiResponse: ticket.aiResponse ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error("[HelpdeskPage] tenant-scoped fetch error:", error);
  }

  return <HelpdeskView initialTickets={initialTickets} tenantName={tenantName} />;
}
