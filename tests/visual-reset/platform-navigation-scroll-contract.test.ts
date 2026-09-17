import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("ORCA platform navigation and scroll ownership contract", () => {
  it("centralizes back-arrow direction and supports route or local-state navigation", () => {
    const back = source("components/operations/OperationsBackAction.tsx");

    expect(back).toContain('locale === "ar" ? ArrowRight : ArrowLeft');
    expect(back).toContain("href: string");
    expect(back).toContain("onClick: () => void");

    for (const file of [
      "features/leads/components/LeadDetailClient.tsx",
      "features/leads/components/LeadsRouteState.tsx",
      "components/views/ProjectsView.tsx",
      "components/properties/PropertyDetail.tsx",
    ]) {
      expect(source(file)).toContain("OperationsBackAction");
    }
  });

  it("removes arbitrary fixed-height nested scroll from ordinary operational panels", () => {
    const forbiddenByFile: Record<string, string[]> = {
      "features/leads/components/LeadsWorkspace.tsx": [
        "max-h-[560px]",
        "overflow-y-auto p-3",
      ],
      "components/views/TasksView.tsx": ["lg:h-[500px]"],
      "components/views/DocumentsView.tsx": ["lg:h-[520px]"],
      "components/real-estate/properties/PropertiesWorkspace.tsx": [
        "max-h-[500px] overflow-y-auto",
      ],
      "app/operations/maintenance/page.tsx": [
        "max-h-[480px] overflow-y-auto",
      ],
      "components/views/AgentManagementView.tsx": ["lg:h-[500px]"],
      "components/sales/SalesContractWorkspace.tsx": [
        "h-[620px]",
        "h-[500px]",
        "overflow-y-auto",
      ],
    };

    for (const [file, forbidden] of Object.entries(forbiddenByFile)) {
      const contents = source(file);
      for (const token of forbidden) {
        expect(contents).not.toContain(token);
      }
    }
  });

  it("uses declared bounded scroll roles for logs and live menus", () => {
    const region = source("components/operations/OperationsScrollRegion.tsx");
    const css = source("app/operations/orca-page-contract-v1.css");
    const health = source("app/operations/health/page.tsx");
    const agents = source("components/views/AgentManagementView.tsx");
    const email = source("app/operations/email/EmailClient.tsx");
    const tasks = source("components/views/TasksView.tsx");
    const whatsapp = source("components/views/WhatsAppView.tsx");
    const settingsSelect = source("components/settings/SettingsSelect.tsx");

    expect(region).toContain('"log" | "conversation" | "menu" | "dialog"');
    expect(css).toContain(".orca-operations-scroll-region.is-log");
    expect(css).toContain(".orca-operations-scroll-region.is-menu");
    expect(css).toContain("overscroll-behavior-y: auto");
    expect(health).toContain('<OperationsScrollRegion scrollRole="log"');
    expect(agents).toContain('<OperationsScrollRegion scrollRole="log"');

    expect(email).toContain('scrollRole="menu"');
    expect(email).not.toContain("max-h-52 overflow-y-auto");

    expect(tasks.match(/scrollRole="menu"/g)?.length).toBe(3);
    expect(tasks).not.toContain("max-h-60 grid-cols-2 gap-1 overflow-y-auto");
    expect(tasks).not.toContain("max-h-56 grid-cols-4 gap-1 overflow-y-auto");

    expect(whatsapp).toContain('scrollRole="menu"');
    expect(whatsapp).not.toContain('OperationsMasterList className="max-h-64 overflow-y-auto"');

    expect(settingsSelect).toContain("OperationsScrollRegion");
    expect(settingsSelect).toContain('scrollRole="menu"');
    expect(settingsSelect).toContain('data-operations-portal-scroll="true"');
    expect(settingsSelect).not.toContain("overscroll-contain");
  });
});
