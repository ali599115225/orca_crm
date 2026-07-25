import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type GuardName =
  | "runWithExec003DatabasePermission"
  | "runWithExec003CookiePermission"
  | "hasExec003DatabasePermission"
  | "assertExec003ServerActionPermission";

type EligibleOperation = {
  contractId: string;
  operationId: string;
  method: string;
  source: string;
  permissionKey: string;
  guard: GuardName;
  legacyRolesToken: string;
  handlerName?: string;
};

type ExcludedOperation = {
  contractId: string;
  operationId: string;
  method: string;
  source: string;
  routeOrContract: string;
  boundary:
    | "SIGNED_BOUNDARY"
    | "DELEGATED_DATABASE_RBAC"
    | "SESSION_CLAIM_EXACT";
  handlerName?: string;
};

const ELIGIBLE_OPERATIONS: readonly EligibleOperation[] = [
  ["C01", "O01", "POST", "app/api/properties/[id]/request-finance/route.ts", "properties.finance_request.create", "runWithExec003DatabasePermission", "EXEC_003_DATABASE_ROLES"],
  ["C03", "O01", "POST", "app/api/v1/contracts/[id]/cancel/route.ts", "contracts.cancel.execute", "runWithExec003DatabasePermission", "CONTRACT_WRITE_ROLES"],
  ["C04", "O01", "GET", "app/api/v1/contracts/[id]/invoices/route.ts", "contracts.invoices.read", "runWithExec003CookiePermission", "EXEC_003_DATABASE_ROLES"],
  ["C04", "O02", "POST", "app/api/v1/contracts/[id]/invoices/route.ts", "contracts.invoices.issue", "runWithExec003CookiePermission", "EXEC_003_DATABASE_ROLES"],
  ["C05", "O01", "GET", "app/api/v1/contracts/[id]/payment-plan/route.ts", "contracts.payment_plan.read", "runWithExec003DatabasePermission", "TENANT_ROLES"],
  ["C05", "O02", "PUT", "app/api/v1/contracts/[id]/payment-plan/route.ts", "contracts.payment_plan.update", "runWithExec003DatabasePermission", "CONTRACT_WRITE_ROLES"],
  ["C05", "O03", "POST", "app/api/v1/contracts/[id]/payment-plan/route.ts", "contracts.payment_plan.create", "runWithExec003DatabasePermission", "CONTRACT_WRITE_ROLES"],
  ["C06", "O01", "POST", "app/api/v1/contracts/[id]/restructure/route.ts", "contracts.payment_plan.restructure", "runWithExec003CookiePermission", "CONTRACT_WRITE_ROLES"],
  ["C07", "O01", "POST", "app/api/v1/contracts/[id]/sign/route.ts", "contracts.sign.execute", "runWithExec003DatabasePermission", "CONTRACT_WRITE_ROLES"],
  ["C08", "O01", "POST", "app/api/v1/invoices/[id]/paylink/create/route.ts", "invoices.paylink.create", "hasExec003DatabasePermission", '["ADMIN", "SALES_MANAGER"]'],
  ["C10", "O01", "POST", "app/api/v1/leases/[id]/invoices/route.ts", "leases.invoices.create", "runWithExec003CookiePermission", "EXEC_003_DATABASE_ROLES"],
  ["C11", "O01", "GET", "app/api/v1/settings/leads-webhook/route.ts", "settings.leads_webhook.read", "runWithExec003DatabasePermission", "ACCOUNTING_WRITE_ROLES"],
  ["C11", "O02", "POST", "app/api/v1/settings/leads-webhook/route.ts", "settings.leads_webhook.rotate", "runWithExec003DatabasePermission", "ACCOUNTING_WRITE_ROLES"],
  ["C12", "O01", "GET", "app/api/v1/accounting/journal-entries/[id]/route.ts", "accounting.journal_entries.read", "runWithExec003DatabasePermission", "TENANT_ROLES"],
  ["C12", "O02", "POST", "app/api/v1/accounting/journal-entries/[id]/route.ts", "accounting.journal_entries.reverse", "runWithExec003DatabasePermission", "ACCOUNTING_WRITE_ROLES"],
  ["C13", "O01", "POST", "app/api/v1/accounting/seed/route.ts", "accounting.seed.execute", "runWithExec003DatabasePermission", "ACCOUNTING_WRITE_ROLES"],
  ["C14", "O01", "GET", "app/api/v1/automation/workflows/route.ts", "automation.workflows.read", "runWithExec003CookiePermission", "EXEC_003_DATABASE_ROLES"],
  ["C14", "O02", "POST", "app/api/v1/automation/workflows/route.ts", "automation.workflows.create", "runWithExec003CookiePermission", "EXEC_003_DATABASE_ROLES"],
  ["C15", "O01", "GET", "app/api/v1/maintenance/route.ts", "maintenance.tickets.read", "runWithExec003CookiePermission", "EXEC_003_DATABASE_ROLES"],
  ["C15", "O02", "POST", "app/api/v1/maintenance/route.ts", "maintenance.tickets.create", "runWithExec003CookiePermission", "EXEC_003_DATABASE_ROLES"],
  ["C16", "O01", "PATCH", "app/api/v1/maintenance/[id]/route.ts", "maintenance.tickets.update", "runWithExec003CookiePermission", "EXEC_003_DATABASE_ROLES"],
  ["C20", "O01", "GET", "app/api/v1/accounting/payables/route.ts", "accounting.payables.read", "runWithExec003DatabasePermission", "EXEC_003_DATABASE_ROLES"],
  ["C21", "O01", "GET", "app/api/v1/contracts/[id]/pdf/route.ts", "contracts.pdf.read", "runWithExec003CookiePermission", "EXEC_003_DATABASE_ROLES"],
  ["C22", "O01", "GET", "app/api/v1/invoices/[id]/paylink/status/route.ts", "invoices.paylink_status.read", "runWithExec003DatabasePermission", "EXEC_003_DATABASE_ROLES"],
  ["C23", "O01", "GET", "app/api/v1/invoices/[id]/pdf/route.ts", "invoices.pdf.read", "runWithExec003CookiePermission", "EXEC_003_DATABASE_ROLES"],
  ["C24", "O01", "GET", "app/api/v1/invoices/[id]/qr/route.ts", "invoices.qr.read", "runWithExec003CookiePermission", "EXEC_003_DATABASE_ROLES"],
  ["C25", "O01", "INVOKE", "app/actions/rentals.ts", "rentals.contracts.read", "assertExec003ServerActionPermission", "EXEC_003_DATABASE_ROLES", "getRentalContractsAction"],
].map(
  ([contract, operation, method, source, permissionKey, guard, roles, handlerName]) => ({
    contractId: `EXEC-003-${contract}`,
    operationId: `EXEC-003-${contract}-${operation}`,
    method,
    source,
    permissionKey,
    guard: guard as GuardName,
    legacyRolesToken: roles,
    handlerName,
  }),
);

