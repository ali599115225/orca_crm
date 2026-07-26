# ORCA Z8 — EXEC-004 Decision Record

- **Decision ID:** `ORCA-DR-EXEC-004-001`
- **Date:** `2026-07-26`
- **Status:** `APPROVED OWNER DECISIONS / IMPLEMENTED AS CONFIGURABLE PRODUCT DEFAULTS`
- **Package:** `EXEC-004`

## Context

The repository retains historical multi-company SaaS fields and compatibility boundaries, while the approved target is a post-sale, customer-operated platform for one company. The company may have multiple branches and central departments. `tenantId` remains an internal singleton security partition and is not a commercial tenant selector.

## Decision

### Operating model

```text
ORCA = B2B technical software provider
Customer deployment = one company
Commercial tenants = one
Branches = one or more
```

Historical SaaS capabilities may remain only as non-executable compatibility boundaries. They must not create companies, purchase subscriptions, lease agents, change plans, enforce package limits, renew billing or navigate to upgrades.

Stored agent usage limits from the legacy package model remain historical database evidence only. Runtime increments ignore those values, new meters use the technical PostgreSQL integer ceiling, and API/action responses expose the stored value only as `recordedLimitValue` with `limitValue: null` and `commercialLimitApplied: false`.

### Organization model

```text
Company
→ Branch
→ Department
→ Team
→ User Assignment
```

A department may be central by having company scope rather than a branch parent. A non-central department must have a branch parent. A team must match the exact tenant, branch and department hierarchy. Service lines are attached to branches and may be enabled, disabled and assigned a manager without creating another company or tenant.

### Identity and authority separation

- `jobTitle` is descriptive human-resources metadata.
- `securityRole` is a permission bundle.
- `scopeAssignment` limits where that permission bundle applies.
- No one of these fields substitutes for the others.
- A role may be assigned only at an approved scope type.
- A manager may grant or revoke only roles below the manager's explicit delegation ceiling.
- Self-assignment and self-revocation are denied.

### Authority evaluation

The default is deny. An operation is allowed only when all applicable checks pass:

```text
same tenant security partition
AND active assignment
AND role contains permission
AND exact resource scope matches
AND branch service is enabled
AND separation-of-duties evidence is present
```

Scope precedence is represented by explicit assignment types, not by implicit escalation:

```text
COMPANY
BRANCH
DEPARTMENT
TEAM
ASSIGNED_RESOURCE
```

A company assignment may cover branches because it is explicit. A branch assignment cannot cross into another branch. A department or team assignment must match its exact hierarchy. An assigned-resource assignment matches only the exact type and record identifier.

Revocation authorization is evaluated against the persisted target assignment loaded from the repository. A caller-supplied branch, department, team or resource scope is never trusted for revocation.

### Conservative role defaults

The approved personas are represented as configurable security-role defaults. The defaults intentionally avoid privilege expansion:

- Platform Owner may govern the platform and read high-level operational records but does not automatically write finance records.
- System Administrator configures technical settings but has no automatic finance, refund, discount, contract-cancellation or contract-write permission.
- Compliance/Audit is read-only.
- Finance Manager may initiate or approve a refund, but the same actor may not do both for the same operation.
- Accountant/Collector may initiate a refund but not approve it.
- Broker/Agent is limited to sales/property/contract reads and assigned or scoped sales work.
- Technician/Contractor is limited to team-scoped or assigned-resource maintenance work.
- Branch Manager may delegate only approved branch-operational roles and cannot create or revoke finance authority.
- Approval permissions fail closed when the initiating actor is missing or equals the approver.

These defaults are reversible through future approved configuration work, but no role may expand legacy access without a separately tested authorization change.

### Service-line defaults

The model recognizes:

```text
BROKERAGE
MARKETING
SALES
LEASING
PROPERTY_MANAGEMENT
FACILITY_MANAGEMENT
MAINTENANCE
CUSTOMER_SERVICE
FINANCE_AND_COLLECTION
DOCUMENTS
REPORTING
```

A branch operation tied to a service line fails closed when that service is not explicitly enabled for the branch.

### Database authority boundary

Application checks are not the only defense. New-table triggers reject:

- a department whose branch belongs to another tenant;
- a team whose tenant, branch or department ancestry does not match;
- a branch-service manager from another tenant;
- an assignment user or assigning actor from another tenant;
- branch, department or team assignment hierarchy mismatch;
- role/scope incompatibility;
- authority-audit actors or branches from another tenant.

At most one central branch may exist per tenant. Central departments must have no branch parent; non-central departments must have one.

### Audit

Organization mutations use one transaction for the state change and its audit entry. The dedicated authority audit table is append-only through a database trigger. Audit records contain actor, tenant partition, action, target, branch where applicable and redaction-safe structured details.

## Alternatives rejected

1. **Job title grants authority** — rejected because titles are mutable business labels and do not prove security intent.
2. **Branch membership grants every branch record** — rejected because users may be limited to a team or assigned records.
3. **System administrator equals business administrator** — rejected because it violates least privilege and separation of duties.
4. **Every service becomes a tenant/company** — rejected because services are modular lines inside the one customer company.
5. **Delete `tenantId` immediately** — rejected because it remains a proven security partition and removal would enlarge migration and data risk.
6. **Run migration or backfill during package implementation** — rejected because database/customer-data authorization is absent.
7. **Activate providers while adding service lines** — rejected because integrations are customer-owned and separately authorized.
8. **Trust caller-provided scope during revocation** — rejected because it enables forged cross-branch authority checks.
9. **Allow approval when initiator evidence is absent** — rejected because separation of duties must fail closed.
10. **Treat stored usage-meter limits as active entitlements** — rejected because they originate from the retired package model.

## Regulatory boundary

This is a product and security architecture decision, not legal certification. Fields for licenses, approvals, statuses or compliance evidence do not mean ORCA validates their legal sufficiency. The customer company owns licenses, policies, data lawfulness, provider accounts and operational activation.

## Consequences

- New organization tables are additive.
- Existing records are not assigned to branches automatically.
- Until a separately authorized migration/backfill occurs, new scope enforcement can be adopted only by explicitly wired operations with proven assignments.
- Legacy tenant isolation stays active.
- Existing broad operations are not silently claimed as fully branch-scoped by this package.
- Stored legacy meter limits are retained but no longer act as Runtime authority.
- Later packages must consume this authority boundary rather than invent independent branch checks.
