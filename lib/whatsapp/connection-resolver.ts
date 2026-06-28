import "server-only";

import { prisma } from "@/lib/prisma";
import { decryptToken } from "./credential-service";

export type WhatsAppConnectionSource =
  | "tenant-connection"
  | "orca-test-bridge";

export interface ResolvedConnection {
  source: WhatsAppConnectionSource;
  tenantId: string;
  connectionId: string | null;
  phoneNumberId: string;
  wabaId: string | null;
  accessToken: string;
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

  if (!phone) {
    return null;
  }

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

export interface ConnectionStatusResult {
  configured: boolean;
  source: WhatsAppConnectionSource | "none";
  status: "connected" | "test-mode" | "disconnected";
  wabaId?: string | null;
  phoneNumberId?: string | null;
  activeSince?: Date | null;
}

export async function getConnectionStatus(
  tenantId: string,
): Promise<ConnectionStatusResult> {
  const connection = await prisma.whatsAppConnection.findUnique({
    where: { tenantId },
    select: { status: true, wabaId: true, activeSince: true },
  });

  if (connection?.status === "ACTIVE") {
    return {
      configured: true,
      source: "tenant-connection",
      status: "connected",
      wabaId: connection.wabaId,
      activeSince: connection.activeSince,
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
        source: "orca-test-bridge",
        status: "test-mode",
        wabaId: bridgeEnv.bridgeWabaId,
        phoneNumberId: bridgeEnv.bridgePhoneNumberId,
      };
    }
  }

  return { configured: false, source: "none", status: "disconnected" };
}

export async function resolveConnection(
  tenantId: string,
): Promise<ResolvedConnection> {
  await assertWhatsAppMessagingEnabled(tenantId);

  const connection = await prisma.whatsAppConnection.findUnique({
    where: { tenantId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      wabaId: true,
    },
  });

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
      source: "tenant-connection",
      tenantId,
      connectionId: connection.id,
      phoneNumberId: phone.phoneNumberId,
      wabaId: phone.wabaId ?? connection.wabaId,
      accessToken: decryptToken(credential),
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
        source: "orca-test-bridge",
        tenantId,
        connectionId: null,
        phoneNumberId: bridgeEnv.bridgePhoneNumberId as string,
        wabaId: bridgeEnv.bridgeWabaId,
        accessToken: bridgeEnv.bridgeAccessToken as string,
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