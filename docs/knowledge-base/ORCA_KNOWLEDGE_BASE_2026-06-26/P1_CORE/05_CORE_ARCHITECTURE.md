# P1 — النواة الداخلية والمعمارية

## تعريف المنتج

ORCA هو Real Estate Operating System للسوق السعودي، وليس CRM تقليديًا.

## النطاق

- CRM والمبيعات.
- المشاريع والوحدات.
- الجولات والعروض.
- العقود والإيجارات.
- التحصيل والمدفوعات.
- المحاسبة والفوترة.
- ZATCA.
- WhatsApp.
- الذكاء الاصطناعي والأتمتة.
- Revenue Integrity.
- التقارير والـTelemetry.
- بوابات المالك والمستأجر.

## مبادئ معمارية

- Multi-tenant.
- `tenantId` محور العزل.
- Arabic-first.
- RTL افتراضي وLTR للإنجليزية.
- Server-side authorization.
- Domain Events + Audit + Outbox.
- Idempotency.
- Provider-neutral integrations.
- لا ادعاء نجاح خارجي قبل إثبات التنفيذ الفعلي.

## الحالة

النواة متقدمة، لكنها ليست مغلقة نهائيًا بسبب:

- عدم توحيد `main`.
- Migration lineage الناقصة.
- عدم وجود Production proof شامل.
