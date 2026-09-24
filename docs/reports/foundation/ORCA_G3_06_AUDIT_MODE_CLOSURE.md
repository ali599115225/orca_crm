# ORCA G3-06 Audit Mode Closure

## Stage record

- **Stage:** G3-06 — Audit Mode
- **Result:** PASS pending CI evidence
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Start SHA:** `b1ac85f13e44384f4958da13771cfd5f517b54a1`
- **Production migration applied:** no
- **Production data changed:** no
- **Production deploy:** no
- **RBAC enforcement enabled:** no

## Implementation

Added:

- `lib/authz/audit-mode.ts`;
- `lib/authz/legacy-audit-guards.ts`;
- `tests/foundation/g3-06-audit-mode.test.ts`;
- `tests/foundation/g3-06-policy-differences.test.ts`;
- `docs/architecture/G3_RBAC_AUDIT_DIFFERENCES.md`.

Updated selected sensitive boundaries:

- `app/api/v1/settings/route.ts`;
- `app/actions/email.ts`;
- `lib/whatsapp/access.ts`.

## Runtime contract

Audit evaluation is disabled unless:

```text
G3_RBAC_AUDIT_MODE=enabled
```

When enabled, the system computes the new RBAC decision and records safe shadow evidence while returning the legacy database-backed decision unchanged.

The evidence includes:

- `wouldAllow`;
- `wouldDeny`;
- `legacyDecision`;
- `newDecision`;
- `reasonCode`;
- difference classification;
- tenant/user identifiers;
- permission and scope identifiers;
- safe source/request identifiers.

It excludes request bodies, message contents, recipient addresses, phone numbers, tokens, credentials, document contents, and arbitrary error details.

## Persistence behavior

The default audit sink emits safe structured evidence only when audit mode is explicitly enabled. Database persistence additionally requires:

```text
G3_RBAC_AUDIT_PERSIST=true
```

Persistence uses `AuthorizationAudit` and is failure-isolated. Resolver failures and audit-sink failures never change the legacy decision and never block the operation in G3-06.

Neither audit flag is enabled in Production by this stage. No AuthorizationAudit row was written by this GitHub workflow.

## Selected integration

- Settings GET compares `settings.read`.
- Settings PUT compares `settings.manage`.
- Email send compares `email.send`.
- Email list/read compares `email.read`.
- WhatsApp connection compares `whatsapp.manage`.
- WhatsApp read compares `whatsapp.read`.
- WhatsApp write/send compares `whatsapp.send`.

These integrations preserve the existing authenticated and database-backed role checks as the effective authority.

## Policy difference inventory

Static comparison of actual legacy role lists against current G3 role blueprints found 15 selected mismatches.

The major classes are:

- SALES_MANAGER / SALES_EMPLOYEE would lose selected settings and communication access;
- MARKETING would gain selected send authority;
- READ_ONLY would gain selected read authority.

The exact matrix is locked by `tests/foundation/g3-06-policy-differences.test.ts` and documented in `docs/architecture/G3_RBAC_AUDIT_DIFFERENCES.md`.

These findings are enforcement blockers, not accepted behavior changes. G3-07 must reconcile them before enabling the affected domains.

## Test coverage

The audit-mode contract verifies:

- disabled mode performs no evaluation;
- matching allow decisions;
- legacy allow / RBAC deny differences;
- legacy deny / RBAC allow differences;
- evaluation error isolation;
- sink failure isolation;
- legacy decision remains effective in all audit cases;
- approved non-sensitive evidence fields only;
- selected sensitive boundary integration;
- exact current policy-difference inventory.

## Rollback

Rollback is a normal revert of the G3-06 commit set. Because audit mode is opt-in and non-enforcing, an immediate operational rollback is also available by removing `G3_RBAC_AUDIT_MODE` or setting it to any value other than `enabled`. No schema or data rollback is required.

## Closure rule

G3-06 closes only after ORCA CI, all G3 contracts, existing regression suites, production build, CodeQL, and Vercel preview/status pass on the PR head, followed by merge into the central branch. G3-07 may not enable enforcement until the documented unexpected grants and denials are resolved.
