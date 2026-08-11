# ORCA Z8 — EXEC-008 Owner Decision Record

- **Decision ID:** `ORCA-DR-EXEC-008-001`
- **Date:** `2026-08-11`
- **Package:** `EXEC-008 — Contract and financial integrity spine`
- **Base central SHA:** `38f69a10359641fc94f902a372f7f6f21bfc3424`
- **Status:** `OWNER DECISION GATE CLOSED / IMPLEMENTATION AUTHORITY GRANTED`

## Context

EXEC-008 is the next eligible package after EXEC-001 through EXEC-007 were closed and reconciled. The package required an exact scope freeze, final allowlist and test ledger against the current central baseline before implementation.

The governing package targets `GAP-Z7-009`, `GAP-Z7-010` and `GAP-Z7-030` and requires closure of the contract/signatory and financial precision/correction owner decisions before implementation can be considered.

## Approved owner decisions

### 1. Immutable contract/template version

A contract may become effective only from an exact, fixed template/version identity. Once issued, that version is immutable. Any subsequent business change must create an explicit amendment or new version; silent in-place mutation of an issued contractual truth is prohibited.

### 2. Explicit signatory and activation authority

Signing and activation require explicit security authority on the exact persisted scope. Job title, descriptive persona, platform ownership or system-administration status do not imply contract-signing or activation authority. Missing, expired, forged, cross-tenant or wrong-scope authority fails closed.

### 3. Exact money and append-only correction

Every monetary obligation and transaction must carry an explicit currency and deterministic fixed precision. Completed financial truth is not overwritten in place. Correction is represented by an attributable reversal, correction or compensating entry that preserves the original evidence and reconciles the resulting balance.

### 4. Refund separation of duties

Where approval is required, the actor who initiates or requests a refund may not approve the same refund. Missing initiator evidence, self-approval or unprovable approver authority fails closed. Existing conservative EXEC-004 finance-role defaults remain a lower-bound security constraint and are not expanded by this decision.

### 5. Verified payment evidence

Creating a payment link, receiving an unverified callback or observing a client-side success state does not by itself establish completed payment. Payment completion must be backed by persisted, attributable and reconcilable evidence sufficient to bind the payment to the exact tenant, obligation, amount, currency and provider/reference identity where applicable.

Provider activation, credentials and Production payment processing remain separate later authorizations.

### 6. Idempotent activation, payment and refund commands

Replaying the same governed command with the same idempotency key and equivalent payload must not create duplicate contracts, obligations, payments, allocations, refunds or corrections. Reuse of the same key with a conflicting payload must fail deterministically.

## Owner clarification — initial governed contract template

On `2026-08-11`, the owner explicitly approved the initial governed template identity:

- **Template key:** `ORCA_CONTRACT_V1`
- **Template version:** `1`
- **Authority:** owner-approved EXEC-008 implementation input
- **Meaning:** a fixed system snapshot of the current contract shape and issuance semantics produced by the Transaction Spine; it is not a newly authored legal instrument or provider/regulatory certification.
- **Immutability:** once persisted for a tenant, the exact version-1 template content/hash is immutable.
- **Evolution:** any future contract-template change must create a new explicit template version and must not mutate `ORCA_CONTRACT_V1` version `1` in place.
- **Issuance binding:** contracts issued by the governed `issueContract` path must bind to the exact persisted `ORCA_CONTRACT_V1` version `1` identity and immutable content hash.

This clarification does not authorize introducing legal clauses that are not already represented by the current Transaction Spine contract truth.

## Decision-key closure mapping

For EXEC-008 governance, the owner approvals above close the package decision intent as follows:

- `OWN-A06` — exact template/version and explicit signatory/activation authority, including the owner-approved `ORCA_CONTRACT_V1` version `1` identity.
- `OWN-A07` — finance/refund/payment-evidence authority and separation of duties.
- `Z2R-006` — exact money precision, append-only correction/reversal, reconciliation and idempotent financial commands.

This mapping is package-governance scope only. It does not claim regulatory certification, provider approval or Production authority.

## Security invariants

- Deny by default.
- Same tenant security partition and exact persisted resource scope are mandatory.
- No job-title-derived authority.
- No Platform Owner or System Administrator implicit contract/finance authority.
- Issued contract versions are immutable.
- Completed money records are not destructively rewritten.
- Refund self-approval is denied.
- Missing initiator, signatory or payment evidence fails closed.
- Replay and conflicting idempotency reuse fail safely.
- Existing EXEC-003 authorization boundaries and EXEC-004 scoped authority are consumed, not replaced.
- EXEC-006 commitment truth and EXEC-007 exact offer-version acceptance truth remain authoritative upstream inputs.

## Explicitly not authorized

This decision record does **not** authorize:

- backfill or customer-data action;
- provider account or credential activation;
- payment-provider transaction execution;
- Vercel or Production deployment;
- Production migration execution;
- `main` merge;
- EXEC-009 or later package implementation.

## Current implementation boundary

EXEC-008 implementation authority is active only inside the approved Final Allowlist and Test Ledger. Any newly required path outside that allowlist still requires a separate governed scope amendment before modification.
