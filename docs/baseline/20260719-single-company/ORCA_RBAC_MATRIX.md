# ORCA RBAC MATRIX
**Document ID:** ORCA-RBAC-001
**Version:** 1.0
**Date:** 2026-07-19
**Status:** `CURRENT MATRIX PARTIAL — TARGET REQUIRES OWNER APPROVAL`
## 1. الأدوار المثبتة في Prisma حاليًا
`ADMIN`, `SALES_MANAGER`, `SALES_EMPLOYEE`, `MARKETING`, `READ_ONLY`.
## 2. أدوار مذكورة في الكود لكنها غير مثبتة في Prisma Role Enum
`SUPER_ADMIN`, `PLATFORM_ARCHITECT`, `owner`, `accountant`, `rental_manager`, واسم السياسة `TENANT_ADMIN`.
هذه الأسماء `CONFLICTING` ولا تعتبر أدوارًا قابلة للتعيين في قاعدة البيانات قبل توحيد النموذج.
## 3. مصفوفة الحد الأدنى الحالية
| المجال | ADMIN | SALES_MANAGER | SALES_EMPLOYEE | MARKETING | READ_ONLY |
|---|---:|---:|---:|---:|---:|
| إدارة المستخدمين والأدوار | إدارة | لا | لا | لا | قراءة ممنوعة افتراضيًا |
| العملاء المحتملون | قراءة/كتابة | قراءة/كتابة | قراءة/كتابة محدودة | قراءة حسب الحاجة | قراءة فقط |
| المشاريع والعقارات | إدارة | قراءة/تحديث مقيّد | قراءة/تحديث مقيّد | قراءة | قراءة |
| الجولات والعروض | إدارة | قراءة/كتابة | قراءة/كتابة مقيّدة | قراءة | قراءة فقط |
| العقود والمدفوعات | إدارة | إنشاء/متابعة حسب العقد | متابعة محدودة | لا | قراءة محدودة |
| المحاسبة والمالية | إدارة مؤقتًا | لا افتراضيًا | لا | لا | لا |
| الإعلانات والتسويق | إدارة | قراءة | قراءة محدودة | إدارة | قراءة |
| WhatsApp/Email | إدارة الربط والإرسال | إرسال/إدارة تشغيلية | إرسال/إدارة محدودة | قراءة/حملات حسب السياسة | قراءة فقط |
| إعدادات المزود والأسرار | إدارة فقط | لا | لا | لا | لا |
| التدقيق والمخاطر | قراءة/إدارة | قراءة | لا | لا | قراءة محدودة |
> هذه المصفوفة Baseline محافظة. لا تمنح صلاحية جديدة؛ أي توسيع يحتاج عقدًا واختبارًا.
## 4. الأدوار التنظيمية المستهدفة — مقترحة وليست منفذة
- `COMPANY_OWNER`
- `INTERNAL_ADMIN`
- `SALES_MANAGER`
- `SALES_AGENT`
- `MARKETING_MANAGER` / `MARKETING_USER`
- `FINANCE_MANAGER` / `ACCOUNTANT`
- `RENTAL_MANAGER`
- `OPERATIONS_USER`
- `READ_ONLY`
## 5. نطاقات الوصول المستهدفة
كل قرار صلاحية يجب أن يجمع:
```text
role permission
+ department scope
+ branch scope
+ team scope
+ record ownership/assignment
+ company scope
```
## 6. فجوات P0/P1
1. عدم تطابق Role Enum مع أسماء الأدوار في AuthContext والسياسات.
2. بعض Server Actions تعتمد `getActiveTenant()` دون إعادة التحقق من المستخدم والدور.
3. جلسة طويلة قد تستمر بعد تعطيل المستخدم ما لم يعاد التحقق من DB.
4. لا توجد نماذج Branch/Team، و`department` نص حر فقط.
5. لا توجد Permission Registry موحدة تغطي جميع المجالات.
## 7. قاعدة التنفيذ
لا تعتمد حماية الواجهة. جميع الكتابات والاتصالات الخارجية والتحويلات المالية تحتاج Guard خادميًا واختبار negative path يثبت عدم استدعاء Prisma mutation أو Provider عند الرفض.