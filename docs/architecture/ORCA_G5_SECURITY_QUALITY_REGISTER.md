# ORCA G5 Security & Quality Register

## Purpose

This register records the repository security and quality posture established by G5. It is derived from the current source tree and the G4 contract registry. Missing evidence is retained explicitly; it is never converted into a passing result by documentation alone.

## Repository baseline and current evidence posture

- G5 start SHA: `b42c41a9e2c11e1ee8436c6a70425035e45d04aa`
- G4 contracts: **359**
- Contracts with current test references: **325**
- Contracts without a current test reference: **34**
- EXEC-003 v2 contract-level direct behavioral evidence: **25 contracts / 32 operations**
- EXEC-003 v2 eligible wired operations: **27 operations / 20 contracts**
- EXEC-003 v2 excluded operations tested under original boundaries: **5 operations / 5 contracts**
- Structural-only frozen contracts after remediation: **0**
- Main baseline: `f7af072c689178d397019648ab5c21336ab259b6`

The reduction from `59` to `34` is limited to the exact 25 frozen EXEC-003 v2 contracts. It is now supported by tests that invoke each actual Route Handler or Server Action entry point. The previous wiring test remains useful, but it is classified only as `STRUCTURAL / SOURCE_ASSERTION` and does not independently earn direct behavioral credit.

The authoritative evidence ledger is:

`docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_LEDGER.md`

The evidence head is `3dc4b8d865212716e5bfdb844a85e7d9c90e17ea`. ORCA CI `#365` succeeded using the PR merge ref. CI validated synthetic merge commit `0ea28c491d67fee8356f566a34861daf0b956474`, containing that head SHA, against base SHA `001b2c853e99ea055f161dcd294d968bbf25c9ad`.

## Evidence semantics

| Class | G5 meaning |
|---|---|
| `DIRECT_BEHAVIORAL` | Invokes the actual contract entry point and traverses the contract authorization boundary. |
| `STRUCTURAL` | Validates wiring, inventories, or code structure without invoking the contract entry point. |
| `SOURCE_ASSERTION` | Reads or matches source text, symbols, imports, literals, or Regex patterns. |
| `UNIT_BEHAVIOR` | Exercises a unit such as the shared guard independently from a contract. |
| `INTEGRATION` | Exercises multiple real components or generated inventories together. |
| `REGRESSION` | Protects established behavior after a defect or compatibility correction. |

A source reference alone may make a contract discoverable by G4, but it is not sufficient for EXEC-003 direct behavioral credit. The EXEC-003 ledger and `g5-exec-003-evidence-ledger.test.ts` bind each credit to an exact test name in an executable test file.

## Required controls

G5 requires the following controls on every pull request:

1. deterministic dependency installation from `package-lock.json`;
2. Production dependency audit at `moderate` or higher;
3. TypeScript `--noEmit` typecheck;
4. G3, G4, and G5 executable foundation gates;
5. existing core, Sentinel, WhatsApp, tenant-isolation, payment, and P2 acceptance suites;
6. production build;
7. CodeQL analysis for Actions, JavaScript/TypeScript, and Python;
8. Vercel preview/status validation only where the active execution package requires it;
9. no focused tests (`.only`), skipped tests, or test TODOs in the accepted test tree.

For EXEC-003 v2, Vercel is `SKIP_BY_DEFAULT`; GitHub ORCA CI, direct contract tests, TypeScript, generated inventories, and diff review are authoritative.

## Dependency posture

G5 retains the reviewed dependency baseline:

- Next.js: `16.2.11`;
- `@sentry/nextjs`: `10.67.0`;
- React and React DOM: `18.3.1`;
- TypeScript: `6.0.3`;
- React/Node type packages pinned to lockfile-compatible reviewed versions.

Two narrow transitive overrides remain:

- `brace-expansion` → `5.0.8`;
- `postcss` → the direct project PostCSS specification via `$postcss`.

They remain covered by typecheck, tests, production build, CodeQL, and the blocking Production dependency audit.

## Runtime source findings

### Closed findings

| Finding | Previous location | Resolution |
|---|---|---|
| Insecure random Paylink idempotency key | `lib/payments/providers/paylink.ts` | Replaced `Math.random()` with Node `randomUUID()` |
| Insecure browser payment idempotency key | `components/contracts-payments/ContractsPaymentsCenter.tsx` | Replaced both six-digit random values with `globalThis.crypto.randomUUID()` |

### Reviewed retained signal

| Signal | Location | Disposition |
|---|---|---|
| Static `dangerouslySetInnerHTML` | `app/login/LoginClient.tsx` | `ACCEPTED_LOW_STATIC`: fixed inline CSS with no reviewed user-controlled payload. |

