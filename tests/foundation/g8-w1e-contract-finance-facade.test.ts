import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  W1E_PERMISSION_CONTRACT,
  W1E_PERMISSION_KEYS,
  w1eRoleAllowsPermission,
  w1eRolesForPermission,
} from "@/lib/auth/w1e-contract-finance-permissions";

const ROOT = process.cwd();
const PERMISSION_SOURCE = readFileSync(
  join(ROOT, "lib", "auth", "w1e-contract-finance-permissions.ts"),
  "utf8",
);
const FACADE_SOURCE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "application-facade.ts"),
  "utf8",
);
const READ_MODEL_SOURCE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "read-model-service.ts"),
  "utf8",
);
const GATE_SOURCE = readFileSync(
  join(ROOT, "docs", "product-extension", "W1E_CONTRACT_FINANCE_FACADE_GATE.md"),
  "utf8",
);

describe("W1E contract / finance permission + application facade", () => {
  it("keeps the W1E permission contract typed, unique, and complete", () => {
    expect(W1E_PERMISSION_KEYS).toHaveLength(12);
    expect(new Set(W1E_PERMISSION_KEYS).size).toBe(W1E_PERMISSION_KEYS.length);
    expect(Object.keys(W1E_PERMISSION_CONTRACT)).toEqual([...W1E_PERMISSION_KEYS]);

    for (const key of W1E_PERMISSION_KEYS) {
      const definition = W1E_PERMISSION_CONTRACT[key];
      expect(definition.key).toBe(key);
      expect(definition.allowedRoles.length).toBeGreaterThan(0);
      expect(definition.description.length).toBeGreaterThan(20);
    }
  });

  it("gives MARKETING zero W1E permissions and READ_ONLY read permissions only", () => {
    for (const key of W1E_PERMISSION_KEYS) {
      expect(w1eRoleAllowsPermission("MARKETING", key)).toBe(false);
    }

    expect(w1eRoleAllowsPermission("READ_ONLY", "contract-studio.read")).toBe(true);
    expect(w1eRoleAllowsPermission("READ_ONLY", "finance-case.read")).toBe(true);

    for (const key of W1E_PERMISSION_KEYS.filter(
      (permission) => permission !== "contract-studio.read" && permission !== "finance-case.read",
    )) {
      expect(w1eRoleAllowsPermission("READ_ONLY", key)).toBe(false);
    }
  });

  it("keeps authoring and approval roles least-privilege under the current five-role model", () => {
    expect(w1eRoleAllowsPermission("SALES_EMPLOYEE", "contract-studio.draft-create")).toBe(true);
    expect(w1eRoleAllowsPermission("SALES_EMPLOYEE", "contract-studio.approval-request")).toBe(true);
    expect(w1eRoleAllowsPermission("SALES_EMPLOYEE", "finance-case.create")).toBe(true);

    expect(w1eRoleAllowsPermission("SALES_EMPLOYEE", "contract-studio.approval-decide")).toBe(false);
    expect(w1eRoleAllowsPermission("SALES_EMPLOYEE", "contract-studio.snapshot-issue")).toBe(false);
    expect(w1eRoleAllowsPermission("SALES_EMPLOYEE", "finance-case.offer-select")).toBe(false);
    expect(w1eRoleAllowsPermission("SALES_EMPLOYEE", "finance-case.authority-record")).toBe(false);

    for (const permission of [
      "contract-studio.approval-decide",
      "contract-studio.approval-finalize",
      "contract-studio.snapshot-issue",
    ] as const) {
      expect(w1eRolesForPermission(permission)).toEqual(["ADMIN"]);
    }

    expect(w1eRoleAllowsPermission("SALES_MANAGER", "finance-case.transition")).toBe(true);
    expect(w1eRoleAllowsPermission("SALES_MANAGER", "finance-case.offer-record")).toBe(true);
    expect(w1eRoleAllowsPermission("SALES_MANAGER", "finance-case.offer-select")).toBe(true);
    expect(w1eRoleAllowsPermission("SALES_MANAGER", "finance-case.authority-record")).toBe(true);
  });

  it("requires database-backed authorization with no elevated bypass", () => {
    expect(PERMISSION_SOURCE).toContain("await hasDatabaseRole(");
    expect(PERMISSION_SOURCE).toContain("W1E_UNAUTHORIZED");
    expect(PERMISSION_SOURCE).toContain("W1E_FORBIDDEN");
    expect(PERMISSION_SOURCE).not.toContain("isSuperAdmin(");
    expect(PERMISSION_SOURCE).not.toContain("isConfiguredSuperAdmin");
    expect(PERMISSION_SOURCE).not.toContain("assertServerActionRole(");
  });

  it("binds every facade operation to authorization and AsyncLocal tenant context", () => {
    expect(FACADE_SOURCE).toContain("const actor = await authorizeW1eActor(session, permissionKey)");
    expect(FACADE_SOURCE).toContain("return await runWithTenantContext(");
    expect(FACADE_SOURCE).toContain("{ tenantId: actor.tenantId, userId: actor.userId }");

    const exportedOperations = [
      "w1eListFinanceCases",
      "w1eGetFinanceCase",
      "w1eCreateFinanceCase",
      "w1eTransitionFinanceCase",
      "w1eRecordFinanceAuthorityEvidence",
      "w1eRecordProviderOffer",
      "w1eSelectProviderOffer",
      "w1eListContractDrafts",
      "w1eGetContractDraft",
      "w1eGetContractSnapshot",
      "w1eCreateContractDraft",
      "w1eRequestContractApproval",
      "w1eDecideContractApproval",
      "w1eFinalizeContractDraftApproval",
      "w1eIssueApprovedContractSnapshot",
    ];

    for (const operation of exportedOperations) {
      const start = FACADE_SOURCE.indexOf(`export async function ${operation}`);
      expect(start, `${operation} missing`).toBeGreaterThanOrEqual(0);
      const nextExport = FACADE_SOURCE.indexOf("export async function", start + 1);
      const source = FACADE_SOURCE.slice(start, nextExport === -1 ? undefined : nextExport);
      expect(source, `${operation} bypasses W1E authorization`).toContain("runAuthorizedW1eOperation(");
    }
  });

  it("removes tenant, actor, and snapshot contract binding from W1E write payload types", () => {
    expect(FACADE_SOURCE).toContain('CreateFinanceCaseInput,\n  "tenantId" | "createdBy"');
    expect(FACADE_SOURCE).toContain('RecordFinanceAuthorityInput,\n  "tenantId" | "financeCaseId" | "actorId"');
    expect(FACADE_SOURCE).toContain('RecordProviderOfferInput,\n  "tenantId" | "financeCaseId" | "actorId"');
    expect(FACADE_SOURCE).toContain('CreateContractDraftInput,\n  "tenantId" | "createdBy"');
    expect(FACADE_SOURCE).toContain('RequestContractApprovalInput,\n  "tenantId" | "draftId" | "requestedBy"');
    expect(FACADE_SOURCE).toContain('DecideContractApprovalInput,\n  "tenantId" | "approvalId" | "decidedBy"');
    expect(FACADE_SOURCE).toContain('ContractSnapshotIssueInput,\n  "tenantId" | "createdBy" | "contractId"');

    expect(FACADE_SOURCE).toContain("tenantId: actor.tenantId");
    expect(FACADE_SOURCE).toContain("createdBy: actor.userId");
    expect(FACADE_SOURCE).toContain("requestedBy: actor.userId");
    expect(FACADE_SOURCE).toContain("decidedBy: actor.userId");
    expect(FACADE_SOURCE).toContain("actorId: actor.userId");
  });

  it("delegates writes to W1B-W1D services instead of duplicating persistence logic", () => {
    for (const delegatedCall of [
      "createFinanceCase(",
      "transitionFinanceCaseInternalStatus(",
      "recordFinanceAuthorityEvidence(",
      "recordProviderOffer(",
      "selectProviderOffer(",
      "createContractDraft(",
      "requestContractApproval(",
      "decideContractApproval(",
      "finalizeContractDraftApproval(",
      "issueApprovedContractSnapshot(",
    ]) {
      expect(FACADE_SOURCE).toContain(delegatedCall);
    }

    expect(FACADE_SOURCE).not.toMatch(/\bprisma\./);
    expect(FACADE_SOURCE).not.toMatch(/\.(?:create|update|delete|upsert)\s*\(\s*\{/);
  });

  it("keeps read models tenant-scoped, bounded, and read-only", () => {
    expect(READ_MODEL_SOURCE).toContain("const MAX_LIST_LIMIT = 100");
    expect(READ_MODEL_SOURCE).toContain("Math.min(limit, MAX_LIST_LIMIT)");
    expect(READ_MODEL_SOURCE).toContain("const MAX_EVENT_LIMIT = 100");
    expect(READ_MODEL_SOURCE).toContain("where: { id: financeCaseId, tenantId }");
    expect(READ_MODEL_SOURCE).toContain("where: { id: draftId, tenantId }");
    expect(READ_MODEL_SOURCE).toContain("readContractSnapshot(tenantId, snapshotId)");
    expect(READ_MODEL_SOURCE).toMatch(/where:\s*\{\s*tenantId,/);
    expect(READ_MODEL_SOURCE).not.toMatch(/\.(?:create|update|updateMany|delete|deleteMany|upsert)\s*\(/);
  });

  it("keeps W1E internal: no network, route, migration, or Transaction Spine surface", () => {
    for (const source of [PERMISSION_SOURCE, FACADE_SOURCE, READ_MODEL_SOURCE]) {
      expect(source).not.toContain("fetch(");
      expect(source).not.toContain("axios");
      expect(source).not.toContain("NextRequest");
      expect(source).not.toContain("NextResponse");
      expect(source).not.toMatch(/paymentPlan\.(?:create|update|delete|upsert)/);
      expect(source).not.toMatch(/installment\.(?:create|update|delete|upsert)/);
      expect(source).not.toMatch(/invoice\.(?:create|update|delete|upsert)/);
    }

    expect(GATE_SOURCE).toContain("no public route, server action, UI, migration, backfill, deploy, or provider activation");
    expect(GATE_SOURCE).toContain("no modification of EXEC-003 historical assignment files");
  });
});
