"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { encryptText } from "@/lib/crypto";
import { assertServerActionRole } from "@/lib/api-auth-guard";

const ADVERTISING_ROLES = [
  "ADMIN",
  "owner",
  "MARKETING",
  "SALES_MANAGER",
];

const STANDARD_PLATFORMS = [
  "GOOGLE",
  "META",
  "TIKTOK",
  "SNAPCHAT",
  "TWITTER",
  "LINKEDIN",
] as const;

const ALL_PLATFORMS = [
  ...STANDARD_PLATFORMS,
  "CUSTOM_ADVERTISING",
] as const;

type StandardPlatform = (typeof STANDARD_PLATFORMS)[number];
type ConnectionMode = "API" | "OAUTH" | "EXTERNAL_LINK";

type ProviderConfig = {
  authHeaderName?: string;
  authScheme?: string;
  createCampaignPath?: string;
  pauseCampaignPath?: string;
  resumeCampaignPath?: string;
  syncCampaignPath?: string;
};

function clean(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function requireHttpsUrl(value: string, code: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(code);
  }

  if (url.protocol !== "https:") {
    throw new Error(code);
  }

  return url.toString().replace(/\/$/, "");
}

function cleanPath(value: unknown): string {
  const path = clean(value, 240);
  if (!path) return "";

  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("INVALID_PROVIDER_PATH");
  }

  return path;
}

async function getAuthorizedContext() {
  const session = await getSession();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  await assertServerActionRole(session, ADVERTISING_ROLES);
  const tenant = await getActiveTenant();

  return {
    session,
    tenant,
  };
}