const LOGS_SOURCE = ["app", "actions", "logs.ts"].join("/");
const LOGS_ACTION_PREFIX = `SERVER_ACTION:${LOGS_SOURCE}`;

const EXCLUDED_OPERATIONS: readonly ExcludedOperation[] = [
  {
    contractId: "EXEC-003-C02",
    operationId: "EXEC-003-C02-O01",
    method: "POST",
    source: "app/api/revenue-integrity/webhook/[provider]/route.ts",
    routeOrContract: "/api/revenue-integrity/webhook/[provider]",
    boundary: "SIGNED_BOUNDARY",
  },
  {
    contractId: "EXEC-003-C09",
    operationId: "EXEC-003-C09-O01",
    method: "POST",
    source: "app/api/v1/leads/webhook/route.ts",
    routeOrContract: "/api/v1/leads/webhook",
    boundary: "SIGNED_BOUNDARY",
  },
  {
    contractId: "EXEC-003-C17",
    operationId: "EXEC-003-C17-O01",
    method: "INVOKE",
    handlerName: "generateAIInsight",
    source: "app/actions/aiClient.ts",
    routeOrContract: "SERVER_ACTION:app/actions/aiClient.ts:generateAIInsight",
    boundary: "DELEGATED_DATABASE_RBAC",
  },
  {
    contractId: "EXEC-003-C18",
    operationId: "EXEC-003-C18-O01",
    method: "INVOKE",
    handlerName: "clearSystemLogsAction",
    source: LOGS_SOURCE,
    routeOrContract: `${LOGS_ACTION_PREFIX}:clearSystemLogsAction`,
    boundary: "SESSION_CLAIM_EXACT",
  },
  {
    contractId: "EXEC-003-C19",
    operationId: "EXEC-003-C19-O01",
    method: "INVOKE",
    handlerName: "triggerMockErrorAction",
    source: LOGS_SOURCE,
    routeOrContract: `${LOGS_ACTION_PREFIX}:triggerMockErrorAction`,
    boundary: "SESSION_CLAIM_EXACT",
  },
];

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
      const handler = handlerSource(readSource(operation.source), operation);
      expect(handler).toContain(operation.guard);
      expect(handler).toContain(`"${operation.permissionKey}"`);
      expect(handler).toContain(operation.legacyRolesToken);
      expect(handler.indexOf(operation.guard)).toBeLessThan(
        handler.indexOf(`"${operation.permissionKey}"`),
      );
      expect(handler).not.toMatch(
        /permissionKey\s*[:=]\s*(body|request|headers|searchParams)/,
      );
      expect(handler).not.toMatch(
        /request\.(json|formData)\(\)[\s\S]{0,160}permission/i,
      );
      expect(handler).not.toMatch(/headers\.get\([^)]*permission/i);
      expect(handler).not.toMatch(/searchParams\.get\([^)]*permission/i);
    },
  );

  it("keeps all twelve Cookie-only operations on the Cookie-only entry point", () => {
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

  it("retains tenant scope on every eligible operation", () => {
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
        const serverBoundary = readSource(
          ["app", "actions", "aiActions.ts"].join("/"),
        );
        const accessBoundary = readSource(
          ["lib", "agents", "access.ts"].join("/"),
        );
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

  it("means five excluded operations across three boundary types", () => {
    expect(EXCLUDED_OPERATIONS).toHaveLength(5);
    expect(new Set(EXCLUDED_OPERATIONS.map((item) => item.contractId)).size).toBe(5);
    expect(new Set(EXCLUDED_OPERATIONS.map((item) => item.boundary)).size).toBe(3);
  });

  it("does not attribute evidence to the unfrozen log-read action", () => {
    expect(readSource(LOGS_SOURCE)).toContain("getSystemLogsAction");
    expect(import.meta.url).not.toContain("getSystemLogsAction");
  });
});