G5 blocks any current `CRITICAL` or `HIGH` runtime finding emitted by the repository scanner.

## API boundary review

The API inventory contains **129** routes. Accepted boundary classes include authenticated database-revalidated tenant routes, Platform Owner boundaries, trusted Cron routes, signed provider Webhooks, signed OAuth/return callbacks, and intentionally public health/readiness routes.

Public or provider-facing boundaries are not treated as missing authentication merely because they do not use a browser session. This includes health/readiness, OAuth callbacks, payment and communication Webhooks, payment returns, Cron routes, and deployment markers protected by their appropriate boundary.

Any API outside the accepted categories without direct or transitive security evidence remains blocking.

## G4 `NOT_PROVEN` classification after behavioral remediation

| Priority | Count | G5 disposition |
|---|---:|---|
| `P0_SECURITY_CRITICAL_SURFACE` | 0 | The 11 frozen P0 contracts have direct contract-entry behavioral evidence. |
| `P1_MUTATION_SURFACE` | 0 | The 8 frozen P1 mutation contracts have direct contract-entry behavioral evidence. |
| `P1_SENSITIVE_READ_SURFACE` | 0 | The 6 frozen P1 sensitive-read contracts have direct contract-entry behavioral evidence. |
| `P2_READ_SURFACE` | 16 | Lower-risk read backlog remains `NOT_PROVEN`. |
| `P3_UI_SURFACE` | 16 | Visual backlog remains outside EXEC-003. |
| `P4_SOURCE_STATE` | 2 | Source-state backlog remains outside EXEC-003. |

Total remaining: `34`.

No P2, P3, or P4 gap was reduced by an EXEC-003 security test.

## EXEC-003 v2 evidence boundary

Authoritative records:

- `docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_FREEZE.md`;
- `docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_CONTRACT_WIRING_MATRIX.md`;
- `docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_LEDGER.md`;
- `tests/foundation/g5-exec-003-contract-behavior-pilot.test.ts`;
- `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts`;
- `tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts`;
- `tests/foundation/g5-exec-003-contract-behavior-p1-sensitive-read.test.ts`;
- `tests/foundation/g5-exec-003-signed-boundary-behavior.test.ts`;
- `tests/foundation/g5-exec-003-delegated-boundary-behavior.test.ts`;
- `tests/foundation/g5-exec-003-exact-claim-boundary-behavior.test.ts`;
- `tests/foundation/g5-exec-003-evidence-ledger.test.ts`;
- `tests/foundation/g5-exec-003-shared-guard.test.ts`;
- `tests/foundation/g5-exec-003-cookie-guard.test.ts`;
- `tests/foundation/g5-exec-003-contract-wiring.test.ts` — `STRUCTURAL / SOURCE_ASSERTION` only.

The five excluded contracts retain and directly exercise their original boundaries:

- C02 and C09: actual signed/HMAC boundaries;
- C17: delegated database RBAC through `requireAgentAccess`;
- C18 and C19: exact Legacy claim `Admin`.

The boundary-specific test split prevents the shared `app/actions/logs.ts` file from granting evidence to the unfrozen `getSystemLogsAction`.

## Validation on the evidence head

ORCA CI `#365` recorded:

- G5 executable tests: `135/135 PASS`, `33/33 suites`;
- TypeScript: PASS;
- Production dependency audit: PASS;
- Production gate: PASS;
- G5–G8: PASS;
- Foundation and Sentinel regressions: PASS;
- P2 acceptance: PASS;
- Build: PASS;
- isolated recovery drill: PASS.

This is PR-merge-ref validation, not a claim that GitHub checked out the head commit directly.

## Tooling review signals

Operational scripts may legitimately use child processes or dynamic SQL APIs. They remain review-required and must preserve fixed executable selection, no unsafe shell interpolation, dry-run/default-safe behavior where data can change, allowlisted identifiers, explicit approval gates, and no Production execution in repository CI.

## Quality debt retained

- The 34 non-EXEC-003 contracts without direct evidence remain measurable debt.
- Visual and historical-only evidence remains owned by later visual/release gates.
- Operational backup/restore evidence remains owned by G6.
- EXEC-003 remains `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`.
- This register does not authorize Merge, main, Production, Vercel Preview, or EXEC-004.

## Change rule

Any change to dependencies, API boundaries, Runtime risks, G4 counts, evidence classifications, test focus/skip state, or accepted exceptions must update this register and pass G5. Production deployment and Production data operations remain outside G5.