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

  it("uses the page-specific hero, KPI strip, results strip, and two-card contract", () => {
    expect(view).toContain("data-whatsapp-property-workspace");
    expect(view).toContain("data-whatsapp-two-card-workspace");
    expect(view).toContain("orca-workspace-hero");
    expect(view).toContain("orca-workspace-metrics");
    expect(view).toContain("orca-workspace-note");
    expect(view).toContain('lg:grid-cols-[340px_minmax(0,1fr)]');
  });

  it("keeps a fixed five-row conversation list with internal hidden scrolling", () => {
    expect(view).toContain("const PAGE_SIZE = 5");
    expect(view).toContain("data-whatsapp-conversation-list");
    expect(view).toContain("data-whatsapp-row");
    expect(view).toContain("h-[68px]");
    expect(view).toContain("lg:h-[520px]");
    expect(view).toContain("[scrollbar-width:none]");
    expect(view).toContain("[&::-webkit-scrollbar]:hidden");
  });

  it("uses a dedicated detail card and operational blue outgoing messages", () => {
    expect(view).toContain("data-whatsapp-conversation-detail");
    expect(view).toContain("data-operational-detail-card");
    expect(view).toContain("bg-blue-600 text-white");
    expect(view).toContain("w-[120px]");
  });

  it("uses one compact connection action without repeated warning banners", () => {
    expect(view).toContain("t.manageConnection");
    expect(view).toContain(
      "/operations/settings?tab=integrations&category=MESSAGING",
    );
    expect(view).not.toContain("t.configureProvider");
    expect(view).not.toContain('role="status"');
  });
});
