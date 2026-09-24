# ORCA Z4 — Authorization, Data Access, RBAC, and Segregation-of-Duties Contract

- **Document ID:** ORCA-Z4-AUTH-001
- **Version:** 0.9 — Planning Candidate
- **Date:** 2026-07-22
- **Status:** `TARGET AUTHORIZATION CONTRACT COMPLETE / ACTUAL ORG APPROVAL OPEN`
- **Production action authorized:** `false`

## 1. Purpose

Define the target server-enforced authorization, organizational scope, field/data access, delegation, lifecycle, approval, and segregation-of-duties rules. The current repository contains foundation RBAC work, but Z7 must determine whether each implementation element conforms to this target.

## 2. Governing rules

1. Authentication does not imply authorization.
2. Authorization is deny-by-default and server-enforced for every read, write, approval, export, administrative, and provider action.
3. Client-side visibility is usability only; it is never the security boundary.
4. The authenticated company security partition is mandatory for all company-scoped access.
5. Role grants capability; organizational/resource scope limits where it applies.
6. Explicit permission is required for high-risk actions; broad role names alone are insufficient.
7. Ownership or assignment does not bypass policy.
8. Sensitive decisions record actor, authority, scope, reason, evidence, time, result, and policy version.
9. Temporary/delegated/break-glass access is bounded, approved, reviewed, and audited.
10. Incompatible creation, approval, execution, reconciliation, and review duties are separated.

## 3. Access context

Every protected request builds an `AccessContext` from trusted server-side evidence:

- session ID and authentication assurance;
- active user ID and employment/account state;
- company security partition;
- current role assignments and effective dates;
- branch, department, team, self, and resource assignments;
- temporary delegation or break-glass state;
- permission catalog/policy version;
- request correlation, channel, environment, and trusted-job status.

The context is revalidated for sensitive/long-lived operations and is never assembled from untrusted client claims.

## 4. Scope model

| Scope | Meaning | Example controls |
|---|---|---|
| `COMPANY` | whole operating company | owner/executive or restricted central function |
| `BRANCH` | records belonging to assigned branch(es) | branch sales/operations/finance |
| `DEPARTMENT` | assigned functional department | finance, contracts, support, projects |
| `TEAM` | assigned team/work queue | sales team, support team |
| `SELF` | actor-created/assigned/personal work | own tasks, assigned leads, own appointments |
| `RESOURCE` | explicitly assigned customer/project/property/case | project manager or case owner |
| `PUBLIC_APPROVED` | specifically approved public information only | public property listing content |
| `SYSTEM_JOB` | trusted scheduled/worker identity with explicit operation scope | retention check, reminder, reconciliation |

Scopes may combine only through an explicit policy. A broad role cannot silently convert a narrow assignment into company-wide access.

## 5. Permission naming and structure

Recommended permission form:

```text
<domain>.<resource>.<action>
```

Examples:

- `customer.lead.read`
- `customer.lead.assign`
- `inventory.unit.update_availability`
- `commercial.offer.create`
- `commercial.offer.approve`
- `contract.contract.activate`
- `finance.payment_evidence.record`
- `finance.payment_evidence.verify`
- `finance.reconciliation.complete`
- `work.approval.decide`
- `document.file.download_restricted`
- `report.export.personal_data`
- `integration.provider.configure`
- `integration.provider.activate`
- `admin.role.assign`
- `audit.event.read_restricted`

Permissions define action authority; scopes and policy predicates define applicable records/fields/states/limits.

## 6. Authorization decision contract

Each decision evaluates:

- valid actor/trusted job;
- active company/user state;
- permission grant;
- effective role/delegation dates;
- organization/resource scope match;
- record company partition;
- source state and target transition;
- ownership/assignment where required;
- monetary/contractual/configuration limit;
- segregation-of-duties conflict;
- required reason/evidence/approval;
- provider/license/feature state;
- field classification/export sensitivity;
- rate/volume or anomaly policy where applicable.

Decision output:

```text
ALLOW | DENY | REQUIRE_ADDITIONAL_APPROVAL
reasonCode
policyVersion
matchedRole / permission / scope
requiredConditions
maskedFields
correlationId
```

Denials exposed to users are safe and do not reveal unauthorized record existence.

## 7. Reference role families

Actual titles and assignments require owner confirmation. Target role families include:

- Company Owner / Executive Authority
- Platform/Organization Administrator
- Sales Manager
- Sales User / Agent
- Inventory/Property Manager
- Project Manager
- Tour/Operations Coordinator
- Offer/Commercial Approver
- Contract Specialist / Contract Approver
- Finance Recorder / Finance Verifier / Reconciliation Authority
- Support/Communication User
- Document/Record Manager
- Compliance/Privacy Reviewer
- Auditor / Read-only Reviewer
- Technical Operations / Support (restricted, approved)

Role families are not universal company-wide roles by default. They receive only approved permissions and scopes.

## 8. Segregation-of-duties matrix

