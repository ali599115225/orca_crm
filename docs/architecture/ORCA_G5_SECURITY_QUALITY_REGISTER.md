# ORCA G5 Security & Quality Register

## EXEC-003 v2

- **Mode:** `FINAL NARROW EVIDENCE-GATE REMEDIATION`
- **Package:** `EXEC-003 v2`
- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Base:** `work/orca-zero-based-execution-20260721`
- **Source head:** `e6966950f86e2698ec76bd29271fe2f51dae596f`
- **Validated implementation head:** `d84a1ea5e10a64778c841f59d8049ec1ae25e522`
- **Evidence digest:** `b6cb250d25d2b939f9a153647e809174e23c8d26783a2f7d17cc9e4d526e6652`
- **Digest algorithm:** `sha256-path-length-content-v2-derived-manifest`
- **Derived evidence files:** `48`
- **Validated base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Checkout mode:** `PR_MERGE_REF`
- **Evidence identity:** `docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json`

The evidence file set is derived from the 32 Manifest bindings. It includes every frozen Route Handler and Server Action, the final and delegated guards, Assignment Registry, Shared Guard, AUTH_BOOTSTRAP boundary, evidence tests and tools, and the actual Vitest configuration. A missing, unreadable, or omitted security-influential file fails closed.

## Runtime status

This final narrow remediation changes no Runtime file. The previously corrected `authBootstrapFindUserRole` remains read-only evidence input and still requires:

```text
id = session.userId
tenantId = session.tenantId
isActive = true
select = { role: true }
```

The new behavioral exception test proves that a rejected Database lookup returns `null` and grants no role through the real `hasDatabaseRole` decision.

```text
Runtime security defects remaining: 0
Runtime files changed in this remediation: 0
```

## Semantic evidence gate

- Candidate Manifest: `tests/foundation/g5-exec-003-behavior-evidence-manifest.ts`
- Semantic gate: `tests/foundation/g5-exec-003-evidence-ledger.test.ts`
- Derived identity gate: `tests/foundation/g5-exec-003-evidence-identity.test.ts`
- AUTH_BOOTSTRAP proof: `tests/foundation/g5-exec-003-auth-bootstrap-active-user.test.ts`
- Registry gate: `tests/foundation/g5-exec-003-registry-reconciliation.test.ts`

Direct credit is derived only after the TypeScript AST gate validates:

1. 25 Contract IDs and 32 Operation IDs;
2. stable operation fingerprints, Permission Keys, Legacy roles and boundaries;
3. distinct ALLOW and DENY names and callbacks;
4. actual Entry Point import, binding and invocation;
5. an unmocked and unmodified Entry Point module/export;
6. real final/delegated guards;
7. downstream suppression on DENY and reachability after ALLOW;
8. original signed, exact-claim and Cookie-only boundaries;
9. Operation-level spillover `0` and out-of-scope credit `0`;
10. no `skip`, `todo`, `only` or `focus`.

The negative gate tests reject `vi.mock`, `vi.doMock`, `vi.spyOn`, aliases, indirect factories, computed mutation, `Object.assign`, wrong `vi.importActual` paths, mocked intermediary re-exports, setup-file mocks, missing digest files, omitted Entry Points, omitted guards, reused Operation tests, and identical ALLOW/DENY evidence.

## C17 delegated boundary

```text
Tenant Context may be established inside the authorization guard solely for the tenant-scoped access lookup.

No AI provider call, domain operation, or post-authorization downstream work may execute before requireAgentAccess succeeds.
```

All C17 DENY cases suppress the AI provider. The ALLOW case reaches the provider only after the real `requireAgentAccess` succeeds. No C17 Runtime file was modified.

## Derived accounting

```text
Starting strict direct credit: 3 contracts / 3 operations
Starting remaining gap: 56
Final directly tested contracts: 25/25
Final directly tested operations: 32/32
Full direct behavioral credit: 25 contracts / 32 operations
Partial contract-entry tests: 0
Structural-only frozen contracts: 0
Out-of-scope contracts credited: 0
Operation-level spillover: 0
Baseline gap: 59
Remaining gap: 34
P0 remaining: 0
P1 mutation remaining: 0
P1 sensitive read remaining: 0
P2 remaining: 16
P3 remaining: 16
P4 remaining: 2
```

Contracts without a direct current test reference: **34**

EXEC-003 v2 direct evidence: **25 contracts**

| Priority class | Contracts without direct current test evidence |
|---|---:|
| `P0_SECURITY_CRITICAL_SURFACE` | 0 |
| `P1_MUTATION_SURFACE` | 0 |
| `P1_SENSITIVE_READ_SURFACE` | 0 |
| `P2_READ_SURFACE` | 16 |
| `P3_UI_SURFACE` | 16 |
| `P4_SOURCE_STATE` | 2 |

The priority rows reconcile exactly: `0 + 0 + 0 + 16 + 16 + 2 = 34`.

## Durable dependency risk register

| Dependency / control | Classification | Current handling |
|---|---|---|
| Static low-severity findings | `ACCEPTED_LOW_STATIC` | Retained only under the reviewed production-audit threshold and CI gate. |
| `brace-expansion` | Reviewed package override | Registered with ownership and removal trigger; production audit remains mandatory. |
| `postcss` | Reviewed package override | Uses the package-managed override and remains covered by deterministic install and audit. |

## Validation

```text
G5 executable tests: 194/194 PASS
G5 suites: 47/47 PASS
TypeScript: PASS
Production gate: PASS
Production dependency audit: PASS
G5: PASS
G6: PASS
G7: PASS
G8: PASS
Foundation regressions: PASS
Sentinel regressions: PASS
P2 acceptance: PASS
Build: PASS
Isolated recovery drill: PASS
Derived evidence digest verification: PASS
Registry reconciliation: PASS
```

## Scope

```text
Runtime files changed: 0
Prisma schema changes: 0
Migrations: 0
Backfills: 0
Production data changes: 0
Provider changes: 0
Environment changes: 0
UI changes: 0
Permission key changes: 0
Legacy role changes: 0
Authentication channel expansion: 0
New privilege grants: 0
Dynamic permission keys: 0
Tests deleted: 0
Skipped/focused/TODO tests: 0
EXEC-004 work: 0
main changes: 0
Production changes: 0
Vercel Preview: NOT REQUIRED
```

EXEC-003 remains `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`. Next authorized step: `INDEPENDENT FINAL RE-REVIEW ONLY`.
