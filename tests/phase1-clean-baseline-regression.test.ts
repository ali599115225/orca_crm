import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("ORCA clean baseline phase-one regression gates", () => {
  it("hydrates UI permissions from the database-backed operations role", () => {
    const auth = read("app/context/AuthContext.tsx");
    const dashboard = read("components/layout/DashboardLayout.tsx");
    const operations = read("app/operations/layout.tsx");

    expect(auth).toContain("initialRole?: string | null");
    expect(auth).not.toContain("role-change");
    expect(dashboard).toContain("<AuthProvider initialRole={user?.role}>");
    expect(operations).toContain('String(user?.role || "READ_ONLY")');
    expect(operations).not.toContain("session.role as string");
  });

  it("does not ship fake leases and uses the rental invoice relation", () => {
    const rental = read("app/operations/rental/page.tsx");

    expect(rental).toContain("const initialLeases: Lease[] = [];");
    expect(rental).not.toContain("محمد العلي");
    expect(rental).not.toContain("سارة الأحمد");
    expect(rental).not.toContain("شركة النخبة");
    expect(rental).toContain("i.leaseId === selectedLease.id");
    expect(rental).toContain("activeLeases.length");
    expect(rental).toContain("setLeases([])");
  });

  it("does not expose raw client exception messages", () => {
    const tours = read("components/views/ToursView.tsx");
    const offers = read("components/views/OffersView.tsx");

    expect(tours).not.toContain("setError(err?.message");
    expect(tours).not.toContain("toast.error(err?.message");
    expect(offers).not.toContain("toast.error(err?.message");
    expect(offers).toContain("'not specified'");
  });

  it("uses valid capability keys and the real AI settings tab", () => {
    const projects = read("components/views/ProjectsView.tsx");
    const agents = read("components/views/AgentManagementView.tsx");

    expect(projects).not.toContain("manage_projects");
    expect(projects).toContain("hasPermission('UPLOAD_DOC')");
    expect(projects).toContain("hasPermission('CREATE_PROJECT')");
    expect(agents).toContain('/operations/settings?tab=ai');
  });

  it("keeps opportunity creation inside the official lead detail flow", () => {
    const detail = read("features/leads/components/LeadDetailClient.tsx");
    const engagement = read("features/leads/components/EngagementTabs.tsx");
    const sidebar = read("app/components/SovereignSidebar.tsx");

    expect(existsSync("app/operations/opportunities/page.tsx")).toBe(false);
    expect(detail).toContain('id: "opportunities"');
    expect(engagement).toContain("CreateOpportunityDialog");
    expect(sidebar).not.toContain('/operations/opportunities');
  });

  it("uses database-backed role guards for sensitive financial writes", () => {
    const leases = read("app/api/v1/leases/route.ts");
    const invoices = read("app/api/v1/invoices/route.ts");
    const issue = read("app/api/v1/contracts/issue/route.ts");
    const journal = read("app/api/v1/accounting/journal-entries/route.ts");

    expect(leases).toContain("FINANCE_WRITE_ROLES");
    expect(invoices).toContain("FINANCE_WRITE_ROLES");
    expect(issue).toContain("CONTRACT_WRITE_ROLES");
    expect(journal).toContain("ACCOUNTING_WRITE_ROLES");
    expect(leases).toContain("runWithDatabaseSession");
    expect(invoices).toContain("runWithDatabaseSession");
  });
});

