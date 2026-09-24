# ORCA Z1 — Organization and Persona Reference Model

- **Document ID:** ORCA-Z1-ORG-001
- **Version:** 1.0
- **Date:** 2026-07-21
- **Status:** `EDITABLE REFERENCE MODEL / OWNER CONFIRMATION REQUIRED`
- **Operating model:** `SINGLE INDEPENDENT COMPANY`
- **Production action authorized:** `false`

## 1. Purpose and constraint

This document proposes the minimum organization and persona model needed to design ORCA coherently.

It does **not** claim that the company currently has these departments, branches, teams, titles, approval limits, or staffing levels. The company owner may combine, rename, add, or remove units. Until confirmed, ORCA must use safe defaults and avoid granting authority merely because a title exists.

The current legacy `Role` enum in code is implementation evidence only. It does not define the final organization or authorization model.

## 2. Organization design principles

1. Authority is separate from organizational placement.
2. A branch, department, or team membership does not automatically grant sensitive permissions.
3. Financial and contractual initiation must be separated from final approval where feasible.
4. Access is least privilege, server-enforced, time-bounded when temporary, and reviewable.
5. Joiner, mover, leaver, delegation, and emergency access are explicit processes.
6. The model must support a small company where one person may hold multiple roles, while detecting incompatible combinations.
7. The final structure is approved by the owner; the platform provides an editable hierarchy.

## 3. Proposed organizational units

| Unit ID | Reference unit | Core responsibilities | May be combined with |
|---|---|---|---|
| ORG-EXEC | Executive ownership | Business direction, risk acceptance, budgets, final release authority | Operations leadership in a small company |
| ORG-OPS | Operations management | Daily operating control, cross-team coordination, SLA ownership | Sales operations |
| ORG-SALES | Sales and customer operations | Leads, qualification, tours, offers, follow-up, conversion | Customer support in a small company |
| ORG-MKT | Marketing and acquisition | Campaign sources, content, lead acquisition, consent and opt-out operations | Sales operations with restricted permissions |
| ORG-INV | Property and inventory | Asset/unit records, availability, evidence, pricing inputs, publication readiness | Project operations |
| ORG-PRJ | Project operations | Projects, phases, buildings, units, milestones, risks | Inventory operations |
| ORG-CTR | Contract operations | Contract preparation, document control, approval routing, amendments | Legal coordination, but not final legal advice |
| ORG-FIN | Finance and accounting | Invoices, installments, reconciliation, receipts, settlement, financial reporting | None for final approval conflict purposes |
| ORG-SUP | Customer support | Conversations, tickets, complaints, escalation, resolution evidence | Sales operations with separation controls |
| ORG-ADM | Platform administration | User lifecycle, configuration, security operations, audit support | Technical operations, not business approval |
| ORG-AUD | Audit and compliance coordination | Review access, evidence, exceptions, incidents, regulatory records | Executive oversight in small company |

## 4. Proposed hierarchy objects

ORCA should support the following reference hierarchy without assuming every level is used:

```text
Company
├── Branch (optional)
│   ├── Department (optional)
│   │   ├── Team (optional)
│   │   │   └── Position / assignment
```

Rules:

- A user can have multiple time-bounded assignments.
- One assignment can be primary.
- Every assignment belongs to the single company scope represented by the retained `tenantId` boundary.
- Organizational scope is explicit: `TENANT`, `BRANCH`, `DEPARTMENT`, `TEAM`, `SELF`, or `RESOURCE`.
- Authority is granted through permissions/roles, not inferred solely from hierarchy.
- Cross-branch or cross-team access requires an explicit assignment or scoped role.

## 5. Persona registry

### PER-01 — Company Owner / Executive Sponsor

**Goals**
- See company performance and risks.
- Approve business policy, budgets, high-risk actions, providers, and Production release.
- Review exceptions and evidence.

**Typical actions**
- Approve organization model and release scope.
- Approve financial/contract thresholds.
- Accept residual risk.
- Select paid providers and authorize activation.

**Restrictions**
- Owner status must not bypass audit logging.
- Routine operational work should not require unrestricted super-admin use.

### PER-02 — Operations Manager

**Goals**
- Coordinate daily work across sales, inventory, contracts, finance, and support.
- Monitor SLAs, queues, blocked work, and exceptions.

**Typical actions**
- Assign workloads.
- Review overdue tasks and escalations.
- Approve operational exceptions within delegated limits.
- View cross-team dashboards within scope.

