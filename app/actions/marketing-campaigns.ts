"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { decryptText } from "@/lib/crypto";
import {
  assertCampaignDraft,
  CampaignDraft,
  CampaignCommand,
  MARKETING_PROVIDERS,
  MarketingProvider,
  MarketingProviderError,
} from "@/lib/marketing/campaign-contract";
import { executeCampaignCommand } from "@/lib/marketing/campaign-orchestrator";
import { registerProductionMarketingAdapters } from "@/lib/marketing/provider-adapter";

const CAMPAIGN_ROLES = [
  "ADMIN",
  "MARKETING",
  "SALES_MANAGER",
];

const CAMPAIGN_COMMANDS = [
  "PUBLISH",
  "PAUSE",
  "RESUME",
  "SYNC",
] as const;

function commandTypeIsValid(
  value: string,
): value is CampaignCommand["type"] {
  return CAMPAIGN_COMMANDS.includes(
    value as (typeof CAMPAIGN_COMMANDS)[number],
  );
}

export interface MarketingCampaignRow {
  id: string;
  name: string;
  objective: string;
  budgetKind: string;
  budgetAmount: number;
  currency: string;
  audience: unknown;
  creative: unknown;
  tracking: unknown;
  startAt: string | null;
  endAt: string | null;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  channels: Array<{
    id: string;
    provider: string;
    status: string;
    providerCampaignId: string | null;
    remoteUrl: string | null;
    lastErrorCode: string | null;
    lastSyncedAt: string | null;
    publishedAt: string | null;
    pausedAt: string | null;
  }>;
}

function providerIsValid(value: string): value is MarketingProvider {
  return MARKETING_PROVIDERS.includes(value as MarketingProvider);
}

function serializeCampaign(campaign: any): MarketingCampaignRow {
  return {
    id: campaign.id,
    name: campaign.name,
    objective: campaign.objective,
    budgetKind: campaign.budgetKind,
    budgetAmount: Number(campaign.budgetAmount),
    currency: campaign.currency,
    audience: campaign.audience,
    creative: campaign.creative,
    tracking: campaign.tracking,
    startAt: campaign.startAt?.toISOString() ?? null,
    endAt: campaign.endAt?.toISOString() ?? null,
    status: campaign.status,
    version: campaign.version,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    channels: campaign.channels.map((channel: any) => ({
      id: channel.id,
      provider: channel.provider,
      status: channel.status,
      providerCampaignId: channel.providerCampaignId,
      remoteUrl: channel.remoteUrl,
      lastErrorCode: channel.lastErrorCode,
      lastSyncedAt: channel.lastSyncedAt?.toISOString() ?? null,
      publishedAt: channel.publishedAt?.toISOString() ?? null,
      pausedAt: channel.pausedAt?.toISOString() ?? null,
    })),
  };
}

async function requireMarketingContext() {
  const session = await getSession();
  if (!session) throw new MarketingProviderError("UNAUTHORIZED");

  await assertServerActionRole(session, CAMPAIGN_ROLES);
  const tenant = await getActiveTenant();

  return {
    session,
    tenant,
  };
}

