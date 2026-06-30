# P0_B1 — Production Seed Guard

## Scope
Prevent accidental seed execution in production environments by implementing an isolated, pure decision module that runs before any database initialization.

## Threat / Failure Mode
- Seed script executes in production, deleting all data
- Guard runs after DB client initialization, allowing partial connection
- Environment variables leaked in error messages
- Override mechanism accidentally introduced

## Implementation Evidence
- `prisma/seed-guard.ts`: Pure module with `isProductionEnvironment()` and `assertSeedExecutionAllowed()`
- `prisma/seed.ts`: Guard invoked at line 8, before `new Pool()` at line 21 and `new PrismaClient()` at line 23
- No imports of `pg`, `@prisma/client`, or `DATABASE_URL` in guard module
- No override or bypass mechanism exists

## Test Evidence
- `tests/seed-guard.test.ts`: 20 tests covering:
  - NODE_ENV=production → blocked
  - VERCEL_ENV=production → blocked
  - Both production → blocked
  - development/test/missing → allowed
  - Mixed environments → blocked if either is production
  - Error message contains no secrets or override hints
  - Guard module has no DB imports
  - Guard executes before DB client construction

## Commands Run
```bash
node node_modules/vitest/vitest.mjs run tests/seed-guard.test.ts
# Result: 20/20 PASS
```

## Result
**PASS**

## Residual Risks
- Missing NODE_ENV and VERCEL_ENV treated as non-production (documented policy)
- No runtime override available (intentional)

## Commit Hash
a4cd7bb

## Quality Gates
- SEED_PRODUCTION_BLOCKED=YES
- GUARD_BEFORE_DB_INIT=YES
- PRODUCTION_OVERRIDE=NO
- DATABASE_CONNECTION_DURING_TEST=NO
- SECRET_OUTPUT=NO
- TESTS_PASS=YES
