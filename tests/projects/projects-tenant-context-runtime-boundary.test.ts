import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs
    .readFileSync(path.join(process.cwd(), relativePath), "utf8")
    .replace(/\r\n/g, "\n");
}

function actionBlock(actions: string, name: string, nextName?: string) {
  const start = actions.indexOf(`export async function ${name}`);
  expect(start, `${name} must exist`).toBeGreaterThanOrEqual(0);

  const end = nextName
    ? actions.indexOf(`export async function ${nextName}`, start + 1)
    : actions.length;

  expect(end, `${name} must have a valid boundary`).toBeGreaterThan(start);
  return actions.slice(start, end);
}

describe("Projects tenant-context runtime boundary", () => {
  const actions = source("app/actions/projects.ts");

  it("establishes an explicit tenant context for every Projects Prisma action", () => {
    expect(actions).toContain(
      'import { runWithTenantContext } from "@/lib/tenant-context";',
    );

    const orderedActions = [
      "getDetailedProjectsAction",
      "createProjectAction",
      "createProjectActionDirect",
      "getProjectUnitsAction",
      "toggleUnitStatusAction",
    ];

    orderedActions.forEach((name, index) => {
      const block = actionBlock(actions, name, orderedActions[index + 1]);
      expect(
        block,
        `${name} must use the explicit tenant execution boundary`,
      ).toContain("return await runWithTenantContext(");
    });
  });

  it("keeps user identity in mutation tenant contexts", () => {
    for (const [name, nextName] of [
      ["createProjectAction", "createProjectActionDirect"],
      ["createProjectActionDirect", "getProjectUnitsAction"],
      ["toggleUnitStatusAction", undefined],
    ] as const) {
      const block = actionBlock(actions, name, nextName);
      expect(block).toContain("tenantId: tenant.id");
      expect(block).toContain("userId: session.userId");
    }
  });

  it("does not weaken the shared fail-closed Prisma guard", () => {
    const prisma = source("lib/prisma.ts");
    const enforcement = source("lib/tenant-prisma-enforcement.ts");

    expect(prisma).toContain("failClosed: true");
    expect(enforcement).toContain(
      "throw new Error(TENANT_CONTEXT_REQUIRED_ERROR)",
    );
  });
});