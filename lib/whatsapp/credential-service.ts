import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { WhatsAppCredential } from "@prisma/client";

const CREDENTIAL_ALGORITHM = "AES-256-GCM";
const CREDENTIAL_KEY_VERSION = 1;
const GCM_IV_BYTES = 12;
const GCM_AUTH_TAG_BYTES = 16;

function getCredentialKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY?.trim();

  if (!secret) {
    throw new Error("WHATSAPP_CREDENTIAL_KEY_UNAVAILABLE");
  }

  return createHash("sha256").update(secret, "utf8").digest();
}

function decodeHex(value: string, expectedBytes: number, field: string): Buffer {
  if (
    !value ||
    value.length !== expectedBytes * 2 ||
    !/^[0-9a-f]+$/i.test(value)
  ) {
    throw new Error(`WHATSAPP_CREDENTIAL_INVALID_${field}`);
  }

  return Buffer.from(value, "hex");
}

export interface EncryptedWhatsAppToken {
  encryptedValue: string;
  iv: string;
  authTag: string;
  algorithm: typeof CREDENTIAL_ALGORITHM;
  keyVersion: typeof CREDENTIAL_KEY_VERSION;
}

export function encryptToken(plainToken: string): EncryptedWhatsAppToken {
  const token = plainToken.trim();

  if (!token) {
    throw new Error("WHATSAPP_CREDENTIAL_EMPTY_TOKEN");
  }

  const iv = randomBytes(GCM_IV_BYTES);
  const cipher = createCipheriv(
    "aes-256-gcm",
    getCredentialKey(),
    iv,
    { authTagLength: GCM_AUTH_TAG_BYTES },
  );

  const encryptedValue = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]).toString("hex");

  return {
    encryptedValue,
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
    algorithm: CREDENTIAL_ALGORITHM,
    keyVersion: CREDENTIAL_KEY_VERSION,
  };
}

export function decryptToken(
  credential: Pick<
    WhatsAppCredential,
    "encryptedValue" | "iv" | "authTag" | "algorithm" | "keyVersion"
  >,
): string {
  if (credential.algorithm !== CREDENTIAL_ALGORITHM) {
    throw new Error("WHATSAPP_CREDENTIAL_UNSUPPORTED_ALGORITHM");
  }

  if (credential.keyVersion !== CREDENTIAL_KEY_VERSION) {
    throw new Error("WHATSAPP_CREDENTIAL_UNSUPPORTED_KEY_VERSION");
  }

  const iv = decodeHex(credential.iv, GCM_IV_BYTES, "IV");
  const authTag = decodeHex(
    credential.authTag,
    GCM_AUTH_TAG_BYTES,
    "AUTH_TAG",
  );

  if (
    !credential.encryptedValue ||
    credential.encryptedValue.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(credential.encryptedValue)
  ) {
    throw new Error("WHATSAPP_CREDENTIAL_INVALID_CIPHERTEXT");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getCredentialKey(),
      iv,
      { authTagLength: GCM_AUTH_TAG_BYTES },
    );

    decipher.setAuthTag(authTag);

    const plainToken = Buffer.concat([
      decipher.update(Buffer.from(credential.encryptedValue, "hex")),
      decipher.final(),
    ])
      .toString("utf8")
      .trim();

    if (!plainToken) {
      throw new Error("WHATSAPP_CREDENTIAL_EMPTY_TOKEN");
    }

    return plainToken;
  } catch {
    throw new Error("WHATSAPP_CREDENTIAL_DECRYPT_FAILED");
  }
}

export function getTokenFingerprint(plainToken: string): string {
  const token = plainToken.trim();

  if (!token) {
    throw new Error("WHATSAPP_CREDENTIAL_EMPTY_TOKEN");
  }

  return createHash("sha256")
    .update(token, "utf8")
    .digest("hex")
    .substring(0, 16);
}
