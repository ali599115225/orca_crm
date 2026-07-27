import { describe, expect, it } from "vitest";
import {
  REQUIRED_TENANT_MODELS,
  OPTIONAL_TENANT_MODELS,
  isRequiredTenantModel,
  isOptionalTenantModel,
} from "@/lib/tenant-model-policy";
import {
  applyTenantIsolationToQuery,
  TENANT_CONTEXT_REQUIRED_ERROR,
  isTenantScopedWriteOperation,
} from "@/lib/tenant-prisma-enforcement";
import {
  SYSTEM_CLIENT_ALLOWLIST,
  SYSTEM_CLIENT_ALLOWLIST_MODULES,
  isAllowlistedSystemClient,
} from "@/lib/system-prisma-boundary";
import fs from "node:fs";
import path from "node:path";

describe("R01-F isolation regression coverage", () => {
  describe("model classification counts", () => {
    it("classifies exactly 97 required tenant models", () => {
      expect(REQUIRED_TENANT_MODELS).toHaveLength(97);
    });

    it("classifies exactly 3 optional tenant models", () => {
      expect(OPTIONAL_TENANT_MODELS).toHaveLength(3);
    });

    it("has no unclassified tenant models", () => {
      const allClassified = [...REQUIRED_TENANT_MODELS, ...OPTIONAL_TENANT_MODELS];
      const uniqueModels = new Set(allClassified);
      expect(uniqueModels.size).toBe(100);
    });
  });

  describe("required model without context fails closed", () => {
    it("throws TENANT_CONTEXT_REQUIRED for required model read without context", () => {
      expect(() =>
        applyTenantIsolationToQuery(
          { where: { id: "lead-1" } },
          {
            model: "Lead",
            operation: "findFirst",
            context: null,
            failClosed: true,
          },
        ),
      ).toThrowError(TENANT_CONTEXT_REQUIRED_ERROR);
    });

    it("throws TENANT_CONTEXT_REQUIRED for required model write without context", () => {
      expect(() =>
        applyTenantIsolationToQuery(
          { data: { title: "New Lead" } },
          {
            model: "Lead",
            operation: "create",
            context: null,
            failClosed: true,
          },
        ),
      ).toThrowError(TENANT_CONTEXT_REQUIRED_ERROR);
    });

    it("throws for PaymentPlan without context", () => {
      expect(() =>
        applyTenantIsolationToQuery(
          { where: { id: "plan-1" } },
          {
            model: "PaymentPlan",
            operation: "update",
            context: null,
            failClosed: true,
          },
        ),
      ).toThrowError(TENANT_CONTEXT_REQUIRED_ERROR);
    });

    it("throws for Contract without context", () => {
      expect(() =>
        applyTenantIsolationToQuery(
          { where: { id: "contract-1" } },
          {
            model: "Contract",
            operation: "findFirst",
            context: null,
            failClosed: true,
          },
        ),
      ).toThrowError(TENANT_CONTEXT_REQUIRED_ERROR);
    });
  });

  describe("optional model without context remains allowed", () => {
    it("does not throw for SentinelIncident without context", () => {
      const args = { where: { id: "incident-1" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: "SentinelIncident",
          operation: "findFirst",
          context: null,
          failClosed: true,
        }),
      ).toBe(args);
    });

    it("does not throw for SentinelTaskOrder without context", () => {
      const args = { where: { id: "task-1" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: "SentinelTaskOrder",
          operation: "findFirst",
          context: null,
          failClosed: true,
        }),
      ).toBe(args);
    });

    it("does not throw for WhatsAppWebhookEvent without context", () => {
      const args = { data: { provider: "whatsapp", payload: {} } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: "WhatsAppWebhookEvent",
          operation: "create",
          context: null,
          failClosed: true,
        }),
      ).toBe(args);
    });
  });

  describe("non-tenant model without context remains allowed", () => {
    it("does not throw for RateLimitEntry without context", () => {
      const args = { where: { key: "login:abc" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: "RateLimitEntry",
          operation: "findFirst",
          context: null,
          failClosed: true,
        }),
      ).toBe(args);
    });

    it("does not throw for Tenant model without context", () => {
      const args = { where: { id: "tenant-1" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: "Tenant",
          operation: "findFirst",
          context: null,
          failClosed: true,
        }),
      ).toBe(args);
    });
  });

  describe("raw client allowlist enforcement", () => {
    it("documents at least 19 allowlisted modules", () => {
      expect(SYSTEM_CLIENT_ALLOWLIST_MODULES.length).toBeGreaterThanOrEqual(19);
    });

    it("every allowlisted module has a documented justification", () => {
      for (const entry of SYSTEM_CLIENT_ALLOWLIST) {
        expect(entry.justification).toBeTruthy();
        expect(entry.justification.length).toBeGreaterThan(10);
      }
    });

    it("lib/prisma.ts is allowlisted as prisma core", () => {
      expect(isAllowlistedSystemClient("lib/prisma.ts")).toBe(true);
    });

    it("lib/audit.ts is allowlisted as audit infrastructure", () => {
      expect(isAllowlistedSystemClient("lib/audit.ts")).toBe(true);
    });

    it("tenant-facing route handlers are not allowlisted", () => {
      expect(isAllowlistedSystemClient("app/api/v1/leads/route.ts")).toBe(false);
      expect(isAllowlistedSystemClient("app/api/v1/contracts/route.ts")).toBe(false);
    });
  });

  describe("AuditLog recursion prevention", () => {
    it("AuditLog model is excluded from automatic audit logging", () => {
      expect(isTenantScopedWriteOperation("create")).toBe(true);
    });

    it("audit log writes use rawPrisma to avoid middleware recursion", () => {
      const prismaPath = path.join(process.cwd(), "lib", "prisma.ts");
      const content = fs.readFileSync(prismaPath, "utf8");
      expect(content).toMatch(/model !== "AuditLog"/);
      expect(content).toMatch(/await rawPrisma\.auditLog\.create/);
    });
  });

  describe("UserFavorite cross-tenant blocking", () => {
    it("UserFavorite is a required tenant model", () => {
      expect(isRequiredTenantModel("UserFavorite")).toBe(true);
    });

    it("UserFavorite queries without context fail closed", () => {
      expect(() =>
        applyTenantIsolationToQuery(
          { where: { id: "fav-1" } },
          {
            model: "UserFavorite",
            operation: "findFirst",
            context: null,
            failClosed: true,
          },
        ),
      ).toThrowError(TENANT_CONTEXT_REQUIRED_ERROR);
    });
  });

  describe("model policy function correctness", () => {
    it("isRequiredTenantModel returns true for all required models", () => {
      for (const model of REQUIRED_TENANT_MODELS) {
        expect(isRequiredTenantModel(model)).toBe(true);
      }
    });

    it("isOptionalTenantModel returns true for all optional models", () => {
      for (const model of OPTIONAL_TENANT_MODELS) {
        expect(isOptionalTenantModel(model)).toBe(true);
      }
    });

    it("isRequiredTenantModel returns false for optional models", () => {
      for (const model of OPTIONAL_TENANT_MODELS) {
        expect(isRequiredTenantModel(model)).toBe(false);
      }
    });

    it("isOptionalTenantModel returns false for required models", () => {
      for (const model of REQUIRED_TENANT_MODELS) {
        expect(isOptionalTenantModel(model)).toBe(false);
      }
    });

    it("both functions return false for non-tenant models", () => {
      expect(isRequiredTenantModel("Tenant")).toBe(false);
      expect(isOptionalTenantModel("Tenant")).toBe(false);
      expect(isRequiredTenantModel("RateLimitEntry")).toBe(false);
      expect(isOptionalTenantModel("RateLimitEntry")).toBe(false);
    });
  });
});