**Restrictions**
- No automatic authority for final payment, refund, contract, or access-control approval.

### PER-03 — Sales Manager

**Goals**
- Manage pipeline, assignment, qualification quality, offers, and conversion.

**Typical actions**
- Reassign leads.
- Approve discounts/offers within delegated limits.
- Review lost reasons and performance.
- Escalate reservations and contract readiness.

**Restrictions**
- Cannot confirm payment evidence or approve own high-risk exception.

### PER-04 — Sales Agent / Sales Employee

**Goals**
- Work assigned leads from first contact through tour, offer, and handoff.

**Typical actions**
- Update assigned leads.
- Record activities.
- Schedule tours.
- Draft offers within policy.
- Create follow-up tasks.

**Restrictions**
- Access limited to assigned or scoped records.
- Cannot self-approve discounts beyond delegated limit.
- Cannot activate contracts or confirm payment.

### PER-05 — Marketing Coordinator

**Goals**
- Manage acquisition sources, campaign attribution, content readiness, and marketing consent status.

**Typical actions**
- Create/update approved source metadata.
- Review acquisition metrics.
- Prepare advertisement records when licensed and approved.
- Manage opt-out records.

**Restrictions**
- No unrestricted customer detail access.
- No advertisement activation without applicable evidence and owner-approved provider.

### PER-06 — Property / Inventory Operator

**Goals**
- Maintain accurate asset/unit records, availability, evidence, and readiness.

**Typical actions**
- Create and update properties, projects, units, prices, and documents.
- Propose status changes.
- Reconcile availability.

**Restrictions**
- Cannot approve own ownership evidence or override active reservation/contract without authorization.

### PER-07 — Project Manager / Project Operator

**Goals**
- Maintain project structure, phases, milestones, unit inventory, progress, and risks.

**Typical actions**
- Manage project hierarchy and progress.
- Coordinate inventory and pricing inputs.
- Record project risks and dependencies.

**Restrictions**
- No automatic authority for financial commitments or regulated sales activity.

### PER-08 — Contract Operations Specialist

**Goals**
- Prepare accurate contract packages, route approvals, manage versions, and retain evidence.

**Typical actions**
- Generate draft from approved template.
- Validate parties and required documents.
- Route review and signature.
- Manage amendment, renewal, cancellation, and termination workflows.

**Restrictions**
- Cannot activate a contract without required approvals and evidence.
- Cannot invent or alter official legal templates outside approved governance.

### PER-09 — Accountant / Finance Operator

**Goals**
- Maintain invoices, installment schedules, receipts, reconciliation, and financial exceptions.

**Typical actions**
- Create obligations from approved contracts.
- Record provider/bank evidence.
- Reconcile payments.
- Prepare settlement/refund requests.

**Restrictions**
- Cannot approve own refund or irreversible financial adjustment above delegated limit.
- Cannot treat an internal event as final payment proof.

### PER-10 — Customer Support Agent

**Goals**
- Resolve customer questions, complaints, channel issues, and follow-ups.

**Typical actions**
- Manage assigned tickets and conversations.
- Link context to customer/deal.
- Escalate operational or financial issues.

**Restrictions**
- Sensitive contract and financial data shown only when required for resolution.
- No direct financial or contract mutation unless separately authorized.

### PER-11 — Platform Administrator

**Goals**
- Operate users, assignments, configuration, provider states, feature flags, and technical support.

**Typical actions**
- Provision/deactivate users.
- Manage approved configuration.
- Review integration status.
- Support incident investigation.

**Restrictions**
- Administrative access does not grant business approval authority.
- Privileged actions require audit, reason, and where appropriate approval.

### PER-12 — Auditor / Compliance Reviewer

**Goals**
- Review access, decisions, evidence, incidents, exceptions, retention, and regulatory records.

**Typical actions**
- Read audit trails.
- Export approved evidence packages.
- Record findings and remediation requests.

**Restrictions**
- Read-only by default.
- No ability to alter evidence under review.

### PER-13 — Technical Provider / Support Engineer

**Goals**
- Build, test, deploy when authorized, diagnose, and maintain the platform.

**Typical actions**
- Work in non-Production branches and environments.
- Maintain adapters, tests, runbooks, monitoring, and recovery tooling.
- Access Production only through separately approved support process.

