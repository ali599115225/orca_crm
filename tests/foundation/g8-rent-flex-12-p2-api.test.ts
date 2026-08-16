import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), "utf8");

const GATE = read("docs", "product-extension", "RENT_FLEX_12_P2_API_GATE.md");
const BOUNDARY = read("lib", "domain", "rental", "rent-flex-12-api-boundary.ts");
const FACADE = read("lib", "domain", "rental", "rent-flex-12-application-facade.ts");
const READ_MODEL = read("lib", "domain", "rental", "rent-flex-12-read-service.ts");

const ROUTE_PATHS = [
  ["app", "api", "v1", "rent-flex", "units", "[unitId]", "route.ts"],
  ["app", "api", "v1", "rent-flex", "selections", "route.ts"],
  ["app", "api", "v1", "rent-flex", "selections", "[id]", "route.ts"],
  ["app", "api", "v1", "rent-flex", "selections", "[id]", "finance-case", "route.ts"],
  ["app", "api", "v1", "rent-flex", "selections", "[id]", "offer-terms", "route.ts"],
  ["app", "api", "v1", "rent-flex", "selections", "[id]", "select-offer", "route.ts"],
  ["app", "api", "v1", "rent-flex", "selections", "[id]", "lease", "route.ts"],
  ["app", "api", "v1", "rent-flex", "selections", "[id]", "lock", "route.ts"],
  ["app", "api", "v1", "rent-flex", "selections", "[id]", "settlements", "route.ts"],
] as const;
const ROUTES = ROUTE_PATHS.map((parts) => read(...parts));
const WRITE_ROUTES = [
  ROUTES[0],
  ROUTES[1],
  ROUTES[3],
  ROUTES[4],
  ROUTES[5],
  ROUTES[6],
  ROUTES[7],
  ROUTES[8],
];

const G4_API_ROUTE_EVIDENCE = [
  "/api/v1/rent-flex/units/[unitId]",
  "/api/v1/rent-flex/selections",
  "/api/v1/rent-flex/selections/[id]",
  "/api/v1/rent-flex/selections/[id]/finance-case",
  "/api/v1/rent-flex/selections/[id]/offer-terms",
  "/api/v1/rent-flex/selections/[id]/select-offer",
  "/api/v1/rent-flex/selections/[id]/lease",
  "/api/v1/rent-flex/selections/[id]/lock",
  "/api/v1/rent-flex/selections/[id]/settlements",
] as const;

