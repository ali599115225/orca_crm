import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const GATE = readFileSync(
  join(ROOT, "docs", "product-extension", "W1H_FINANCE_COMMANDS_GATE.md"),
  "utf8",
);
const COMMAND_BOUNDARY = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "finance-command-boundary.ts"),
  "utf8",
);
const TRANSITION = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "finance-cases", "[id]", "transition", "route.ts"),
  "utf8",
);
const AUTHORITY = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "finance-cases", "[id]", "authority-evidence", "route.ts"),
  "utf8",
);
const OFFER_RECORD = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "finance-cases", "[id]", "provider-offers", "route.ts"),
  "utf8",
);
const OFFER_SELECT = readFileSync(
  join(ROOT, "app", "api", "v1", "contract-finance", "finance-cases", "[id]", "provider-offers", "[offerId]", "select", "route.ts"),
  "utf8",
);

const ROUTES = [TRANSITION, AUTHORITY, OFFER_RECORD, OFFER_SELECT];
const G4_API_ROUTE_EVIDENCE = [
  "/api/v1/contract-finance/finance-cases/[id]/transition",
  "/api/v1/contract-finance/finance-cases/[id]/authority-evidence",
  "/api/v1/contract-finance/finance-cases/[id]/provider-offers",
  "/api/v1/contract-finance/finance-cases/[id]/provider-offers/[offerId]/select",
] as const;

