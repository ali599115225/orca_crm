# ORCA W1H — Guarded Contract Studio Approval Commands Gate

Status: FROZEN FOR W1H CONTRACT APPROVAL COMMAND IMPLEMENTATION

Base: `6c2b50e8696c5d5057e1c2ef854ea165fc238242`

W1H-Contract follows the verified W1H-Finance merge. It does not create STEP 15 or reopen STEP 0–14.

## Objective

Expose only the existing governed Contract Studio **approval** commands through the verified W1E facade, without creating a second approval engine, document compiler, document lifecycle, signature path, or Transaction Spine write path.

W1H-Contract exposes only:

- request a ContractDraft approval;
- decide one pending ContractApproval;
- finalize a ContractDraft after all approvals are approved.

Approved ContractSnapshot issuance is deliberately **not** exposed over HTTP in this slice. The current W1D snapshot service accepts rendered content and structured snapshot inputs from its caller. Until ORCA has a verified deterministic Contract Compiler / canonical-facts assembler, a network route must not allow a client to become the source of truth for an immutable issued artifact.

Signature/execution, snapshot issuance, signed-copy handling, amendments, PDF rendering, provider/government integrations, and Transaction Spine contract signing remain outside this slice.

## Triple fail-closed activation

Every W1H-Contract approval route is hidden unless all three server-only conditions are true:

- `ORCA_CONTRACT_FINANCE_API_ENABLED=true`
- `ORCA_CONTRACT_FINANCE_SCHEMA_READY=true`
- `ORCA_CONTRACT_STUDIO_COMMANDS_ENABLED=true`

The Contract Studio command flag is checked before delegating to the W1G base request boundary. W1H-Contract does not set any of these variables in repository, GitHub, Vercel, or production configuration.

## Authorization boundary

- W1H-Contract performs no database role lookup itself.
- W1E remains the first W1 database-backed authorization boundary and revalidates the current live role inside tenant context.
- Existing W1E permission mappings remain unchanged.
- Approval request inherits the existing Contract Author mapping (`ADMIN`, `SALES_MANAGER`, `SALES_EMPLOYEE`).
- Approval decision and final approval inherit the existing Contract Approver mapping (`ADMIN` only).
- No Legal/Finance role is invented in this slice.
- No super-admin/platform-owner bypass is introduced.
- `tenantId`, caller role, `requestedBy`, `decidedBy`, `approvedBy`, `createdBy`, `contractId`, `approvalSnapshot`, `snapshotType`, `signedAt`, path-owned `draftId`, or path-owned `approvalId` may not be supplied by request payloads.

## Command routes

- `POST /api/v1/contract-finance/contract-drafts/:id/approvals`
- `POST /api/v1/contract-finance/contract-approvals/:approvalId/decision`
- `POST /api/v1/contract-finance/contract-drafts/:id/finalize-approval`

Routes call only these W1E facade operations:

- `w1eRequestContractApproval`
- `w1eDecideContractApproval`
- `w1eFinalizeContractDraftApproval`

No route imports Prisma or the ContractDraft write service directly.

## Input integrity

- Draft and approval path IDs must be UUID-shaped before W1E.
- Approval request requires a non-empty `riskTier`; optional reason/evidence remain business evidence only.
- Approval decision accepts only `APPROVED` or `REJECTED`; optional reason/evidence remain business evidence only.
- Finalization rejects every non-empty request body; W1D verifies persisted approvals and draft state.
- Approval request/decision bodies reject caller-controlled identity, linkage, approval-snapshot, issued-state, and path-owned fields.

## Approval semantics

W1H-Contract does not claim universal request idempotency.

- Approval request may intentionally create multiple pending approvals for one draft/risk workflow; W1D remains authoritative for allowed draft state.
- Approval decision is single-state: only a `PENDING` approval on an `APPROVAL_PENDING` draft may be decided.
- A rejection moves the draft to `REJECTED` under W1D.
- Finalization succeeds only when the draft is `APPROVAL_PENDING`, at least one approval exists, and every approval is `APPROVED`.

## Snapshot issuance deferral

The internal W1D snapshot service remains available only behind the W1E application boundary; W1H-Contract does not expose it as a network command.

A future snapshot-issuance slice must first prove a deterministic server-side compiler/assembler that obtains contract text, structured facts, clause versions, payment-plan facts, approvals, and contract linkage from authoritative persisted sources. The HTTP caller must not be able to choose rendered legal content or canonical financial facts for the issued artifact.

This deferral preserves the invariant that immutable legal artifacts are compiled from canonical ORCA state rather than becoming a parallel financial/document source of truth.

## G4/G5 inventory reconciliation

Three guarded route files legitimately add three API contracts. W1H-Contract does not modify G4/G5 scanners, normalization/reconciliation logic, priority logic, authentication detection, or runtime-risk logic.

The W1H-Contract G8 test must reference all three routes directly. Generated-current executable baselines are reconciled only for deterministic totals:

- total G4 contracts: `371 -> 374`;
- total API routes / API auth evidence entries: `137 -> 140`;
- unproven contracts remain `33`;
- no P0 security-critical, P1 mutation, or P1 sensitive-read contract may remain unproven;
- `AUTH_EVIDENCE_NOT_DETECTED` remains zero;
- malformed contracts, duplicate contract IDs, and invalid permission keys remain zero.

Durable historical architecture markdown counts are not rewritten in this slice.

## Allowed paths

- `lib/domain/contract-finance/contract-command-boundary.ts`
- `app/api/v1/contract-finance/contract-drafts/[id]/approvals/route.ts`
- `app/api/v1/contract-finance/contract-approvals/[approvalId]/decision/route.ts`
- `app/api/v1/contract-finance/contract-drafts/[id]/finalize-approval/route.ts`
- `tests/foundation/g8-w1h-contract-commands.test.ts`
- `tests/foundation/g4-page-operational-contracts.test.ts` — generated current inventory/API totals only
- `tests/foundation/g5-security-quality.test.ts` — generated current inventory/API totals only
- this gate document

## Explicit exclusions

- no ContractSnapshot network issue endpoint until a canonical server-side compiler/assembler is verified;
- no Prisma schema/migration change or production migration/backfill;
- no environment activation or Vercel deploy;
- no provider API/network/credential call;
- no PDF renderer/signature/execution endpoint;
- no signed-contract mutation or amendment endpoint;
- no Contract/PaymentPlan/Invoice/Installment/Journal Transaction Spine mutation;
- no role remapping or new Legal/Finance role;
- no G4/G5 scanner/control weakening;
- no UI.

## Closure

W1H-Contract closes only when the PR remains within the eight-file allowlist; G4/G5/G8 direct evidence covers all three new approval routes; triple fail-closed gating, W1E-only routing, caller-system-field exclusion, empty-body finalization, approval-state delegation, and snapshot-network deferral are proven; generated inventory has zero missing auth evidence and zero unproven P0/P1 surfaces; full ORCA CI through Build passes on one exact head; independent review finds no Critical/Major issue; and no production migration/deploy/provider activation occurs.
