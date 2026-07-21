# ADR G3-01 — Single-Company Access Context and Evolution Contract

- **Status:** Accepted
- **Decision date:** 2026-07-21
- **Applies from baseline:** `a8dd9c0ca1047651227c0f1268acca03599bfe0f`
- **Owning program:** ORCA Foundation / G3
- **Supersedes:** ad-hoc tenant and role authorization decisions where they conflict with this contract

## 1. Context

ORCA currently stores operational data in a tenant-partitioned PostgreSQL schema. `User` and the operational models carry `tenantId`, `Tenant` remains the parent company record, `User.role` uses the legacy Prisma `Role` enum, and `User.department` is still a free-text compatibility field.

The server currently obtains a signed session payload containing `userId`, `tenantId`, and `role`; sensitive guards revalidate the user role and active tenant in the database. Tenant scope is propagated through `AsyncLocalStorage` in `lib/tenant-context.ts`. Some older boundaries still use the transitional `setTenantContext()` bridge or host/subdomain fallback behavior.

The product is moving to a **single-company operational mode**, while retaining the current tenant boundary as a security partition and migration-safe compatibility layer. The system also needs DB-backed, scoped RBAC and an organizational hierarchy without a destructive rename or deletion campaign.

## 2. Decision

### 2.1 Single-Company Operational Mode

ORCA SHALL operate as one active company workspace in the current product mode.

This is an operational-mode decision, not a destructive data-model collapse. The `Tenant` record remains the persisted company boundary and `tenantId` remains on tenant-owned records.

The application SHALL NOT expose public self-service creation of additional companies once G3-08 enforcement is complete. Historical tenant and SaaS data SHALL remain readable by controlled administrative or recovery tooling unless a later approved retention decision states otherwise.

### 2.2 `tenantId` remains the security namespace

`tenantId` SHALL remain the canonical persisted partition key during G3.

A repository-wide rename to `companyId` is explicitly rejected for this phase because it would create high migration risk without improving the security boundary. UI copy and domain language MAY say “company”; persistence and trusted server context continue to use `tenantId`.

No request body, query string, route parameter, form value, client component state, or browser storage value may establish the trusted tenant/company scope.

### 2.3 Central CompanyContext and AccessContext

All new sensitive server boundaries SHALL converge on a central context model:

```ts
interface CompanyContext {
  tenantId: string;
  userId: string;
  tenantActive: boolean;
  userActive: boolean;
}

interface AccessContext extends CompanyContext {
  orgAssignments: ResolvedOrgAssignment[];
  roleAssignments: ResolvedRoleAssignment[];
  permissionKeys: ReadonlySet<string>;
  resolvedAt: Date;
}
```

The final names may be adjusted to fit repository conventions, but the responsibilities are fixed:

- `CompanyContext` establishes the verified company, user, and activation state.
- `AccessContext` adds organizational placement, assigned roles, permissions, validity windows, and scopes.
- `resolveAccessContext()` SHALL build the context from the signed session identity plus current database state.
- JWT role and tenant claims are bootstrap hints only; they are not sufficient authorization evidence for sensitive operations.
- `runWithTenantContext()` remains the required propagation mechanism while G3 is implemented.
- `setTenantContext()` remains a deprecated compatibility bridge and SHALL NOT be used by new boundaries when an operation can be wrapped.
- Default behavior for a missing, invalid, inactive, expired, or contradictory context is **deny**.

### 2.4 Trusted scope derivation

The trusted `tenantId` SHALL originate only from:

1. a cryptographically verified server session or other explicitly approved server identity;
2. database revalidation of the user and active `Tenant` membership;
3. a server-created `CompanyContext` / `AccessContext` propagated through the request operation.

Resource access SHALL include a server-side tenant predicate or an equivalent relation check. A matching resource ID alone is never sufficient.

Platform/recovery operations that intentionally bypass a tenant operation context SHALL use an explicit, auditable platform boundary; they SHALL NOT silently reuse an arbitrary tenant claim.

### 2.5 Organizational placement and authorization are separate

`OrgAssignment` and `RoleAssignment` SHALL be separate concepts and tables.

- `OrgAssignment` answers: **where does this user work?**
- `RoleAssignment` answers: **what authority does this user hold, and within what scope?**

A user may have more than one valid organizational placement or role assignment. Assignments SHALL support status, `validFrom`, `validUntil`, and assignment/audit metadata.

Removing a role SHALL NOT delete the user’s organizational placement. Moving a user between teams SHALL NOT implicitly grant a role.

### 2.6 Scoped, DB-backed RBAC

The target authorization model is permission-key based, database backed, and scope aware.

Authorization SHALL evaluate at least:

- active user;
- active tenant/company;
- active and non-expired role assignment;
- permission attached to the assigned role;
- organizational or resource scope match;
- tenant equality;
- any resource ownership rule required by the operation.

The legacy Prisma `Role` enum SHALL remain during Expand and Backfill. It is a compatibility source for initial role seeding/backfill, not the permanent authorization authority after enforcement.

The system SHALL use **default deny**. Absence of a permission, assignment, context, or scope match is a denial.

### 2.7 Scope vocabulary

G3 SHALL support an explicit scope vocabulary. The additive schema may refine names, but the minimum semantics are:

- `TENANT`: all resources inside the verified company boundary;
- `BRANCH`: resources assigned to one branch;
- `DEPARTMENT`: resources assigned to one department;
- `TEAM`: resources assigned to one team;
- `SELF` or `OWNED`: resources owned by or assigned to the acting user;
- `RESOURCE`: an explicitly bound resource where required.

