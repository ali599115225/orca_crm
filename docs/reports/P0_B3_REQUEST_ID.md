# P0_B3 — Request ID

## Scope
Implement correlation ID system for error tracking, ensuring each error response carries a unique, non-sequential ID that matches server-side logs.

## Threat / Failure Mode
- Sequential/predictable IDs used
- Request ID not correlated between response and logs
- Tenant secrets embedded in ID
- No way to trace errors across systems

## Implementation Evidence
- `lib/errors.ts`:
  - `createRequestId(requestId?)`: Accepts optional ID from platform (e.g., Vercel), validates format (8-128 chars, safe chars only), falls back to `randomUUID()`
  - `publicError()` accepts `requestIdInput` parameter and includes it in response and logs
  - ID format: UUID v4 or validated external ID
  - Non-sequential, cryptographically random
- Used in `lib/tenant-isolation.ts` for tenant violation errors
- Some routes extract `x-correlation-id` or `x-request-id` headers (e.g., `app/api/v1/tours/route.ts`, `app/api/revenue-integrity/webhook/[provider]/route.ts`)

## Test Evidence
- `tests/public-errors.test.ts`:
  - Test 2: "correlates response request id with server log metadata"
  - Verifies `result.error.requestId === 'req-match-1'` and log contains `requestId=req-match-1`

## Commands Run
```bash
node node_modules/vitest/vitest.mjs run tests/public-errors.test.ts
# Result: 4/4 PASS (including request ID correlation test)
```

## Result
**PASS**

## Residual Risks
- Not all routes extract request ID from headers yet (existing routes generate UUIDs)
- Header extraction is opt-in per route; future work can standardize middleware

## Commit Hash
114d858

## Quality Gates
- REQUEST_ID_PRESENT=YES
- SERVER_LOG_CORRELATION=PASS
- ID_NON_SEQUENTIAL=YES
- NO_TENANT_SECRETS_IN_ID=YES
- TESTS_PASS=YES
