# ORCA Z8 — EXEC-008 Final Allowlist

## Status

`FINAL ALLOWLIST FROZEN / NO IMPLEMENTATION AUTHORITY`

This allowlist defines the only repository paths that may be modified by a future EXEC-008 implementation branch after separate owner authorization. Presence on this list is permission to consider a path inside the package, not authority to modify it now.

## Governance artifacts

1. `.github/workflows/exec-008-migration-validation.yml`
2. `docs/zero-based/Z8/ORCA_Z8_EXEC_008_DECISION_RECORD.md`
3. `docs/zero-based/Z8/ORCA_Z8_EXEC_008_SCOPE_FREEZE.md`
4. `docs/zero-based/Z8/ORCA_Z8_EXEC_008_FINAL_ALLOWLIST.md`
5. `docs/zero-based/Z8/ORCA_Z8_EXEC_008_TEST_LEDGER.md`
6. `docs/zero-based/Z8/ORCA_Z8_EXEC_008_DATA_IMPACT.md`
7. `docs/zero-based/Z8/ORCA_Z8_EXEC_008_REVIEW.md`

## Existing contract entry points

8. `app/actions/contract.ts`
9. `app/actions/finance.ts`
10. `app/api/v1/contracts/issue/route.ts`
11. `app/api/v1/contracts/[id]/route.ts`
12. `app/api/v1/contracts/[id]/sign/route.ts`
13. `app/api/v1/contracts/[id]/cancel/route.ts`
14. `app/api/v1/contracts/[id]/restructure/route.ts`
15. `app/api/v1/contracts/[id]/invoices/route.ts`
16. `app/api/v1/contracts/[id]/payment-plan/route.ts`
17. `app/api/v1/contracts/[id]/early-settlement/route.ts`
18. `app/api/v1/invoices/[id]/pay/route.ts`

## Existing transaction / accounting boundaries

19. `lib/domain/transaction-spine/types.ts`
20. `lib/domain/transaction-spine/record-payment.ts`
21. `lib/domain/transaction-spine/early-settlement.ts`
22. `lib/payments/custom-payment-reconciliation.ts`
23. `lib/accounting/posting-engine.ts`

## New bounded EXEC-008 domain module

24. `lib/contract-finance/contracts.ts`
25. `lib/contract-finance/authority.ts`
26. `lib/contract-finance/repository.ts`
27. `lib/contract-finance/service.ts`
28. `lib/contract-finance/sql-repository.ts`

## Schema and disposable validation

29. `prisma/schema.prisma`
30. `prisma/migrations/20260811030000_exec_008_contract_financial_integrity/migration.sql`
31. `scripts/exec-008-postgres-integrity.mjs`

## Direct evidence

32. `tests/foundation/g5-exec-008-contract-integrity.test.ts`
33. `tests/foundation/g5-exec-008-financial-integrity.test.ts`
34. `tests/foundation/g5-exec-008-security.test.ts`
35. `tests/foundation/g5-exec-008-schema-contract.test.ts`
36. `tests/foundation/g5-exec-008-postgres-contract.test.ts`

## Allowlist rules

- Exactly these 36 paths are admitted to the package boundary.
- Existing files are modified only when direct wiring or compatibility correction is necessary to enforce a frozen EXEC-008 invariant.
- New files must use the exact paths above; alternate names or adjacent helpers are not implicitly allowed.
- A second migration, workflow, script or test file is not implicitly allowed. If implementation proves an additional path is required, execution stops and this allowlist must be amended through a governance-only change before that path is touched.
- Provider-specific routes, credential files, environment files, visual/UI files, unrelated accounting modules, seeds and backfill scripts are excluded.
- `package.json`, `package-lock.json`, Prisma configuration and general CI workflows are excluded unless a separately proven package blocker requires a renewed scope decision.
- EXEC-003/004/005/006/007 sealed governance/evidence files are read-only dependencies and are not in the allowlist.

## Change budget

The implementation should prefer a smaller actual diff than the full allowlist. The allowlist is a ceiling, not a target. Any untouched admitted path remains untouched.

## Disallowed actions

- no Production/customer-data migration;
- no backfill;
- no provider activation or credential use;
- no `main` action;
- no Vercel/Production deployment;
- no visual implementation;
- no EXEC-009+ implementation;
- no destructive financial-history rewrite.
