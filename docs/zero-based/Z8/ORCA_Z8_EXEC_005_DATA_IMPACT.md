# ORCA Z8 — EXEC-005 Data Impact and Transition Plan

## Status

- Package: `EXEC-005 — Customer Identity and Opportunity Lifecycle`
- Reviewed implementation head: `5670c76b3abc935bcf569148d43c6035d27af1cc`
- Production migration: **NOT EXECUTED**
- Customer-data migration: **NOT EXECUTED**
- Backfill: **NOT EXECUTED**
- Production seed: **NOT EXECUTED**
- Runtime activation: **NOT PERFORMED**
- Vercel Preview: **NOT REQUESTED**

## Additive schema

The package prepares two ordered migrations:

1. `20260726123000_exec_005_customer_identity_lifecycle`
   - Party identity root and permanent merged aliases.
   - Field values with normalized form, provenance and history.
   - Customer Account and organization contacts.
   - Lead and Opportunity v2 lifecycle records.
   - Opportunity history.
   - Communication preferences and withdrawal history.
   - Duplicate reviews.
   - Merge previews, evidence and blocking dependencies.
   - Retention policies and deletion requests.
   - Idempotency evidence and append-only audit.

2. `20260726124500_exec_005_customer_identity_integrity_hardening`
   - Same-tenant guards for every Party, Account, Lead, Opportunity, consent, duplicate, merge, deletion and audit relationship.
   - Party/Customer Account subject-consistency guards.
   - Permanent aliases.
   - Immutable idempotency evidence.
   - Append-only Party-field history.
   - Immutable merge evidence except one explicit audited reversal.

No existing table, column, row, Lead, Contact or Opportunity is dropped, truncated, deleted or rewritten.

## Compatibility

The new model is deliberately parallel and additive during the transition:

- `customer_leads_v2.legacy_lead_id` may reference the existing `leads` record.
- `customer_opportunities_v2.legacy_opportunity_id` may reference the existing `opportunities` record.
- Domain contracts expose `legacyLeadId`, `legacyContactId` and `legacyOpportunityId` compatibility identifiers.
- Existing routes and UI remain untouched.
- The new model is not activated against live data until a separately authorized migration/backfill package is approved.

The compatibility references do not copy identity values. They preserve traceability while Party becomes the future identity source of truth.

## Backfill plan — future authorization required

A later package must perform all of the following before any customer row is changed:

1. Freeze a source inventory of legacy Leads, Contacts, Customers and Opportunities.
2. Normalize candidate identity fields without writing.
3. Produce deterministic-match and possible-match reports.
4. Require human review for name-only, probabilistic and shared-phone matches.
5. Create Party records with field provenance and source references.
6. Link, but do not destroy, legacy records.
7. Reconcile counts, tenant boundaries, branch scopes, field hashes and relationship totals.
8. Provide dry-run output, recovery point, rollback/forward-fix procedure and explicit owner authorization.
9. Execute only in an isolated rehearsal before any Production consideration.

This package performs none of those writes.

## Rollback and forward-fix policy

Because the migrations are additive and unactivated:

- Before activation, rollback is omission: do not execute the migrations.
- In an isolated validation database, the database is disposable and is destroyed with the workflow job.
- After a future authorized Production migration, destructive rollback is not the default. A reviewed forward-fix migration must preserve audit, aliases and business history.
- No rollback may delete financial, contractual, reservation or invoice history.
- Merge reversal is a domain command, not a schema rollback. It fails closed with `BLOCKED_BY_DEPENDENCY` when later audited values or relationships would be overwritten.

## Disposable migration validation

GitHub Actions creates an empty PostgreSQL 16 service, generates the current legacy schema SQL with `prisma migrate diff`, applies the EXEC-004 authority prerequisite and both EXEC-005 migrations, and verifies required objects, constraints and triggers. The workflow has `contents: read`, receives no repository or provider secret, performs no deployment and is destroyed after the job.

Successful validation evidence on the reviewed head:

- Workflow: `EXEC-005 Migration Validation`
- Run: `#7`
- Result: `SUCCESS`
- Legacy schema generation: `PASS`
- EXEC-004 prerequisite: `PASS`
- EXEC-005 identity migration: `PASS`
- EXEC-005 hardening migration: `PASS`
- Constraint and append-only checks: `PASS`

## Protected systems

- `main`: untouched.
- Production: untouched.
- Customer data: untouched.
- Provider accounts and secrets: untouched.
- Contracts, invoices, payments, reservations and inventory ownership: untouched.
- EXEC-006: not started.
