# ORCA G3-03 RBAC Schema Closure

## Stage record

- **Stage:** G3-03 — Additive Organization and RBAC Schema
- **Result:** PASS pending CI evidence
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Start SHA:** `99f8232b7f855dccfc2fa231eca891c1821970f4`
- **Production migration applied:** no
- **Production deploy:** no

## Implementation

Added:

- `prisma/rbac.prisma`;
- `prisma/migrations/20260721010000_g3_rbac_expand/migration.sql`;
- `tests/foundation/g3-03-rbac-schema.test.ts`.

Updated:

- `prisma.config.ts` to use the `prisma/` schema directory and the existing `prisma/migrations` directory.

## Added models

- `OrgUnit`;
- `OrgAssignment`;
- `AccessPermission`;
- `AccessRole`;
- `AccessRolePermission`;
- `RoleAssignment`;
- `AuthorizationAudit`.

## Added enums

- `OrgUnitType`;
- `OrgAssignmentStatus`;
- `AccessScopeType`;
- `RoleAssignmentStatus`;
- `AuthorizationMode`;
- `AuthorizationDecision`.

## Compatibility and safety

- `tenantId` remains the security namespace.
- The legacy Prisma `Role` enum remains unchanged.
- `User.department` remains unchanged.
- No `companyId` rename was introduced.
- The migration contains only type, table, unique-index, and lookup-index creation.
- The migration contains no `DROP`, `DELETE`, `TRUNCATE`, or modification of an existing table.
- Foreign keys and stronger post-backfill constraints are intentionally deferred to G3-09.
- No database command was executed against Production.

## Rollback

Before application, rollback is a normal revert of the schema, configuration, and migration files. If a future isolated environment applies the expansion migration, rollback must follow the reviewed environment-specific migration plan; this stage does not authorize Production application or destructive reverse SQL.

## Closure rule

G3-03 closes only when Prisma client generation, the G3 schema contract, existing regressions, and the production build pass on the PR head and the PR is merged into the central branch.
