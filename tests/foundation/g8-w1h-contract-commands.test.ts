import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const GATE = readFileSync(
  join(ROOT, "docs", "product-extension", "W1H_CONTRACT_COMMANDS_GATE.md"),
  "utf8",
);
const COMMAND_BOUNDARY = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "contract-command-boundary.ts"),
  "utf8",
);
const PERMISSIONS = readFileSync(
  join(ROOT, "lib", "auth", "w1e-contract-finance-permissions.ts"),
  "utf8",
);
const FACADE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "application-facade.ts"),
  "utf8",
);
const CONTRACT_SERVICE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "contract-draft-service.ts"),
  "utf8",
);
const SNAPSHOT_SERVICE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "contract-snapshot-service.ts"),
  "utf8",
);
const REQUEST_APPROVAL = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "contract-drafts", "[id]", "approvals", "route.ts"),
  "utf8",
);
const DECIDE_APPROVAL = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "contract-approvals", "[approvalId]", "decision", "route.ts"),
  "utf8",
);
const FINALIZE_APPROVAL = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "contract-drafts", "[id]", "finalize-approval", "route.ts"),
  "utf8",
);
const ISSUE_SNAPSHOT = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "contract-drafts", "[id]", "snapshots", "issue", "route.ts"),
  "utf8",
);

const ROUTES = [REQUEST_APPROVAL, DECIDE_APPROVAL, FINALIZE_APPROVAL, ISSUE_SNAPSHOT];
const G4_API_ROUTE_EVIDENCE = [
  "/api/v1/contract-finance/contract-drafts/[id]/approvals",
  "/api/v1/contract-finance/contract-approvals/[approvalId]/decision",
  "/api/v1/contract-finance/contract-drafts/[id]/finalize-approval",
  "/api/v1/contract-finance/contract-drafts/[id]/snapshots/issue",
] as const;

