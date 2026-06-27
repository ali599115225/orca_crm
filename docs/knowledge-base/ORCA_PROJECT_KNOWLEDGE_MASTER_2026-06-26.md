# ORCA CRM — Project Knowledge Base (Master)
هذه نسخة مجمعة من جميع ملفات المعرفة مرتبة حسب الأولوية.

---

## FILE: `README.md`

# ORCA CRM — قاعدة معرفة المشروع

**تاريخ التجميع:** 2026-06-26  
**نوع الحزمة:** Project Knowledge Base  
**الغرض:** إعطاء أي وكيل أو مطور أو مدقق صورة صحيحة ومحددة عن حالة ORCA CRM قبل تنفيذ أي عمل.

> هذه الحزمة مبنية على التقارير ونتائج الأوامر والقرارات الموثقة حتى تاريخ التجميع.  
> لا تُعامل كبديل عن فحص Git/Database الحالي عند بدء تنفيذ جديد.

## ترتيب القراءة الإلزامي

1. `P0_CRITICAL` — الحقائق الحرجة والحواجز التي تمنع الدمج أو النشر.
2. `P1_CORE` — النواة الداخلية والأمن وقاعدة البيانات والمكونات الأساسية.
3. `P2_PRODUCT` — خارطة المنتج وحالة الوحدات وتجربة المستخدم.
4. `P3_QUALITY` — التباين والوصولية والمراجعة البصرية واختبارات الثقة.
5. `P4_OPERATIONS` — قواعد العمل والفروع والأرشفة وسجل القرارات.

## الحكم التنفيذي الحالي

- أعمال كثيرة مكتملة داخل فروع وWorktrees منفصلة.
- `REDC/main` ليس المصدر الموحّد الكامل حتى الآن.
- Revenue Integrity موجودة في `REDC-INTEGRATION` وليست موجودة في `REDC/main`.
- سلسلة Prisma Migrations غير مكتملة تاريخيًا.
- النشر النهائي محجوب حتى إغلاق الدمج الآمن وHistorical Baseline.
- يمنع حذف السكربتات أوالتقارير أوWorktrees؛ تُؤرشف لاحقًا فقط.

## المسارات المهمة

- المستودع الرئيسي المستهدف: `C:\Users\ali59\Desktop\REDC`
- فرع التكامل: `C:\Users\ali59\Desktop\REDC-INTEGRATION`
- أرشيف العمل المقترح لاحقًا: `C:\Users\ali59\Desktop\ORCA-WORK-ARCHIVE`

## قاعدة الاستخدام

قبل أي أمر:
1. اقرأ ملفات P0.
2. أثبت المسار والفرع وHEAD.
3. لا تكرر Build أوTests أوAudits المقبولة على نفس HEAD والنطاق.
4. لا تنفذ Database write قبل إغلاق بوابة الـMigration.

---

## FILE: `P0_CRITICAL/01_CURRENT_SOURCE_OF_TRUTH.md`

# P0 — الحقيقة الحالية للمصدر الرئيسي

## الحالة المثبتة

### REDC/main

- المسار: `C:\Users\ali59\Desktop\REDC`
- الفرع: `main`
- HEAD وقت الفحص: `396f2bf`
- `app/operations/revenue-integrity/page.tsx`: غير موجود.
- لا توجد ملفات tracked ضمن:
  - `components/revenue-integrity`
  - `lib/revenue-integrity`

### REDC-INTEGRATION

- المسار: `C:\Users\ali59\Desktop\REDC-INTEGRATION`
- الفرع: `integration/revenue-integrity`
- HEAD وقت الفحص: `7663135`
- Route Revenue Integrity موجودة.
- مكونات ومكتبات Revenue Integrity موجودة.

## النتيجة

`REVENUE_INTEGRITY_NOT_MERGED_INTO_REDC_MAIN`

ظهور `/operations/revenue-integrity` كصفحة 404 على localhost كان نتيجة صحيحة لغياب Route من `main`.

## ما لا يجوز ادعاؤه

