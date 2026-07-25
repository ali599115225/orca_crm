import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const EXEC_003_EVIDENCE_FILES = Object.freeze(
  [
    "lib/auth/exec-003-permission-assignments.ts",
    "lib/auth/exec-003-shared-guard.ts",
    "lib/system-prisma-boundary.ts",
    "scripts/exec-003-evidence-digest.mjs",
    "scripts/exec-003-registry-reconcile.mjs",
    "tests/foundation/g5-exec-003-auth-bootstrap-active-user.test.ts",
    "tests/foundation/g5-exec-003-behavior-evidence-manifest.ts",
    "tests/foundation/g5-exec-003-contract-behavior-p0.test.ts",
    "tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts",
    "tests/foundation/g5-exec-003-contract-behavior-p1-sensitive-read.test.ts",
    "tests/foundation/g5-exec-003-contract-behavior-pilot.test.ts",
    "tests/foundation/g5-exec-003-contract-wiring.test.ts",
    "tests/foundation/g5-exec-003-cookie-guard.test.ts",
    "tests/foundation/g5-exec-003-cookie-mutation-boundary.test.ts",
    "tests/foundation/g5-exec-003-delegated-boundary-behavior.test.ts",
    "tests/foundation/g5-exec-003-entrypoint-security-matrix.test.ts",
    "tests/foundation/g5-exec-003-evidence-identity.test.ts",
    "tests/foundation/g5-exec-003-evidence-ledger.test.ts",
    "tests/foundation/g5-exec-003-exact-claim-boundary-behavior.test.ts",
    "tests/foundation/g5-exec-003-registry-reconciliation.test.ts",
    "tests/foundation/g5-exec-003-shared-guard.test.ts",
    "tests/foundation/g5-exec-003-signed-boundary-behavior.test.ts",
  ].sort(),
);

function normalizedContent(root, relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8").replaceAll("\r\n", "\n");
}

export function computeExec003EvidenceDigest(root = process.cwd()) {
  const hash = createHash("sha256");
  for (const relativePath of EXEC_003_EVIDENCE_FILES) {
    const content = normalizedContent(root, relativePath);
    hash.update(relativePath, "utf8");
    hash.update("\0", "utf8");
    hash.update(String(Buffer.byteLength(content, "utf8")), "utf8");
    hash.update("\0", "utf8");
    hash.update(content, "utf8");
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  const result = {
    algorithm: "sha256-path-length-content-v1",
    evidenceDigest: computeExec003EvidenceDigest(),
    evidenceFiles: EXEC_003_EVIDENCE_FILES,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
