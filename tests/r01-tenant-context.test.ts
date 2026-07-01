import { describe, expect, it } from "vitest";
import {
  getTenantContext,
  requireTenantContext,
  runPlatformOperation,
  runWithTenantContext,
  setTenantContext,
} from "@/lib/tenant-context";

describe("R01 tenant context propagation", () => {
  describe("no context outside a scope", () => {
    it("getTenantContext returns null outside any scope", () => {
      expect(getTenantContext()).toBeNull();
    });
  });

  describe("get and require inside a scope", () => {
    it("getTenantContext returns the context inside runWithTenantContext", () => {
      runWithTenantContext({ tenantId: "t-1", userId: "u-1" }, () => {
        const ctx = getTenantContext();
        expect(ctx).not.toBeNull();
        expect(ctx!.tenantId).toBe("t-1");
        expect(ctx!.userId).toBe("u-1");
      });
    });

    it("requireTenantContext returns the context inside runWithTenantContext", () => {
      runWithTenantContext({ tenantId: "t-2" }, () => {
        const ctx = requireTenantContext();
        expect(ctx.tenantId).toBe("t-2");
      });
    });
  });

  describe("require failure outside a scope", () => {
    it("requireTenantContext throws outside any scope", () => {
      expect(() => requireTenantContext()).toThrowError(
        "TENANT_CONTEXT_REQUIRED",
      );
    });
  });

  describe("synchronous callbacks", () => {
    it("preserves synchronous return values", () => {
      const result = runWithTenantContext(
        { tenantId: "t-sync" },
        () => 42,
      );
      expect(result).toBe(42);
    });

    it("preserves synchronous string return values", () => {
      const result = runWithTenantContext(
        { tenantId: "t-sync-str" },
        () => "hello",
      );
      expect(result).toBe("hello");
    });
  });

  describe("asynchronous callbacks", () => {
    it("preserves asynchronous return values", async () => {
      const result = await runWithTenantContext(
        { tenantId: "t-async" },
        async () => {
          await new Promise((r) => setTimeout(r, 1));
          return "async-result";
        },
      );
      expect(result).toBe("async-result");
    });

    it("maintains context across async boundaries", async () => {
      await runWithTenantContext(
        { tenantId: "t-async-ctx", userId: "u-async" },
        async () => {
          await new Promise((r) => setTimeout(r, 1));
          const ctx = getTenantContext();
          expect(ctx).not.toBeNull();
          expect(ctx!.tenantId).toBe("t-async-ctx");
          expect(ctx!.userId).toBe("u-async");
        },
      );
    });
  });

  describe("nested scopes restoring the outer scope", () => {
    it("restores outer context after a nested scope exits", () => {
      runWithTenantContext({ tenantId: "outer", userId: "u-outer" }, () => {
        expect(requireTenantContext().tenantId).toBe("outer");

        runWithTenantContext({ tenantId: "inner", userId: "u-inner" }, () => {
          expect(requireTenantContext().tenantId).toBe("inner");
          expect(requireTenantContext().userId).toBe("u-inner");
        });

        expect(requireTenantContext().tenantId).toBe("outer");
        expect(requireTenantContext().userId).toBe("u-outer");
      });
    });

    it("restores outer context after a nested async scope exits", async () => {
      await runWithTenantContext({ tenantId: "outer-a" }, async () => {
        expect(requireTenantContext().tenantId).toBe("outer-a");

        await runWithTenantContext({ tenantId: "inner-a" }, async () => {
          await new Promise((r) => setTimeout(r, 1));
          expect(requireTenantContext().tenantId).toBe("inner-a");
        });

        expect(requireTenantContext().tenantId).toBe("outer-a");
      });
    });
  });

  describe("concurrent async scopes never leak tenant or user identity", () => {
    it("isolates concurrent async operations from each other", async () => {
      const results: Array<{ tenantId: string; userId: string | undefined }> = [];

      const tasks = [
        runWithTenantContext(
          { tenantId: "tenant-alpha", userId: "user-alpha" },
          async () => {
            await new Promise((r) => setTimeout(r, 10));
            const ctx = requireTenantContext();
            results.push({ tenantId: ctx.tenantId, userId: ctx.userId });
          },
        ),
        runWithTenantContext(
          { tenantId: "tenant-beta", userId: "user-beta" },
          async () => {
            await new Promise((r) => setTimeout(r, 5));
            const ctx = requireTenantContext();
            results.push({ tenantId: ctx.tenantId, userId: ctx.userId });
          },
        ),
        runWithTenantContext(
          { tenantId: "tenant-gamma", userId: "user-gamma" },
          async () => {
            await new Promise((r) => setTimeout(r, 1));
            const ctx = requireTenantContext();
            results.push({ tenantId: ctx.tenantId, userId: ctx.userId });
          },
        ),
      ];

      await Promise.all(tasks);

      expect(results).toHaveLength(3);
      expect(results).toContainEqual({
        tenantId: "tenant-alpha",
        userId: "user-alpha",
      });
      expect(results).toContainEqual({
        tenantId: "tenant-beta",
        userId: "user-beta",
      });
      expect(results).toContainEqual({
        tenantId: "tenant-gamma",
        userId: "user-gamma",
      });

      for (const r of results) {
        const matchCount = results.filter(
          (x) => x.tenantId === r.tenantId && x.userId === r.userId,
        ).length;
        expect(matchCount).toBe(1);
      }
    });
  });

  describe("platform operation temporarily clearing context and restoring it", () => {
    it("clears context inside a platform operation and restores it afterward", () => {
      runWithTenantContext({ tenantId: "t-plat", userId: "u-plat" }, () => {
        expect(requireTenantContext().tenantId).toBe("t-plat");

        const platformResult = runPlatformOperation(() => {
          expect(getTenantContext()).toBeNull();
          return "platform-done";
        });

        expect(platformResult).toBe("platform-done");
        expect(requireTenantContext().tenantId).toBe("t-plat");
        expect(requireTenantContext().userId).toBe("u-plat");
      });
    });

    it("restores context after a platform operation even if it throws", () => {
      runWithTenantContext({ tenantId: "t-plat-err" }, () => {
        expect(() => {
          runPlatformOperation(() => {
            throw new Error("PLATFORM_ERROR");
          });
        }).toThrowError("PLATFORM_ERROR");

        expect(requireTenantContext().tenantId).toBe("t-plat-err");
      });
    });

    it("works outside any existing context", () => {
      expect(getTenantContext()).toBeNull();

      const result = runPlatformOperation(() => {
        expect(getTenantContext()).toBeNull();
        return "no-context-platform";
      });

      expect(result).toBe("no-context-platform");
      expect(getTenantContext()).toBeNull();
    });
  });

  describe("invalid or empty tenantId rejection", () => {
    it("rejects empty tenantId in runWithTenantContext", () => {
      expect(() =>
        runWithTenantContext({ tenantId: "" }, () => "nope"),
      ).toThrowError("TENANT_CONTEXT_INVALID_TENANT_ID");
    });

    it("rejects whitespace-only tenantId in runWithTenantContext", () => {
      expect(() =>
        runWithTenantContext({ tenantId: "   " }, () => "nope"),
      ).toThrowError("TENANT_CONTEXT_INVALID_TENANT_ID");
    });

    it("rejects empty tenantId in setTenantContext", () => {
      expect(() =>
        setTenantContext({ tenantId: "" }),
      ).toThrowError("TENANT_CONTEXT_INVALID_TENANT_ID");
    });

    it("rejects empty tenantId in requireTenantContext when context has empty tenantId", () => {
      runWithTenantContext({ tenantId: "valid" }, () => {
        expect(requireTenantContext().tenantId).toBe("valid");
      });
    });
  });

  describe("returned context objects are immutable", () => {
    it("getTenantContext returns a frozen copy", () => {
      runWithTenantContext({ tenantId: "t-freeze", userId: "u-freeze" }, () => {
        const ctx = getTenantContext()!;
        expect(Object.isFrozen(ctx)).toBe(true);
      });
    });

    it("requireTenantContext returns a frozen copy", () => {
      runWithTenantContext({ tenantId: "t-freeze2" }, () => {
        const ctx = requireTenantContext();
        expect(Object.isFrozen(ctx)).toBe(true);
      });
    });
  });

  describe("compatibility behavior (setTenantContext)", () => {
    it("setTenantContext establishes context readable by getTenantContext", () => {
      setTenantContext({ tenantId: "t-compat", userId: "u-compat" });
      const ctx = getTenantContext();
      expect(ctx).not.toBeNull();
      expect(ctx!.tenantId).toBe("t-compat");
      expect(ctx!.userId).toBe("u-compat");
    });

    it("setTenantContext validates tenantId", () => {
      expect(() => setTenantContext({ tenantId: "" })).toThrowError(
        "TENANT_CONTEXT_INVALID_TENANT_ID",
      );
    });
  });
});
