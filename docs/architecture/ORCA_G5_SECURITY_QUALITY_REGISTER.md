# ORCA G5 Security & Quality Register

## Purpose

This register records the repository security and quality posture established by G5. It is derived from the current source tree and the G4 contract registry. Missing evidence is retained explicitly; it is never converted into a passing result by documentation alone.

## Repository baseline

- G5 start SHA: `b42c41a9e2c11e1ee8436c6a70425035e45d04aa`
- G4 contracts: **359**
- Contracts with direct current test references: **300**
- Contracts without a direct current test reference: **59**
- Main baseline: `f7af072c689178d397019648ab5c21336ab259b6`

## Required controls

G5 requires the following controls on every pull request:

1. deterministic dependency installation from `package-lock.json`;
2. Production dependency audit at `moderate` or higher;
3. TypeScript `--noEmit` typecheck;
4. G3, G4, and G5 executable foundation gates;
5. existing core, Sentinel, WhatsApp, tenant-isolation, payment, and P2 acceptance suites;
6. production build;
7. CodeQL analysis for Actions, JavaScript/TypeScript, and Python;
8. Vercel preview/status validation;
9. no focused tests (`.only`), skipped tests, or test TODOs in the accepted test tree.

## Dependency posture

G5 replaces unstable or vulnerable dependency resolution with reviewed versions:

- Next.js: `16.2.10`;
- `@sentry/nextjs`: `10.67.0`;
- React and React DOM: `18.3.1`;
- TypeScript: `6.0.3`;
- React/Node type packages pinned to the lockfile-compatible reviewed versions.

Two narrow transitive overrides are retained:

- `brace-expansion` → `5.0.7`;
- `postcss` → the direct project PostCSS specification via `$postcss`.

The overrides exist only to remove advisories still selected by transitive dependency constraints. They must remain covered by typecheck, tests, production build, CodeQL, and the blocking Production dependency audit.

## Runtime source findings

### Closed findings

| Finding | Previous location | Resolution |
|---|---|---|
| Insecure random Paylink idempotency key | `lib/payments/providers/paylink.ts` | Replaced `Math.random()` with Node `randomUUID()` |
| Insecure browser payment idempotency key | `components/contracts-payments/ContractsPaymentsCenter.tsx` | Replaced both six-digit random values with `globalThis.crypto.randomUUID()` |

### Reviewed retained signal

| Signal | Location | Disposition |
|---|---|---|
| Static `dangerouslySetInnerHTML` | `app/login/LoginClient.tsx` | `ACCEPTED_LOW_STATIC`: the payload is a fixed inline CSS template; the reviewed expression does not include user-controlled content. CSP/style modernization remains optional hardening, not a G5 blocker. |

G5 blocks any current `CRITICAL` or `HIGH` runtime finding emitted by the repository scanner.

## API boundary review

The API inventory contains **129** routes. G5 traces authorization/security evidence through local imports rather than inspecting route files in isolation.

Accepted boundary classes:

- authenticated and database-revalidated tenant routes;
- Platform Owner boundaries;
- trusted Cron routes protected by shared-secret validation;
- provider Webhooks protected by HMAC/signature/secret or server-to-server provider verification;
- OAuth/return callbacks that validate signed state or revalidate the provider transaction;
- intentionally public health/readiness routes exposing no tenant data.

The following reviewed public or provider-facing boundaries are not treated as missing authentication merely because they do not use a browser session:

- health/readiness routes;
- Google/WhatsApp OAuth callbacks;
- Paylink, N-Genius, custom-payment, WhatsApp, leads, and revenue-integrity Webhooks;
- payment return/callback routes;
- Cron and deployment-marker routes with secret checks.

Any API outside these categories without direct or transitive security evidence is blocking.

## G4 `NOT_PROVEN` classification

The 59 contracts without direct current test references are classified as follows:

| Priority | Count | G5 disposition |
|---|---:|---|
| `P0_SECURITY_CRITICAL_SURFACE` | 11 | Static security/auth boundary must be present now; direct behavioral expansion remains a named quality backlog item and is scored at G8. |
| `P1_MUTATION_SURFACE` | 8 | Mutation source and tenant/security boundary recorded; direct behavioral expansion remains open unless already covered indirectly by acceptance suites. |
| `P1_SENSITIVE_READ_SURFACE` | 6 | Sensitive read boundary recorded; direct response/denial tests remain open. |
| `P2_READ_SURFACE` | 16 | Lower-risk read contract retained as `NOT_PROVEN`; prioritize only when it becomes release-critical or changes. |
| `P3_UI_SURFACE` | 16 | Owned by visual closure/G8; not falsely marked functionally verified. |
| `P4_SOURCE_STATE` | 2 | Route/source-state evidence retained; no standalone runtime behavior claimed. |

This classification closes the ambiguity, not the missing behavioral evidence. The 59 contracts remain visible in generated G5 artifacts and feed the final foundation score.

## Tooling review signals

Operational scripts may legitimately use child processes or dynamic SQL APIs. These are not runtime application vulnerabilities by presence alone. They remain review-required and must preserve:

- fixed executable/argument selection or no shell interpolation;
- dry-run/default-safe behavior where data may change;
- allowlisted table/column identifiers for dynamic SQL;
- explicit environment/approval gates;
- no Production execution as part of repository CI.

## Quality debt retained

- No standalone ESLint configuration currently exists; G5 does not invent a non-functional lint command. Typecheck, executable contracts, acceptance suites, CodeQL, and production build are the enforced current gates.
- The 59 contracts without direct test references remain a measurable quality backlog.
- Visual `PARTIAL`, `PARTIAL_DOCUMENTED_ISSUE`, `NOT_PROVEN`, and historical-only statuses remain owned by G8.
- Operational backup/restore and recovery evidence remains owned by G6.

## Change rule

Any change to dependencies, API boundaries, runtime risk patterns, G4 contract counts, test focus/skip state, or accepted low-risk exceptions must update this register and pass the G5 executable gate. Production deployment and Production data operations are outside G5.
