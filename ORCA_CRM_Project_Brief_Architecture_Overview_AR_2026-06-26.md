# ORCA CRM — Project Brief & Architecture Overview

**نوع الوثيقة:** وثيقة تسليم ونقل تقني شاملة  
**تاريخ اللقطة:** 26 يونيو 2026  
**الغرض:** تمكين فريق أو منصة تطوير جديدة من استلام ORCA CRM، فهم فكرته وهندسته وحالته الحالية، ثم استكمال التطوير دون فقد العمل المنجز أو تكرار الأخطاء السابقة.  
**التقدير الإداري:** نحو 80% من النطاق التشغيلي الأساسي مبني. هذه النسبة تقدير نطاقي، وليست دليلًا على جاهزية إنتاجية كاملة.  
**الحكم الحالي:** المراحل الأساسية الخمس مغلقة بدرجاتها الموثقة، لكن النسخة الموحّدة الحالية تحتاج إغلاق التجميع النهائي: إثبات حالة Git، فحص واسترجاع عمل واتساب المحفوظ، إغلاق سلسلة Migrations المتبقية، ثم Build/Acceptance/Production Verify على الـHEAD الموحّد.

---

## الملخص التنفيذي

ORCA CRM منصة تشغيل عقاري متعددة المستأجرين **Multi-Tenant Real Estate Operations Platform** موجهة لشركات التطوير العقاري، إدارة الأملاك، التأجير، المبيعات والتحصيل والدعم. تجمع المنصة دورة العميل والعقار والصفقة والتحصيل والتواصل في نظام واحد، بدل الاعتماد على واتساب وملفات Excel وأنظمة منفصلة.

المشروع الحالي هو **Modular Full-Stack Monolith** مبني على Next.js وTypeScript وPostgreSQL/Prisma. الواجهة والخادم وواجهات API ومنطق النطاق موجودة داخل تطبيق واحد منظم إلى وحدات وظيفية. لا يُوصى بتحويله إلى Microservices أثناء النقل؛ الأولوية هي تثبيت المصدر، إغلاق قاعدة البيانات، تشغيل حزمة القبول، ثم استكمال النواقص.

المصدر المرجعي الحالي للتجميع هو:

```text
Repository remote: https://github.com/ali599115225/orca_crm.git
Canonical workspace: C:\Users\ali59\Desktop\REDC-INTEGRATION
Canonical branch: integration/revenue-integrity
Reported consolidated HEAD: c5deccb
Production URL: https://orca.az-ez.pro
```

> ملاحظة حاكمة: قيمة `c5deccb` هي آخر HEAD مُبلغ عنه بعد دمج أعمال الأمن والتوافق. عند التسليم الفعلي يجب إثباتها مباشرة عبر `git rev-parse HEAD` مع `git status --short` فارغ، وعدم الاعتماد على التقرير النصي وحده.

## محتويات الوثيقة

1. فكرة المشروع والهدف والفئات المستهدفة.
2. النطاق الوظيفي وحدود المنتج.
3. التقنيات المستخدمة.
4. هندسة النظام وتدفق البيانات.
5. حالة المشروع الحالية والمراحل الخمس.
6. ما تم بناؤه ويعمل.
7. النواقص المتبقية ضمن 20%.
8. الأخطاء المتكررة والدروس المستفادة.
9. خارطة الطريق الفورية.
10. حزمة التسليم إلى منصة أخرى.
11. ملحق المستودعات والفروع والـCommits الحرجة.

---

# 1. فكرة المشروع والهدف الأساسي

## 1.1 فكرة المشروع

ORCA CRM هو نظام تشغيل عقاري موحد يربط دورة العميل بدورة الأصل العقاري ودورة الصفقة والتحصيل. يبدأ المسار من Lead أوContact، ثم Opportunity، والجولة، والعرض، والعقد، وخطة السداد، والفواتير والأقساط، وينتهي بالتحصيل والسجل التشغيلي والتدقيق.

المنصة لا تستهدف إدارة العملاء فقط؛ بل تعمل كطبقة تشغيل موحدة تجمع:

- CRM والمبيعات العقارية.
- المشاريع والمخزون والوحدات.
- العقود وخطط السداد والأقساط.
- إدارة الأملاك والتأجير.
- واتساب والبريد والمهام والتذكيرات والدعم.
- الأحداث والتدقيق والمزامنة اللحظية.
- التكاملات الحكومية والمالية ومزودي الذكاء الاصطناعي.