**Restrictions**
- Not the real-estate operator.
- Does not own company provider accounts, licenses, sender identities, or business approvals.
- Cannot use developer-owned Production credentials.

## 6. Responsibility matrix by process

Legend: `A` accountable, `R` responsible, `C` consulted, `I` informed. Final assignments remain owner decisions.

| Process | Owner | Operations | Sales | Inventory/Project | Contract | Finance | Admin/Technical |
|---|---:|---:|---:|---:|---:|---:|---:|
| Organization and policy | A | R | I | I | C | C | C |
| Lead management | I | A | R | C | I | I | C |
| Property/project readiness | I | C | C | A/R | C | I | C |
| Tours | I | A | R | C | I | I | C |
| Offers/reservations | I | A | R | C | C | I | C |
| Contract activation | A for high-risk policy | C | C | I | R | C | C |
| Invoice and payment reconciliation | I | C | I | I | C | A/R | C |
| Refund/settlement approval | A or delegated approver | C | I | I | C | R | I |
| User access | A for policy | C | I | I | I | I | R |
| Provider activation | A | C | I | I | I | C | R technical |
| Production release | A | I | I | I | I | I | R technical |

## 7. Segregation-of-duties reference conflicts

The following combinations require preventive or detective control:

| Conflict ID | Incompatible or sensitive combination | Safe control |
|---|---|---|
| SOD-01 | Create vendor/provider + approve provider activation | Separate approver or explicit owner approval |
| SOD-02 | Draft high-value offer + approve same offer | Approval threshold and second approver |
| SOD-03 | Prepare contract + activate same contract without review | Required review/approval evidence |
| SOD-04 | Record payment + reconcile/approve exception | Separate reviewer or post-review queue |
| SOD-05 | Create refund request + approve/execute refund | Separate finance authority |
| SOD-06 | Grant privileged access + approve own access | Independent approver and audit |
| SOD-07 | Modify evidence + audit same evidence | Auditor read-only; immutable audit trail |
| SOD-08 | Production deployment + sole approval of release | Owner release instruction plus technical execution evidence |

For a small company, one person may hold both responsibilities only through an approved compensating control, reason, audit, and periodic review.

## 8. User lifecycle processes

### Joiner

- Owner/manager approves business need and assignment.
- Identity is verified.
- Minimum role and scope are granted.
- Temporary access has an expiry.
- User receives training and policy acknowledgment where applicable.

### Mover

- Existing assignments are reviewed before new access is added.
- Old access is removed when no longer needed.
- Sensitive conflicts are re-evaluated.
- Audit records the effective date and approver.

### Leaver

- Sessions and access are revoked promptly.
- Assigned work and records are transferred.
- Provider or shared credentials are rotated when exposure is possible.
- Personal data and employment records follow approved retention rules.

### Delegation

- Delegator, delegate, scope, reason, start, expiry, and approver are recorded.
- Delegation never exceeds the delegator's authority.
- High-risk actions may prohibit delegation.

### Break-glass

- Disabled by default.
- Requires documented emergency reason.
- Time-limited and monitored.
- Creates immediate alert and mandatory post-use review.

## 9. Owner decisions required

| Decision ID | Owner decision | Safe default |
|---|---|---|
| ODR-Z1-01 | Actual legal entity, branches, departments, and teams | Use single-company root with optional editable units |
| ODR-Z1-02 | Actual job titles and staffing model | Use personas as reference roles only |
| ODR-Z1-03 | Final role and permission ownership | Least privilege and deny unproven authority |
| ODR-Z1-04 | Financial approval limits | No high-risk self-approval; owner approval required |
| ODR-Z1-05 | Contract approval limits and signatories | No contract activation without owner-approved authority model |
| ODR-Z1-06 | Delegation and emergency-access policy | Disable unrestricted delegation/break-glass |
| ODR-Z1-07 | Periodic access-review frequency | Recommend quarterly; mark final frequency pending |

## 10. Acceptance statement

```text
REFERENCE ORGANIZATION MODEL: COMPLETE
PERSONA REGISTRY: COMPLETE
SOD REFERENCE MODEL: COMPLETE
USER LIFECYCLE MODEL: COMPLETE
ACTUAL COMPANY STRUCTURE VERIFIED: NO
OWNER DECISIONS REGISTERED: YES
RUNTIME CHANGE: NONE
DATABASE CHANGE: NONE
PRODUCTION ACTION: NONE
```