describe("W1H guarded Contract Studio command endpoints", () => {
  it("registers direct G4 evidence for all four Contract Studio command routes", () => {
    expect(G4_API_ROUTE_EVIDENCE).toHaveLength(4);
    for (const route of G4_API_ROUTE_EVIDENCE) {
      const gateRoute = route
        .replace("/[id]", "/:id")
        .replace("/[approvalId]", "/:approvalId");
      expect(GATE).toContain(gateRoute);
    }
  });

  it("adds a Contract Studio command flag above the W1G base gate", () => {
    expect(COMMAND_BOUNDARY).toContain('process.env.ORCA_CONTRACT_STUDIO_COMMANDS_ENABLED === "true"');
    const commandGate = COMMAND_BOUNDARY.indexOf("if (!isW1hContractCommandsEnabled())");
    const baseGate = COMMAND_BOUNDARY.indexOf("return await beginW1gRequest(request)");
    expect(commandGate).toBeGreaterThanOrEqual(0);
    expect(baseGate).toBeGreaterThan(commandGate);
    expect(GATE).toContain("ORCA_CONTRACT_FINANCE_API_ENABLED=true");
    expect(GATE).toContain("ORCA_CONTRACT_FINANCE_SCHEMA_READY=true");
    expect(GATE).toContain("ORCA_CONTRACT_STUDIO_COMMANDS_ENABLED=true");
  });

  it("routes only to the four frozen W1E Contract Studio command operations", () => {
    expect(REQUEST_APPROVAL).toContain("w1eRequestContractApproval");
    expect(DECIDE_APPROVAL).toContain("w1eDecideContractApproval");
    expect(FINALIZE_APPROVAL).toContain("w1eFinalizeContractDraftApproval");
    expect(ISSUE_SNAPSHOT).toContain("w1eIssueApprovedContractSnapshot");

    const combined = ROUTES.join("\n");
    for (const excluded of [
      "w1eTransitionFinanceCase",
      "w1eRecordFinanceAuthorityEvidence",
      "w1eRecordProviderOffer",
      "w1eSelectProviderOffer",
      "signContract",
      "configurePaymentPlan",
    ]) {
      expect(combined).not.toContain(excluded);
    }
  });

  it("never imports Prisma or direct ContractDraft/Snapshot write services from routes", () => {
    for (const source of ROUTES) {
      expect(source).not.toContain("@/lib/prisma");
      expect(source).not.toContain('from "@prisma/client"');
      expect(source).not.toContain("contract-draft-service");
      expect(source).not.toContain("contract-snapshot-service");
      expect(source).not.toMatch(/\bprisma\./);
    }
  });

  it("preserves existing W1E author/admin approval role separation", () => {
    expect(PERMISSIONS).toMatch(/const AUTHOR_ROLES = \[\s*"ADMIN",\s*"SALES_MANAGER",\s*"SALES_EMPLOYEE",\s*\]/m);
    expect(PERMISSIONS).toMatch(/const CONTRACT_APPROVER_ROLES = \[\s*"ADMIN",\s*\]/m);
    expect(PERMISSIONS).toContain('"contract-studio.approval-request"');
    expect(PERMISSIONS).toContain("allowedRoles: AUTHOR_ROLES");

    for (const key of [
      '"contract-studio.approval-decide"',
      '"contract-studio.approval-finalize"',
      '"contract-studio.snapshot-issue"',
    ]) {
      const start = PERMISSIONS.indexOf(`${key}: {`);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(PERMISSIONS.slice(start, start + 320)).toContain("allowedRoles: CONTRACT_APPROVER_ROLES");
    }
    expect(GATE).toContain("No Legal/Finance role is invented in this slice");
  });

  it("rejects caller-controlled identity, linkage, approval snapshot, and issued-state fields", () => {
    for (const field of [
      "tenantId",
      "role",
      "requestedBy",
      "decidedBy",
      "approvedBy",
      "createdBy",
      "contractId",
      "approvalSnapshot",
      "snapshotType",
      "signedAt",
      "draftId",
      "approvalId",
    ]) {
      expect(COMMAND_BOUNDARY).toContain(`"${field}"`);
    }
    expect(REQUEST_APPROVAL).toContain("rejectW1hContractCallerSystemFields(body)");
    expect(DECIDE_APPROVAL).toContain("rejectW1hContractCallerSystemFields(body)");
    expect(ISSUE_SNAPSHOT).toContain("rejectW1hContractCallerSystemFields(body)");
  });

  it("validates route IDs, approval request evidence, and the approval decision enum", () => {
    for (const source of ROUTES) {
      expect(source).toContain("requiredW1gUuidValue");
    }
    expect(REQUEST_APPROVAL).toContain('requiredW1gString(body, "riskTier")');
    expect(REQUEST_APPROVAL).toContain('optionalW1gString(body, "reason")');
    expect(REQUEST_APPROVAL).toContain('optionalW1gJson(body, "evidenceJson")');
    expect(COMMAND_BOUNDARY).toContain('value !== "APPROVED" && value !== "REJECTED"');
    expect(DECIDE_APPROVAL).toContain("requiredW1hApprovalDecision(body)");
  });

  it("leaves approval-state legality and finalization entirely to W1D", () => {
    expect(CONTRACT_SERVICE).toContain('draft.status !== "DRAFT" && draft.status !== "APPROVAL_PENDING"');
    expect(CONTRACT_SERVICE).toContain('approval.status !== "PENDING" || approval.draft.status !== "APPROVAL_PENDING"');
    expect(CONTRACT_SERVICE).toContain('input.decision === "REJECTED"');
    expect(CONTRACT_SERVICE).toContain('draft.status !== "APPROVAL_PENDING"');
    expect(CONTRACT_SERVICE).toContain("draft.approvals.length === 0");
    expect(CONTRACT_SERVICE).toContain('approval.status !== "APPROVED"');
    expect(GATE).toContain("W1D remains authoritative for allowed draft state");
  });

  it("issues snapshots only from path-bound draft identity and caller-safe business facts", () => {
    expect(ISSUE_SNAPSHOT).toContain("draftId: requiredW1gUuidValue(id)");
    expect(ISSUE_SNAPSHOT).toContain('requiredW1gUuid(body, "templateVersionId")');
    expect(ISSUE_SNAPSHOT).toContain('requiredW1gString(body, "renderedContent")');
    expect(ISSUE_SNAPSHOT).toContain('requiredW1gJson(body, "structuredFacts")');
    expect(ISSUE_SNAPSHOT).toContain('requiredW1gJson(body, "clauseSnapshot")');
    expect(ISSUE_SNAPSHOT).toContain('optionalW1gJson(body, "paymentPlanSnapshot")');
    expect(ISSUE_SNAPSHOT).not.toContain("contractId:");
    expect(ISSUE_SNAPSHOT).not.toContain("approvalSnapshot:");
    expect(FACADE).toMatch(/W1eIssueContractSnapshotInput = Omit<[\s\S]*?"tenantId" \| "createdBy" \| "contractId"/);
  });

  it("preserves database-derived approval evidence and deterministic immutable snapshot replay", () => {
    expect(SNAPSHOT_SERVICE).toContain('draft.status !== "APPROVED"');
    expect(SNAPSHOT_SERVICE).toContain('approval.status !== "APPROVED"');
    expect(SNAPSHOT_SERVICE).toContain("const approvalSnapshot:");
    expect(SNAPSHOT_SERVICE).toContain("computeContractSnapshotDigest");
    expect(SNAPSHOT_SERVICE).toContain('snapshotType: "ISSUED"');
    expect(SNAPSHOT_SERVICE).toContain("if (existing.digest === digest) return existing");
    expect(SNAPSHOT_SERVICE).toContain("W1_SNAPSHOT_ALREADY_ISSUED_DIFFERENT_DIGEST");
    expect(ISSUE_SNAPSHOT).not.toContain("status: 201");
    expect(GATE).toContain("Snapshot issue is replay-safe only when the deterministic digest matches");
  });

  it("does not add signature, provider network, deploy, or Transaction Spine financial writes", () => {
    const combined = [COMMAND_BOUNDARY, ...ROUTES].join("\n");
    expect(combined).not.toContain("fetch(");
    expect(combined).not.toContain("axios");
    expect(combined).not.toContain("EJAR_API");
    expect(combined).not.toContain("signContract");
    expect(combined).not.toMatch(/paymentPlan\.(?:create|update|delete|upsert)/);
    expect(combined).not.toMatch(/installment\.(?:create|update|delete|upsert)/);
    expect(combined).not.toMatch(/invoice\.(?:create|update|delete|upsert)/);
    expect(GATE).toContain("no Vercel deploy");
    expect(GATE).toContain("no PDF renderer/signature/execution endpoint");
    expect(GATE).toContain("no UI");
  });
});
