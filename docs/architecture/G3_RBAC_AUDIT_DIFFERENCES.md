# G3 RBAC Audit Difference Register

- **Stage:** G3-06 — Audit Mode
- **Status:** Active closure evidence
- **Legacy decision:** remains authoritative in G3-06
- **RBAC decision:** shadow-only

## Purpose

This register records concrete differences between current database-backed legacy role guards and the G3 role blueprints before enforcement. A difference is not silently accepted and does not automatically become a new grant or denial.

The executable source is `tests/foundation/g3-06-policy-differences.test.ts`.

## Selected policy comparison

| Permission | Legacy policy | Current RBAC blueprint | Difference requiring G3-07 resolution |
|---|---|---|---|
| `settings.read` | ADMIN, SALES_MANAGER, SALES_EMPLOYEE | ADMIN, READ_ONLY | SALES_MANAGER and SALES_EMPLOYEE would lose access; READ_ONLY would gain access. |
| `settings.manage` | ADMIN | ADMIN | Aligned. |
| `email.read` | ADMIN, SALES_MANAGER, SALES_EMPLOYEE | ADMIN, MARKETING, READ_ONLY | Sales roles would lose access; MARKETING and READ_ONLY would gain access. |
| `email.send` | ADMIN, SALES_MANAGER, SALES_EMPLOYEE | ADMIN, MARKETING | Sales roles would lose access; MARKETING would gain access. |
| `whatsapp.read` | all five legacy roles | ADMIN, MARKETING, READ_ONLY | SALES_MANAGER and SALES_EMPLOYEE would lose access. |
| `whatsapp.send` | ADMIN, SALES_MANAGER, SALES_EMPLOYEE | ADMIN, MARKETING | Sales roles would lose access; MARKETING would gain access. |

The exact 15 role/permission mismatches are asserted by the executable test. Any change to these policies must update the register and test intentionally.

## Security interpretation

The current role blueprints cannot be enforced as-is because they contain both categories of unsafe drift:

1. **Unexpected denial:** current users could lose established operational access.
2. **Unexpected grant:** MARKETING or READ_ONLY could receive authority not present in the current guard.

G3-07 must resolve the differences before enabling a domain:

- preserve current legitimate sales communication access;
- avoid broad READ_ONLY grants caused by granting every permission classified as READ;
- do not grant MARKETING email or WhatsApp sending authority merely because a resource was included in a broad role filter;
- keep settings management ADMIN-only;
- decide settings read access explicitly rather than inheriting it from a generic risk class.

## Audit-only contract

When `G3_RBAC_AUDIT_MODE=enabled`:

- the legacy database-backed decision remains the effective decision;
- RBAC produces `wouldAllow` / `wouldDeny` evidence;
- evidence includes `legacyDecision`, `newDecision`, `reasonCode`, and difference class;
- evaluation or sink failure does not change the legacy result;
- no request body, email address, phone number, token, credential, message content, or document content is recorded.

Database persistence is separately gated by `G3_RBAC_AUDIT_PERSIST=true`. Without it, safe structured console evidence is used. This stage does not enable either flag in Production.

## Enforcement blocker

No selected domain may switch to RBAC enforcement while an unresolved unexpected grant exists. Unexpected denials must also be resolved or formally accepted with an operational migration plan before enforcement.
