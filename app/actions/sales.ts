"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { assertServerActionRole } from "@/lib/api-auth-guard";

export interface SalesRepKPI {
  id: string;
  name: string;
  email: string;
  leadsCount: number;
  bookings: number;
  contracts: number;
  conversionRate: number;
  responseMinutes: number | null;
  performanceScore: number;
}

export async function getSalesPerformanceAction(): Promise<SalesRepKPI[]> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  await assertServerActionRole(session, [
    "ADMIN",
    "SALES_MANAGER",
  ]);

  const tenant = await getActiveTenant();

  const salesUsers = await prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: { in: ["SALES_EMPLOYEE", "SALES_MANAGER", "ADMIN"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      leads: {
        where: {
          isArchived: false,
        },
        select: {
          status: true,
          createdAt: true,
          lastContactedAt: true,
        },
      },
    },
  });

  return salesUsers
    .map((user) => {
      const leadsCount = user.leads.length;
      const bookings = user.leads.filter(
        (lead) => lead.status === "RESERVED",
      ).length;
      const contracts = user.leads.filter(
        (lead) =>
          lead.status === "CONTRACT_SIGNED" || lead.status === "WON",
      ).length;

      const successfulDeals = bookings + contracts;
      const conversionRate =
        leadsCount > 0
          ? Number(((successfulDeals / leadsCount) * 100).toFixed(1))
          : 0;

      const responseSamples = user.leads
        .filter(
          (lead) =>
            lead.lastContactedAt &&
            lead.lastContactedAt.getTime() >= lead.createdAt.getTime(),
        )
        .map(
          (lead) =>
            (lead.lastContactedAt!.getTime() - lead.createdAt.getTime()) /
            60_000,
        );

      const responseMinutes =
        responseSamples.length > 0
          ? Math.round(
              responseSamples.reduce((sum, value) => sum + value, 0) /
                responseSamples.length,
            )
          : null;

      const performanceScore =
        leadsCount > 0
          ? Math.min(
              100,
              Math.round(
                ((contracts * 1 + bookings * 0.5) / leadsCount) * 100,
              ),
            )
          : 0;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        leadsCount,
        bookings,
        contracts,
        conversionRate,
        responseMinutes,
        performanceScore,
      };
    })
    .sort(
      (a, b) =>
        b.contracts - a.contracts ||
        b.bookings - a.bookings ||
        b.conversionRate - a.conversionRate,
    );
}
