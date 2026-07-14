import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "components/settings/SettingsIntegrationsHub.tsx"),
  "utf8",
);

describe("SMTP integrations visual polish", () => {
  it("uses a localized SMTP display name in Arabic and English", () => {
    expect(source).toContain('L("SMTP عام", "Generic SMTP")');
    expect(source).toContain("providerDisplayName(provider)");
    expect(source).toContain("providerDisplayName(definition)");
  });

  it("does not offer an account-request workflow for generic SMTP", () => {
    expect(source).toMatch(
      /activeProvider !== "CUSTOM_PAYMENT"\s*&&\s*activeProvider !== "SMTP"/,
    );
  });

  it("shows required-field errors only after a save attempt", () => {
    expect(source).toContain(
      "const [showRequiredErrors, setShowRequiredErrors] = useState(false)",
    );
    expect(source).toContain("if (missingRequired) {");
    expect(source).toContain("setShowRequiredErrors(true)");
    expect(source).toContain("showRequiredErrors &&");
    expect(source).not.toContain(
      "disabled={pending || missingRequired}",
    );
  });

  it("keeps SMTP credentials in the existing encrypted form", () => {
    expect(source).toContain('id: "SMTP"');
    expect(source).toContain('key: "password"');
    expect(source).toContain("saveRevenueProviderAction({");
  });
});
