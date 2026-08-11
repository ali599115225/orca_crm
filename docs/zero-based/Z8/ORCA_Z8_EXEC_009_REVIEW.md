# ORCA Z8 — EXEC-009 Implementation Evidence Review

## Status

`IMPLEMENTATION IN PROGRESS / 50 OF 50 FROZEN LEDGER ITEMS MAPPED / FINAL GATES PENDING`

Human/independent review that requires manual human review is intentionally deferred to the pre-launch review gate. This document reconciles executable evidence only.

## Evidence sources

- `lib/workflow-communication/contracts.ts`
- `lib/workflow-communication/service.ts`
- `lib/workflow-communication/sql-repository.ts`
- `app/api/v1/automation/workflows/route.ts`
- `app/api/whatsapp/webhook/route.ts`
- `lib/whatsapp/send-service.ts`
- `prisma/migrations/20260811050000_exec_009_workflow_communication_truth/migration.sql`
- `tests/foundation/g5-exec-009-workflow-communication.test.ts`
- `tests/foundation/g5-exec-009-schema-contract.test.ts`
- `tests/foundation/g5-exec-009-postgres-contract.test.ts`
- `scripts/exec-009-postgres-integrity.mjs`
- `.github/workflows/exec-009-migration-validation.yml`

## Frozen-ledger reconciliation

### Workflow definition and run truth — 13 mapped

| ID | Status | Evidence |
|---|---|---|
| E9-W01 | PASS-CANDIDATE | `publishWorkflowVersion` creates immutable version 1; PostgreSQL immutability trigger. |
| E9-W02 | PASS-CANDIDATE | changed definition creates version N+1 while prior row remains immutable. |
| E9-W03 | PASS-CANDIDATE | run persists exact `workflow_version_id`. |
| E9-W04 | PASS-CANDIDATE | direct test edits workflow after run creation and verifies pinned version remains unchanged. |
| E9-W05 | PASS-CANDIDATE | same idempotency key/payload replays one run. |
| E9-W06 | PASS-CANDIDATE | conflicting idempotency payload denied. |
| E9-W07 | PASS-CANDIDATE | unique tenant/idempotency hash + concurrency proof bounds duplicate trigger truth. |
| E9-W08 | PASS-CANDIDATE | service and PostgreSQL reject timeout-to-success. |
| E9-W09 | PASS-CANDIDATE | bounded retry budget and retry scheduling direct test. |
| E9-W10 | PASS-CANDIDATE | non-retriable failure becomes terminal FAILED without blind retry. |
| E9-W11 | PASS-CANDIDATE | exhausted retriable failure becomes DEAD_LETTER. |
| E9-W12 | PASS-CANDIDATE | append-only attempt evidence + retained terminal error/state. |
| E9-W13 | PASS-CANDIDATE | PostgreSQL concurrent idempotency-key race allows one persisted semantic run. |

### Approval and escalation — 10 mapped

| ID | Status | Evidence |
|---|---|---|
| E9-A01 | PASS-CANDIDATE | governed version stores explicit approval permission/resource; approval invokes EXEC-004 evaluator. |
| E9-A02 | PASS-CANDIDATE | empty/self initiator cannot approve; DB requires requested actor identity. |
| E9-A03 | PASS-CANDIDATE | service self-approval denial + DB check. |
| E9-A04 | PASS-CANDIDATE | tenant-scoped lookup makes wrong-tenant approver unable to resolve run. |
| E9-A05 | PASS-CANDIDATE | wrong branch, expired and missing assignments fail via EXEC-004. |
| E9-A06 | PASS-CANDIDATE | independent exact-scope GENERAL_MANAGER approval succeeds for `discount.approve`. |
| E9-A07 | PASS-CANDIDATE | same approved actor replay returns persisted approval state. |
| E9-A08 | PASS-CANDIDATE | another/non-matching approval after state transition fails closed. |
| E9-A09 | PASS-CANDIDATE | DEAD_LETTER creates separate escalation record. |
| E9-A10 | PASS-CANDIDATE | failed/dead-letter run remains terminal and cannot be rewritten to success. |

### Communication identity and thread truth — 10 mapped

