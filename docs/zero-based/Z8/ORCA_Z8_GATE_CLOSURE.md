# ORCA Z8 — Execution Authorization Gate Closure

- **Document ID:** ORCA-Z8-CLOSURE-001
- **Version:** 1.2
- **Date:** 2026-07-25
- **Status:** `PASS / CLOSED IN PLANNING / VERCEL_HOBBY_POLICY_ACTIVE`
- **Base central SHA:** `ce0165d7a2ea6ff10acd9fe72e100555a2b3b325`
- **Pull request:** `#102`
- **Predecessor:** Z7 / PR #96 / Head `d9ed2dbab36fa916ac25c822cab0b3f1b00ec5b4`
- **Main merge authorized:** `false`
- **Production action authorized:** `false`

## 1. Gate objective

Convert the evidence-backed Z7 gap register into one authoritative, prioritized and safety-bounded execution package system, while separating planning closure from implementation, central integration, `main`, schema/data/provider actions and Production release.

## 2. Inputs accepted

- Z0 governance and applicability closure;
- Z1 business discovery and Release-1 planning baseline;
- Z2 domain contracts and independent requirements;
- Z3 product-experience and visual-reference rules;
- Z4 data, integration, authorization and architecture contracts;
- Z5 security, quality, supply-chain and test-evidence contracts;
- Z6 operations, continuity, recovery, UAT and handover contracts;
- Z7 current-system inventory, 32 classified gaps, dispositions, traceability, blockers and critical path;
- post-Z7 central baseline `ce0165d7a2ea6ff10acd9fe72e100555a2b3b325`.

## 3. Outputs

| Output | Result |
|---|---|
| Execution authorization schema | complete |
| Independent authorization review controls | 12 mandatory controls retained |
| Execution package registry | 14 packages |
| Z7 gap coverage | 32/32; no orphan gap |
| Prioritized roadmap | Waves 0–3 and critical path defined |
| Acceptance/recovery/conflict contract | complete |
| Owner/visual/provider/data blocker register | complete |
| `main` and Production separation | explicit and deny-by-default |
| Vercel Hobby validation policy | active and scope-aware |

## 4. Package decision

```text
REGISTERED PACKAGES: 14
CLOSED PACKAGES: 1
EVIDENCE_READY FOR NEXT OWNER INSTRUCTION: 2
OWNER_DECISION_PENDING: 8
DEFERRED/BLOCKED: 3
PACKAGES IN EXECUTION: 0
AUTOMATIC NEXT PACKAGE: NONE
```

`EXEC-001` closed through PR #104. `EXEC-002` and `EXEC-003` remain ready for controlled non-production execution. No package begins automatically.

## 5. Unresolved facts preserved without invention

Z8 does not decide:

- licensed activities, company structure, final personas or Release-1 inclusions;
- customer merge, commitment, offer acceptance or financial correction policies;
- official templates, signatories, financial/refund/export authority;
- privacy/retention/legal-hold/KPI definitions;
- item-level visual references;
- providers, accounts, credentials, locations, budgets or paid services;
- AI allowed uses and data classes;
- performance/capacity/browser targets, RTO/RPO/MTPD/SLO or support hours;
- UAT/training/handover signers or accepted residual risks;
- any `main`, migration/data, provider/credential or Production action.

Each remains linked to a package with a safe default and explicit trigger.

## 6. Documentation and planning merge rule

Z0–Z8 planning and documentation changes use:

```text
VERCEL_VALIDATION = NOT_REQUIRED
```

Their merge gate is the exact allowlisted diff, valid JSON/Markdown, relevant targeted checks, GitHub CI and the expected head SHA. Vercel success is not a condition for merging documentation-only changes to the zero-based central branch.

## 7. Vercel Hobby validation policy

This version supersedes every earlier statement requiring Preview for each PR, commit, push, file or small correction.

1. Z0–Z8 planning and documentation: `NOT_REQUIRED`.
2. Execution packages during incremental work: `SKIP_BY_DEFAULT`.
3. Daily evidence: targeted tests, TypeScript where applicable, GitHub CI, diff review, and scope-appropriate security/contract checks.
4. No Preview is created after each file, commit, push or small repair.
5. A completed Runtime/UI package may use `REQUIRED_AT_PACKAGE_END` only after all changes are complete, package tests and build pass, and the candidate SHA is stable.
6. Maximum one package-end Preview when visual or operational validation is materially necessary.
7. One final Preview is `REQUIRED_AT_FINAL_RELEASE` on the definitive Release Candidate after all intended repair packages are complete.
8. An automatic GitHub-triggered Vercel attempt is non-blocking when the package value does not require it.
9. No Push is repeated solely to rerun Preview, and a CI-provable package does not wait for Hobby quota renewal.
10. A quota-limited non-required attempt is recorded as `VERCEL_VALIDATION = DEFERRED_TO_FINAL_EXECUTABLE_HEAD`.
11. Production deployment is always `SEPARATE_PRODUCTION_AUTHORIZATION`.

No paid upgrade, credential creation, account change, `main` merge or Production action is authorized by this policy.

## 8. Closure interpretation

- Z0–Z8 are closed as planning, governance and execution-authorization gates;
- the zero-based plan is complete;
- the system is not declared fully conformant or Production-ready;
- the 14-package registry is the approved source for controlled execution;
- one package closure never authorizes the next package;
- the final Release Candidate still requires one final Preview;
- Production remains separately prohibited until explicit owner authorization.

## 9. Gate decision

```text
Z8 TEXT AND PACKAGE CONTRACTS: PASS
Z8 PLANNING CLOSURE: PASS
Z0-Z8 DOCUMENTATION VERCEL: NOT_REQUIRED
EXECUTION PACKAGE DEFAULT: SKIP_BY_DEFAULT
PACKAGE-END PREVIEW: MAXIMUM ONE WHEN REQUIRED
FINAL RELEASE PREVIEW: REQUIRED_AT_FINAL_RELEASE
PRODUCTION DEPLOYMENT: SEPARATE_PRODUCTION_AUTHORIZATION
RUNTIME CHANGE IN THIS POLICY UPDATE: NONE
DATABASE CHANGE: NONE
MAIN MERGE: NOT AUTHORIZED
PRODUCTION ACTION: NOT AUTHORIZED
```

## Final Vercel-capacity and execution-state reconciliation — 2026-07-25

- PR `#99` / `a82bcc937a8f69196b96f742801fe20f2eecaf99` is superseded and closed without merge after the historical Vercel build-rate-limit rejection.
- PR `#102` is historical only; its failed Vercel status is not reused as final evidence.
- Reconciliation base is current zero-based central `b0369b50eb2d49001e5322eea90b3b6dae22a882`.
- EXEC-003 v2 PR `#108` / `abc43ab5e1a76b5f2d99f5deb0f5d1e35451a618` is independently reviewed, merged at `b0369b50eb2d49001e5322eea90b3b6dae22a882`, and closed.
- Registered packages: `14`; Z7 gap coverage: `32/32`; packages in execution: `0`.
- The old quota blocker is recorded as elapsed; fresh ORCA CI and Vercel are required on this new non-empty final head.
- `main`, Production, data, Prisma/Migrations, providers, secrets, accounts and purchases remain unauthorized.

