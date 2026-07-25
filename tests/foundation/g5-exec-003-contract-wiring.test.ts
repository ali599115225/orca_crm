import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type EligibleOperation = {
  contractId: string;
  operationId: string;
  method: string;
  handlerName?: string;
  source: string;
  routeOrContract: string;
  permissionKey: string;
  guard:
    | "runWithExec003DatabasePermission"
    | "runWithExec003CookiePermission"
    | "hasExec003DatabasePermission"
    | "assertExec003ServerActionPermission";
  legacyRolesToken: string;
};

type ExcludedOperation = {
  contractId: string;
  operationId: string;
  method: string;
  handlerName?: string;
  source: string;
  routeOrContract: string;
  permissionKey: string;
  boundary:
    | "SIGNED_BOUNDARY"
    | "DELEGATED_DATABASE_RBAC"
    | "SESSION_CLAIM_EXACT";
};

const ELIGIBLE_OPERATIONS: readonly EligibleOperation[] = [
  {
    contractId: "EXEC-003-C01",
    operationId: "EXEC-003-C01-O01",
    method: "POST",
    source: "app/api/properties/[id]/request-finance/route.ts",
    routeOrContract: "/api/properties/[id]/request-finance",
    permissionKey: "properties.finance_request.create",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C03",
    operationId: "EXEC-003-C03-O01",
    method: "POST",
    source: "app/api/v1/contracts/[id]/cancel/route.ts",
    routeOrContract: "/api/v1/contracts/[id]/cancel",
    permissionKey: "contracts.cancel.execute",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "CONTRACT_WRITE_ROLES",
  },
  {
    contractId: "EXEC-003-C04",
    operationId: "EXEC-003-C04-O01",
    method: "GET",
    source: "app/api/v1/contracts/[id]/invoices/route.ts",
    routeOrContract: "/api/v1/contracts/[id]/invoices",
    permissionKey: "contracts.invoices.read",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C04",
    operationId: "EXEC-003-C04-O02",
    method: "POST",
    source: "app/api/v1/contracts/[id]/invoices/route.ts",
    routeOrContract: "/api/v1/contracts/[id]/invoices",
    permissionKey: "contracts.invoices.issue",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C05",
    operationId: "EXEC-003-C05-O01",
    method: "GET",
    source: "app/api/v1/contracts/[id]/payment-plan/route.ts",
    routeOrContract: "/api/v1/contracts/[id]/payment-plan",
    permissionKey: "contracts.payment_plan.read",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "TENANT_ROLES",
  },
  {
    contractId: "EXEC-003-C05",
    operationId: "EXEC-003-C05-O02",
    method: "PUT",
    source: "app/api/v1/contracts/[id]/payment-plan/route.ts",
    routeOrContract: "/api/v1/contracts/[id]/payment-plan",
    permissionKey: "contracts.payment_plan.update",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "CONTRACT_WRITE_ROLES",
  },
  {
    contractId: "EXEC-003-C05",
    operationId: "EXEC-003-C05-O03",
    method: "POST",
    source: "app/api/v1/contracts/[id]/payment-plan/route.ts",
    routeOrContract: "/api/v1/contracts/[id]/payment-plan",
    permissionKey: "contracts.payment_plan.create",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "CONTRACT_WRITE_ROLES",
  },
  {
    contractId: "EXEC-003-C06",
    operationId: "EXEC-003-C06-O01",
    method: "POST",
    source: "app/api/v1/contracts/[id]/restructure/route.ts",
    routeOrContract: "/api/v1/contracts/[id]/restructure",
    permissionKey: "contracts.payment_plan.restructure",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "CONTRACT_WRITE_ROLES",
  },
  {
    contractId: "EXEC-003-C07",
    operationId: "EXEC-003-C07-O01",
    method: "POST",
    source: "app/api/v1/contracts/[id]/sign/route.ts",
    routeOrContract: "/api/v1/contracts/[id]/sign",
    permissionKey: "contracts.sign.execute",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "CONTRACT_WRITE_ROLES",
  },
  {
    contractId: "EXEC-003-C08",
    operationId: "EXEC-003-C08-O01",
    method: "POST",
    source: "app/api/v1/invoices/[id]/paylink/create/route.ts",
    routeOrContract: "/api/v1/invoices/[id]/paylink/create",
    permissionKey: "invoices.paylink.create",
    guard: "hasExec003DatabasePermission",
    legacyRolesToken: '["ADMIN", "SALES_MANAGER"]',
  },
  {
    contractId: "EXEC-003-C10",
    operationId: "EXEC-003-C10-O01",
    method: "POST",
    source: "app/api/v1/leases/[id]/invoices/route.ts",
    routeOrContract: "/api/v1/leases/[id]/invoices",
    permissionKey: "leases.invoices.create",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C11",
    operationId: "EXEC-003-C11-O01",
    method: "GET",
    source: "app/api/v1/settings/leads-webhook/route.ts",
    routeOrContract: "/api/v1/settings/leads-webhook",
    permissionKey: "settings.leads_webhook.read",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "ACCOUNTING_WRITE_ROLES",
  },
  {
    contractId: "EXEC-003-C11",
    operationId: "EXEC-003-C11-O02",
    method: "POST",
    source: "app/api/v1/settings/leads-webhook/route.ts",
    routeOrContract: "/api/v1/settings/leads-webhook",
    permissionKey: "settings.leads_webhook.rotate",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "ACCOUNTING_WRITE_ROLES",
  },
  {
    contractId: "EXEC-003-C12",
    operationId: "EXEC-003-C12-O01",
    method: "GET",
    source: "app/api/v1/accounting/journal-entries/[id]/route.ts",
    routeOrContract: "/api/v1/accounting/journal-entries/[id]",
    permissionKey: "accounting.journal_entries.read",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "TENANT_ROLES",
  },
  {
    contractId: "EXEC-003-C12",
    operationId: "EXEC-003-C12-O02",
    method: "POST",
    source: "app/api/v1/accounting/journal-entries/[id]/route.ts",
    routeOrContract: "/api/v1/accounting/journal-entries/[id]",
    permissionKey: "accounting.journal_entries.reverse",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "ACCOUNTING_WRITE_ROLES",
  },
  {
    contractId: "EXEC-003-C13",
    operationId: "EXEC-003-C13-O01",
    method: "POST",
    source: "app/api/v1/accounting/seed/route.ts",
    routeOrContract: "/api/v1/accounting/seed",
    permissionKey: "accounting.seed.execute",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "ACCOUNTING_WRITE_ROLES",
  },
  {
    contractId: "EXEC-003-C14",
    operationId: "EXEC-003-C14-O01",
    method: "GET",
    source: "app/api/v1/automation/workflows/route.ts",
    routeOrContract: "/api/v1/automation/workflows",
    permissionKey: "automation.workflows.read",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C14",
    operationId: "EXEC-003-C14-O02",
    method: "POST",
    source: "app/api/v1/automation/workflows/route.ts",
    routeOrContract: "/api/v1/automation/workflows",
    permissionKey: "automation.workflows.create",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C15",
    operationId: "EXEC-003-C15-O01",
    method: "GET",
    source: "app/api/v1/maintenance/route.ts",
    routeOrContract: "/api/v1/maintenance",
    permissionKey: "maintenance.tickets.read",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C15",
    operationId: "EXEC-003-C15-O02",
    method: "POST",
    source: "app/api/v1/maintenance/route.ts",
    routeOrContract: "/api/v1/maintenance",
    permissionKey: "maintenance.tickets.create",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C16",
    operationId: "EXEC-003-C16-O01",
    method: "PATCH",
    source: "app/api/v1/maintenance/[id]/route.ts",
    routeOrContract: "/api/v1/maintenance/[id]",
    permissionKey: "maintenance.tickets.update",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C20",
    operationId: "EXEC-003-C20-O01",
    method: "GET",
    source: "app/api/v1/accounting/payables/route.ts",
    routeOrContract: "/api/v1/accounting/payables",
    permissionKey: "accounting.payables.read",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C21",
    operationId: "EXEC-003-C21-O01",
    method: "GET",
    source: "app/api/v1/contracts/[id]/pdf/route.ts",
    routeOrContract: "/api/v1/contracts/[id]/pdf",
    permissionKey: "contracts.pdf.read",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C22",
    operationId: "EXEC-003-C22-O01",
    method: "GET",
    source: "app/api/v1/invoices/[id]/paylink/status/route.ts",
    routeOrContract: "/api/v1/invoices/[id]/paylink/status",
    permissionKey: "invoices.paylink_status.read",
    guard: "runWithExec003DatabasePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C23",
    operationId: "EXEC-003-C23-O01",
    method: "GET",
    source: "app/api/v1/invoices/[id]/pdf/route.ts",
    routeOrContract: "/api/v1/invoices/[id]/pdf",
    permissionKey: "invoices.pdf.read",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C24",
    operationId: "EXEC-003-C24-O01",
    method: "GET",
    source: "app/api/v1/invoices/[id]/qr/route.ts",
    routeOrContract: "/api/v1/invoices/[id]/qr",
    permissionKey: "invoices.qr.read",
    guard: "runWithExec003CookiePermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
  {
    contractId: "EXEC-003-C25",
    operationId: "EXEC-003-C25-O01",
    method: "INVOKE",
    handlerName: "getRentalContractsAction",
    source: "app/actions/rentals.ts",
    routeOrContract:
      "SERVER_ACTION:app/actions/rentals.ts:getRentalContractsAction",
    permissionKey: "rentals.contracts.read",
    guard: "assertExec003ServerActionPermission",
    legacyRolesToken: "EXEC_003_DATABASE_ROLES",
  },
] as const;

const EXCLUDED_OPERATIONS: readonly ExcludedOperation[] = [
  {
    contractId: "EXEC-003-C02",
    operationId: "EXEC-003-C02-O01",
    method: "POST",
    source: "app/api/revenue-integrity/webhook/[provider]/route.ts",
    routeOrContract: "/api/revenue-integrity/webhook/[provider]",
    permissionKey: "revenue.webhook.ingest",
    boundary: "SIGNED_BOUNDARY",
  },
  {
    contractId: "EXEC-003-C09",
    operationId: "EXEC-003-C09-O01",
    method: "POST",
    source: "app/api/v1/leads/webhook/route.ts",
    routeOrContract: "/api/v1/leads/webhook",
    permissionKey: "leads.webhook.ingest",
    boundary: "SIGNED_BOUNDARY",
  },
  {
    contractId: "EXEC-003-C17",
    operationId: "EXEC-003-C17-O01",
    method: "INVOKE",
    handlerName: "generateAIInsight",
    source: "app/actions/aiClient.ts",
    routeOrContract: "SERVER_ACTION:app/actions/aiClient.ts:generateAIInsight",
    permissionKey: "ai.lead_insight.generate",
    boundary: "DELEGATED_DATABASE_RBAC",
  },
  {
    contractId: "EXEC-003-C18",
    operationId: "EXEC-003-C18-O01",
    method: "INVOKE",
    handlerName: "clearSystemLogsAction",
    source: "app/actions/logs.ts",
    routeOrContract:
      "SERVER_ACTION:app/actions/logs.ts:clearSystemLogsAction",
    permissionKey: "system.logs.clear",
    boundary: "SESSION_CLAIM_EXACT",
  },
  {
    contractId: "EXEC-003-C19",
    operationId: "EXEC-003-C19-O01",
    method: "INVOKE",
    handlerName: "triggerMockErrorAction",
    source: "app/actions/logs.ts",
    routeOrContract:
      "SERVER_ACTION:app/actions/logs.ts:triggerMockErrorAction",
    permissionKey: "system.logs.mock_error",
    boundary: "SESSION_CLAIM_EXACT",
  },
] as const;

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function handlerSource(
  content: string,
  operation: Pick<EligibleOperation | ExcludedOperation, "method" | "handlerName">,
): string {
  const signature =
    operation.method === "INVOKE"
      ? `export async function ${operation.handlerName}`
      : `export async function ${operation.method}`;
  const start = content.indexOf(signature);
  expect(start, `${signature} must exist`).toBeGreaterThanOrEqual(0);
  const next = content.indexOf("\nexport async function ", start + signature.length);
  return content.slice(start, next === -1 ? content.length : next);
}

describe("EXEC-003 v2 contract wiring direct evidence", () => {
  it("accounts for exactly 32 frozen operations: 27 eligible and 5 excluded", () => {
    expect(ELIGIBLE_OPERATIONS).toHaveLength(27);
    expect(EXCLUDED_OPERATIONS).toHaveLength(5);
    expect(ELIGIBLE_OPERATIONS.length + EXCLUDED_OPERATIONS.length).toBe(32);
    expect(
      new Set(
        [...ELIGIBLE_OPERATIONS, ...EXCLUDED_OPERATIONS].map(
          (operation) => operation.operationId,
        ),
      ).size,
    ).toBe(32);
  });

  it.each(ELIGIBLE_OPERATIONS)(
    "$operationId wires $permissionKey through $guard with a static key",
    (operation) => {
      const content = readSource(operation.source);
      const handler = handlerSource(content, operation);

      expect(handler).toContain(operation.guard);
      expect(handler).toContain(`"${operation.permissionKey}"`);
      expect(handler).toContain(operation.legacyRolesToken);
      expect(handler.indexOf(operation.guard)).toBeLessThan(
        handler.indexOf(`"${operation.permissionKey}"`),
      );

      expect(handler).not.toMatch(/permissionKey\s*[:=]\s*(body|request|headers|searchParams)/);
      expect(handler).not.toMatch(/request\.(json|formData)\(\)[\s\S]{0,160}permission/i);
      expect(handler).not.toMatch(/headers\.get\([^)]*permission/i);
      expect(handler).not.toMatch(/searchParams\.get\([^)]*permission/i);
    },
  );

  it("keeps cookie-only legacy contracts on the cookie-only guard", () => {
    const cookieOperations = ELIGIBLE_OPERATIONS.filter(
      (operation) => operation.guard === "runWithExec003CookiePermission",
    );
    expect(cookieOperations).toHaveLength(12);

    for (const operation of cookieOperations) {
      const handler = handlerSource(readSource(operation.source), operation);
      expect(handler).toContain("runWithExec003CookiePermission");
      expect(handler).not.toContain("runWithExec003DatabasePermission");
    }
  });

  it("keeps every eligible route scoped to the authorized session or tenant context", () => {
    for (const operation of ELIGIBLE_OPERATIONS) {
      const handler = handlerSource(readSource(operation.source), operation);
      expect(
        handler.includes("session.tenantId") ||
          operation.guard.startsWith("runWithExec003"),
        `${operation.operationId} must retain tenant scope`,
      ).toBe(true);
    }
  });
});

describe("EXEC-003 v2 excluded boundary preservation", () => {
  it.each(EXCLUDED_OPERATIONS)(
    "$operationId preserves $boundary for $routeOrContract",
    (operation) => {
      const content = readSource(operation.source);
      const handler = handlerSource(content, operation);
      expect(content).not.toContain("@/lib/auth/exec-003-shared-guard");

      if (operation.boundary === "SIGNED_BOUNDARY") {
        if (operation.contractId === "EXEC-003-C02") {
          expect(handler).toContain("verifyAndStoreProviderWebhook");
          expect(handler).toContain("INVALID_SIGNATURE");
        } else {
          expect(content).toContain("createHmac");
          expect(content).toContain("timingSafeEqual");
          expect(handler).toContain("signature verification failed");
          expect(handler).toContain("replay detected");
        }
      }

      if (operation.boundary === "DELEGATED_DATABASE_RBAC") {
        expect(handler).toContain("analyzeLeadAI");
        const serverBoundary = readSource("app/actions/aiActions.ts");
        const accessBoundary = readSource("lib/agents/access.ts");
        expect(serverBoundary).toContain("requireAgentAccess");
        expect(serverBoundary).toContain("AGENT_READ_ROLES");
        expect(accessBoundary).toContain("prisma.user.findFirst");
        expect(accessBoundary).toContain("isActive: true");
      }

      if (operation.boundary === "SESSION_CLAIM_EXACT") {
        expect(handler).toContain('session.role !== "Admin"');
        expect(handler).not.toContain('session.role !== "ADMIN"');
      }
    },
  );

  it("defines five excluded operations, not five boundary types", () => {
    expect(EXCLUDED_OPERATIONS).toHaveLength(5);
    expect(new Set(EXCLUDED_OPERATIONS.map((item) => item.contractId)).size).toBe(5);
    expect(new Set(EXCLUDED_OPERATIONS.map((item) => item.boundary)).size).toBe(3);
  });
});
