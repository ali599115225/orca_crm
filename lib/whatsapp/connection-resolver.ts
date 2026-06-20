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
