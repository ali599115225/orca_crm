import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockSession, mockAssertRole } = vi.hoisted(() => ({
  mockSession: vi.fn(),
  // Lightweight stand-in for the real assertServerActionRole/hasDatabaseRole
  // (lib/api-auth-guard.ts): rejects unless the session carries one of the
  // allowed roles, so RBAC-denied and role-mismatch cases are distinguishable
  // from an authenticated ADMIN session at this mock boundary.
  mockAssertRole: vi.fn(async (session: any, roles: any) => {
    if (!session || !Array.isArray(roles) || !roles.includes(session.role)) {
      throw new Error("FORBIDDEN");
    }
    return session;
  }),
}));

vi.mock("@/lib/session", () => ({ getSession: () => mockSession() }));
vi.mock("@/lib/api-auth-guard", () => ({
  assertServerActionRole: (session: unknown, roles: unknown) => mockAssertRole(session, roles),
}));

import { testAIProviderConnectionAction } from "@/app/actions/ai-providers";

const ADMIN_SESSION = { userId: "user-1", tenantId: "tenant-1", role: "ADMIN" };
const NON_ADMIN_SESSION = { userId: "user-2", tenantId: "tenant-1", role: "SALES_MANAGER" };

const REAL_FETCH_CALL_ERROR = "UNMOCKED_REAL_FETCH_CALL_ATTEMPTED";

describe("testAIProviderConnectionAction — Azure provider fails closed (no trusted server-side endpoint)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Full reset (not clearAllMocks) so a mockRejectedValueOnce/mockImplementation
    // set in one test can never leak into the next test's default behavior.
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ["setTimeout"] });

    mockSession.mockReset().mockResolvedValue(ADMIN_SESSION);
    mockAssertRole.mockReset().mockImplementation(async (session: any, roles: any) => {
      if (!session || !Array.isArray(roles) || !roles.includes(session.role)) {
        throw new Error("FORBIDDEN");
      }
      return session;
    });

    // Any real network call is treated as a hard test failure, not a silent pass.
    fetchMock = vi.fn(() => {
      throw new Error(REAL_FETCH_CALL_ERROR);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function run(data: Record<string, string>) {
    const promise = testAIProviderConnectionAction("azure", data);
    await vi.advanceTimersByTimeAsync(1500);
    return promise;
  }

  const VALID_FORM = {
    endpoint: "https://my-resource.openai.azure.com",
    deploymentName: "gpt-4o",
    apiKey: "test-api-key-not-a-real-secret",
  };

  describe("authentication and authorization run before any network call", () => {
    it("rejects when the session is missing", async () => {
      mockSession.mockResolvedValue(null);

      const result = await run(VALID_FORM);

      expect(result.success).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects when RBAC denies the session", async () => {
      mockAssertRole.mockRejectedValueOnce(new Error("FORBIDDEN"));

      const result = await run(VALID_FORM);

      expect(result.success).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a non-ADMIN role", async () => {
      mockSession.mockResolvedValue(NON_ADMIN_SESSION);

      const result = await run(VALID_FORM);

      expect(result.success).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("Azure branch fails closed regardless of the supplied endpoint (no trusted server-side source to compare against)", () => {
    it("fails closed for a well-formed, genuinely valid-looking Azure OpenAI endpoint", async () => {
      const result = await run(VALID_FORM);

      expect(result.success).toBe(false);
      expect(result.error).toBe("AZURE_OPENAI_ENDPOINT_NOT_CONFIGURED");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("fails closed for a different, equally valid-looking Azure resource (no exact trusted origin to match)", async () => {
      const result = await run({
        ...VALID_FORM,
        endpoint: "https://another-valid-resource.openai.azure.com",
      });

      expect(result.success).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    const ssrfEndpoints = [
      "http://my-resource.openai.azure.com",
      "https://localhost",
      "https://localhost:8080",
      "https://127.0.0.1",
      "https://0.0.0.0",
      "https://[::1]",
      "https://10.0.0.1",
      "https://172.16.0.1",
      "https://192.168.0.1",
      "https://169.254.169.254",
      "https://metadata.google.internal",
      "https://internal-service.local",
      "https://evil.com/openai.azure.com",
      "https://openai.azure.com",
      "https://my-resource.openai.azure.com.evil.com",
      "https://user:pass@my-resource.openai.azure.com",
      "https://my-resource.openai.azure.com:8443",
      "https://my-resource.openai.azure.com/../internal",
      "https://my-resource.openai.azure.com/%2e%2e/internal",
      "https://my-resource.openai.azure.com/%252e%252e/internal",
      "https://my-resource.openai.azure.com?x=1",
      "https://my-resource.openai.azure.com#frag",
      "not a url at all",
      "https://" + "a".repeat(4000) + ".openai.azure.com",
      "https://xn--e1aybc.openai.azure.com",
    ];

    it.each(ssrfEndpoints)("fails closed for %s without contacting the network", async (endpoint) => {
      const result = await run({ ...VALID_FORM, endpoint });

      expect(result.success).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    const malformedDeploymentNames = [
      "../../secrets",
      "..\\secrets",
      "a/b",
      "a\\b",
      "gpt%2Fadmin",
      "gpt?x=1",
      "gpt#frag",
      "a".repeat(500),
    ];

    it.each(malformedDeploymentNames)("fails closed for deployment name %s without contacting the network", async (deploymentName) => {
      const result = await run({ ...VALID_FORM, deploymentName });

      expect(result.success).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