| ID | Status | Evidence |
|---|---|---|
| E9-C01 | PASS-CANDIDATE | tenant+channel+provider identity hash required; existing webhook also carries Meta message identity. |
| E9-C02 | PASS-CANDIDATE | exact provider identity replay returns one event; DB uniqueness and concurrency proof. |
| E9-C03 | PASS-CANDIDATE | same provider identity with conflicting content/thread is denied. |
| E9-C04 | PASS-CANDIDATE | newly observed sender thread is `UNKNOWN`, `partyId=null`; no customer identity is asserted by EXEC-009. |
| E9-C05 | PASS-CANDIDATE | multiple candidate party identities produce `AMBIGUOUS`, `partyId=null`. |
| E9-C06 | PASS-CANDIDATE | exactly one candidate produces attributable tenant-scoped verified party binding. |
| E9-C07 | PASS-CANDIDATE | thread ID/identity hash exist independently from optional party identity. |
| E9-C08 | PASS-CANDIDATE | cross-tenant event/thread linkage rejected by DB trigger. |
| E9-C09 | PASS-CANDIDATE | channel, direction, purpose and provider identity are explicit event fields. |
| E9-C10 | PASS-CANDIDATE | existing WhatsApp send persists provider-accepted send as `pending`, not delivered/success evidence. |

### Consent, opt-out, retention and legal hold — 9 mapped

| ID | Status | Evidence |
|---|---|---|
| E9-P01 | PASS-CANDIDATE | generic marketing send gate requires latest `OPTED_IN`. |
| E9-P02 | PASS-CANDIDATE | latest `OPTED_OUT` blocks marketing; existing WhatsApp service also blocks `WhatsAppOptOut`. |
| E9-P03 | PASS-CANDIDATE | OPERATIONAL/SERVICE purpose remains distinct and cannot satisfy MARKETING consent. |
| E9-P04 | PASS-CANDIDATE | consent evidence is append-only in PostgreSQL. |
| E9-P05 | PASS-CANDIDATE | opt-out replay is idempotent; silent opt-in after opt-out is denied. |
| E9-P06 | PASS-CANDIDATE | retention policy key/until are configurable and have no invented universal DB default. |
| E9-P07 | PASS-CANDIDATE | legal hold makes content ineligible for expiry. |
| E9-P08 | PASS-CANDIDATE | expiry decision is content-level while event provider/hash metadata remains append-only. |
| E9-P09 | PASS-CANDIDATE | cross-tenant retention lookup/mutation fails closed. |

### Boundary and regression — 8 mapped

| ID | Status | Evidence |
|---|---|---|
| E9-B01 | PASS-CANDIDATE | approval consumes sealed `evaluateOrganizationAuthority`; no parallel RBAC. |
| E9-B02 | PASS-CANDIDATE | communication thread party binding is optional and never writes Party/Lead identity from EXEC-009 service. |
| E9-B03 | PASS-CANDIDATE | no mutation of EXEC-006 commitment/reservation truth. |
| E9-B04 | PASS-CANDIDATE | no mutation of EXEC-007 offer/version truth. |
| E9-B05 | PASS-CANDIDATE | no mutation of EXEC-008 contract/payment truth. |
| E9-B06 | PASS-CANDIDATE | tests use no provider credentials/account activation; provider-specific existing paths remain separate evidence. |
| E9-B07 | PASS-CANDIDATE | one additive disposable migration; no backfill/customer-data action. |
| E9-B08 | PASS-CANDIDATE | package records explicitly deny central/main merge, deploy and Production action. |

## Totals before final gate

- Frozen ledger: **50 / 50 mapped**
- PASS-CANDIDATE: **50**
- Final PASS: **0 until exact-head validation succeeds**

## Final closure gate

Technical closure requires the same final HEAD to pass:

- ORCA CI;
- EXEC-009 Migration Validation on disposable PostgreSQL 16;
- repository governance lint;
- TypeScript;
- focused EXEC-009 direct tests;
- PostgreSQL immutability/scope/concurrency evidence;
- relevant EXEC-004/005/006/007 regressions;
- production dependency audit;
- Build.

No human review, central/main merge, provider activation, deploy, Production migration, backfill or customer-data action is authorized by this review.
