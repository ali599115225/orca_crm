import { describe, expect, it } from "vitest";
import {
  applyTenantIsolationToQuery,
  TENANT_CONTEXT_REQUIRED_ERROR,
} from "@/lib/tenant-prisma-enforcement";

const CONTEXT = {
  tenantId: "tenant-a",
  userId: "user-a",
} as const;

const NON_TENANT_MODEL = "RateLimitEntry";
const OPTIONAL_MODEL = "SentinelIncident";
const REQUIRED_MODEL = "Lead";

describe("R01 Prisma tenant enforcement helper", () => {
  describe("read operations", () => {
    it("injects tenantId into findUnique and replaces caller tenantId", () => {
      const args = applyTenantIsolationToQuery(
        { where: { id: "lead-1", tenantId: "tenant-b" } },
        { model: REQUIRED_MODEL, operation: "findUnique", context: CONTEXT, failClosed: false },
      );
      expect(args).toEqual({ where: { id: "lead-1", tenantId: "tenant-a" } });
    });

    it("injects tenantId into findUniqueOrThrow", () => {
      const args = applyTenantIsolationToQuery(
        { where: { id: "lead-1" } },
        { model: REQUIRED_MODEL, operation: "findUniqueOrThrow", context: CONTEXT, failClosed: false },
      );
      expect(args).toEqual({ where: { id: "lead-1", tenantId: "tenant-a" } });
    });

    it("injects tenantId into findFirst and findFirstOrThrow", () => {
      expect(
        applyTenantIsolationToQuery(
          { where: { status: "OPEN" } },
          { model: REQUIRED_MODEL, operation: "findFirst", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({ where: { status: "OPEN", tenantId: "tenant-a" } });

      expect(
        applyTenantIsolationToQuery(
          { where: { status: "OPEN" } },
          { model: REQUIRED_MODEL, operation: "findFirstOrThrow", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({ where: { status: "OPEN", tenantId: "tenant-a" } });
    });

    it("injects tenantId into findMany", () => {
      expect(
        applyTenantIsolationToQuery(
          { where: { status: "ACTIVE" }, take: 10 },
          { model: "Task", operation: "findMany", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({ where: { status: "ACTIVE", tenantId: "tenant-a" }, take: 10 });
    });

    it("injects tenantId into count", () => {
      expect(
        applyTenantIsolationToQuery(
          { where: { status: "ACTIVE" } },
          { model: "Lead", operation: "count", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({ where: { status: "ACTIVE", tenantId: "tenant-a" } });
    });

    it("injects tenantId into aggregate and groupBy", () => {
      expect(
        applyTenantIsolationToQuery(
          { _count: true },
          { model: "RevenueAuditEntry", operation: "aggregate", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({ _count: true, where: { tenantId: "tenant-a" } });

      expect(
        applyTenantIsolationToQuery(
          { by: ["status"], where: { tenantId: "tenant-b" } },
          { model: "RevenueOutboxMessage", operation: "groupBy", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({ by: ["status"], where: { tenantId: "tenant-a" } });
    });
  });

  describe("write operations", () => {
    it("overrides caller-supplied tenantId on create", () => {
      expect(
        applyTenantIsolationToQuery(
          { data: { tenantId: "tenant-b", title: "Lead" } },
          { model: REQUIRED_MODEL, operation: "create", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({ data: { tenantId: "tenant-a", title: "Lead" } });
    });

    it("overrides caller-supplied tenantId on createMany with array data", () => {
      expect(
        applyTenantIsolationToQuery(
          { data: [{ tenantId: "tenant-b", phone: "1" }, { phone: "2" }] },
          { model: "WhatsAppContact", operation: "createMany", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({
        data: [
          { tenantId: "tenant-a", phone: "1" },
          { tenantId: "tenant-a", phone: "2" },
        ],
      });
    });

    it("overrides caller-supplied tenantId on createMany with object data", () => {
      expect(
        applyTenantIsolationToQuery(
          { data: { tenantId: "tenant-b", phone: "1" } },
          { model: "WhatsAppContact", operation: "createMany", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({ data: { tenantId: "tenant-a", phone: "1" } });
    });

    it("injects tenantId into update where and data", () => {
      expect(
        applyTenantIsolationToQuery(
          { where: { id: "plan-1" }, data: { tenantId: "tenant-b", status: "ACTIVE" } },
          { model: "PaymentPlan", operation: "update", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({
        where: { id: "plan-1", tenantId: "tenant-a" },
        data: { tenantId: "tenant-a", status: "ACTIVE" },
      });
    });

    it("injects tenantId into updateMany where and data", () => {
      expect(
        applyTenantIsolationToQuery(
          { where: { id: "risk-1" }, data: { tenantId: "tenant-b", status: "RESOLVED" } },
          { model: "RevenueRiskSignal", operation: "updateMany", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({
        where: { id: "risk-1", tenantId: "tenant-a" },
        data: { tenantId: "tenant-a", status: "RESOLVED" },
      });
    });

    it("injects tenantId into upsert where, create, and update", () => {
      expect(
        applyTenantIsolationToQuery(
          {
            where: { id: "plan-1" },
            create: { tenantId: "tenant-b", contractId: "contract-1" },
            update: { tenantId: "tenant-b", status: "DRAFT" },
          },
          { model: "PaymentPlan", operation: "upsert", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({
        where: { id: "plan-1", tenantId: "tenant-a" },
        create: { tenantId: "tenant-a", contractId: "contract-1" },
        update: { tenantId: "tenant-a", status: "DRAFT" },
      });
    });

    it("injects tenantId into delete", () => {
      expect(
        applyTenantIsolationToQuery(
          { where: { id: "msg-1" } },
          { model: "WhatsAppMessage", operation: "delete", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({ where: { id: "msg-1", tenantId: "tenant-a" } });
    });

    it("injects tenantId into deleteMany", () => {
      expect(
        applyTenantIsolationToQuery(
          { where: { status: "OPEN" } },
          { model: "Task", operation: "deleteMany", context: CONTEXT, failClosed: false },
        ),
      ).toEqual({ where: { status: "OPEN", tenantId: "tenant-a" } });
    });
  });

  describe("model policy filtering", () => {
    it("does not touch optional tenant models", () => {
      const args = { where: { id: "incident-1" }, data: { status: "OPEN" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: OPTIONAL_MODEL,
          operation: "update",
          context: CONTEXT,
          failClosed: false,
        }),
      ).toBe(args);
    });

    it("does not touch non-tenant models", () => {
      const args = { where: { key: "abc" }, data: { count: 5 } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: NON_TENANT_MODEL,
          operation: "update",
          context: CONTEXT,
          failClosed: false,
        }),
      ).toBe(args);
    });

    it("does not inject into non-tenant model reads", () => {
      const args = { where: { key: "abc" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: NON_TENANT_MODEL,
          operation: "findMany",
          context: CONTEXT,
          failClosed: false,
        }),
      ).toBe(args);
    });

    it("does not inject into non-tenant model creates", () => {
      const args = { data: { key: "abc", count: 1 } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: NON_TENANT_MODEL,
          operation: "create",
          context: CONTEXT,
          failClosed: false,
        }),
      ).toBe(args);
    });
  });

  describe("missing context with failClosed=false", () => {
    it("passes args through unchanged for reads", () => {
      const args = { where: { id: "lead-1" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: REQUIRED_MODEL,
          operation: "findUnique",
          context: null,
          failClosed: false,
        }),
      ).toBe(args);
    });

    it("passes args through unchanged for create", () => {
      const args = { data: { title: "Lead" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: REQUIRED_MODEL,
          operation: "create",
          context: null,
          failClosed: false,
        }),
      ).toBe(args);
    });

    it("passes args through unchanged for createMany", () => {
      const args = { data: [{ phone: "1" }] };
      expect(
        applyTenantIsolationToQuery(args, {
          model: REQUIRED_MODEL,
          operation: "createMany",
          context: null,
          failClosed: false,
        }),
      ).toBe(args);
    });

    it("passes args through unchanged for update", () => {
      const args = { where: { id: "x" }, data: { status: "DONE" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: REQUIRED_MODEL,
          operation: "update",
          context: null,
          failClosed: false,
        }),
      ).toBe(args);
    });

    it("passes args through unchanged for upsert", () => {
      const args = { where: { id: "x" }, create: { title: "T" }, update: { title: "U" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: REQUIRED_MODEL,
          operation: "upsert",
          context: null,
          failClosed: false,
        }),
      ).toBe(args);
    });

    it("passes args through unchanged for delete", () => {
      const args = { where: { id: "x" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: REQUIRED_MODEL,
          operation: "delete",
          context: null,
          failClosed: false,
        }),
      ).toBe(args);
    });
  });

  describe("failClosed=true", () => {
    it("throws the fixed error for required models without context", () => {
      expect(() =>
        applyTenantIsolationToQuery(
          { where: { id: "lead-1" } },
          { model: REQUIRED_MODEL, operation: "findFirst", context: null, failClosed: true },
        ),
      ).toThrowError(TENANT_CONTEXT_REQUIRED_ERROR);
    });

    it("does not throw for optional models without context", () => {
      const args = { where: { id: "incident-1" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: OPTIONAL_MODEL,
          operation: "findFirst",
          context: null,
          failClosed: true,
        }),
      ).toBe(args);
    });

    it("does not throw for non-tenant models without context", () => {
      const args = { where: { key: "abc" } };
      expect(
        applyTenantIsolationToQuery(args, {
          model: NON_TENANT_MODEL,
          operation: "findFirst",
          context: null,
          failClosed: true,
        }),
      ).toBe(args);
    });
  });

  describe("undefined argument containers", () => {
    it("handles undefined args for reads", () => {
      const args = applyTenantIsolationToQuery(undefined, {
        model: REQUIRED_MODEL,
        operation: "findMany",
        context: CONTEXT,
        failClosed: false,
      });
      expect(args).toEqual({ where: { tenantId: "tenant-a" } });
    });

    it("handles undefined args for create", () => {
      const args = applyTenantIsolationToQuery(undefined, {
        model: REQUIRED_MODEL,
        operation: "create",
        context: CONTEXT,
        failClosed: false,
      });
      expect(args).toEqual({ data: { tenantId: "tenant-a" } });
    });

    it("handles undefined where on reads", () => {
      const args = applyTenantIsolationToQuery(
        { select: { id: true } },
        { model: REQUIRED_MODEL, operation: "findMany", context: CONTEXT, failClosed: false },
      );
      expect(args).toEqual({ select: { id: true }, where: { tenantId: "tenant-a" } });
    });

    it("handles undefined data on create", () => {
      const args = applyTenantIsolationToQuery(
        { select: { id: true } },
        { model: REQUIRED_MODEL, operation: "create", context: CONTEXT, failClosed: false },
      );
      expect(args).toEqual({ select: { id: true }, data: { tenantId: "tenant-a" } });
    });

    it("handles undefined create and update on upsert", () => {
      const args = applyTenantIsolationToQuery(
        { where: { id: "x" } },
        { model: REQUIRED_MODEL, operation: "upsert", context: CONTEXT, failClosed: false },
      );
      expect(args).toEqual({
        where: { id: "x", tenantId: "tenant-a" },
        create: { tenantId: "tenant-a" },
        update: { tenantId: "tenant-a" },
      });
    });

    it("handles undefined data on update", () => {
      const args = applyTenantIsolationToQuery(
        { where: { id: "x" } },
        { model: REQUIRED_MODEL, operation: "update", context: CONTEXT, failClosed: false },
      );
      expect(args).toEqual({
        where: { id: "x", tenantId: "tenant-a" },
        data: { tenantId: "tenant-a" },
      });
    });

    it("handles undefined data on updateMany", () => {
      const args = applyTenantIsolationToQuery(
        { where: { status: "OPEN" } },
        { model: REQUIRED_MODEL, operation: "updateMany", context: CONTEXT, failClosed: false },
      );
      expect(args).toEqual({
        where: { status: "OPEN", tenantId: "tenant-a" },
        data: { tenantId: "tenant-a" },
      });
    });
  });

  describe("no mutation of original args", () => {
    it("does not mutate the original args object", () => {
      const original = { where: { id: "lead-1", tenantId: "tenant-b" } };
      const snapshot = JSON.parse(JSON.stringify(original));
      applyTenantIsolationToQuery(original, {
        model: REQUIRED_MODEL,
        operation: "findUnique",
        context: CONTEXT,
        failClosed: false,
      });
      expect(original).toEqual(snapshot);
    });

    it("does not mutate original data on create", () => {
      const original = { data: { tenantId: "tenant-b", title: "Lead" } };
      const snapshot = JSON.parse(JSON.stringify(original));
      applyTenantIsolationToQuery(original, {
        model: REQUIRED_MODEL,
        operation: "create",
        context: CONTEXT,
        failClosed: false,
      });
      expect(original).toEqual(snapshot);
    });

    it("does not mutate original createMany array data", () => {
      const original = { data: [{ tenantId: "tenant-b", phone: "1" }, { phone: "2" }] };
      const snapshot = JSON.parse(JSON.stringify(original));
      applyTenantIsolationToQuery(original, {
        model: REQUIRED_MODEL,
        operation: "createMany",
        context: CONTEXT,
        failClosed: false,
      });
      expect(original).toEqual(snapshot);
    });

    it("does not mutate original upsert containers", () => {
      const original = {
        where: { id: "plan-1" },
        create: { tenantId: "tenant-b", contractId: "c1" },
        update: { tenantId: "tenant-b", status: "DRAFT" },
      };
      const snapshot = JSON.parse(JSON.stringify(original));
      applyTenantIsolationToQuery(original, {
        model: REQUIRED_MODEL,
        operation: "upsert",
        context: CONTEXT,
        failClosed: false,
      });
      expect(original).toEqual(snapshot);
    });
  });
});
