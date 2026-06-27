# P3 — Route Matrix وبوابات الاختبار

## الهدف

إثبات أن كل Route معتمد موجود ويعمل من `REDC/main`.

## الحد الأدنى للمصفوفة

لكل Route:

- المسار.
- الملف المصدر.
- Auth requirement.
- Role requirement.
- Tenant scope.
- Desktop.
- Mobile.
- Arabic/English.
- Dark/Light.
- Runtime status.
- 404/redirect/error state.
- Evidence.

## مثال حاسم

`/operations/revenue-integrity` أعاد 404 لأن Route غير موجودة في `main`.

## قواعد الاختبار

- لا تكرر Build/Tests على نفس HEAD والنطاق إذا كان الدليل صالحًا.
- نفذ فحصًا واحدًا محدودًا ثم تنفيذًا أوإغلاقًا واحدًا.
- لا تستخدم Build وحده كدليل Route.
- لا تستخدم screenshot وحدها كدليل إذا كان المسار غير ظاهر.
- لا تبدأ Final Trust QA قبل توحيد المصدر والDatabase.
