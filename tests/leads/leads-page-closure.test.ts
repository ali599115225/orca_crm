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
  });

  it("LeadsWorkspace is list-only: no embedded detail panel, navigates to [id]", () => {
    const workspace = read("components/views/LeadsWorkspace.tsx");
    expect(workspace).not.toContain("LeadDetails");
    expect(workspace).toContain("/operations/leads/${");
    expect(workspace).toContain("getLeadsAction");
    expect(workspace).toContain("InteractiveSurface");
  });

  it("LeadsWorkspace never reads the legacy stage field", () => {
    const workspace = read("components/views/LeadsWorkspace.tsx");
    expect(workspace).not.toMatch(/\.stage\b/);
    expect(workspace).not.toMatch(/\bstage\s*:/);
  });

  it("LeadsWorkspace uses the central listbox select, not native select", () => {
    const workspace = read("components/views/LeadsWorkspace.tsx");
    expect(workspace).toContain("SettingsSelect");
    expect(workspace).not.toMatch(/<select\b/i);
  });

  it("LeadFormDialog uses the central listbox select, not native select", () => {
    const dialog = read("app/operations/leads/LeadFormDialog.tsx");
    expect(dialog).toContain("SettingsSelect");
    expect(dialog).not.toMatch(/<select\b/i);
  });

  it("LeadFormDialog preserves selected project and assignee options when loaders return empty", () => {
    const dialog = read("app/operations/leads/LeadFormDialog.tsx");
    expect(dialog).toContain("setProjects((current) => (nextProjects.length > 0 ? nextProjects : current))");
    expect(dialog).toContain("setUsers((current) => (userRows.length > 0 ? userRows : current))");
    expect(dialog).toContain('formData.set("projectId", projectId)');
    expect(dialog).toContain('formData.set("assignedTo", assignedTo)');
  });

  it("empty leads state is compact and has no forced min-height", () => {
    const workspace = read("components/views/LeadsWorkspace.tsx");
    const emptyStateIndex = workspace.indexOf("labels.noLeads");
    const emptyStateBlock = workspace.slice(
      Math.max(0, workspace.lastIndexOf("<div", emptyStateIndex)),
      workspace.indexOf("</div>", emptyStateIndex) + "</div>".length,
    );
    expect(emptyStateBlock).toContain("labels.noLeads");
    expect(emptyStateBlock).not.toContain("min-h-[");
  });

  it("Arabic and English empty copy remain separated", () => {
    const copy = read("app/operations/leads/leadsCopy.ts");
    expect(copy).toContain('noLeads: "لا يوجد عملاء محتملون بعد"');
    expect(copy).toContain('noLeads: "No leads yet"');
    expect(copy).not.toMatch(/noLeads:\s*"[^"]*No leads yet[^"]*لا يوجد/);
    expect(copy).not.toMatch(/noLeads:\s*"[^"]*لا يوجد[^"]*No leads yet/);
  });
});

describe("Lead detail page architecture", () => {
  it("detail page is server-guarded and renders the official client", () => {
    const page = read("app/operations/leads/[id]/page.tsx");
    expect(page).toContain("getLeadDetailAction");
    expect(page).toContain("getSession");
    expect(page).toContain("LeadDetailClient");
  });

  it("detail client offers status change, assignment, edit, archive — no hard delete", () => {
    const client = read("app/operations/leads/[id]/LeadDetailClient.tsx");
    expect(client).toContain("updateLeadStatusAction");
    expect(client).toContain("assignLeadAction");
    expect(client).toContain("archiveLeadAction");
    expect(client).toContain("restoreLeadAction");
    expect(client.toLowerCase()).not.toContain("deletelead");
  });

  it("engagement tabs link tours through offerId and never parse auditLog", () => {
    const engagement = read("app/operations/leads/[id]/EngagementTabs.tsx");
    expect(engagement).toContain("offerId");
    // No auditLog parsing or property access anywhere in the tours linkage.
    expect(engagement).not.toMatch(/JSON\.parse\([^)]*auditLog/);
    expect(engagement).not.toMatch(/\.auditLog\b/);
  });

  it("detail client does not use raw blue action styling", () => {
    const client = read("app/operations/leads/[id]/LeadDetailClient.tsx");
    expect(client).not.toContain("bg-blue-600");
    expect(client).not.toContain("text-blue-600");
    expect(client).not.toContain("border-blue-500");
  });

  it("detail client uses the central listbox select for status and assignment", () => {
    const client = read("app/operations/leads/[id]/LeadDetailClient.tsx");
    expect(client).toContain("SettingsSelect");
    expect(client).not.toMatch(/<select\b/i);
  });

  it("official detail route owns tours, opportunities, offers, activity, and history", () => {
    const detail = read("app/operations/leads/[id]/LeadDetailClient.tsx");
    expect(detail).toContain('id: "tours"');
    expect(detail).toContain('id: "opportunities"');
    expect(detail).toContain('id: "offers"');
    expect(detail).toContain('id: "communication"');
    expect(detail).toContain('id: "history"');
    expect(read("components/views/LeadsWorkspace.tsx")).not.toContain("EngagementTabs");
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
    const copy = read("app/operations/leads/leadsCopy.ts");
    expect(actions).toContain("تعذر تنفيذ العملية، حاول مرة أخرى.");
    expect(copy).toContain("The operation could not be completed, please try again.");
    expect(copy).not.toMatch(/Prisma|Stack Trace|Invalid `prisma/i);
  });

  it("the duplicated legacy leadActions module is gone", () => {
    expect(fs.existsSync(path.join(root, "app/actions/leadActions.ts"))).toBe(false);
  });
});
