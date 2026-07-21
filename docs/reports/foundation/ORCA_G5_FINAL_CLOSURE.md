# ORCA G5 Final Closure

## Stage record

- **Stage:** G5 — Security & Quality
- **Repository status:** PASS / READY FOR FINAL CHECKS
- **Start SHA:** `b42c41a9e2c11e1ee8436c6a70425035e45d04aa`
- **Verified implementation head:** `a28f78b874e5a1fa42901ebe8fef3a864b12269f`
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **PR:** #63
- **Main baseline:** `f7af072c689178d397019648ab5c21336ab259b6`
- **Production migration:** none
- **Production backfill:** none
- **Production environment/secret change:** none
- **Production data change:** none
- **Production deploy:** none

## Delivered controls

G5 establishes permanent repository gates for:

- deterministic `npm ci` installation;
- Node.js 24, matching the declared project engine;
- Prisma schema validation and client generation;
- the existing Production safety gate;
- G3 final verification;
- G4 contract generation and reconciliation;
- G5 security and quality inventory generation;
- a blocking Production dependency audit;
- blocking TypeScript `--noEmit` typecheck;
- executable G5 risk/coverage contracts;
- existing foundation, Sentinel, WhatsApp, tenant-isolation, payment, and P2 acceptance suites;
- production build;
- CodeQL Actions, Python, and JavaScript/TypeScript analysis;
- Vercel preview/status validation.

## Dependency result

The initial Production dependency audit identified **7** advisory paths: **1 high** and **6 moderate**. G5 resolved those paths through reviewed direct upgrades and narrow transitive overrides.

### Direct reviewed versions

- Next.js `16.2.10`;
- `@sentry/nextjs` `10.67.0`;
- React and React DOM `18.3.1`;
- TypeScript `6.0.3`;
- reviewed exact React/Node type-package versions.

### Narrow overrides

- `brace-expansion` → `5.0.7`;
- PostCSS transitive users → the direct project PostCSS specification through `$postcss`.

The resulting candidate and official CI Production audits returned zero vulnerabilities at the configured blocking level. The overrides remain guarded by typecheck, tests, build, CodeQL, and every future Production dependency audit.

## Runtime source result

Three confirmed insecure-randomness findings were closed:

1. Paylink server idempotency generation now uses Node `randomUUID()`;
2. both browser payment idempotency values now use `globalThis.crypto.randomUUID()`.

The final scanner reports:

- `CRITICAL`: **0**;
- `HIGH`: **0**;
- retained `LOW`: **1** static `dangerouslySetInnerHTML` usage in the login client.

The retained low signal contains a fixed CSS template and no reviewed user-controlled content. It is recorded as `ACCEPTED_LOW_STATIC`, not silently removed from evidence.

## API boundary result

All **129** API routes carry a recorded security-boundary classification:

- **124** with direct or transitive authentication/authorization/security evidence;
- **5** intentionally public, signed, provider-verified, OAuth-return, Cron, or health/readiness boundaries;
- **0** routes with undetected security evidence after reviewed classifications.

The scanner follows local imports, so authentication implemented in a shared route/service wrapper is not misclassified as absent.

## G4 missing-evidence classification

All **59** G4 contracts without direct current test references are classified:

| Priority | Count |
|---|---:|
| `P0_SECURITY_CRITICAL_SURFACE` | 11 |
| `P1_MUTATION_SURFACE` | 8 |
| `P1_SENSITIVE_READ_SURFACE` | 6 |
| `P2_READ_SURFACE` | 16 |
| `P3_UI_SURFACE` | 16 |
| `P4_SOURCE_STATE` | 2 |

G5 closes the ambiguity and creates ownership. It does not pretend that classification is equivalent to direct behavioral coverage. Remaining behavioral expansion is retained for release scoring and later-stage work.

## Quality result

- TypeScript typecheck is now a standalone blocking gate.
- Seven type errors exposed by the new gate were corrected in foundation tests without weakening runtime contracts.
- No focused tests, skipped tests, or test TODOs remain in the accepted test tree.
- The G5 executable test regenerates G4 and G5 evidence and rejects:
  - unclassified missing evidence;
  - unreviewed high/critical runtime findings;
  - APIs without a security-boundary classification;
  - unbounded dependency specifications;
  - loss of CodeQL, Dependabot, lockfile, audit, or typecheck controls;
  - drift between CI and the durable G5 register.

No standalone ESLint configuration currently exists. G5 does not add a cosmetic lint command that cannot run. The enforced quality controls are typecheck, executable contracts, acceptance/regression suites, CodeQL, dependency audit, and production build.

## Verified checks

The implementation head `a28f78b874e5a1fa42901ebe8fef3a864b12269f` passed:

- Node.js 24 dependency installation;
- Prisma validation/generation;
- Production safety gate;
- G3 and G4 gates;
- G5 inventory generation;
- Production dependency audit;
- Typecheck;
- G5 executable contract tests;
- core foundation regressions;
- all four Sentinel regression gates;
- P2 acceptance;
- production build;
- CodeQL Actions, Python, and JavaScript/TypeScript analysis.

A Vercel preview request for that head was rejected by the provider's build-rate limit rather than an application build error. The connected Vercel project shows recent branch previews in `READY` state. The final documentation head must obtain a normal Vercel status before PR #63 is merged.

## Durable outputs

- `docs/architecture/ORCA_G5_SECURITY_QUALITY_REGISTER.md`;
- `docs/reports/foundation/ORCA_G5_FINAL_CLOSURE.md`;
- `scripts/g5-security-quality-inventory.mjs`;
- `tests/foundation/g5-security-quality.test.ts`;
- G5 machine-readable inventory, dependency tree, audit, outdated-package, and executable-test artifacts on every PR run.

## Residual ownership

- **G6 — Operations, Recovery & Reliability:** operational scripts, backup/restore, monitoring, Cron reliability, recovery drills, and runtime operations evidence.
- **G8 — Final Foundation Gate:** score the 59 direct-test gaps and all remaining visual evidence gaps in the final GO / CONDITIONAL_GO / NO_GO decision.
- Dependency overrides must be removed when upstream versions no longer require them.

## Closure rule

G5 becomes repository-closed only after:

1. the final documentation head passes ORCA CI, blocking audit, typecheck, G5 tests, regressions, acceptance, and production build;
2. CodeQL succeeds for all configured languages;
3. Vercel preview/status succeeds without a provider quota rejection;
4. PR #63 merges into the central branch;
5. the foundation branch is fast-forwarded to the central merge SHA;
6. both branches compare identical;
7. `main` remains unchanged.

Until those conditions are reconciled, this report remains `PASS / READY FOR FINAL CHECKS`.
