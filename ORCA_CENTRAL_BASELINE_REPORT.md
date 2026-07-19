# ORCA CENTRAL BASELINE REPORT
**Document ID:** ORCA-CBR-001
**Version:** 1.1 — P0-02 Single-Company Runtime Enforcement
**Date:** 2026-07-19
**Repository:** `ali599115225/orca_crm`
**Execution branch:** `work/orca-central-baseline-execution-20260719`
**Execution base:** `de74ba5d16bb9723f8921067745da0c3265f9029`
**Write state:** `P0-02 PUSHED AND PREVIEW READY; PR CREATION BLOCKED BY GITHUB APP 403`
## 1. القرار التنفيذي الحاكم
| البند | الحالة |
|---|---|
| BUSINESS MODEL | `VERIFIED — SINGLE INDEPENDENT COMPANY` |
| CURRENT PLATFORM MODEL | `INTERNAL COMPANY OPERATING PLATFORM` |
| SAAS MULTI-COMPANY RENTAL | `OUT OF SCOPE` |
| CURRENT MULTI-TENANT IMPLEMENTATION | `CONFLICTING / LEGACY — SAFE TRANSITION REQUIRED` |
| RBAC AND INTERNAL ORGANIZATIONAL ISOLATION | `REQUIRED` |
| LICENSE STATUS | `NO LICENSE ASSUMED / NOT PROVEN` |
| INTEGRATION OWNERSHIP | `COMPANY OWNER` |
| TECHNICAL PROVIDER RESPONSIBILITY | `INTEGRATION-READY PATHS AND ADAPTERS ONLY` |
| PRODUCTION PROVIDER ACCOUNTS | `NOT PROVIDED / NOT CONFIGURED` |
| DEVELOPER-OWNED CREDENTIALS | `PROHIBITED` |
هذا القرار يلغي أي وصف سابق لـORCA باعتباره SaaS متعدد الشركات. لا يبدأ تحويل قاعدة البيانات قبل خطط الأثر والبيانات والتوافق والتراجع وعدم فقد البيانات.
## 2. G1 — سلامة الأدلة
- حزمة الأدلة: `ORCA_BASELINE_20260718-232624(1).zip`.
- SHA-256 للحزمة: `bb1e95efedc9e67a890b2398bb79a843dd51af51470e7fe8b40aafec8e69be58`.
- تمت مطابقة 362/362 بصمة ملف، دون mismatch أو missing.
- الحزمة لا تحتوي قيم `.env` أو مفاتيح خاصة؛ تحتوي أسماء مواقع محتملة فقط.
- اللقطة المحلية كانت تحتوي ملفات Cursor وتقارير و`next-env.d.ts` غير مرفوعة؛ لا تعد حقيقة GitHub.
**G1:** `PASS`.
## 3. G2 — المستودع والفروع
- GitHub متاح للحساب `ali599115225` مع `admin/maintain/push/triage/pull=true`.
- نقطة العمل المتوازي: `97fcf94ec953b24825f3f3c0b66f8f07c0bfaf1b`.
- الفرع المرشح `f41c8dd...` متقدم على `main` باثنين Commit.
- الفروع التخصصية الستة متفرعة من النقطة المشتركة، ولا يوجد بينها overlap مباشر.
- التعارض المنظم موجود بين تغييرات Leads في الفرع الأساسي و`work/email-page`.
- إنشاء فرع جديد عبر التكامل أعاد `403 Resource not accessible by integration`; GitHub App غير مثبت/مفوض للمستودع.
**G2:** `PASS WITH CONTROLLED CONFLICT`.
## 4. G3 — خط الأساس المعماري والبيانات
### 4.1 الحالة الحالية
- 84 نموذج Prisma، منها 73 تحمل `tenantId` مباشرة.
- `Tenant` مرتبط بمعظم نماذج المجال ويحمل subdomain وحقول اشتراك وفوترة وتكامل.
- طبقة العزل المركزية جيدة من حيث fail-closed، لكنها مبنية على فرضية Multi-Tenant التاريخية.
- `tenantId` سيبقى مؤقتًا Company Scope للشركة الواحدة.
- User يملك `department` نصيًا فقط؛ لا توجد Branch/Team models أو assignments.
### 4.2 RBAC
- Role Enum في Prisma: `ADMIN`, `SALES_MANAGER`, `SALES_EMPLOYEE`, `MARKETING`, `READ_ONLY`.
- الكود يذكر أيضًا أدوارًا لا يمكن تخزينها في هذا Enum، منها `owner`, `accountant`, `rental_manager`, `SUPER_ADMIN`, `PLATFORM_ARCHITECT`.
- توجد Server Actions حساسة لا تعيد التحقق من المستخدم الفعال والدور؛ واتساب هو أوضح P0 مثبت.
### 4.3 SaaS legacy
مثبت في الكود:
- صفحة وفعل تسجيل منشأة جديدة مع Tenant وبيانات Demo.
- باقات وترقية شهرية ودفع اشتراك/إضافات.
- plan limits و`upgradeRequired`.
- Deployment license افتراضي `SAAS`.
- حقول subscription/billing في Tenant.
جميعها `CONFLICTING / LEGACY` ولا تحذف قبل تحليل الاعتماد.
## 5. سياسة التكاملات ونتائجها
- عدم وجود حساب Provider هو `NOT_CONFIGURED` طبيعي.
- البريد يملك سلوكًا مناسبًا نسبيًا: يحفظ Draft ويفشل برسالة إعداد واضحة قبل الإرسال.
- واتساب يملك مسار إرسال فعلي لكنه يحتاج P0 authorization boundary؛ لا يتم اختبار Provider الحقيقي.
- مسار الدفع/الاشتراك Legacy وخارج النطاق.
- مسار داخلي قد يعيد تعيين كلمة مرور مدير ويرسلها نصيًا إلى رقم ثابت؛ مصنف `PROHIBITED/P0` ولا يُشغل.
- `vercel.json` يفعّل `/api/cron/billing` يوميًا، والمسار ينفذ منطق اشتراكات/استئجار وكلاء ويرسل SMS إلى رقم ثابت إذا أصبحت بيانات المزود متاحة؛ مصنف `OUT OF SCOPE / P0` ويجب تعطيله قبل أي تهيئة SMS.
- طبقة SMS نفسها تفشل بأمان بـ`SMS_NOT_CONFIGURED` عند غياب المفتاح، وهذا سلوك يُبقى، لكنه لا يبرر بقاء المستلمين الثابتين أو Cron SaaS النشط.
- لا يوجد دليل رسمي على تراخيص أو اتصالات أو ZATCA/Ejar؛ أي تقارير قديمة ليست إثباتًا.
## 6. G5/G6 — الأمن والبناء والتشغيل
### 6.1 Preview build blocker
كل Deployments للفروع المطلوبة انتهت `ERROR` بسبب خطأ TypeScript مشترك:
```text
ContractWizard.tsx: emptyStateLabel does not exist; expected emptyLabel
```
الإصلاح المقترح سطران، لكن لم يطبق على GitHub بسبب عائق App.
### 6.2 Production
- `/api/health/live` = 200.
- `/api/health/ready` = 200.
- Production الحالي على `main` جاهز.
### 6.3 Runtime errors
- `sentinel_heartbeats` غير موجود في قاعدة Production (`P2021`).
- Cron installments وSentinel وZATCA تسجل `TENANT_CONTEXT_REQUIRED`.
- `runInstallmentAgentInternal()` يستعلم نموذجًا tenant-scoped عالميًا خارج context.
لا تنفذ Migration في هذه المرحلة. يلزم Migration additive لاحقة مع backup/status/dry-run.
## 7. Conflict Register Summary
تمت مراجعة 343 مصدرًا نصيًا من الحزمة، مع 4600 مطابقة مصنفة. بعد التنقيح تم تسجيل 29 تعارضًا مركزيًا في `ORCA_CONFLICT_REGISTER.md`، تشمل:
- SaaS onboarding/billing/licensing.
- tenant semantics and data dependence.
- RBAC/organization gaps.
- external effects and developer-owned data risks.
- build/schema/cron blockers.
- unproven license/compliance claims.
## 8. ما يُبقى وما يتغير
| القرار | العناصر |
|---|---|
| KEEP | Core real-estate domains، audit، encryption، provider adapters، webhook/dedupe/outbox، tenantId كCompany Scope مؤقت |
| RENAME | Tenant business terminology → Company Scope/Profile؛ Tenant Admin → Internal Admin |
| SIMPLIFY | subdomains، plan limits، licensing/customer mode، per-tenant provider ownership |
| OUT OF SCOPE | tenant registration، SaaS plans، subscription/add-on payments، multi-company owner portal |
| BUILD NEW | Department/Branch/Team/OrgAssignment، unified permission registry |
## 9. ترتيب التنفيذ الآمن
1. تثبيت حزمة الوثائق الحالية.
2. فتح GitHub App وإنشاء فرع التنفيذ من `f41c8dd...`.
3. Commit 1: إصلاح TypeScript/Preview فقط.
4. Commit 2: حواجز P0 الأمنية لواتساب والجلسة؛ Mock tests فقط.
5. Commit 3: إصلاح Cron company-scope context دون إرسال.
6. إعداد Migration additive لـSentinel كخطة منفصلة خلف بوابة Production Database.
7. إيقاف SaaS surfaces العامة دون حذف جداول.
8. تصميم Org/RBAC additive واعتماده قبل Migration.
9. تجميع الفروع التخصصية بالترتيب الموثق، مع اختبارات وPreview بعد كل دفعة.
10. لا Production deploy قبل إغلاق P0 ونجاح Build/Preview وقرار Go/No-Go.
## 10. حالة البوابات
| Gate | الحالة |
|---|---|
| G0 Governance | PASS — النموذج الجديد معتمد |
| G1 Evidence | PASS |
| G2 Repository/Branches | PASS WITH CONTROLLED CONFLICT |
| G3 Architecture/Data/RBAC | BASELINE ESTABLISHED; P0/P1 OPEN |
| G4 Functional Contracts | REGISTRY CREATED; RUNTIME VERIFICATION PENDING |
| G5 Security/Quality | P0 OPEN |
| G6 Operations/Recovery | PRODUCTION HEALTHY AT SURFACE; CRON/SCHEMA DEFECTS OPEN |
| G7 Remediation Roadmap | ESTABLISHED |
| G8 Go/No-Go | NO-GO FOR INTEGRATION/LAUNCH CHANGES UNTIL P0 CLOSE |
## 11. التوقفات الحالية
- GitHub write channel غير مفعل للتطبيق.
- Sentinel schema fix يحتاج Migration وموافقة مستقلة.
- أي مزود خارجي أو إرسال أو دفع حقيقي يحتاج بيانات الشركة وموافقتها.
- أي ادعاء ترخيص أو قرار قانوني/تجاري يعود للمالك.

