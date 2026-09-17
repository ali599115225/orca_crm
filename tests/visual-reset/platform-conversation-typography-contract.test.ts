import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("ORCA platform conversation typography contract", () => {
  const visual = source("features/operations/visual.ts");
  const css = source("app/operations/orca-page-contract-v1.css");
  const contract = source("docs/ui/ORCA_OPERATIONS_PAGE_CONTRACT.md");
  const email = source("app/operations/email/EmailClient.tsx");
  const whatsapp = source("components/views/WhatsAppView.tsx");
  const helpdesk = source("components/views/HelpdeskView.tsx");

  it("defines one shared semantic typography map", () => {
    expect(visual).toContain("operationsConversationTypography");
    for (const role of [
      "listTitle",
      "listSecondary",
      "metadata",
      "detailTitle",
      "messageBody",
      "fieldLabel",
      "fieldValue",
      "statusBadge",
      "composer",
    ]) {
      expect(visual).toContain(`${role}:`);
    }
  });

  it("locks the approved pixel hierarchy without changing table typography", () => {
    expect(css).toContain("ORCA CONVERSATION TYPOGRAPHY CONTRACT — LOCKED");
    expect(css).toMatch(/\.orca-conversation-list-title[\s\S]*font-size: 14px/);
    expect(css).toMatch(/\.orca-conversation-list-secondary[\s\S]*font-size: 12px/);
    expect(css).toMatch(/\.orca-conversation-metadata[\s\S]*font-size: 12px/);
    expect(css).toMatch(/\.orca-conversation-detail-title[\s\S]*font-size: 16px/);
    expect(css).toMatch(/\.orca-conversation-message-body[\s\S]*font-size: 15px/);
    expect(css).toMatch(/\.orca-conversation-field-label[\s\S]*font-size: 11px/);
    expect(css).toMatch(/\.orca-conversation-field-value[\s\S]*font-size: 14px/);
    expect(css).toMatch(/\.orca-conversation-status-badge[\s\S]*font-size: 11px/);
    expect(css).toMatch(/\.orca-conversation-composer[\s\S]*font-size: 14px/);
    expect(contract).toContain("Conversation Typography — LOCKED");
    expect(contract).toContain("separate contract from Platform Table Typography");
  });

  it("applies the shared contract to Email, WhatsApp and Helpdesk together", () => {
    for (const contents of [email, whatsapp, helpdesk]) {
      expect(contents).toContain("operationsConversationTypography");
      expect(contents).toContain("operationsConversationTypography.listTitle");
      expect(contents).toContain("operationsConversationTypography.metadata");
      expect(contents).toContain("operationsConversationTypography.detailTitle");
      expect(contents).toContain("operationsConversationTypography.messageBody");
      expect(contents).toContain("operationsConversationTypography.statusBadge");
    }
    expect(email).toContain("operationsConversationTypography.formField");
    expect(email).toContain("operationsConversationTypography.composer");
    expect(whatsapp).toContain("operationsConversationTypography.composer");
    expect(helpdesk).toContain("operationsConversationTypography.composer");
  });

  it("removes the proven page-local typography outliers", () => {
    expect(email).not.toContain('className="shrink-0 text-[10px] text-[var(--nc-text-dim)]"');
    expect(email).not.toContain("rounded-full border px-2 py-0.5 text-[10px] font-bold");
    expect(whatsapp).not.toContain('className="mt-1 truncate text-lg font-black"');
    expect(whatsapp).not.toContain('className="whitespace-pre-wrap text-sm leading-6"');
    expect(whatsapp).not.toContain("mt-0.5 text-[10px]");
    expect(helpdesk).not.toContain('className="mt-1 truncate text-lg font-black"');
    expect(helpdesk).not.toContain('className="whitespace-pre-wrap leading-7"');
  });
});
