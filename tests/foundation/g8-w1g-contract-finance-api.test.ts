import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const GATE = readFileSync(
  join(ROOT, "docs", "product-extension", "W1G_CONTRACT_FINANCE_API_GATE.md"),
  "utf8",
);
const BOUNDARY = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "api-boundary.ts"),
  "utf8",
);
const FINANCE_COLLECTION = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "finance-cases", "route.ts"),
  "utf8",
);
const FINANCE_DETAIL = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "finance-cases", "[id]", "route.ts"),
  "utf8",
);
const DRAFT_COLLECTION = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "contract-drafts", "route.ts"),
  "utf8",
);
const DRAFT_DETAIL = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "contract-drafts", "[id]", "route.ts"),
  "utf8",
);

const ROUTES = [
  FINANCE_COLLECTION,
  FINANCE_DETAIL,
  DRAFT_COLLECTION,
  DRAFT_DETAIL,
];

describe("W1G guarded Contract / Finance API foundation", () => {
  it("requires two exact server-only activation flags and defaults closed", () => {
    expect(BOUNDARY).toContain('process.env.ORCA_CONTRACT_FINANCE_API_ENABLED === "true"');
    expect(BOUNDARY).toContain('process.env.ORCA_CONTRACT_FINANCE_SCHEMA_READY === "true"');
    expect(BOUNDARY).toContain("if (!isW1gContractFinanceApiEnabled())");
    expect(BOUNDARY).toContain("return notFoundResponse(request)");

    expect(GATE).toContain("ORCA_CONTRACT_FINANCE_API_ENABLED=true");
    expect(GATE).toContain("ORCA_CONTRACT_FINANCE_SCHEMA_READY=true");
    expect(GATE).toContain("Both are absent/false by default");
  });

  it("executes the feature gate before authentication and the W1E facade", () => {
    const gateIndex = BOUNDARY.indexOf("if (!isW1gContractFinanceApiEnabled())");
    const authIndex = BOUNDARY.indexOf("const session = await requireAuth(request)");
    expect(gateIndex).toBeGreaterThanOrEqual(0);
    expect(authIndex).toBeGreaterThan(gateIndex);

    for (const source of ROUTES) {
      const boundaryIndex = source.indexOf("await beginW1gRequest(request)");
      const facadeIndex = source.search(/await w1e[A-Z]/);
      expect(boundaryIndex).toBeGreaterThanOrEqual(0);
      expect(facadeIndex).toBeGreaterThan(boundaryIndex);
    }
  });

  it("exposes only the frozen FinanceCase and ContractDraft list/get/create facade calls", () => {
    expect(FINANCE_COLLECTION).toContain("w1eListFinanceCases");
    expect(FINANCE_COLLECTION).toContain("w1eCreateFinanceCase");
    expect(FINANCE_DETAIL).toContain("w1eGetFinanceCase");
    expect(DRAFT_COLLECTION).toContain("w1eListContractDrafts");
    expect(DRAFT_COLLECTION).toContain("w1eCreateContractDraft");
    expect(DRAFT_DETAIL).toContain("w1eGetContractDraft");

    const combined = ROUTES.join("\n");
    for (const excluded of [
      "w1eTransitionFinanceCase",
      "w1eRecordFinanceAuthorityEvidence",
      "w1eRecordProviderOffer",
      "w1eSelectProviderOffer",
      "w1eRequestContractApproval",
      "w1eDecideContractApproval",
      "w1eFinalizeContractDraftApproval",
      "w1eIssueApprovedContractSnapshot",
    ]) {
      expect(combined).not.toContain(excluded);
    }
  });

  it("never imports Prisma or direct W1 write services from network routes", () => {
    for (const source of ROUTES) {
      expect(source).not.toContain("@/lib/prisma");
      expect(source).not.toContain('from "@prisma/client"');
      expect(source).not.toContain("./finance-case-service");
      expect(source).not.toContain("./contract-draft-service");
      expect(source).not.toContain("./provider-offer-service");
      expect(source).not.toContain("./contract-snapshot-service");
      expect(source).not.toMatch(/\bprisma\./);
    }
  });

  it("does not accept tenant or actor identity from request bodies", () => {
    const writes = `${FINANCE_COLLECTION}\n${DRAFT_COLLECTION}`;
    expect(writes).not.toMatch(/body\s*\[\s*["']tenantId["']\s*\]/);
    expect(writes).not.toContain('requiredW1gString(body, "tenantId")');
    expect(writes).not.toContain('optionalW1gString(body, "tenantId")');
    expect(writes).not.toContain('requiredW1gString(body, "actorId")');
    expect(writes).not.toContain('optionalW1gString(body, "actorId")');
    expect(writes).not.toContain('requiredW1gString(body, "createdBy")');
    expect(writes).not.toContain('optionalW1gString(body, "createdBy")');
    expect(writes).not.toContain('requiredW1gString(body, "role")');
  });

  it("rejects malformed JSON/scalars and bounds list requests through W1E read models", () => {
    expect(BOUNDARY).toContain("W1G_INVALID_JSON");
    expect(BOUNDARY).toContain("W1G_INVALID_INPUT");
    expect(BOUNDARY).toContain("Number.isFinite(value)");
    expect(BOUNDARY).toContain("Number.isInteger(value)");
    expect(BOUNDARY).toContain("Number.isSafeInteger(value)");
    expect(FINANCE_COLLECTION).toContain("optionalW1gListLimit(request)");
    expect(DRAFT_COLLECTION).toContain("optionalW1gListLimit(request)");
    expect(GATE).toContain("Query list limits are bounded by the existing W1E read model service");
  });

  it("maps authorization and domain failures without leaking internal errors", () => {
    expect(BOUNDARY).toContain("error instanceof W1eAuthorizationError");
    expect(BOUNDARY).toContain('error.code === "W1E_UNAUTHORIZED" ? 401 : 403');
    expect(BOUNDARY).toContain('code.includes("NOT_FOUND")');
    expect(BOUNDARY).toContain('code.includes("CONFLICT")');
    expect(BOUNDARY).toContain('{ error: "INTERNAL_ERROR" }');
    expect(BOUNDARY).not.toContain("error.stack");
  });

  it("sets no-store on successful and generated error responses", () => {
    for (const source of ROUTES) {
      expect(source).toContain('"Cache-Control": "no-store"');
    }
    expect(BOUNDARY).toContain('"Cache-Control": "no-store"');
  });

  it("does not add provider, deployment, migration, or Transaction Spine surfaces", () => {
    const combined = [BOUNDARY, ...ROUTES].join("\n");
    expect(combined).not.toContain("fetch(");
    expect(combined).not.toContain("axios");
    expect(combined).not.toContain("EJAR_API");
    expect(combined).not.toContain("VERCEL");
    expect(combined).not.toMatch(/paymentPlan\.(?:create|update|delete|upsert)/);
    expect(combined).not.toMatch(/installment\.(?:create|update|delete|upsert)/);
    expect(combined).not.toMatch(/invoice\.(?:create|update|delete|upsert)/);
    expect(GATE).toContain("no production/customer migration or backfill");
    expect(GATE).toContain("no Vercel deployment");
    expect(GATE).toContain("no UI");
  });
});
