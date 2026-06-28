import "server-only";

import { prisma } from "@/lib/prisma";
import { getConnectionStatus } from "@/lib/whatsapp/connection-resolver";

/**
 * Read-only WhatsApp status adapter for Settings > Integrations & Compliance.
 *
 * This is the ONLY place that reads WhatsApp's connection state for that
 * surface — it never writes, never sends/receives messages, and never
 * duplicates the WhatsApp connect flow. It only queries the existing
 * WhatsAppConnection row and the existing connection-resolver
 * (lib/whatsapp/connection-resolver.ts, untouched).
 *
 * The bucketed key returned by getWhatsAppIntegrationStatusKey() is the only
 * value safe to forward toward a client boundary — translate it through the
 * existing lib/display/uiAliases.ts "integrationStatus" group. The raw
 * WhatsAppConnectionStatus enum value must never cross to the client; it is
 * intentionally not returned by this module at all.
 */
export type WhatsAppIntegrationStatusKey =
  | "CONNECTED"
  | "DISCONNECTED"
  | "PENDING"
  | "FAILED"
  | "SUSPENDED"
  | "TEST_MODE"
  | "NOT_CONFIGURED"
  | "REAUTH_REQUIRED"
  | "DISCONNECTING";

function bucketNativeStatus(
  nativeStatus:
    | "DISCONNECTED"
    | "SIGNUP_PENDING"
    | "TOKEN_EXCHANGED"
    | "ASSETS_VERIFIED"
    | "WEBHOOK_SUBSCRIBED"
    | "ACTIVE"
    | "REAUTH_REQUIRED"
    | "SUSPENDED"
    | "DISCONNECTING"
    | "DISCONNECT_PENDING"
    | "FAILED",
): WhatsAppIntegrationStatusKey {
  switch (nativeStatus) {
    case "ACTIVE":
      return "CONNECTED";
    case "REAUTH_REQUIRED":
      return "REAUTH_REQUIRED";
    case "SUSPENDED":
      return "SUSPENDED";
    case "DISCONNECTING":
    case "DISCONNECT_PENDING":
      return "DISCONNECTING";
    case "SIGNUP_PENDING":
    case "TOKEN_EXCHANGED":
    case "ASSETS_VERIFIED":
    case "WEBHOOK_SUBSCRIBED":
      return "PENDING";
    case "FAILED":
      return "FAILED";
    case "DISCONNECTED":
    default:
      return "DISCONNECTED";
  }
}

/**
 * Bucketed, client-safe status key. No raw enum value, no credential, no
 * token ever leaves this function.
 */
export async function getWhatsAppIntegrationStatusKey(
  tenantId: string,
): Promise<WhatsAppIntegrationStatusKey> {
  const connection = await prisma.whatsAppConnection.findUnique({
    where: { tenantId },
    select: { status: true },
  });

  const bridge = await getConnectionStatus(tenantId);

  if (bridge.source === "orca-test-bridge" && bridge.status === "test-mode") {
    return "TEST_MODE";
  }

  if (connection) {
    return bucketNativeStatus(connection.status);
  }

  return "NOT_CONFIGURED";
}
