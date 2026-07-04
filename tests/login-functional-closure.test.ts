import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authBootstrapFindUserByEmail: vi.fn(),
  tenantResolutionFindFirstActive: vi.fn(),
  compare: vi.fn(),
  encrypt: vi.fn(),
  checkRateLimit: vi.fn(),
  clearRateLimit: vi.fn(),
  rateLimit: vi.fn(),
  cookieSet: vi.fn(),
  headerGet: vi.fn(),
  getConfiguredPrivilegedRole: vi.fn(),
}));

vi.mock("@/lib/system-prisma-boundary", () => ({
  authBootstrapFindUserByEmail: mocks.authBootstrapFindUserByEmail,
  tenantResolutionFindFirstActive: mocks.tenantResolutionFindFirstActive,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.compare,
  },
}));

vi.mock("@/lib/session", () => ({
  encrypt: mocks.encrypt,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  clearRateLimit: mocks.clearRateLimit,
  rateLimit: mocks.rateLimit,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: mocks.cookieSet,
  })),
  headers: vi.fn(async () => ({
    get: mocks.headerGet,
  })),
}));

vi.mock("@/lib/platform-identity", () => ({
  getConfiguredPrivilegedRole: mocks.getConfiguredPrivilegedRole,
}));

vi.mock("@/lib/errors", () => ({
  ErrorCode: { INTERNAL_ERROR: "INTERNAL_ERROR" },
  publicError: vi.fn(),
}));

import { loginAction } from "@/app/actions/auth";

function credentials(
  email = "user@example.com",
  password = "correct-password",
  options: { rememberMe?: boolean } = {}
) {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  if (options.rememberMe) {
    formData.set("remember", "on");
  }
  return formData;
}

function activeTenant(id = "tenant-active") {
  return {
    id,
    isActive: true,
    subdomain: "active",
  };
}

function activeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-active",
    email: "user@example.com",
    name: "User",
    role: "ADMIN",
    isActive: true,
    passwordHash: "hashed-password",
    tenant: activeTenant(),
    ...overrides,
  };
}

