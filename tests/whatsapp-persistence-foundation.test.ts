import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const schema = readFileSync(
  join(root, "prisma/schema.prisma"),
  "utf8",
);
const migrationPath = join(
  root,
  "prisma/migrations/20260620000202_whatsapp_p0_final_integrity/migration.sql",
);
const migration = readFileSync(migrationPath, "utf8");

function modelBlock(name: string) {
  const match = schema.match(
    new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`),
  );

  if (!match) {
    throw new Error(`Missing Prisma model: ${name}`);
  }

  return match[0];
}

describe("WhatsApp final persistence integrity", () => {
  it("keeps tenant-scoped phone and message identity", () => {
    const phone = modelBlock("WhatsAppPhoneNumber");
    const message = modelBlock("WhatsAppMessage");

    expect(phone).toContain(
      '@@map("whatsapp_phone_numbers")',
    );
    expect(phone).toContain("tenantId");
    expect(phone).toContain("connectionId");
    expect(phone).toContain("phoneNumberId");
    expect(phone).not.toContain("certificate");

    expect(message).toContain(
      "@@unique([tenantId, metaMessageId])",
    );
    expect(message).not.toContain(
      "@unique(map: " +
        '"uq_whatsapp_messages_meta_message_id")',
    );
  });

  it("stores only a one-way Embedded Signup state hash", () => {
    const signup = modelBlock(
      "WhatsAppSignupSession",
    );

    expect(signup).toContain("stateHash");
    expect(signup).toContain('@map("state_hash")');
    expect(signup).not.toMatch(/\n\s+state\s+/);
    expect(signup).toContain(
      "@relation(fields: [tenantId]",
    );
    expect(signup).toContain(
      "@relation(fields: [userId]",
    );
  });

  it("enforces a singleton platform kill-switch record", () => {
    const platform = modelBlock(
      "WhatsAppPlatformSettings",
    );

    expect(platform).toContain("singletonKey");
    expect(platform).toContain("@unique");
    expect(platform).toContain(
      '@default("global")',
    );
  });

  it("links webhook events to tenant and local message safely", () => {
    const event = modelBlock(
      "WhatsAppWebhookEvent",
    );

    expect(event).toContain("tenant");
    expect(event).toContain("messageId");
    expect(event).toContain("@db.Uuid");
    expect(event).toContain("dedupeKey");
    expect(event).toContain("@unique");
  });

  it("contains the final migration and cross-tenant guards", () => {
    expect(existsSync(migrationPath)).toBe(true);

    for (const marker of [
      "state_hash",
      "singleton_key",
      "fk_whatsapp_signup_sessions_tenant",
      "fk_whatsapp_webhook_events_message",
      "WHATSAPP_CONNECTION_TENANT_MISMATCH",
      "WHATSAPP_USER_TENANT_MISMATCH",
      "WHATSAPP_CREDENTIAL_TENANT_MISMATCH",
      "WHATSAPP_EVENT_MESSAGE_TENANT_MISMATCH",
    ]) {
      expect(migration).toContain(marker);
    }
  });

  it("refuses silent certificate data loss", () => {
    expect(migration).toContain(
      "WHATSAPP_CERTIFICATE_DATA_PRESENT",
    );
    expect(migration).toContain(
      'DROP COLUMN IF EXISTS "certificate"',
    );
  });
});