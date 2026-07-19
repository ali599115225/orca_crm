import "server-only";

import { prisma } from "@/lib/prisma";
import { decryptProviderCredentials } from "@/lib/revenue-integrity/trust-gates";
import { decryptToken } from "./credential-service";

export type WhatsAppProvider = "META" | "DIALOG360";

export type WhatsAppConnectionSource =
  | "tenant-connection"
  | "orca-test-bridge"
  | "360dialog";

export interface ResolvedConnection {
  provider: WhatsAppProvider;
  source: WhatsAppConnectionSource;
  tenantId: string;
  connectionId: string | null;
  phoneNumberId: string;
  wabaId: string | null;
  accessToken: string;
  apiBaseUrl: string;
}

export type ResolveErrorCode =
  | "WHATSAPP_NOT_CONNECTED"
  | "WHATSAPP_MESSAGING_DISABLED"
  | "WHATSAPP_NO_CREDENTIAL"
  | "WHATSAPP_NO_PHONE";

export class WhatsAppResolveError extends Error {
  constructor(public readonly code: ResolveErrorCode) {
    super(code);
    this.name = "WhatsAppResolveError";
  }
}

export interface WhatsAppControls {
  tenantExists: boolean;
  tenantActive: boolean;
  platformMessagingDisabled: boolean;
  platformAutomationDisabled: boolean;
  tenantMessagingDisabled: boolean;
  tenantAutomationDisabled: boolean;
  messagingEnabled: boolean;
  automationEnabled: boolean;
}

export async function getWhatsAppControls(
  tenantId: string,
): Promise<WhatsAppControls> {
  const [tenant, platformSettings] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        isActive: true,
        messagingDisabled: true,
        automationDisabled: true,
      },
    }),
    prisma.whatsAppPlatformSettings.findUnique({
      where: { singletonKey: "global" },
      select: {
        whatsappMessagingDisabled: true,
        whatsappAutomationDisabled: true,
      },
    }),
  ]);

  const tenantExists = Boolean(tenant);
  const tenantActive = Boolean(tenant?.isActive);
  const platformMessagingDisabled =
    platformSettings?.whatsappMessagingDisabled ?? false;
  const platformAutomationDisabled =
    platformSettings?.whatsappAutomationDisabled ?? false;
  const tenantMessagingDisabled = tenant?.messagingDisabled ?? true;
  const tenantAutomationDisabled = tenant?.automationDisabled ?? true;

  const messagingEnabled =
    tenantExists &&
    tenantActive &&
    !platformMessagingDisabled &&
    !tenantMessagingDisabled;

  const automationEnabled =
    messagingEnabled &&
    !platformAutomationDisabled &&
    !tenantAutomationDisabled;

  return {
    tenantExists,
    tenantActive,
    platformMessagingDisabled,
    platformAutomationDisabled,
    tenantMessagingDisabled,
    tenantAutomationDisabled,
    messagingEnabled,
    automationEnabled,
  };
}

export async function assertWhatsAppMessagingEnabled(
  tenantId: string,
): Promise<void> {
  const controls = await getWhatsAppControls(tenantId);

  if (!controls.tenantExists || !controls.tenantActive) {
    throw new WhatsAppResolveError("WHATSAPP_NOT_CONNECTED");
  }

  if (!controls.messagingEnabled) {
    throw new WhatsAppResolveError("WHATSAPP_MESSAGING_DISABLED");
  }
}

async function resolveTestBridgePhone(
  bridgeTenantId: string,
  bridgePhoneNumberId: string,
  bridgeWabaId: string | null,
) {
  const phone = await prisma.whatsAppPhoneNumber.findFirst({
    where: {
      tenantId: bridgeTenantId,
      phoneNumberId: bridgePhoneNumberId,
      isActive: true,
    },
    select: { wabaId: true, businessAccountId: true },
  });

  if (!phone) return null;

  const phoneWaba = phone.wabaId || phone.businessAccountId || null;
  if (bridgeWabaId && phoneWaba && phoneWaba !== bridgeWabaId) {
    return null;
  }

  return phone;
}

function readTestBridgeEnv(tenantId: string) {
  const bridgeTenantId =
    process.env.ORCA_WHATSAPP_TEST_TENANT_ID?.trim();
  const bridgeAccessToken =
    process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const bridgePhoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const bridgeWabaId =
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || null;

  const eligible =
    process.env.NODE_ENV !== "production" &&
    Boolean(bridgeTenantId) &&
    tenantId === bridgeTenantId &&
    Boolean(bridgeAccessToken) &&
    Boolean(bridgePhoneNumberId);

  return {
    eligible,
    bridgeTenantId,
    bridgeAccessToken,
    bridgePhoneNumberId,
    bridgeWabaId,
  };
}

