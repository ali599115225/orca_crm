import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const inventoryScript = join(ROOT, "scripts/g4-contract-inventory.mjs");
const normalizeScript = join(ROOT, "scripts/g4-contract-normalize.mjs");
const reconcileScript = join(ROOT, "scripts/g4-contract-reconcile.mjs");
const registryPath = join(ROOT, "artifacts/g4-contract-registry.json");
const inventoryPath = join(ROOT, "artifacts/g4-contract-inventory.json");
const overridesPath = join(ROOT, "docs/architecture/ORCA_G4_VISUAL_STATUS_OVERRIDES.json");
const registryIndexPath = join(ROOT, "docs/architecture/ORCA_G4_CONTRACT_REGISTRY.md");
const pagesPath = join(ROOT, "docs/architecture/ORCA_G4_PAGES_AND_SURFACES.md");
const apisPath = join(ROOT, "docs/architecture/ORCA_G4_API_CONTRACTS.md");
const actionsPath = join(ROOT, "docs/architecture/ORCA_G4_SERVER_ACTION_CONTRACTS.md");
const workflowPath = join(ROOT, ".github/workflows/orca-ci.yml");

type RegistryResult = {
  inventory: any;
  registry: any;
};

let cachedRegistry: RegistryResult | null = null;

function runRegistry(): RegistryResult {
  if (cachedRegistry) return cachedRegistry;

  execFileSync(process.execPath, [inventoryScript], { cwd: ROOT, stdio: "pipe" });
  execFileSync(process.execPath, [normalizeScript], { cwd: ROOT, stdio: "pipe" });
  execFileSync(process.execPath, [reconcileScript], { cwd: ROOT, stdio: "pipe" });
  cachedRegistry = {
    inventory: JSON.parse(readFileSync(inventoryPath, "utf8")),
    registry: JSON.parse(readFileSync(registryPath, "utf8")),
  };
  return cachedRegistry;
}

