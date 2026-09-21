import type { Exec007CutoverMode } from "../offer-management/state-machine";

export type CommercialWriteClass = "LEGACY" | "EXEC007";

export function assertCommercialWriteMode(mode: Exec007CutoverMode, writeClass: CommercialWriteClass): void {
  if (writeClass === "LEGACY" && mode !== "LEGACY_ONLY") {
    throw new Error(`legacy commercial write denied in ${mode}`);
  }
  if (writeClass === "EXEC007" && mode !== "EXEC007_ACTIVE") {
    throw new Error(`EXEC-007 commercial write denied in ${mode}`);
  }
}

export function assertLegacyAcceptanceIdentifier(mode: Exec007CutoverMode, recordOrigin: "LEGACY" | "EXEC007"): void {
  if (recordOrigin === "EXEC007") throw new Error("legacy acceptance rejects EXEC-007 identifiers");
  assertCommercialWriteMode(mode, "LEGACY");
}