- لا يجوز القول إن جميع أعمال الوكلاء جُمعت داخل `REDC`.
- لا يجوز اعتبار وجود الملفات في Worktree أودليل فرع منفصل دمجًا في `main`.
- لا يجوز اعتبار نجاح Build في فرع منفصل إغلاقًا على المصدر الرئيسي.

## أول إجراء لازم

تنفيذ Safe Main Integration يحافظ على:

- Login المعتمد.
- Language/Theme.
- Global Shell.
- Dashboard/Leads.
- Revenue Integrity.
- WhatsApp.
- Security.
- Accessibility.
- Card Stretch fixes.

---

## FILE: `P0_CRITICAL/02_SAFE_MAIN_INTEGRATION_GATE.md`

# P0 — Safe Main Integration Gate

## الهدف

دمج الأعمال المعتمدة من الفروع وWorktrees إلى `REDC/main` دون استبدال التصميمات المعتمدة أو فقد ملفات أو إدخال تعارضات غير مرئية.

## القيود

- لا تستخدم `git add .` أو`git add -A` في الإغلاق الحساس.
- لا Push إلا بطلب صريح.
- لا تحذف Worktrees أوStashes.
- لا تستبدل Login المعتمد بنسخة قديمة.
- لا تعتبر Copy/Paste للملفات بديلًا عن توثيق المصدر والCommit.
- لا تبدأ Database migration أثناء دمج الواجهات والكود.

## بوابات القبول

1. إثبات branch وHEAD لكل مصدر.
2. إعداد قائمة Commits/Files المطلوب دمجها.
3. تحديد الملفات المتعارضة قبل الدمج.
4. حماية Login وLanguage/Theme وGlobal Shell.
5. إثبات وجود Routes المطلوبة في `main`.
6. لا 404 للمسارات المدمجة.
7. Git diff مفهوم ومحصور.
8. تقرير إغلاق يذكر الملفات والCommits التي دخلت `main`.

## المسار ذو الأولوية

- المصدر: `integration/revenue-integrity`
- الهدف: `main`
- Commit الإغلاق التجميعي: `7663135`

## الحكم الحالي

`SAFE_MAIN_INTEGRATION_REQUIRED`

---

## FILE: `P0_CRITICAL/03_HISTORICAL_MIGRATION_BASELINE.md`

# P0 — Historical Migration Baseline

## القاعدة التي ظهر عليها الحاجز

- Provider: Neon PostgreSQL
- Database: `test_g4_fresh`
- Connection: Direct
- تعامل كقاعدة اختبار، لا إنتاج.

## حالة Prisma

- إجمالي Migration directories: 38
- Pending وقت الفحص: 27
- Migration الفاشلة: `20260613_add_hash_columns`
- Prisma error: `P3009`
- PostgreSQL error: `42P01`
- السبب المباشر: relation `whatsapp_messages` does not exist
- Statement الفاشل:
  `ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS phone_hash TEXT;`

## الجداول التي ثبت غياب Creation Migration لها

1. `whatsapp_messages`
2. `mansour_chats`
3. `contracts`

## الدليل التاريخي

### whatsapp_messages

- لا توجد Prisma creation migration.
- يوجد SQL يدوي في `scripts/create-whatsapp-tables.sql`.
- أول Commit معروف للـDDL اليدوي: `feb70d5`.

### mansour_chats

- Model موجود.
- لا Creation Migration.
- لا DDL تاريخي مكتوب تم العثور عليه.
- المرجح أنه أُنشئ عبر `prisma db push`.

### contracts

- Model موجود.
- لا Creation Migration أصلية.
- Migrations لاحقة تفترض وجود الجدول.
- المرجح أنه أُنشئ تاريخيًا خارج سلسلة Prisma Migrate.

## الحكم

`HISTORICAL_BASELINE_RECONSTRUCTION_REQUIRED`

## القيود الصارمة

ممنوع حاليًا:

- `prisma migrate deploy` على القاعدة الحالية.
- `prisma migrate resolve`
- `prisma migrate reset`
- `prisma db push`
- اعتبار `applied_steps_count = 0` دليلًا كافيًا على عدم وجود أي أثر.

## مواصفات الـBaseline الصحيحة