describe("G4 — Page and operational contract registry", () => {
  it("rebuilds the current repository inventory without malformed or duplicate contracts", () => {
    const { inventory, registry } = runRegistry();

    expect(inventory.schemaVersion).toBe(3);
    expect(inventory.summary.apisWithoutDetectedMethods).toBe(0);
    expect(inventory.summary.normalizedReExportedApiMethods).toBe(1);

    expect(registry.summary.totalContracts).toBe(359);
    expect(registry.summary.byKind).toEqual({
      API: 129,
      ERROR_STATE: 4,
      LAYOUT: 4,
      LOADING_STATE: 3,
      MODAL_OR_OVERLAY: 6,
      PAGE: 43,
      SERVER_ACTION: 162,
      TAB_SET: 8,
    });
    expect(registry.summary.duplicateContractIds).toBe(0);
    expect(registry.summary.invalidPermissionKeys).toBe(0);
    expect(registry.summary.malformedContracts).toBe(0);
    expect(registry.contracts).toHaveLength(359);
    expect(registry.contracts.every((contract: { coverageStatus: string }) => contract.coverageStatus === "RECORDED")).toBe(true);
  });

  it("records every API method including re-exported handlers", () => {
    const { registry } = runRegistry();
    const apis = registry.contracts.filter((contract: { kind: string }) => contract.kind === "API");

    expect(apis).toHaveLength(129);
    expect(apis.every((contract: { apiMethods: string[] }) => contract.apiMethods.length > 0)).toBe(true);

    const ngenius = apis.find((contract: { route: string }) => contract.route === "/api/v1/installments/[id]/pay/ngenius");
    expect(ngenius?.apiMethods).toEqual(["POST"]);
  });

  it("keeps non-visual contracts visually non-applicable and preserves documented visual decisions", () => {
    const { registry } = runRegistry();
    const byId = new Map<string, { visualStatus?: string }>(
      registry.contracts.map((contract: { id: string; visualStatus?: string }) => [contract.id, contract]),
    );

    const nonVisual = registry.contracts.filter((contract: { kind: string }) => ["API", "SERVER_ACTION"].includes(contract.kind));
    expect(nonVisual.every((contract: { visualStatus: string }) => contract.visualStatus === "NOT_APPLICABLE")).toBe(true);

    expect(byId.get("PAGE:/login:app/login/page.tsx")?.visualStatus).toBe("CLOSED_RETAINED");
    expect(byId.get("PAGE:/operations/dashboard:app/operations/dashboard/page.tsx")?.visualStatus).toBe("CLOSED_RETAINED");
    expect(byId.get("PAGE:/operations/leads/[id]:app/operations/leads/[id]/page.tsx")?.visualStatus).toBe("PARTIAL_DOCUMENTED_ISSUE");
    expect(byId.get("PAGE:/operations/projects:app/operations/projects/page.tsx")?.visualStatus).toBe("PARTIAL");
    expect(byId.get("PAGE:/register:app/register/page.tsx")?.visualStatus).toBe("LEGACY_DISABLED");
  });

  it("records lead-detail tab and overlay contracts without declaring them closed", () => {
    const { registry } = runRegistry();
    const leadTabs = registry.contracts.find((contract: { id: string }) => contract.id === "TAB_SET:features/leads/components/LeadDetailClient.tsx");
    const leadDialog = registry.contracts.find((contract: { id: string }) => contract.id === "OVERLAY:features/leads/components/LeadDetailClient.tsx:LeadFormDialog");

    expect(leadTabs?.tabValues).toEqual([
      "communication",
      "history",
      "offers",
      "opportunities",
      "overview",
      "tasks",
      "tours",
    ]);
    expect(leadTabs?.visualStatus).toBe("PARTIAL_DOCUMENTED_ISSUE");
    expect(leadDialog?.visualStatus).toBe("PARTIAL_DOCUMENTED_ISSUE");
  });

  it("binds the generated inventory to complete durable architecture records", () => {
    const index = readFileSync(registryIndexPath, "utf8");
    const pages = readFileSync(pagesPath, "utf8");
    const apis = readFileSync(apisPath, "utf8");
    const actions = readFileSync(actionsPath, "utf8");

    expect(index).toContain("Total contracts: **359**");
    expect(index).toContain("Pages: **43**");
    expect(index).toContain("APIs: **129**");
    expect(index).toContain("Server actions: **162**");

    expect((pages.match(/^\| `\/[^`]*` \| `app\/(?:[^`]+\/)?page\.(?:ts|tsx|js|jsx)`/gm) ?? [])).toHaveLength(43);
    expect((pages.match(/^\| `(?:app|components|features)\/[^|]+` \|/gm) ?? []).length).toBeGreaterThanOrEqual(8);

    expect((apis.match(/^\| `\/[^|]+` \| [A-Z]/gm) ?? [])).toHaveLength(129);
    expect(apis).toContain("| `/api/v1/installments/[id]/pay/ngenius` | POST |");

    expect((actions.match(/^\| `[A-Za-z_$][\w$]*` \|/gm) ?? [])).toHaveLength(162);
    expect(actions).toContain("| `createLeadAction` |");
    expect(actions).toContain("| `sendWhatsAppMessageAction` |");
  });

  it("retains an explicit visual decision file and permanent CI generation gates", () => {
    const overrides = JSON.parse(readFileSync(overridesPath, "utf8"));
    const workflow = readFileSync(workflowPath, "utf8");

    expect(overrides.schemaVersion).toBe(1);
    expect(overrides.policy.rule).toMatch(/not reopened/i);
    expect(overrides.routes["/operations/leads/[id]"].status).toBe("PARTIAL_DOCUMENTED_ISSUE");
    expect(overrides.routes["/operations/properties"].status).toBe("CLOSED_RETAINED");

    expect(workflow).toContain("node scripts/g4-contract-inventory.mjs");
    expect(workflow).toContain("node scripts/g4-contract-normalize.mjs");
    expect(workflow).toContain("node scripts/g4-contract-reconcile.mjs");
    expect(workflow).toContain("tests/foundation/g4-*.test.ts");
    expect(workflow).toContain("g4-contract-registry");
  });
});
