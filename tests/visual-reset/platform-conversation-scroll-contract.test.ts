import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("ORCA platform conversation scroll contract", () => {
  const files = [
    "app/operations/email/EmailClient.tsx",
    "components/views/WhatsAppView.tsx",
    "components/views/HelpdeskView.tsx",
  ];

  it("uses the shared conversation scroll region for message/reply history", () => {
    for (const file of files) {
      const contents = source(file);
      expect(contents).toContain("OperationsScrollRegion");
      expect(contents).toContain('scrollRole="conversation"');
    }
  });

  it("removes the arbitrary 460px workspace height from Email, WhatsApp and Helpdesk", () => {
    for (const file of files) {
      const contents = source(file);
      expect(contents).not.toContain("lg:h-[460px]");
    }
  });

  it("keeps list surfaces in page-owned flow instead of local vertical scrolling", () => {
    for (const file of files) {
      const contents = source(file);
      expect(contents).toContain("orca-operations-flow-region");
    }
  });

  it("does not use local vertical-scroll utility on the conversation history", () => {
    const email = source("app/operations/email/EmailClient.tsx");
    const whatsapp = source("components/views/WhatsAppView.tsx");
    const helpdesk = source("components/views/HelpdeskView.tsx");

    expect(email).not.toContain('className="min-h-0 flex-1 overflow-y-auto p-3"');
    expect(whatsapp).not.toContain('min-h-0 flex-1 overflow-y-auto px-4 py-3');
    expect(helpdesk).not.toContain('min-h-0 flex-1 overflow-y-auto px-3 py-3');
  });
});