- يجب أن ترتب قبل `20260613_add_hash_columns`.
- تمثل الشكل التاريخي للجداول قبل Hash migration.
- لا تضيف مسبقًا:
  - `phone_hash`
  - `contact_phone_hash`
  - `buyer_phone_hash`
- لا تنشئ Foreign Keys إلى جداول لم تكن موجودة في تلك النقطة.
- يجب فحص جميع Models التي لا تملك Creation Migration، وليس الجداول الثلاثة فقط.
- يجب اختبار السلسلة كاملة على Database فارغة ومعزولة.

## شرط الإغلاق

- Fresh database.
- `migrate deploy`: PASS.
- `migrate status`: UP TO DATE.
- Schema diff: ZERO أوفرق مفسر ومعتمد.

---

## FILE: `P0_CRITICAL/04_RELEASE_NO_GO_RULES.md`

# P0 — قواعد منع النشر والتغييرات الخطرة

## لا نشر نهائي قبل

- اكتمال Safe Main Integration.
- إغلاق Historical Baseline.
- إثبات Migration chain على قاعدة فارغة.
- Route Matrix من `main`.
- إغلاق Color Contrast المطلوب.
- إغلاق Accessibility الأساسي.
- Final Pre-Launch Trust QA.

## لا تعتبر دليل إغلاق

- نجاح Build وحده.
- وجود الكود في Worktree.
- تقرير وكيل دون Commit/Route/Runtime evidence.
- صفحة ظهرت في لقطة غير مطابقة للمسار المقصود.
- نجاح اختبار داخل فرع غير مدمج.
- Shield مثل Coming Soon بدل الصفحة الأصلية.

## أوامر محظورة دون بوابة صريحة

- `migrate reset`
- `db push`
- `migrate resolve`
- SQL مدمر.
- حذف Worktree/Stash.
- حذف تقارير وZIP وSQL.
- تعديل `.env.production` لاختبار مؤقت.
- استخدام قاعدة `.env.local` الحالية كتجربة Migration destructive.

## قاعدة Neon للاختبارات

- استخدم Branch/Database معزولة وفارغة.
- استخدم Direct connection string.
- لا تحفظ الرابط في Git.
- لا ترسل أسرار الاتصال في التقارير.

---

## FILE: `P1_CORE/05_CORE_ARCHITECTURE.md`

# P1 — النواة الداخلية والمعمارية

## تعريف المنتج

ORCA هو Real Estate Operating System للسوق السعودي، وليس CRM تقليديًا.

## النطاق

- CRM والمبيعات.
- المشاريع والوحدات.
- الجولات والعروض.
- العقود والإيجارات.
- التحصيل والمدفوعات.
- المحاسبة والفوترة.
- ZATCA.
- WhatsApp.
- الذكاء الاصطناعي والأتمتة.
- Revenue Integrity.
- التقارير والـTelemetry.
- بوابات المالك والمستأجر.

## مبادئ معمارية

- Multi-tenant.
- `tenantId` محور العزل.
- Arabic-first.
- RTL افتراضي وLTR للإنجليزية.
- Server-side authorization.
- Domain Events + Audit + Outbox.
- Idempotency.
- Provider-neutral integrations.
- لا ادعاء نجاح خارجي قبل إثبات التنفيذ الفعلي.

## الحالة

النواة متقدمة، لكنها ليست مغلقة نهائيًا بسبب:

- عدم توحيد `main`.
- Migration lineage الناقصة.
- عدم وجود Production proof شامل.

---

## FILE: `P1_CORE/06_SECURITY_AUTHORIZATION_AUDIT.md`

# P1 — الأمن والصلاحيات والتدقيق

## الحالة المثبتة

- Authorization + Event/Audit في فرع التكامل: مغلقة برمجيًا.
- اختبارات محفوظة: `26/26 PASS`.

## القواعد

- لا تعتمد على إخفاء عناصر الواجهة.
- التحقق داخل Server Actions وAPI routes.
- تحقق من Tenant ownership لكل كيان.
- امنع Cross-tenant references.
- Cron endpoints محمية بـSecret/Bearer.
- الأحداث الحساسة يجب أن تحتوي:
  - correlation ID
  - causation ID
  - idempotency key
  - before/after عند الحاجة
