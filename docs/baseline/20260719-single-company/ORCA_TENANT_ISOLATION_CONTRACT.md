# ORCA TENANT ISOLATION CONTRACT — TRANSITIONAL SINGLE-COMPANY
**Document ID:** ORCA-TIC-001
**Version:** 1.0
**Date:** 2026-07-19
**Status:** `BINDING TRANSITIONAL CONTRACT`
## 1. تعريف المصطلح
`tenantId` في التنفيذ الحالي هو مفتاح تقسيم تقني تاريخي. في النموذج المعتمد لا يمثل شركة مستأجرة؛ يمثل مؤقتًا **Company Scope** للشركة الواحدة.
## 2. الثوابت الإلزامية
1. لا يُحذف `tenantId` ولا علاقاته ولا فهارسه في المرحلة الحالية.
2. جميع استعلامات البيانات التجارية تبقى مقيدة بـCompany Scope.
3. النطاق يُشتق من جلسة موثوقة أو System Boundary، ولا يقبل من العميل كمرجع ثقة.
4. المستخدم يجب أن يكون موجودًا وفعالًا ومرتبطًا بنفس Company Scope قبل أي عملية.
5. `READ_ONLY` لا ينفذ كتابة حتى لو كانت الواجهة تعرض زرًا.
6. العمليات العالمية تستخدم `rawPrisma` فقط داخل Allowlist موثقة ومختبرة.
7. لا يوجد مسار منتج لإنشاء Company Scope ثانية.
8. لا تستخدم subdomain لتجاوز عضوية المستخدم أو لتحديد بيانات شركة أخرى.
## 3. Cron Jobs
- يجب أن تدخل كل عملية Prisma scoped داخل `runWithTenantContext`.
- إذا كانت الوظيفة نظامية وعابرة للنطاق، تستخدم System Prisma Boundary موثقة ثم تنفذ لكل Company Scope داخل سياق مستقل.
- لا تقرأ نماذج tenant-scoped عالميًا من عميل Prisma المحمي.
## 4. Webhooks
- يحدد Company Scope من معرف Provider موثق أو secret/key mapping، لا من payload غير موثوق.
- يتحقق التوقيع قبل أي mutation.
- يسجل dedupe key ونتيجة التحقق والتدقيق.
- في حالة `NOT_CONFIGURED` يفشل بأمان دون mutation.
## 5. Server Actions وAPIs
- Session → active DB user → role/permission → company scope → domain action.
- يمنع تصدير Server Action تقبل `tenantId` من Caller.
- يمنع تنفيذ Provider call أو mutation قبل اكتمال التحقق.
## 6. العزل التنظيمي الداخلي
`tenantId` لا يكفي لتحقيق العزل المطلوب. يجب إضافة قواعد مستقلة للأدوار والإدارات والفروع وفرق العمل وملكية السجل/الإسناد.
## 7. خطة التبسيط
لا تبدأ إلا بعد:
- Impact Assessment.
- إثبات عدد Company Scopes الفعلية وارتباط البيانات.
- Data Migration Plan.
- Backward Compatibility Plan.
- Rollback أو Forward-Fix Plan.
- اختبارات counts/checksums والعلاقات وعدم فقد البيانات.