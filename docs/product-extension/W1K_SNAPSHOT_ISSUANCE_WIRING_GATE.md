# ORCA W1K — Canonical Snapshot Issuance Wiring Gate

Status: DRAFT IMPLEMENTATION GATE — NOT PUBLISHED

Base: `2a4394595beebff07c233740e22163e67bfbe0ac`

W1K is the smallest integration slice after W1I and W1J. It does not reopen earlier W1 gates and does not add a new template language.

## Objective

Wire the already-approved deterministic components into one authoritative issuance command:

`Approved ContractDraft -> W1I canonical assembly -> W1J deterministic render -> immutable ISSUED ContractSnapshot`

All authoritative reads, deterministic rendering inputs, digest inputs, and immutable persistence belong to one Prisma `SERIALIZABLE` transaction.

## Network command

`POST /api/v1/contract-finance/contract-drafts/[id]/snapshots/issue`

The command:

- uses the existing Contract Studio command gate;
- requires the existing `contract-studio.snapshot-issue` permission;
- keeps that permission ADMIN-only;
- accepts the draft UUID only from the route path;
- rejects every non-empty request body;
- derives tenant and actor identity from W1E authorization/context;
- returns `Cache-Control: no-store`.

The caller cannot supply `tenantId`, `contractId`, `templateVersionId`, `renderedContent`, `structuredFacts`, `clauseSnapshot`, `paymentPlanSnapshot`, `approvalSnapshot`, `digest`, `snapshotType`, `signedAt`, or `createdBy`.

## Atomic authority boundary

W1K opens exactly one Prisma `SERIALIZABLE` transaction and passes the same transaction client through:

1. `assembleCanonicalContractSnapshotWithTx`;
2. `renderCanonicalContract`;
3. `persistCanonicalIssuedSnapshotWithTx`.

The public W1I assembler remains available as a compatibility wrapper that opens its own `SERIALIZABLE` transaction for legacy/internal callers. The legacy W1D snapshot issuer remains available and keeps deriving approval evidence from the database for its existing contract.

The canonical W1K path never calls either legacy transaction-owning wrapper from inside its transaction.

## Approval evidence

The canonical digest and persisted `approvalSnapshot` use the exact W1I approval evidence assembled from the database in the same transaction. W1I preserves deterministic ordering by `requestedAt ASC, id ASC`.

No request payload or W1E facade input may provide approval evidence.

## Determinism and idempotency

- W1J renders only the W1I canonical assembly.
- `computeContractSnapshotDigest` remains the digest authority.
- Snapshot type is fixed to `ISSUED`.
- `signedAt` remains `null` in this slice.
- Existing `(tenantId, draftId, snapshotType)` uniqueness remains authoritative.
- A repeated issuance with the same canonical digest returns the existing snapshot.
- A repeated issuance with a different digest fails with `W1_SNAPSHOT_ALREADY_ISSUED_DIFFERENT_DIGEST`.
- A `P2002` race may return an existing snapshot only when its digest exactly matches the attempted canonical digest.
- No snapshot update, delete, or upsert path is introduced.

## Failure behavior

W1I assembly errors, W1J rendering errors, W1D integrity errors, or persistence failures abort the transaction. No partial snapshot may be written.

Tenant mismatch, unapproved drafts, incomplete approvals, invalid canonical rendering input, and changed facts after issuance fail closed.

## Allowed W1K surface

- `lib/domain/contract-finance/canonical-snapshot-assembler.ts`
- `lib/domain/contract-finance/contract-snapshot-service.ts`
- `lib/domain/contract-finance/contract-snapshot-issuance-service.ts`
- `lib/domain/contract-finance/application-facade.ts`
- `app/api/v1/contract-finance/contract-drafts/[id]/snapshots/issue/route.ts`
- `tests/foundation/g8-w1e-contract-finance-facade.test.ts`
- `tests/foundation/g8-w1h-contract-commands.test.ts`
- `tests/foundation/g8-w1k-snapshot-issuance-wiring.test.ts`
- this gate document.

## Explicit exclusions

- no Prisma schema change;
- no migration or backfill;
- no template authoring or renderer grammar expansion;
- no PDF generation;
- no signature, execution, amendment, or signed-copy flow;
- no provider/network/credential activation;
- no Transaction Spine invoice/installment/payment-plan writes;
- no new role or permission;
- no Vercel deploy or production action.

## Acceptance

W1K is merge-ready only when one exact source head proves:

1. the same Prisma transaction client is used for W1I assembly and W1D persistence;
2. the orchestration owns exactly one `SERIALIZABLE` transaction and does not nest W1I/W1D public transactions;
3. W1J renders the W1I canonical assembly inside that transaction;
4. W1I same-transaction `approvalSnapshot` is the approval representation used for digest and persistence;
5. the network command accepts only path `draftId` and an empty body;
6. tenant/user authority is derived through W1E and snapshot issuance remains ADMIN-only;
7. same digest returns the existing ISSUED snapshot;
8. different digest fails closed without overwrite;
9. P2002 race behavior preserves digest equality semantics;
10. no snapshot mutation method (`update`, `updateMany`, `delete`, `deleteMany`, `upsert`) is added;
11. focused W1B/W1E/W1H/W1I/W1J/W1K tests pass;
12. repository typecheck passes;
13. full ORCA CI through Build and G6 recovery passes;
14. independent exact-head review has no unresolved Critical/Major issue;
15. no migration, deploy, provider activation, or production action occurs.
