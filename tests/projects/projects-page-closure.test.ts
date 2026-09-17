import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const view = fs.readFileSync(
  path.join(root, "components/views/ProjectsView.tsx"),
  "utf8",
);
const actions = fs.readFileSync(
  path.join(root, "app/actions/projects.ts"),
  "utf8",
);

describe("projects page closure contract", () => {
  it("loads real tenant projects and refreshes them", () => {
    expect(view).toContain("getDetailedProjectsAction");
    expect(view).toContain("const loadProjects = useCallback(async () =>");
    expect(view).toContain("void loadProjects()");
  });

  it("keeps create-project wired to the real server action", () => {
    expect(view).toContain("createProjectAction(formData)");
    expect(actions).toContain("requireProjectSession(true)");
    expect(actions).toContain('action: "PROJECT_CREATED"');
  });

  it("uses readable latin digits for KPI and page numbers", () => {
    expect(view).toContain("toLocaleString('en-US')");
    expect(view).not.toContain("toLocaleString(isArabic ? 'ar-SA' : 'en-US')");
  });

  it("resets pagination when search changes", () => {
    expect(view).toContain("setProjectPage(1)");
    expect(view).toContain("}, [searchTerm])");
  });

  it("preserves backend unit numbers", () => {
    expect(view).toContain("no?: string");
    expect(view).toContain("unit.no");
    expect(actions).toContain("no: u.unitNumber");
  });

  it("makes booking confirmation a real mutation instead of a close-only button", () => {
    expect(view).toContain("toggleUnitStatusAction");
    expect(view).toContain("async function confirmBooking()");
    expect(view).toContain("onClick={() => void confirmBooking()}");
    expect(view).toContain("getProjectUnitsAction(String(selectedProjectId))");
    expect(actions).toContain("export async function toggleUnitStatusAction");
  });

  it("does not advertise an unimplemented project-document upload action", () => {
    expect(view).not.toContain("{labels.uploadDocument}");
  });

  it("uses cancel semantics in the create form", () => {
    expect(view).toContain("{labels.cancel}");
  });

  it("keeps destructive actions behind server-side project writer roles", () => {
    expect(actions).toContain('const PROJECT_WRITER_ROLES = ["ADMIN", "SALES_MANAGER"] as const;');
    expect(actions).toContain("writerRole ? PROJECT_WRITER_ROLES : PROJECT_READER_ROLES");
  });
});