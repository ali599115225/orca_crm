// lib/whatsapp/credential-service.ts — SERVER-ONLY
import "server-only";

export function encryptToken(plainToken: string): { encryptedValue: string; iv: string; authTag: string } {
  const crypto = require("crypto");
  const key = Buffer.from(process.env.ENCRYPTION_KEY || "orca-dev-key-32chars!!", "utf8");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plainToken, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return {
    encryptedValue: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export function getTokenFingerprint(plainToken: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(plainToken).digest("hex").substring(0, 16);
}
