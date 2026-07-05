import { describe, expect, it } from "vitest";
import { displayPerson } from "@/lib/display";
import {
  containsArabicScript,
  transliterateArabicPersonName,
} from "@/lib/display/transliterateArabicPerson";

describe("central person-name localization", () => {
  it.each([
    ["علي محمد", "Ali Mohammed"],
    ["فيصل الشمري", "Faisal Al-Shammari"],
    ["سارة العتيبي", "Sarah Al-Otaibi"],
    ["سليمان الحربي", "Sulaiman Al-Harbi"],
  ])("renders %s in English as %s", (arabicName, englishName) => {
    expect(displayPerson(arabicName, "en")).toBe(englishName);
  });

  it("preserves the Arabic source in Arabic mode", () => {
    expect(displayPerson("فيصل الشمري", "ar")).toBe("فيصل الشمري");
  });

  it("keeps an existing official alias as the first priority", () => {
    expect(displayPerson("محمد السالم", "en")).toBe("Mohammed Al-Salem");
  });

  it("keeps already-English names unchanged", () => {
    expect(displayPerson("Ali Mohammed", "en")).toBe("Ali Mohammed");
  });

  it("uses deterministic transliteration for missing aliases", () => {
    const result = transliterateArabicPersonName("زياد البقمي");
    expect(result).not.toBe("");
    expect(containsArabicScript(result)).toBe(false);
    expect(displayPerson("زياد البقمي", "en")).toBe(result);
  });

  it("does not expose technical identifiers as names", () => {
    expect(displayPerson("5efbc4a9-fcd3-4b9b-a938-25ec86f7be02", "en"))
      .toBe("Not specified");
  });
});
