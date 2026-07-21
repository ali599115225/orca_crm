# ORCA G3-08 Legacy SaaS Disablement Closure

## Stage record

- **Stage:** G3-08 — Legacy SaaS Disablement
- **Result:** PASS pending CI evidence
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Start SHA:** `017eaf1436521bfacc409521f64f2a3b95199c79`
- **Production migration applied:** no
- **Production data changed:** no
- **Production deploy:** no
- **Historical SaaS data deleted:** no

## Repository findings

Before G3-08, the highest-risk server boundaries were already non-executable:

- public Tenant registration returned `LEGACY_SAAS_OUT_OF_SCOPE`;
- platform subscription and add-on payment actions returned a disabled result;
- billing Cron authenticated and returned `skipped: true`;
- paid agent leasing checked `isLegacySaasEnabled()` before data access;
- package-limit enforcement bypassed plan queries in the current model;
- settings billing exposed no checkout actions.

The remaining material gap was a stale `RegisterForm` containing an interactive company/trial form even though `/register` returned `notFound()` and the server action refused creation.

## Implementation

Updated:

- `lib/platform-operating-model.ts`;
- `app/register/RegisterForm.tsx`;
- `app/actions/register.ts`;
- `app/actions/payment.ts`;
- `app/api/cron/billing/route.ts`.

Added:

- `tests/foundation/g3-08-legacy-saas-disablement.test.ts`;
- `docs/architecture/G3_LEGACY_SAAS_DISABLEMENT.md`.

## Central capability record

G3-08 defines ten legacy capabilities, all immutable and disabled:

- public registration;
- trial creation;
- subscription checkout;
- subscription change;
- add-on checkout;
- agent leasing;
- automatic renewal;
- billing Cron;
- package-limit enforcement;
- upgrade navigation.

Every block includes a stable capability key, `enabled: false`, `LEGACY_SAAS_OUT_OF_SCOPE`, the single-company reason, and the current platform model.

## Layer evidence

### UI

- `/register` remains unavailable.
- `RegisterForm` now renders a non-interactive compatibility notice.
- No registration form, subdomain input, admin credential input, submit handler, or tenant-registration action remains in that component.
- Settings billing exposes operational billing guidance only, without package checkout or upgrade actions.

### Server actions

- public registration uses the central `PUBLIC_TENANT_REGISTRATION` block and contains no Prisma, cookie, credential hashing, provider, or demo-data path;
- subscription checkout uses `SUBSCRIPTION_CHECKOUT`;
- add-on checkout uses `ADDON_CHECKOUT`;
- paid agent leasing remains blocked before session and AgentLease persistence.

### Jobs

The retired billing Cron preserves secret authentication and rate limiting, then returns `BILLING_CRON`, `enabled: false`, and `skipped: true`. It has no Prisma or provider import and no mutation path.

### Package gates

Count and feature plan guards return before database access whenever legacy SaaS is disabled. This preserves full internal-company operation without interpreting historical subscription metadata as an active package entitlement.

## Preservation evidence

The Prisma schema still contains Tenant, subscription plan/expiry, payment status, billing cycle, extra agents, and AgentLease structures. The G3 migration remains additive and contains no DROP TABLE, DROP COLUMN, TRUNCATE, or DELETE FROM statement.

No historical Tenant, subscription, lease, billing, payment, provider, or audit data was changed or removed.

## Test contract

`tests/foundation/g3-08-legacy-saas-disablement.test.ts` verifies:

- complete immutable disabled capability registry;
- stable compatibility results;
- page, component, and action registration disablement;
- payment/provider short-circuiting;
- authenticated side-effect-free billing Cron;
- agent-leasing guard order;
- package-limit short-circuiting;
- absence of upgrade/checkout UI actions;
- retention of legacy schema structures;
- absence of destructive migration statements.

Existing `tests/dedicated-copy-subscription-closure.test.ts` remains a regression layer for payment, leasing, and plan-limit behavior.

## Rollback

Rollback is a normal source revert. A runtime re-enable is not authorized because single-company operation is an accepted architecture decision. No schema or data rollback is required.

## Closure rule

G3-08 closes only after Prisma generation, all G3 contracts, existing regression suites, production build, CodeQL, and Vercel preview/status pass on the PR head, followed by merge into the central branch. This stage does not apply a migration or deploy Production.
