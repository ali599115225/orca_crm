# ORCA G3-05 Authorization Layer Closure

## Stage record

- **Stage:** G3-05 — Authorization Layer
- **Result:** PASS pending CI evidence
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Start SHA:** `344d2d42cc3024963ff03904f93e4679f3621ed5`
- **Production migration applied:** no
- **Production data changed:** no
- **Production deploy:** no

## Implementation

Added:

- `lib/authz/authorization.ts`;
- `tests/foundation/g3-05-authorization-layer.test.ts`.

## Central server authorization API

The layer provides:

- `resolveAccessContext()`;
- `resolveCurrentAccessContext()`;
- `authorize()`;
- `requirePermission()`;
- `scopeMatch()`;
- `AuthorizationError`;
- `runWithAccessContext()`;
- `runWithResolvedAccessContext()`;
- `getAccessContext()` and `requireAccessContext()`.

## Trusted identity and context derivation

`resolveAccessContext()` accepts a verified server session identity and then revalidates:

- the user ID and tenant ID;
- current user existence and activation state;
- current Tenant existence and activation state;
- equality with an already-established `tenantContext`;
- active and non-expired `OrgAssignment` rows;
- active and non-expired `RoleAssignment` rows;
- active AccessRole rows;
- active AccessPermission rows;
- tenant equality on every tenant-owned assignment and mapping.

The JWT legacy role is retained only as compatibility evidence. Permission authority is derived from the current database-backed role and permission mappings.

## Scope rules

The layer implements the accepted scope vocabulary:

- `TENANT`;
- `BRANCH`;
- `DEPARTMENT`;
- `TEAM`;
- `SELF`;
- `RESOURCE`.

Every scope requires tenant equality first. A matching branch, department, team, user, or resource identifier cannot override a tenant mismatch.

## Default-deny behavior

Authorization denies when any of the following applies:

- missing or malformed verified session identity;
- existing tenant context contradicts the verified identity;
- missing or inactive user;
- missing or inactive Tenant;
- unknown permission key;
- missing permission mapping;
- permission does not accept the assigned scope type;
- resource scope mismatch;
- cross-tenant resource request;
- missing AccessContext.

`AuthorizationError` returns a stable reason code and a generic non-sensitive error message. It does not include user details, tokens, resource contents, or credentials.

## Context propagation

`runWithAccessContext()` propagates both:

- the existing verified `tenantContext` through `runWithTenantContext()`;
- the new AccessContext through a dedicated AsyncLocalStorage instance.

This preserves the current tenant isolation middleware while enabling a central permission decision boundary.

## Database access design

The default resolver uses `rawPrisma` only as an explicit authorization bootstrap boundary and applies trusted user and tenant predicates to every query. The resolver accepts an `AccessStateLoader` dependency so tests can exercise all authorization logic without Production data or a live database.

## Test evidence

`tests/foundation/g3-05-authorization-layer.test.ts` covers:

- missing and malformed sessions;
- inactive user and Tenant;
- expired assignment exclusion;
- active permission derivation;
- all six scope types;
- cross-tenant denial;
- unknown and missing permission denial;
- scope-not-allowed and scope-mismatch denial;
- non-sensitive AuthorizationError behavior;
- simultaneous AccessContext and tenantContext propagation.

## Rollback

Rollback is a normal revert of the G3-05 files. This stage creates no schema migration, data mutation, route enforcement, Production deploy, or external side effect.

## Closure rule

G3-05 closes only after ORCA CI, the full G3 contract suite, existing regressions, production build, CodeQL, and Vercel preview/status pass on the PR head, followed by merge into the central branch. Broad route integration is intentionally deferred to audit mode and progressive enforcement stages.
