# P0_B2 — Public Error Envelope

## Scope
Standardize all error responses to prevent leakage of internal details (stack traces, SQL, Prisma codes, local paths, env values) while providing safe bilingual messages to users.

## Threat / Failure Mode
- Stack traces exposed to clients
- Prisma error codes (P2002, P2025) revealed
- Local file paths leaked
- SQL queries or table names exposed
- DATABASE_URL or secrets leaked
- Inconsistent error formats across routes

## Implementation Evidence
- `lib/errors.ts`:
  - `publicError()` returns standardized envelope with `code`, `messageAr`, `messageEn`, `requestId`, and nested `error` object
  - `REDACTION_RULES` strip: Bearer tokens, JWTs, passwords, DATABASE_URL, local paths (Windows/Unix)
  - `classifyError()` maps Prisma codes to safe public codes (P2002→CONFLICT, P2025→NOT_FOUND, etc.)
  - `statusForErrorCode()` maps codes to HTTP status (400/401/403/404/409/500)
  - `safeSerialize()` prevents circular reference crashes
  - Server-side logging via `publicErrorLogger()` with redaction
- Used in 189+ locations across API routes (`app/api/v1/**`)
- `lib/api-auth-guard.ts`: `unauthorizedResponse()`, `forbiddenResponse()`, `notFoundResponse()` use `publicError()`

## Test Evidence
- `tests/public-errors.test.ts`: 4 tests covering:
  - Internal error returns safe message without Prisma/SQL/paths
  - Request ID correlates between response and server log
  - Status code mappings (400/401/403/404/409/500)
  - Prisma code classification to safe public codes

## Commands Run
```bash
node node_modules/vitest/vitest.mjs run tests/public-errors.test.ts
# Result: 4/4 PASS
```

## Result
**PASS**

## Residual Risks
- Some routes return only `messageAr` instead of full envelope (backward compatibility)
- Nested `error` object added for future standardization; top-level fields retained

## Commit Hash
63cf565

## Quality Gates
- PUBLIC_STACK_TRACE=0
- PUBLIC_PRISMA_DETAILS=0
- PUBLIC_LOCAL_PATHS=0
- SECRET_OUTPUT=0
- TESTS_PASS=YES
