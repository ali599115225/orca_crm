import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("safe login runtime diagnostics", () => {
  const auth = source("app/actions/auth.ts");
  const session = source("lib/session.ts");
  const operationsLayout = source("app/operations/layout.tsx");
  const tenant = source("lib/tenant.ts");
  const combined = `${auth}\n${session}\n${operationsLayout}\n${tenant}`;

  it("emits a fixed login diagnostic code for each credential failure branch", () => {
    expect(auth).toContain("logLoginDiagnostic('LOGIN_USER_NOT_FOUND')");
    expect(auth).toContain("logLoginDiagnostic('LOGIN_USER_INACTIVE')");
    expect(auth).toContain("'LOGIN_TENANT_MISSING'");
    expect(auth).toContain("'LOGIN_TENANT_INACTIVE'");
    expect(auth).toContain("logLoginDiagnostic('LOGIN_PASSWORD_HASH_MISSING')");
    expect(auth).toContain("logLoginDiagnostic('LOGIN_PASSWORD_INVALID')");
    expect(auth).toMatch(/if \(!user\) \{\s*logLoginDiagnostic\('LOGIN_USER_NOT_FOUND'\)/);
    expect(auth).toMatch(/else if \(!user\.isActive\) \{\s*logLoginDiagnostic\('LOGIN_USER_INACTIVE'\)/);
    expect(auth).toMatch(/else if \(!user\.passwordHash\) \{\s*logLoginDiagnostic\('LOGIN_PASSWORD_HASH_MISSING'\)/);
    expect(auth).toContain(
      "logLoginDiagnostic(user.tenant ? 'LOGIN_TENANT_INACTIVE' : 'LOGIN_TENANT_MISSING')",
    );
  });

  it("logs only safe cookie metadata when the session cookie is created", () => {
    expect(auth).toContain("logLoginDiagnostic('LOGIN_COOKIE_CREATED'");
    expect(auth).toContain("secure,");
    expect(auth).toContain("sameSite: 'lax'");
    expect(auth).toContain("path: '/'");
    expect(auth).toContain("domainConfigured: Boolean(sharedDomain)");
    expect(auth).toContain("logLoginDiagnostic('LOGIN_SUCCESS')");
  });

  it("emits fixed session and operations diagnostic codes", () => {
    expect(session).toContain('logSessionDiagnostic("SESSION_COOKIE_MISSING")');
    expect(session).toContain('logSessionDiagnostic("SESSION_DECRYPT_FAILED")');
    expect(session).toContain('logSessionDiagnostic("SESSION_VALID")');
    expect(operationsLayout).toContain("logOperationsDiagnostic('OPERATIONS_SESSION_MISSING')");
    expect(operationsLayout).toContain("logOperationsDiagnostic('OPERATIONS_TENANT_RESOLUTION_FAILED')");
    expect(operationsLayout).toContain("logOperationsDiagnostic('OPERATIONS_TENANT_READY')");
    expect(combined).toContain("TENANT_RESOLVED_FROM_PRIVILEGED_FALLBACK");
    expect(combined).toContain("TENANT_PRIVILEGED_FALLBACK_NOT_FOUND");
  });

  it("does not log sensitive runtime values from diagnostic console calls", () => {
    const diagnosticConsoleCalls =
      combined.match(/console\.(?:info|warn|error|log)\([^;]*Diagnostics[^;]*\);/g) ?? [];

    expect(diagnosticConsoleCalls.length).toBeGreaterThan(0);
    for (const call of diagnosticConsoleCalls) {
      expect(call).not.toMatch(/\bemail\b/i);
      expect(call).not.toMatch(/\bpassword\b/i);
      expect(call).not.toMatch(/\btoken\b/i);
      expect(call).not.toMatch(/\bjwt\b/i);
      expect(call).not.toMatch(/\buserId\b/);
      expect(call).not.toMatch(/\btenantId\b/);
      expect(call).not.toMatch(/user\.id/);
      expect(call).not.toMatch(/tenant\.id/);
    }
  });

  it("keeps diagnostic coverage independent from real databases", () => {
    const testSource = source("tests/login-diagnostics.test.ts");
    const imports = testSource
      .split(/\r?\n/)
      .filter((line) => line.startsWith("import "));

    expect(imports.join("\n")).not.toMatch(/@\/lib\/prisma|@prisma\/client/);
  });
});