describe("W1H guarded FinanceCase command endpoints", () => {
  it("registers direct G4 evidence for all four command routes", () => {
    expect(G4_API_ROUTE_EVIDENCE).toHaveLength(4);
    for (const route of G4_API_ROUTE_EVIDENCE) {
      expect(route).toMatch(/^\/api\/v1\/contract-finance\/finance-cases\//);
      const gateRoute = route.replace("/[id]", "/:id").replace("/[offerId]", "/:offerId");
      expect(GATE).toContain(gateRoute);
    }
  });

  it("adds a command-specific server-only gate above the W1G base gate", () => {
    expect(COMMAND_BOUNDARY).toContain('process.env.ORCA_FINANCE_CASE_COMMANDS_ENABLED === "true"');
    const commandGate = COMMAND_BOUNDARY.indexOf("if (!isW1hFinanceCommandsEnabled())");
    const baseGate = COMMAND_BOUNDARY.indexOf("return await beginW1gRequest(request)");
    expect(commandGate).toBeGreaterThanOrEqual(0);
    expect(baseGate).toBeGreaterThan(commandGate);
    expect(GATE).toContain("ORCA_CONTRACT_FINANCE_API_ENABLED=true");
    expect(GATE).toContain("ORCA_CONTRACT_FINANCE_SCHEMA_READY=true");
    expect(GATE).toContain("ORCA_FINANCE_CASE_COMMANDS_ENABLED=true");
  });

  it("routes only to the four frozen W1E FinanceCase command operations", () => {
    expect(TRANSITION).toContain("w1eTransitionFinanceCase");
    expect(AUTHORITY).toContain("w1eRecordFinanceAuthorityEvidence");
    expect(OFFER_RECORD).toContain("w1eRecordProviderOffer");
    expect(OFFER_SELECT).toContain("w1eSelectProviderOffer");

    const combined = ROUTES.join("\n");
    for (const excluded of [
      "w1eRequestContractApproval",
      "w1eDecideContractApproval",
      "w1eFinalizeContractDraftApproval",
      "w1eIssueApprovedContractSnapshot",
      "w1eCreateFinanceCase",
      "w1eCreateContractDraft",
    ]) {
      expect(combined).not.toContain(excluded);
    }
  });

  it("never imports Prisma or direct FinanceCase/provider write services from routes", () => {
    for (const source of ROUTES) {
      expect(source).not.toContain("@/lib/prisma");
      expect(source).not.toContain('from "@prisma/client"');
      expect(source).not.toContain("finance-case-service");
      expect(source).not.toContain("provider-offer-service");
      expect(source).not.toMatch(/\bprisma\./);
    }
  });

  it("validates path UUIDs and never accepts caller identity fields", () => {
    for (const source of ROUTES) {
      expect(source).toContain("requiredW1gUuidValue");
    }
    expect(OFFER_SELECT.match(/requiredW1gUuidValue\(/g) ?? []).toHaveLength(2);
    const combined = ROUTES.join("\n");
    expect(combined).not.toMatch(/body\s*\[\s*["']tenantId["']\s*\]/);
    expect(combined).not.toMatch(/body\s*\[\s*["']actorId["']\s*\]/);
    expect(combined).not.toMatch(/body\s*\[\s*["']role["']\s*\]/);
  });

  it("validates transition statuses while leaving state-machine legality to W1B", () => {
    for (const status of [
      "DRAFT",
      "ASSESSMENT",
      "READY_FOR_SUBMISSION",
      "AWAITING_PROVIDER",
      "OFFERS_RECEIVED",
      "OFFER_SELECTED",
      "PROVIDER_APPROVED",
      "READY_FOR_TRANSACTION",
      "COMPLETED",
      "CANCELLED",
    ]) {
      expect(COMMAND_BOUNDARY).toContain(`"${status}"`);
    }
    expect(TRANSITION).toContain("requiredW1hFinanceStatus(body)");
    expect(GATE).toContain("W1B remains authoritative for whether a transition from the current state is legal");
  });

  it("requires evidence-backed authority and provider-offer commands", () => {
    expect(AUTHORITY).toContain('requiredW1gString(body, "authorityStatus")');
    expect(AUTHORITY).toContain('requiredW1gString(body, "provider")');
    expect(AUTHORITY).toContain('requiredW1gString(body, "providerReference")');
    expect(AUTHORITY).toContain('requiredW1gJson(body, "evidenceJson")');

    expect(OFFER_RECORD).toContain('requiredW1hPositiveDecimalInput(body, "amount")');
    expect(OFFER_RECORD).toContain('optionalW1gPositiveInteger(body, "termMonths")');
    expect(OFFER_RECORD).toContain('optionalW1gNonNegativeDecimalInput(body, "downPayment")');
    expect(OFFER_RECORD).toContain('optionalW1gNonNegativeDecimalInput(body, "monthlyPayment")');
    expect(OFFER_RECORD).toContain('optionalW1gNonNegativeDecimalInput(body, "fees")');
    expect(OFFER_RECORD).toContain('optionalW1gNonNegativeDecimalInput(body, "annualRate")');
    expect(OFFER_RECORD).toContain('optionalW1hIsoDate(body, "expiresAt")');
    expect(OFFER_RECORD).toContain('requiredW1gJson(body, "evidenceJson")');
  });

  it("requires a strict timezone-bearing ISO-8601 provider-offer expiry", () => {
    expect(COMMAND_BOUNDARY).toContain("W1H_ISO_DATETIME_PATTERN");
    expect(COMMAND_BOUNDARY).toContain("isStrictIsoDateTime");
    expect(COMMAND_BOUNDARY).toContain("Date.UTC(year, month, 0)");
    expect(COMMAND_BOUNDARY).toContain('timezone !== "Z"');
    expect(COMMAND_BOUNDARY).toContain("Number.isFinite(Date.parse(value))");
    expect(GATE).toContain("optional valid ISO datetime expiry");
  });

  it("does not claim universal idempotency or add provider network calls", () => {
    const combined = [COMMAND_BOUNDARY, ...ROUTES].join("\n");
    expect(combined).not.toContain("fetch(");
    expect(combined).not.toContain("axios");
    expect(combined).not.toContain("EJAR_API");
    expect(combined).not.toContain("encryptedCredentials");
    expect(GATE).toContain("W1H does not claim universal request idempotency");
    expect(GATE).toContain("Provider-offer recording inherits W1C idempotency");
  });

  it("keeps Contract Studio commands and financial Transaction Spine writes out of W1H-Finance", () => {
    const combined = [COMMAND_BOUNDARY, ...ROUTES].join("\n");
    expect(combined).not.toMatch(/paymentPlan\.(?:create|update|delete|upsert)/);
    expect(combined).not.toMatch(/installment\.(?:create|update|delete|upsert)/);
    expect(combined).not.toMatch(/invoice\.(?:create|update|delete|upsert)/);
    expect(combined).not.toContain("ContractApproval");
    expect(combined).not.toContain("issueApprovedContractSnapshot");
    expect(GATE).toContain("no ContractApproval decision/finalization/snapshot endpoint");
  });
});