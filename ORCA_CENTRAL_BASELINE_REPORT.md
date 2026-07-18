# ORCA CENTRAL BASELINE REPORT
**Document ID:** ORCA-CBR-001
**Version:** 1.0 — Single-Company and Integration Ownership Baseline
**Date:** 2026-07-19
**Repository:** `ali599115225/orca_crm`
**Base candidate:** `work/orca-pre-parallel-20260715` @ `f41c8dd81d730acc5b8b520971e8a47c5e72903b`
**Intended execution branch:** `work/orca-central-baseline-execution-20260719`
**Write state:** `BLOCKED — GitHub App installation/write authorization missing`
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