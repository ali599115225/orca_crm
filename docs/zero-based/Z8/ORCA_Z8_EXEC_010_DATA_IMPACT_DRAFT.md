# ORCA Z8 — EXEC-010 Data / Privacy / Threat Impact (Draft)

- Status: `PRE-FREEZE DRAFT / OWNER DECISIONS PENDING`
- Package: `EXEC-010`

## Governed data classes

1. Document content and metadata: filename/display name, media type, size, hashes, source, actor, subject/scope and lifecycle state.
2. Privacy-purpose and rights evidence: purpose key, request type, actor/subject mapping, decision, timestamps and retention/legal-hold interaction.
3. Reporting truth: metric key/version, source lineage, window/timezone, definition hash and materialized result identity where applicable.
4. Export evidence: actor, tenant/scope, purpose, selected fields/data class, filter/query digest, format, row/result count and timestamp.

## Threats to close before technical acceptance

- spoofed extension/MIME and malicious active content;
- filename/path traversal and metadata injection;
- cross-tenant or wrong-scope document access;
- object-ID/URL possession treated as authorization;
- destructive retention that erases required audit evidence;
- legal hold bypass;
- privacy-purpose laundering or silent purpose reclassification;
- stale or silently changed KPI formula;
- report values without source/version lineage;
- excessive export, over-broad fields or unauthorized data classes;
- export replay/conflict without attributable audit;
- secret/credential leakage into documents/reports/exports;
- provider/storage/scanner activation being smuggled into this package.

## Data strategy constraints

- additive integrity/evidence model only unless a direct defect proves a narrower correction is required;
- no customer-data backfill;
- no Production migration;
- no provider credentials or external scanning/storage calls in tests;
- tenant and exact resource scope must be preserved in every persisted object;
- mutable user-facing metadata must not overwrite immutable evidence identity;
- retention and legal hold must remain configurable, not hard-coded to an invented legal duration;
- KPI lineage must version definitions rather than rewriting historical truth.

## Pre-launch deferred items

Public-facing privacy notice wording, statutory retention durations by jurisdiction/data class, external processor/provider contract terms, and human/legal review remain pre-launch gates and are not invented by EXEC-010.