- Outbox لا يُعتبر External success قبل تأكيد Provider.

## الأدوار المذكورة

- ADMIN
- SALES_MANAGER
- SALES_EMPLOYEE
- أدوار وصلاحيات Revenue Integrity المتخصصة.

## المتبقي

- إثبات نفس الحماية بعد الدمج إلى `main`.
- تشغيل الاختبارات على المصدر الموحّد بعد إغلاق الدمج.
- مراجعة Production secrets والسياسات قبل الإطلاق.

---

## FILE: `P1_CORE/07_DATABASE_PRISMA_STATE.md`

# P1 — حالة قاعدة البيانات وPrisma

## آخر حالة موثقة

- قاعدة الاختبار: `test_g4_fresh`
- Applied migrations قبل الفشل: 10
- Pending: 27
- Migration blocker: `20260613_add_hash_columns`

## الـMigrations المكتملة قبل الفشل

1. `20260524004442_init_database`
2. `20260526001652_add_contract_terms`
3. `20260526150443_add_saas_billing_fields_for_sanad`
4. `20260611000000_create_contacts_baseline`
5. `20260611205518_add_email_message`
6. `20260612_fix_leads_schema_drift`
7. `20260612000000_add_lead_last_contacted_at`
8. `20260612235958_create_whatsapp_contacts_baseline`
9. `20260612235959_create_sentinel_command_baseline`
10. `20260613_add_execution_payload_to_sentinel_task_orders`

## مبدأ التصحيح

لا تُصلح قاعدة موجودة أولًا.  
صمم Historical Baseline، ثم اختبر سلسلة Migrations كاملة على قاعدة فارغة، وبعد نجاحها صمم Repair plan للقاعدة الحالية.

## نتيجة مطلوبة

`MIGRATION_CHAIN_PROVEN_ON_FRESH_DATABASE`

---

## FILE: `P1_CORE/08_REVENUE_INTEGRITY.md`

# P1 — Revenue Integrity

## المكونات الخمسة

### 1. Revenue Leak Radar

- مغلق داخل فرع التكامل.
- Commit: `9145e23`.
- Tenant scoping.
- Persistence.
- Idempotency.
- Events/Audit.
- Auto-resolution.
- UI وServer Actions.

### 2. Conversation-to-Action

- `11/11 PASS`.
- Approval/Reject/Execution.
- منع Cross-tenant.
- منع تكرار Approval/Execution.
- Atomic Event/Audit/Outbox.
- لا يدّعي External success وهمي.

### 3. Saudi Trust Gates

- مغلقة معماريًا وبرمجيًا.
- Ejar commit: `001d12c`.
- ZATCA commit: `8bc559a`.
- التفعيل الخارجي وCredentials الإنتاجية ما زالت خارجية.

### 4. Authorization + Event/Audit

- `26/26 PASS`.
- DB-backed authorization.
- Tenant isolation.
- Correlation/causation/idempotency.

### 5. Predictive Intelligence

- Commit: `8820587`.
- `149/149 PASS`.
- Prisma validate: PASS.
- Build: PASS وقت الإغلاق.
- المحرك الحالي: `RI-DETERMINISTIC-v1`.
- لا ادعاء Probabilistic accuracy.
- Logistic Regression: `NOT_READY`.

## إغلاق التجميع

- Commit: `7663135`
- Branch: `integration/revenue-integrity`
- Push: تم إلى origin.

## الحكم الصحيح

`FIVE_CORE_PHASES_LOCALLY_CLOSED_AND_PUSHED`

لكن:

- ليست مدمجة في `main`.
- ليست مطبقة على قاعدة البيانات.
- ليست منشورة إنتاجيًا.

---

## FILE: `P1_CORE/09_WHATSAPP_EXTERNAL_INTEGRATIONS.md`

# P1 — WhatsApp والتكاملات الخارجية

## WhatsApp

