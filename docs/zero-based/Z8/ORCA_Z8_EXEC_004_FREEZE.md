# ORCA Z8 — EXEC-004 Scope Freeze

- **Package:** `EXEC-004`
- **Title:** Single-company scope and organization authority
- **Base central branch:** `work/orca-zero-based-execution-20260721`
- **Base central SHA:** `6a24e57d75f17550fe0fd5755889aef9a5cacdc9`
- **Implementation branch:** `work/orca-exec-004-single-company-authority-20260726`
- **State:** `IN_EXECUTION / SCOPE_FROZEN`
- **Main authorization:** `FALSE`
- **Production authorization:** `FALSE`
- **Migration execution authorization:** `FALSE`
- **Customer-data authorization:** `FALSE`
- **Provider or credential authorization:** `FALSE`

## Frozen outcome

Retire reachable legacy multi-company SaaS product behavior while retaining `tenantId` as the internal singleton company security partition, then add the approved organization hierarchy and a deny-by-default authority foundation:

```text
Company
→ Branch
→ Department
→ Team
→ User Scope Assignment
```

The package separates:

```text
Job Title
≠ Security Role
≠ Scope Assignment
```

## Owner decisions bound to this package

- One customer company.
- One commercial tenant.
- One or more operational branches.
- Central departments may operate across branches only through an explicit company-scope assignment.
- Branch membership alone does not grant access to all branch data.
- Assigned-resource scope is supported.
- Service lines are modular and enabled per branch.
- `DENY BY DEFAULT`.
- No cross-branch access without an explicit matching assignment.
- A technical system administrator has no automatic financial or contractual authority.
- Refund and discount approvals require explicit initiator evidence and must not be self-approved.
- Sensitive organization changes are attributable and append-only audited.
- External integrations remain customer-owned and disabled or not configured by default.

## Allowed paths

```text
app/actions/agentSlots.ts
app/api/v1/agents/route.ts
lib/organization/authority.ts
lib/organization/contracts.ts
lib/organization/service.ts
lib/organization/sql-repository.ts
prisma/migrations/20260726043000_exec_004_organization_authority/migration.sql
tests/dedicated-agent-slots.test.ts
tests/foundation/g5-exec-004-organization-authority.test.ts
tests/foundation/g5-exec-004-organization-service.test.ts
tests/foundation/g5-exec-004-saas-retirement.test.ts
tests/foundation/g5-exec-004-schema-contract.test.ts
docs/zero-based/Z8/ORCA_Z8_EXEC_004_FREEZE.md
docs/zero-based/Z8/ORCA_Z8_EXEC_004_DECISION_RECORD.md
docs/zero-based/Z8/ORCA_Z8_EXEC_004_DATA_IMPACT.md
```

No other file is authorized in the implementation candidate. Registry and roadmap reconciliation are intentionally reserved for a separate closure reconciliation after the implementation PR is independently reviewed and merged.

## Acceptance

1. Public registration, subscription changes, checkout, add-ons, leasing, billing cron, package limits and upgrade navigation remain unreachable.
2. Agent slots and the agents API no longer read, enforce or expose stored commercial `subscriptionPlan` limits as live authority.
3. Every authority decision starts denied and requires:
   - matching tenant partition;
   - active user assignment;
   - explicit security-role permission;
   - exact company/branch/department/team/resource scope;
   - enabled branch service when applicable;
   - separation-of-duties evidence.
4. Approval requests fail closed when initiator evidence is absent or identifies the approver.
5. Cross-tenant, cross-branch, forged-revocation and invalid-delegation negative tests pass.
6. System administrator and Platform Owner do not receive automatic financial write authority.
7. The migration is additive, has no backfill, and is not executed against any database in this package.
8. Database triggers reject cross-tenant hierarchy, user, manager, assignment and audit relationships.
9. Targeted tests, applicable G5/G8 gates, TypeScript, Build and production dependency audit pass on the final reviewed head.
10. Exact diff contains only the allowlist above.
11. `main`, Production, customer data, live providers and secrets remain untouched.

## Vercel policy

`SKIP_BY_DEFAULT` while CI, TypeScript, Build, direct tests and diff review prove the package. At most one stable-head Preview may be used only if a Runtime behavior remains unprovable without it. No Preview is triggered for documentation reconciliation.
