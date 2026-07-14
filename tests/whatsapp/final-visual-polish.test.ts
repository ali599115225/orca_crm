import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const view = readFileSync(
  resolve(process.cwd(), "components/views/WhatsAppView.tsx"),
  "utf8",
);
const settings = readFileSync(
  resolve(process.cwd(), "components/settings/SettingsIntegrationsHub.tsx"),
  "utf8",
);

describe("WhatsApp final visual and compose contract", () => {
  it("uses Latin DD/MM/YY and HH:MM formatting", () => {
    expect(view).toContain('`${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)} • ${pad(date.getHours())}:${pad(date.getMinutes())}`');
  });

  it("offers a searchable saved-customer selector while preserving external phone entry", () => {
    expect(view).toContain('list="whatsapp-customer-options"');
    expect(view).toContain('datalist id="whatsapp-customer-options"');
    expect(view).toContain("customerOptions");
    expect(view).toContain('type="tel"');
  });

  it("keeps one connection-management action when disconnected", () => {
    expect(view).toContain(
      '/operations/settings?tab=integrations&category=MESSAGING',
    );
    expect(view).toContain("manageConnection");
    expect(view.match(/category=MESSAGING/g)?.length).toBe(1);
    expect(view).not.toContain('provider=WHATSAPP&open=1');
    expect(view).not.toContain('provider=DIALOG360&open=1');
  });

  it("localizes the 360dialog webhook-secret hint", () => {
    expect(settings).toContain('L("24 حرفًا على الأقل", "24+ characters")');
  });

  it("keeps new-chat and assignment dialogs in a portal below the header", () => {
    expect(view.match(/createPortal\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(view).toContain("top-[88px]");
  });
});