export async function listMarketingCampaignsAction(): Promise<{
  success: boolean;
  data?: MarketingCampaignRow[];
  error?: string;
}> {
  try {
    const { tenant } = await requireMarketingContext();

    const campaigns = await prisma.marketingCampaign.findMany({
      where: {
        tenantId: tenant.id,
      },
      include: {
        channels: {
          orderBy: {
            provider: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: campaigns.map(serializeCampaign),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof MarketingProviderError
          ? error.code
          : "MARKETING_CAMPAIGNS_LOAD_FAILED",
    };
  }
}

export async function createMarketingCampaignAction(input: {
  draft: CampaignDraft;
  providers: MarketingProvider[];
}): Promise<{
  success: boolean;
  data?: MarketingCampaignRow;
  error?: string;
}> {
  try {
    const { session, tenant } = await requireMarketingContext();

    assertCampaignDraft(input.draft);

    const providers = Array.from(new Set(input.providers));

    if (
      providers.length === 0 ||
      providers.some((provider) => !providerIsValid(provider))
    ) {
      throw new MarketingProviderError("CAMPAIGN_PROVIDER_REQUIRED");
    }

    const campaign = await prisma.$transaction(async (tx) => {
      const created = await tx.marketingCampaign.create({
        data: {
          tenantId: tenant.id,
          createdById: session.userId as string,
          name: input.draft.name.trim(),
          objective: input.draft.objective,
          budgetKind: input.draft.budget.kind,
          budgetAmount: new Prisma.Decimal(input.draft.budget.amount),
          currency: input.draft.budget.currency,
          audience: input.draft.audience as unknown as Prisma.InputJsonValue,
          creative: input.draft.creative as unknown as Prisma.InputJsonValue,
          tracking: input.draft.tracking
            ? (input.draft.tracking as unknown as Prisma.InputJsonValue)
            : undefined,
          startAt: input.draft.startAt
            ? new Date(input.draft.startAt)
            : null,
          endAt: input.draft.endAt
            ? new Date(input.draft.endAt)
            : null,
          status: "DRAFT",
          channels: {
            create: providers.map((provider) => ({
              tenantId: tenant.id,
              provider,
              status: "DRAFT",
              providerOptions: input.draft.providerOptions
                ? (input.draft.providerOptions as unknown as Prisma.InputJsonValue)
                : undefined,
            })),
          },
        },
        include: {
          channels: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: session.userId as string,
          action: "MARKETING_CAMPAIGN_CREATED",
          tableName: "marketing_campaigns",
          recordId: created.id,
          details: `Created campaign draft with ${providers.length} provider channel(s).`,
        },
      });

      return created;
    });

    revalidatePath("/operations/marketing");
    revalidatePath("/operations/campaigns");

    return {
      success: true,
      data: serializeCampaign(campaign),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof MarketingProviderError
          ? error.code
          : "MARKETING_CAMPAIGN_CREATE_FAILED",
    };
  }
}

function storedCampaignDraft(campaign: any): CampaignDraft {
  return {
    name: campaign.name,
    objective: campaign.objective,
    budget: {
      kind: campaign.budgetKind,
      amount: Number(campaign.budgetAmount),
      currency: campaign.currency,
    },
    audience: campaign.audience,
    creative: campaign.creative,
    tracking: campaign.tracking ?? undefined,
    startAt: campaign.startAt?.toISOString(),
    endAt: campaign.endAt?.toISOString(),
  } as CampaignDraft;
}

function commandForChannel(
  type: CampaignCommand["type"],
  campaign: any,
  providerCampaignId: string | null,
): CampaignCommand {
  if (type === "PUBLISH") {
    return {
      type: "PUBLISH",
      draft: storedCampaignDraft(campaign),
    };
  }

  if (!providerCampaignId) {
    throw new MarketingProviderError(
      "PROVIDER_CAMPAIGN_ID_REQUIRED",
    );
  }

  return {
    type,
    providerCampaignId,
  } as CampaignCommand;
}

async function refreshCampaignStatus(
  campaignId: string,
  tenantId: string,
): Promise<void> {
  const channels = await prisma.marketingCampaignChannel.findMany({
    where: {
      tenantId,
      campaignId,
    },
    select: {
      status: true,
    },
  });

  const statuses = channels.map((channel) => channel.status);

  let status = "DRAFT";

  if (statuses.some((value) => value === "ACTIVE")) {
    status = "ACTIVE";
  } else if (
    statuses.length > 0 &&
    statuses.every((value) => value === "PAUSED")
  ) {
    status = "PAUSED";
  } else if (
    statuses.some((value) =>
      ["FAILED", "CONNECTION_REQUIRED", "CONNECTOR_NOT_READY"].includes(value),
    )
  ) {
    status = "PARTIAL_FAILURE";
  } else if (
    statuses.some((value) => value === "PENDING_REVIEW")
  ) {
    status = "PENDING_REVIEW";
  }

  await prisma.marketingCampaign.update({
    where: {
      uq_marketing_campaign_tenant_id: {
        tenantId,
        id: campaignId,
      },
    },
    data: {
      status,
      version: {
        increment: 1,
      },
    },
  });
}

export async function executeMarketingCampaignCommandAction(input: {
  campaignId: string;
  provider: MarketingProvider;
  type: CampaignCommand["type"];
}): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  let tenantId = "";
  let channelId = "";

  try {
    const { session, tenant } = await requireMarketingContext();
    tenantId = tenant.id;

    if (!providerIsValid(input.provider)) {
      throw new MarketingProviderError("CAMPAIGN_PROVIDER_INVALID");
    }

    if (!commandTypeIsValid(input.type)) {
      throw new MarketingProviderError("CAMPAIGN_COMMAND_INVALID");
    }

    const channel = await prisma.marketingCampaignChannel.findFirst({
      where: {
        tenantId: tenant.id,
        campaignId: input.campaignId,
        provider: input.provider,
      },
      include: {
        campaign: true,
      },
    });

    if (!channel || channel.campaign.tenantId !== tenant.id) {
      throw new MarketingProviderError("CAMPAIGN_CHANNEL_NOT_FOUND");
    }

    channelId = channel.id;

    const connection = await prisma.platformConnection.findUnique({
      where: {
        tenantId_platform: {
          tenantId: tenant.id,
          platform: input.provider,
        },
      },
    });

    if (
      !connection ||
      !connection.accountId ||
      !connection.encryptedApiKey
    ) {
      await prisma.marketingCampaignChannel.update({
        where: {
          id: channel.id,
        },
        data: {
          status: "CONNECTION_REQUIRED",
          lastErrorCode: "MARKETING_CONNECTION_REQUIRED",
        },
      });

      await refreshCampaignStatus(channel.campaignId, tenant.id);

      throw new MarketingProviderError(
        "MARKETING_CONNECTION_REQUIRED",
        input.provider,
      );
    }

    const apiKey = decryptText(connection.encryptedApiKey);

    if (!apiKey) {
      throw new MarketingProviderError(
        "MARKETING_CREDENTIALS_INVALID",
        input.provider,
      );
    }

    registerProductionMarketingAdapters();

    const snapshot = await executeCampaignCommand(
      {
        tenantId: tenant.id,
        userId: session.userId as string,
        connectionId: connection.id,
        provider: input.provider,
        accountId: connection.accountId,
        credentials: {
          apiKey,
        },
      },
      commandForChannel(
        input.type,
        channel.campaign,
        channel.providerCampaignId,
      ),
    );

    await prisma.$transaction(async (tx) => {
      await tx.marketingCampaignChannel.update({
        where: {
          id: channel.id,
        },
        data: {
          connectionId: connection.id,
          providerCampaignId: snapshot.providerCampaignId,
          status: snapshot.status,
          remoteUrl: snapshot.remoteUrl ?? null,
          lastErrorCode: null,
          lastSyncedAt: new Date(snapshot.synchronizedAt),
          publishedAt:
            input.type === "PUBLISH" ? new Date() : channel.publishedAt,
          pausedAt:
            input.type === "PAUSE"
              ? new Date()
              : input.type === "RESUME"
                ? null
                : channel.pausedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: session.userId as string,
          action: `MARKETING_CAMPAIGN_${input.type}`,
          tableName: "marketing_campaign_channels",
          recordId: channel.id,
          details: `${input.type} command executed for ${input.provider}.`,
        },
      });
    });

    await refreshCampaignStatus(channel.campaignId, tenant.id);

    revalidatePath("/operations/marketing");
    revalidatePath("/operations/campaigns");

    return {
      success: true,
      status: snapshot.status,
    };
  } catch (error) {
    const code =
      error instanceof MarketingProviderError
        ? error.code
        : "MARKETING_CAMPAIGN_COMMAND_FAILED";

    if (
      tenantId &&
      channelId &&
      !["MARKETING_CONNECTION_REQUIRED"].includes(code)
    ) {
      await prisma.marketingCampaignChannel
        .update({
          where: {
            id: channelId,
          },
          data: {
            status:
              code === "MARKETING_PROVIDER_NOT_REGISTERED"
                ? "CONNECTOR_NOT_READY"
                : "FAILED",
            lastErrorCode: code,
          },
        })
        .catch(() => undefined);
    }

    return {
      success: false,
      error: code,
    };
  }
}
