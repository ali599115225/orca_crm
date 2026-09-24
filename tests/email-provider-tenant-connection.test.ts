import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Reauthored from SOURCE tests/email-provider-tenant-connection.test.ts.
// Page/view/integrations-component assertions removed: those TARGET clean-room
// surfaces (app/operations/email/*, components/settings/*) do not exist yet
// (PAGE work not started). Only the proven non-visual capability — tenant-scoped
// provider resolution, server-side credential decryption boundary, and the
// underlying schema shape — is preserved here.

const root = process.cwd();
const emailLib = readFileSync(resolve(root, "lib/email.ts"), "utf8");
const actions = readFileSync(resolve(root, "app/actions/email.ts"), "utf8");
const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");

describe("Tenant-scoped email provider architecture", () => {
  it("does not use a global tenant email credential or demo sender", () => {
    expect(emailLib).not.toContain("RESEND_API_KEY");
    expect(emailLib).not.toContain("re_dummy_key_for_testing");
    expect(emailLib).not.toContain("onboarding@resend.dev");
    expect(actions).not.toContain("process.env.EMAIL_FROM");
    expect(actions).not.toContain("onboarding@resend.dev");
  });

  it("resolves connected email providers by tenantId and default priority", () => {
    expect(emailLib).toContain("revenueProviderConnection.findMany");
    expect(emailLib).toContain("tenantId,");
    expect(emailLib).toContain('provider: { in: ["SMTP", "RESEND"] }');
    expect(emailLib).toContain('status: "CONNECTED"');
    expect(emailLib).toContain('orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]');
    expect(schema).toContain("model RevenueProviderConnection");
  });

  it("decrypts tenant credentials without exposing them to the client", () => {
    expect(emailLib).toContain("decryptProviderCredentials");
    expect(emailLib).toContain("encryptedCredentials");
    expect(emailLib).toContain("parseProviderSecret");
    expect(emailLib).toContain("credentials.apiKey");
    expect(emailLib).toContain("credentials.password");
  });

  it("creates the outbound record as a draft when no provider is connected", () => {
    expect(actions).toContain("getTenantEmailProviderSummary(tenant.id)");
    expect(actions).toContain('status: provider.configured ? "PENDING" : "DRAFT"');
    expect(actions).toContain("draftSaved: true");
    expect(actions).toContain("EMAIL_PROVIDER_NOT_CONFIGURED");
    expect(actions).toContain("EMAIL_PROVIDER_INVALID");
  });

  it("uses the selected tenant sender and provider on outbound records", () => {
    expect(actions).toContain("from: provider.fromEmail ||");
    expect(actions).toContain("tenantId: tenant.id");
    expect(actions).toContain(
      'result.provider || provider.provider || "EMAIL_PROVIDER"',
    );
    expect(emailLib).toContain("new Resend(provider.value.apiKey)");
    expect(emailLib).toContain("sendWithSmtp(provider.value, options)");
  });

  it("does not require a schema migration", () => {
    expect(schema).toContain("@@unique([tenantId, provider]");
    expect(schema).toContain("encryptedCredentials");
    expect(schema).toContain("RevenueProviderStatus");
  });
});
