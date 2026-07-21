# ORCA G3 Final Closure

## Final stage record

- **Program:** ORCA Foundation G3
- **Final stage:** G3-10 — Final Verification and Closure
- **Repository result:** PASS — final PR checks complete; central merge pending
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **G3-10 start SHA:** `356305ed44be371c8e13343a2cfce2a26fb73359`
- **Verified PR head SHA:** `54958ad8009246363943bcf12eb1842447f0497e`
- **Observed main baseline:** `f7af072c689178d397019648ab5c21336ab259b6`
- **Production migration applied:** no
- **Production backfill executed:** no
- **Production RBAC flags changed:** no
- **Production deploy performed:** no
- **Production data changed:** no

## Stage ledger

| Stage | Scope | PR | Central merge SHA | Result |
|---|---|---:|---|---|
| G3-01 | Architecture contract | #50 | `223594d48df3d7a67feab6654f8151030c289b23` | PASS / CLOSED |
| G3-02 | Permission inventory | #51 | `99f8232b7f855dccfc2fa231eca891c1821970f4` | PASS / CLOSED |
| G3-03 | Additive organization/RBAC schema | #52 | `72286db443de5c9179ef083aba27d94e63419468` | PASS / CLOSED |
| G3-04 | Idempotent guarded seed/backfill | #53 | `344d2d42cc3024963ff03904f93e4679f3621ed5` | PASS / CLOSED |
| G3-05 | Central authorization layer | #54 | `b1ac85f13e44384f4958da13771cfd5f517b54a1` | PASS / CLOSED |
| G3-06 | Audit-only comparison | #55 | `09d9dfc1b9fe55b51804e34c61a86506406d7c16` | PASS / CLOSED |
| G3-07 | Progressive dual-allow enforcement | #56 | `017eaf1436521bfacc409521f64f2a3b95199c79` | PASS / CLOSED |
| G3-08 | Legacy SaaS disablement | #57 | `1a4eb7b16d2f6e8a3e670e0bd295740bccc6d425` | PASS / CLOSED |
| G3-09 | Constraints and indexes proposal | #58 | `356305ed44be371c8e13343a2cfce2a26fb73359` | PASS / CLOSED |
| G3-10 | Final verification and runbook | #59 | established by final GitHub merge | PASS / READY TO MERGE |

## Delivered architecture

G3 establishes:

- Single-Company Operational Mode while retaining `Tenant` and `tenantId` as the persisted company/security boundary.
- A canonical typed permission registry covering actual ORCA server domains.
- Separate organizational placement and authority models.
- Additive `OrgUnit`, `OrgAssignment`, `AccessPermission`, `AccessRole`, `AccessRolePermission`, `RoleAssignment`, and `AuthorizationAudit` models.
- A guarded, dry-run-default, idempotent backfill plan compatible with the legacy Prisma `Role` enum.
- Central `AccessContext` resolution from verified session identity and current database state.
- Default-deny `authorize()`, `requirePermission()`, and scope matching.
- Audit-only legacy/RBAC comparison with safe evidence.
- Progressive domain-gated enforcement using `legacy_allow AND rbac_allow`.
- Explicit trusted-job authorization for background work.
- Immutable disablement of legacy multi-company SaaS entry points without deleting historical data.
- Review-only same-tenant constraints, concurrent indexes, preflight, validation, and non-destructive rollback SQL.

## Permission and scope outcome

The registry defines stable permission keys, risk classes, descriptions, and allowed scopes. Supported scopes are:

- `TENANT`;
- `BRANCH`;
- `DEPARTMENT`;
- `TEAM`;
- `SELF`;
- `RESOURCE`.

All scopes are subordinate to verified `tenantId`. Resource identifiers, query values, forms, headers, or browser state cannot establish trusted company scope.

## Authorization outcome

Authorization revalidates:

- signed server session identity;
- current user existence and activation;
- current Tenant existence and activation;
- tenant-context equality;
- active and non-expired organization assignments;
- active and non-expired role assignments;
- active roles and permissions;
- allowed scope type;
- tenant and resource scope match.