## 1.2 الهدف الأساسي

إنشاء **مصدر حقيقة تشغيلي واحد** لكل شركة عميلة، بحيث:

- تحمل كل البيانات نطاق `tenantId` واضحًا.
- تنتقل الصفقة بين مراحلها دون فقد أو تكرار.
- ترتبط الرسائل والمهام والعروض والعقود والمدفوعات بالعميل أوالفرصة الصحيحة.
- يعرف النظام من نفذ الإجراء ومتى وما الذي تغير.
- يمكن إضافة مزود خارجي جديد عبر Adapter ونماذج اتصال عامة، دون إضافة حقول خاصة داخل Tenant لكل مزود.
- يمكن تشغيل وكلاء ذكاء اصطناعي ضمن صلاحيات النظام، لا خارجها.

## 1.3 الفئة المستهدفة

### الشركات

- شركات التطوير العقاري.
- شركات إدارة الأملاك.
- شركات التأجير والتشغيل العقاري.
- ملاك المحافظ العقارية.
- مكاتب الوساطة متعددة الموظفين.
- فرق المبيعات والتحصيل وخدمة العملاء.

### المستخدمون داخل الشركة

- Tenant Admin ومدير الشركة.
- مدير المبيعات وموظفو المبيعات.
- مسؤول الجولات والعروض والعقود.
- مسؤول التأجير وإدارة الأملاك.
- مسؤول التحصيل والمالية.
- الدعم وخدمة العملاء.
- الإدارة التنفيذية.
- Super Admin للمنصة، بصلاحيات منفصلة عن مستخدم Tenant.

## 1.4 المشكلة التي يحلها

- تشتت بيانات العملاء بين واتساب وExcel وأجهزة الموظفين.
- انقطاع الربط بين العميل والفرصة والجولة والعرض والعقد والتحصيل.
- تكرار الإدخال أوإنشاء عقود وخطط دفع مكررة.
- ضياع المتابعات والمهام وعدم وضوح المسؤولية.
- غياب سجل تدقيق موحد.
- ضعف رؤية الإدارة لحالة المخزون والمبيعات والتحصيل والتأجير.
- صعوبة ربط كل شركة بمزوديها بطريقة آمنة ومعزولة.
- خطر تسرب البيانات بين Tenants.
- ظهور قيم تقنية خام مثل Enums وUUIDs ورسائل داخلية للمستخدم النهائي.

---

# 2. نطاق المنصة وحدود المنتج

## 2.1 الوحدات التشغيلية المبنية أوالموجودة

- Dashboard ومؤشرات الأداء.
- Leads وContacts وOpportunities.
- Tours والجولات والمعاينات.
- Offers والعروض والتفاوض.
- Sales Workspace بدورة بيع متعددة التبويبات.
- Contracts وPayment Plans وInvoices وInstallments وPayments.
- Projects وProperties وUnits والمخزون.
- Rental وعقود الإيجار والفواتير والتحصيل.
- WhatsApp والمحادثات والإسناد والأرشفة وإنشاء المهام.
- Email وTasks وReminders وHelpdesk.
- Settings وإدارة الفريق والصلاحيات.
- Deal Passport وDeal Events.
- Realtime Sync.
- AI Agents foundation.
- Integrations & Compliance architecture.
- Ejar وZATCA trust gates الأساسية.

## 2.2 حدود المنتج الحالية

النظام الحالي ليس بعد:

- نظام محاسبة عامة كاملًا.
- تكامل ZATCA إنتاجيًا كاملًا.
- تكامل Ejar إنتاجيًا كاملًا.
- مركز تكاملات Self-Service مغلقًا لكل المزودين.
- بوابة مالك أوTenant Portal كاملة.
- منصة Microservices.
- نظام DR وMonitoring مكتملًا بوثائق RPO/RTO واختبار Restore دوري.

---

# 3. التقنيات المستخدمة — Tech Stack

