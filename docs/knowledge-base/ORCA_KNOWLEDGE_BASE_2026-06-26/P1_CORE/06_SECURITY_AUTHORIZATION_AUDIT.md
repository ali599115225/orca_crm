# P1 — الأمن والصلاحيات والتدقيق

## الحالة المثبتة

- Authorization + Event/Audit في فرع التكامل: مغلقة برمجيًا.
- اختبارات محفوظة: `26/26 PASS`.

## القواعد

- لا تعتمد على إخفاء عناصر الواجهة.
- التحقق داخل Server Actions وAPI routes.
- تحقق من Tenant ownership لكل كيان.
- امنع Cross-tenant references.
- Cron endpoints محمية بـSecret/Bearer.
- الأحداث الحساسة يجب أن تحتوي:
  - correlation ID
  - causation ID
  - idempotency key
  - before/after عند الحاجة
- Outbox لا يُعتبر External success قبل تأكيد Provider.

## الأدوار المذكورة

- ADMIN
- SALES_MANAGER
- SALES_EMPLOYEE
- أدوار وصلاحيات Revenue Integrity المتخصصة.

## المتبقي

- إثبات نفس الحماية بعد الدمج إلى `main`.
- تشغيل الاختبارات على المصدر الموحّد بعد إغلاق الدمج.
- مراجعة Production secrets والسياسات قبل الإطلاق.
