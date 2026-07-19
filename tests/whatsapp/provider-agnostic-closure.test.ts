import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("WhatsApp provider-agnostic closure", () => {
  const contracts = read("lib/revenue-integrity/contracts.ts");
  const trust = read("lib/revenue-integrity/trust-gates.ts");
  const resolver = read("lib/whatsapp/connection-resolver.ts");
  const sender = read("lib/whatsapp/send-service.ts");
  const actions = read("app/actions/whatsapp.ts");
  const crmActions = read("app/actions/whatsapp-crm.ts");
  const view = read("components/views/WhatsAppView.tsx");
  const settings = read(
    "components/settings/SettingsIntegrationsHub.tsx",
  );
  const metaSettings = read(
    "components/settings/WhatsAppIntegrationSettings.tsx",
  );
  const webhook = read(
    "app/api/whatsapp/webhook/360dialog/[webhookToken]/route.ts",
  );
  const systemBoundary = read("lib/system-prisma-boundary.ts");
  const sendRoute = read("app/api/v1/whatsapp/send/route.ts");
  const threadsRoute = read("app/api/v1/whatsapp/threads/route.ts");

  it("keeps Meta and adds 360dialog without a schema migration", () => {
    expect(contracts).toContain('"DIALOG360"');
    expect(settings).toContain('id: "WHATSAPP"');
    expect(settings).toContain('id: "DIALOG360"');
    expect(metaSettings).toContain("Meta WhatsApp Cloud");
  });

  it("stores 360dialog credentials through the encrypted tenant connection model", () => {
    expect(trust).toContain("validateDialog360Credentials");
    expect(trust).toContain("encryptCredentials(input.credentials)");
    expect(trust).toContain('randomBytes(24).toString("base64url")');
    expect(trust).toContain("webhookToken");
    expect(resolver).toContain('provider: "DIALOG360"');
    expect(resolver).toContain("decryptProviderCredentials");
  });

  it("tests and sends using the official 360dialog messaging contract", () => {
    expect(trust).toContain("/health_status");
    expect(trust).toContain('"D360-API-KEY"');
    expect(sender).toContain("/messages");
    expect(sender).toContain('"D360-API-KEY"');
  });

  it("derives tenant context before WhatsApp mutations and hides technical errors", () => {
    expect(actions).toContain("requireWhatsAppAccess");
    expect(actions).toContain("runWithTenantContext");
    expect(crmActions).toContain("runWithTenantContext");
    expect(crmActions).toContain("{ tenantId, userId }");
    expect(view).toContain("TENANT_CONTEXT");
    expect(view).toContain("t.notConfigured");
    expect(view).not.toContain(">TENANT_CONTEXT_REQUIRED<");
  });

  it("re-enters tenant context at every WhatsApp API boundary", () => {
    expect(sendRoute).toContain("runWithTenantContext");
    expect(threadsRoute).toContain("runWithTenantContext");
    expect(sendRoute).toContain("{ tenantId: session.tenantId }");
    expect(threadsRoute).toContain("{ tenantId }");
  });

  it("derives webhook tenancy from the encrypted connection rather than request data", () => {
    expect(systemBoundary).toContain('provider: "DIALOG360"');
    expect(webhook).toContain("connection.tenantId");
    expect(systemBoundary).toContain('path: ["webhookToken"]');
    expect(webhook).toContain("webhookFindDialog360ConnectionByToken");
    expect(settings).toContain("connection.webhookToken");
    expect(settings).not.toContain(
      "/api/whatsapp/webhook/360dialog/${connection.id}",
    );
    expect(webhook).toContain("x-orca-webhook-secret");
    expect(webhook).toContain("constantTimeEqual");
    expect(webhook).toContain("tenantId_metaMessageId");
  });

  it("keeps history available while blocking send without a provider", () => {
    expect(actions).toContain("connectionWarning");
    expect(actions).toContain("whatsAppContact.findMany");
    expect(view).toContain("whatsAppReachable");
    expect(view).toContain("disabled={!whatsAppReachable");
    expect(view).toContain(
      "/operations/settings?tab=integrations&category=MESSAGING",
    );
    expect(view).toContain("disabled={!whatsAppReachable}");
  });

  it("uses safe portal forms below the fixed header", () => {
    expect(view).toContain('import { createPortal } from "react-dom"');
    expect(view.match(/createPortal\(/g)?.length).toBe(2);
    expect(view).toContain("top-[88px]");
    expect(view).toContain("min-h-[44px]");
  });

  it("does not offer ORCA account provisioning for 360dialog", () => {
    expect(settings).toContain('activeProvider !== "DIALOG360"');
    expect(settings).toContain("X-ORCA-Webhook-Secret");
  });
});
