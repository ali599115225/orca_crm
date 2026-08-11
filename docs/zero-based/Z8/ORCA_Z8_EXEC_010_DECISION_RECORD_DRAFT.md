# ORCA Z8 — EXEC-010 Owner Decision Record

- Package: `EXEC-010 — Documents, privacy, reporting and export controls`
- Status: `APPROVED / OWNER DECISIONS CLOSED`
- Date: `2026-08-11`
- Owner approval: `APPROVED — EXEC-010 D10-01 THROUGH D10-08`

## D10-01 — Document trust boundary / OWN-C01
Uploaded or generated documents are untrusted evidence until server-side validation succeeds. Client MIME type, file extension, filename and user-supplied metadata are never sufficient trust evidence. Executable/active-content formats are denied by default. Storage/scanner/provider selection remains outside EXEC-010.

## D10-02 — Document access and export authority
Document read/download/export requires same-tenant exact-scope authorization using the existing organization authority model. No job-title, Platform Owner, System Administrator, URL possession or object-id possession bypass is introduced.

## D10-03 — Privacy purpose and rights
Every governed personal-data operation carries an explicit purpose. Release-1 rights supported by the internal control layer are access/export, correction request, deletion/expiry request subject to retention/legal hold, and consent/objection evidence where applicable. Legal interpretation and public privacy notice wording remain a pre-launch legal/compliance review item.

## D10-04 — Retention and legal hold
Retention is policy-key driven and configurable by data/document class. No universal invented duration is hard-coded. Legal hold blocks expiry/deletion. Expiry removes or redacts content only to the extent permitted while preserving minimum audit/lineage evidence required for traceability.

## D10-05 — Reporting metric lineage
Every Release-1 KPI used as governed reporting truth has a stable metric key, version, source lineage, calculation window/timezone, and deterministic definition. A changed formula creates a new metric definition version; historical report results remain attributable to the definition version used.

## D10-06 — Release-1 KPI baseline
EXEC-010 governs integrity/lineage infrastructure and the KPI definitions already present in repository reporting surfaces. It must not invent commercial targets or management thresholds. Any KPI without an existing deterministic source definition is marked `UNAPPROVED/NOT RELEASE-1 TRUTH` until separately approved.

## D10-07 — Export minimization and limits
Exports are deny-by-default, tenant/scope-bound, field-minimized and purpose-bound. Excessive exports are rejected by a configurable policy limit rather than an invented universal row count. Authorized exports record actor, tenant, scope, purpose, fields/data class, query/filter digest, result count, export format and timestamp; raw credentials/secrets are never exported.

## D10-08 — Provider/storage/scanner separation
No cloud storage account, antivirus/DLP scanner, OCR vendor, external reporting service, credentials, provider activation, Production migration/backfill or customer-data action is authorized by EXEC-010. Provider selection and activation remain separate decisions/packages.
