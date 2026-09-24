# ORCA G3-02 Permission Inventory Closure

## Stage record

- **Stage:** G3-02 — Permission Inventory
- **Result:** PASS pending CI evidence
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Start SHA:** `223594d48df3d7a67feab6654f8151030c289b23`
- **Production changes:** none
- **Prisma migration:** none

## Repository evidence reviewed

The inventory was derived from current ORCA server boundaries found in:

- `app/actions/` Server Actions;
- `app/api/` route handlers, including v1, health, webhook, payment, ZATCA, and cron surfaces;
- `lib/domain/transaction-spine/` lifecycle mutations;
- accounting, payment, document, agent, WhatsApp, Sentinel, real-time, compliance, notification, and audit services;
- `features/dashboard/server/` read models.

Representative existing sources include:

- `app/actions/leads.ts`;
- `app/actions/tasks.ts`;
- `app/actions/tours.ts`;
- `app/actions/users.ts`;
- `app/actions/accounting.ts`;
- `app/actions/payment.ts`;
- `app/actions/whatsapp.ts`;
- `app/actions/email.ts`;
- `app/api/v1/leads/route.ts`;
- `app/api/v1/offers/route.ts`;
- `app/api/v1/installments/[id]/pay/route.ts`;
- `app/api/v1/zatca/submit/[id]/route.ts`;
- `app/api/cron/sentinel/route.ts`;
- `lib/api-auth-guard.ts`;
- `lib/documents/access.ts`;
- `lib/agents/access.ts`;
- `lib/realtime/purge-sync-events.ts`.

## Implementation

Added:

- `lib/authz/permission-registry.ts` — canonical typed inventory;
- `docs/architecture/G3_PERMISSION_REGISTRY.md` — architecture and change-control contract;
- `tests/foundation/g3-02-permission-registry.test.ts` — executable registry contract.

The registry defines:

- stable `resource.action` permission keys;
- risk classes: `READ`, `WRITE`, `APPROVE`, `ADMIN`, `SYSTEM`;
- scopes: `TENANT`, `BRANCH`, `DEPARTMENT`, `TEAM`, `SELF`, `RESOURCE`;
- repository source evidence for every permission;
- a typed lookup and unknown-key rejection helper.

## Security decisions

- `tenantId` remains the mandatory outer security boundary.
- Scope identifiers never override tenant equality.
- Legacy Prisma `Role` values are not permission keys.
- Unknown permissions are rejected, not inferred.
- The registry does not read role or tenant values from client input.
- This stage changes no runtime authorization decision.

## Test contract

`tests/foundation/g3-02-permission-registry.test.ts` verifies:

- broad coverage of ORCA domains;
- unique, stable key format;
- complete lookup mapping;
- recognized scope vocabulary;
- repository source evidence for each permission;
- absence of legacy role values from the permission authority.

## Rollback

Rollback is a normal revert of the G3-02 commit set. No schema, data, runtime, production, or deployment rollback is required.

## Closure rule

G3-02 is closed only after the PR checks pass and the PR is merged into the central branch. G3-03 must start from the verified central merge SHA.
