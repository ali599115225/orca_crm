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

const G4_API_ROUTE_EVIDENCE = [
  "/api/v1/contract-finance/finance-cases",
  "/api/v1/contract-finance/finance-cases/[id]",
  "/api/v1/contract-finance/contract-drafts",
  "/api/v1/contract-finance/contract-drafts/[id]",
] as const;

describe("W1G guarded Contract / Finance API foundation", () => {
  it("registers direct G4 evidence for every new API contract", () => {
    expect(G4_API_ROUTE_EVIDENCE).toHaveLength(4);
    for (const route of G4_API_ROUTE_EVIDENCE) {
      expect(route).toMatch(/^\/api\/v1\/contract-finance\//);
      expect(GATE).toContain(route.replace("/[id]", "/:id"));
    }
  });

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

  it("rejects malformed JSON, top-level null JSON fields, and invalid scalars", () => {
    expect(BOUNDARY).toContain("W1G_INVALID_JSON");
    expect(BOUNDARY).toContain("W1G_INVALID_INPUT");
    expect(BOUNDARY).toContain("value === undefined || value === null");
    const optionalJsonStart = BOUNDARY.indexOf("export function optionalW1gJson");
    const limitStart = BOUNDARY.indexOf("export function optionalW1gListLimit");
    expect(optionalJsonStart).toBeGreaterThanOrEqual(0);
    expect(limitStart).toBeGreaterThan(optionalJsonStart);
    expect(BOUNDARY.slice(optionalJsonStart, limitStart)).toContain("if (value === null)");
    expect(BOUNDARY).toContain("Number.isFinite(value)");
    expect(BOUNDARY).toContain("Number.isSafeInteger(value)");
    expect(GATE).toContain("Top-level `null` is rejected for W1G JSON document fields");
  });

  it("validates UUID references and rejects negative finance values before W1E", () => {
    expect(BOUNDARY).toContain("W1G_UUID_PATTERN");
    expect(BOUNDARY).toContain("requiredW1gUuidValue");
    expect(BOUNDARY).toContain("optionalW1gUuid");
    expect(BOUNDARY).toContain("optionalW1gNonNegativeDecimalInput");
    expect(BOUNDARY).toContain("value < 0");
    expect(BOUNDARY).toContain("optionalW1gPositiveInteger");
    expect(BOUNDARY).toContain("value <= 0");
    expect(FINANCE_COLLECTION).toContain('optionalW1gUuid(body, "leadId")');
    expect(FINANCE_COLLECTION).toContain('optionalW1gUuid(body, "unitId")');
    expect(FINANCE_COLLECTION).toContain('optionalW1gUuid(body, "contractId")');
    expect(FINANCE_COLLECTION).toContain("optionalW1gNonNegativeDecimalInput");
    expect(FINANCE_COLLECTION).toContain('optionalW1gPositiveInteger(body, "termMonths")');
    expect(FINANCE_DETAIL).toContain("requiredW1gUuidValue(id)");
    expect(DRAFT_COLLECTION).toContain('requiredW1gUuid(body, "templateId")');
    expect(DRAFT_COLLECTION).toContain('requiredW1gUuid(body, "templateVersionId")');
    expect(DRAFT_COLLECTION).toContain('optionalW1gUuid(body, "financeCaseId")');
    expect(DRAFT_DETAIL).toContain("requiredW1gUuidValue(id)");
    expect(GATE).toContain("UUID-shaped W1 references are validated before the facade call");
    expect(GATE).toContain("Finance scalar inputs exposed by W1G reject negative values");
  });

  it("bounds list requests through W1E read models", () => {
    expect(FINANCE_COLLECTION).toContain("optionalW1gListLimit(request)");
    expect(DRAFT_COLLECTION).toContain("optionalW1gListLimit(request)");
    expect(GATE).toContain("Query list limits are bounded by the existing W1E read model service");
  });

  it("maps authorization, domain, and unique-conflict failures without leaking internals", () => {
    expect(BOUNDARY).toContain("error instanceof W1eAuthorizationError");
    expect(BOUNDARY).toContain('error.code === "W1E_UNAUTHORIZED" ? 401 : 403');
    expect(BOUNDARY).toContain('code === "P2002"');
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