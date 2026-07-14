import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("WhatsApp interaction and density closure", () => {
  const view = read("components/views/WhatsAppView.tsx");
  const actions = read("app/actions/whatsapp.ts");
  const crm = read("app/actions/whatsapp-crm.ts");

  it("removes duplicated connection warnings and keeps one connection action", () => {
    expect(view).toContain("t.manageConnection");
    expect(view).not.toContain("t.configureProvider");
    expect(view).not.toContain('role="status"');
    expect(view.match(/category=MESSAGING/g)?.length).toBe(1);
  });

  it("uses a compact context strip instead of three oversized cards", () => {
    expect(view).toContain("data-whatsapp-context-strip");
    expect(view).toContain(
      'className="flex min-h-[44px] shrink-0 flex-wrap items-center',
    );
    expect(view).not.toContain("orca-info-cell");
  });

  it("expands the composer and compacts message bubbles", () => {
    expect(view).toContain("data-whatsapp-message-composer");
    expect(view).toContain("rows={3}");
    expect(view).toContain("min-h-[84px]");
    expect(view).toContain("max-h-[144px]");
    expect(view).toContain("max-w-[72%]");
    expect(view).toContain("rounded-xl border px-3 py-2");
  });

  it("loads active assignees from a WhatsApp-specific tenant action", () => {
    expect(view).toContain("getWhatsAppAssigneesAction");
    expect(actions).toContain("export async function getWhatsAppAssigneesAction");
    expect(actions).toContain("tenantId: tenant.id");
    expect(actions).toContain("isActive: true");
    expect(actions).toContain("users: users.map");
  });

  it("creates a task from the selected tenant lead with visible loading state", () => {
    expect(view).toContain('formData.append("leadId", selectedChat.leadId)');
    expect(view).toContain("isCreatingTask");
    expect(view).toContain("t.creatingTask");
    expect(crm).toContain("requestedLeadId");
    expect(crm).toContain("runWithTenantContext");
    expect(crm).toContain("assignedTo: activeUser.id");
    expect(crm).toContain("tenantId: tenant.id");
  });
});