| الطبقة | التقنية | الاستخدام |
|---|---|---|
| اللغة | TypeScript | الواجهة، الخادم، APIs، منطق النطاق |
| Runtime | Node.js | تشغيل Next.js والأدوات والمهام |
| Framework | Next.js 16 | App Router، Server Components، Route Handlers، Server Actions |
| UI | React | المكونات والواجهات التفاعلية |
| Styling | Tailwind CSS + CSS Variables/Tokens | Responsive، Dark/Light، التصميم المشترك |
| ORM | Prisma | Schema وClient وMigrations |
| قاعدة البيانات | PostgreSQL | البيانات التشغيلية متعددة المستأجرين |
| مزود DB | Neon PostgreSQL | التطوير والفروع والإنتاج |
| الاستضافة | Vercel | Build وPreview وProduction |
| Source Control | Git + GitHub | الفروع والـWorktrees والمراجعات |
| CI/CD | GitHub Actions + Vercel Checks | CI، Deployment Check، Production Smoke |
| Backend APIs | Next.js Route Handlers + Server Actions | العمليات الخادمية |
| Realtime | Sync Events + Client Runtime | تحديث الشاشات والأحداث |
| التكاملات | Meta WhatsApp Cloud API | رسائل واردة وصادرة واتصالات لكل Tenant |
| الدفع | N-Genius + Paylink | روابط ومعاملات الدفع |
| البريد | Resend | مخطط ومؤجل تفعيله إنتاجيًا |
| الحكومة | ZATCA + Ejar | Trust Gates ومسارات تكامل جزئية |
| AI | Provider-Agnostic Layer | OpenAI، Gemini، Claude، Azure OpenAI/Microsoft Foundry |
| التشغيل المحلي | PowerShell 7 + npm | سكربتات الفحص والتشغيل والقبول |

## 3.1 إدارة البيئة والأسرار

المتغيرات الحساسة تشمل قاعدة البيانات والجلسات وواتساب والدفع والبريد والحكومة والـAI والـCron وWebhooks. القواعد:

- `.env` و`.env.local` غير متتبعة في Git.
- `.env.example` يحتوي Placeholders فقط.
- Runtime DB URL يمكن أن يكون pooled، لكن Prisma migrations تحتاج Direct URL.
- لا تُعرض Tokens للعميل.
- تُدوّر أسرار الإنتاج في آخر 24–48 ساعة قبل الإطلاق النهائي.
- تُنقل القيم عبر Secret Manager، لا عبر وثيقة التسليم.

---

# 4. مخطط المنصة والهندسة — System Architecture

## 4.1 النمط المعماري

التطبيق **Modular Full-Stack Monolith**. Next.js يجمع الواجهة والخادم وواجهات API والمصادقة والوصول إلى Prisma والتكاملات. وحدات النطاق منفصلة منطقيًا، لكنها تُنشر كتطبيق واحد.

## 4.2 طبقات النظام

```text
Browser / Mobile Web
        ↓
Next.js App Router + React UI
        ↓
Session + Tenant Context + RBAC
        ↓
Server Actions / Route Handlers / Webhooks
        ↓
Domain Rules and Services
        ↓
Prisma Client
        ↓
PostgreSQL / Neon
```

وبالتوازي:

```text
Domain Services
  ├─ Events / Audit / Deal Passport / Realtime
  ├─ WhatsApp / Payments / Email / Government Adapters
  └─ AI Provider-Agnostic Layer
```

## 4.3 قواعد معمارية لا يجوز كسرها

- Client Components لا تصل إلى قاعدة البيانات مباشرة.
- كل Mutation تمر عبر Server Action أوAPI محمي.
- كل عملية حساسة تتحقق من Session وRole وTenant scope خادميًا.
- `tenantId` لا يُعتمد من Client كمرجع ثقة.
- التكاملات الخارجية تمر عبر Adapters.
- الأسرار لا تُعاد إلى المتصفح.
- الأحداث والتدقيق يكتبان في نفس المعاملة عند الحاجة.
- لا تُعاد قواعد الأعمال إلى JSX أوصفحة منفردة.

## 4.4 الهيكلة المقترحة للحفاظ عليها

```text
app/
  operations/               صفحات ومساحات العمل
  api/                      Route Handlers / Webhooks / Cron
  actions/                  Server Actions
  context/                  Theme / Language / App context

components/
  views/                    واجهات نطاقية
  ui/                       Shared primitives

lib/
  domain/                   قواعس الأعمال
  auth/                     Session / RBAC / Tenant guards
  integrations/            Provider adapters
  display/                 Bilingual aliases and view models
  realtime/                Sync events and client runtime
  errors/                  Public error mapping
  audit/                   Audit and event helpers

prisma/
  schema.prisma
  migrations/
```

## 4.5 تدفق المستخدم والبيانات

