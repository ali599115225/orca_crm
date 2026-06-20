import {
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("WhatsApp Embedded Signup architecture", () => {
  it("provides the complete tenant self-service route set", () => {
    for (const path of [
      "app/api/whatsapp/embedded-signup/session/route.ts",
      "app/api/whatsapp/embedded-signup/complete/route.ts",
      "app/api/whatsapp/embedded-signup/status/route.ts",
      "app/api/whatsapp/embedded-signup/disconnect/route.ts",
      "app/api/whatsapp/embedded-signup/callback/route.ts",
    ]) {
      expect(existsSync(join(root, path))).toBe(true);
    }
  });

  it("keeps the Meta app secret server-only", () => {
    const client = read(
      "components/settings/WhatsAppIntegrationSettings.tsx",
    );
    const service = read(
      "lib/whatsapp/embedded-signup-service.ts",
    );

    expect(client).not.toContain(
      "WHATSAPP_APP_SECRET",
    );
    expect(client).not.toContain("access_token");
    expect(client).toContain(
      'sessionInfoVersion: "3"',
    );
    expect(client).toContain(
      'hostname.endsWith(',
    );
    expect(client).toContain(
      "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
    );
    expect(service).toContain(
      'requiredEnv("WHATSAPP_APP_SECRET")',
    );
    expect(service).toContain("encryptToken");
  });

  it("binds signup, assets and credentials to the authenticated tenant", () => {
    const service = read(
      "lib/whatsapp/embedded-signup-service.ts",
    );

    for (const marker of [
      "requireEmbeddedSignupAdmin",
      "tenantId: actor.tenantId",
      "stateHash",
      "WHATSAPP_ASSET_ALREADY_ASSIGNED",
      "subscribeAppToWaba",
      "whatsappConnected: true",
      'status: "ACTIVE"',
    ]) {
      expect(service).toContain(marker);
    }
  });

  it("renders Embedded Signup inside the settings integration tab", () => {
    const settings = read(
      "components/views/SettingsView.tsx",
    );

    expect(settings).toContain(
      "WhatsAppIntegrationSettings",
    );
    expect(settings).toContain(
      "searchParams.get('tab') === 'compliance'",
    );
  });

  it("uses the configured callback route without exposing OAuth codes in settings URLs", () => {
    const callback = read(
      "app/api/whatsapp/embedded-signup/callback/route.ts",
    );

    expect(callback).toContain(
      "ORCA_WHATSAPP_OAUTH_CALLBACK",
    );
    expect(callback).toContain("postMessage");
    expect(callback).not.toContain(
      "whatsapp_code=",
    );
  });
});