# ORCA RISK REGISTER
**Document ID:** ORCA-RISK-001
**Version:** 1.0
**Date:** 2026-07-19
**Status:** `ACTIVE`
| ID | الأثر | الاحتمال | الخطر | الاستجابة/الضوابط | الحالة |
|---|---|---|---|---|---|
| R-001 | Critical | High | إزالة tenantId مبكرًا تسبب فقد/اختلاط بيانات | تجميد الحذف؛ Compatibility alias؛ counts/checksums؛ backup/dry-run | Open |
| R-002 | Critical | Medium | إرسال/دفع حقيقي باستخدام إعداد غير معتمد أو بيانات المطور | Mock by default؛ hard deny؛ موافقة المالك؛ إزالة القيم الثابتة | Open |
| R-003 | High | High | تعارض الأدوار بين Prisma والواجهة يسمح أو يمنع عمليات خطأ | Role registry موحدة؛ server-side guards؛ negative tests | Open |
| R-004 | High | High | غياب Branch/Team scopes يجعل العزل الداخلي غير مكتمل | Org model additive؛ ownership rules؛ migration plan | Open |
| R-005 | High | High | بقايا SaaS تظهر تسجيل شركات وباقات وترقيات خارج النطاق | إزالة surfaces أولًا؛ freeze data؛ feature flags/410 | Open |
| R-006 | High | High | فشل Preview لكل فروع العمل يمنع إثبات التجميع | إصلاح TypeScript ثم tsc/build/preview | Open |
| R-007 | High | High | Schema drift لجدول sentinel_heartbeats يعطل Cron | Migration additive بعد backup/status؛ لا تعديل baseline | Blocked by migration gate |
| R-008 | High | High | Cron jobs تفشل بسبب غياب Company Scope context | System boundary واختبارات tenant context | Open |
| R-009 | High | Medium | جلسة صالحة لمستخدم معطل تستمر في بعض Server Actions | إعادة تحقق DB على boundaries الحساسة | Open |
| R-010 | High | Medium | ادعاء ترخيص/امتثال غير مثبت يعرض الشركة لمخاطر قانونية | NO LICENSE ASSUMED؛ إخفاء claims؛ owner/legal approval | Owner decision |
| R-011 | High | Medium | أسرار Provider قد تحفظ أو تسجل بشكل غير آمن | Secret vault/env؛ redaction؛ no values in logs/reports | Open |
| R-012 | Medium | High | مصطلحات Tenant/SaaS في الوثائق تربك القرار والتنفيذ | Source-of-truth index؛ superseded labels | Open |
| R-013 | Medium | Medium | Wildcard/subdomain legacy يزيد تعقيد الأمن والتشغيل | إبقاء مؤقت ومراقبة؛ خطة fixed company scope | Open |
| R-014 | Medium | High | NOT_CONFIGURED يعامل كعطل فيعطل وظائف داخلية | حالة موحدة وgraceful degradation | Open |
| R-015 | High | Medium | GitHub write integration blocked يؤخر commits/PR/preview | Install/authorize GitHub App؛ لا bypass إلى main | Blocked |
| R-016 | High | Medium | Migration workflow لا يغطي إصلاح drift التاريخي تلقائيًا | Migration لاحقة باسم صالح وبيئة production-database | Open |
| R-017 | High | Medium | عمليات مالية/اشتراك قد تُستدعى من واجهة Legacy | تعطيل routes/UI؛ tests لضمان عدم Provider call | Open |
| R-018 | Medium | Medium | الخلط بين جاهزية Adapter والاتصال الحقيقي | Connection state + provider evidence + UI labels | Open |
| R-019 | Critical | Medium | Cron فوترة SaaS نشط قد يعلق Company Scope أو يرسل SMS عند تهيئة المزود مستقبلًا | تعطيل/short-circuit في single-company mode؛ no-provider-call tests | Open |
## حدود القبول
- أي خطر Critical مفتوح يمنع Go-Live للتدفق المتأثر.
- المخاطر القانونية/التجارية والتراخيص يقررها المالك ولا يغلقها المطور.
- Migration وProduction writes تتطلب بوابة مستقلة حتى لو كان الإصلاح واضحًا.