1. يفتح المستخدم الصفحة.
2. تُقرأ الجلسة على الخادم.
3. يُشتق `userId` و`tenantId` والدور.
4. يُطبق Guard مناسب.
5. تُنفذ قراءة Prisma مقيدة بالـTenant.
6. تتحول القيم التقنية إلى View Models ثنائية اللغة.
7. تُعرض الواجهة.
8. أي تعديل يمر عبر Server Action أوRoute Handler.
9. تُطبق Validation وقواعد Domain وIdempotency.
10. تُحفظ البيانات ويكتب Audit/Event.
11. تُنشر إشارة Realtime أوتُحدث الواجهة.

## 4.6 تدفق الصفقة الأساسية

القواعس الحاكمة:

- قبول العرض Idempotent.
- إعادة قبول العرض لا تنشئ Contract أوPaymentPlan مكررًا.
- الدفعات الجزئية تحدث الرصيد والقسط التالي.
- السداد الكامل يغلق الالتزام.
- Overpayment يُرفض.
- Cross-Tenant access يُرفض.
- لا تُنشأ كيانات مالية يتيمة.

## 4.7 تدفق واتساب

```text
Inbound message
→ Webhook verification
→ Idempotency / Deduplication
→ Tenant and connection resolution
→ Contact / Lead resolution
→ Conversation persistence
→ Assignment
→ Task / Opportunity / Support action
→ Follow-up
→ Outbound message through Meta API
→ Audit and status update
```

متطلبات واتساب:

- اتصال مستقل لكل Tenant.
- حفظ credentials مشفرًا.
- عدم fallback إلى Tenant خاطئ.
- inbound/outbound في نفس المحادثة ونفس Tenant.
- Reauth وDisconnect آمنان.
- Webhook verification وdeduplication.

---

# 5. نموذج البيانات والنطاقات الأساسية

## 5.1 Multi-Tenancy

```text
Tenant
 ├─ Users / Employees / Roles
 ├─ Projects / Properties / Units
 ├─ Leads / Contacts / Opportunities
 ├─ Tours / Offers
 ├─ Contracts / Payment Plans / Invoices / Installments
 ├─ Rental Leases / Rental Invoices
 ├─ Messages / Tasks / Support
 ├─ Integration Connections / Credentials
 ├─ Deal Passports / Events / Sync
 └─ Audit / Telemetry
```

كل كيان تشغيلي يجب أن يحمل `tenantId` أويرتبط بسلسلة يمكن اشتقاقه منها. أي عملية Update/Delete تعتمد على `id` فقط تعد خطرًا أمنيًا.

## 5.2 أهم الكيانات

- Tenant وUser وEmployee.
- Project وProperty وUnit.
- Lead وContact وOpportunity.
- Tour وOffer.
- Contract وPaymentPlan وInvoice وInstallment وPaymentTransaction.
- RentalLease وRentalInvoice.
- Task وSupport Ticket وMessage.
- DealPassport وDealEvent.
- AuditLog وTelemetryEvent وSyncEvent.
- WhatsAppConnection وCredentials وSignupSession وPhoneNumber وContacts وMessages.
- Platform/Provider connections لمركز التكاملات.

## 5.3 حالة Migrations الحالية

تمت معالجة أجزاء مهمة من استمرارية قاعدة البيانات:

- Contacts baseline أُغلق في `af85521`.
- Sentinel command baseline أُغلق في `20c2f15`.
- سبب Sentinel كان جداول أُنشئت تاريخيًا عبر SQL patch خارج Prisma migrations.
- WhatsApp contacts baseline كان قيد الإغلاق عند إنشاء Stash قبل الدمج.
- بعد إنشاء `whatsapp_contacts` ظهر حاجز لاحق متعلق بغياب `whatsapp_messages` في سلسلة Fresh DB.

الحكم: **سلسلة Migrations تحسنت لكنها ليست مغلقة بالكامل بعد**. لا يجوز استخدام `prisma db push` كحل. المطلوب Fresh DB من الصفر حتى نهاية السلسلة مع Drift = 0.

---

# 6. حالة المشروع الحالية — ما تم إنجازه ضمن 80%

## 6.1 المراحل الخمس الأساسية

