# ORCA Z6 — Environment, Deployment, and Operating Model

- **Document ID:** ORCA-Z6-ENV-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `TEXT CONTRACT COMPLETE / ENVIRONMENTS NOT AUTHORIZED`
- **Production action authorized:** `false`

## 1. Purpose

Define the target operational separation for ORCA without creating, changing, or claiming readiness of any environment.

## 2. Environment classes

| Environment | Purpose | Data rule | Provider rule | Deployment authority |
|---|---|---|---|---|
| Local | development and targeted verification | synthetic/local only | mock or developer-owned sandbox only | developer within approved scope |
| CI | deterministic quality and security gates | disposable synthetic fixtures | mocked; no Production credential | workflow policy |
| Preview | PR-level build and visual/functional review | synthetic or approved masked seed | `NOT_CONFIGURED` or sandbox | automatic non-Production |
| Staging | release rehearsal and UAT | approved representative non-Production data | company sandbox/test accounts | owner-authorized setup |
| Production | live company operations | approved live data and retention | company-owned Production accounts | separate explicit owner approval |

Preview is not Staging; a successful Preview does not prove Production readiness.

## 3. Configuration contract

- typed configuration with startup validation;
- clear required/optional/provider-gated variables;
- environment-specific secret references, never copied from developer personal accounts;
- safe `NOT_CONFIGURED` state for optional providers;
- no hidden fallback to Production endpoints;
- feature flags have owner, purpose, scope, expiry and safe default;
- configuration changes are auditable and reversible;
- timezone defaults to Asia/Riyadh for display/operation while event truth is UTC;
- currency and locale are explicit.

## 4. Deployment lifecycle

1. Resolve source SHA and approved branch.
2. Reproduce clean install from lockfile.
3. Run blocking security, type, contract, regression, recovery and build gates.
4. Generate evidence package, SBOM and artifact identity.
5. Validate Preview/Staging against approved scope.
6. Obtain release/UAT and Production authorization separately.
7. Deploy immutable candidate through approved platform path.
8. Verify health, migrations if separately authorized, critical smoke paths and observability.
9. Announce release and start heightened monitoring.
10. Execute rollback/forward-fix when acceptance thresholds fail.

No migration, provider activation, secret update or Production deployment is implied by application deployment approval.

## 5. Access model

- least privilege by environment;
- Production access is separate from source repository administration;
- emergency access is time-bounded and reviewed;
- sensitive actions require strong authentication when approved;
- service identities are non-human, purpose-specific and rotated;
- vendor/support access has contract, time window, scope and evidence;
- session recording is considered for high-risk Production administration when applicable.

## 6. Release states

`PLANNED → CANDIDATE → VERIFIED_NON_PRODUCTION → UAT_ACCEPTED → PRODUCTION_AUTHORIZED → DEPLOYING → OBSERVING → ACCEPTED`

Exceptional states:

- `BLOCKED_SECURITY`
- `BLOCKED_QUALITY`
- `BLOCKED_OWNER_DECISION`
- `BLOCKED_EXTERNAL_PROVIDER`
- `ROLLED_BACK`
- `FORWARD_FIX_IN_PROGRESS`
- `RELEASE_REJECTED`

## 7. Change classes

| Class | Examples | Minimum gate |
|---|---|---|
| Documentation/planning | zero-based contracts and registers | review + no false closure |
| Low-risk application | copy, bounded UI fix | targeted tests + visual contract |
| Business-rule | state, authority, money, commitment | direct contract/negative/concurrency evidence |
| Data/schema | migration, constraint, retention | rehearsal, backup, rollback/forward plan, explicit approval |
| Integration | credential, webhook, provider adapter | sandbox, failure matrix, DPA/ownership readiness |
| Production emergency | containment or critical repair | incident authority, minimal change, post-review |

## 8. Current result

```text
ENVIRONMENT CLASSES: 5
DEPLOYMENT LIFECYCLE: 10 STEPS
RELEASE STATES: DEFINED
PRODUCTION ENVIRONMENT/ACCESS: NOT AUTHORIZED
CURRENT ENVIRONMENT CONFORMANCE: Z7 REQUIRED
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
