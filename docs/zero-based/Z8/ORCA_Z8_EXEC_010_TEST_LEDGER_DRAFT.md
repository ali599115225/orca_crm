# ORCA Z8 — EXEC-010 Frozen-Test Candidate Ledger (Draft)

- Status: `PRE-FREEZE DRAFT / OWNER DECISIONS PENDING`
- Package: `EXEC-010`

## A. Document boundary — 12

| ID | Required behavior |
|---|---|
| E10-D01 | Client filename/extension alone never establishes trusted document type. |
| E10-D02 | Client MIME alone never establishes trusted document type. |
| E10-D03 | Allowed-type validation is server-side and deterministic. |
| E10-D04 | Active/executable content fails closed by default. |
| E10-D05 | Path traversal / unsafe filename input cannot escape the governed object boundary. |
| E10-D06 | Same-tenant exact-scope authorization is required for document access. |
| E10-D07 | Wrong-tenant access fails closed. |
| E10-D08 | Wrong-resource/scope access fails closed. |
| E10-D09 | URL/object-id possession does not grant access. |
| E10-D10 | Document evidence retains immutable content hash and attributable actor/source metadata. |
| E10-D11 | Mutable display metadata cannot rewrite immutable evidence identity. |
| E10-D12 | Provider/scanner credentials are not required by EXEC-010 tests/runtime contracts. |

## B. Privacy / retention / legal hold — 11

| ID | Required behavior |
|---|---|
| E10-P01 | Governed personal-data action stores explicit purpose. |
| E10-P02 | Purpose cannot be silently reclassified to bypass policy. |
| E10-P03 | Access/export rights request is attributable and tenant/subject scoped. |
| E10-P04 | Correction request preserves prior evidence/history. |
| E10-P05 | Deletion/expiry request cannot bypass required retention. |
| E10-P06 | Legal hold blocks expiry/deletion. |
| E10-P07 | Retention policy is keyed/configurable; no invented universal duration. |
| E10-P08 | Expiry may remove/redact content while minimum audit identity remains. |
| E10-P09 | Cross-tenant retention/legal-hold mutation fails closed. |
| E10-P10 | Conflicting/replayed privacy-rights mutation is idempotent or fails closed. |
| E10-P11 | Public legal wording/statutory duration is not fabricated by Runtime. |

## C. Reporting / KPI lineage — 10

| ID | Required behavior |
|---|---|
| E10-R01 | Governed metric has stable metric key and definition version. |
| E10-R02 | Metric definition records source lineage. |
| E10-R03 | Metric definition records calculation window/timezone. |
| E10-R04 | Formula change creates a new version rather than rewriting history. |
| E10-R05 | Historical result remains attributable to exact metric-definition version. |
| E10-R06 | Same inputs/version produce deterministic result. |
| E10-R07 | Cross-tenant source substitution fails closed. |
| E10-R08 | Unsupported/unapproved KPI is not presented as Release-1 governed truth. |
| E10-R09 | Numeric aggregation uses appropriate exact/decimal semantics for financial metrics. |
| E10-R10 | Reporting does not overwrite EXEC-005/006/007/008/009 upstream truth. |

## D. Export authorization / audit — 12

| ID | Required behavior |
|---|---|
| E10-E01 | Export is deny-by-default without explicit export authority. |
| E10-E02 | Export requires same-tenant exact scope. |
| E10-E03 | Wrong-tenant export fails closed. |
| E10-E04 | Wrong-resource/scope export fails closed. |
| E10-E05 | Excessive export beyond configured policy fails closed. |
| E10-E06 | Export field set is minimized/allowlisted for the purpose/data class. |
| E10-E07 | Secrets/credentials cannot enter governed export payload. |
| E10-E08 | Authorized export writes attributable audit evidence. |
| E10-E09 | Audit records actor, tenant/scope, purpose, field/data class, query/filter digest, result count, format and time. |
| E10-E10 | Exact replay is idempotent where an export job identity is reused. |
| E10-E11 | Conflicting replay under same identity fails closed. |
| E10-E12 | Export audit/history is append-only or equivalently non-destructive. |

## E. Package boundaries — 5

| ID | Required behavior |
|---|---|
| E10-B01 | EXEC-004 remains the authority source; no parallel RBAC. |
| E10-B02 | EXEC-009 communication/retention truth is not overwritten. |
| E10-B03 | No provider/storage/scanner activation or credentials are introduced. |
| E10-B04 | No Production/customer-data migration or backfill occurs. |
| E10-B05 | No main/central merge, Deploy or Production action is authorized by technical closure alone. |

## Count

Candidate ledger: **50 behavioral contracts**.

PASS requires direct behavior or disposable PostgreSQL evidence appropriate to the requirement. Structural assertions may supplement but not substitute behavioral evidence. Scope Freeze cannot occur until D10-01 through D10-08 are owner-approved.