- Migration baseline restored: `20260612235958_create_whatsapp_contacts_baseline`
- Commit: `08f5b70`
- Tests: `41/41 PASS`
- Round-trip حقيقي تحقق سابقًا:
  1. إرسال من ORCA.
  2. وصول للهاتف.
  3. رد من الهاتف.
  4. ظهور الرد في المحادثة الصحيحة.
  5. Tenant صحيح.

## الحاجز الخارجي

`META PRODUCTION ACCOUNT REVIEW / ACTIVATION`

لا يعاد الاختبار الكامل إلا عند تغير:

- الرقم.
- Credentials.
- Webhook.
- App mode.

## Stash مهم

- الاسم: `wip-whatsapp-before-consolidation`
- hash: `dfab62b870d185dcaf077464bdb88429691dd2c5`
- يمنع حذفه أوPop غير المنضبط.

## ملاحظة Database

نجاح WhatsApp وظيفيًا لا يلغي أن `whatsapp_messages` لا يملك Creation Migration أصلية داخل Prisma chain.

---

## FILE: `P2_PRODUCT/10_OFFICIAL_13_PHASE_ROADMAP.md`

# P2 — الخارطة الرسمية للمراحل الـ13

## المراحل

1. تدقيق النواة الداخلية
2. تدقيق الوظائف التشغيلية
3. تدقيق ترابط الصفحات والكيانات
4. Shared UI Primitives Architecture Gate
5. تثبيت الخارطة وتصنيف النواة العالمية
6. Header + Sidebar + Global Shell
7. Dashboard + Leads
8. Landing + Pricing + Footer
9. Login + Language / Theme
10. Properties + Rental / Contracts
11. Projects + Settings / Plans
12. مراجعة جميع الصفحات المتبقية
13. Final Pre-Launch Trust QA

## الحالة العامة المحفوظة

- مغلق رسميًا: 04، 06، 07.
- جزئي: 01، 02، 05، 08، 09، 10، 11.
- جاري: 12.
- محجوب: 03، 13.

## ملاحظات

- لا تعتمد الأرقام القديمة للمرحلة دون مطابقة الاسم والمحتوى.
- Build لا يغلق مرحلة.
- وجود الكود لا يغلق مرحلة.
- Coming Soon لا يغلق Landing/Pricing/Footer.
- Revenue Integrity مغلقة داخل فرعها، لا داخل `main`.

## الانتقال

لا تبدأ Phase 13 قبل:

- الدمج الكامل.
- Migration baseline.
- Route Matrix.
- Visual/Accessibility closure.

---

## FILE: `P2_PRODUCT/11_MODULE_STATUS.md`

# P2 — حالة وحدات المنتج

## Dashboard + Leads

- مغلقة وفق التقارير السابقة.
- Stress data وPagination وعرض بيانات حقيقية.
- المتبقي Regression verify بعد الدمج النهائي.

## Properties / Units

- Models وعلاقات وواجهات متقدمة.
- ملاحظات: Empty states، صور، مساحات فارغة، Card stretch.

## Rental / Contracts

- وظائف قوية موجودة.
- `contracts` بلا Creation Migration.
- الإغلاق التشغيلي محجوب بالـBaseline.

## Projects

- متقدمة وظيفيًا وبصريًا.
- تحتاج Regression ضمن المصدر الموحد.

## Settings / Plans

- جزئية.
- ملاحظات:
  - Dark dropdowns.
  - Billing.
  - Team table.
  - Card stretch.
  - Pagination.
  - Labels.

## Payments

- Multi-provider commit: `8ed96b6`.
- `16 PASS`.
- Moyasar/Paylink foundation.
- N-Genius sandbox يحتاج تجربة دفع حقيقية واحدة وإثبات idempotency.

## Accounting / ZATCA

- Foundation موجودة.
- لا إغلاق مالي سعودي نهائي.
- بقي:
  - Trial Balance.
  - P&L.
  - VAT reporting.
  - Reconciliation.
  - Reversal policies.
  - Production verification.

---

## FILE: `P2_PRODUCT/12_UI_DESIGN_SYSTEM.md`

# P2 — UI Design System وShared Primitives

## الهوية

