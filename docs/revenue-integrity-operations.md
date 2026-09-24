# ORCA CRM — Revenue Integrity Operations

## Scope

This package closes the remaining architectural foundation for:

1. Revenue Leak Radar.
2. Conversation-to-Action with human approval.
3. Production Saudi Trust Gates.
4. Central authorization, domain events, audit trail, and transactional outbox.
5. Predictive intelligence with data-readiness gates.

The implementation does not fabricate external-provider success. A provider remains
`NOT_CONFIGURED`, `PENDING`, or `ERROR` until real tenant credentials pass a live
connection test.

## Required environment variables

```text
DATABASE_URL=
CRON_SECRET=
ORCA_REVENUE_MASTER_KEY=
```

`ORCA_REVENUE_MASTER_KEY` must be at least 32 characters. A 64-character hex value
or a base64-encoded 32-byte value is preferred.

Optional external event delivery:

```text
REVENUE_EVENT_SINK_URL=
REVENUE_EVENT_SINK_SECRET=
```

Optional proof controls:

```text
REVENUE_PROOF_TENANT_ID=
REVENUE_MODEL_MINIMUM_ROWS=30
```

## Operational routes

- Command center: `/operations/revenue-integrity`
- Integrations: `/operations/settings?tab=integrations`
- Provider webhook:
  `/api/revenue-integrity/webhook/{PROVIDER}?connectionId={CONNECTION_ID}`
- Scheduled evaluation: `/api/cron/revenue-integrity`

The cron endpoint requires:

```http
Authorization: Bearer <CRON_SECRET>
```

## Radar rules

The engine evaluates the following rules when the required source tables and
columns exist:

- `LEAD_UNASSIGNED`
- `FIRST_RESPONSE_BREACH`
- `NO_NEXT_ACTION`
- `TOUR_WITHOUT_OUTCOME`
- `POSITIVE_TOUR_NO_OFFER`
- `ACCEPTED_OFFER_NO_CONTRACT`
- `SIGNED_CONTRACT_NO_INVOICE`
- `OVERDUE_INVOICE`
- `INVENTORY_CONFLICT`
- `COMPLIANCE_BLOCK`

Rules whose source capability is unavailable are recorded as skipped; they are
never reported as passed.

## Conversation-to-Action

Conversation analysis persists:

- source and source hash;
- extracted entities;
- intent;
- suggested action;
- confidence and rationale;
- approval or rejection actor and reason;
- execution result.

Financial or contractual effects are never executed automatically. Tour and offer
creation require a human approval action and pass through the existing Transaction
Spine.

## Trust Gates

Supported providers:

- ZATCA
- Ejar
- Paylink
- N-Genius
- Resend
- External digital signature provider

Credentials are encrypted using AES-256-GCM and are never returned to client
components. Saving credentials sets the status to `PENDING`; only a successful
live test changes the status to `CONNECTED`.

Webhook processing requires:

- an active tested connection;
- a configured webhook secret;
- HMAC-SHA256 signature verification;
- tenant-scoped deduplication;
- persisted payload hash and status.

## Predictive intelligence

The model lifecycle is intentionally strict:

- versioned dataset snapshot;
- deterministic feature schema;
- minimum labeled-row threshold;
- both `WON` and `LOST` classes;
- train/validation metrics;
- versioned model artifact;
- active-model scoring only;
- confidence and feature-contribution explanation;
- drift score and status;
- `NOT_READY` instead of fabricated predictions when data is insufficient.

## Closure gates

A deployment is not closed until all of the following pass:

```powershell
npx prisma validate
npx prisma generate
npx tsc --noEmit --pretty false
git diff --check
npm run build
npx prisma migrate deploy
npx --no-install tsx scripts/revenue-integrity-proof.ts
```

External providers are operationally closed individually only after real production
credentials and live tests succeed.
