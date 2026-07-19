import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("WhatsApp authorization boundary architecture", () => {
  const actions = read("app/actions/whatsapp.ts");
  const crmActions = read("app/actions/whatsapp-crm.ts");
  const page = read("app/operations/whatsapp/page.tsx");
  const layout = read("app/operations/layout.tsx");

  it("keeps caller-provided tenant identifiers out of exported server actions", () => {
    const exportedActionSignatures = [...actions.matchAll(/export async function \w+\(([^)]*)\)/g),
      ...crmActions.matchAll(/export async function \w+\(([^)]*)\)/g)];

    expect(exportedActionSignatures.length).toBeGreaterThan(0);
    for (const signature of exportedActionSignatures) {
      expect(signature[1]).not.toMatch(/tenantId/);
    }
  });

  it("guards the page with database-backed WhatsApp read access", () => {
    expect(page).toContain("requireWhatsAppAccess(WHATSAPP_READ_ROLES)");
    expect(page).toContain("currentUserId={access.userId}");
    expect(page).not.toContain("session?.userId");
  });

  it("does not render deactivated tenant users as READ_ONLY", () => {
    expect(layout).toContain("if (!user && !isSuperAdmin)");
    expect(layout).not.toContain('user?.role || "READ_ONLY"');
  });

  it("authorizes every action before entering its scoped operation", () => {
    expect(actions).toContain("requireWhatsAppAccess(allowedRoles)");
    expect(actions).toContain("runWithTenantContext(");
    expect(actions).not.toContain("setTenantContext");
  });
});