| المرحلة | ما تم إغلاقه | الحالة الحالية | المتبقي |
|---|---|---|---|
| Phase 01 — Transaction Spine | Offer → Contract → Payment Plan → Invoice → Installments، Idempotency وBackfill | مغلقة وظيفيًا وبيانيًا | لا إعادة بناء؛ تحقق فقط بعد النقل |
| Phase 02 — Deal Passport & Lifecycle | Passport، Deal Events، Timeline، الدفعات وإعادة الجدولة | مغلقة | Display aliases غير حاجبة لبعض labels |
| Phase 03 — Realtime Multi-Tenant Sync | Foundation، API/Cron، Deal/Sales Sync، Client Runtime | مغلقة | تحقق Regression بعد التجميع النهائي |
| Phase 04 — AI Agents Foundation | Provider-agnostic foundation، Safe fallback، telemetry، quotas | مغلقة وظيفيًا | تفعيل المزودين الخارجيين لكل Tenant |
| Phase 05 — Production Delivery Gate | GitHub CI، Vercel check، Production Smoke على baseline سابق | مغلقة للخط السابق | إعادة Verify للـHEAD الموحّد الحالي |

## 6.2 الوظائف المنجزة والمثبتة

### المبيعات والعقود

- Leads وContacts وOpportunities.
- Tours والجولات.
- Offers والتفاوض.
- قبول العرض وإنشاء عقد بيع.
- Payment Plan وInvoice وInstallments.
- دفعات جزئية وسداد مبكر وإعادة جدولة.
- Sales Workspace بسبعة تبويبات.
- Timeline وAmendments وDocuments.
- منع تكرار الكيانات في المسار الأساسي.

### المشاريع والمخزون

- Projects overview/detail.
- Properties list/detail.
- Units والمخزون وحالاته.
- ربط الوحدات بالفرص والعروض والعقود.

### الإيجارات

- عقود إيجار.
- Rental invoices والمدفوعات.
- مؤشرات تحصيل.
- Pagination ثابتة وInvoice modal.
- واجهة عربية/إنجليزية بدرجة متقدمة.

### العمليات الموحدة

- WhatsApp send/receive مثبت سابقًا على الإنتاج للحساب التشغيلي.
- Assign وArchive وCreate Task من المحادثة.
- Email وTasks وReminders وHelpdesk داخليًا.
- تنقل عالمي ومحلي لمساحة العمليات.

### الإدارة والواجهة

- Settings وإدارة الفريق.
- 5 صفوف مع Pagination في Staff table.
- إصلاح تحرك الأعمدة والقائمة الداكنة.
- Language/Theme foundation.
- Dark/Light وArabic/English في معظم الصفحات الأساسية.
- Login المعتمد بخلفية عقارية وشعار ORCA، دُمج في Integration عبر `af4f8b4`.

### الأمن والامتثال

تم دمج أعمال REDC-claude داخل Integration:

| المجال | Commit الناتج |
|---|---|
| Cron event metadata | `1c14c6f` |
| Ejar Saudi Trust Gates | `001d12c` |
| ZATCA Saudi Trust Gates | `8bc559a` |
| Authorization + Audit Infrastructure | `e0055bf` |
| DB-backed authorization hardening | `abb133f` |
| Authorization regression closure | `52796c6` |
| Accounting/Email/User Management hardening | `c5deccb` |

اختبارات `authorization-final.test.ts`: **26/26 PASS** بعد إصلاحات Tenant scope وSession وAudit.

## 6.3 حالة مساحات العمل

تم جرد 8 Worktrees. النتائج الأساسية:

- `REDC-INTEGRATION` هو مسار التجميع الحالي.
- `REDC` كان مصدر Login المعتمد، وتم حفظه ودمجه.
- `REDC-login` محاولة غير معتمدة ولا تُستخدم.
- `REDC-codex` Accessibility مطابق لما في التاريخ المدمج.
- `REDC-security` مطابق لما في التاريخ المدمج.
- `REDC-LANGUAGE-THEME` مطابق لما في التاريخ المدمج.
- `REDC-opencode` موجود داخل Integration.
- `REDC-claude` احتوى ستة Commits حقيقية وتم دمجها لاحقًا.

لا تُحذف Worktrees قبل نسخ احتياطي وإثبات أن كل العمل المطلوب في الفرع canonical.

---

# 7. النواقص المتبقية — أهم 20%

## 7.1 P0 — إغلاق التجميع الحالي

1. إثبات مباشر لـ:
   - الفرع الحالي.
   - `git rev-parse HEAD`.
   - `git status --short` فارغ.
   - عدم وجود Cherry-pick أوMerge أوRebase قائم.
2. إثبات وجود Stash:
   - `wip-whatsapp-before-consolidation`.
3. فحص محتواه قراءة فقط، ثم تطبيقه باستخدام `stash apply` وليس `pop`.
4. حل أي تعارض دون حذف تغييرات الدمج الأمني.
5. الحفاظ على WhatsApp contacts migration إن كانت داخل الـStash.

