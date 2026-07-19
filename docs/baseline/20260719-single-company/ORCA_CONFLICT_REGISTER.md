# ORCA CONFLICT REGISTER
**Document ID:** ORCA-CONFLICT-001
**Version:** 1.0
**Date:** 2026-07-19
**Status:** `ACTIVE — MUST BE UPDATED BEFORE CODE TRANSITION`
## قواعد التصنيف
- `KEEP`: صالح للنموذج الجديد.
- `RENAME`: المعنى صالح لكن المصطلح SaaS/tenant يحتاج إعادة توصيف.
- `SIMPLIFY`: البنية أوسع من الشركة الواحدة وتحتاج تقليصًا آمنًا.
- `OUT OF SCOPE`: لا يجب أن يظهر أو ينفذ في المنتج الحالي.
- `PROHIBITED`: يخالف سياسة المالك أو الأمن.
## السجل المنظم
| ID | الأولوية | النطاق | التعارض | الدليل | الحقيقة الحالية | التصنيف | المعالجة الآمنة |
|---|---|---|---|---|---|---|---|
| C-001 | P0 | Product/Onboarding | Public tenant registration | `app/register/page.tsx`, `app/actions/register.ts` | إنشاء Tenant جديد وبيانات Demo وإرسال تنبيهات وتسجيل دخول تلقائي | OUT OF SCOPE | إيقاف السطح العام بعد اختبار عدم وجود اعتماد؛ إبقاء الكود مؤقتًا خلف feature flag/410 حتى قرار الحذف |
| C-002 | P0 | Billing | SaaS plan cards and upgrades | `components/settings/SettingsBilling.tsx` | باقات 450/900/2400 وترقية شهرية | OUT OF SCOPE | إزالة من التنقل/الواجهة الداخلية قبل الإطلاق؛ لا حذف جداول |
| C-003 | P0 | Payments | Subscription/add-on payment actions | `app/actions/payment.ts` | بدء دفع اشتراك وشراء وكلاء إضافيين | OUT OF SCOPE / REAL FINANCIAL RISK | تعطيل المنتج عبر سياسة الشركة الواحدة؛ لا اختبار Provider حقيقي |
| C-004 | P1 | Domain | Plan limits by SaaS tier | `lib/plan-guard.ts` | حدود basic/silver/gold وupgradeRequired | LEGACY | تحويلها لاحقًا إلى سياسات تشغيل داخلية أو إزالة تدريجية بعد تحليل الاعتماد |
| C-005 | P1 | Data | Tenant subscription/billing fields | `prisma/schema.prisma:Tenant` | subscriptionPlan/expires/paymentStatus/billingCycle/extraAgents | LEGACY DATA | Freeze؛ لا Migration حذف قبل خطة بيانات |
| C-006 | P0 | License model | Deployment defaults to SAAS | `lib/deployment-license.ts` | الافتراضي SAAS وpayload يحمل customerId/edition | CONFLICTING | إعادة توصيف deployment mode إلى SINGLE_COMPANY بعد Compatibility Plan؛ لا ادعاء ترخيص |
| C-007 | P0 | External effects | Payment success resets admin password and sends SMS | `lib/server/internal.ts` | تغيير كلمة مرور وإرسالها نصيًا إلى رقم ثابت | PROHIBITED / SECURITY RISK | إيقاف المسار خلف قرار المالك؛ عدم اختباره أو تشغيله |
| C-008 | P0 | Credentials | Developer/personal contact risk | `lib/server/internal.ts` | رقم SMS ثابت داخل الكود | PROHIBITED | إزالة القيمة من الكود بعد تحقق الاستخدام وإضافة test يمنع الأرقام الثابتة |
| C-009 | P1 | Routing | Subdomain/wildcard tenant routing | `Tenant.subdomain`, Vercel `*.orca.az-ez.pro` | يوحي بشركات مستقلة ويستخدم host resolution | LEGACY COMPATIBILITY | إبقاء مؤقت؛ target fixed company scope + internal branches |
| C-010 | P0 | RBAC | Prisma roles vs application roles mismatch | `schema.prisma`, `AuthContext.tsx`, `rbac-policy.ts` | خمسة أدوار DB مقابل أدوار owner/accountant/rental_manager وغيرها | CONFLICTING | توحيد Role Registry قبل توسيع الصلاحيات |
| C-011 | P1 | Organization | No first-class branch/team model | `schema.prisma` | department نص فقط؛ لا Branch/Team/assignment | MISSING | تصميم Org model وMigration additive بعد اعتماد المالك |
| C-012 | P0 | WhatsApp | Server actions lack DB-backed role boundary | `app/actions/whatsapp.ts` | قراءة/إرسال/أرشفة/إسناد/تبديل اتصال تعتمد company/tenant resolution | SECURITY GAP | إضافة shared access boundary واختبارات عدم استدعاء Provider عند الرفض |
| C-013 | P0 | WhatsApp | Real provider send path exists | `sendWhatsAppMessageAction` | قد ينفذ إرسالًا فعليًا عند وجود إعداد | CONTROLLED EXTERNAL EFFECT | لا اختبار حقيقي؛ Mock فقط؛ يتطلب بيانات الشركة وموافقة صريحة |
| C-014 | P1 | Email | Provider-ready email paths | `app/actions/email.ts` | يحفظ Draft عند عدم الإعداد ويرسل عند الاتصال | KEEP WITH POLICY | الإبقاء؛ `NOT_CONFIGURED` طبيعي؛ Mock/Sandbox فقط |
| C-015 | P1 | Provider config | Per-tenant credentials/models | Tenant encrypted fields, WhatsApp/Revenue provider models | تصميم SaaS لكل Tenant | RENAME/SIMPLIFY | اعتبارها company-owned config مؤقتًا؛ لا حذف تشفير أو audit |
| C-016 | P0 | Build | All work-branch previews fail | Vercel deployment logs | ContractWizard prop `emptyStateLabel` غير موجود | BLOCKER | تغيير سطرين إلى `emptyLabel` ثم tsc/build/preview |
| C-017 | P0 | Database | Production missing sentinel_heartbeats | Runtime P2021; baseline migration contains table | SCHEMA DRIFT | إنشاء Migration لاحقة additive بعد status/dry-run/backup؛ لا تعديل baseline التاريخي |
| C-018 | P0 | Cron | Installment cron lacks tenant context | `runInstallmentAgentInternal` | استعلام tenant-scoped عالمي يفشل TENANT_CONTEXT_REQUIRED | RUNTIME DEFECT | System boundary ثم loop على company scope داخل context؛ لا إرسال |
| C-019 | P0 | Cron | ZATCA/Sentinel cron tenant context errors | Production runtime logs | TENANT_CONTEXT_REQUIRED | RUNTIME DEFECT | تحليل كل route وإضافة system/company scope boundary |
| C-020 | P1 | Licensing | Regulatory readiness claims in archived docs | ZATCA/Ejar/marketing reports | تقارير قد توحي بترخيص/اعتماد | NOT PROVEN | وسمها historical/not proof؛ لا عرض claim في المنتج |
| C-021 | P1 | Integration UX | Disconnected treated as failure in some flows | واجهات وتدفقات متعددة | السياسة الجديدة تعتبر NOT_CONFIGURED طبيعيًا | CONFLICTING UX | توحيد state vocabulary وعدم تعطيل بقية المنصة |
| C-022 | P1 | Documents | External storage assumptions | Document/storage paths | لا مزود إنتاجي مثبت | NOT CONFIGURED | local/internal metadata + adapter readiness؛ لا رفع خارجي حقيقي |
| C-023 | P1 | Advertising | Provider campaigns and credentials | MarketingCampaignChannel/provider actions | لا حسابات أو تراخيص إعلانات مثبتة | INTEGRATION-READY ONLY | Mock contracts وحالة disconnected؛ لا نشر حملة |
| C-024 | P0 | Operations shell | Inactive user may retain valid JWT | `app/operations/layout.tsx`, Server Actions | بعض المسارات لا تمنع المستخدم المعطل بعد إصدار الجلسة | SECURITY GAP | DB-backed active-user check على كل boundary حساسة |
| C-025 | P1 | Tenant semantics | 73 models directly use tenantId | `schema.prisma` | اعتماد عميق يمنع الإزالة السريعة | KEEP TEMPORARILY | companyScope compatibility alias + impact assessment |
| C-026 | P1 | GitHub execution | Write channel blocked | GitHub App 403 | لا يمكن branch/commit/PR عبر الاتصال الحالي | TOOLING BLOCKER | تثبيت GitHub App على المستودع؛ لا الكتابة إلى main كالتفاف |
| C-027 | P1 | Migration workflow | Historical baseline naming and drift | manual migration workflow + baseline directory | الـbaseline التاريخي ليس Migration لاحقة لإصلاح Production | PROCESS GAP | Migration additive باسم صالح مع confirmation/status/backup |
| C-028 | P1 | Documentation | Archived SaaS/multi-tenant claims | local corpus scan | آلاف المطابقات عبر 185 ملفًا | DOCUMENT CONFLICT | لا حذف تاريخي؛ وسم superseded وإنشاء source-of-truth index |
| C-029 | P0 | Billing Cron | Active scheduled SaaS billing and outbound alerts | `vercel.json`, `app/api/cron/billing/route.ts` | Cron runs daily, suspends expired tenants, renews agent leases, and may send SMS to a fixed number if credentials later exist | OUT OF SCOPE / PROHIBITED EXTERNAL EFFECT | Disable/short-circuit in single-company mode before any provider credential is configured; add no-provider-call tests |
## نتائج المسح النصي للحزمة
- تمت مراجعة 343 مصدرًا نصيًا من حزمة الأدلة المحلية.
- سجل المسح الخام احتفظ بـ4600 مطابقة مصنفة.
- ظهرت مصطلحات Multi-Tenant في 185 ملفًا، وتسجيل/Onboarding مستأجرين في 70 ملفًا، وادعاءات ترخيص/امتثال في 147 ملفًا.
- هذه الأرقام مؤشرات Corpus وليست عدد ثغرات؛ السجل أعلاه هو القائمة المنقحة ذات الأولوية.
## قاعدة التعديل
لا يعدل أي بند Legacy قبل تحديد الاعتماديات والبيانات والتوافق واختبار الرجوع. لا تختبر البنود ذات الأثر المالي أو الإرسال الحقيقي.

