import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/settings/SettingsCompliance.tsx"),
  "utf8",
);

describe("W0 compliance truth state", () => {
  it("loads ZATCA and EJAR state from the canonical provider trust action", () => {
    expect(source).toContain('getRevenueTrustStateAction');
    expect(source).toContain('providerStatus("ZATCA")');
    expect(source).toContain('providerStatus("EJAR")');
  });

  it("does not hardcode connected/pending provider truth", () => {
    expect(source).not.toContain("const zatcaConnected = true");
    expect(source).not.toContain("const ejarPending = true");
    expect(source).not.toContain("2027-12-31");
  });

  it("uses verified provider evidence instead of claiming certificate or brokerage status", () => {
    expect(source).toContain('providerLastSuccess("ZATCA")');
    expect(source).toContain('providerLastSuccess("EJAR")');
    expect(source).toContain("ejarApplication?.status");
    expect(source).not.toContain('L("صالحة", "Valid")');
    expect(source).not.toContain('L("بانتظار الاعتماد", "Awaiting Approval")');
  });
});
