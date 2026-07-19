import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Targeted regression test for CodeQL alerts #11/#12 (js/polynomial-redos,
// app/api/v1/auth/login/route.ts:55). Same mocking convention as
// tests/login-api-security.test.ts (this route's existing test suite).
//
// No password/email length contract exists anywhere in this codebase (see
// the P0-07 evidence table) — the fix does not introduce one. Instead the
// polynomial-complexity <script[\s\S]*?> alternative was replaced with a
// plain linear substring check, so worst-case adversarial input of any
// length now completes in linear time regardless of whether it matches.

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  countFailedAttempts: vi.fn(),
  createFailedAttempt: vi.fn(),
  deleteFailedAttempts: vi.fn(),
  compare: vi.fn(),
  rateLimit: vi.fn(),
  writeAuditLog: vi.fn(),
  encrypt: vi.fn(),
  findActiveTenant: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  rawPrisma: {
    user: {
      findUnique: mocks.findUser,
    },
    failedLoginAttempt: {
      count: mocks.countFailedAttempts,
      create: mocks.createFailedAttempt,
      deleteMany: mocks.deleteFailedAttempts,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.compare,
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock("@/lib/session", () => ({
  DEFAULT_SESSION_MAX_AGE_SECONDS: 60 * 60 * 12,
  encrypt: mocks.encrypt,
}));

vi.mock("@/lib/system-prisma-boundary", () => ({
  authBootstrapFindTenantActive: mocks.findActiveTenant,
}));

type ActiveUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  passwordHash: string;
};

function activeUser(overrides: Partial<ActiveUser> = {}): ActiveUser {
  return {
    id: "user-api",
    tenantId: "tenant-api",
    name: "API User",
    email: "api@example.com",
    role: "ADMIN",
    isActive: true,
    passwordHash: "hashed-password",
    ...overrides,
  };
}

async function callLoginApi(email: string, password: string) {
  vi.resetModules();

  const { POST } = await import("@/app/api/v1/auth/login/route");

  return POST(
    new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({ email, password }),
    }),
  );
}

const VALID_EMAIL = "api@example.com";
const VALID_PASSWORD = "correct-password";

describe("LOGIN-REDOS: linear pattern check closes the polynomial-regex flow (alerts #11, #12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv(
      "JWT_SECRET",
      "login-redos-test-secret-with-sufficient-length",
    );

    mocks.findUser.mockResolvedValue(activeUser());
    mocks.countFailedAttempts.mockResolvedValue(0);
    mocks.deleteFailedAttempts.mockResolvedValue({ count: 0 });
    mocks.compare.mockResolvedValue(true);
    mocks.rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetIn: 60_000,
    });
    mocks.writeAuditLog.mockResolvedValue(undefined);
    mocks.encrypt.mockResolvedValue("supported-api-token");
    mocks.findActiveTenant.mockResolvedValue({ id: "tenant-api" });
  });

  it("valid short credentials still succeed (existing behavior preserved)", async () => {
    const response = await callLoginApi(VALID_EMAIL, VALID_PASSWORD);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.findUser).toHaveBeenCalled();
  });

  it("a short, genuinely malicious pattern is still rejected exactly as before", async () => {
    const response = await callLoginApi("SELECT * FROM users", VALID_PASSWORD);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "المدخلات المرسلة تحتوي على رموز أو أنماط غير مسموح بها.",
    );
    expect(mocks.findUser).not.toHaveBeenCalled();
  });

  it("a short benign near-match (contains 'script' but not the <script> pattern) is not falsely rejected", async () => {
    mocks.findUser.mockResolvedValue(null); // no such user, but must reach the DB lookup
    const response = await callLoginApi(
      "postscript-fan@example.com",
      VALID_PASSWORD,
    );

    expect(response.status).toBe(401); // "invalid credentials", not 400 "disallowed pattern"
    expect(mocks.findUser).toHaveBeenCalled();
  });

  it("rejects a long repeated-<script-prefix adversarial payload quickly and before any DB access", async () => {
    // Worst-case shape for the old <script[\s\S]*?> alternative: many
    // literal "<script" occurrences with no closing '>' anywhere, which
    // used to force an O(n) lazy scan from O(n) starting positions. The
    // new check is a single linear .includes("<script") pass, so this
    // now resolves in the same order of magnitude of time as any other
    // string of this length, matching on the very first occurrence.
    const adversarialEmail = "<script".repeat(30_000); // ~210,000 chars

    const start = Date.now();
    const response = await callLoginApi(adversarialEmail, VALID_PASSWORD);
    const elapsedMs = Date.now() - start;
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "المدخلات المرسلة تحتوي على رموز أو أنماط غير مسموح بها.",
    );
    expect(mocks.findUser).not.toHaveBeenCalled();
    // Not a tight perf assertion (avoids a flaky hard threshold) — this is a
    // sanity bound that would fail loudly if the old polynomial regex were
    // reintroduced and this adversarial shape hit it again.
    expect(elapsedMs).toBeLessThan(2_000);
  });

  it("a long password that never contains '<script' as a literal substring is not falsely rejected and completes quickly", async () => {
    // "<scrip" repeated never spells the literal substring "<script" at any
    // position (each repetition restarts with '<', not 't'), so this was
    // never actually a trigger for the old regex's worst case either — it
    // exists here to prove the new linear check doesn't misfire on a long,
    // <-heavy, non-matching string, and still finishes in bounded time.
    const longBenignPassword = "<scrip".repeat(40_000); // ~240,000 chars

    const start = Date.now();
    const response = await callLoginApi(VALID_EMAIL, longBenignPassword);
    const elapsedMs = Date.now() - start;

    expect(response.status).toBe(200); // reaches bcrypt.compare, mocked to succeed
    expect(mocks.findUser).toHaveBeenCalled();
    expect(elapsedMs).toBeLessThan(2_000);
  });

  it("a long run of repeated separator characters (never matching any disallowed pattern) reaches the DB lookup quickly", async () => {
    // "a<" repeated never spells "<script" or "javascript:" and contains no
    // SQL keyword, so it is legitimately benign under the new check.
    const longBenignEmail = `${"a<".repeat(60_000)}@example.com`; // ~120,010 chars
    mocks.findUser.mockResolvedValue(null); // no such user, but the lookup must still happen

    const start = Date.now();
    const response = await callLoginApi(longBenignEmail, VALID_PASSWORD);
    const elapsedMs = Date.now() - start;

    expect(response.status).toBe(401); // "invalid credentials", not 400 "disallowed pattern"
    expect(mocks.findUser).toHaveBeenCalled();
    expect(elapsedMs).toBeLessThan(2_000);
  });

  it("still rejects a long malicious payload sent via password as well as email", async () => {
    const adversarialPassword = "<script".repeat(30_000);

    const response = await callLoginApi(VALID_EMAIL, adversarialPassword);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "المدخلات المرسلة تحتوي على رموز أو أنماط غير مسموح بها.",
    );
    expect(mocks.findUser).not.toHaveBeenCalled();
  });
});