Scope resolution SHALL never weaken the tenant boundary. Branch, department, team, self, and resource scopes are always subordinate to `tenantId`.

### 2.8 Legacy SaaS capability disablement

Legacy SaaS concepts and data SHALL be disabled, not deleted, during G3.

This includes public tenant registration, plans, subscriptions, upgrades/downgrades, trials, billing automation, renewal jobs, and related navigation or feature entry points identified in G3-08.

Disablement SHALL be layered across UI, navigation, routes, server actions/APIs, jobs, and feature flags. Existing tables and fields such as subscription and billing metadata remain available for audit, recovery, and later contract cleanup.

No destructive schema removal is authorized by this ADR.

### 2.9 Expand → Backfill → Verify → Enforce → Contract

All G3 schema and authorization evolution SHALL follow this sequence:

1. **Expand:** add nullable/additive structures, indexes, and compatibility code.
2. **Backfill:** populate new structures idempotently and in batches.
3. **Verify:** compare counts, relationships, authorization decisions, and tenant isolation.
4. **Enforce:** progressively enable default-deny RBAC and constraints after evidence passes.
5. **Contract:** remove or lock legacy paths only in a later, separately approved phase.

No G3 stage may combine destructive contraction with an unverified backfill.

### 2.10 Rollback, backup, and restore policy

Every migration or enforcement stage SHALL document a rollback path before execution.

- G3-01 creates no Prisma migration.
- Future migrations SHALL be generated as reviewable SQL and tested against an isolated database.
- Production SHALL NOT use `prisma db push`.
- Before any production migration, a restorable backup or provider snapshot SHALL be confirmed under a separate production gate.
- Rollback SHALL prefer code/feature-flag rollback and additive compatibility over destructive reverse SQL.
- A down migration may be supplied only when it is data-safe and explicitly reviewed.
- Backfills SHALL support dry-run/preview where practical, idempotency, bounded batches, progress evidence, and restart safety.
- Restore success SHALL not be claimed without a documented rehearsal on an isolated environment.
- A production restore or migration application requires an independent release decision and is outside this ADR’s execution authority.

## 3. Required implementation boundaries

The following boundaries are mandatory for later G3 stages:

| Boundary | Required behavior |
|---|---|
| Session/bootstrap | Verify signature; use claims only to locate current DB identity |
| Company resolution | Revalidate active user and tenant; reject inactive or missing records |
| Context propagation | Prefer `runWithTenantContext()` for the complete operation |
| Authorization | `authorize()` / `requirePermission()` with default deny |
| Persistence | Tenant predicate or relation check on every tenant-owned operation |
| Jobs/cron | Explicit trusted execution context; no browser-derived tenant input |
| Audit mode | Compare legacy and new decisions without logging sensitive payloads |
| Enforcement | Progressive rollout by sensitive domain, with direct-request tests |
| Platform operations | Explicit, narrow, auditable boundary separate from tenant operations |

## 4. Compatibility rules

Until a later Contract phase is separately approved:

- keep `Tenant` and `tenantId`;
- keep the legacy Prisma `Role` enum;
- keep `User.department`;
- keep legacy SaaS tables and fields;
- do not reinterpret client-provided `companyId` as trusted scope;
- do not delete deprecated data merely because a new model exists;
- do not weaken existing tenant isolation while introducing RBAC.

## 5. Rejected alternatives

### Rename every `tenantId` to `companyId` now

Rejected because it is broad, high-risk, and does not create a stronger trust boundary.

### Delete tenant/SaaS structures immediately

Rejected because it destroys recovery and audit context and violates Expand-and-Contract.

### Use one assignment table for organization and authority

Rejected because organizational movement and permission changes have different lifecycles and audit meaning.

### Trust the role and tenant values in the browser or JWT without DB revalidation

Rejected because claims can be stale and client inputs are untrusted.

### Permit by default while the registry is incomplete

Rejected because missing permission coverage would silently become privilege escalation.

## 6. Consequences

### Positive

- preserves the existing tenant isolation boundary;
- allows a controlled move to single-company operations;
- enables granular RBAC and organizational scopes;
- limits migration blast radius;
- keeps rollback and recovery options open.

### Costs

- compatibility code and dual-read/audit periods will temporarily increase complexity;
- the legacy role and SaaS fields remain until a later Contract phase;
- permission inventory and backfill evidence are required before enforcement.

## 7. Stage gates created by this ADR

- **G3-02:** complete operation inventory and permission registry.
- **G3-03:** additive organizational and RBAC schema only.
- **G3-04:** idempotent seed/backfill with count evidence.
- **G3-05:** central authorization layer.
- **G3-06:** audit-only decision comparison.
- **G3-07:** progressive enforcement.
- **G3-08:** layered legacy SaaS disablement without deletion.
- **G3-09:** constraints and indexes only after verified backfill.
- **G3-10:** final closure, recovery review, and untrusted-tenant-input scan.

## 8. Acceptance checklist

This ADR is accepted only while all statements remain true:

- [x] Single-Company Operational Mode is explicit.
- [x] `tenantId` remains the temporary company/security boundary.
- [x] No repository-wide `companyId` rename is authorized.
- [x] CompanyContext/AccessContext responsibilities are centralized.
- [x] Trusted tenant scope originates from server session and DB state only.
- [x] OrgAssignment and RoleAssignment are separate.
- [x] RBAC is scoped, DB-backed, and default-deny.
- [x] Legacy SaaS is disabled later without deleting its data.
- [x] Expand-and-Contract is mandatory.
- [x] Rollback, backup, and restore evidence are required before production changes.
- [x] No Prisma migration is created in G3-01.
