import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LICENSE_ENV_KEYS = [
  "ORCA_LICENSE_PAYLOAD",
  "ORCA_LICENSE_SIGNATURE",
  "ORCA_LICENSE_PUBLIC_KEY",
  "ORCA_LICENSE_MODE",
] as const;

beforeEach(() => {
  vi.resetModules();
  for (const key of LICENSE_ENV_KEYS) vi.stubEnv(key, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("deployment license fail-safe default", () => {
  it("does not assume SaaS or a valid license when no license is configured", async () => {
    const { resolveDeploymentLicense } = await import(
      "@/lib/deployment-license"
    );

    expect(resolveDeploymentLicense()).toMatchObject({
      mode: "DEDICATED_COPY",
      valid: false,
      source: "DEFAULT",
      payload: null,
      reason: "NO_LICENSE_ASSUMED",
    });
  });
});