## 12. تنفيذ P0-02 — إغلاق Runtime لمسارات SaaS
**الحالة:** `FIXED — LOCAL VERIFICATION COMPLETE`

### 12.1 حدود المنتج المنفذة
- أضيف عقد مركزي في `lib/platform-operating-model.ts` يثبت `SINGLE_INDEPENDENT_COMPANY` و`legacySaasEnabled: false` وحالة التكامل الافتراضية `NOT_CONFIGURED`.
- `/register` يعيد 404، و`registerTenantAction` أصبح compatibility boundary بلا قراءة FormData أو Prisma أو Cookies أو Provider calls.
- إجراءات دفع اشتراك المنصة وشراء الإضافات واستئجار الوكلاء تعيد `LEGACY_SAAS_OUT_OF_SCOPE` قبل المصادقة أو قاعدة البيانات أو مزود الدفع.
- خدمة الدفع تمنع إنشاء intent أو معالجة callback لاشتراك المنصة، مع إبقاء callbacks المرتبطة بـ`invoiceId` أو`installmentId` في حالة `BUSINESS_PAYMENT_PENDING` للمسار التشغيلي المستقبلي.
- أزيل `/api/cron/billing` من `vercel.json`، وبقي endpoint متوافقًا ومصادقًا لكنه يعيد `skipped` بلا Prisma أو heartbeat أو إشعار أو Provider call.
- أزيل تغيير كلمة مرور المدير والإرسال النصي والبريدي من callback نجاح اشتراك SaaS، وأزيلت الأرقام الثابتة من مسارات Runtime المفحوصة.
- أزيل إنشاء محادثات وأرقام عملاء وهمية تلقائيًا عند فراغ محادثات منصور.
- أزيلت الباقات والترقيات والاشتراك وحدود النمو من سطح إعدادات الشركة واستعلاماته.
- أصبح غياب الترخيص الافتراضي `NO_LICENSE_ASSUMED` مع fail-safe إلى نموذج الشركة الواحدة؛ لا يعود الافتراضي `SAAS`.

