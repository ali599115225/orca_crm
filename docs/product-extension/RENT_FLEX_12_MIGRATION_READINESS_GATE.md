# ORCA — Rent Flex 12 Migration Readiness Gate

Status: IMPLEMENTED FOR REVIEW  
Date: 2026-08-16  
Repository: `ali599115225/orca_crm`  
Central base: `work/orca-unified-reference-20260813`  
Pre-RF12 schema reference: `7762b851738b4600d6f87edc7b94140b39fc8d9c`

## Objective

Create and verify the additive database artifact required by merged RF12-P1 and RF12-P4 without touching a customer or production database.

Migration identity:

`prisma/migrations/20260816203000_rent_flex_12_persistence_accounting/migration.sql`

## Scope

The artifact creates exactly five RF12-owned tables:

- `rent_flex_unit_configs`
- `rent_flex_selections`
- `rent_flex_offer_terms`
- `rent_flex_settlements`
- `rent_flex_direct_invoice_links`

The migration is additive only. It contains no `ALTER`, `DROP`, `TRUNCATE`, `INSERT`, `UPDATE`, or `DELETE`.

It intentionally adds no cross-domain foreign keys. Unit, lead, lease, finance-case, provider-offer, and invoice identifiers remain scalar UUID references protected by the tenant/domain validation already frozen in RF12-P1/P4. This preserves the architecture decision not to rewrite legacy/W1 schemas merely to add reverse relations.

## Exact pre-RF12 reconstruction

The pre-RF12 reference contains three Prisma domain files: `schema.prisma`, `rbac.prisma`, and `w1-contract-finance.prisma`. The existing W1F readiness gate established the supported reconstruction path for that state:

1. materialize `schema.prisma + rbac.prisma` from empty;
2. apply `20260815001500_w1_contract_finance_foundation`;
3. apply `20260815004500_w1d_snapshot_offer_integrity`;
4. apply `20260815010000_w1_schema_alignment`.

Those are the final three migration artifacts present after the non-W1 schema at the pinned pre-RF12 head. RF12 reuses this proven split rather than concatenating the full multi-file schema into one schema-engine input. The base-schema materialization has the same bounded W1F-style retry: up to five attempts only for the exact transient `Error in Schema engine` condition, with every attempt retained as evidence. Any other error fails immediately.

## Isolated verification

`.github/workflows/rf12-migration-readiness.yml`:

1. pins the exact PR candidate SHA;
2. checks out exact pre-RF12 reference `7762b851738b4600d6f87edc7b94140b39fc8d9c`;
3. proves the two RF12 Prisma domain files are absent there and the W1 schema/migrations are present;
4. runs only against a local PostgreSQL 16 service;
5. materializes the supported non-W1 pre-RF12 base and applies the exact three W1 schema migrations from the pinned pre-RF12 checkout;
6. fingerprints all non-RF12 tables, columns, constraints, and indexes;
7. applies the RF12 SQL artifact with `ON_ERROR_STOP=1`;
8. verifies all five tables and nineteen declared RF12 indexes exist;
9. recomputes the non-RF12 fingerprint and requires it to be unchanged;
10. runs Prisma `migrate diff --exit-code --from-config-datasource --to-schema prisma` and requires zero drift against the current RF12 multi-file schema;
11. runs the executable G8 contract test;
12. always drops the isolated database and uploads durable evidence.

## Acceptance

Readiness is PASS only if:

- the migration stays within the exact five-table allowlist;
- no destructive/DML statement is present;
- no cross-domain foreign key is introduced;
- PostgreSQL 16 isolated pre-RF12 reconstruction and RF12 application succeed;
- all expected RF12 indexes exist;
- all pre-existing schema fingerprints are unchanged;
- Prisma reports zero drift against the current multi-file schema;
- the focused G8 test passes;
- normal ORCA CI remains green on the same exact PR head.

## Authorization boundary

This gate creates a reviewed migration artifact and rehearses it only on ephemeral localhost PostgreSQL.

It performs **no production migration application**, no `prisma db push`, no customer database access, no backfill, no deploy, no provider call, and no environment mutation.

A PASS here does not authorize `ORCA_RENT_FLEX_12_SCHEMA_READY=true`, `ORCA_RENT_FLEX_12_ENABLED=true`, writes, accounting activation, or direct invoicing flags.

Applying this migration to production and changing any readiness/feature flag requires **separate owner authorization** after this gate is merged and its exact-head evidence is reviewed.