## تحديث تنفيذ P0-02 — 2026-07-19
| البنود | الحالة | الدليل التنفيذي |
|---|---|---|
| C-001 | FIXED | `/register` يعيد 404؛ action بلا Prisma/Cookie/Provider |
| C-002 | FIXED | إزالة billing navigation/render وحقول الخطة من settings query |
| C-003 | FIXED | subscription/add-on/agent-lease actions وpayment service تعيد `LEGACY_SAAS_OUT_OF_SCOPE` قبل الأثر |
| C-004 | FIXED FOR CURRENT MODEL | `plan-guard` يتجاوز حدود الباقات وفق عقد التشغيل؛ حقول DB مجمدة |
| C-006 | FIXED | default = `DEDICATED_COPY`, `valid:false`, reason=`NO_LICENSE_ASSUMED`; signed SaaS mode rejected |
| C-007 | FIXED | حذف password reset وSMS/email من `handleSuccessfulPaymentInternal` |
| C-008 | FIXED | حذف الأرقام الثابتة من مسارات Runtime المفحوصة، بما فيها seed التلقائي لمحادثات منصور |
| C-029 | FIXED | حذف schedule من `vercel.json` وتحويل route إلى authenticated no-op |
| C-026 | BLOCKED EXTERNALLY | Push ناجح؛ إنشاء Draft PR أعاد GitHub App 403 و`gh` غير مصادق؛ يحتاج تفويض GitHub فقط |

التصنيف النهائي لهذه الحزمة: `FIXED` لمسارات Runtime، `OUT OF SCOPE` للمنتج، وحقول/جداول البيانات `DEFERRED WITH OWNER/MIGRATION GATE` بلا حذف أو Migration.
