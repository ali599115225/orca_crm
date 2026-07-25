# ORCA Z8 — EXEC-003 v2 Semantic Behavioral Evidence Ledger

- **Document ID:** `ORCA-Z8-EXEC-003-V2-EVIDENCE-LEDGER-001`
- **Package:** `EXEC-003 v2`
- **Slice:** `NARROW_EVIDENCE_REMEDIATION`
- **Package state:** `IN_EXECUTION / BLOCKED`
- **PR state:** `DRAFT / OPEN / UNMERGED`
- **Evidence head SHA:** `PENDING FINAL VALIDATION`
- **ORCA CI:** `PENDING FINAL VALIDATION`
- **CI checkout mode:** `PENDING FINAL VALIDATION`
- **Synthetic merge SHA:** `PENDING FINAL VALIDATION`
- **Base SHA:** `PENDING FINAL VALIDATION`
- **CI statement:** `PENDING FINAL VALIDATION`

## Source of truth

Direct behavioral credit is derived from the executable typed manifest:

`tests/foundation/g5-exec-003-behavior-evidence-manifest.ts`

The semantic integrity gate is:

`tests/foundation/g5-exec-003-evidence-ledger.test.ts`

Markdown is not used to calculate credit. The gate parses the registered test files as TypeScript AST and verifies that every registered operation:

1. is one of the frozen operations;
2. binds the expected actual Route Handler or Server Action;
3. has an executable ALLOW case;
4. has an executable DENY case;
5. proves downstream non-execution on denial when the boundary exposes a downstream operation;
6. proves downstream reachability after authorization;
7. does not mock its final security decision;
8. uses the Assignment Registry permission key, boundary type, and Legacy role set;
9. cannot receive credit through same-file spillover.

## Evidence classification

| Class | Meaning |
|---|---|
| `DIRECT_BEHAVIORAL` | Invokes the actual Route Handler or Server Action and traverses the registered security boundary. |
| `STRUCTURAL / SOURCE_ASSERTION` | Wiring evidence only; never counted as direct behavioral credit. |
| `UNIT_BEHAVIOR` | Supporting shared-guard or Cookie-guard behavior; never substitutes for contract-entry evidence. |

## Current independent baseline

The last independent review remains authoritative until the new semantic gate and final CI pass:

```text
Strict direct contracts: 4/25
Strict direct operations: 4/32
Test gap: 59 → 55
P0 remaining: 9
P1 mutation remaining: 6
P1 sensitive read remaining: 6
P2 remaining: 16
P3 remaining: 16
P4 remaining: 2
```

## Pending executable result

The typed manifest registers exactly:

```text
Frozen contracts: 25
Frozen operations: 32
Eligible database-RBAC contracts: 20
Excluded contracts under original boundaries: 5
Excluded boundary types: SIGNED_BOUNDARY, DELEGATED_DATABASE_RBAC, SESSION_CLAIM_EXACT
```

No new credit is final while identity fields remain `PENDING FINAL VALIDATION`.

## Real security decisions

### Database RBAC

The eligible contract tests keep the real chain:

```text
actual Route Handler or Server Action
→ EXEC-003 shared guard
→ effective Legacy/progressive role intersection
→ hasDatabaseRole
→ authBootstrapFindUserRole
→ authBootstrapFindTenantActive
→ downstream operation
```

`hasDatabaseRole` is forbidden from test mocks. Only session retrieval, AUTH_BOOTSTRAP lookups, tenant context, database/domain operations, and external dependencies may be mocked.

The Runtime AUTH_BOOTSTRAP user-role lookup does not expose a distinct inactive-user predicate. Therefore database-RBAC evidence does not invent an unsupported inactive-user state. Missing user, inactive tenant, tenant mismatch, disallowed role, unknown role, and missing/unknown permission fail closed through the actual decision implementation.

### Delegated boundary C17

C17 invokes `generateAIInsight` with the real `requireAgentAccess`. The tests mock only session retrieval, the tenant-scoped user lookup, tenant context, and the AI provider. They prove missing session, missing user, inactive user, tenant mismatch, disallowed role, and allowed active user behavior.

### Original excluded boundaries

- `C02` and `C09`: real signed/HMAC boundaries.
- `C17`: real delegated database-RBAC boundary.
- `C18` and `C19`: exact Legacy claim `Admin`; `ADMIN` remains denied.

These contracts are not connected to the shared database guard.

## Operation registration

The manifest derives Operation IDs in frozen Assignment Registry order:

```text
EXEC-003-C01-O01
EXEC-003-C02-O01
EXEC-003-C03-O01
EXEC-003-C04-O01
EXEC-003-C04-O02
EXEC-003-C05-O01
EXEC-003-C05-O02
EXEC-003-C05-O03
EXEC-003-C06-O01
EXEC-003-C07-O01
EXEC-003-C08-O01
EXEC-003-C09-O01
EXEC-003-C10-O01
EXEC-003-C11-O01
EXEC-003-C11-O02
EXEC-003-C12-O01
EXEC-003-C12-O02
EXEC-003-C13-O01
EXEC-003-C14-O01
EXEC-003-C14-O02
EXEC-003-C15-O01
EXEC-003-C15-O02
EXEC-003-C16-O01
EXEC-003-C17-O01
EXEC-003-C18-O01
EXEC-003-C19-O01
EXEC-003-C20-O01
EXEC-003-C21-O01
EXEC-003-C22-O01
EXEC-003-C23-O01
EXEC-003-C24-O01
EXEC-003-C25-O01
```

## Scope statement

```text
Runtime changes in this remediation: 0
Prisma changes: 0
Migrations: 0
Backfills: 0
Production data changes: 0
Provider credential changes: 0
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
```

Final credit and CI identity will be recorded only after the final synthetic PR merge CI succeeds against the final branch head and PR base.
