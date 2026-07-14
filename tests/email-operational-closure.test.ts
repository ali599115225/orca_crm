import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const view = readFileSync(
  resolve(root, "app/operations/email/EmailClient.tsx"),
  "utf8",
);
const page = readFileSync(
  resolve(root, "app/operations/email/page.tsx"),
  "utf8",
);
const actions = readFileSync(
  resolve(root, "app/actions/email.ts"),
  "utf8",
);

describe("Email operational closure", () => {
  it("uses the approved two-card workspace without module tabs", () => {
    expect(view).toContain("data-email-two-card-workspace");
    expect(view).toContain("data-operational-list-card");
    expect(view).toContain("data-operational-detail-card");
    expect(view).toContain("lg:grid-cols-[340px_minmax(0,1fr)]");
    expect(view).not.toContain("UnifiedOperationsWorkspace");
    expect(view).not.toContain("MODULE_LINKS");
  });

  it("keeps the approved upper visual identity", () => {
    expect(view).toContain("orca-workspace-hero");
    expect(view).toContain("orca-workspace-metrics");
    expect(view).toContain("orca-workspace-note");
    expect(view).toContain("العميل ← الرسالة ← الإرسال ← المتابعة");
  });

  it("keeps dense stable cards and five messages per page", () => {
    expect(view).toContain("const PAGE_SIZE = 5");
    expect(view).toContain('lg:h-[520px]');
    expect(view).toContain('h-[68px]');
    expect(view).toContain("[scrollbar-width:none]");
  });

  it("keeps search, filters, and all actionable controls at least 44px high", () => {
    expect(view).toContain("min-h-[44px]");
    expect(view).not.toContain("min-h-[40px]");
    expect(view).not.toContain("h-10");
  });

  it("formats timestamps consistently as DD/MM/YY and HH:MM", () => {
    expect(view).toContain("date.getDate())}/${pad(date.getMonth() + 1)");
    expect(view).toContain("date.getHours())}:${pad(date.getMinutes())");
    expect(view).not.toContain("toLocaleDateString");
    expect(view).not.toContain('type="date"');
    expect(view).not.toContain('type="time"');
  });

  it("provides a searchable customer recipient field and allows external email", () => {
    expect(view).toContain("data-email-searchable-recipient");
    expect(view).toContain('role="combobox"');
    expect(view).toContain("recipientOptions");
    expect(view).toContain("setLeadId(match?.leadId ||");
    expect(view).toContain("EMAIL_PATTERN");
  });

  it("shows message body from stored html or text content", () => {
    expect(view).toContain("selectedMessage.htmlBody");
    expect(view).toContain("selectedMessage.textBody");
    expect(view).toContain("messageContentUnavailable");
  });

  it("keeps the send button compact and prevents grid stretching", () => {
    expect(view).toContain('w-[120px]');
    expect(view).toContain("h-11 min-h-11 max-h-11");
    expect(view).not.toContain("w-full items-center justify-center gap-2 self-center");
  });

  it("never displays provider ids or technical UUIDs", () => {
    expect(view).not.toContain("{selectedMessage.providerMessageId}");
    expect(view).not.toContain("{message.providerMessageId}");
    expect(view).toContain("isTechnicalText");
  });

  it("loads tenant-scoped leads and messages from the server page", () => {
    expect(page).toContain("runWithTenantContext");
    expect(page).toContain("where: { tenantId: tenant.id }");
    expect(page).toContain("getEmailMessagesAction(50)");
    expect(page).toContain("leads={leadsData}");
  });

  it("validates session, role, tenant, lead, and contact before sending", () => {
    expect(actions).toContain("getSession()");
    expect(actions).toContain("assertServerActionRole");
    expect(actions).toContain("getActiveTenant()");
    expect(actions).toContain("runWithTenantContext");
    expect(actions).toContain("where: { id: leadId, tenantId: tenant.id }");
    expect(actions).toContain("where: { id: contactId, tenantId: tenant.id }");
  });

  it("persists the sender user and tenant on outbound records", () => {
    expect(actions).toContain("tenantId: tenant.id");
    expect(actions).toContain("userId: verified.userId || null");
    expect(actions).toContain('direction: "outbound"');
  });
});
