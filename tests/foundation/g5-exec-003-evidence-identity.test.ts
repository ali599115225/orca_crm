import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts/exec-003-evidence-digest.mjs");
const IDENTITY = path.join(
  ROOT,
  "docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json",
);

type DigestResult = {
  algorithm: string;
  evidenceDigest: string;
  evidenceFiles: string[];
};

type EvidenceIdentity = {
  schemaVersion: number;
  package: string;
  state: string;
  validatedImplementationHead: string;
  evidenceDigest: string;
  digestAlgorithm: string;
  evidenceFiles: string[];
  baseSha: string;
  checkoutMode: string;
};

function computeDigest(): DigestResult {
  return JSON.parse(
    execFileSync(process.execPath, [SCRIPT], {
      cwd: ROOT,
      encoding: "utf8",
    }),
  ) as DigestResult;
}

function readIdentity(): EvidenceIdentity {
  return JSON.parse(fs.readFileSync(IDENTITY, "utf8")) as EvidenceIdentity;
}

describe("EXEC-003 v2 repository-bound evidence identity", () => {
  it("binds the immutable evidence file set to the validated implementation head", () => {
    const actual = computeDigest();
    const identity = readIdentity();

    if (
      identity.validatedImplementationHead.includes("PENDING") ||
      identity.evidenceDigest.includes("PENDING")
    ) {
      throw new Error(
        `PENDING FINAL VALIDATION is prohibited. Actual evidence digest: ${actual.evidenceDigest}`,
      );
    }

    expect(identity).toMatchObject({
      schemaVersion: 1,
      package: "EXEC-003 v2",
      state: "IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW",
      digestAlgorithm: "sha256-path-length-content-v1",
      baseSha: "001b2c853e99ea055f161dcd294d968bbf25c9ad",
      checkoutMode: "PR_MERGE_REF",
    });
    expect(identity.validatedImplementationHead).toMatch(/^[0-9a-f]{40}$/);
    expect(identity.evidenceDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(identity.evidenceFiles).toEqual(actual.evidenceFiles);
    expect(identity.evidenceDigest).toBe(actual.evidenceDigest);
  });

  it("contains every evidence file and rejects undocumented additions or omissions", () => {
    const actual = computeDigest();
    const identity = readIdentity();
    expect(new Set(identity.evidenceFiles).size).toBe(identity.evidenceFiles.length);
    expect(identity.evidenceFiles).toEqual([...identity.evidenceFiles].sort());
    expect(identity.evidenceFiles).toEqual(actual.evidenceFiles);
    for (const relativePath of identity.evidenceFiles) {
      expect(fs.existsSync(path.join(ROOT, relativePath))).toBe(true);
    }
  });
});