### 12.2 ما تم الحفاظ عليه
- العقود العقارية وخطط دفعات العملاء والفواتير والأقساط والتسويات لم تُعطل.
- Provider adapters وWebhooks ومسارات مدفوعات الأعمال بقيت Integration-Ready.
- لم يحدث Migration أو `prisma db push` أو تعديل بيانات Production أو إرسال/دفع حقيقي.

### 12.3 أدلة التحقق المحلية
- اختبارات P0 المستهدفة: `43/43 PASS` عبر 8 ملفات.
- TypeScript: `npx --no-install tsc --noEmit` = `PASS`.
- Production Build: `npm run build` = `PASS`؛ 102/102 صفحة static generation.
- Sentry source-map upload: `NOT CONFIGURED`؛ لم يحدث رفع خارجي.
- Commit: `5d0d3735dd7e0a1489738b1e0d8058a1f2164ce4` pushed إلى فرع التنفيذ.
- Vercel Preview: `READY` — `https://orca-3prucfo8g-ali-s-projectsorcacrm.vercel.app` (`dpl_B4ec5RWdJW3rJHLEGv7XqGzjwhf8`).
- Pull Request: `BLOCKED BY EXTERNAL GITHUB AUTHORIZATION`؛ GitHub App أعاد `403 Resource not accessible by integration` وGitHub CLI غير مسجل الدخول. لا يوجد التفاف إلى `main`.

