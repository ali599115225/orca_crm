import "server-only";

import { prisma } from "@/lib/prisma";

export async function fetchWhatsAppDashboardStats(tenantId: string) {
  const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [conversationsCount, newLeadsCount, unreadMessagesCount] =
    await Promise.all([
      prisma.whatsAppContact.count({ where: { tenantId } }),
      prisma.lead.count({
        where: {
          tenantId,
          source: { in: ["WHATSAPP", "whatsapp"] },
          createdAt: { gte: oneWeekAgo },
        },
      }),
      prisma.whatsAppMessage.count({
        where: { tenantId, direction: "inbound", readAt: null },
      }),
    ]);

  return {
    success: true as const,
    conversationsCount,
    newLeadsCount,
    unreadMessagesCount,
  };
}
