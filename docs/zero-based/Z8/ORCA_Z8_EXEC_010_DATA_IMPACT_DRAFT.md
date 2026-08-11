# ORCA Z8 — EXEC-010 Data / Privacy / Threat Impact

- Status: `APPROVED / SCOPE-FREEZE INPUT`
- Package: `EXEC-010`
- Owner decisions: `D10-01 through D10-08 APPROVED`

## Governed data classes

1. Document content identity and metadata: display name, server-detected media type, size, content hash, source, actor, subject/scope and lifecycle state.
2. Privacy-purpose and rights evidence: purpose key, request type, actor/subject mapping, decision, timestamps and retention/legal-hold interaction.
3. Reporting truth: metric key/version, source lineage, window/timezone, definition hash and materialized result identity where applicable.
4. Export evidence: actor, tenant/scope, purpose, selected fields/data class, filter/query digest, format, row/result count and timestamp.

## Threats closed by the frozen implementation

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
- secret/credential leakage into governed exports;
- provider/storage/scanner activation being smuggled into this package.

## Data strategy constraints

- additive integrity/evidence model only;
- no customer-data backfill or Production migration;
- no provider credentials or external scanning/storage calls in tests;
- tenant and exact resource scope preserved in every persisted governed object;
- mutable display metadata cannot overwrite immutable evidence identity;
- retention/legal hold configurable, never hard-coded to an invented legal duration;
- KPI lineage versions definitions rather than rewriting historical truth;
- financial metric materialization uses integer minor-unit semantics.

## Pre-launch deferred items

Public-facing privacy notice wording, statutory retention durations by jurisdiction/data class, external processor/provider contract terms, and human/legal review remain pre-launch gates and are not invented by EXEC-010.
