// lib/whatsapp/connection-resolver.ts — SERVER-ONLY
import "server-only";
import { prisma } from "@/lib/prisma";
import type { WhatsAppConnection, WhatsAppCredential, WhatsAppPhoneNumber } from "@prisma/client";

export interface ResolvedConnection {
  connection: WhatsAppConnection;
  credential: WhatsAppCredential;
  phone: WhatsAppPhoneNumber;
  accessToken: string;
}

export type ResolveErrorCode =
  | "WHATSAPP_NOT_CONNECTED"
  | "WHATSAPP_MESSAGING_DISABLED"
  | "WHATSAPP_NO_CREDENTIAL"
  | "WHATSAPP_NO_PHONE";

export class WhatsAppResolveError extends Error {
  constructor(public code: ResolveErrorCode) {
    super(code);
  }
}

function getDecryptedToken(credential: WhatsAppCredential): string {
  const crypto = require("crypto");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.ENCRYPTION_KEY || "orca-dev-key-32chars!!", "utf8"),
    Buffer.from(credential.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(credential.authTag, "hex"));
  let decrypted = decipher.update(credential.encryptedValue, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function resolveConnection(
  tenantId: string
): Promise<ResolvedConnection> {
  const connection = await prisma.whatsAppConnection.findUnique({
    where: { tenantId },
  });

  if (!connection || !["ACTIVE", "SUSPENDED"].includes(connection.status)) {
    // ORCA bridge: only the platform owner tenant can use global env vars
    const orcaBridgeTenantId = process.env.ORCA_WHATSAPP_TEST_TENANT_ID;
    const globalToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const globalPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (orcaBridgeTenantId && tenantId === orcaBridgeTenantId && globalToken && globalPhoneId) {
      const phone = await prisma.whatsAppPhoneNumber.findFirst({
        where: { tenantId, isActive: true },
      });
      return {
        connection: { id: "orca-bridge", tenantId, status: "ACTIVE", wabaId: null, activeSince: null, disconnectedAt: null, lastHealthCheck: null, createdAt: new Date(), updatedAt: new Date() } as any,
        credential: { id: "orca-bridge", connectionId: "orca-bridge", encryptedValue: globalToken, iv: "00000000000000000000000000000000", authTag: "00000000000000000000000000000000", algorithm: "PLAINTEXT-BRIDGE", keyVersion: 0, tokenFingerprint: "bridge", isActive: true, issuedAt: new Date(), lastValidatedAt: null, revokedAt: null, rotatedFrom: null, createdAt: new Date() } as any,
        phone: phone || { id: "orca-bridge", tenantId, connectionId: "orca-bridge", phoneNumberId: globalPhoneId, displayPhoneNumber: null, wabaId: null, certificate: null, businessAccountId: null, isActive: true, isPrimary: true, verifiedName: null, qualityRating: null, createdAt: new Date(), updatedAt: new Date() } as any,
        accessToken: globalToken,
      };
    }
    throw new WhatsAppResolveError("WHATSAPP_NOT_CONNECTED");
  }

  if (connection.status === "SUSPENDED") {
    throw new WhatsAppResolveError("WHATSAPP_MESSAGING_DISABLED");
  }

  const credential = await prisma.whatsAppCredential.findFirst({
    where: { connectionId: connection.id, isActive: true },
    orderBy: { issuedAt: "desc" },
  });

  if (!credential) {
    throw new WhatsAppResolveError("WHATSAPP_NO_CREDENTIAL");
  }

  const phone = await prisma.whatsAppPhoneNumber.findFirst({
    where: { connectionId: connection.id, isPrimary: true, isActive: true },
  });

  if (!phone) {
    throw new WhatsAppResolveError("WHATSAPP_NO_PHONE");
  }

  const accessToken = getDecryptedToken(credential);

  return { connection, credential, phone, accessToken };
}

export async function isMessagingEnabled(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return false;
  if (tenant.messagingDisabled) return false;
  const connection = await prisma.whatsAppConnection.findUnique({
    where: { tenantId },
  });
  if (!connection || connection.status !== "ACTIVE") return false;
  return true;
}

export async function isAutomationEnabled(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return false;
  if (tenant.automationDisabled) return false;
  return true;
}
