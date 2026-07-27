import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  canonicalJson,
  hashCanonicalDomain,
  isLowerHex64,
} from "@/lib/offer-management/canonicalization";

describe("EXEC007-CANON-1", () => {
  it("T-CANON-01 is deterministic across key order and Unicode normalization", () => {
    const left = { z: "e\u0301", a: new Prisma.Decimal("10.00") };
    const right = { a: new Prisma.Decimal("10.00"), z: "é" };
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(hashCanonicalDomain("content", left)).toBe(hashCanonicalDomain("content", right));
  });

  it("T-CANON-02 separates hash domains", () => {
    const value = { amount: "10.00" };
    expect(hashCanonicalDomain("content", value)).not.toBe(hashCanonicalDomain("pricing", value));
    expect(isLowerHex64(hashCanonicalDomain("terms", value))).toBe(true);
  });
});
