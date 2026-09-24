# P0 — قواعد منع النشر والتغييرات الخطرة

## لا نشر نهائي قبل

- اكتمال Safe Main Integration.
- إغلاق Historical Baseline.
- إثبات Migration chain على قاعدة فارغة.
- Route Matrix من `main`.
- إغلاق Color Contrast المطلوب.
- إغلاق Accessibility الأساسي.
- Final Pre-Launch Trust QA.

## لا تعتبر دليل إغلاق

- نجاح Build وحده.
- وجود الكود في Worktree.
- تقرير وكيل دون Commit/Route/Runtime evidence.
- صفحة ظهرت في لقطة غير مطابقة للمسار المقصود.
- نجاح اختبار داخل فرع غير مدمج.
- Shield مثل Coming Soon بدل الصفحة الأصلية.

## أوامر محظورة دون بوابة صريحة

- `migrate reset`
- `db push`
- `migrate resolve`
- SQL مدمر.
- حذف Worktree/Stash.
- حذف تقارير وZIP وSQL.
- تعديل `.env.production` لاختبار مؤقت.
- استخدام قاعدة `.env.local` الحالية كتجربة Migration destructive.

## قاعدة Neon للاختبارات

- استخدم Branch/Database معزولة وفارغة.
- استخدم Direct connection string.
- لا تحفظ الرابط في Git.
- لا ترسل أسرار الاتصال في التقارير.