Unknown permissions, missing assignments, inactive identities, expiry, scope mismatch, cross-tenant access, and contradictory context deny by default.

## Audit and enforcement outcome

G3-06 identified 15 selected policy differences. G3-07 reconciled those differences before enforcement code was accepted.

Enforcement domains remain disabled unless explicitly acknowledged. Production additionally requires a separate Production approval flag. No environment variable was changed by this work.

The approved domains are:

1. users/settings;
2. finance;
3. messaging;
4. sales;
5. trusted jobs.

The new RBAC layer cannot turn a legacy denial into a grant.

## Legacy SaaS outcome

The current platform model disables:

- public company registration;
- self-service trials;
- subscription checkout and change;
- add-on checkout;
- paid agent leasing;
- automatic subscription renewal;
- subscription billing Cron;
- package-limit enforcement;
- upgrade navigation.

Historical Tenant, subscription, billing, payment, and AgentLease structures remain intact for audit, compatibility, and recovery.

## Schema and database outcome

Two reviewable migrations were created:

1. G3-03 additive organization/RBAC schema expansion;
2. G3-09 constraints and indexes proposal.

They were not applied to Production. The G3-09 proposal uses concurrent indexes and `NOT VALID` constraints, with separate read-only preflight, controlled validation, and non-destructive rollback scripts.

The backfill script was not applied to Production or any connected database through this GitHub workflow.

## Untrusted Tenant-input verification

`scripts/g3-final-verification.mjs` scans server boundaries for Tenant/company values read directly from:

- query parameters;
- form data;
- Tenant headers;
- JSON body properties or destructuring.

One explicit Platform Owner target exists in the Sentinel Command Center. It does not establish an operational Tenant context and is accepted only while all safeguards remain present:

- authenticated Platform Owner boundary;
- incident-action restriction;
- UUID validation;
- active Tenant database revalidation;
- incident-only target binding.

Any other direct Tenant/company input is a closure violation.

## CI and build contract

Final closure requires:

- dependency installation;
- Prisma validation and client generation;
- existing Production safety gate;
- G3 final repository verification;
- every `tests/foundation/g3-*.test.ts` contract;
- existing core regressions;
- Sentinel incident, command-center, heartbeat-service, and cron-heartbeat regressions;
- P2 acceptance tests;
- production build;
- CodeQL Actions, Python, and JavaScript/TypeScript analysis;
- Vercel preview/status success only.

## Verified final evidence

The verified PR head `54958ad8009246363943bcf12eb1842447f0497e` passed:

- Prisma schema validation and client generation;
- Production safety gate;
- executable G3 final verification;
- all G3 foundation contracts and selected core regressions;
- all four isolated Sentinel regression gates;
- P2 acceptance;
- production build;
- CodeQL Actions analysis;
- CodeQL Python analysis;
- CodeQL JavaScript/TypeScript analysis;
- Vercel status/preview.

The final documentation-only report update must pass the same required PR checks before merge.

## Release and rollback

The complete isolated rehearsal, rollout, direct-request testing, backup/restore, and rollback sequence is documented in:

`docs/architecture/G3_RELEASE_RUNBOOK.md`

Immediate authorization rollback is removal of enabled G3 domains or the acknowledgement flag. Database constraints and indexes have a non-destructive rollback script. Tables, columns, assignments, audit history, and historical SaaS data are not deleted as a rollback shortcut.

## Residual Production gates

Repository closure does not satisfy these separate Production requirements:

- restorable provider backup or snapshot;
- isolated restore rehearsal;
- application of the G3-03 migration;
- dry-run and isolated application of G3-04 backfill;
- zero-violation G3-09 preflight;
- controlled index/constraint creation and validation;
- staged audit evidence against representative traffic;
- one-domain-at-a-time Production enforcement approval;
- Production deployment approval.

## Closure rule

G3 is repository-closed only when the final PR passes all required checks, merges into the central branch, the foundation branch is fast-forwarded to the final central SHA, both branches compare identical, and `main` remains unchanged. Production activation is explicitly outside this closure.
