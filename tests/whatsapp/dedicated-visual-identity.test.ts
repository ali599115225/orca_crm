import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const view = readFileSync(
  resolve(process.cwd(), "components/views/WhatsAppView.tsx"),
  "utf8",
);

describe("WhatsApp dedicated visual identity", () => {
  it("does not render the legacy generic operations workspace", () => {
    expect(view).not.toContain("UnifiedOperationsWorkspace");
    expect(view).not.toContain('module="whatsapp"');
  });

  it("uses the shared Dashboard hero, KPI strip, and two-card Operations contract", () => {
    expect(view).toContain("data-whatsapp-property-workspace");
    expect(view).toContain("data-whatsapp-two-card-workspace");
    expect(view).toContain("OperationsPageHeader");
    expect(view).toContain("OperationsKpiGrid");
    expect(view).toContain("OperationsMetricCard");
    expect(view).toContain("OperationsExecutiveGrid");
  });

  it("keeps a five-row conversation list in page-owned flow with bounded history scrolling", () => {
    expect(view).toContain("const PAGE_SIZE = 5");
    expect(view).toContain("data-whatsapp-conversation-list");
    expect(view).toContain("data-whatsapp-row");
    expect(view).toContain("h-[60px]");
    expect(view).not.toContain("lg:h-[460px]");
    expect(view).toContain("orca-operations-flow-region");
    expect(view).toContain("OperationsScrollRegion");
    expect(view).toContain('scrollRole="conversation"');
    expect(view).not.toContain("min-h-0 flex-1 overflow-y-auto px-4 py-3");
    expect(view).toContain('scrollRole="menu"');
    expect(view).not.toContain('OperationsMasterList className="max-h-64 overflow-y-auto"');
  });

  it("uses a dedicated detail card and operational blue outgoing messages", () => {
    expect(view).toContain("data-whatsapp-conversation-detail");
    expect(view).toContain("data-operational-detail-card");
    expect(view).toContain("bg-blue-600 text-white");
    expect(view).toContain("w-[120px]");
  });

  it("keeps disconnected guidance contextual without repeated provider banners", () => {
    expect(view).toContain("t.manageConnection");
    expect(view).toContain(
      "/operations/settings?tab=integrations&category=MESSAGING",
    );
    expect(view).not.toContain("t.configureProvider");
    expect(view).toContain("composeDisconnectedNotice");
    expect(view).toContain('<div role="status"');
    expect(view.match(/role="status"/g)?.length).toBe(1);
  });
});
