# P0 B5 — Tenant Isolation

## Scope
إثبات منع القراءة والتحديث والحذف عبر حدود المستأجر.

## Implementation Evidence
- tenantId الموثوق مشتق من الجلسة.
- تعارض route/query/body tenantId يُرفض.
- قراءة Lease تخفي موارد المستأجر الآخر.
- تحديث Task مقيد بـ `id + tenantId`.
- حذف Document مقيد بـ `id + tenantId`.

## Test Evidence
- `tests/tenant-isolation.test.ts`: 11 PASS
- `tests/p0-tenant-route-isolation.test.ts`: 5 PASS
- Full suite: 627/627 PASS

## Result
**PASS**

## Residual Risks
عزل المستأجر ما زال موزعاً داخل عدد من Routes؛ توحيده معمارياً خارج نطاق P0.

## Commits
- `63cf565`
- `c53837c`