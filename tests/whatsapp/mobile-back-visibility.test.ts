import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Normalized to LF so this test gives the same result on Windows (CRLF
// checkout) and Linux CI (LF checkout) — this file has no .gitattributes
// forcing a consistent line ending, so raw CRLF/LF literal matching is
// platform-dependent and not a reliable regression signal.
const view = readFileSync(
  resolve(process.cwd(), "components/views/WhatsAppView.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("WhatsApp mobile back action visibility", () => {
  it("keeps the back action for mobile and force-hides it on desktop", () => {
    // Scope the assertions to the actual back-button element (identified by
    // its unique handler) rather than checking the whole file for loose
    // substrings, so this genuinely verifies the button that closes mobile
    // detail view is the one carrying the accessible label and the
    // desktop-hiding class — not just that those strings appear somewhere.
    const backButtonMatch = view.match(
      /<button[^>]*onClick=\{\(\) => setMobileDetailOpen\(false\)\}[^>]*>/,
    );
    expect(backButtonMatch).not.toBeNull();
    const backButtonTag = backButtonMatch![0];

    // Visible by default (mobile/tablet): no unconditional hidden class.
    expect(backButtonTag).toContain("aria-label={t.backToConversations}");
    // Force-hidden on desktop: Tailwind's lg: breakpoint + !important.
    expect(backButtonTag).toContain("lg:!hidden");
  });
});
