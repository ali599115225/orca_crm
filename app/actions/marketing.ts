"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { assertServerActionRole } from "@/lib/api-auth-guard";

export interface MarketingSourceMetric {
  source: string;
  leads: number;
  reservations: number;
  wonLeads: number;
  signedContracts: number;
  contractValue: number;
  conversionRate: number;
}

export interface MarketingConnectionMetric {
  id: string;
  platform: string;
  accountId: string;
  status: string;
  updatedAt: string;
}

export interface MarketingOverview {
  totals: {
    leads: number;
    convertedLeads: number;
    signedContracts: number;
    contractValue: number;
  };
  sources: MarketingSourceMetric[];
  connections: MarketingConnectionMetric[];
}

const SUCCESS_STATUSES = new Set(["RESERVED", "CONTRACT_SIGNED", "WON"]);

export async function getMarketingOverviewAction(): Promise<MarketingOverview> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  await assertServerActionRole(session, [
    "ADMIN",
    "owner",
    "MARKETING",
    "SALES_MANAGER",
  ]);

  const tenant = await getActiveTenant();

  const [leads, connections] = await Promise.all([
    prisma.lead.findMany({
      where: {
        tenantId: tenant.id,
        isArchived: false,
      },
      select: {
        source: true,
        status: true,
        contracts: {
          select: {
            signedAt: true,
            totalVolumeSar: true,
          },
        },
      },
    }),
    prisma.platformConnection.findMany({
      where: {
        tenantId: tenant.id,
      },
      select: {
        id: true,
        platform: true,
        accountId: true,
        status: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  const grouped = new Map<string, MarketingSourceMetric>();

  for (const lead of leads) {
    const source = lead.source.trim() || "UNSPECIFIED";
    const current = grouped.get(source) ?? {
      source,
      leads: 0,
      reservations: 0,
      wonLeads: 0,
      signedContracts: 0,
      contractValue: 0,
      conversionRate: 0,
    };

    const status = String(lead.status);
    const signedContracts = lead.contracts.filter(
      (contract) => contract.signedAt !== null,
    );

    current.leads += 1;
    if (status === "RESERVED") current.reservations += 1;
    if (status === "CONTRACT_SIGNED" || status === "WON") {
      current.wonLeads += 1;
    }

    current.signedContracts += signedContracts.length;
    current.contractValue += signedContracts.reduce(
      (sum, contract) => sum + Number(contract.totalVolumeSar),
      0,
    );

    grouped.set(source, current);
  }

  const sources = Array.from(grouped.values())
    .map((metric) => ({
      ...metric,
      conversionRate:
        metric.leads > 0
          ? Number(
              (
                ((metric.reservations + metric.wonLeads) / metric.leads) *
                100
              ).toFixed(1),
            )
          : 0,
    }))
    .sort(
      (a, b) =>
        b.signedContracts - a.signedContracts ||
        b.wonLeads - a.wonLeads ||
        b.leads - a.leads,
    );

  return {
    totals: {
      leads: leads.length,
      convertedLeads: leads.filter((lead) =>
        SUCCESS_STATUSES.has(String(lead.status)),
      ).length,
      signedContracts: sources.reduce(
        (sum, source) => sum + source.signedContracts,
        0,
      ),
      contractValue: sources.reduce(
        (sum, source) => sum + source.contractValue,
        0,
      ),
    },
    sources,
    connections: connections.map((connection) => ({
      ...connection,
      updatedAt: connection.updatedAt.toISOString(),
    })),
  };
}
