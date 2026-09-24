# G3 Progressive RBAC Enforcement Policy

- **Stage:** G3-07 — Enforcement
- **Mode:** domain-gated dual allow
- **Default runtime:** legacy decision only
- **Production enablement:** not performed by this stage

## Safety contract

Progressive enforcement uses an intersection of the existing database-backed guard and the new RBAC decision:

```text
effective_allow = legacy_allow AND rbac_allow
```

This guarantees:

- RBAC never converts a legacy denial into a grant;
- a selected domain may add a denial after its policy and data are verified;
- missing context, inactive user/Tenant, expired assignment, missing permission, scope mismatch, and cross-tenant scope fail closed only inside an enabled domain;
- domains not explicitly enabled preserve current behavior and may continue producing G3-06 audit evidence.

## Required runtime gates

No domain is enforced unless both values are supplied:

```text
G3_RBAC_ENFORCEMENT_ACK=G3-07-DUAL-ALLOW
G3_RBAC_ENFORCE_DOMAINS=<comma-separated domains>
```

Allowed domain keys:

1. `users-settings`
2. `finance`
3. `messaging`
4. `sales`
5. `jobs`

Production additionally requires:

```text
G3_RBAC_PRODUCTION_APPROVAL=approved
```

This repository stage does not set these environment variables and does not deploy them.

## Rollout order

The approved order is:

1. `users-settings`
2. `finance`
3. `messaging`
4. `sales`
5. `jobs`

A release may enable one domain at a time. Comma-separated multi-domain activation is supported only after each included domain has independently passed the same data, scope, and direct-request gates.

## Policy reconciliation

G3-06 found 15 differences on selected settings/email/WhatsApp permissions. Before G3-07 enforcement, role blueprints were narrowed and aligned:

- SALES_MANAGER and SALES_EMPLOYEE retain their established settings-read and communication access;
- MARKETING no longer receives implicit email or WhatsApp send authority;
- READ_ONLY no longer receives every permission classified as READ;
- settings management remains ADMIN-only;
- explicit read-only permissions replace risk-class-wide grants.

The historical count remains documented while the executable comparison now requires zero selected mismatches.

## Integrated boundaries

### Users and settings

- tenant user list/create/update/disable actions;
- settings GET and PUT.

### Financial operations

- general-ledger direct API request with current-session identity revalidation under `accounting.read`.

### Messaging

- WhatsApp read/send/connection access;
- email read/send through the audited guard promoted to progressive enforcement.

### Sales operations

- direct property schedule-visit request under `properties.schedule-visit` with resource scope.

### Background jobs

- realtime retention Cron under the explicit trusted-system permission `realtime.purge`;
- the existing timing-safe `CRON_SECRET` decision remains mandatory;
- no browser-derived tenant or company value establishes trusted job scope.

## Denial behavior

Enabled domains deny when:

- the legacy guard denies;
- the verified server identity is missing or malformed;
- the current user or Tenant is missing or inactive;
- no active, non-expired assignment grants the permission;
- the permission is unknown;
- the assigned scope is not allowed for the permission;
- branch, department, team, self, or resource scope does not match;
- tenant equality fails;
- an enforcement evaluation fails.

Background jobs additionally require a registered `SYSTEM` permission and the original trusted-secret check.

## Rollback

The immediate runtime rollback is to remove a domain from `G3_RBAC_ENFORCE_DOMAINS`. Removing the acknowledgement disables all domains. Code rollback is a normal revert of the G3-07 commit set. No schema or data rollback is required because this stage does not apply a migration or backfill.