## 7.2 P0 — إغلاق سلسلة Migrations

- استكمال baseline لـ`whatsapp_contacts`.
- معالجة baseline المطلوب لـ`whatsapp_messages`.
- تشغيل `prisma migrate deploy` على قاعدة فارغة مؤقتة.
- `prisma migrate status` نظيف.
- `prisma migrate diff` = صفر فرق جوهري.
- عدم استخدام `db push`.
- عدم تشغيل Migration غير مجربة على Production.

## 7.3 P0 — Final Verify للنسخة الموحّدة

بعد استرجاع العمل وقبل Push:

- Prisma validate/generate.
- الاختبارات الأمنية المستهدفة.
- اختبارات Transaction Spine وRevenue Integrity الحرجة.
- Build كامل مرة واحدة.
- تشغيل محلي من المسار الصحيح.
- Smoke وظيفي للصفحات الأساسية.
- Push ثم Vercel deployment check.
- Production smoke على الـHEAD الجديد.

## 7.4 P1 — Integrations & Compliance Center

إكمال مركز موحد في:

```text
Settings > Integrations & Compliance
```

لـWhatsApp وPaylink وN-Genius وResend وZATCA وEjar وAI providers، مع:

- Connection واحدة لكل Tenant/Provider.
- Credentials مشفرة.
- Test connection.
- Webhook lifecycle.
- Default provider.
- Modify/Disconnect/Reauth.
- Onboarding لمن لا يملك حسابًا.
- حالات ثنائية اللغة.
- RBAC وAudit.

## 7.5 P1 — WhatsApp Self-Service

- Meta Embedded Signup لكل Tenant.
- lifecycle كامل للحالة والـreauth والـdisconnect.
- ربط WABA والرقم بالـTenant الصحيح.
- إغلاق UX المتبقي: modal، رقم المرسل المجهول، GCC selector، font، notifications، assigned-to-me، فتح أحدث محادثة.
- اختبار Production من حساب شركة فعلية.

## 7.6 P1 — التكاملات الخارجية

- Resend production sending وتوثيق الدومين.
- Paylink وN-Genius production credentials واختبارات callbacks.
- Ejar submission/status callbacks.
- ZATCA XML/QR/signing/clearance/reporting حسب المرحلة النظامية.
- Retry وIdempotency وReconciliation وAudit لكل مزود.

## 7.7 P1/P2 — المحاسبة

المنصة تحتوي عقودًا وفواتير وأقساطًا ومدفوعات، لكنها ليست General Ledger كاملًا. عند اعتماد هذا النطاق يلزم:

- Chart of Accounts.
- Journal Entries.
- Trial Balance.
- P&L وBalance Sheet وCash Flow.
- VAT engine.
- Period closing.
- Reconciliation وCredit Notes وRefunds.
- صلاحيات مالية وتدقيق غير قابل للتلاعب.

## 7.8 P2 — UI/UX وShared Primitives

- توحيد الجداول والكروت والEmpty states والStatus metadata.
- منع raw enums وUUIDs وJSON.
- إغلاق التسرب اللغوي ثنائي الاتجاه.
- تثبيت table layout والصفوف والpagination.
- إخفاء رسائل النجاح تلقائيًا.
- اختبار Contrast/Accessibility بعد التجميع النهائي.
- معالجة Turbopack panic أوتثبيت مسار تطوير محلي موثق باستخدام Webpack مؤقتًا.

## 7.9 P2 — Monitoring وDR

- Error monitoring مركزي.
- Webhook failure queue وRetry/DLQ.
- Integration health dashboard.
- سياسة Backup وRestore drill.
- RPO/RTO.
- Incident runbook.
- Audit retention وCron observability.

---

# 8. الأخطاء المتكررة والدروس المستفادة

