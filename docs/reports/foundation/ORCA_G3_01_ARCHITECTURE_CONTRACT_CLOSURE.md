# ORCA G3-01 Architecture Contract Closure

## Stage record

- **Stage:** G3-01 — Architecture Contract
- **Result:** PASS
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Start SHA:** `a8dd9c0ca1047651227c0f1268acca03599bfe0f`
- **Verified implementation SHA:** `6f34edc8e3660786f46bf3951c330a3d0f31ae79`
- **PR:** `#50`
- **Baseline reconciliation state:** `FINAL_RECONCILIATION_STAGE_CLOSED`
- **Main baseline observed:** `f7af072c689178d397019648ab5c21336ab259b6`
- **Production changes:** none

## Connection and branch gate

The GitHub connection gate passed before repository writes:

- authenticated account: `ali599115225`;
- repository: `ali599115225/orca_crm`;
- repository readable and not archived;
- repository permissions include admin, maintain, pull, push, and triage;
- central branch exists;
- foundation branch exists and was not recreated;
- both branches were identical to `a8dd9c0ca1047651227c0f1268acca03599bfe0f` before G3-01;
- no prior unreported foundation-branch commits were present.

## Repository evidence reviewed

### Current tenant and session boundary

- `lib/session.ts` verifies the signed `session_token` using `JWT_SECRET` and returns the verified payload.
- `lib/api-auth-guard.ts` normalizes `userId`, `tenantId`, and `role`, then revalidates the current database user role and active tenant for sensitive access.
- `lib/tenant-context.ts` propagates `tenantId` and optional `userId` through `AsyncLocalStorage`; `runWithTenantContext()` is the preferred boundary and `setTenantContext()` is explicitly transitional.
- `lib/tenant.ts` resolves the tenant from session first, with legacy host/subdomain and privileged fallback behavior still present.

### Current schema compatibility anchors

- `prisma/schema.prisma` contains the legacy `Role` enum.
- `User` contains `tenantId`, `role`, `isActive`, and the legacy free-text `department` field.
- `Tenant` remains the company parent record and contains legacy subscription/billing fields.
- Operational models remain tenant-partitioned.

### Current authorization shape

- Existing sensitive guards are role-list based and database revalidated.
- Tenant propagation exists, but CompanyContext/AccessContext and permission-key RBAC are not yet implemented.
- These findings justify additive evolution rather than a destructive rename or replacement.

## Accepted architecture decisions

The accepted ADR is:

`docs/architecture/ADR-G3-01-single-company-access-context.md`

It establishes:

1. Single-Company Operational Mode.
2. `tenantId` retained as the persisted company/security boundary.
3. No repository-wide rename to `companyId` during G3.
4. Central CompanyContext/AccessContext responsibilities.
5. Trusted tenant scope from verified server identity and current DB state only.
6. Separation of OrgAssignment from RoleAssignment.
7. Scoped, DB-backed, default-deny RBAC.
8. Legacy Prisma `Role` and `User.department` retained through compatibility phases.
9. Legacy SaaS disabled later without deleting tables or historical data.
10. Expand → Backfill → Verify → Enforce → Contract.
11. Mandatory rollback, backup, restore, and isolated rehearsal evidence before production changes.
12. No Prisma migration in G3-01.

## Files changed

- added `docs/architecture/ADR-G3-01-single-company-access-context.md`;
- added `tests/foundation/g3-01-architecture-contract.test.ts`;
- added `docs/reports/foundation/ORCA_G3_01_ARCHITECTURE_CONTRACT_CLOSURE.md`;
- updated `.github/workflows/orca-ci.yml` to execute the G3-01 contract test explicitly.

## Migration record

- Prisma migrations created: **0**
- Database schema modified: **no**
- Production migration applied: **no**
- `prisma db push` used: **no**

## Test and build evidence

GitHub Actions `ORCA CI` run `131` passed on verified implementation SHA `6f34edc8e3660786f46bf3951c330a3d0f31ae79`.

Successful steps:

- Install;
- Prisma client generation;
- Production gate;
- Core regression tests, including `tests/foundation/g3-01-architecture-contract.test.ts`;
- Sentinel regression tests;
- P2 acceptance tests;
- production build.

The G3-01 test verifies that:

- every mandatory architecture decision is present in the ADR;
- current schema compatibility anchors remain present;
- no destructive `companyId` rename or legacy-data deletion is authorized;
- branch/department/team/self/resource scopes remain subordinate to `tenantId`.

## Security and deployment-preview evidence

GitHub Actions `CodeQL Advanced Setup` run `23` passed on the verified implementation SHA:

- Actions analysis: PASS;
- Python analysis: PASS;
- JavaScript/TypeScript analysis: PASS.

Vercel commit status: **success**.

This was a preview/status check only. No Production Deploy was requested or performed.

## Build and runtime impact

- Runtime source changed: **no**
- Prisma schema changed: **no**
- Authentication behavior changed: **no**
- Authorization behavior changed: **no**
- Tenant isolation behavior changed: **no**
- CI coverage changed: **yes**, additive contract-test inclusion only
- Secrets added: **no**

## Failure discovered and corrected

The first CI cycle did not execute the new G3-01 test because ORCA CI uses an explicit Vitest file list. The test was added to that list.

Two subsequent Core regression cycles exposed exact-string mismatches in the test contract (`default deny` versus `default-deny`, and Markdown code formatting around assignment model names). These were corrected in the test only; the accepted architecture decision did not change.

The final verified cycle passed all required gates.

## Rollback

Before merge, rollback is a normal revert of the G3-01 commit set on the foundation branch.

After merge, rollback is a normal revert of the PR merge. No schema or data rollback is needed because this stage creates no migration and changes no runtime code.

## Closure rule

G3-01 is technically complete at the verified implementation SHA. The evidence-only report update must also pass the required PR checks before merge.

G3-02 SHALL NOT begin until PR #50 is merged into the central branch and the central SHA is verified.