describe("LOGIN-F01: Login Functional Closure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    mocks.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 5 });
    mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetIn: 60_000 });
    mocks.clearRateLimit.mockResolvedValue(undefined);
    mocks.compare.mockResolvedValue(true);
    mocks.encrypt.mockResolvedValue("test-session-token");
    mocks.getConfiguredPrivilegedRole.mockReturnValue(null);
    mocks.headerGet.mockImplementation((name: string) => {
      if (name === "host") return "orca.az-ez.pro";
      if (name === "x-forwarded-proto") return "https";
      return null;
    });
  });

  describe("1. Login page renders for unauthenticated user", () => {
    it("loginAction is callable and returns a result", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      const result = await loginAction(credentials());
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("2. Login does not require tenant context", () => {
    it("resolves user without tenant context (pre-auth bootstrap)", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      await loginAction(credentials());
      expect(mocks.authBootstrapFindUserByEmail).toHaveBeenCalledWith("user@example.com");
    });
  });

  describe("3. Valid credentials follow correct auth path", () => {
    it("creates session cookie on valid credentials", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      const result = await loginAction(credentials());

      expect(result.success).toBe(true);
      expect(mocks.compare).toHaveBeenCalledWith("correct-password", "hashed-password");
      expect(mocks.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-active",
          tenantId: "tenant-active",
        }),
        60 * 60 * 12,
      );
      expect(mocks.cookieSet).toHaveBeenCalledWith(
        "session_token",
        "test-session-token",
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
        }),
      );
    });

    it("returns redirect URL on success", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      const result = await loginAction(credentials());

      expect(result.success).toBe(true);
      expect(result.redirectUrl).toBeDefined();
      expect(typeof result.redirectUrl).toBe("string");
    });
  });

  describe("4. Invalid credentials fail safely", () => {
    it("rejects wrong password with safe error message", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      mocks.compare.mockResolvedValue(false);

      const result = await loginAction(credentials());

      expect(result.success).toBe(false);
      expect(result.error).toContain("غير صحيحة");
      expect(mocks.cookieSet).not.toHaveBeenCalled();
    });

    it("rejects non-existent user with same safe error message", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(null);

      const result = await loginAction(credentials());

      expect(result.success).toBe(false);
      expect(result.error).toContain("غير صحيحة");
      expect(mocks.cookieSet).not.toHaveBeenCalled();
    });

    it("does not reveal whether account exists", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(null);
      const result1 = await loginAction(credentials());

      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      mocks.compare.mockResolvedValue(false);
      const result2 = await loginAction(credentials());

      expect(result1.error).toBe(result2.error);
    });
  });

  describe("5. Empty or malformed fields are rejected", () => {
    it("rejects empty email", async () => {
      const result = await loginAction(credentials("", "password"));
      expect(result.success).toBe(false);
      expect(result.error).toContain("مطلوب");
    });

    it("rejects empty password", async () => {
      const result = await loginAction(credentials("user@example.com", ""));
      expect(result.success).toBe(false);
      expect(result.error).toContain("مطلوب");
    });

    it("rejects both empty", async () => {
      const result = await loginAction(credentials("", ""));
      expect(result.success).toBe(false);
    });

    it("trims and lowercases email", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      await loginAction(credentials("  USER@EXAMPLE.COM  ", "password"));
      expect(mocks.authBootstrapFindUserByEmail).toHaveBeenCalledWith("user@example.com");
    });
  });

  describe("6. Duplicate submission prevention", () => {
    it("rate limit is checked before authentication", async () => {
      mocks.checkRateLimit.mockResolvedValue({ allowed: false, resetIn: 30_000 });

      const result = await loginAction(credentials());

      expect(result.success).toBe(false);
      expect(mocks.authBootstrapFindUserByEmail).not.toHaveBeenCalled();
      expect(result.retryAfterSeconds).toBeDefined();
    });
  });

  describe("7. Authenticated users redirected from login", () => {
    it("login page server component checks session (source assertion)", async () => {
      const fs = await import("node:fs");
      const source = fs.readFileSync("app/login/page.tsx", "utf8");
      expect(source).toContain("getSession");
      expect(source).toContain("redirect");
    });
  });

  describe("8. Protected routes redirect to login", () => {
    it("operations layout checks session and redirects (source assertion)", async () => {
      const fs = await import("node:fs");
      const source = fs.readFileSync("app/operations/layout.tsx", "utf8");
      expect(source).toContain("getSession");
      expect(source).toContain('redirect("/login")');
    });
  });

  describe("9. Safe callback/return URL behavior", () => {
    it("redirect URL is always a safe path", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      const result = await loginAction(credentials());

      expect(result.redirectUrl).toMatch(/^\/|https:\/\/.*\.orca\.az-ez\.pro/);
    });

    it("redirect URL does not contain user-controlled parameters", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      const result = await loginAction(credentials());

      expect(result.redirectUrl).not.toContain("?callback=");
      expect(result.redirectUrl).not.toContain("?return=");
      expect(result.redirectUrl).not.toContain("?next=");
    });
  });

  describe("10. External/malicious redirect URLs rejected", () => {
    it("redirect URL is never an arbitrary external domain", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      const result = await loginAction(credentials());

      const url = result.redirectUrl || "";
      if (url.startsWith("http")) {
        expect(url).toContain("orca.az-ez.pro");
      }
    });
  });

  describe("11. Arabic errors remain Arabic", () => {
    it("returns Arabic error for invalid credentials", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(null);
      const result = await loginAction(credentials());

      expect(result.error).toMatch(/[\u0600-\u06FF]/);
    });

    it("returns Arabic error for empty fields", async () => {
      const result = await loginAction(credentials("", ""));
      expect(result.error).toMatch(/[\u0600-\u06FF]/);
    });
  });

  describe("12. English errors available", () => {
    it("returns English error alongside Arabic for invalid credentials", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(null);
      const result = await loginAction(credentials());

      expect(result.errorEn).toBeDefined();
      expect(result.errorEn).toMatch(/[a-zA-Z]/);
    });

    it("returns English error for empty fields", async () => {
      const result = await loginAction(credentials("", ""));
      expect(result.errorEn).toBeDefined();
    });
  });

  describe("13. Registration and forgot-password exclusions", () => {
    it("login client does not expose a registration link (source assertion)", async () => {
      const fs = await import("node:fs");
      const source = fs.readFileSync("app/login/LoginClient.tsx", "utf8");
      expect(source).not.toMatch(/href\s*=\s*["']\/register["']/i);
    });

    it("forgot-password never routes to registration (source assertion)", async () => {
      const fs = await import("node:fs");
      const source = fs.readFileSync("app/login/LoginClient.tsx", "utf8");

      // No forgot-password link should exist that points to /register
      const forgotPasswordPattern = /forgot.*password.*\/register|نسيت.*كلمة.*المرور.*\/register/i;
      expect(source).not.toMatch(forgotPasswordPattern);

      // No "Forgot password?" text should exist in the form
      expect(source).not.toContain("Forgot password?");
      expect(source).not.toContain("نسيت كلمة المرور");
    });

    it("no password reset route exists in the repository", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");

      // Check that no forgot-password or reset-password routes exist
      const appDir = path.join(process.cwd(), "app");
      const forgotPasswordDir = path.join(appDir, "forgot-password");
      const resetPasswordDir = path.join(appDir, "reset-password");

      expect(fs.existsSync(forgotPasswordDir)).toBe(false);
      expect(fs.existsSync(resetPasswordDir)).toBe(false);
    });
  });

  describe("13b. Remember-me functionality", () => {
    it("remember-me checkbox exists in login form (source assertion)", async () => {
      const fs = await import("node:fs");
      const source = fs.readFileSync("app/login/LoginClient.tsx", "utf8");
      expect(source).toContain('name="remember"');
      expect(source).toContain("Remember me");
      expect(source).toContain("تذكرني");
    });

    it("default session duration is 12 hours when remember-me is not checked", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      await loginAction(credentials("user@example.com", "password", { rememberMe: false }));

      expect(mocks.encrypt).toHaveBeenCalledWith(
        expect.any(Object),
        60 * 60 * 12,
      );
      expect(mocks.cookieSet).toHaveBeenCalledWith(
        "session_token",
        expect.any(String),
        expect.objectContaining({
          maxAge: 60 * 60 * 12, // 12 hours
        }),
      );
    });

    it("remember-me extends session to 30 days when checked", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      await loginAction(credentials("user@example.com", "password", { rememberMe: true }));

      expect(mocks.encrypt).toHaveBeenCalledWith(
        expect.any(Object),
        60 * 60 * 24 * 30,
      );
      expect(mocks.cookieSet).toHaveBeenCalledWith(
        "session_token",
        expect.any(String),
        expect.objectContaining({
          maxAge: 60 * 60 * 24 * 30, // 30 days
        }),
      );
    });

    it('only the canonical "on" value enables the extended session', async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());

      const formData = credentials();
      formData.set("remember", "true");

      await loginAction(formData);

      expect(mocks.encrypt).toHaveBeenCalledWith(
        expect.any(Object),
        60 * 60 * 12,
      );
      expect(mocks.cookieSet).toHaveBeenCalledWith(
        "session_token",
        expect.any(String),
        expect.objectContaining({
          maxAge: 60 * 60 * 12,
        }),
      );
    });
    it("remember-me does not weaken cookie security settings", async () => {
      vi.stubEnv("NODE_ENV", "production");
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      await loginAction(credentials("user@example.com", "password", { rememberMe: true }));

      expect(mocks.encrypt).toHaveBeenCalledWith(
        expect.any(Object),
        60 * 60 * 24 * 30,
      );
      expect(mocks.cookieSet).toHaveBeenCalledWith(
        "session_token",
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
        }),
      );
    });
  });

  describe("13c. Supported Login API contract", () => {
    it("has known verification and E2E consumers", async () => {
      const fs = await import("node:fs");

      const consumers = [
        "scripts/validate-pilot.mjs",
        "scripts/production-verify.mjs",
        "scripts/quick-verify.mjs",
        "tests/e2e/fixtures.ts",
        "tests/e2e/crm-scenarios.spec.ts",
        "tests/e2e/financial-scenarios.spec.ts",
      ];

      for (const consumer of consumers) {
        expect(fs.existsSync(consumer)).toBe(true);
        expect(fs.readFileSync(consumer, "utf8")).toContain(
          "/api/v1/auth/login",
        );
      }
    });

    it("uses canonical JWT creation and validates the active tenant", async () => {
      const fs = await import("node:fs");
      const source = fs.readFileSync(
        "app/api/v1/auth/login/route.ts",
        "utf8",
      );

      expect(source).toContain("encrypt");
      expect(source).toContain("DEFAULT_SESSION_MAX_AGE_SECONDS");
      expect(source).toContain("authBootstrapFindTenantActive(user.tenantId)");
      expect(source).not.toContain("new SignJWT");
      expect(source).not.toContain('.setExpirationTime("12h")');
    });

    it("preserves the supported Bearer-token response contract", async () => {
      const fs = await import("node:fs");

      const routeSource = fs.readFileSync(
        "app/api/v1/auth/login/route.ts",
        "utf8",
      );
      const guardSource = fs.readFileSync(
        "lib/api-auth-guard.ts",
        "utf8",
      );

      expect(routeSource).toContain("token");
      expect(routeSource).toContain("expires_in");
      expect(routeSource).toContain("user:");
      expect(guardSource).toContain("Bearer ");
      expect(guardSource).toContain("decrypt");
    });
  });
  describe("14. DEDICATED_COPY does not bypass authentication", () => {
    it("loginAction does not import or check isDedicatedCopyDeployment", async () => {
      const fs = await import("node:fs");
      const source = fs.readFileSync("app/actions/auth.ts", "utf8");
      expect(source).not.toContain("isDedicatedCopyDeployment");
    });

    it("login requires valid credentials regardless of deployment mode", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(null);
      const result = await loginAction(credentials());
      expect(result.success).toBe(false);
    });
  });

  describe("15. No cross-tenant or first-tenant fallback for normal users", () => {
    it("does not call tenantResolutionFindFirstActive for normal user without tenant", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(
        activeUser({ tenant: null }),
      );

      const result = await loginAction(credentials());

      expect(result.success).toBe(false);
      expect(mocks.tenantResolutionFindFirstActive).not.toHaveBeenCalled();
    });

    it("does not call tenantResolutionFindFirstActive for normal user with inactive tenant", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(
        activeUser({ tenant: { ...activeTenant(), isActive: false } }),
      );

      const result = await loginAction(credentials());

      expect(result.success).toBe(false);
      expect(mocks.tenantResolutionFindFirstActive).not.toHaveBeenCalled();
    });

    it("only allows privileged role to use first-active-tenant fallback", async () => {
      mocks.getConfiguredPrivilegedRole.mockReturnValue("PLATFORM_ARCHITECT");
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(
        activeUser({ tenant: null }),
      );
      mocks.tenantResolutionFindFirstActive.mockResolvedValue(activeTenant("fallback-tenant"));

      const result = await loginAction(credentials());

      expect(result.success).toBe(true);
      expect(mocks.tenantResolutionFindFirstActive).toHaveBeenCalled();
    });
  });

  describe("Security: Session cookie settings", () => {
    it("sets httpOnly flag on session cookie", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      await loginAction(credentials());

      expect(mocks.cookieSet).toHaveBeenCalledWith(
        "session_token",
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it("sets sameSite=lax on session cookie", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      await loginAction(credentials());

      expect(mocks.cookieSet).toHaveBeenCalledWith(
        "session_token",
        expect.any(String),
        expect.objectContaining({ sameSite: "lax" }),
      );
    });

    it("sets secure flag in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      await loginAction(credentials());

      expect(mocks.cookieSet).toHaveBeenCalledWith(
        "session_token",
        expect.any(String),
        expect.objectContaining({ secure: true }),
      );
    });
  });

  describe("Security: Password safety", () => {
    it("does not return password hash in result", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(activeUser());
      const result = await loginAction(credentials());

      expect(JSON.stringify(result)).not.toContain("hashed-password");
    });
  });

  describe("Security: Inactive user rejected", () => {
    it("rejects inactive user with safe error", async () => {
      mocks.authBootstrapFindUserByEmail.mockResolvedValue(
        activeUser({ isActive: false }),
      );

      const result = await loginAction(credentials());

      expect(result.success).toBe(false);
      expect(result.error).toContain("غير صحيحة");
      expect(mocks.cookieSet).not.toHaveBeenCalled();
    });
  });
});
