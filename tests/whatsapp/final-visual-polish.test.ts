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
const operationsDialog = readFileSync(
  resolve(process.cwd(), "components/operations/OperationsDialog.tsx"),
  "utf8",
);
const operationsContractCss = readFileSync(
  resolve(process.cwd(), "app/operations/orca-page-contract-v1.css"),
  "utf8",
);
const settingsSelect = readFileSync(
  resolve(process.cwd(), "components/settings/SettingsSelect.tsx"),
  "utf8",
);
const customerDirectoryAction = readFileSync(
  resolve(process.cwd(), "app/actions/whatsapp-customer-directory.ts"),
  "utf8",
);

describe("WhatsApp final visual and compose contract", () => {
  it("uses Latin DD/MM/YY and HH:MM formatting", () => {
    expect(view).toContain('`${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)} • ${pad(date.getHours())}:${pad(date.getMinutes())}`');
  });

  it("uses a server-backed searchable customer directory while preserving external phone entry", () => {
    expect(view).toContain("getWhatsAppCustomerDirectoryAction");
    expect(view).toContain("data-whatsapp-customer-directory");
    expect(view).toContain('role="combobox"');
    expect(view).toContain('role="listbox"');
    expect(view).toContain('scrollRole="menu"');
    expect(view).toContain('aria-activedescendant=');
    expect(view).toContain('className="mt-2 overflow-hidden rounded-xl');
    expect(view).toContain('style={{ maxHeight: "168px" }}');
    expect(view).not.toContain('className="absolute inset-x-0 top-[calc(100%+6px)]');
    expect(view).not.toContain('className="max-h-64');
    expect(view).not.toContain("<datalist");
    expect(view).not.toContain('list="whatsapp-customer-options"');
    expect(view).toContain('type="tel"');
    expect(view).toContain("setSelectedCustomer(customer);");
    expect(view).toContain("setCustomerPickerOpen(false);");
    expect(view).not.toContain('className="mt-2 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-3 py-2.5"');
    expect(customerDirectoryAction).toContain("prisma.lead.findMany");
    expect(customerDirectoryAction).toContain("prisma.contact.findMany");
    expect(customerDirectoryAction).toContain("prisma.whatsAppContact.findMany");
  });

  it("uses the shared ORCA selector for country codes instead of the native OS dropdown", () => {
    expect(view).not.toContain('<select value={newCountryCode}');
    expect(view).toContain("value={newCountryCode}");
    expect(view).toContain('aria-label={t.newChatCountry}');
    expect(settingsSelect).toContain('role="listbox"');
    expect(settingsSelect).toContain('scrollRole="menu"');
  });

  it("uses the shared Operations primary-button contract for the message send action", () => {
    expect(view).toContain(
      'className={`${operationsVisual.primaryButton} h-11 w-full sm:w-[120px]`}',
    );
    expect(view).not.toContain('className="nc-btn-primary');
  });

  it("keeps composers usable while replacing disconnected dead send buttons with a connection CTA", () => {
    expect(view).toContain(
      'onClick={() => { setNewChatError(null); setShowNewForm(true); }} className={operationsVisual.primaryButton}',
    );
    expect(view).not.toContain(
      'disabled={!whatsAppReachable} onClick={() => { setNewChatError(null); setShowNewForm(true); }}',
    );
    expect(view).not.toContain('disabled={isCreatingChat || !whatsAppReachable}');
    expect(view).not.toContain('disabled={!whatsAppReachable || isSending}');
    expect(view).toContain('t.connectToSend');
    expect(view).toContain(
      'href="/operations/settings?tab=integrations&category=MESSAGING"',
    );
    expect(view).toContain('if (!whatsAppReachable) {');
    expect(view).toContain('setNewChatError(t.notConfigured);');
    expect(operationsContractCss).toContain(
      ".orca-v1-shell .orca-operations-primary-button:disabled",
    );
  });

  it("explains the disconnected send gate without duplicating the connection CTA inside the dialog body", () => {
    expect(view).toContain("composeDisconnectedNotice");
    expect(view).toContain('role="status"');
    expect(view).toContain(
      '/operations/settings?tab=integrations&category=MESSAGING',
    );
    expect(view).toContain("manageConnection");
    expect(view).not.toContain('className={`${operationsVisual.secondaryLink} mt-2`}');
    expect(view).not.toContain('provider=WHATSAPP&open=1');
    expect(view).not.toContain('provider=DIALOG360&open=1');
  });

  it("localizes the 360dialog webhook-secret hint", () => {
    expect(settings).toContain('L("24 حرفًا على الأقل", "24+ characters")');
  });

  it("keeps new-chat and assignment dialogs in the shared Operations portal", () => {
    expect(view.match(/<OperationsDialog/g)?.length).toBeGreaterThanOrEqual(2);
    expect(operationsDialog).toContain("createPortal(");
    expect(operationsDialog).toContain("document.body");
    expect(operationsDialog).toContain('role="dialog"');
    expect(operationsDialog).toContain('aria-modal="true"');
  });
});