| المشكلة المتكررة | السبب | قاعدة المنع مستقبلًا |
|---|---|---|
| تشغيل السيرفر من Worktree خاطئ | تعدد المجلدات والفروع | إثبات path/branch/HEAD قبل التشغيل |
| اعتبار Build دليل إغلاق | Build لا يثبت Runtime أوالبيانات | Build → Tests → Runtime → Production Smoke |
| ضياع عمل بين الفروع | تغييرات محلية وWorktrees متعددة | جرد Patch-ID وstatus قبل Merge |
| الاعتماد على اسم Commit فقط | Hash مختلف لنفس Patch | استخدم range-diff/cherry/patch-id |
| Schema Drift | SQL patches خارج migrations وسلاسل ناقصة | Fresh DB + migrate deploy، لا db push |
| تعارض Prisma schema | إضافات متوازية لنفس Model | دمج العلاقات يدويًا وعدم استخدام ours/theirs للملف كاملًا |
| Regression بعد الدمج | Commit لاحق أعاد منطقًا أقدم | اختبارات Gate بعد كل دفعة حساسة |
| خطأ Tenant scope | find/update/delete بالـid فقط | `tenantId` في كل Query وMutation واختبار Cross-Tenant |
| الوصول دون Session | Action أوAPI ناقص guard | Session/RBAC على الخادم قبل أي قراءة أوكتابة |
| تسرب raw enums | render مباشر للبيانات التقنية | Display aliases وView Models مركزية |
| تسرب اللغة | Maps محلية وSeed غير ثنائي | طبقة عرض مركزية واختبار اللغتين |
| تحرك الجداول | `table-layout:auto` ومحتوى متغير | fixed layout، widths، truncate، fixed row height |
| نجاح Sandbox يُعتبر إنتاجًا | الخلط بين Trial وProduction | Lifecycle إنتاجي End-to-End لكل مزود |
| Turbopack panic | مشكلة bundler محلية | توثيق `npm run dev -- --webpack` كحل مؤقت والتحقيق لاحقًا |
| PowerShell 5 بدل 7 | استدعاء `powershell` بدل `pwsh` | توحيد PowerShell 7 في Runbook |
| أوامر طويلة تنكسر عند اللصق | Pipes متعددة وسكربتات كبيرة | أوامر قصيرة أوملف ps1 موثوق ومراجع |
| تضخم عمل الوكيل | Prompt عام وغير محصور | دور + مسار + ملفات + قيود + قبول + نقطة توقف |
| تعديل الاختبار لتسهيل المرور | عدم فصل التشخيص عن التنفيذ | تشخيص قراءة فقط أولًا ثم إصلاح الحد الأدنى |
| CRLF/LF warnings | اختلاف Windows/Git | `.gitattributes` واضح وعدم اعتبار التحذير خطأ وظيفيًا |
| رسائل تقنية للمستخدم | Error codes بلا alias | Public error mapping مركزي |

## 8.1 قاعدة الإغلاق الصحيحة

لا يُعلن أي نطاق Approved إلا عند وجود:

```text
Code complete
+ Data/migration proof
+ Security/Tenant proof
+ Targeted tests
+ Runtime proof
+ Production verify عند الحاجة
+ Clean Git status
```

---

# 9. خارطة الطريق — أول ثلاث خطوات فورًا

## الخطوة الأولى: تثبيت المصدر واسترجاع عمل واتساب بأمان

- افتح `REDC-INTEGRATION` فقط.
- أثبت branch وHEAD وclean status.
- أثبت Stash `wip-whatsapp-before-consolidation`.
- اعرض الملفات والـstat دون أسرار.
- استخدم `stash apply` بعد إنشاء نقطة رجوع Git واضحة.
- حل التعارضات بملف ونطاق محددين.

**شرط الإغلاق:**

```text
Canonical branch confirmed
Stash applied safely
No lost files
Working tree understood
```

## الخطوة الثانية: إغلاق قاعدة البيانات من Fresh DB

- أنشئ Neon branch مؤقتًا فارغًا.
- استخدم Direct URL للمهاجرات.
- شغّل migrations من الصفر.
- أغلق `whatsapp_contacts` ثم `whatsapp_messages` baseline.
- تحقق من Drift = 0.
- أعد الاختبار على قاعدة فارغة ثانية.

**شرط الإغلاق:**

```text
Fresh migrate deploy = PASS
Migration status = clean
Schema diff = 0
No manual SQL required
```

## الخطوة الثالثة: Acceptance Pack ثم النشر

- Authorization: 26/26.
- Cross-Tenant tests.
- Transaction Spine.
- Revenue Integrity paths.
- Login والصفحات الأساسية.
- WhatsApp internal paths.
- Arabic/English وDark/Light.
- Build كامل.
- Vercel preview.
- Production smoke.

**شرط الإغلاق:**

```text
Core E2E = PASS
Build = PASS
Clean status = PASS
Deployment check = PASS
Production smoke = PASS
```

بعد هذه الخطوات يبدأ استكمال الـ20% دون إعادة فتح المراحل المغلقة.

---

# 10. خطة نقل المشروع إلى منصة أخرى

## 10.1 حزمة Source Code

