import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("properties inventory operational closure", () => {
  it("wires Create Project to createProjectAction and reloads projects", () => {
    const view = read("components/views/ProjectsView.tsx");
    expect(view).toContain("createProjectAction");
    expect(view).toContain("await createProjectAction(formData)");
    expect(view).toContain("await loadProjects()");
  });
  it("removes the disabled AuthContext permission boundary", () => {
    const page = read("app/operations/properties/page.tsx");
    expect(page).toContain("assertServerActionRole");
    expect(page).toContain("<PropertiesWorkspace");
    expect(page).not.toContain("useAuth");
  });

  it("uses real projects when creating units and contains no fake project fallback", () => {
    const workspace = read(
      "components/real-estate/properties/PropertiesWorkspace.tsx",
    );
    expect(workspace).toContain("projects.map");
    expect(workspace).toContain("projectId");
    expect(workspace).not.toContain("مشروع النخيل السكني");
    expect(workspace).not.toContain("واحة الخليج");
    expect(workspace).toContain("SettingsSelect");
    expect(workspace).not.toMatch(/<select\b/i);
  });

  it("computes listing readiness from real listing fields", () => {
    const route = read("app/api/properties/route.ts");
    expect(route).toContain("listingReadiness");
    expect(route).toContain("virtualTour");
    expect(route).toContain("marketingReady");
    expect(route).toContain("_count");
    expect(route).toContain("transactionReady");
    expect(route).toContain("newlyCreated");
    expect(route).toContain("options?.newlyCreated ? false : readiness.ready");
  });

  it("does not count a unit that fails listingReadiness as transaction-ready", () => {
    const route = read("app/api/properties/route.ts");
    expect(route).toContain(
      "rows.filter((row) => row.transactionReady).length",
    );
    expect(route).not.toContain("transactionReady: rows.length");
    expect(route).toContain("ready: score >= 75");
  });

  it("keeps all inventory reads and writes tenant scoped", () => {
    const list = read("app/api/properties/route.ts");
    const detail = read("app/api/properties/[id]/route.ts");
    expect(list).toContain("runWithDatabaseSession");
    expect(list).toContain("tenantId: session.tenantId");
    expect(detail).toContain("requireDatabaseSession");
    expect(detail).toContain("tenantId: session.tenantId");
    expect(detail).toContain("TENANT_WRITE_ROLES");
  });

  it("does not allow manual sold or leased states without contracts", () => {
    const detail = read("app/api/properties/[id]/route.ts");
    expect(detail).toContain('nextStatus === "Sold"');
    expect(detail).toContain("حالة مباع تُستمد من عقد البيع");
    expect(detail).toContain('nextStatus === "Leased"');
    expect(detail).toContain("حالة مؤجرة تُستمد من عقد إيجار نشط");
  });

  it("blocks deletion of operationally linked units", () => {
    const detail = read("app/api/properties/[id]/route.ts");
    expect(detail).toContain("unit._count.tours");
    expect(detail).toContain("unit._count.offers");
    expect(detail).toContain("unit._count.opportunities");
  });
});
