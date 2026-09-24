import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Reauthored from SOURCE tests/email-smtp-provider.test.ts.
// Settings-integrations-form and EmailClient view assertions removed: those
// TARGET clean-room surfaces (components/settings/*, app/operations/email/*)
// do not exist yet (PAGE work not started). Only the proven non-visual
// security invariants — encrypted credentials, SSRF-safe SMTP transport,
// and safe error-message mapping — are preserved here.

const root = process.cwd();
const emailLib = readFileSync(resolve(root, "lib/email.ts"), "utf8");
const emailActions = readFileSync(
  resolve(root, "app/actions/email.ts"),
  "utf8",
);
const revenueActions = readFileSync(
  resolve(root, "app/actions/revenue-integrity.ts"),
  "utf8",
);
const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");

describe("Generic SMTP tenant provider", () => {
  it("supports SMTP beside Resend through the existing provider model", () => {
    expect(emailLib).toContain('export type TenantEmailProviderId = "RESEND" | "SMTP"');
    expect(emailLib).toContain('provider: { in: ["SMTP", "RESEND"] }');
    expect(emailLib).toContain('connection.provider === "SMTP"');
    expect(schema).toContain("model RevenueProviderConnection");
    expect(schema).toContain("@@unique([tenantId, provider]");
  });

  it("keeps SMTP credentials encrypted and server-only", () => {
    expect(emailLib).toContain('import "server-only"');
    expect(emailLib).toContain("decryptProviderCredentials");
    expect(emailLib).toContain("encryptedCredentials");
  });

  it("supports implicit TLS and STARTTLS with authenticated delivery", () => {
    expect(emailLib).toContain('type SmtpSecurity = "TLS" | "STARTTLS"');
    expect(emailLib).toContain('secret.security === "TLS"');
    expect(emailLib).toContain('"STARTTLS"');
    expect(emailLib).toContain('"AUTH LOGIN"');
    expect(emailLib).toContain("AUTH PLAIN");
    expect(emailLib).toContain("MAIL FROM:");
    expect(emailLib).toContain("RCPT TO:");
    expect(emailLib).toContain('"DATA"');
  });

  it("blocks local and private SMTP endpoints before opening a socket", () => {
    expect(emailLib).toContain('import { lookup } from "node:dns/promises"');
    expect(emailLib).toContain("resolvePublicSmtpEndpoint");
    expect(emailLib).toContain("isPublicIpAddress");
    expect(emailLib).toContain("SMTP_PRIVATE_HOST_BLOCKED");
    expect(emailLib).toContain("endpoint.address");
  });

  it("tests SMTP using the tenant-scoped encrypted connection", () => {
    expect(revenueActions).toContain('normalizedProvider === "SMTP"');
    expect(revenueActions).toContain("tenantId_provider");
    expect(revenueActions).toContain('provider: "SMTP"');
    expect(revenueActions).toContain("testEmailProviderConnection");
    expect(revenueActions).toContain('status: "CONNECTED"');
    expect(revenueActions).toContain('status: "ERROR"');
    expect(revenueActions).toContain("updatedBy: auth.userId");
  });

  it("maps SMTP failures to safe user-facing messages", () => {
    expect(emailActions).toContain('normalized.includes("smtp_auth_failed")');
    expect(emailActions).toContain('normalized.includes("smtp_tls_failed")');
    expect(emailActions).toContain('normalized.includes("smtp_timeout")');
    expect(emailActions).toContain('normalized.includes("smtp_host_not_allowed")');
  });
});