## 13. تنفيذ P0-03 — WhatsApp authorization boundary
**الحالة:** `FIXED — LOCAL VERIFICATION COMPLETE`

### 13.1 الحدود المنفذة
- أضيف `lib/whatsapp/access.ts` لإعادة قراءة الجلسة والمستخدم الفعال والمنشأة الفعالة ودور قاعدة البيانات داخل Company Scope؛ لا يُوثق دور JWT القديم.
- ثُبتت مصفوفة القراءة والكتابة وإدارة الاتصال: القراءة تشمل `READ_ONLY`، والكتابة لموظفي المبيعات فأعلى، وإدارة الاتصال لـ`ADMIN` فقط.
- أصبحت جميع إجراءات القراءة والإرسال والأرشفة والإسناد وإدارة الاتصال وإنشاء المهمة وإحصاءات لوحة المعلومات تفوّض قبل أي Prisma mutation أو feature check أو Provider call.
- نقل helper الإحصاءات إلى `lib/whatsapp/dashboard-stats.ts` مع `server-only`، وأزيل التصدير الذي يقبل `tenantId` من ملف Server Actions.
- أزيل helper النشاط غير المستخدم بدل إبقاء Server Action قابلة لتمرير Company Scope من المستدعي.
- تحققت صفحة `/operations/whatsapp` من مستخدم قاعدة البيانات الفعال، وأغلق Operations Layout fallback الذي كان يعرض المستخدم المعطل كـ`READ_ONLY`.
- لم يحدث اتصال بمزود WhatsApp أو إرسال رسالة حقيقية أو تعديل Production أو Migration.

### 13.2 أدلة التحقق المحلية
- WhatsApp suite: `97/97 PASS` عبر 17 ملفًا.
- TypeScript: `npx --no-install tsc --noEmit` = `PASS`.
- Production Build: `npm run build` = `PASS`؛ 102/102 صفحة static generation.
- فحص Operations/Auth/RBAC الإضافي: `30 PASS` و`1 PRE-EXISTING FAIL`؛ الفشل يرصد imports قديمة لـ`rawPrisma` في ثلاثة ملفات غير معدلة بهذه الشريحة، وسيعالج ضمن tenant-isolation دون توسيع P0-03.
- Pull Request ما زال `BLOCKED BY EXTERNAL GITHUB AUTHORIZATION`؛ لا تغيير أو التفاف إلى `main`.
