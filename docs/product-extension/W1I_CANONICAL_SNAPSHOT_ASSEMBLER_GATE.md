# ORCA W1I — Canonical Snapshot Assembler Gate

Status: FROZEN FOR W1I CANONICAL SNAPSHOT ASSEMBLER IMPLEMENTATION

Base: `e07a6e0bc0b923cd7343547a19bc3f924d91f9d3`

W1I follows the verified W1H Contract Studio approval-command merge. It does not create STEP 15 or reopen STEP 0–14.

## Objective

Introduce one deterministic, server-side, read-only assembler for the persisted facts that will later feed immutable `ContractSnapshot` issuance.

W1I does **not** implement legal-text rendering. It does not define an interpolation grammar for `contentJson`, `dataBindingsJson`, `structureJson`, or `clauseOverridesJson`.

The only caller-controlled assembler identity is:

- `tenantId`
- `draftId`

All snapshot facts are loaded from authoritative persisted ORCA state.

## Canonical source set

For one tenant-owned approved `ContractDraft`, the assembler reads:

1. the approved draft itself, including persisted `contentJson`, `dataBindingsJson`, and `clauseOverridesJson`;
2. the linked `ContractTemplate`;
3. the linked `ContractTemplateVersion`, including `structureJson` and `variableSchemaJson`;
4. all persisted approvals in deterministic request-time / ID order;
5. the linked legacy `Contract`, when present;
6. the contract's existing company-receivable `PaymentPlan`, when present;
7. the contract's linked inventory `Unit` as the persisted property facts, when a contract is linked;
8. the linked `FinanceCase`, when present;
9. the currently selected `FinanceProviderOffer`, when present.

The assembler does not infer a missing Contract from FinanceCase linkage and does not fabricate provider authority state. Because the frozen legacy `Contract -> Unit` and `Contract -> PaymentPlan` relations are ID-linked rather than tenant-composite W1 relations, W1I additionally verifies the nested `Unit.tenantId` and `PaymentPlan.tenantId` against the assembler tenant before those facts may enter a canonical snapshot payload.

## Determinism rules

- Reads execute in one `SERIALIZABLE` Prisma transaction.
- Approval ordering is `requestedAt ASC, id ASC`.
- At most one selected provider offer is accepted; multiple selected offers fail closed.
- Decimal values are serialized as decimal strings, never lossy JavaScript numbers.
- Date/time values are serialized as ISO-8601 strings.
- Canonical outputs carry explicit schema-version markers.
- Existing W1D digest canonicalization remains authoritative for object-key ordering when snapshot issuance is later wired.

## Output boundary

The assembler returns:

- `sourceContentJson` — the approved persisted draft content, untouched and **not rendered**;
- `structuredFacts` — deterministic draft/template/contract/property/finance facts;
- `clauseSnapshot` — persisted template structure plus approved draft clause overrides, without interpreting a template language;
- optional `paymentPlanSnapshot` — the existing ORCA company-receivable payment plan only;
- `approvalSnapshot` — persisted approval decisions/evidence in deterministic order;
- authoritative identity linkage (`tenantId`, `draftId`, `templateVersionId`, optional `contractId`).

## Fail-closed invariants

Assembly fails when:

- tenant or draft identity is missing;
- the draft is not found for the tenant;
- the draft is not `APPROVED`;
- no approvals exist;
- any approval is not `APPROVED`;
- the linked Contract is missing for the tenant;
- Contract and FinanceCase contract linkage conflict;
- the linked legacy Unit belongs to another tenant;
- the linked legacy PaymentPlan belongs to another tenant;
- more than one selected provider offer exists for the FinanceCase.

## Allowed paths

- `lib/domain/contract-finance/canonical-snapshot-assembler.ts`
- `tests/foundation/g8-w1i-canonical-snapshot-assembler.test.ts`
- this gate document

## Explicit exclusions

- no `ContractSnapshot` issuance mutation in W1I;
- no public route/server action/UI;
- no renderer, interpolation engine, PDF generation, signature path, or execution flow;
- no change to `contract-snapshot-service.ts` or W1E application-facade semantics;
- no Prisma schema or migration change;
- no production migration/backfill;
- no Transaction Spine / Contract / PaymentPlan / Installment / Invoice mutation;
- no provider API/network/credential call;
- no environment activation, Vercel deploy, or production action.

## Acceptance

W1I closes only when:

1. the implementation remains within the three-file allowlist;
2. G8 proves caller input cannot provide rendered content or canonical snapshot payloads;
3. G8 proves the persisted source fields exist on the frozen W1 schemas;
4. G8 proves approved-draft, approval, tenant, legacy nested-tenant linkage, selected-provider, deterministic decimal/date, and read-only invariants;
5. the focused W1I test passes;
6. typecheck passes;
7. full ORCA CI through Build passes on one exact head;
8. independent review finds no unresolved Critical/Major issue;
9. no snapshot issuance endpoint, migration, deploy, provider activation, or production action occurs.

A later slice may wire snapshot issuance only after the approved `contentJson` / template structure has a formally frozen rendering contract. Until then, the W1H network deferral remains intact.
