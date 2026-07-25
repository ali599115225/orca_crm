# ORCA Z8 — EXEC-003 v2 Contract Wiring Matrix

- **Document ID:** `ORCA-Z8-EXEC-003-V2-WIRING-MATRIX-001`
- **Package:** `EXEC-003 v2`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Pull Request:** `#108 / DRAFT / OPEN / UNMERGED`
- **Status:** `STRUCTURAL WIRING VERIFIED / DIRECT BEHAVIORAL REMEDIATION IMPLEMENTED / AWAITING INDEPENDENT RE-REVIEW`
- **Behavioral evidence head:** `3dc4b8d865212716e5bfdb844a85e7d9c90e17ea`
- **ORCA CI:** `#365 / SUCCESS / PR_MERGE_REF`
- **Frozen contracts:** `25`
- **Frozen operations:** `32`
- **Eligible:** `27 operations / 20 contracts`
- **Excluded:** `5 operations / 5 contracts / 3 original boundary types`
- **Evidence ledger:** `docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_LEDGER.md`

## Correct evidence classification

| Artifact | Correct classification | Direct contract credit |
|---|---|---|
| `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `STRUCTURAL / SOURCE_ASSERTION` | No |
| `tests/foundation/g5-exec-003-shared-guard.test.ts` | `UNIT_BEHAVIOR` | No, supporting only |
| `tests/foundation/g5-exec-003-cookie-guard.test.ts` | `UNIT_BEHAVIOR` | No, supporting only |
| Contract behavior test files recorded in the Evidence Ledger | `DIRECT_BEHAVIORAL` | Yes |
| `tests/foundation/g5-exec-003-evidence-ledger.test.ts` | `INTEGRATION / REGRESSION` | Enforces credit integrity |

The wiring test proves that the expected guard, static Permission Key, and Legacy role token appear in the correct Handler. It does not invoke the Handler and is not described as direct behavioral evidence.

## Role legend

- `ALL_TENANT_ROLES`: `ADMIN`, `SALES_MANAGER`, `SALES_EMPLOYEE`, `MARKETING`, `READ_ONLY`.
- `CONTRACT_WRITE_ROLES`: `ADMIN`, `SALES_MANAGER`.
- `ACCOUNTING_WRITE_ROLES`: `ADMIN`.
- `EXACT_ADMIN_CLAIM`: literal Legacy `Admin`, not database enum `ADMIN`.

## Contract-level wiring summary

| Contract | Operations | Boundary | Auth channel | Wiring status | Direct behavior file |
|---|---:|---|---|---|---|
| `C01` | 1 | `AUTHENTICATED_SESSION` | Cookie or Bearer | `WIRED_DATABASE_GUARD` | `g5-exec-003-contract-behavior-p0.test.ts` |
| `C02` | 1 | `SIGNED_BOUNDARY` | Provider HMAC | `EXCLUDED_UNCHANGED` | `g5-exec-003-signed-boundary-behavior.test.ts` |
| `C03` | 1 | `DATABASE_RBAC` | Cookie or Bearer | `WIRED_DATABASE_GUARD` | `g5-exec-003-contract-behavior-pilot.test.ts` |
| `C04` | 2 | `AUTHENTICATED_SESSION` | Cookie only | `WIRED_COOKIE_GUARD` | Pilot + P0 behavior files |
| `C05` | 3 | `DATABASE_RBAC` | Cookie or Bearer | `WIRED_DATABASE_GUARD` | `g5-exec-003-contract-behavior-p0.test.ts` |
| `C06` | 1 | `DATABASE_RBAC` | Cookie only | `WIRED_COOKIE_GUARD` | `g5-exec-003-contract-behavior-p0.test.ts` |
| `C07` | 1 | `DATABASE_RBAC` | Cookie or Bearer | `WIRED_DATABASE_GUARD` | `g5-exec-003-contract-behavior-p0.test.ts` |
| `C08` | 1 | `DATABASE_RBAC` | Cookie or Bearer | `WIRED_INLINE_DATABASE_GUARD` | `g5-exec-003-contract-behavior-p0.test.ts` |
| `C09` | 1 | `SIGNED_BOUNDARY` | Timestamped HMAC | `EXCLUDED_UNCHANGED` | `g5-exec-003-signed-boundary-behavior.test.ts` |
| `C10` | 1 | `AUTHENTICATED_SESSION` | Cookie only | `WIRED_COOKIE_GUARD` | `g5-exec-003-contract-behavior-p0.test.ts` |
| `C11` | 2 | `DATABASE_RBAC` | Cookie or Bearer | `WIRED_DATABASE_GUARD` | `g5-exec-003-contract-behavior-p0.test.ts` |
| `C12` | 2 | `DATABASE_RBAC` | Cookie or Bearer | `WIRED_DATABASE_GUARD` | `g5-exec-003-contract-behavior-p1-mutation.test.ts` |
| `C13` | 1 | `DATABASE_RBAC` | Cookie or Bearer | `WIRED_DATABASE_GUARD` | `g5-exec-003-contract-behavior-p1-mutation.test.ts` |
| `C14` | 2 | `AUTHENTICATED_SESSION` | Cookie only | `WIRED_COOKIE_GUARD` | `g5-exec-003-contract-behavior-p1-mutation.test.ts` |
| `C15` | 2 | `AUTHENTICATED_SESSION` | Cookie only | `WIRED_COOKIE_GUARD` | `g5-exec-003-contract-behavior-p1-mutation.test.ts` |
| `C16` | 1 | `AUTHENTICATED_SESSION` | Cookie only | `WIRED_COOKIE_GUARD` | `g5-exec-003-contract-behavior-p1-mutation.test.ts` |
| `C17` | 1 | `DELEGATED_DATABASE_RBAC` | Delegated server boundary | `EXCLUDED_UNCHANGED` | `g5-exec-003-delegated-boundary-behavior.test.ts` |
| `C18` | 1 | `SESSION_CLAIM_EXACT` | Cookie session claim | `EXCLUDED_UNCHANGED` | `g5-exec-003-exact-claim-boundary-behavior.test.ts` |
| `C19` | 1 | `SESSION_CLAIM_EXACT` | Cookie session claim | `EXCLUDED_UNCHANGED` | `g5-exec-003-exact-claim-boundary-behavior.test.ts` |
| `C20` | 1 | `AUTHENTICATED_SESSION` | Cookie or Bearer | `WIRED_DATABASE_GUARD` | `g5-exec-003-contract-behavior-pilot.test.ts` |
| `C21` | 1 | `AUTHENTICATED_SESSION` | Cookie only | `WIRED_COOKIE_GUARD` | `g5-exec-003-contract-behavior-pilot.test.ts` |
| `C22` | 1 | `AUTHENTICATED_SESSION` | Cookie or Bearer | `WIRED_DATABASE_GUARD` | `g5-exec-003-contract-behavior-p1-sensitive-read.test.ts` |
| `C23` | 1 | `AUTHENTICATED_SESSION` | Cookie only | `WIRED_COOKIE_GUARD` | `g5-exec-003-contract-behavior-p1-sensitive-read.test.ts` |
| `C24` | 1 | `AUTHENTICATED_SESSION` | Cookie only | `WIRED_COOKIE_GUARD` | `g5-exec-003-contract-behavior-p1-sensitive-read.test.ts` |
| `C25` | 1 | `AUTHENTICATED_SESSION` | Cookie session | `WIRED_SERVER_ACTION_GUARD` | `g5-exec-003-contract-behavior-pilot.test.ts` |

The operation-level Permission Keys, exact entry points, Legacy roles, test paths, exact test names, evidence classes, evidence SHA, and CI run are recorded once in the Evidence Ledger.

## Excluded boundaries

The five excluded operations remain outside the shared guard:

- C02 and C09 exercise their real HMAC/signature boundary.
- C17 exercises its delegated `requireAgentAccess` boundary.
- C18 and C19 exercise the exact Legacy claim `Admin` and reject `ADMIN`.

No excluded source was converted to the shared guard.

## Behavioral acceptance

The contract-level tests prove, as applicable:

- missing identity is rejected before the next operational step;
- database-denied or unknown roles receive denial;
- Cookie-only routes reject Bearer-only input;
- successful authorization reaches the next tenant-scoped operation;
- C25 has no Platform Owner bypass;
- invalid signatures are rejected and valid signatures reach the signed operation;
- delegated denial remains delegated;
- exact claims are not normalized into broader roles.

## Corrected accounting

```text
Direct behavioral credit: 25 contracts / 32 operations
Structural-only frozen contracts: 0
Baseline gaps: 59
Remaining gaps: 34
P0: 0
P1 mutation: 0
P1 sensitive read: 0
P2: 16
P3: 16
P4: 2
Out-of-scope same-file credit: 0
```

## CI record

CI validated synthetic PR merge commit `0ea28c491d67fee8356f566a34861daf0b956474`, containing evidence head `3dc4b8d865212716e5bfdb844a85e7d9c90e17ea`, against base `001b2c853e99ea055f161dcd294d968bbf25c9ad`.

ORCA CI `#365` passed `135/135` G5 tests across `33/33` suites plus TypeScript, Production gate, Production dependency audit, G5–G8, regressions, P2 acceptance, Build, and isolated recovery.

EXEC-003 remains `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`. PR #108 remains Draft/Open/Unmerged.