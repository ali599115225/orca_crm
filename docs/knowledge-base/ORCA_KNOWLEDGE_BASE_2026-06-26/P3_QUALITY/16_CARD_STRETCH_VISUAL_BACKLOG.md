# P3 — Card Stretch والملاحظات البصرية الصغيرة

## الحالة

`IN PROGRESS`

## المشكلة

- Cards تتمدد بحسب أطول عنصر.
- Empty states ضخمة.
- مساحات فارغة غير مفيدة.
- جداول أوCards لا تحافظ على ارتفاع منطقي.

## المواقع المتأثرة

- Rental.
- Contracts.
- Settings.
- Billing.
- بعض صفحات Units/Projects.
- Tasks empty state.

## قواعد الإصلاح

- الارتفاع حسب المحتوى.
- لا Full-height بلا معنى.
- افصل Card عن Grid stretch.
- استخدم min-height فقط عند حاجة.
- Pagination بدل قوائم طويلة داخل Card.
- Empty state مصمم وقابل للفعل.
- تحقق Mobile.

## ملاحظات واجهة صغيرة محفوظة

- شعار ORCA يجب أن يحتوي أيقونة مميزة.
- لا تعرض أسماء العروض كـUUID.
- مهام اليوم تحتاج Empty State كامل.
- المساحات الكبيرة في الوحدات والمشاريع تحتاج محتوى أوPlaceholder مصمم.
- Status badges واضحة.
- Sidebar hierarchy متسقة.
- Dropdowns في Dark mode تحتاج وضوحًا.
