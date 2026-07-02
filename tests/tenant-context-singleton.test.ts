import { describe, expect, it, vi } from "vitest";

describe("tenant context singleton", () => {
  it("shares the same AsyncLocalStorage across module reloads", async () => {
    vi.resetModules();
    const firstModule = await import("@/lib/tenant-context");

    vi.resetModules();
    const secondModule = await import("@/lib/tenant-context");

    expect(secondModule.tenantContext).toBe(firstModule.tenantContext);

    await firstModule.runWithTenantContext(
      { tenantId: "tenant-singleton-test" },
      async () => {
        await Promise.resolve();

        expect(
          secondModule.requireTenantContext().tenantId,
        ).toBe("tenant-singleton-test");
      },
    );
  });
});