- رابط Git الرسمي.
- canonical branch وcommit hash.
- Release tag.
- `git status` نظيف.
- قائمة الفروع/Worktrees غير المحذوفة.
- lockfile وNode version.
- أوامر install/build/dev.
- قائمة الملفات المحلية المستبعدة.

## 10.2 حزمة قاعدة البيانات

- `prisma/schema.prisma`.
- مجلد `prisma/migrations` كاملًا.
- تقرير Fresh DB.
- `migrate status` وdiff.
- Backup مشفر وتعليمات Restore.
- Seed/test data strategy.
- قائمة indexes/extensions/triggers.

## 10.3 حزمة Configuration

- `.env.example` بلا أسرار.
- Environment matrix: Local/Dev/Preview/Production.
- أسماء المتغيرات ومالك كل سر.
- Vercel/GitHub/Neon configuration.
- Cron schedules.

## 10.4 حزمة الخدمات الخارجية

- Meta App وWABA وWebhooks.
- N-Genius وPaylink.
- Resend والدومين.
- ZATCA وEjar.
- AI provider accounts.
- DNS وProduction domain.

## 10.5 حزمة الأدلة التشغيلية

- آخر Build ناجح.
- آخر Test reports.
- آخر Production Smoke.
- لقطات الصفحات الأساسية.
- Known issues.
- Runbook للتشغيل والRollback.
- قرارات معمارية ADRs.

## 10.6 استراتيجية النقل الموصى بها

1. Clone المستودع canonical.
2. تثبيت Node/package manager المطابق.
3. إنشاء PostgreSQL/Neon جديد.
4. تشغيل migrations من الصفر.
5. إثبات Drift = 0.
6. استيراد نسخة البيانات بعد Restore test.
7. نقل الأسرار عبر Secret Manager.
8. نشر Preview.
9. تحديث Webhooks إلى Preview للاختبار.
10. تشغيل Acceptance Pack.
11. نشر Production.
12. تحديث DNS/Webhooks.
13. مراقبة نافذة Cutover وRollback.

## 10.7 ما يجب تجنبه أثناء النقل

- تغيير Framework أوORM بالتزامن مع النقل.
- تحويل النظام إلى Microservices.
- نسخ `.env` يدويًا.
- تشغيل `db push` على الإنتاج.
- دمج UI refactor مع DB migration.
- حذف Worktrees قبل إثبات العمل.
- إعادة بناء صفحات أوPhase مغلقة دون Regression مثبت.

---

# 11. الملحق التشغيلي

## 11.1 المستودع والفرع الحاليان

```text
Remote: https://github.com/ali599115225/orca_crm.git
Workspace: C:\Users\ali59\Desktop\REDC-INTEGRATION
Branch: integration/revenue-integrity
Reported HEAD: c5deccb
```

## 11.2 Worktrees المرصودة

| المجلد | الغرض/الحالة |
|---|---|
| REDC-INTEGRATION | التجميع canonical الحالي |
| REDC | المصدر التاريخي الرئيسي ومصدر Login المعتمد |
| REDC-login | محاولة Login غير معتمدة |
| REDC-codex | Accessibility، Patch مطابق ومندمج |
| REDC-security | Security، Patch مطابق ومندمج |
| REDC-LANGUAGE-THEME | Language/Theme، Patch مطابق ومندمج |
| REDC-opencode | Predictive Intelligence/Conversation-to-Action، موجود في Integration |
| REDC-claude | مصدر أعمال Trust/Auth الستة، تم دمجها |

## 11.3 بوابات عدم البدء

لا يبدأ فريق جديد Feature Development قبل إغلاق:

- Canonical Git proof.
- WhatsApp stash resolution.
- Fresh DB migrations.
- Final acceptance and production verify.

## 11.4 الحكم النهائي للنقل

```text
Product concept: واضح ومستقر
Core modules: مبنية بدرجة عالية
Core phases 01–05: مغلقة وفق سجلاتها
Security/Auth hardening: مدمج واختبار 26/26
Database migration continuity: غير مغلقة بالكامل
WhatsApp pending local work: محفوظ ومتوقع داخل Stash، يحتاج إثبات وتطبيق
Current consolidated release: يحتاج Final Verify قبل الإنتاج
Estimated completion: ~80% of core operational scope
```

الخطوة الصحيحة ليست إعادة بناء المشروع؛ بل تثبيت المصدر، إغلاق قاعدة البيانات والتجميع، ثم متابعة النواقص المحددة فقط.
