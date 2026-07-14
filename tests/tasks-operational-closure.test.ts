import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Tasks operational and property-identity closure", () => {
  const view = source("components/views/TasksView.tsx");
  const actions = source("app/actions/tasks.ts");
  const api = source("app/api/v1/tasks/route.ts");
  const completeApi = source(
    "app/api/v1/tasks/[id]/complete/route.ts",
  );
  const properties = source(
    "components/real-estate/properties/PropertiesWorkspace.tsx",
  );

  it("keeps the task page on the canonical TasksView", () => {
    const page = source("app/operations/tasks/page.tsx");
    expect(page).toContain(
      'import TasksView from "@/components/views/TasksView"',
    );
    expect(page).toContain("return <TasksView />");
  });

  it("uses only priorities supported by the Prisma enum", () => {
    expect(view).not.toContain('value: "URGENT"');
    expect(actions).toContain(
      'const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const',
    );
    expect(api).toContain(
      'new Set<Priority>(["LOW", "MEDIUM", "HIGH"])',
    );
  });

  it("does not send task notifications to a fixed or demo phone", () => {
    expect(actions).not.toMatch(/\+966505123456|salesPhone/);
    expect(actions).toContain("phone: assignedUser.phone");
    expect(actions).toContain("if (!phone) return");
    expect(actions).toContain("id: assignedTo");
    expect(actions).toContain("tenantId");
    expect(actions).toContain("isActive: true");
  });

  it("derives the next status from the tenant-owned database row", () => {
    expect(actions).toContain("prisma.task.findFirst");
    expect(actions).toContain("id: normalizedTaskId");
    expect(actions).toContain("tenantId");
    expect(actions).toContain(
      'task.status === "COMPLETED" ? "PENDING" : "COMPLETED"',
    );
    expect(actions).not.toContain(
      'currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED"',
    );
  });

  it("keeps create and update mutations tenant scoped", () => {
    expect(actions).toContain("export async function createTaskAction");
    expect(actions).toContain("export async function updateTaskAction");
    expect(actions).toContain("where: {\n            id: taskId,\n            tenantId,");
    expect(actions).toContain("tenantId,\n            leadId: lead.id");
    expect(actions).toContain('action: "TASK_UPDATED"');
  });

  it("supports a complete modal create and edit workflow", () => {
    expect(view).toContain("updateTaskAction");
    expect(view).toContain("beginEdit(selectedTask)");
    expect(view).toContain('formData.append("assignedTo", newAssignedTo)');
    expect(view).toContain('formData.append("dueAt", dueAt.toISOString())');
    expect(view).toContain("orca-dialog-overlay");
    expect(view).toContain('role="dialog"');
    expect(view).toContain('aria-modal="true"');
    expect(view).toContain('createPortal(');
    expect(view).toContain('document.body');
    expect(view).toContain('paddingTop: "5.5rem"');
    expect(view).toContain('maxHeight: "calc(100dvh - 6.5rem)"');
  });

  it("uses working searchable customer and owner fields", () => {
    expect(view).toContain("TaskCombobox");
    expect(view).toContain("data-task-searchable-combobox");
    expect(view).toContain("handleLeadChange");
    expect(view).toContain("setNewAssignedTo(suggestedOwner)");
    expect(view).toContain("leadsResult.users");
    expect(actions).toContain("prisma.user.findMany");
    expect(actions).toContain("prisma.user.findFirst");
    expect(actions).toContain("isActive: true");
  });

  it("uses fixed Latin DD/MM/YY and HH:MM fields in both languages", () => {
    expect(view).toContain('datePlaceholder: "DD/MM/YY"');
    expect(view).toContain('timePlaceholder: "HH:MM"');
    expect(view).toContain("normalizeDateField");
    expect(view).toContain("normalizeTimeField");
    expect(view).toContain("parseTaskDateTime");
    expect(view).toContain("data-task-date-field");
    expect(view).toContain("data-task-time-field");
    expect(view).toContain("data-task-date-trigger");
    expect(view).toContain("data-task-time-trigger");
    expect(view).toContain("data-task-date-popover");
    expect(view).toContain("data-task-time-popover");
    expect(view).toContain("Array.from({ length: 14 }");
    expect(view).toContain("Array.from({ length: 48 }");
    expect(view).not.toContain('type="date"');
    expect(view).not.toContain('type="time"');
    expect(view).toContain("/${pad(date.getMonth() + 1)}/");
  });

  it("does not show the automatic owner suggestion copy inside the editor", () => {
    expect(view).not.toContain("يُقترح مسؤول العميل تلقائيًا ويمكن تغييره.");
    expect(view).not.toContain(
      "The customer's owner is suggested automatically and can be changed.",
    );
    expect(view).not.toContain("hint={t.ownerHint}");
  });

  it("distinguishes initial loading, refresh, error, empty, and populated states", () => {
    expect(view).toContain("isLoading && tasks.length === 0");
    expect(view).toContain("loadError ? (");
    expect(view).toContain("void loadData(selectedId)");
    expect(view).toContain("pageItems.length === 0");
    expect(view).toContain("RefreshCw");
  });

  it("uses the approved fixed five-item task list card", () => {
    expect(view).toContain("const PAGE_SIZE = 5");
    expect(view).toContain("data-operational-list-card");
    expect(view).toContain('className={`group flex h-[68px]');
    expect(view).toContain("orca-workspace-pagination");
    expect(view).not.toContain("<table");
  });

  it("adopts the approved property workspace identity without changing the property page", () => {
    for (const token of [
      "orca-container",
      "orca-workspace-hero",
      "orca-workspace-metrics",
      "orca-workspace-metric",
      "orca-workspace-note",
      "orca-workspace-panel",
      "orca-workspace-toolbar",
      "orca-info-cell",
    ]) {
      expect(properties).toContain(token);
      expect(view).toContain(token);
    }

    expect(view).toContain("data-tasks-property-workspace");
    expect(view).toContain("orca-container pb-4");
    expect(view).not.toContain("UnifiedOperationsWorkspace");
  });

  it("keeps the hero limited to page-local actions", () => {
    expect(view).not.toContain('href: "/operations/whatsapp"');
    expect(view).not.toContain('href: "/operations/email"');
    expect(view).not.toContain('href: "/operations/helpdesk"');
    expect(view).not.toContain('import Link from "next/link"');
    expect(view).toContain("RefreshCw");
    expect(view).toContain("onClick={beginCreate}");
  });

  it("preserves the approved upper page identity while changing only the two lower cards", () => {
    expect(view).toContain("orca-workspace-hero");
    expect(view).toContain("orca-workspace-metrics");
    expect(view).toContain("orca-workspace-note");
    expect(view).toContain("data-four-page-two-card-workspace");
  });

  it("uses rounded gold task rows inside the list card", () => {
    expect(view).toContain("data-task-row");
    expect(view).toContain("rounded-2xl border");
    expect(view).toContain("hover:bg-[var(--nc-accent-soft)]");
    expect(view).toContain("aria-pressed={selected}");
    expect(view).not.toContain("border-separate");
    expect(view).not.toContain("orca-data-row");
  });

  it("uses only the approved two lower operational cards", () => {
    expect(view).toContain("data-four-page-two-card-workspace");
    expect(view).toContain("data-operational-list-card");
    expect(view).toContain("data-operational-detail-card");
    expect(view).toContain("lg:grid-cols-[340px_minmax(0,1fr)]");
    expect(view).toContain("lg:h-[520px]");
    expect(view).toContain("gap-3");
    expect(view).not.toContain('className="space-y-3"');
  });

  it("uses shared selects and never exposes a native select popup", () => {
    expect(view).toContain("SettingsSelect");
    expect(view).not.toMatch(/<select\b/i);
  });

  it("enforces 44px controls and hidden internal scrollbars", () => {
    expect(view).toContain("min-h-[44px]");
    expect(view).toContain("[scrollbar-width:none]");
    expect(view).toContain("[&::-webkit-scrollbar]:hidden");
    expect(view).toContain("overflow-y-auto");
  });

  it("does not expose UUID labels or technical identifiers in task copy", () => {
    expect(view).not.toMatch(/UUID|معرف المهمة:/);
    expect(view).toContain("cleanDisplayText");
    expect(view).toContain("isTechnicalText");
  });

  it("aligns the REST create path with explicit tenant-owned assignment", () => {
    expect(api).toContain("requestedAssignee");
    expect(api).toContain("const assignedTo = requestedAssignee || lead.assignedTo");
    expect(api).toContain("prisma.user.findFirst");
    expect(api).toContain("tenantId: session.tenantId");
    expect(api).toContain("if (!TASK_PRIORITIES.has");
    expect(api).toContain('action: "TASK_CREATED"');
    expect(api).not.toContain("Date.now() + 24 * 60 * 60 * 1000");
  });

  it("keeps the completion route tenant scoped and task audited", () => {
    expect(completeApi).toContain(
      "where: { id, tenantId: session.tenantId }",
    );
    expect(completeApi).toContain(
      "where: { id: task.id, tenantId: session.tenantId }",
    );
    expect(completeApi).toContain('action: "TASK_COMPLETED"');
    expect(completeApi).toContain('tableName: "tasks"');
  });
});
