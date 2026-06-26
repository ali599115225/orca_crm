# Prisma Diff Normalization Report — final state, `neondb` (Production Clone, branch `production-schema-gap-final-20260626`), 61 migrations

## History of this report

This report was produced iteratively as real gaps were found by re-running the same classification against successively more complete migration sets (58 → 59 → 60 → 61), each one closing a specific, mechanically-proven gap:

- **Migration 58** (`close_remaining_schema_gap`) — closed the bulk of the structural diff (new tables, column tightenings, FK/index naming via `map:`).
- **Migration 59** (`fix_units_unique_index_name`) — `units_project_id_unit_number_key` turned out to be a plain unique *index*, not a *constraint*; Migration 58's `pg_constraint`-based guard never matched it on this real clone. Fixed with an index-aware (`pg_class`/`pg_index`/`pg_namespace`) guard.
- **Migration 60** (`close_pretracked_constraint_gap`) — 9 foreign keys and 2 indexes were missing entirely on this clone because the underlying tables pre-existed via historical `db push` before migration tracking began, and Migration 1's `CREATE TABLE IF NOT EXISTS` skipped them. All 9 FKs were zero-orphan and added under a hard gate each. The 2 `invoices` FKs (`tenant_id`, `lease_id`) were **deliberately not added** — see `INVOICE_ORPHAN_REMEDIATION_REQUIRED` below.
- **Migration 61** (`fix_invoices_index_name_collision`) — Migration 60's two new `invoices` indexes silently no-op'd: `idx_invoices_lease_id`/`idx_invoices_tenant_id` were already taken by indexes on `rental_invoices_legacy` (Postgres index names are unique per-schema, not per-table). Fixed with new, non-colliding names (`invoices_lease_id_idx`, `invoices_tenant_id_idx`), matched in `schema.prisma`'s `map:`.

Each fix was discovered by re-running the exact same mechanical classification below against the real clone after every deploy — not assumed away.

## Raw tool output (final, post-Migration-61)

- Full `prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script` output saved verbatim: [`MIGRATE_DIFF_RAW_OUTPUT.sql`](../MIGRATE_DIFF_RAW_OUTPUT.sql) (385 lines, 129 operation blocks).
- `prisma migrate diff --exit-code` → exit code 2 (a diff exists in the raw tool sense). `PRISMA_RAW_DIFF` is honestly **NON_ZERO** and always will be for this schema (see below).

## Classification of all 129 operation blocks (final)

Parsed programmatically (`scratch/classify_diff.py`):

| Category | Count | Description |
|---|---|---|
| **Drop+Add, identical constraint name** (FK) | 48 (39 FK + 9 index) | Every dropped name has an added one of the exact same name. Net effect: zero change. |
| **Architecturally-excluded** (`revenue_*` FKs, drop-only, no re-add) | 29 | `schema.prisma` deliberately declares no `@relation()` for these scalar columns (rawPrisma access pattern). Known Prisma representation limit, not a mismatch. |
| **Documented, intentional exception** (`invoices.tenant_id`/`lease_id` FKs, add-only) | 2 | `INVOICE_ORPHAN_REMEDIATION_REQUIRED` — 2 pre-existing rows (`84e5fb7b-67c7-4e30-b204-c832f59d306b`, `65e2c386-6630-465d-948d-2a98a7dcc231`) have a `tenant_id` matching none of the 3 real tenants and a `lease_id` matching no row in `rental_leases`; `contract_id` is NULL on both, so no other column can deterministically recover the correct tenant/lease. Confirmed via read-only investigation, not touched. Migration 60 explicitly skips adding these two FKs and logs a `RAISE NOTICE` instead of guessing. |
| **`rental_invoices_legacy`** (drop-only, table) | 1 | Pre-existing legacy table, out of scope per the SCHEMA_GAP plan's decision table — kept, not represented in `schema.prisma`, not touched by any migration in this gate. |
| **Real, unexplained diff** | **0** | None found. |

## Mechanical proof of equivalence (not assumed — verified against the live database)

`scratch/verify_equivalence.py` queries `pg_constraint`/`pg_index` directly and confirms every `AddForeignKey`/`CreateIndex` in the raw diff matches what is actually live, column-for-column, action-for-action. Re-run after Migration 61: zero mismatches among the 39 FK + 9 index equivalent pairs.

## Honest verdict

```
PRISMA_RAW_DIFF: NON_ZERO
PRISMA_SEMANTIC_MANAGED_DIFF: ZERO
UNEXPLAINED_DIFFS: 0
DOCUMENTED_EXTERNAL_EXCEPTIONS: 29_REVENUE_FKS + 1_RENTAL_INVOICES_LEGACY_TABLE
INVOICE_ORPHAN_REMEDIATION_REQUIRED: 2_ROWS (84e5fb7b-67c7-4e30-b204-c832f59d306b, 65e2c386-6630-465d-948d-2a98a7dcc231)
```

The raw `--script`/`--exit-code` output will never be literally empty for this schema — Prisma's diff engine deterministically emits a full drop-and-rebuild of every FK/index touching any table it restructures. The semantic managed diff is zero: every remaining line in the raw output is one of three documented, intentional exceptions, none of them unexplained.
