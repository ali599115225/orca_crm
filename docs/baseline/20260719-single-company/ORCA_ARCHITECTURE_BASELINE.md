# ORCA ARCHITECTURE BASELINE
**Document ID:** ORCA-ARCH-BASE-001
**Version:** 1.0
**Date:** 2026-07-19
**Status:** `CURRENT STATE VERIFIED IN PART / TARGET APPROVED`
## 1. الحالة الحالية
- Next.js App Router مع Server Components وClient Components وServer Actions وRoute Handlers.
- Prisma/PostgreSQL كنموذج بيانات مركزي.
- Vercel للتشغيل وPreview/Production.
- طبقة عزل مركزية تعتمد `tenantId` وسياق Async Local Storage وتفشل مغلقة عند غياب السياق.
- 84 نموذج Prisma؛ 73 منها تحمل `tenantId` مباشرة وفق لقطة الحزمة.
- جدول `Tenant` يحمل هوية منشأة وحقول اشتراك وفوترة وبيانات تكامل قديمة.
- مخطط المستخدم يملك `department` كنص فقط؛ لا توجد نماذج Branch/Team/OrgAssignment مثبتة.
- التكاملات موزعة بين نماذج واتساب وبريد ودفع وإعلانات وZATCA/Webhooks.
## 2. الحكم المعماري
| النطاق | الحكم |
|---|---|
| `tenantId` كحاجز بيانات | `KEEP TEMPORARILY` |
| مفهوم شركات مستأجرة مستقلة | `REMOVE FROM PRODUCT MODEL` |
| اسم Tenant في طبقة الأعمال | `RENAME CONCEPTUALLY TO COMPANY SCOPE` |
| جداول/حقول SaaS | `LEGACY — FREEZE, THEN SIMPLIFY` |
| RBAC الحالي | `PARTIAL / INCONSISTENT` |
| الإدارات والفروع والفرق | `MISSING AS FIRST-CLASS MODEL` |
| Provider adapters | `KEEP AND HARDEN` |
| حسابات إنتاجية للمزودين | `NOT CONFIGURED / OWNER RESPONSIBILITY` |
## 3. المعمارية المستهدفة
```text
Authenticated Internal User
        ↓
Session + Active User Verification
        ↓
Role + Permission + Department/Branch/Team Scope
        ↓
Company Scope Compatibility Boundary (tenantId مؤقتًا)
        ↓
Domain Services
        ↓
Prisma / PostgreSQL
External Providers
        ↓
Provider Adapter + Secret Vault + Connection State
        ↓
Webhook Verification / Outbox / Audit
        ↓
Domain Services
```
## 4. نموذج العزل المستهدف
- `tenantId` لا يمثل عميل SaaS؛ يمثل مؤقتًا نطاق الشركة الواحدة.
- العزل الحقيقي المطلوب: `role`, `permission`, `department`, `branch`, `team`, ownership/assignment.
- لا يُقبل `tenantId` من Client أو Form أو URL لإقرار النطاق.
- Cron/Webhook يستخدمان System Boundary موثقًا ويحددان Company Scope من إعداد موثوق أو من ربط المزود.
## 5. فجوات البيانات التنظيمية
مطلوب تحليل وتصميم قبل Migration لنماذج مثل:
- `Department`
- `Branch`
- `Team`
- `UserOrgAssignment`
- `RolePermission` أو Permission Registry ثابتة مع Assignments
- `ResourceScope` عند الحاجة
لا تُنشأ هذه النماذج قبل اعتماد cardinality وقواعد نقل المستخدمين الحاليين وقيم fallback.
## 6. سياسة التكاملات
- كل تكامل يجب أن يملك Adapter/Interface وحالة اتصال موحدة.
- القيم السرية لا تدخل GitHub أو قاعدة البيانات كنص صريح أو التقارير.
- `NOT_CONFIGURED` نتيجة طبيعية.
- لا يتم Provider call قبل: تحقق المستخدم والدور، التحقق من الإعداد، consent عند الحاجة، rate limit، audit، وبيئة آمنة.
- الاختبارات الافتراضية تستخدم Mock provider؛ Sandbox فقط ببيانات الشركة وموافقتها.
## 7. ترتيب الانتقال الآمن
### المرحلة A — Governance Freeze
تثبيت الوثائق وسجل التعارضات ومنع أي توسع في SaaS أو إدخال تكاملات حقيقية.
### المرحلة B — Compatibility Boundary
إنشاء طبقة تسمية/خدمة تتعامل مع `tenantId` بوصفه `companyScopeId` دون تغيير قاعدة البيانات.
### المرحلة C — Product Surface Cleanup
إيقاف مسار تسجيل المنشآت والباقات والترقيات والإضافات من الواجهة والمسارات العامة مع إبقاء الجداول للرجوع.
### المرحلة D — Internal Organization Model
إضافة نموذج الإدارات والفروع والفرق ومصفوفة الصلاحيات بعد Impact Assessment وMigration آمنة.
### المرحلة E — Integration Ownership Consolidation
إعادة توصيف إعدادات المزود من per-tenant SaaS إلى company-owned configuration، مع الحفاظ على التشفير والتدقيق.
### المرحلة F — Data Simplification
بعد إثبات وجود Company Scope واحدة وعدم وجود بيانات شركات أخرى: تحليل دمج/إعادة تسمية الحقول والجداول. لا حذف تلقائي.
### المرحلة G — Legacy Removal
إزالة بقايا SaaS فقط بعد اختبارات عدم فقد، مراقبة فترة توافق، وخطة Forward-Fix.
## 8. التوافق والتراجع
- كل مرحلة يجب أن تكون additive قبل أن تكون subtractive.
- لا يعاد استخدام أسماء حقول قديمة بمعنى مختلف دون Adapter.
- يتم الاحتفاظ بنسخة بيانات واختبار dry-run قبل Migration.
- التراجع المفضل قبل حذف الأعمدة؛ بعد الحذف يكون المسار Forward-Fix مع restore plan موثق.