export async function getAdvertisingConnectionsAction() {
  try {
    const { tenant } = await getAuthorizedContext();

    const rows = await prisma.platformConnection.findMany({
      where: {
        tenantId: tenant.id,
        platform: {
          in: [...ALL_PLATFORMS],
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        platform: row.platform,
        accountId: row.accountId,
        displayName: row.displayName,
        connectionMode: row.connectionMode,
        baseUrl: row.baseUrl,
        providerConfig:
          row.providerConfig && typeof row.providerConfig === "object"
            ? row.providerConfig
            : {},
        hasApiKey: Boolean(row.encryptedApiKey),
        hasCredentials: Boolean(row.encryptedCredentials),
        status: row.status,
        leadTone: row.leadTone,
        autoWelcomeMsg: row.autoWelcomeMsg,
        lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
        lastError: row.lastError,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "ADVERTISING_CONNECTIONS_LOAD_FAILED",
    };
  }
}

export async function saveStandardAdvertisingConnectionAction(input: {
  platform: StandardPlatform;
  accountId: string;
  apiKey?: string;
  leadTone?: string;
  autoWelcomeMsg?: string;
}) {
  try {
    const { tenant, session } = await getAuthorizedContext();

    if (!STANDARD_PLATFORMS.includes(input.platform)) {
      throw new Error("INVALID_ADVERTISING_PLATFORM");
    }

    const accountId = clean(input.accountId, 160);
    if (!accountId) {
      throw new Error("ACCOUNT_ID_REQUIRED");
    }

    const existing = await prisma.platformConnection.findUnique({
      where: {
        tenantId_platform: {
          tenantId: tenant.id,
          platform: input.platform,
        },
      },
    });

    const suppliedKey = clean(input.apiKey, 8000);
    const encryptedApiKey = suppliedKey
      ? encryptText(suppliedKey)
      : existing?.encryptedApiKey ?? null;

    if (!encryptedApiKey) {
      throw new Error("ADVERTISING_CREDENTIAL_REQUIRED");
    }

    const connection = await prisma.platformConnection.upsert({
      where: {
        tenantId_platform: {
          tenantId: tenant.id,
          platform: input.platform,
        },
      },
      create: {
        tenantId: tenant.id,
        platform: input.platform,
        accountId,
        encryptedApiKey,
        connectionMode: input.platform === "TIKTOK" ? "OAUTH" : "API",
        status: "CONFIGURED",
        leadTone: clean(input.leadTone, 40) || "PROFESSIONAL",
        autoWelcomeMsg: clean(input.autoWelcomeMsg, 4000),
      },
      update: {
        accountId,
        encryptedApiKey,
        leadTone: clean(input.leadTone, 40) || "PROFESSIONAL",
        autoWelcomeMsg: clean(input.autoWelcomeMsg, 4000),
        status:
          existing?.status === "CONNECTED"
            ? "CONNECTED"
            : "CONFIGURED",
        lastError: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: session.userId as string,
        action: "ADVERTISING_PLATFORM_CONFIG_UPDATED",
        tableName: "platform_connections",
        recordId: connection.id,
        details: `Advertising platform configuration updated: ${input.platform}.`,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "ADVERTISING_CONNECTION_SAVE_FAILED",
    };
  }
}

export async function saveCustomAdvertisingProviderAction(input: {
  displayName: string;
  accountId: string;
  connectionMode: ConnectionMode;
  baseUrl: string;
  credential?: string;
  authHeaderName?: string;
  authScheme?: string;
  createCampaignPath?: string;
  pauseCampaignPath?: string;
  resumeCampaignPath?: string;
  syncCampaignPath?: string;
}) {
  try {
    const { tenant, session } = await getAuthorizedContext();

    const displayName = clean(input.displayName, 100);
    const accountId = clean(input.accountId, 160);
    const connectionMode = clean(input.connectionMode, 30) as ConnectionMode;

    if (displayName.length < 2) {
      throw new Error("PROVIDER_NAME_REQUIRED");
    }

    if (!accountId) {
      throw new Error("ACCOUNT_ID_REQUIRED");
    }

    if (!["API", "OAUTH", "EXTERNAL_LINK"].includes(connectionMode)) {
      throw new Error("INVALID_CONNECTION_MODE");
    }

    const baseUrl = requireHttpsUrl(
      clean(input.baseUrl, 500),
      "VALID_HTTPS_BASE_URL_REQUIRED",
    );

    const existing = await prisma.platformConnection.findUnique({
      where: {
        tenantId_platform: {
          tenantId: tenant.id,
          platform: "CUSTOM_ADVERTISING",
        },
      },
    });

    const credential = clean(input.credential, 12000);
    const encryptedCredentials = credential
      ? encryptText(
          JSON.stringify({
            credential,
          }),
        )
      : existing?.encryptedCredentials ?? null;

    if (connectionMode !== "EXTERNAL_LINK" && !encryptedCredentials) {
      throw new Error("ADVERTISING_CREDENTIAL_REQUIRED");
    }

    const providerConfig: ProviderConfig =
      connectionMode === "EXTERNAL_LINK"
        ? {}
        : {
            authHeaderName:
              clean(input.authHeaderName, 100) || "Authorization",
            authScheme: clean(input.authScheme, 60) || "Bearer",
            createCampaignPath: cleanPath(input.createCampaignPath),
            pauseCampaignPath: cleanPath(input.pauseCampaignPath),
            resumeCampaignPath: cleanPath(input.resumeCampaignPath),
            syncCampaignPath: cleanPath(input.syncCampaignPath),
          };

    if (
      connectionMode !== "EXTERNAL_LINK" &&
      (!providerConfig.createCampaignPath ||
        !providerConfig.pauseCampaignPath ||
        !providerConfig.resumeCampaignPath ||
        !providerConfig.syncCampaignPath)
    ) {
      throw new Error("PROVIDER_OPERATION_PATHS_REQUIRED");
    }

    const connection = await prisma.platformConnection.upsert({
      where: {
        tenantId_platform: {
          tenantId: tenant.id,
          platform: "CUSTOM_ADVERTISING",
        },
      },
      create: {
        tenantId: tenant.id,
        platform: "CUSTOM_ADVERTISING",
        displayName,
        accountId,
        connectionMode,
        baseUrl,
        encryptedCredentials,
        providerConfig: providerConfig as Prisma.InputJsonValue,
        status: "CONFIGURED",
        leadTone: "PROFESSIONAL",
        autoWelcomeMsg: "",
      },
      update: {
        displayName,
        accountId,
        connectionMode,
        baseUrl,
        encryptedCredentials,
        providerConfig: providerConfig as Prisma.InputJsonValue,
        status: "CONFIGURED",
        lastError: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: session.userId as string,
        action: "CUSTOM_ADVERTISING_PROVIDER_CONFIG_UPDATED",
        tableName: "platform_connections",
        recordId: connection.id,
        details:
          "Custom advertising provider configuration updated without external connection simulation.",
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "CUSTOM_ADVERTISING_PROVIDER_SAVE_FAILED",
    };
  }
}
