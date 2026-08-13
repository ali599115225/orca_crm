import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

describe("property offers operational closure", () => {
  it("uses a server-guarded dedicated workspace", () => {
    const page = read("app/operations/offers/page.tsx");
    expect(page).toContain("assertServerActionRole");
    expect(page).toContain("TENANT_ROLES");
    expect(page).toContain("<OffersWorkspace");
  });

  it("keeps offers separate from inventory and exposes the real lifecycle", () => {
    const workspace = read(
      "components/real-estate/offers/OffersWorkspace.tsx",
    );
    expect(workspace).toContain('fetch("/api/v1/offers"');
    expect(workspace).not.toContain("getPropertiesAction");
    expect(workspace).toContain("NEGOTIATION");
    expect(workspace).toContain("acceptOffer");
    expect(workspace).toContain("SettingsSelect");
    expect(workspace).not.toMatch(/<select\b/i);
  });

  it("enriches offers from tenant-scoped opportunity and unit relations", () => {
    const route = read("app/api/v1/offers/route.ts");
    expect(route).toContain("runWithDatabaseSession");
    expect(route).toContain("tenantId: session.tenantId");
    expect(route).toContain("opportunity:");
    expect(route).toContain("contract:");
    expect(route).toContain("expiringSoon");
    expect(route).toContain('searchParams.get("leadId")');
    expect(route).toContain("...(leadId ? { opportunity: { leadId } } : {})");
    expect(route).toContain("leadId\n          ? Promise.resolve([])");
  });

  it("never accepts an offer by a generic status patch", () => {
    const route = read("app/api/v1/offers/[id]/route.ts");
    expect(route).not.toContain('"ACCEPTED",');
    expect(route).toContain("قبول العرض يتم عبر إجراء التحويل إلى عقد");
  });

  it("registers all new offer audit actions in the typed audit contract", () => {
    const audit = read("lib/audit.ts");
    expect(audit).toContain('| "OFFER_CREATED"');
    expect(audit).toContain('| "OFFER_STATUS_UPDATED"');
    expect(audit).toContain('| "OFFER_TOUR_SCHEDULED"');
  });

  it("schedules tours with offer, opportunity, lead and unit linkage", () => {
    const route = read("app/api/v1/offers/[id]/tours/route.ts");
    expect(route).toContain("scheduleTour");
    expect(route).toContain("offerId: offer.id");
    expect(route).toContain("opportunityId: offer.opportunity.id");
    expect(route).toContain("unitId: offer.unit.id");
  });
});
