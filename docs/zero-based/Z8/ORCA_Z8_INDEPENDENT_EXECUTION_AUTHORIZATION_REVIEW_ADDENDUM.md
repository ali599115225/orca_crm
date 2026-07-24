# ORCA Z8 — Independent Execution Authorization Review Addendum

- **Document ID:** ORCA-Z8-AUTH-REVIEW-001
- **Version:** 1.0
- **Date:** 2026-07-25
- **Status:** `FINAL METHOD / NO AUTOMATIC EXECUTION`
- **Base central SHA:** `ce0165d7a2ea6ff10acd9fe72e100555a2b3b325`
- **Main merge authorized:** `false`
- **Production action authorized:** `false`

## 1. Purpose

Harden the transition from the 32 Z7 gaps into bounded execution packages. Z8 closes the planning and authorization framework; it does not begin implementation. The next package starts only after a separate owner instruction identifies its exact package/version and binds it to the then-current central SHA.

## 2. Mandatory controls

### Z8M-001 — Single-use bounded authority

Authority is valid only for one named package/version, repository, base SHA, head branch, allowlist, exclusions, acceptance set and validity window. Completion, rejection, expiry, revocation, scope movement or head movement ends the authority.

### Z8M-002 — Exact source control identity

Each activated package records the exact base branch/SHA, execution branch, expected final head, merge destination and update strategy. Force Push and autonomous merge remain prohibited.

### Z8M-003 — File and surface allowlist

Paths, generated outputs, modules, pages, tabs, overlays, schemas, tables, migrations, fixtures and providers are explicitly listed. Adjacent refactors and new paths are outside scope until an amended package version is approved.

### Z8M-004 — Change budget

Each package limits workstreams, PR count, expected files, migrations and dependencies. Exceeding the budget pauses execution instead of normalizing scope expansion.

### Z8M-005 — Independent sub-authorizations

The following never inherit from a package: merge to `main`; schema migration or data operation; provider/account/credential action; paid commitment; external message/payment/signature/refund/publication; Production deployment or destructive rollback.

### Z8M-006 — Parallel conflict lock

Shared files, schemas, contracts, fixtures, visual surfaces, providers, environments and release branches receive one designated owner or an explicit ordering dependency.

### Z8M-007 — Agent operating contract

Every executing agent receives the package ID/version, exact allowlist, prohibited actions, checkpoints, evidence format and stop conditions. No autonomous scope expansion, merge, migration, data, provider, secret, purchase or Production action is allowed.

### Z8M-008 — Amendment and revocation

Material changes require pause, impact analysis, updated risks/dependencies/evidence, a new version and renewed approval. Revocation preserves the last safe state and evidence.

### Z8M-009 — Evidence identity

Evidence records package/version, commit/PR/workflow run, environment class, test/drill/visual artifact identifiers, reviewer decisions, accepted exceptions and expiry.

### Z8M-010 — Irreversibility rule

Code rollback, feature disable, schema compatibility, data compensation and provider reconciliation are separate. Rollback is not assumed safe when valid data could be lost or a security defect reintroduced.

### Z8M-011 — Progressive validation

Risk-appropriate progression may include isolated tests, Preview, Staging/UAT, feature flags and observation windows. No Production rollout method is selected by this document.

### Z8M-012 — Package closure

Closure requires an exact allowlisted diff, all blocking evidence on the final head, direct closure evidence for target gaps, no new unresolved P0/P1 regression, cleanup of temporary artifacts, reconciliation of data/provider state and registration of residual gaps.

## 3. Review conclusion

```text
REGISTERED PACKAGES: 14
EVIDENCE_READY PACKAGES: 3
OWNER_DECISION_PENDING PACKAGES: 8
DEFERRED/BLOCKED PACKAGES: 3
PACKAGES IN EXECUTION: 0
MAIN MERGE AUTHORIZED: NO
PRODUCTION AUTHORIZED: NO
```

The method is sufficient to close Z8. Starting any package remains a separate instruction after the final Z8 report.
