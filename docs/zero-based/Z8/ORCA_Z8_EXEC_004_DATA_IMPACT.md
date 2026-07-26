# ORCA Z8 — EXEC-004 Data Impact and Migration Safety

- **Package:** `EXEC-004`
- **Migration:** `20260726043000_exec_004_organization_authority`
- **Classification:** `ADDITIVE SCHEMA / NO EXECUTION AUTHORIZED`
- **Production migration:** `NOT PERFORMED`
- **Customer-data operation:** `NOT PERFORMED`
- **Backfill:** `NOT INCLUDED`

## Schema changes

The migration creates six new tables and one append-only trigger function:

1. `organization_branches`
2. `organization_departments`
3. `organization_teams`
4. `branch_services`
5. `user_scope_assignments`
6. `organization_authority_audit`
7. `exec004_prevent_authority_audit_mutation()` and its trigger

No existing table is altered. No existing record is inserted, updated, deleted, reassigned or inferred.

## Existing data impact

```text
users: unchanged
leads: unchanged
projects: unchanged
units: unchanged
contracts: unchanged
tenants: unchanged
provider credentials: unchanged
Production data: untouched
```

The migration references existing `tenants` and `users` through foreign keys but does not populate organization records from them.

## Backward compatibility

- Existing tenant-scoped Runtime remains operational because no existing column or constraint changes.
- Existing roles remain unchanged.
- `tenantId` remains the mandatory security partition.
- New organization services consume the new tables only after explicit wiring.
- Existing records without branch assignments are not silently exposed or denied by the migration itself.
- Agent-slot commercial plan limits are removed in application code; this does not mutate stored slots or usage meters.

## Forward adoption requirement

Before organization authority can become mandatory for an existing sensitive operation, a later approved package must provide:

1. exact operation and permission mapping;
2. explicit resource-to-branch or assigned-resource mapping;
3. isolated migration rehearsal;
4. deterministic assignment fixture or approved company-entered assignments;
5. denial tests for missing, stale, cross-branch and wrong-resource assignments;
6. a recovery point and measured rollback/forward-fix procedure;
7. separate owner authorization for any real migration or backfill.

## Rollback strategy for an isolated rehearsal

Because the migration is additive and no consumer is activated automatically, an isolated rehearsal may roll back by dropping the new objects in dependency order:

```text
organization_authority_audit trigger and function
organization_authority_audit
user_scope_assignments
branch_services
organization_teams
organization_departments
organization_branches
```

This rollback is a rehearsal design only. It is not authorization to run destructive SQL on Production.

## Forward-fix strategy after adoption

After Runtime consumers exist, destructive rollback may be unsafe. The preferred Production strategy would then be:

1. disable new organization consumers through an approved feature/configuration boundary;
2. preserve all organization and audit records;
3. deploy a forward-compatible correction;
4. reconcile counts and assignment scope;
5. re-enable only after direct denial and recovery tests pass.

## Integrity checks required before any real execution

- all referenced users belong to the singleton tenant partition;
- branch codes are unique per tenant;
- central departments have no branch parent;
- team branch/department hierarchy matches;
- assignment scope shape is valid;
- assignment windows are valid;
- assigned-resource identifiers are complete;
- service managers belong to the same tenant;
- authority audit rejects update and delete;
- backup and restore evidence exists for the target environment.

## Current conclusion

```text
REPOSITORY IMPLEMENTATION: PREPARED
ISOLATED MIGRATION EXECUTION: NOT PERFORMED
PRODUCTION MIGRATION: NOT AUTHORIZED
BACKFILL: NOT AUTHORIZED
CUSTOMER DATA: UNTOUCHED
```
