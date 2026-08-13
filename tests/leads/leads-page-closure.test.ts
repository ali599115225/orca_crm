/**
 * tests/leads/leads-page-closure.test.ts
 *
 * Leads page closure — architecture assertions:
 *  - /operations/leads is a standalone list (no embedded detail panel)
 *  - /operations/leads/[id] is the only official detail page
 *  - `status` is the single source of truth (no stage reads/writes in the
 *    page's direct dependencies)
 *  - Tours are linked via Tour.offerId, never by parsing auditLog
 *  - The ambiguous legacy "closed" is rejected by the move API
 */

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("Leads list page architecture", () => {
  it("renders the standalone LeadsWorkspace list from the page", () => {
    const page = read("app/operations/leads/page.tsx");
    expect(page).toContain("LeadsWorkspace");
    expect(page).toContain("getSession");
    expect(page).toContain("assertServerActionRole");
    expect(page).toContain("LEADS_READER_ROLES");
    expect(page).toContain('state="forbidden"');
  });

  it("LeadsWorkspace is list-only: no embedded detail panel, navigates to [id]", () => {
    const workspace = read("features/leads/components/LeadsWorkspace.tsx");
    expect(workspace).not.toContain("LeadDetails");
    expect(workspace).toContain("/operations/leads/${");
    expect(workspace).toContain("getLeadsAction");
    expect(workspace).toContain("InteractiveSurface");
  });

  it("LeadsWorkspace never reads the legacy stage field", () => {
    const workspace = read("features/leads/components/LeadsWorkspace.tsx");
    expect(workspace).not.toMatch(/\.stage\b/);
    expect(workspace).not.toMatch(/\bstage\s*:/);
  });

  it("LeadsWorkspace uses the central listbox select, not native select", () => {
    const workspace = read("features/leads/components/LeadsWorkspace.tsx");
    expect(workspace).toContain("SettingsSelect");
    expect(workspace).not.toMatch(/<select\b/i);
  });

  it("LeadFormDialog uses the central listbox select, not native select", () => {
    const dialog = read("features/leads/components/LeadFormDialog.tsx");
    expect(dialog).toContain("SettingsSelect");
    expect(dialog).not.toMatch(/<select\b/i);
  });

  it("LeadFormDialog preserves selected project and assignee options when loaders return empty", () => {
    const dialog = read("features/leads/components/LeadFormDialog.tsx");
    expect(dialog).toContain("setProjects((current) => (nextProjects.length > 0 ? nextProjects : current))");
    expect(dialog).toContain("setUsers((current) => (userRows.length > 0 ? userRows : current))");
    expect(dialog).toContain('formData.set("projectId", projectId)');
    expect(dialog).toContain('formData.set("assignedTo", assignedTo)');
  });

  it("empty leads state is compact and has no forced min-height", () => {
    const workspace = read("features/leads/components/LeadsWorkspace.tsx");
    const emptyStateIndex = workspace.indexOf("labels.noLeads");
    const emptyStateBlock = workspace.slice(
      Math.max(0, workspace.lastIndexOf("<div", emptyStateIndex)),
      workspace.indexOf("</div>", emptyStateIndex) + "</div>".length,
    );
    expect(emptyStateBlock).toContain("labels.noLeads");
    expect(emptyStateBlock).not.toContain("min-h-[");
  });

  it("Arabic and English empty copy remain separated", () => {
    const copy = read("features/leads/copy/leadsCopy.ts");
    expect(copy).toContain('noLeads: "لا يوجد عملاء محتملون بعد"');
    expect(copy).toContain('noLeads: "No leads yet"');
    expect(copy).not.toMatch(/noLeads:\s*"[^"]*No leads yet[^"]*لا يوجد/);
    expect(copy).not.toMatch(/noLeads:\s*"[^"]*لا يوجد[^"]*No leads yet/);
  });
});

describe("Leads route-state closure", () => {
  it("owns loading, error, and forbidden states without changing the global shell", () => {
    expect(fs.existsSync(path.join(root, "app/operations/leads/loading.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(root, "app/operations/leads/error.tsx"))).toBe(true);

    const loading = read("app/operations/leads/loading.tsx");
    const error = read("app/operations/leads/error.tsx");
    const state = read("features/leads/components/LeadsRouteState.tsx");

    expect(loading).toContain('aria-busy="true"');
    expect(error).toContain('state="error"');
    expect(error).toContain("reset");
    expect(state).toContain('"forbidden" | "error"');
    expect(state).toContain("leadsCopy");
    expect(state).not.toContain("SovereignHeader");
  });
});

describe("Lead detail page architecture", () => {
  it("detail page is server-guarded and renders the official client", () => {
    const page = read("app/operations/leads/[id]/page.tsx");
    expect(page).toContain("getLeadDetailAction");
    expect(page).toContain("getSession");
    expect(page).toContain("LeadDetailClient");
    expect(page).toContain('result.code === "FORBIDDEN"');
    expect(page).toContain('result.code === "NOT_FOUND"');
    expect(page).toContain("LEADS_DETAIL_LOAD_FAILED");
  });

  it("detail client offers status change, assignment, edit, archive — no hard delete", () => {
    const client = read("features/leads/components/LeadDetailClient.tsx");
    expect(client).toContain("updateLeadStatusAction");
    expect(client).toContain("assignLeadAction");
    expect(client).toContain("archiveLeadAction");
    expect(client).toContain("restoreLeadAction");
    expect(client.toLowerCase()).not.toContain("deletelead");
    expect(client).toContain("LeadContactsPanel");
  });

  it("lead contacts panel loads and creates contacts by leadId", () => {
    const panel = read("components/leads/panels/LeadContactsPanel.tsx");
    expect(panel).toContain("/api/v1/contacts?leadId=");
    expect(panel).toContain('fetch("/api/v1/contacts"');
    expect(panel).toContain("leadId, name, phone");
  });

  it("engagement tabs link tours through offerId and never parse auditLog", () => {
    const engagement = read("features/leads/components/EngagementTabs.tsx");
    expect(engagement).toContain("offerId");
    // No auditLog parsing or property access anywhere in the tours linkage.
    expect(engagement).not.toMatch(/JSON\.parse\([^)]*auditLog/);
    expect(engagement).not.toMatch(/\.auditLog\b/);
  });

  it("detail client does not use raw blue action styling", () => {
    const client = read("features/leads/components/LeadDetailClient.tsx");
    expect(client).not.toContain("bg-blue-600");
    expect(client).not.toContain("text-blue-600");
    expect(client).not.toContain("border-blue-500");
  });

  it("detail client uses the central listbox select for status and assignment", () => {
    const client = read("features/leads/components/LeadDetailClient.tsx");
    expect(client).toContain("SettingsSelect");
    expect(client).toContain("LeadContactsPanel");
    const statusAssignment = client.slice(
      0,
      client.indexOf("lead-history-period"),
    );
    expect(statusAssignment).not.toMatch(/<select\b/i);
  });

  it("official detail route owns tours, opportunities, offers, activity, and history", () => {
    const detail = read("features/leads/components/LeadDetailClient.tsx");
    expect(detail).toContain('id: "tours"');
    expect(detail).toContain('id: "opportunities"');
    expect(detail).toContain('id: "offers"');
    expect(detail).toContain('id: "communication"');
    expect(detail).toContain('id: "history"');
    expect(read("features/leads/components/LeadsWorkspace.tsx")).not.toContain("EngagementTabs");
  });
  it("localizes system task titles, activity descriptions, provider errors, and opportunity statuses", () => {
    const detail = read("features/leads/components/LeadDetailClient.tsx");
    const copy = read("features/leads/copy/leadsCopy.ts");
    const opportunities = read("components/leads/panels/LeadOpportunitiesPanel.tsx");

    expect(detail).toContain("localizeSystemLeadTaskTitle(task.title, langKey)");
    expect(detail).toContain("localizeSystemLeadActivityDescription(");
    expect(detail).toContain("localizeEmailProviderError(");
    expect(copy).toContain("export function opportunityStatusLabel");
    expect(copy).toContain('OPEN: { ar: "مفتوحة", en: "Open" }');
    expect(opportunities).toContain("opportunityStatusLabel(");
    expect(opportunities).not.toContain("|| opportunity.status");
  });
});

describe("Leads data layer — status is the single source of truth", () => {
  it("service actions never write the legacy stage column", () => {
    for (const file of [
      "app/actions/leads.ts",
      "lib/leads/service.ts",
      "app/api/v1/leads/route.ts",
      "app/api/v1/leads/[id]/move/route.ts",
    ]) {
      const source = read(file);
      expect(source, `${file} must not write stage`).not.toMatch(/\bstage\s*:\s*[^=]/);
    }
  });

  it("move API rejects the ambiguous 'closed' and requires explicit WON/LOST", () => {
    const move = read("app/api/v1/leads/[id]/move/route.ts");
    expect(move).toContain('"closed"');
    expect(move).toContain("legacyStageToStatus");
    expect(move).toContain("WON أو LOST");
  });

  it("creation flows share one core (no duplicated business rules)", () => {
    const actions = read("app/actions/leads.ts");
    const api = read("app/api/v1/leads/route.ts");
    expect(actions).toContain("createLeadCore");
    expect(api).toContain("createLeadCore");
    // No random assignment anywhere in the leads data layer.
    expect(actions).not.toContain("Math.random");
    expect(read("lib/leads/service.ts")).not.toContain("Math.random");
    expect(api).not.toContain("Math.random");
  });

  it("no hardcoded notification phone numbers remain", () => {
    for (const file of ["app/actions/leads.ts", "lib/leads/service.ts", "app/api/v1/leads/route.ts"]) {
      expect(read(file), `${file} must not hardcode phone numbers`).not.toMatch(/\+9665\d{8}/);
    }
  });

  it("user-facing leads errors do not expose Prisma or stack traces", () => {
    const actions = read("app/actions/leads.ts");
    const copy = read("features/leads/copy/leadsCopy.ts");
    expect(actions).toContain("تعذر تنفيذ العملية، حاول مرة أخرى.");
    expect(copy).toContain("The operation could not be completed, please try again.");
    expect(copy).not.toMatch(/Prisma|Stack Trace|Invalid `prisma/i);
  });

  it("the duplicated legacy leadActions module is gone", () => {
    expect(fs.existsSync(path.join(root, "app/actions/leadActions.ts"))).toBe(false);
  });
});

describe("Leads direction and navigation closure", () => {
  it("isolates phone and email values without changing the page direction", () => {
    const workspace = read("features/leads/components/LeadsWorkspace.tsx");
    const detail = read("features/leads/components/LeadDetailClient.tsx");

    expect(workspace).toContain('<bdi dir="ltr"');
    expect(workspace).not.toContain('className="mt-0.5 block truncate text-xs');
    expect(detail).toContain('<bdi dir="ltr" className="tabular-nums">{lead.phone}</bdi>');
    expect(detail).toContain('<bdi dir="ltr">{lead.email}</bdi>');
  });

  it("nested lead routes resolve to the Leads breadcrumb", () => {
    const header = read("app/components/SovereignHeader.tsx");

    expect(header).toContain('normalizedPathname.startsWith(`${route}/`)');
    expect(header).toContain("matchedRoute");
  });

  it("portaled settings listboxes inherit the trigger direction", () => {
    const select = read("components/settings/SettingsSelect.tsx");

    expect(select).toContain("window.getComputedStyle(button).direction");
    expect(select).toContain("dir={position.direction}");
    expect(select).toContain("text-start");
  });

  it("offer empty states are consolidated and do not use the generic primary color", () => {
    const offers = read("components/leads/panels/LeadOffersPanel.tsx");

    expect(offers).toContain("const emptyMessage");
    expect(offers).not.toContain("nc-btn-primary");
    expect(offers).not.toContain("border-amber-500/25");
  });
});