| Process | Incompatible duties by default | Approved exception direction |
|---|---|---|
| Offer | create/materially modify ↔ final approve above own limit | independent approver or explicit owner exception |
| Reservation | request/acquire ↔ override conflict/release protected hold | separate authority and reason |
| Contract | draft/materially edit ↔ final approve/activate | contract authority separate from drafter where risk requires |
| Signature | prepare request ↔ assert/verify final signature evidence | verified provider/evidence review |
| Invoice | create/issue ↔ cancel/write-off above limit | finance approval |
| Payment evidence | record/upload ↔ verify/confirm | separate verifier |
| Reconciliation | allocate evidence ↔ final complete exception | independent reconciliation authority |
| Refund | request ↔ approve ↔ execute evidence ↔ reconcile | separated according to amount/risk |
| Settlement | calculate ↔ approve ↔ mark executed | independent approval/evidence |
| Role/permission | request/configure ↔ approve ↔ periodic review | owner/security review |
| Provider | configure credentials ↔ activate Production ↔ review logs/billing | owner approval plus technical validation |
| Retention/disposal | define population ↔ approve disposal ↔ verify disposal | privacy/record/technical separation |
| Audit | perform sensitive action ↔ close own finding or alter evidence | independent auditor/reviewer |

Exact thresholds and exception authorities are `OWNER_DECISION_REQUIRED`.

## 9. Approval and limit policy

High-risk actions use policy inputs such as:

- money amount and currency;
- discount/price deviation;
- contract type/value/term;
- refund/settlement amount;
- data/export volume and classification;
- provider environment/activation;
- role/permission sensitivity;
- destructive or irreversible effect;
- regulatory/license condition.

Limits are versioned, effective-dated, owned, and tested. Until approved, the safe default is to require owner or independent high-risk approval rather than infer a numeric threshold.

## 10. Joiner, mover, leaver lifecycle

### Joiner

- verified identity and employment/contract status;
- approved manager/organization assignment;
- least-privilege role package;
- MFA/security setup as required;
- training/acceptable-use acknowledgement;
- access activation and review date.

### Mover

- effective-dated new assignment;
- removal/review of incompatible previous access;
- transfer of owned work/resources;
- temporary overlap only if approved and time-bounded;
- SoD re-evaluation.

### Leaver/suspension

- prompt session/token revocation;
- disable account without deleting business evidence;
- remove delegations/credentials/device access;
- transfer tasks, customers, projects, approvals, and ownership;
- preserve required audit/records;
- close support/Production access.

## 11. Delegation and temporary access

Delegation requires:

- delegator/approver and delegate;
- exact permissions/scopes/resources;
- purpose and reason;
- start/end time;
- conflict/SoD evaluation;
- prohibited non-delegable permissions;
- notification and review;
- audit and automatic expiry.

Delegation cannot exceed the approved authority of the delegator or silently persist after role/assignment changes.

## 12. Break-glass access

Break-glass is exceptional and not a normal admin role.

- limited named users;
- strong authentication;
- incident/ticket/reason required;
- explicit environment/resource/action limits;
- short expiry and no standing elevation;
- prominent alert and immutable audit;
- session/activity review;
- post-use owner/security review;
- credentials and process tested without exposing secrets.

Production break-glass remains a separate Z6/Z8 owner authorization topic.

## 13. Field, document, and export access

Record-level access does not automatically permit all fields or actions.

Field policies may:

- hide or mask identity/contact/financial/signature/security fields;
- restrict free-text notes and attachments;
- prevent bulk search/export;
- allow operational use but not download/share;
- require reason and approval for restricted evidence;
- redact data in reports, logs, notifications, and AI context.

Every export defines purpose, columns, population, classification, volume limit, format, expiry, watermark/encryption where required, owner, and audit evidence.

## 14. Trusted jobs and service identities

Background work uses explicit service/trusted-job identities with:

- operation permission;
- company/resource scope;
- environment;
- schedule/trigger;
- configuration and secret ownership;
- idempotency and concurrency controls;
- audit/correlation;
- disable/kill switch;
- no interactive-user impersonation unless specifically designed and recorded.

A missing user session is not permission for a system-wide action.

## 15. Periodic access review

Reviews include:

- users/account state;
- role and scope assignments;
- temporary/delegated/break-glass access;
- sensitive permissions;
- inactive/orphaned accounts;
- SoD conflicts;
- provider and Production access;
- export/document/audit access;
- reviewer, decision, evidence, remediation, and completion date.

Frequency is risk-based and owner-approved in Z5/Z6.

## 16. Required tests

Direct tests are required for every P0/P1 protected operation:

- unauthenticated and disabled user;
- wrong company partition;
- missing permission;
- wrong branch/department/team/self/resource scope;
- expired role/delegation;
- SoD conflict;
- amount/approval-limit boundary;
- wrong state/precondition;
- field masking and export restriction;
- trusted-job scope;
- break-glass expiry/audit;
- not-found/unauthorized non-disclosure;
- cache/session revalidation after permission change.

Test names or UI hiding alone are not evidence.

## 17. Owner decisions required

1. Actual organization, branches, departments, teams, and reporting lines.
2. Final personas/job titles and role packages.
3. Financial, discount, contract, refund, settlement, export, and provider limits.
4. Named approval authorities and absence/delegation policy.
5. Break-glass owner and Production-access process.
6. Access-review frequency and reviewers.
7. Technical support access boundaries.
8. Sensitive field/document/export classifications.

## 18. Decision

```text
DENY-BY-DEFAULT SERVER AUTHORIZATION: DEFINED
ACCESS CONTEXT AND SCOPES: DEFINED
PERMISSION STRUCTURE: DEFINED
SEGREGATION OF DUTIES: DEFINED
JOINER / MOVER / LEAVER: DEFINED
DELEGATION / BREAK-GLASS: DEFINED
FIELD / EXPORT CONTROLS: DEFINED
TRUSTED JOB AUTHORIZATION: DEFINED
ACTUAL ORG / LIMITS: OWNER DECISION REQUIRED
PRODUCTION RBAC ENABLEMENT: NOT AUTHORIZED
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
