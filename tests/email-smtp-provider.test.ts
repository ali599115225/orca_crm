import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
const emailView = readFileSync(
  resolve(root, "app/operations/email/EmailClient.tsx"),
  "utf8",
);
const integrations = readFileSync(
  resolve(root, "components/settings/SettingsIntegrationsHub.tsx"),
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
    expect(integrations).toContain('key: "password"');
    expect(integrations).toContain("secret: true");
    expect(emailView).not.toContain("encryptedCredentials");
    expect(emailView).not.toContain("credentials.password");
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
    expect(emailLib).not.toContain("host: secret.host");
  });

  it("provides a complete SMTP form with safe defaults", () => {
    expect(integrations).toContain('id: "SMTP"');
    for (const key of [
      "host",
      "port",
      "security",
      "username",
      "password",
      "fromEmail",
      "fromName",
      "replyTo",
    ]) {
      expect(integrations).toContain(`key: "${key}"`);
    }
    expect(integrations).toContain('port: "587"');
    expect(integrations).toContain('security: "STARTTLS"');
    expect(integrations).toContain('<option value="STARTTLS">STARTTLS — 587</option>');
    expect(integrations).toContain('<option value="TLS">TLS — 465</option>');
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

  it("offers SMTP as the primary general connector without removing Resend", () => {
    expect(emailView).toContain("connectSmtp");
    expect(emailView).toContain("connectResend");
    expect(emailView).toContain(
      "/operations/settings?tab=integrations&category=EMAIL&provider=SMTP&open=1",
    );
    expect(emailView).toContain(
      "/operations/settings?tab=integrations&category=EMAIL&provider=RESEND&open=1",
    );
  });

  it("maps SMTP failures to safe user-facing messages", () => {
    expect(emailActions).toContain('normalized.includes("smtp_auth_failed")');
    expect(emailActions).toContain('normalized.includes("smtp_tls_failed")');
    expect(emailActions).toContain('normalized.includes("smtp_timeout")');
    expect(emailActions).toContain('normalized.includes("smtp_host_not_allowed")');
    expect(emailActions).not.toContain("return String(error)");
  });
});
