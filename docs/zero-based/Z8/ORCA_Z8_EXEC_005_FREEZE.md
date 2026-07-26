# ORCA Z8 — EXEC-005 Freeze Contract

- **Package:** `EXEC-005 — Customer Identity and Opportunity Lifecycle`
- **Date:** `2026-07-26`
- **Central base:** `991afec099880565043ef578ba8084b2ece809ad`
- **Implementation branch:** `work/orca-exec-005-customer-identity-lifecycle-20260726`
- **State at freeze:** `AUTHORIZED / IN EXECUTION`
- **Main:** forbidden
- **Production:** forbidden
- **Customer data:** forbidden
- **Migration execution:** forbidden
- **Backfill:** plan only
- **Vercel:** `SKIP_BY_DEFAULT`; at most one stable-head Preview only when CI cannot prove a browser-only contract

## 1. Owner decisions frozen

1. `Party` is the identity root and is either `PERSON` or `ORGANIZATION`.
2. `CustomerAccount` is the commercial relationship, not a duplicate identity.
3. `Lead` is an inquiry and may link to an existing Party; conversion is non-destructive and idempotent.
4. `Opportunity` is an independent commercial attempt; multiple opportunities for one Party are valid.
5. Duplicate detection has `DETERMINISTIC_MATCH` and `POSSIBLE_MATCH`; name-only and probabilistic matches never auto-merge.
6. Every merge has preview, field survivorship, provenance, relationship transfer, alias retention, independent approval, audit and safe reversal.
7. Consent is channel-and-purpose specific and withdrawal is historical, not destructive.
8. Retention is configurable; legal hold blocks deletion and financial/contract history is outside identity deletion.
9. All access consumes the EXEC-004 assignment model. No new role hierarchy or bypass is introduced.
10. Platform Owner and System Administrator receive no automatic customer-data write or merge authority.

## 2. Current baseline inventory

The legacy schema currently has three overlapping facts:

- `Lead` stores first name, last name, phone, email and city directly.
- `Contact` stores name, phone, email and notes independently.
- `Opportunity` requires a legacy `Lead`, stores a free-text status and has no explicit Party or Customer Account root.

The transition is additive. Existing tables and routes remain valid. New records store optional `legacyLeadId`, `legacyContactId` and `legacyOpportunityId` compatibility references. No existing row is migrated or backfilled in this package.

## 3. Allowed paths

- `docs/zero-based/Z8/ORCA_Z8_EXEC_005_*.md`
- `lib/customer-identity/**`
- `prisma/migrations/20260726123000_exec_005_customer_identity_lifecycle/migration.sql`
- `tests/foundation/g5-exec-005-*.test.ts`
- implementation PR metadata

The closure reconciliation may additionally update:

- `docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json`
- `docs/zero-based/Z8/ORCA_Z8_EXECUTION_ROADMAP.md`

## 4. Disallowed paths and actions

- UI and visual redesign
- existing Leads, Customers or Opportunities route rewrites
- contract, invoice, payment, reservation or inventory truth
- EXEC-004 role, permission or assignment replacement
- provider calls, secrets, external accounts or subscriptions
- `main`, Production, customer-data mutation, migration execution or backfill
- EXEC-006

## 5. Security invariants

- deny by default
- actor and tenant are mandatory and session-bound by callers
- same-tenant exact assignment scope is required
- cross-branch merge requires explicit company-wide assignment for both approver and executor
- merge execution requires an independent approver
- expected version protects every mutable aggregate
- idempotency protects conversion and merge
- append-only audit
- verified fields cannot be replaced by weaker provenance without an explicit elevated reason
- aliases of merged records are permanent and cannot be reused

## 6. Data and migration policy

The migration is additive and reviewable. It creates new identity, lifecycle, preference, merge and audit tables and database constraints. It does not alter or delete existing customer rows. It is prepared only and must not be executed against Production or customer data. A future backfill must be a separately authorized package with a dry-run, reconciliation and rollback/forward-fix plan.

## 7. Acceptance evidence

Direct behavioral tests must cover the thirty cases required by the owner, including Party types, repeated Leads and Opportunities, idempotent conversion, duplicate explanations, merge preview/survivorship/reversal, consent, legal hold, scope denial, concurrency, append-only audit and absence of implicit Platform Owner/System Administrator business authority.

The final implementation head must pass targeted EXEC-005 tests, EXEC-004 authority regressions, all G5 tests, G8, lint, TypeScript, Build, production dependency audit, isolated schema review and ORCA CI. A strict self-review may be recorded, but it must not be described as organizationally independent.