- Arabic-first.
- RTL افتراضي.
- English جاهزة.
- Navy داكن.
- Gold محدود.
- Enterprise.
- تقليل Teal التقليدي.
- لا تقليد مباشر لمنتجات أخرى؛ استخرج المبادئ فقط.

## Shared UI Primitives

الحالة: Architecture Gate مغلق.

المسار الإلزامي:

`Architecture Gate → Shared Primitives → Pilot Migration → Production Verify → Rollout`

## Pilot

- Commit: `65ffd74`
- شمل Rental contracts وLeads opportunities.
- Helpers:
  - formatters
  - status cells
  - display IDs
- Pilot مغلق.
- Rollout الكامل غير مغلق.

## Display Foundation

- `displayPerson`
- `displayGeo`
- `displayEntity`
- `displayEnum`
- `displayRevenueIntegrityValue`

## قواعد العرض

- لا UUID كامل.
- استخدم Ref قصيرًا.
- لا Raw enums.
- Status badges مفهومة.
- Empty states مصممة.
- Pagination بدل Scroll-only.

---

## FILE: `P2_PRODUCT/13_LOGIN_LANGUAGE_THEME.md`

# P2 — Login + Language / Theme

## Login

- يوجد تصميم Login معتمد من المستخدم.
- النسخة التي ظهرت لاحقًا محليًا لم تكن مطابقة للتصميم المعتمد.
- يجب تحديد المصدر الصحيح من:
  - `work/login-approved-source`
  - `work/login-final-design`
- يمنع استبدال Login المعتمد أثناء دمج Revenue Integrity.

## Language / Theme

- Arabic-first.
- RTL/LTR.
- Dark/Light.
- Bilingual display foundation موجودة.
- الدمج النهائي في `main` غير مثبت.

## شرط الإغلاق

- التصميم المعتمد هو الموجود في `main`.
- العربية والإنجليزية تعملان.
- RTL/LTR صحيح.
- Dark/Light صحيح.
- لا Regression في Shell.
- لا Contrast blockers مفتوحة.

---

## FILE: `P3_QUALITY/14_COLOR_CONTRAST.md`

# P3 — Color Contrast

## الحالة

`PARTIALLY APPROVED / NEEDS FOLLOW-UP`

لا يجوز اعتمادها Approved نهائيًا ما دامت المخالفات المسجلة لم تصل إلى صفر حسب شروط المرحلة.

## آخر أرقام موثقة

- الإجمالي: 7
- Dark: 2
- Light: 5

## Dark

### Rental

- `#8EB1D1`
- secondary button

### Settings

- `text-indigo-500`
- decorative nodes

## Light

### Landing

- `text-amber-400`
- inline `rgb(245,158,11)`

### Login

- `text-slate-500`

### Rental

- `bg-[var(--nc-accent-soft)]`

### Email

- `text-slate-400`

### Settings

- `text-[var(--nc-accent)]`

## القيود

ممنوع أثناء cleanup:

- تغيير Layout.
- تغيير Spacing.
- تغيير Responsive behavior.
- تغيير Component behavior.
- تعديل النصوص.
- تعديل API/Data.
- Refactor واسع.
- تغيير الهوية العامة.

## القرار

- أغلق Dark أولًا.
- أغلق الصفحات الداخلية في Light.
- Landing/Login يمكن توثيقهما كمسار منفصل فقط إذا احتاج الإصلاح Redesign، لا Class-only.

---

## FILE: `P3_QUALITY/15_ACCESSIBILITY.md`

# P3 — Accessibility

## الحالة

`IN PROGRESS`

## المنجز جزئيًا

- Labels.
- بعض ARIA fixes.
- Keyboard considerations.
- Contrast work.
- Responsive checks.

## المتبقي

- Full-route audit.
- Semantic HTML.
- Focus order.
- Focus visibility.
- Screen-reader labels.
- Form error announcements.
- Modal/dialog semantics.
- Table semantics.
- Mobile navigation.
- Lighthouse/axe verification لكل الصفحات المهمة.

## شرط الإغلاق

- لا Critical/Serious accessibility violations في المسارات الحرجة.
- Keyboard-only flow يعمل.
- Focus واضح.
- Forms قابلة للفهم.
- نتائج موثقة على Desktop/Mobile وLight/Dark عند الحاجة.

