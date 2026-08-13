import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

describe("property tours operational closure", () => {
  it("uses a server-guarded dedicated workspace", () => {
    const page = read("app/operations/tours/page.tsx");
    expect(page).toContain("assertServerActionRole");
    expect(page).toContain("<ToursWorkspace");
  });

  it("loads tours from a tenant-scoped API with real linked entities", () => {
    const route = read("app/api/v1/tours/route.ts");
    expect(route).toContain("runWithDatabaseSession");
    expect(route).toContain("tenantId: session.tenantId");
    expect(route).toContain("assignedUser");
    expect(route).toContain("virtualTourUrl");
    expect(route).toContain("offers:");
    expect(route).toContain('searchParams.get("leadId")');
    expect(route).toContain("...(leadId ? { leadId } : {})");
    expect(route).toContain("leadId\n          ? Promise.resolve([])");
  });

  it("never creates a phantom lead from free-text customer fields", () => {
    const workspace = read(
      "components/real-estate/tours/ToursWorkspace.tsx",
    );
    expect(workspace).toContain("SettingsSelect");
    expect(workspace).not.toMatch(/<select\b/i);
    expect(workspace).not.toContain("userName:");
    expect(workspace).toContain("leadId");
  });

  it("exposes direct outcome actions and follow-up generation", () => {
    const workspace = read(
      "components/real-estate/tours/ToursWorkspace.tsx",
    );
    expect(workspace).toContain('changeStatus("COMPLETED")');
    expect(workspace).toContain('changeStatus("NO_SHOW")');
    expect(workspace).toContain('changeStatus("FOLLOW_UP")');
    const route = read("app/api/v1/tours/[id]/status/route.ts");
    expect(route).toContain("updateTourStatus");
  });

  it("reschedules only tenant-owned open tours", () => {
    const route = read("app/api/v1/tours/[id]/route.ts");
    expect(route).toContain('["SCHEDULED", "FOLLOW_UP"]');
    expect(route).toContain("tenantId: session.tenantId");
    expect(route).toContain("TOUR_RESCHEDULED");
  });

  it("registers all new tour audit actions in the typed audit contract", () => {
    const audit = read("lib/audit.ts");
    expect(audit).toContain('| "TOUR_SCHEDULED_FROM_BOARD"');
    expect(audit).toContain('| "TOUR_RESCHEDULED"');
  });
});
