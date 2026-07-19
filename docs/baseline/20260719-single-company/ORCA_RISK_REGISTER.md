# ORCA RISK REGISTER
**Document ID:** ORCA-RISK-001
**Version:** 1.0
**Date:** 2026-07-19
**Status:** `ACTIVE`
| ID | الأثر | الاحتمال | الخطر | الاستجابة/الضوابط | الحالة |
|---|---|---|---|---|---|
| R-001 | Critical | High | إزالة tenantId مبكرًا أو تجاوز scoped Prisma يسبب فقد/اختلاط بيانات | تجميد الحذف؛ scoped client؛ narrow system capabilities؛ backup/dry-run | Partial — runtime raw-client bypasses fixed in P0-04 |
| R-002 | Critical | Medium | إرسال/دفع حقيقي باستخدام إعداد غير معتمد أو بيانات المطور | Hard deny لمسارات SaaS؛ إزالة الأرقام الثابتة؛ Mock by default للتكاملات الباقية | Mitigated for P0-02; provider activation owner-gated |
| R-003 | High | High | تعارض الأدوار بين Prisma والواجهة يسمح أو يمنع عمليات خطأ | Role registry موحدة؛ server-side guards؛ negative tests | Open |
| R-004 | High | High | غياب Branch/Team scopes يجعل العزل الداخلي غير مكتمل | Org model additive؛ ownership rules؛ migration plan | Open |
| R-005 | High | High | بقايا SaaS تظهر تسجيل شركات وباقات وترقيات خارج النطاق | `/register` 404؛ actions محظورة؛ billing UI/query removed؛ data frozen | Fixed in P0-02 |
| R-006 | High | High | فشل Preview لكل فروع العمل يمنع إثبات التجميع | إصلاح TypeScript ثم tsc/build/preview | Open |
| R-007 | High | High | Schema drift لجدول sentinel_heartbeats يعطل Cron | Migration additive بعد backup/status؛ لا تعديل baseline | Blocked by migration gate |
| R-008 | High | High | Cron jobs تفشل بسبب غياب Company Scope context | Single-company resolver؛ tenant context؛ fail-closed external gates | Fixed for non-migration Cron paths in P0-05 |
| R-009 | High | Medium | جلسة صالحة لمستخدم معطل تستمر في بعض Server Actions | إعادة تحقق DB على boundaries الحساسة | Partial — WhatsApp + operations shell fixed in P0-03 |
| R-010 | High | Medium | ادعاء ترخيص/امتثال غير مثبت يعرض الشركة لمخاطر قانونية | NO LICENSE ASSUMED؛ إخفاء claims؛ owner/legal approval | Owner decision |
| R-011 | High | Medium | أسرار Provider قد تحفظ أو تسجل بشكل غير آمن | Secret vault/env؛ redaction؛ no values in logs/reports | Open |
| R-012 | Medium | High | مصطلحات Tenant/SaaS في الوثائق تربك القرار والتنفيذ | Source-of-truth index؛ superseded labels | Open |
| R-013 | Medium | Medium | Wildcard/subdomain legacy يزيد تعقيد الأمن والتشغيل | إبقاء مؤقت ومراقبة؛ خطة fixed company scope | Open |
| R-014 | Medium | High | NOT_CONFIGURED يعامل كعطل فيعطل وظائف داخلية | عقد تشغيل مركزي وحالة مزودي ترقية فارغة؛ استكمال التوحيد لبقية المزودين في P1 | Partial — P0-02 boundary fixed |
| R-015 | High | Medium | GitHub write integration blocked يؤخر commits/PR/preview | Install/authorize GitHub App؛ لا bypass إلى main | Blocked |
| R-016 | High | Medium | Migration workflow لا يغطي إصلاح drift التاريخي تلقائيًا | Migration لاحقة باسم صالح وبيئة production-database | Open |
| R-017 | High | Medium | عمليات مالية/اشتراك قد تُستدعى من واجهة Legacy | actions/service/callback hard deny؛ business payments classified separately؛ no-provider tests | Fixed in P0-02 |
| R-018 | Medium | Medium | الخلط بين جاهزية Adapter والاتصال الحقيقي | Connection state + provider evidence + UI labels | Open |
| R-019 | Critical | Medium | Cron فوترة SaaS نشط قد يعلق Company Scope أو يرسل SMS عند تهيئة المزود مستقبلًا | أزيل schedule؛ endpoint authenticated no-op؛ no DB/provider/notification tests | Fixed in P0-02 |

## تحديث P0-02 — 2026-07-19
- `VERIFIED`: لا أرقام هاتف ثابتة بصيغة سعودية في `app/`, `components/`, `lib/` ضمن فحص Runtime الحالي.
- `FIXED`: لا تغيير كلمة مرور أو إرسال خارجي ناتج عن دفع اشتراك SaaS.
- `DEFERRED WITH OWNER GATE`: تفعيل أي Provider حقيقي وتقديم بيانات الشركة والتراخيص.
- `OUT OF SCOPE`: تسجيل شركات، باقات SaaS، ترقيات، إضافات مدفوعة، وفوترة اشتراك المنصة.

## تحديث P0-03 — 2026-07-19
- `FIXED`: WhatsApp actions تعيد التحقق من المستخدم والمنشأة والدور من قاعدة البيانات قبل أي أثر.
- `FIXED`: Operations shell لا يحول المستخدم المعطل إلى `READ_ONLY` تلقائيًا.
- `VERIFIED`: 97/97 WhatsApp tests، TypeScript، وProduction Build بلا Provider calls.
- `PARTIAL`: R-009 يبقى مفتوحًا لبقية Server Actions الحساسة خارج نطاق WhatsApp.

## تحديث P0-04 — 2026-07-19
- `FIXED`: ثلاثة raw-client bypasses خارج allowlist في notifications وWhatsApp runtime.
- `VERIFIED`: فحص المصدر يمنع imports غير المصرح بها، و58/58 اختبارًا مستهدفًا ناجحًا.
- `VERIFIED`: 185/185 اختبار عزل/إشعارات/WhatsApp موسع، TypeScript، وProduction Build.
- `PARTIAL`: R-001 يبقى مفتوحًا لخطة الانتقال والنسخ/الاستعادة؛ لم يحذف `tenantId` ولم تحدث Migration.

## تحديث P0-05 — 2026-07-19
- `FIXED`: Cron الأقساط وZATCA لا ينفذان tenant-scoped work خارج Company Scope موثوق.
- `FIXED`: Sentinel لا يفصل Connection Pool تلقائيًا ولا ينفذ فحوص SaaS legacy.
- `OWNER-GATED`: ZATCA submissions وSentinel email alerts معطلان افتراضيًا ببوابات صريحة.
- `DEFERRED WITH MIGRATION GATE`: R-007/C-017 لجدول `sentinel_heartbeats`؛ لا schema change في هذه الخطة.
- `VERIFIED`: 86/86 اختبار Cron/tenant scope/heartbeat موسع وTypeScript ناجحان.
## حدود القبول
- أي خطر Critical مفتوح يمنع Go-Live للتدفق المتأثر.
- المخاطر القانونية/التجارية والتراخيص يقررها المالك ولا يغلقها المطور.
- Migration وProduction writes تتطلب بوابة مستقلة حتى لو كان الإصلاح واضحًا.
