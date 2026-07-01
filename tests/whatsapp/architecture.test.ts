import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function filesUnder(directory: string): string[] {
  const absolute = join(root, directory);

  if (!existsSync(absolute)) {
    return [];
  }

  return readdirSync(absolute).flatMap((entry) => {
    const path = join(absolute, entry);

    if (statSync(path).isDirectory()) {
      return filesUnder(relative(root, path));
    }

    return [path];
  });
}

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function modelBlock(schema: string, model: string) {
  const match = schema.match(
    new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`),
  );

  if (!match) {
    throw new Error(`Missing Prisma model: ${model}`);
  }

  return match[0];
}

describe("WhatsApp P0 architecture", () => {
  it("keeps direct Meta Graph calls inside approved server-only services", () => {
    const hits = [...filesUnder("app"), ...filesUnder("lib")]
      .filter((path) =>
        readFileSync(path, "utf8").includes(
          "graph.facebook.com",
        ),
      )
      .map((path) => relative(root, path).replaceAll("\\", "/"));

    expect(hits).toEqual([
      "lib/whatsapp/embedded-signup-service.ts",
      "lib/whatsapp/send-service.ts",
    ]);
  });

  it("removes legacy and debug WhatsApp routes", () => {
    expect(
      existsSync(
        join(root, "app/api/whatsapp/send/route.ts"),
      ),
    ).toBe(false);
    expect(
      existsSync(
        join(root, "app/api/whatsapp/meta/route.ts"),
      ),
    ).toBe(false);
    expect(
      existsSync(
        join(root, "app/api/debug/whatsapp-status/route.ts"),
      ),
    ).toBe(false);
  });

  it("keeps the v1 route as an adapter to send-service", () => {
    const route = read(
      "app/api/v1/whatsapp/send/route.ts",
    );

    expect(route).toContain(
      "@/lib/whatsapp/send-service",
    );
    expect(route).not.toContain(
      "graph.facebook.com",
    );
  });

  it("enforces webhook envelope, event, signature, tenant and automation gates", () => {
    const webhook = read(
      "app/api/whatsapp/webhook/route.ts",
    );

    for (const marker of [
      "verifyMetaSignature",
      "whatsAppWebhookEnvelope",
      "whatsAppWebhookEvent",
      "getWhatsAppControls",
      "automationEnabled",
      "dedupeKey",
      "QUARANTINED",
      "DLQ",
    ]) {
      expect(webhook).toContain(marker);
    }
  });

  it("keeps the final Prisma integrity contract", () => {
    const schema = read("prisma/schema.prisma");
    const signup = modelBlock(
      schema,
      "WhatsAppSignupSession",
    );
    const phone = modelBlock(
      schema,
      "WhatsAppPhoneNumber",
    );
    const platform = modelBlock(
      schema,
      "WhatsAppPlatformSettings",
    );

    expect(signup).toContain("stateHash");
    expect(signup).toContain('@map("state_hash")');
    expect(signup).not.toMatch(/\n\s+state\s+/);

    expect(phone).not.toContain("certificate");

    expect(platform).toContain("singletonKey");
    expect(platform).toContain("@unique");

    const migration =
      "prisma/migrations/" +
      "000000000000_baseline/" +
      "migration.sql";

    expect(existsSync(join(root, migration))).toBe(true);

    const sql = read(migration);

    for (const marker of [
      "state_hash",
      "singleton_key",
      "WHATSAPP_CONNECTION_TENANT_MISMATCH",
      "WHATSAPP_USER_TENANT_MISMATCH",
      "WHATSAPP_EVENT_MESSAGE_TENANT_MISMATCH",
    ]) {
      expect(sql).toContain(marker);
    }
  });
});