---

## FILE: `P3_QUALITY/16_CARD_STRETCH_VISUAL_BACKLOG.md`

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

---

## FILE: `P3_QUALITY/17_ROUTE_MATRIX_TEST_GATES.md`

# P3 — Route Matrix وبوابات الاختبار

## الهدف

إثبات أن كل Route معتمد موجود ويعمل من `REDC/main`.

## الحد الأدنى للمصفوفة

لكل Route:

- المسار.
- الملف المصدر.
- Auth requirement.
- Role requirement.
- Tenant scope.
- Desktop.
- Mobile.
- Arabic/English.
- Dark/Light.
- Runtime status.
- 404/redirect/error state.
- Evidence.

## مثال حاسم

`/operations/revenue-integrity` أعاد 404 لأن Route غير موجودة في `main`.

## قواعد الاختبار

- لا تكرر Build/Tests على نفس HEAD والنطاق إذا كان الدليل صالحًا.
- نفذ فحصًا واحدًا محدودًا ثم تنفيذًا أوإغلاقًا واحدًا.
- لا تستخدم Build وحده كدليل Route.
- لا تستخدم screenshot وحدها كدليل إذا كان المسار غير ظاهر.
- لا تبدأ Final Trust QA قبل توحيد المصدر والDatabase.

---

## FILE: `P4_OPERATIONS/18_WORKING_RULES.md`

# P4 — قواعد العمل مع الوكلاء والمطورين

## قواعد صريحة

- لا تبدأ مشروعًا جديدًا؛ استخدم ORCA الحالي.
- رتّب العمل حسب المخاطر والعائد، لا حسب الصفحات فقط.
- لا تتخطى المراحل.
- الملاحظة الجديدة تدخل Backlog ولا تتحول إلى تنفيذ دون موافقة.
- Architecture Gate قبل Build عندما تكون البنية غير محسومة.
- لا تعدّل الكود أثناء Audit-only.
- لا تكرر Build/Tests/Audits المقبولة على نفس HEAD.
- لا تستخدم Prompt واسعًا.
- لكل وكيل Scope وOwnership واضح.
- لا تسمح بتداخل الملفات دون خطة.
- لا تسمح للوكيل بالتوقف عند “Recommendations for Next Agent”.
- يجب أن ينهي المهمة أويثبت Blocker حقيقيًا.
- لا تعتبر وجود الكود إغلاقًا.
- لا تعتبر Build إغلاقًا.
- تقارير ORCA تنتهي بحكم واضح.
- لا تحذف الأدلة؛ أرشفها.

## حالات الحكم

- Closed
- Partially Completed
- In Progress
- Blocked
- Not Started

## صيغة تقرير الإغلاق

1. ما تم إغلاقه واعتماده.
2. ما تبقى والحاجز التالي.

---

## FILE: `P4_OPERATIONS/19_REPOSITORIES_BRANCHES_STASHES.md`

# P4 — المستودعات والفروع والStashes

## Worktrees المحفوظة

| المسار | الفرع | HEAD وقت الحصر |
|---|---|---|
| REDC | main | 396f2bf |
| REDC-claude | work/claude-authorization-audit | 13f44ed |
| REDC-codex | work/codex-accessibility-v2 | 140654d |
| REDC-INTEGRATION | integration/revenue-integrity | 7663135 |
| REDC-LANGUAGE-THEME | refactor/language-theme-foundation | f03ad3e |
| REDC-login | work/login-final-design | 1632b8d |
| REDC-opencode | work/opencode-predictive-intellligence | 7cfad8a |
| REDC-security | work/security-final-closure | 2429f12 |

## ملاحظات

- تم حصر 17 فرعًا/مرجعًا و6 Stashes وReflog واسع وDangling commits أثناء تدقيق lineage.
- لم يتم العثور على Creation DDL مفقود للجداول الثلاثة داخل dangling commits.
- جمع الملفات يدويًا في `REDC` لا يثبت دمج Git history.

## Stash الحرج

- `wip-whatsapp-before-consolidation`
- hash: `dfab62b870d185dcaf077464bdb88429691dd2c5`

