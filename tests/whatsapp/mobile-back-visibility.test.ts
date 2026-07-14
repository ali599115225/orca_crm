import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const view = readFileSync(
  resolve(process.cwd(), "components/views/WhatsAppView.tsx"),
  "utf8",
);

describe("WhatsApp mobile back action visibility", () => {
  it("keeps the back action for mobile and force-hides it on desktop", () => {
    expect(view).toContain("setMobileDetailOpen(false)");
    expect(view).toContain("aria-label={t.backToConversations}");
    expect(view).toContain("lg:!hidden");
    expect(view).not.toContain(
      'aria-label={t.backToConversations}\n                    >',
    );
  });
});
