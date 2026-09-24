# PRISMA_HISTORICAL_BASELINE_GATE — Closure Report

**Date:** 2026-06-26
**Scope:** All 53 tracked migrations in `prisma/migrations`, checked against a real legacy-shaped Neon clone (not just the first failing migration).

## Result

```
FRESH_DEPLOY_53: PASS
LEGACY_MIGRATION_COMPATIBILITY: PASS
PRISMA_HISTORICAL_BASELINE_GATE: CLOSED
```

## Mismatches found and fixed

All fixes were applied only inside existing-table branches of guarded baseline migrations, and none caused data loss.

1. **`rental_leases.vat_type` / `rental_leases.vat_rate`** — [20260612235963_create_rental_leases_baseline/migration.sql](../prisma/migrations/20260612235963_create_rental_leases_baseline/migration.sql)
   Legacy shape was `vat_type VARCHAR(20) NULL` and `vat_rate NUMERIC(5,2) NULL DEFAULT 15.00`, diverging from `schema.prisma`'s `vatType String @default("STANDARD")` / `vatRate Decimal @default(15.00) @db.Decimal(5,2)`.
   Fix: in the existing-table branch, NULLs are backfilled to the column's own existing default (zero rows actually needed it — verified empirically, 28 rows, zero NULLs, vat_rate already NUMERIC(5,2)), then the column is converged to `TEXT NOT NULL DEFAULT 'STANDARD'` and `NUMERIC(5,2) NOT NULL DEFAULT 15.00` respectively. No row's non-null data was altered.

2. **`payment_transactions.invoice_id` / `installment_id`** — [20260612235965_create_payment_transactions_baseline/migration.sql](../prisma/migrations/20260612235965_create_payment_transactions_baseline/migration.sql)
   These columns were already converted from `TEXT` to `UUID` by `20260621000200_transaction_spine` on real legacy databases (which can apply before this baseline in some migration histories). The baseline's verification expectation was corrected from `text` to `uuid` to match the true legacy state. No ALTER performed — verification-only correction.

3. **`users.job_title`/`department`/`phone`/`contract_start_at`/`contract_end_at` double-add** — [20260623000000_phase04_staff_fields/migration.sql](../prisma/migrations/20260623000000_phase04_staff_fields/migration.sql)
   Found only by running a genuine Fresh Deploy on an empty database (not legacy-specific): `20260623_settings_agents_architecture_final` already adds these same 5 columns with `ADD COLUMN IF NOT EXISTS` and applies first; `phase04_staff_fields` used plain `ADD COLUMN`, causing `column already exists` on any database where both apply in sequence — including a brand-new one. Fixed by adding `IF NOT EXISTS` to all five statements (purely additive guard, no behavior change on any database where it currently succeeds).

## Verification performed

- Pre-scanned all 53 migrations against real legacy column types/lengths/nullability/defaults/constraints/indexes — not just the first failure.
- All other pending baseline migrations (`rental_invoices`, `tours`, `installments`, `opportunities`, `offers`, `leads_unit_id_patch`, `receipts`, `audit_logs`) and the 3 newer additive migrations matched the real legacy shape exactly; no changes needed.
- Dry-ran the `rental_leases` convergence inside `BEGIN…ROLLBACK` on the read-only legacy clone before committing the file change, confirming the exact target shape (`text`/`NOT NULL`/`'STANDARD'`, `numeric(5,2)`/`NOT NULL`/`15.00`) and that the clone was left untouched.
- `prisma migrate deploy` + `prisma migrate status` on a real legacy clone (`ep-autumn-mountain-aqq4i7sk/neondb`): all 53 migrations applied, schema reported up to date.
- `prisma migrate diff` against `schema.prisma` was run for informational purposes; the remaining diff (new tables, dropped columns/tables, renamed indexes) reflects `schema.prisma` having evolved further than the tracked migration history — explicitly out of scope for this gate and not acted upon.
- Fresh Deploy test on a genuinely empty database: first attempt (`fresh_gate_20260626`) caught the `users.job_title` double-add bug (fix #3 above); second attempt on a new empty database (`fresh_gate_20260626_v2`) applied all 53 migrations cleanly, `migrate status` reported up to date.

## Out of scope / not touched

- The full `schema.prisma`-vs-migration-history diff (new tables, dropped legacy tables/columns, FK/index renames) — this is forward schema evolution, not a legacy-compatibility defect, and acting on it risked data loss (e.g. `DROP TABLE`) with no authorization to do so.
- `db push`, `migrate reset`, `migrate resolve` — never used, per safety constraints.
- Production database — never connected to; all work was performed against disposable Neon clones only.
