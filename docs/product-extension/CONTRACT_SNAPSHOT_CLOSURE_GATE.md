# Contract Snapshot Closure Gate

Status: EXECUTABLE CLOSURE EVIDENCE ONLY

Base exact head: `f22bfb619da2fe5a0cf57a7edf2e57a55012adae`

## Objective

Close the already-built contract snapshot path without adding new product behavior:

`Approved ContractDraft -> W1I canonical assembly -> W1J deterministic render -> W1K immutable ISSUED ContractSnapshot`

This closure is evidence work, not a new feature phase.

## Executable acceptance

The closure test must execute the real W1I/W1J/W1K service stack with a controlled transaction-backed persistence mock and prove all of the following:

1. First issuance creates exactly one `ISSUED` snapshot with deterministic rendered content and a valid SHA-256 digest.
2. Digest verification recomputes from the exact immutable persisted payload.
3. Replaying the same approved facts returns the same snapshot and does not create another row.
4. Changing authoritative facts after issuance produces `W1_SNAPSHOT_ALREADY_ISSUED_DIFFERENT_DIGEST` and never overwrites the existing snapshot.
5. Tenant mismatch fails closed before canonical database reads or persistence.
6. Rendering failure persists nothing; restoring valid facts permits a clean retry.
7. The existing W1K outer SERIALIZABLE transaction remains the only orchestration transaction; this closure adds no runtime transaction or persistence code.

## Frozen scope

Allowed:
- executable closure acceptance test;
- this closure gate document;
- direct test-only reconciliation only if CI proves it is required by the new closure test.

Explicitly excluded:
- no runtime product change;
- no Prisma schema change;
- no migration or backfill;
- no PDF, signature, amendment, Template Studio, or renderer grammar expansion;
- no provider/network/credential activation;
- no Transaction Spine financial writes;
- no RBAC change;
- no deploy or production database action.

## Closure decision

PASS requires the focused executable acceptance plus Fast CI and final Full ORCA CI on one stable exact head.

After PASS, stop. Any next contract-lifecycle capability is a separately gated product phase.
