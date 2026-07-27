import { describe, expect, it } from "vitest";
import { assertCommercialWriteMode, assertLegacyAcceptanceIdentifier } from "@/lib/exec-007-cutover/legacy-guard";

describe("EXEC-007 no-dual-write cutover gate", () => {
  it("T-CUT-01 permits only Legacy writes in LEGACY_ONLY", () => {
    expect(() => assertCommercialWriteMode("LEGACY_ONLY", "LEGACY")).not.toThrow();
    expect(() => assertCommercialWriteMode("LEGACY_ONLY", "EXEC007")).toThrow();
  });

  it("T-CUT-02 permits only EXEC-007 writes in EXEC007_ACTIVE", () => {
    expect(() => assertCommercialWriteMode("EXEC007_ACTIVE", "EXEC007")).not.toThrow();
    expect(() => assertCommercialWriteMode("EXEC007_ACTIVE", "LEGACY")).toThrow();
  });

  it("T-CUT-04 rejects EXEC-007 identifiers at the Legacy acceptance boundary", () => {
    expect(() => assertLegacyAcceptanceIdentifier("LEGACY_ONLY", "EXEC007")).toThrow(/identifiers/);
  });
});
