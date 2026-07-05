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

  it("the duplicated legacy leadActions module is gone", () => {
    expect(fs.existsSync(path.join(root, "app/actions/leadActions.ts"))).toBe(false);
  });
});