type Dialog360ConnectionRow = {
  id: string;
  status: string;
  baseUrl: string | null;
  encryptedCredentials: string;
  isDefault: boolean;
  lastSuccessAt: Date | null;
};

type Dialog360Runtime = {
  connectionId: string;
  apiKey: string;
  displayPhoneNumber: string;
  baseUrl: string;
  isDefault: boolean;
  lastSuccessAt: Date | null;
};

async function loadDialog360Connection(
  tenantId: string,
): Promise<Dialog360ConnectionRow | null> {
  return prisma.revenueProviderConnection.findUnique({
    where: {
      tenantId_provider: {
        tenantId,
        provider: "DIALOG360",
      },
    },
    select: {
      id: true,
      status: true,
      baseUrl: true,
      encryptedCredentials: true,
      isDefault: true,
      lastSuccessAt: true,
    },
  });
}

function resolveDialog360Runtime(
  connection: Dialog360ConnectionRow | null,
): Dialog360Runtime | null {
  if (!connection || connection.status !== "CONNECTED") {
    return null;
  }

  const credentials = decryptProviderCredentials(
    connection.encryptedCredentials,
  );
  const apiKey = String(credentials.apiKey || "").trim();
  const displayPhoneNumber = String(
    credentials.displayPhoneNumber || "",
  ).replace(/\D/g, "");

  if (!apiKey) {
    throw new WhatsAppResolveError("WHATSAPP_NO_CREDENTIAL");
  }
  if (!displayPhoneNumber) {
    throw new WhatsAppResolveError("WHATSAPP_NO_PHONE");
  }

  const rawBaseUrl = String(
    connection.baseUrl || "https://waba-v2.360dialog.io",
  ).trim();

  let baseUrl: string;
  try {
    const parsed = new URL(rawBaseUrl);
    const allowedHosts = new Set([
      "waba-v2.360dialog.io",
      "waba-sandbox.360dialog.io",
    ]);

    if (
      parsed.protocol !== "https:" ||
      !allowedHosts.has(parsed.hostname.toLowerCase())
    ) {
      throw new Error("DIALOG360_BASE_URL_NOT_ALLOWED");
    }

    baseUrl = `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    throw new WhatsAppResolveError("WHATSAPP_NOT_CONNECTED");
  }

  return {
    connectionId: connection.id,
    apiKey,
    displayPhoneNumber,
    baseUrl,
    isDefault: connection.isDefault,
    lastSuccessAt: connection.lastSuccessAt,
  };
}

export interface ConnectionStatusResult {
  configured: boolean;
  provider: WhatsAppProvider | "none";
  source: WhatsAppConnectionSource | "none";
  status: "connected" | "test-mode" | "disconnected";
  wabaId?: string | null;
  phoneNumberId?: string | null;
  activeSince?: Date | null;
}

export async function getConnectionStatus(
  tenantId: string,
): Promise<ConnectionStatusResult> {
  const [metaConnection, dialogConnection] = await Promise.all([
    prisma.whatsAppConnection.findUnique({
      where: { tenantId },
      select: { status: true, wabaId: true, activeSince: true },
    }),
    loadDialog360Connection(tenantId),
  ]);

  const dialogConnected =
    dialogConnection?.status === "CONNECTED";

  if (dialogConnected && dialogConnection?.isDefault) {
    return {
      configured: true,
      provider: "DIALOG360",
      source: "360dialog",
      status: "connected",
      activeSince: dialogConnection.lastSuccessAt,
    };
  }

  if (metaConnection?.status === "ACTIVE") {
    return {
      configured: true,
      provider: "META",
      source: "tenant-connection",
      status: "connected",
      wabaId: metaConnection.wabaId,
      activeSince: metaConnection.activeSince,
    };
  }

  if (dialogConnected) {
    return {
      configured: true,
      provider: "DIALOG360",
      source: "360dialog",
      status: "connected",
      activeSince: dialogConnection.lastSuccessAt,
    };
  }

  const bridgeEnv = readTestBridgeEnv(tenantId);
  if (bridgeEnv.eligible) {
    const phone = await resolveTestBridgePhone(
      bridgeEnv.bridgeTenantId as string,
      bridgeEnv.bridgePhoneNumberId as string,
      bridgeEnv.bridgeWabaId,
    );

    if (phone) {
      return {
        configured: true,
        provider: "META",
        source: "orca-test-bridge",
        status: "test-mode",
        wabaId: bridgeEnv.bridgeWabaId,
        phoneNumberId: bridgeEnv.bridgePhoneNumberId,
      };
    }
  }

  return {
    configured: false,
    provider: "none",
    source: "none",
    status: "disconnected",
  };
}

export async function resolveConnection(
  tenantId: string,
): Promise<ResolvedConnection> {
  await assertWhatsAppMessagingEnabled(tenantId);

  const [connection, dialogConnection] = await Promise.all([
    prisma.whatsAppConnection.findUnique({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        wabaId: true,
      },
    }),
    loadDialog360Connection(tenantId),
  ]);

  const defaultDialog360 =
    dialogConnection?.status === "CONNECTED" &&
    dialogConnection.isDefault
      ? resolveDialog360Runtime(dialogConnection)
      : null;

  if (defaultDialog360) {
    return {
      provider: "DIALOG360",
      source: "360dialog",
      tenantId,
      connectionId: defaultDialog360.connectionId,
      phoneNumberId: defaultDialog360.displayPhoneNumber,
      wabaId: null,
      accessToken: defaultDialog360.apiKey,
      apiBaseUrl: defaultDialog360.baseUrl,
    };
  }

  if (connection?.status === "SUSPENDED") {
    throw new WhatsAppResolveError("WHATSAPP_MESSAGING_DISABLED");
  }

  if (connection?.status === "ACTIVE") {
    const [credential, phone] = await Promise.all([
      prisma.whatsAppCredential.findFirst({
        where: {
          connectionId: connection.id,
          isActive: true,
          revokedAt: null,
        },
        orderBy: { issuedAt: "desc" },
      }),
      prisma.whatsAppPhoneNumber.findFirst({
        where: {
          tenantId,
          connectionId: connection.id,
          isActive: true,
          isPrimary: true,
        },
        orderBy: { createdAt: "asc" },
        select: {
          phoneNumberId: true,
          wabaId: true,
        },
      }),
    ]);

    if (!credential) {
      throw new WhatsAppResolveError("WHATSAPP_NO_CREDENTIAL");
    }
    if (!phone) {
      throw new WhatsAppResolveError("WHATSAPP_NO_PHONE");
    }

    return {
      provider: "META",
      source: "tenant-connection",
      tenantId,
      connectionId: connection.id,
      phoneNumberId: phone.phoneNumberId,
      wabaId: phone.wabaId ?? connection.wabaId,
      accessToken: decryptToken(credential),
      apiBaseUrl: "",
    };
  }

  const fallbackDialog360 =
    dialogConnection?.status === "CONNECTED"
      ? resolveDialog360Runtime(dialogConnection)
      : null;

  if (fallbackDialog360) {
    return {
      provider: "DIALOG360",
      source: "360dialog",
      tenantId,
      connectionId: fallbackDialog360.connectionId,
      phoneNumberId: fallbackDialog360.displayPhoneNumber,
      wabaId: null,
      accessToken: fallbackDialog360.apiKey,
      apiBaseUrl: fallbackDialog360.baseUrl,
    };
  }

  const bridgeEnv = readTestBridgeEnv(tenantId);
  if (bridgeEnv.eligible) {
    const phone = await resolveTestBridgePhone(
      bridgeEnv.bridgeTenantId as string,
      bridgeEnv.bridgePhoneNumberId as string,
      bridgeEnv.bridgeWabaId,
    );

    if (phone) {
      return {
        provider: "META",
        source: "orca-test-bridge",
        tenantId,
        connectionId: null,
        phoneNumberId: bridgeEnv.bridgePhoneNumberId as string,
        wabaId: bridgeEnv.bridgeWabaId,
        accessToken: bridgeEnv.bridgeAccessToken as string,
        apiBaseUrl: "",
      };
    }
  }

  throw new WhatsAppResolveError("WHATSAPP_NOT_CONNECTED");
}

export async function isMessagingEnabled(
  tenantId: string,
): Promise<boolean> {
  const controls = await getWhatsAppControls(tenantId);
  return controls.messagingEnabled;
}

export async function isAutomationEnabled(
  tenantId: string,
): Promise<boolean> {
  const controls = await getWhatsAppControls(tenantId);
  return controls.automationEnabled;
}
