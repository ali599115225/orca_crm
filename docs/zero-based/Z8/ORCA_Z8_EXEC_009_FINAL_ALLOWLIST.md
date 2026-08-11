# ORCA Z8 — EXEC-009 Final Allowlist

- **Date:** `2026-08-11`
- **Status:** `FINAL / FROZEN`
- **Change outside this list:** `DENIED WITHOUT OWNER SCOPE AMENDMENT`

## Governance and evidence

1. `docs/zero-based/Z8/ORCA_Z8_EXEC_009_DECISION_RECORD.md`
2. `docs/zero-based/Z8/ORCA_Z8_EXEC_009_DATA_IMPACT.md`
3. `docs/zero-based/Z8/ORCA_Z8_EXEC_009_TEST_LEDGER.md`
4. `docs/zero-based/Z8/ORCA_Z8_EXEC_009_SCOPE_FREEZE.md`
5. `docs/zero-based/Z8/ORCA_Z8_EXEC_009_FINAL_ALLOWLIST.md`
6. `docs/zero-based/Z8/ORCA_Z8_EXEC_009_REVIEW.md`

## Runtime/domain

7. `lib/workflow-communication/contracts.ts`
8. `lib/workflow-communication/service.ts`
9. `lib/workflow-communication/sql-repository.ts`
10. `app/api/v1/automation/workflows/route.ts`
11. `app/api/whatsapp/webhook/route.ts`
12. `lib/whatsapp/send-service.ts`

## Database

13. `prisma/migrations/20260811050000_exec_009_workflow_communication_truth/migration.sql`

## Executable evidence

14. `tests/foundation/g5-exec-009-workflow-communication.test.ts`
15. `tests/foundation/g5-exec-009-schema-contract.test.ts`
16. `tests/foundation/g5-exec-009-postgres-contract.test.ts`
17. `scripts/exec-009-postgres-integrity.mjs`
18. `.github/workflows/exec-009-migration-validation.yml`

## Constraints

- One additive migration only.
- No `prisma/schema.prisma` modification is required; EXEC-009 runtime uses a typed SQL repository for the additive integrity tables.
- Existing provider-specific tables remain authoritative provider evidence and are not replaced.
- No package/dependency changes.
- No credentials or provider calls in EXEC-009 tests.
- No Production/customer-data migration or backfill.
- No `main`, central-branch merge, deploy or Production action.
