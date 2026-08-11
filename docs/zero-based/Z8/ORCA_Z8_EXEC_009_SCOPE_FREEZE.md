# ORCA Z8 — EXEC-009 Scope Freeze

- **Package:** `EXEC-009 — Durable workflow and communication truth`
- **Date:** `2026-08-11`
- **Status:** `SCOPE FROZEN / IMPLEMENTATION AUTHORIZED INSIDE FINAL ALLOWLIST ONLY`

## Governing owner decisions

D09-01 through D09-10 are approved and immutable for this package unless the owner explicitly amends them.

## Current-state inventory

The existing Runtime already contains useful fragments, but not the durable aggregate required by EXEC-009:

- `AutomationWorkflow` stores only one mutable row (`triggerEvent`, `actionsJson`, `isActive`) and has no immutable published-version or durable run model.
- `app/api/v1/automation/workflows/route.ts` creates mutable definitions but does not pin version identity or create durable run truth.
- the WhatsApp webhook already has signed-envelope validation, tenant binding, provider-message dedupe, bounded attempts and quarantine/dead-letter-like evidence in `WhatsAppWebhookEvent`;
- the WhatsApp send service already blocks an existing `WhatsAppOptOut` before provider transmission;
- inbound WhatsApp automation currently calls a `findOrCreateWhatsAppLead` path, which can create a Lead solely from sender phone identity. D09-05 prohibits treating that phone identity alone as verified customer identity;
- existing WhatsApp contact/message records are useful channel-specific evidence but do not provide a provider-agnostic thread identity, purpose, consent/retention classification or legal-hold truth.

## Frozen implementation outcome

EXEC-009 will add one additive provider-agnostic workflow/communication integrity layer while reusing existing provider-specific records and EXEC-004 authority. It must:

1. publish immutable workflow definition versions;
2. create durable workflow runs pinned to one exact version;
3. enforce idempotent trigger/replay semantics, timeout-not-success, bounded retry and explicit dead-letter state;
4. require independent exact-scope approval for governed sensitive/final-state actions;
5. create separate escalation truth rather than rewriting failed runs;
6. normalize communication thread identity independently from Party/Lead identity;
7. preserve unknown/ambiguous sender status and prohibit automatic customer creation solely from sender address/phone;
8. enforce purpose-specific marketing consent and opt-out while keeping operational/service purpose separate;
9. preserve append-only consent/event evidence, configurable retention and legal hold;
10. keep provider credentials/activation, Production data, main merge and deployment outside this package.

## Data strategy

Exactly one additive EXEC-009 migration may create new internal integrity tables and guards. No backfill is authorized. Existing WhatsApp/Email tables remain in place and are not destructively rewritten.

## Authority strategy

Approval uses EXEC-004 persisted assignments/evaluator. No new role system, Platform Owner bypass, System Administrator bypass or job-title authority may be introduced.

## Evidence strategy

The frozen Test Ledger contains **50 contracts**. Direct behavior is mandatory for behavior requirements; real PostgreSQL proof is mandatory for immutability, cross-tenant guards, idempotency/concurrency and append-only database constraints where applicable.

## Explicitly excluded

- UI/visual redesign;
- provider account creation or credential changes;
- live WhatsApp/Email/SMS sending during tests;
- Production migration/backfill/customer-data mutation;
- provider activation;
- Vercel Production deploy;
- merge to `main` or central execution branch;
- EXEC-010 or later implementation.
