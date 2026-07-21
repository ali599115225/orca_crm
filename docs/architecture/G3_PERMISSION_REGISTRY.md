# G3 Permission Registry

- **Stage:** G3-02 — Permission Inventory
- **Status:** Accepted
- **Canonical source:** `lib/authz/permission-registry.ts`
- **Security boundary:** verified `tenantId`
- **Authorization posture:** permission-key based, scoped, default deny

## Purpose

This registry replaces ad-hoc authorization vocabulary with stable server permission keys. It is an inventory contract, not a UI menu and not a replacement for the existing tenant isolation boundary.

The inventory was derived from current ORCA server-side surfaces, including:

- Server Actions under `app/actions/`;
- route handlers under `app/api/`;
- domain mutations under `lib/domain/`;
- payment, accounting, document, WhatsApp, agent, Sentinel, real-time, and compliance services under `lib/`;
- dashboard read models under `features/`;
- trusted cron and webhook boundaries.

Every permission records one or more repository source paths. Those paths are evidence of the operation domain; they are not an instruction to trust route names or client input.

## Key contract

Permission keys use the form:

```text
resource.action
```

Examples:

```text
leads.read
leads.assign
contracts.issue
payments.collect
accounting.reverse
access.manage
sentinel.execute
```

Keys are stable server contracts. Arabic labels, navigation names, legacy Prisma `Role` values, JWT role claims, and client-provided role strings are not authorization evidence.

## Scope vocabulary

| Scope | Meaning |
|---|---|
| `TENANT` | All permitted resources inside the verified company partition. |
| `BRANCH` | Resources assigned to a permitted branch. |
| `DEPARTMENT` | Resources assigned to a permitted department. |
| `TEAM` | Resources assigned to a permitted team. |
| `SELF` | Resources owned by or assigned to the acting user. |
| `RESOURCE` | One explicitly bound resource. |

All scopes are subordinate to `tenantId`. A matching branch, team, user, or resource identifier can never cross the verified tenant boundary.

## Risk vocabulary

| Risk | Meaning |
|---|---|
| `READ` | Non-mutating access to operational information. |
| `WRITE` | Create or update an operational record. |
| `APPROVE` | Financial, lifecycle, publication, assignment, or irreversible decision. |
| `ADMIN` | Company configuration, identity, access, provider, or compliance administration. |
| `SYSTEM` | Explicit trusted job, health, webhook, purge, or internal service operation. |

## Covered domains

The canonical registry covers these domains:

- dashboard;
- users, organization, and access administration;
- leads, contacts, opportunities, projects, properties, tasks, tours, and offers;
- contracts, installments, invoices, payments, rentals, and accounting;
- marketing, WhatsApp, email, helpdesk, documents, and notifications;
- agents, settings, integrations, compliance, and ZATCA;
- automations, Sentinel, auditing, reports, real-time synchronization, webhooks, and health.

## Default-deny rules

An operation is denied when any of the following is missing or contradictory:

1. verified session identity;
2. active user and active tenant;
3. registered permission key;
4. active role assignment carrying the permission;
5. valid scope match;
6. tenant equality;
7. required resource ownership or explicit resource binding.

Unknown permission keys are never treated as aliases or automatically allowed.

## Compatibility rules

During Expand and Backfill:

- the legacy Prisma `Role` enum remains available only as a compatibility source;
- `User.department` remains available only as a compatibility source;
- existing role-list guards remain until audit and enforcement stages replace them safely;
- no permission in this registry grants cross-tenant access;
- no destructive SaaS or tenant-data cleanup is authorized by this inventory.

## Change control

A new sensitive server operation must:

1. use an existing permission key or add a reviewed key;
2. declare valid scopes and risk;
3. record at least one server-side source path;
4. add or update tests;
5. remain default deny until authorization integration is complete.

The executable contract is `tests/foundation/g3-02-permission-registry.test.ts`.
