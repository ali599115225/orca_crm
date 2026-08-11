# ORCA Z8 — EXEC-010 Scope Freeze

- Package: `EXEC-010 — Documents, privacy, reporting and export controls`
- Date: `2026-08-11`
- Status: `SCOPE FROZEN / IMPLEMENTATION AUTHORIZED INSIDE FINAL ALLOWLIST ONLY`

## Governing owner decisions

`D10-01` through `D10-08` were explicitly approved by the owner on 2026-08-11.

## Frozen outcomes

EXEC-010 SHALL:

1. establish a server-side document trust/evidence boundary that never trusts filename, extension or client MIME alone;
2. preserve immutable content identity and attributable source/actor metadata while allowing mutable display metadata separately;
3. require same-tenant exact-scope authority for governed document access and exports through EXEC-004 `export.execute` / relevant read authority;
4. persist explicit privacy purpose and attributable rights requests, with replay/conflict protection;
5. make retention policy-key driven and configurable, with legal hold blocking expiry/deletion and minimum audit identity preserved;
6. version governed metric definitions with stable metric key, source lineage, timezone/window and immutable historical result attribution;
7. mark unsupported/unapproved KPI definitions as not Release-1 governed truth;
8. centralize export policy decisions, configurable row limits, field allowlists, forbidden secret fields, idempotency/conflict handling and append-only export audit;
9. preserve EXEC-005 through EXEC-009 upstream truth and introduce no parallel RBAC;
10. keep storage/scanner/provider selection, public legal wording, statutory duration selection, provider credentials, Production migration/backfill, deploy and main/central merge outside this package.

## Data strategy

One additive migration may create provider-neutral integrity/evidence tables and database guards. No existing customer records are backfilled or destructively rewritten. Runtime controls operate through a typed internal service/repository boundary.

## Evidence strategy

The approved ledger contains 50 contracts. Behavioral requirements require direct behavior tests; persistence invariants, append-only evidence, tenant guards and replay/concurrency invariants require disposable PostgreSQL evidence where applicable.

## Explicit exclusions

- storage/scanner/OCR vendor selection or activation;
- credentials/secrets;
- live external provider calls;
- public legal/privacy notice wording;
- invented statutory retention periods;
- Production migration/backfill/customer-data mutation;
- Merge to central/main;
- Deploy/Production action;
- EXEC-011 or later implementation.