## قاعدة

لا تحذف أي Worktree أوStash قبل:
1. استخراج الملفات المطلوبة.
2. إثبات الدمج إلى `main`.
3. إغلاق Migration baseline.
4. توثيق الإغلاق.

---

## FILE: `P4_OPERATIONS/20_ARCHIVE_CLEANUP_PLAN.md`

# P4 — خطة الأرشفة والتنظيف

## القرار

`NO DELETE`

لا تحذف:

- Scripts.
- Reports.
- ZIPs.
- Backups.
- Worktrees.
- SQL.
- Migration evidence.
- Stashes.

## المجلد المقترح

`C:\Users\ali59\Desktop\ORCA-WORK-ARCHIVE`

## التقسيم

- `scripts`
- `reports`
- `zips`
- `backups`
- `worktrees`
- `misc`

## ما يبقى داخل REDC

- كود المشروع.
- ملفات الإعداد.
- `prisma`.
- Tests.
- Docs المعتمدة.
- Scripts التشغيلية المعتمدة فقط.

## التوقيت

التجميع النهائي مؤجل حتى إغلاق:

- Safe Main Integration.
- Historical Baseline Reconstruction.
- استخراج أي دليل Migration/Backup من المجلدات القديمة.

---

## FILE: `P4_OPERATIONS/21_DECISION_LOG.md`

# P4 — سجل القرارات الرئيسية

## قرارات المنتج

- ORCA منصة تشغيل عقاري، لا CRM تقليدي.
- السعودية أولًا ثم الخليج.
- Arabic-first.
- Enterprise Navy + Gold.

## قرارات التنفيذ

- لا Build قبل Architecture Gate عندما تكون البنية غير محسومة.
- لا مرحلة جديدة قبل إغلاق الحالية.
- لا إعادة اختبار بلا تغير في HEAD أوالنطاق.
- لا حذف للملفات؛ أرشفة فقط.

## قرارات الدمج

- `REDC/main` هو الهدف النهائي.
- لا تعتبر Worktree مصدرًا نهائيًا.
- Revenue Integrity ما زالت خارج `main`.
- Login المعتمد يجب حمايته أثناء الدمج.

## قرارات البيانات

- لا Migration writes على القاعدة الحالية حتى تصميم الـBaseline.
- Fresh database proof قبل Repair للقاعدة الحالية.
- لا `db push` كبديل عن migration lineage.

## قرارات الجودة

- Build لا يساوي Closed.
- Coming Soon لا يغلق الصفحات العامة.
- Color Contrast غير مغلق ما دامت المخالفات موجودة.
- Final QA محجوب حتى الدمج والـBaseline.

---

## FILE: `P4_OPERATIONS/22_STATUS_GLOSSARY.md`

# P4 — قاموس الحالات والرموز

## حالات العمل

### Closed

يوجد دليل اعتماد وتشغيل أواختبارات مناسبة على النطاق نفسه.

### Partially Completed

جزء مهم من العمل مكتمل، لكن شروط قبول رئيسية ما زالت مفتوحة.

### In Progress

تنفيذ فعلي جارٍ ولم يصل إلى بوابة قبول نهائية.

### Blocked

لا يمكن التقدم بأمان قبل إزالة حاجز محدد.

### Not Started

لم يبدأ تنفيذ قابل للإثبات.

## رموز المشروع الحالية

- `REVENUE_INTEGRITY_NOT_MERGED_INTO_REDC_MAIN`
- `SAFE_MAIN_INTEGRATION_REQUIRED`
- `HISTORICAL_BASELINE_RECONSTRUCTION_REQUIRED`
- `MIGRATION_ORDER_ARCHITECTURE_BLOCKER_CONFIRMED`
- `FIVE_CORE_PHASES_LOCALLY_CLOSED_AND_PUSHED`
- `META_PRODUCTION_ACCOUNT_REVIEW / ACTIVATION`
- `PARTIALLY_APPROVED / NEEDS_FOLLOW_UP`
- `NO_DELETE`
- `FINAL_PRE_LAUNCH_QA_BLOCKED`
