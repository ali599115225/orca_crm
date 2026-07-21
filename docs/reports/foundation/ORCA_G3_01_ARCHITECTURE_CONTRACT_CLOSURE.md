# ORCA G3-01 Architecture Contract Closure

## Stage record

- **Stage:** G3-01 — Architecture Contract
- **Result:** IMPLEMENTED_PENDING_CI
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Start SHA:** `a8dd9c0ca1047651227c0f1268acca03599bfe0f`
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

## Files added

- `docs/architecture/ADR-G3-01-single-company-access-context.md`
- `tests/foundation/g3-01-architecture-contract.test.ts`
- `docs/reports/foundation/ORCA_G3_01_ARCHITECTURE_CONTRACT_CLOSURE.md`

## Migration record

- Prisma migrations created: **0**
- Database schema modified: **no**
- Production migration applied: **no**
- `prisma db push` used: **no**

## Test contract

The new Vitest contract checks that:

- every mandatory G3-01 decision is present in the ADR;
- current schema compatibility anchors remain present;
- no destructive `companyId` rename or legacy-data deletion is authorized;
- branch/department/team/self/resource scopes remain subordinate to `tenantId`.

Command expected in CI or an equivalent verified environment:

```bash
npx vitest run tests/foundation/g3-01-architecture-contract.test.ts
```

## Build and security impact

- Runtime source changed: **no**
- Prisma schema changed: **no**
- Build behavior changed: **no**
- Authentication behavior changed: **no**
- Authorization behavior changed: **no**
- Tenant isolation behavior changed: **no**
- Secrets added: **no**

The stage is intentionally documentation-and-contract only. CI evidence and PR merge evidence must be appended before the result changes to `PASS`.

## Rollback

Before merge, rollback is deletion/reversion of the three G3-01 files on the foundation branch.

After merge, rollback is a normal revert of the G3-01 commit set. No schema or data rollback is needed because this stage creates no migration and changes no runtime code.

## Remaining gate

- open PR to the central branch;
- verify the stage test and required repository checks;
- update this report with final SHAs and check evidence;
- merge only after checks pass;
- do not begin G3-02 before G3-01 is closed.
