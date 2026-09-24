# ORCA G3-07 Progressive Enforcement Closure

## Stage record

- **Stage:** G3-07 — Enforcement
- **Result:** PASS pending CI evidence
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Start SHA:** `09d9dfc1b9fe55b51804e34c61a86506406d7c16`
- **Production migration applied:** no
- **Production data changed:** no
- **Production deploy:** no
- **Production enforcement flags changed:** no

## Policy reconciliation

The 15 selected G3-06 mismatches were resolved before enforcement code was introduced:

- current sales-manager and sales-employee settings/communication access is preserved;
- MARKETING receives no implicit email-send or WhatsApp-send grant;
- READ_ONLY uses an explicit allowlist instead of every READ-classified permission;
- settings management remains ADMIN-only.

`tests/foundation/g3-06-policy-differences.test.ts` now requires zero current selected differences while retaining the historical finding count.

## Implementation

Added:

- `lib/authz/enforcement.ts`;
- `lib/authz/progressive-guards.ts`;
- `lib/authz/trusted-job.ts`;
- `tests/foundation/g3-07-progressive-enforcement.test.ts`;
- `tests/foundation/g3-07-trusted-jobs.test.ts`;
- `docs/architecture/G3_RBAC_ENFORCEMENT_POLICY.md`.

Updated:

- `lib/authz/backfill-plan.ts`;
- `lib/authz/legacy-audit-guards.ts`;
- `app/actions/users.ts`;
- `app/api/v1/settings/route.ts`;
- `app/api/v1/accounting/general-ledger/route.ts`;
- `lib/whatsapp/access.ts`;
- `app/api/properties/[id]/schedule-visit/route.ts`;
- `app/api/cron/realtime-retention/route.ts`.

Email actions continue using the G3-06 audited guard, which G3-07 promotes internally to progressive messaging enforcement when the messaging domain is enabled.

## Enforcement contract

The effective decision is:

```text
legacy_allow AND rbac_allow
```

Therefore the new layer can add a denial within an explicitly enabled domain but cannot create a grant rejected by the legacy guard.

Domains are disabled by default. Activation requires:

```text
G3_RBAC_ENFORCEMENT_ACK=G3-07-DUAL-ALLOW
G3_RBAC_ENFORCE_DOMAINS=users-settings,finance,messaging,sales,jobs
```

Production also requires:

```text
G3_RBAC_PRODUCTION_APPROVAL=approved
```

No environment value was changed by this stage.

## Priority-domain coverage

- **Users/settings:** user list/create/update/disable and settings read/manage.
- **Finance:** direct general-ledger request using `accounting.read`.
- **Messaging:** WhatsApp read/send/manage and email read/send.
- **Sales:** direct property visit scheduling using `properties.schedule-visit` and explicit resource scope.
- **Jobs:** realtime retention using the existing timing-safe Cron secret plus registered `realtime.purge` SYSTEM permission.

## Direct-request and denial evidence

Tests verify:

- no domain enables without the acknowledgement;
- Production requires separate approval;
- disabled domains preserve current decisions;
- legacy denial can never become RBAC allow;
- dual allow is required inside an enabled domain;
- missing permission is denied;
- cross-tenant access is denied;
- branch mismatch is denied;
- inactive user and inactive Tenant fail closed;
- malformed session and tenant-context contradiction fail closed;
- expired/no-active assignment fails closed;
- finance and sales direct routes return 403 on enforced denial;
- trusted jobs require both the existing secret decision and a SYSTEM permission;
- browser tenant input is not accepted for trusted jobs.

## Rollback

Immediate runtime rollback is removal of a domain from `G3_RBAC_ENFORCE_DOMAINS`; removing the acknowledgement disables all enforcement domains. Source rollback is a normal revert. No schema, backfill, or Production data rollback is required.

## Closure rule

G3-07 closes only after Prisma generation, all G3 contracts, existing regressions, production build, CodeQL, and Vercel preview/status pass on the PR head, followed by merge into the central branch. Production activation remains a separate release decision and is not part of this stage.
