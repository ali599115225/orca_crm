# ORCA Z8 — EXEC-010 Final Allowlist

- Date: `2026-08-11`
- Status: `FINAL / FROZEN`
- Change outside this list: `DENIED WITHOUT OWNER SCOPE AMENDMENT`

## Governance and evidence

1. `docs/zero-based/Z8/ORCA_Z8_EXEC_010_DECISION_RECORD_DRAFT.md`
2. `docs/zero-based/Z8/ORCA_Z8_EXEC_010_DATA_IMPACT_DRAFT.md`
3. `docs/zero-based/Z8/ORCA_Z8_EXEC_010_TEST_LEDGER_DRAFT.md`
4. `docs/zero-based/Z8/ORCA_Z8_EXEC_010_SCOPE_FREEZE.md`
5. `docs/zero-based/Z8/ORCA_Z8_EXEC_010_FINAL_ALLOWLIST.md`
6. `docs/zero-based/Z8/ORCA_Z8_EXEC_010_REVIEW.md`

## Runtime/domain

7. `lib/document-governance/contracts.ts`
8. `lib/document-governance/service.ts`
9. `lib/document-governance/sql-repository.ts`

## Database

10. `prisma/migrations/20260811080000_exec_010_document_privacy_reporting_controls/migration.sql`

## Executable evidence

11. `tests/foundation/g5-exec-010-document-governance.test.ts`
12. `tests/foundation/g5-exec-010-schema-contract.test.ts`
13. `tests/foundation/g5-exec-010-postgres-contract.test.ts`
14. `scripts/exec-010-postgres-integrity.mjs`
15. `.github/workflows/exec-010-migration-validation.yml`

## Constraints

- One additive migration only.
- No Prisma schema model additions are required; the provider-neutral integrity layer uses a typed SQL repository.
- No existing Runtime entrypoint is modified in this package; upstream sealed contracts remain untouched.
- No package/dependency changes.
- No storage/scanner/provider credentials or live provider calls.
- No Production/customer-data migration or backfill.
- No central/main merge, deploy or Production action.
