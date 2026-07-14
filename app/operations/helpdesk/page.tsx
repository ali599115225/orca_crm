import HelpdeskView from "@/components/views/HelpdeskView";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { runWithTenantContext } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

export default async function HelpdeskPage() {
  let initialTickets: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    aiResponse: string | null;
    createdAt: string;
    updatedAt: string;
  }> = [];
  let tenantName = "";
  let initialLoadFailed = false;

  try {
    const session = await getSession();
    const tenant = await getActiveTenant();
    const userId =
      typeof session?.userId === "string" ? session.userId : undefined;
    tenantName = tenant.companyName || "";

    const tickets = await runWithTenantContext(
      { tenantId: tenant.id, userId },
      async () =>
        await prisma.ticket.findMany({
          where: { tenantId: tenant.id },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          take: 200,
        }),
    );

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
    initialLoadFailed = true;
    console.error("[HelpdeskPage] tenant-scoped fetch error:", error);
  }

  return (
    <HelpdeskView
      initialTickets={initialTickets}
      tenantName={tenantName}
      initialLoadFailed={initialLoadFailed}
    />
  );
}
