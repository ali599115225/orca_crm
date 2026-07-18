# ORCA SINGLE-COMPANY TRANSITION IMPACT ASSESSMENT
**Document ID:** ORCA-IMPACT-001
**Version:** 1.0
**Date:** 2026-07-19
**Status:** `ANALYSIS ONLY — NO MIGRATION AUTHORIZED`
## 1. الاعتماد الحالي على tenantId
- 73 نموذجًا تحمل `tenantId` مباشرة في لقطة Prisma.
- Server Actions وAPIs وCron/Webhooks وAudit وProvider models تعتمد عليه.
- طبقة Prisma تفشل مغلقة عند غياب Tenant Context.
- حذفه المباشر سيؤثر على العلاقات والفهارس والـunique constraints والاختبارات وعمليات النظام.
## 2. ما يمكن الإبقاء عليه
- `tenantId` كCompany Scope مؤقت.
- التشفير وسجلات التدقيق ونماذج Webhook/dedupe/outbox.
- Provider adapters وحالات الاتصال.
- RBAC server guards الحالية بعد توحيدها.
- أغلب نماذج المجال العقاري والمالي.
## 3. ما يحتاج إعادة تسمية
- Tenant → Company Scope/Company Profile في طبقة الأعمال والواجهة.
- Tenant Admin → Internal Admin.
- Tenant provider config → Company integration config.
- Tenant isolation → Company scope + internal organization isolation.
## 4. ما يحتاج تبسيطًا
- subdomain/wildcard resolution.
- subscription/billing/plan limits.
- Platform owner/customer licensing logic.
- per-tenant onboarding and demo seeding.
## 5. ما أصبح خارج النطاق
- تسجيل شركات جديدة.
- باقات SaaS وترقيات وإضافات.
- فواتير اشتراك المنصة للشركات.
- تشغيل مزودين ببيانات المطور.
## 6. Data Migration Plan — قبل التنفيذ
1. جرد Production لعدد Tenant rows دون عرض PII.
2. counts لكل نموذج حسب tenantId.
3. orphan checks لجميع العلاقات.
4. إثبات Company Scope المعتمدة.
5. backup قابل للاستعادة.
6. dry-run على نسخة بيانات مع checksums.
7. Migration additive أولًا.
8. فترة dual-read/compatibility عند إعادة التسمية.
9. مراقبة ومقارنة counts.
10. حذف لاحق فقط بعد فترة ثبات وموافقة مستقلة.
## 7. Backward Compatibility Plan
- إبقاء أسماء DB الحالية.
- إضافة service-level alias `companyScopeId` دون كسر signatures الداخلية دفعة واحدة.
- دعم قراءة الحقول القديمة أثناء الانتقال.
- منع إنشاء Tenant ثانية دون حذف الجدول.
- عدم تغيير Webhook keys أو Provider identifiers قبل mapping plan.
## 8. Rollback / Forward-Fix
- قبل حذف الأعمدة: rollback عبر revert code + عدم تطبيق migration.
- بعد additive migration: rollback code مع بقاء الأعمدة الجديدة غير مستخدمة.
- بعد data rewrite: forward-fix مفضل مع restore snapshot عند فشل تحقق counts.
- لا destructive migration دون نافذة صيانة واعتماد المالك.