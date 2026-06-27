# P4 — سجل القرارات الرئيسية

## قرارات المنتج

- ORCA منصة تشغيل عقاري، لا CRM تقليدي.
- السعودية أولًا ثم الخليج.
- Arabic-first.
- Enterprise Navy + Gold.

## قرارات التنفيذ

- لا Build قبل Architecture Gate عندما تكون البنية غير محسومة.
- لا مرحلة جديدة قبل إغلاق الحالية.
- لا إعادة اختبار بلا تغير في HEAD أوالنطاق.
- لا حذف للملفات؛ أرشفة فقط.

## قرارات الدمج

- `REDC/main` هو الهدف النهائي.
- لا تعتبر Worktree مصدرًا نهائيًا.
- Revenue Integrity ما زالت خارج `main`.
- Login المعتمد يجب حمايته أثناء الدمج.

## قرارات البيانات

- لا Migration writes على القاعدة الحالية حتى تصميم الـBaseline.
- Fresh database proof قبل Repair للقاعدة الحالية.
- لا `db push` كبديل عن migration lineage.

## قرارات الجودة

- Build لا يساوي Closed.
- Coming Soon لا يغلق الصفحات العامة.
- Color Contrast غير مغلق ما دامت المخالفات موجودة.
- Final QA محجوب حتى الدمج والـBaseline.
