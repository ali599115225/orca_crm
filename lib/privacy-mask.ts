// lib/privacy-mask.ts
// Privacy masking utilities — no external dependencies
import crypto from "crypto";

const SHORT_HASH_ALGO = "sha256";

export function maskPhone(value: string | null | undefined): string {
  if (!value) return "[masked-phone]";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "[masked-phone]";
  const last4 = digits.slice(-4);
  return `${"*".repeat(digits.length - 4)}${last4}`;
}

export function maskEmail(value: string | null | undefined): string {
  if (!value) return "[masked-email]";
  const atIndex = value.indexOf("@");
  if (atIndex <= 0) return "[masked-email]";
  const localPart = value.substring(0, atIndex);
  const domain = value.substring(atIndex);
  const maskedLocal = localPart.length > 2
    ? localPart[0] + "***" + localPart[localPart.length - 1]
    : localPart[0] + "***";
  return maskedLocal + domain;
}

export function maskName(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 2) return value + "***";
  return value.substring(0, 2) + "***";
}

export function shortHash(value: string): string {
  return crypto.createHash(SHORT_HASH_ALGO).update(String(value)).digest("hex").substring(0, 12);
}

// ── Phone/Email normalization & hashing (Phase 08-G2B) ──

export function normalizePhone(phone: string): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

export function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

function getHashKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || "orca-dev-hash-key";
  return crypto.createHash("sha256").update(String(key)).digest();
}

export function hashPhone(tenantId: string, phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return "";
  const material = `${tenantId}:${normalized}`;
  return crypto.createHmac("sha256", getHashKey()).update(material).digest("hex");
}

export function hashEmail(email: string, tenantId?: string): string {
  const normalized = normalizeEmail(email);
  if (!normalized) return "";
  const material = tenantId ? `${tenantId}:${normalized}` : normalized;
  return crypto.createHmac("sha256", getHashKey()).update(material).digest("hex");
}

const PII_FIELDS = new Set([
  "phone", "senderPhone", "contactPhone", "mobile",
  "email", "from", "to", "cc", "bcc",
  "password", "passwordHash", "password_hash",
  "token", "secret", "apiKey", "api_key", "encryptedApiKey", "encrypted_api_key",
  "privateKey", "private_key", "publicKey", "public_key",
  "rawPayload", "raw_payload", "gatewayResponse", "gateway_response",
  "csrfToken", "session_token",
]);

const REDACT_FIELDS = new Set([
  "raw_message", "messageText", "message_text",
  "fullPrompt", "full_prompt",
  "fullMessageText", "full_message_text",
  "fullBody", "full_body",
  "chatHistory", "chat_history",
]);

const REDACTED_VALUE = "[REDACTED]";
const MASK_PHONE_PLACEHOLDER = "[masked-phone]";

export function redactPiiFromPayload(payload: unknown): unknown {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload === "string") {
    return redactPhonePatterns(payload);
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => redactPiiFromPayload(item));
  }
  if (typeof payload === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (PII_FIELDS.has(key) || PII_FIELDS.has(lowerKey)) {
        if (typeof value === "string" && (lowerKey.includes("phone") || lowerKey.includes("mobile"))) {
          result[key] = maskPhone(value);
        } else if (typeof value === "string" && lowerKey.includes("email")) {
          result[key] = maskEmail(value);
        } else {
          result[key] = REDACTED_VALUE;
        }
      } else if (REDACT_FIELDS.has(key) || REDACT_FIELDS.has(lowerKey)) {
        result[key] = REDACTED_VALUE;
      } else if (typeof value === "object") {
        result[key] = redactPiiFromPayload(value);
      } else if (typeof value === "string") {
        result[key] = redactPhonePatterns(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return payload;
}

function redactPhonePatterns(text: string): string {
  return text
    .replace(/\+\d{10,15}/g, MASK_PHONE_PLACEHOLDER)
    .replace(/\d{9,15}/g, (match) => {
      if (match.length >= 9 && match.length <= 15 && /^\d+$/.test(match)) {
        return maskPhone(match);
      }
      return match;
    });
}

export function sanitizeAuditDetails(details: string): string {
  return redactPhonePatterns(details);
}

export function redactPrismaArgs(args: unknown): unknown {
  if (!args || typeof args !== "object") return args;
  const data = (args as any).data;
  if (!data || typeof data !== "object") return args;
  const cleaned = redactPiiFromPayload(data);
  return { ...(args as object), data: cleaned };
}
