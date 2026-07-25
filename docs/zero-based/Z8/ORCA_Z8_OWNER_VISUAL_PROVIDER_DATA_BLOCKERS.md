# ORCA Z8 — Owner, Visual, Provider, and Data Blockers

- **Document ID:** ORCA-Z8-BLOCKERS-001
- **Version:** 1.0
- **Date:** 2026-07-25
- **Status:** `FINAL BLOCKER REGISTER`

## 1. Policy

A blocker is not waived because implementation appears straightforward. Safe defaults remain active until the named evidence or decision exists. Silence, a historical behavior, an agent recommendation or a proposed value is not approval.

## 2. Owner decisions blocking domain packages

| Decision | Affected packages | Safe default |
|---|---|---|
| exact licensed activities and Release-1 scope | EXEC-004, EXEC-012 | no unsupported or regulated activity |
| legal entity, branches, departments, teams and personas | EXEC-004 and all scoped-authority consumers | reference model only; no invented assignment |
| customer identity, merge survivorship/reversal, purpose and consent | EXEC-005 | no irreversible merge or unsupported processing |
| commitment types, priority, duration, extension and acceptance/reservation atomicity | EXEC-006, EXEC-007 | no false secured state; conflicting commitment is blocked |
| offer, price and approval limits | EXEC-007 | no unsupported approval/finalization |
| contract templates, signatories and amendment authority | EXEC-008 | no official-template or authority claim |
| money precision, rounding, correction, write-off, refund and evidence authority | EXEC-008 | exact decimal handling; no mutable issued truth or self-approval |
| workflow approval, timeout, cancellation and in-flight version policy | EXEC-009 | bounded safe failure; no implicit migration of active runs |
| privacy notices, rights, retention, legal hold and export policy | EXEC-005, EXEC-009, EXEC-010 | minimize and preserve; no irreversible deletion or broad export |
| KPI definitions and restatement authority | EXEC-010 | no readiness or executive metric claim |
| AI permitted uses and data classes | EXEC-012 | disabled/assistive only; no irreversible action |
| RTO, RPO, MTPD, SLO, capacity, browsers and support hours | EXEC-013 | measure first; no promise |
| UAT users/signers, training, handover, warranty and accepted residual risks | EXEC-013 | release/handover incomplete |
| exact `main`, migration/data and Production decisions | EXEC-014 | all false |

## 3. Visual blockers

EXEC-011 is governed by:

1. one page, tab or overlay per visual contract;
2. an owner-approved complete reference for that exact item;
3. stable functional content and states before visual implementation;
4. no modification of adjacent unapproved tabs or global tokens;
5. independent two-pass verification: structure/layout, then detail/states/accessibility;
6. Light/Dark, RTL, responsive, empty/loading/error/success, forms, drawers/modals, keyboard and focus evidence;
7. reapproval when the reference or functional contract materially changes.

The existing ORCA identity is a comparison baseline, not automatic approval of all current surfaces. Z3 reported zero owner-approved item-level target references at planning closure.

## 4. Provider and account blockers

No provider package may activate until it records:

- company-owned account and recovery ownership;
- contract, DPA/subprocessors and processing/storage locations where applicable;
- purpose and exchanged data classes;
- environment separation and company-controlled credentials;
- pricing, quotas, spend caps and billing owner;
- signatures/webhook identity, replay, timeout and unknown-outcome behavior;
- reconciliation, portability/export and exit procedure;
- outage/`NOT_CONFIGURED` fallback;
- provider-specific tests and operational runbook.

This applies to hosting, database, object storage/scanning, email, WhatsApp/SMS, payment, signature, maps, advertising, monitoring/security and AI services.

## 5. Schema, migration, and data blockers

A Runtime package does not authorize schema or data changes. Before any such action:

- bind the exact schema/migration/data operation and environment;
- provide a restorable isolated recovery point;
- prove backward compatibility or define the forward-only boundary;
- classify affected records, constraints, indexes, jobs, providers and documents;
- prepare dry run, counts, invariants, reconciliation and stop thresholds;
- prohibit Production data use unless separately authorized;
- define correction/compensation when rollback cannot safely reverse data;
- preserve audit and business evidence.

G3 Foundation migration controls are reusable evidence, but they do not prove application to Production data.

## 6. External action blockers

Sending messages, charging/refunding, signing, publishing listings/ads, deleting records/files, rotating credentials, buying/upgrading services or changing DNS/domain/Production configuration each require a separate exact action authorization. A successful non-production code package grants none of these.

## 7. Blocker result

```text
OWNER/REFERENCE CONDITIONAL PACKAGES: 8
EXTERNALLY DEFERRED PACKAGES: 3
PROVIDER ACCOUNTS AUTHORIZED BY Z8: 0
MIGRATIONS/DATA OPERATIONS AUTHORIZED BY Z8: 0
ITEM-LEVEL VISUAL REFERENCES APPROVED BY Z8: 0
MAIN/PRODUCTION AUTHORIZATIONS: 0
```

## Final Vercel-capacity and execution-state reconciliation — 2026-07-25

- PR `#99` / `a82bcc937a8f69196b96f742801fe20f2eecaf99` is superseded and closed without merge after the historical Vercel build-rate-limit rejection.
- PR `#102` is historical only; its failed Vercel status is not reused as final evidence.
- Reconciliation base is current zero-based central `b0369b50eb2d49001e5322eea90b3b6dae22a882`.
- EXEC-003 v2 PR `#108` / `abc43ab5e1a76b5f2d99f5deb0f5d1e35451a618` is independently reviewed, merged at `b0369b50eb2d49001e5322eea90b3b6dae22a882`, and closed.
- Registered packages: `14`; Z7 gap coverage: `32/32`; packages in execution: `0`.
- The old quota blocker is recorded as elapsed; fresh ORCA CI and Vercel are required on this new non-empty final head.
- `main`, Production, data, Prisma/Migrations, providers, secrets, accounts and purchases remain unauthorized.