describe("RF12-P2 guarded Rent Flex API wrappers", () => {
  it("registers direct G4 evidence for every new Rent Flex API contract", () => {
    expect(G4_API_ROUTE_EVIDENCE).toHaveLength(9);
    for (const route of G4_API_ROUTE_EVIDENCE) {
      expect(route).toMatch(/^\/api\/v1\/rent-flex\//);
      expect(GATE).toContain(route.replace("[unitId]", ":unitId").replace("[id]", ":id"));
    }
  });

  it("keeps reads behind feature plus schema readiness and writes behind the third gate", () => {
    expect(BOUNDARY).toContain('process.env.ORCA_RENT_FLEX_12_ENABLED === "true"');
    expect(BOUNDARY).toContain('process.env.ORCA_RENT_FLEX_12_SCHEMA_READY === "true"');
    expect(BOUNDARY).toContain('process.env.ORCA_RENT_FLEX_12_WRITES_ENABLED === "true"');
    expect(BOUNDARY).toContain("if (!enabled)");
    expect(BOUNDARY).toContain("return notFoundResponse(request)");
    expect(GATE).toContain("All flags remain absent/false by default");
    expect(GATE).toContain("operational acknowledgement only");
  });

  it("executes the dark gate before authentication and every route uses the correct boundary", () => {
    const enabledIndex = BOUNDARY.indexOf("if (!enabled)");
    const authIndex = BOUNDARY.indexOf("const session = await requireAuth(request)");
    expect(enabledIndex).toBeGreaterThanOrEqual(0);
    expect(authIndex).toBeGreaterThan(enabledIndex);

    expect(ROUTES[0]).toContain("beginRentFlex12ReadRequest");
    expect(ROUTES[0]).toContain("beginRentFlex12WriteRequest");
    expect(ROUTES[1]).toContain("beginRentFlex12ReadRequest");
    expect(ROUTES[1]).toContain("beginRentFlex12WriteRequest");
    expect(ROUTES[2]).toContain("beginRentFlex12ReadRequest");
    for (const source of WRITE_ROUTES.slice(2)) {
      expect(source).toContain("beginRentFlex12WriteRequest");
    }
  });

  it("routes through the Rent Flex application facade only", () => {
    for (const source of ROUTES) {
      expect(source).toContain("rent-flex-12-application-facade");
      expect(source).not.toContain("@/lib/prisma");
      expect(source).not.toContain('from "@prisma/client"');
      expect(source).not.toContain("rent-flex-12-service");
      expect(source).not.toContain("provider-offer-service");
      expect(source).not.toMatch(/\bprisma\./);
    }
  });

  it("reuses the existing database-role permission boundary conservatively", () => {
    expect(FACADE).toContain('"finance-case.read"');
    expect(FACADE).toContain('"finance-case.create"');
    expect(FACADE).toContain('"finance-case.offer-record"');
    expect(FACADE).toContain('"finance-case.offer-select"');
    expect(FACADE).toContain('"finance-case.transition"');
    expect(FACADE).toContain("authorizeW1eActor");
    expect(FACADE).toContain("runWithTenantContext");
    expect(GATE).toContain("Request bodies cannot provide `tenantId`");
  });

  it("rejects caller-supplied tenant and actor identity", () => {
    for (const key of [
      "tenantId",
      "actorId",
      "userId",
      "createdBy",
      "updatedBy",
      "role",
    ]) {
      expect(BOUNDARY).toContain(`"${key}"`);
    }
    expect(BOUNDARY).toContain("assertNoRentFlexIdentityFields(body)");
    const writes = WRITE_ROUTES.join("\n");
    expect(writes).not.toMatch(/requiredRentFlexString\(body,\s*["']tenantId["']/);
    expect(writes).not.toMatch(/requiredRentFlexString\(body,\s*["']actorId["']/);
  });

  it("validates UUIDs, dates, money, enums, and bounded list limits before the facade", () => {
    expect(BOUNDARY).toContain("RF12_UUID_PATTERN");
    expect(BOUNDARY).toContain("RF12_DATE_PATTERN");
    expect(BOUNDARY).toContain("requiredRentFlexPositiveMoney");
    expect(BOUNDARY).toContain("optionalRentFlexNonNegativeMoney");
    expect(BOUNDARY).toContain("requiredRentFlexEnum");
    expect(BOUNDARY).toContain("value > 100");
    expect(ROUTES[1]).toContain('requiredRentFlexUuid(body, "unitId")');
    expect(ROUTES[1]).toContain('requiredRentFlexDateOnly(body, "firstDueDate")');
    expect(ROUTES[4]).toContain("requiredRentFlexPositiveMoney");
    expect(ROUTES[8]).toContain("optionalRentFlexNonNegativeMoney");
  });

  it("normalizes read output and does not expose raw external evidence", () => {
    expect(READ_MODEL).toContain("annualRentAmount.toFixed(2)");
    expect(READ_MODEL).toContain("ownerSettlementAmount.toFixed(2)");
    expect(READ_MODEL).toContain("repaymentSchedule: rentFlexTerms.repaymentScheduleJson");
    expect(READ_MODEL).not.toContain("evidenceJson: true");
    expect(GATE).toContain("does not return raw provider `evidenceJson`");
  });

  it("maps public errors without stack leakage and uses no-store responses", () => {
    expect(BOUNDARY).toContain("error instanceof W1eAuthorizationError");
    expect(BOUNDARY).toContain('code === "P2002" || code === "P2034"');
    expect(BOUNDARY).toContain('{ error: "INTERNAL_ERROR" }');
    expect(BOUNDARY).not.toContain("error.stack");
    for (const source of ROUTES) {
      expect(source).toContain('"Cache-Control": "no-store"');
    }
  });

  it("does not add provider-network, accounting, migration, deployment, or UI behavior", () => {
    const combined = [BOUNDARY, FACADE, READ_MODEL, ...ROUTES].join("\n");
    expect(combined).not.toContain("fetch(");
    expect(combined).not.toContain("axios");
    expect(combined).not.toContain("EJAR_API");
    expect(combined).not.toContain("VERCEL");
    expect(combined).not.toMatch(/invoice\.(?:create|update|delete|upsert)/);
    expect(combined).not.toMatch(/paymentPlan\.(?:create|update|delete|upsert)/);
    expect(combined).not.toMatch(/installment\.(?:create|update|delete|upsert)/);
    expect(combined).not.toMatch(/journalEntry\.(?:create|update|delete|upsert)/);
    expect(GATE).toContain("no provider callback/webhook");
    expect(GATE).toContain("no deploy or production action");
  });
});
