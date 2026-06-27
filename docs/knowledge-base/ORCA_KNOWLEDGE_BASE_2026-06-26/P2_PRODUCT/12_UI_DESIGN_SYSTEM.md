# P2 — UI Design System وShared Primitives

## الهوية

- Arabic-first.
- RTL افتراضي.
- English جاهزة.
- Navy داكن.
- Gold محدود.
- Enterprise.
- تقليل Teal التقليدي.
- لا تقليد مباشر لمنتجات أخرى؛ استخرج المبادئ فقط.

## Shared UI Primitives

الحالة: Architecture Gate مغلق.

المسار الإلزامي:

`Architecture Gate → Shared Primitives → Pilot Migration → Production Verify → Rollout`

## Pilot

- Commit: `65ffd74`
- شمل Rental contracts وLeads opportunities.
- Helpers:
  - formatters
  - status cells
  - display IDs
- Pilot مغلق.
- Rollout الكامل غير مغلق.

## Display Foundation

- `displayPerson`
- `displayGeo`
- `displayEntity`
- `displayEnum`
- `displayRevenueIntegrityValue`

## قواعد العرض

- لا UUID كامل.
- استخدم Ref قصيرًا.
- لا Raw enums.
- Status badges مفهومة.
- Empty states مصممة.
- Pagination بدل Scroll-only.
