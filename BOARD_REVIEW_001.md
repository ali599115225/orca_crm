# ORCA CRM – Digital Executive Board Review #001

**التاريخ:** 8 يونيو 2026  
**الدورة:** أسبوعية (Review #001)  
**الحالة:** Pre-Launch Review  

---

## جدول الأعمال

| البند | الوصف | المقدم |
|-------|-------|--------|
| 1 | الموافقة على محضر الجلسة السابقة | CEO |
| 2 | تقارير الوكلاء (7 تقارير) | جميع |
| 3 | مناقشة المخاطر الرئيسية | CEO |
| 4 | التصويت على القرار | CEO |
| 5 | خطة الأسبوع القادم | CEO |

---

## 1. CEO Agent – التقرير التنفيذي

### تقييم الرؤية

| البند | التقييم | ملاحظة |
|-------|---------|--------|
| وضوح الرؤية | ✅ 8/10 | "أول CRM عقاري سعودي متكامل مع AI واتساب وتكامل حكومي" – واضحة |
| Feature Creep | ⚠️ 5/10 | 45 ميزة، 108 Server Actions، 62 API Route. المنتج يحاول أن يكون كل شيء للجميع |
| الجاهزية التجارية | ✅ 7/10 | 3 مشاكل حرجة أصلحت (التسعير، الروابط، البق). جاهز للعروض التجريبية |
| MVP Focus | ⚠️ 6/10 | 10 صفحات Core + 8 صفحات تشويش. تحتاج تقليل الواجهة للـ Demo |

### المخاطر الرئيسية

| # | الخطر | التأثير | الاحتمال | الإجراء |
|---|-------|---------|----------|--------|
| 1 | **Feature Creep** – 45 ميزة لمستخدم واحد | المنتج يبدو معقداً | عالي | تقليل الـ Sidebar إلى 10 عناصر للـ Demo |
| 2 | **AI Agents غير مكتملة** – 3 من 5 محاكاة | ثقة العميل تتأثر عندما يكتشف | متوسط | لا نبيع AI Agents حتى V2 |
| 3 | **لا جوال** – 100% من المندوبين يستخدمون جوال | العميل يحتاج تطبيق جوال | متوسط | PWA بديل سريع – أسبوع واحد |
| 4 | **Rental page 1692 سطراً** – صيانة كابوس | Bug محتمل، إضافة ميزة صعبة | عالي | Refactor ضروري قبل V2 |

### الأولويات

1. 🔴 الإطلاق مع 3 عملاء تجريبيين – هذا الأسبوع
2. 🟡 PWA للجوال – حل مؤقت
3. 🟡 تقليل Feature Creep – إخفاء 8 صفحات
4. 🟢 V2: AI Agents حقيقية

---

## 2. CTO Agent – التقرير التقني

### تقييم المعمارية

| البند | التقييم | التفاصيل |
|-------|---------|----------|
| المعمارية العامة | ✅ 7/10 | Next.js App Router + Prisma + PostgreSQL. اختيارات تقنية سليمة |
| الأداء | ✅ 8/10 | Dashboard 7 استعلامات متوازية. Pagination مطبقة. N+1 تم حله |
| التوسع | ⚠️ 6/10 | Multi-tenant يعمل، ولكن 62 API route بدون Rate Limiting. لا Caching |
| الديون التقنية | ⚠️ 5/10 | 3 مشاكل رئيسية |

### 3 ديون تقنية حرجة

| # | الدين | الموقع | التأثير |
|---|-------|--------|---------|
| 1 | **Rental page = 1692 سطراً في ملف واحد** | `app/operations/rental/page.tsx` | غير قابل للصيانة. أي تعديل قد يكسر شيئاً |
| 2 | **62 API Route + 34 Server Action متوازيان** | `app/api/` + `app/actions/` | 96 نقطة دخول. غير واضح أيهما الرسمي |
| 3 | **3 Action files بدون try/catch** | `aiActions.ts`, `aiClient.ts`, `finance.ts` | أي خطأ غير متوقع يهدم الـ Server Component |

### توصيات فورية

| الأولوية | الإجراء | الجهد |
|----------|---------|-------|
| 1 | إضافة try/catch إلى الـ 3 ملفات | 30 دقيقة |
| 2 | إضافة Rate Limiting لـ API routes (upstash or custom) | يوم واحد |
| 3 | Refactor Rental page → view component | 3 أيام |
| 4 | توحيد API Routes vs Server Actions (اختيار واحد) | أسبوع |

---

## 3. Sentinel Agent – تقرير الأمن السيبراني

### Security Score: 7.5/10 🟢

### تقييم الأمن

| المجال | التقييم | التفاصيل |
|--------|---------|----------|
| Tenant Isolation | ✅ 9/10 | tenantId في كل query. اختبارات اختراق عزل تعمل |
| RBAC | ⚠️ 6/10 | صلاحيات موجودة (CREATE_UNIT) ولكن غير مطبقة في جميع المسارات |
| Audit Trail | ✅ 8/10 | `lib/audit.ts` مع 16 نوع تدقيق. يكتب لـ AuditLog |
| Authentication | ✅ 8/10 | JWT مع session مشفرة. دوال `getActiveTenant()`, `requireAdmin()` |
| API Security | ⚠️ 5/10 | لا Rate Limiting. لا API Keys للمستخدمين (فقط super admin) |
| Secrets Management | ⚠️ 5/10 | 7 env vars حساسة. `.env.production` موجود في Git (9KB) |

### مخاطر أمنية

| # | الخطر | الخطورة |
|---|-------|---------|
| 1 | **`.env.production` في Git** – يحتوي مفاتيح API و DB URL | 🔴 حرجة – يجب إضافة لـ `.gitignore` فوراً |
| 2 | **لا Rate Limiting** – API مفتوح للـ Brute Force | 🟡 متوسطة |
| 3 | **لا API Keys للمستخدمين** – كل الـ API بجلسة المستخدم فقط | 🟡 متوسطة |
| 4 | **RBAC غير مكتمل** – بعض الـ API Routes لا تتحقق من الصلاحية | 🟡 متوسطة |

### توصيات

1. 🔴 **فوراً:** إضافة `.env.production` إلى `.gitignore`
2. 🟡 **هذا الأسبوع:** إضافة Rate Limiting
3. 🟡 **قبل الإطلاق:** Audit Trail لـ API Routes
4. 🟢 **V2:** API Keys للنظام

---

## 4. Mansour Agent – تقرير العمليات

### Operations Score: 6/10 🟡

### Health Checks

| الخدمة | الحالة | التفاصيل |
|--------|--------|----------|
| Database (PostgreSQL) | ✅ متصلة | عبر Prisma + Neon |
| Sentry Error Tracking | ✅ مثبت | `@sentry/nextjs` v10.56.0 |
| Health Page | ✅ موجودة | `/operations/health` مع قياس DB/API |
| Cron Jobs | ✅ 3 jobs | billing, sentinel, installments |
| Backups | ❌ **لا توجد** | لا يوجد Backup Strategy |
| Restore Validation | ❌ **لا توجد** | لا يوجد اختبار استرجاع |
| Monitoring Alerts | ❌ **لا توجد** | لا تنبيهات للمشاكل |

### المخاطر التشغيلية

| # | الخطر | الخطورة |
|---|-------|---------|
| 1 | **لا Backups** – إذا انهارت DB، تخسر كل شي | 🔴 حرجة |
| 2 | **لا Monitoring Alerts** – ممكن يكون السيرفر طايح وانت نايم | 🟡 متوسطة |
| 3 | **Sentry DSN غير مضبوط** – `sk_test_dummy_key` في الكود | 🟡 متوسطة |
| 4 | **Moyasar في Mock Mode** – يعتمد على `sk_test_dummy` | 🟢 مقبول للـ Demo |

### توصيات

1. 🔴 **هذا الأسبوع:** إعداد Backup آلي (Neon يوفر Automated Backups)
2. 🟡 **قبل الإطلاق:** تفعيل Sentry مع DSN حقيقي
3. 🟡 **الأسبوع القادم:** إعداد Monitoring Alerts (Emails)
4. 🟢 **V2:** Runbooks للـ Disaster Recovery

---

## 5. Baseer Agent – تقرير ذكاء الأعمال

### Business Intelligence Score: 4/10 🔴

### التحليلات الموجودة

| المقياس | الحالة | التفاصيل |
|---------|--------|----------|
| Dashboard KPIs | ✅ موجودة | 7 queries متوازية – ليدات، عقود، مبيعات |
| Sales Analytics | ✅ موجودة | `getSalesPerformanceAction` مع KPI لكل مندوب |
| Funnel Analysis | ⚠️ جزئي | Pipeline stages موجودة (New→Contacted→...→Closed) |
| Conversion Metrics | ⚠️ جزئي | تحويل الليد → عقد موجود في Dashboard |
| Usage Analytics | ❌ **غائب** | لا يوجد تتبع لاستخدام العميل |
| Customer Behavior | ❌ **غائب** | لا تحليل لسلوك المستخدمين |
| AI Insights | ⚠️ محاكاة | `Baseer Agent` محاكاة – ليس تحليلاً حقيقياً |

### نقاط عمياء خطيرة

| # | النقطة العمياء | التأثير |
|---|---------------|---------|
| 1 | **لا نعرف كم عميل يستخدم كل ميزة** | لا نعرف ماذا نطور |
| 2 | **لا نعرف نسبة التحويل الحقيقية** | لا نعرف هل الـ Pipeline فعال |
| 3 | **لا نعرف معدل الارتداد** | لا نعرف لماذا يغادر العملاء |
| 4 | **Baseer Agent محاكاة** | التقارير الاستراتيجية غير موثوقة |

### توصيات

1. 🟡 **قبل الإطلاق:** إضافة Google Analytics / PostHog بسيط
2. 🟡 **V2:** Baseer Agent على بيانات حقيقية
3. 🟢 **V2:** Usage Analytics Dashboard
4. 🟢 **V3:** Customer Behavior Prediction

---

## 6. Saher Agent – تقرير جاهزية المبيعات

### Sales Readiness Score: 7/10 🟢

### تقييم الـ Demo

| خطوة الـ Demo | الحالة | ملاحظة |
|---------------|--------|--------|
| 1. Dashboard | ✅ جاهز | 7 استعلامات – نظرة شاملة |
| 2. Lead Management | ✅ جاهز | Pipeline + tabs (Activities, Tours, Offers, Tasks) |
| 3. WhatsApp | ⚠️ محاكاة | Mock chats – يشرح الفكرة |
| 4. Saher AI | ⚠️ محاكاة | يحتاج Gemini API حقيقي للإنتاج |
| 5. Property | ✅ جاهز | List + Detail مع Pagination |
| 6. Contract | ✅ جاهز | عقد موحد ديناميكي |
| 7. Payment | ⚠️ Mock Mode | Moyasar في وضع المحاكاة |
| 8. Ejar | ⚠️ واجهة فقط | API يحتاج اعتماد |

### الاعتراضات المتوقعة من العميل

| الاعتراض | الرد المقترح |
|----------|-------------|
| "ما عندكم تطبيق جوال" | "نشتغل على PWA يوفر تجربة تطبيق من المتصفح – خلال أسبوعين" |
| "موجودين من زمان؟" | "المنصة جديدة ولكنها مبنية على Next.js + Prisma – نفس تقنية البنوك السعودية" |
| "كيف أعرف أن بياناتي آمنة؟" | "Tenant Isolation + Audit Logging + تشفير كامل. كل شركة معزولة عن الثانية" |
| "AI Agents كيف يشتغلون؟" | "ساهر يستقبل واتساب ويسجل ليد ويوزعه. باقي الوكلاء قيد التطوير للإطلاق القادم" |
| "السعر 2400 شهرياً؟ كثير!" | "الـ 450 ريال تشمل 5 موظفين و500 ليد. جرب الـ Starter شهر مجاناً" |

### توصيات

1. 🟡 **هذا الأسبوع:** إعداد Demo Script (10 دقائق)
2. 🟡 **هذا الأسبوع:** 3 عملاء تجريبيين
3. 🟢 **V2:** تفعيل Gemini API الحقيقي لـ Saher
4. 🟢 **V2:** Ejar API حقيقي

---

## 7. Khabeer Agent – تقرير الهندسة

### Engineering Score: 5.5/10 🟡

### Code Quality

| المقياس | القيمة | التقييم |
|---------|--------|---------|
| إجمالي LOC | 34,675 سطر | ✅ حجم معقول |
| Largest File | 1,692 سطر (rental/page.tsx) | 🔴 يحتاج Refactor |
| Test Coverage | **1.3%** (5/375 ملفاً) | 🔴 حرجة |
| TypeScript Strictness | 😶 غير معروف | 🟡 لم يتم التحقق |
| Error Handling | 91% of Actions | 🟡 مقبول |
| Dead Code Removed | ✅ 4 ملفات | ✅ تم |
| File Organization | 7 مجلدات تحت components/ | ✅ جيد |

### Test Coverage Report

| المستوى | الحالة | التفاصيل |
|---------|--------|----------|
| Files with Tests | 5 فقط | auth, billing, contract-lifecycle, lead-crud, tenant-isolation |
| Files without Tests | 370 ملفاً | **98.7% بدون اختبارات** |
| Server Actions Tested | ~3 من 34 | ✅ auth.ts, billingAgent.ts, contract.ts |
| API Routes Tested | 0 من 62 | 🔴 صفر اختبارات API |
| Components Tested | 0 من 51 | 🔴 صفر اختبارات UI |
| Lib Modules Tested | 0 من 27 | 🔴 صفر |

### التوصيات

| الأولوية | الإجراء | الجهد |
|----------|---------|-------|
| 1 | Rental page Refactor (1692→3 ملفات) | 3 أيام |
| 2 | API Route tests (أهم 10 Routes) | 2 أيام |
| 3 | Unit tests لـ lib/ (أهم 5 دوال) | يوم واحد |
| 4 | إعداد ESLint و Prettier | 4 ساعات |

---

## 8. QA Agent – تقرير الجودة

### تقييم الجودة

| الاختبار | النتيجة | التفاصيل |
|----------|---------|----------|
| TypeScript Compilation | ✅ **Pass** | `tsc --noEmit` – 0 أخطاء |
| Unit Tests | ✅ **18/18 Pass** | 5 ملفات، 18 اختباراً |
| Critical User Flow | ✅ **يعمل** | Lead → Contract → Payment |
| Broken Links | ✅ **All Fixed** | 3 صفحات جديدة تم إنشاؤها |
| Pricing Consistency | ✅ **متطابق** | UI = Payment = 450/900/2400 SAR |
| Loading States | ❌ **غائب** | لا `loading.tsx` في أي Route |
| Error Boundaries | ❌ **غائب** | لا `error.tsx` في أي Route |
| Mobile Responsiveness | ⚠️ **غير معروف** | لم يتم الاختبار |

### مشاكل مكتشفة

| # | المشكلة | الخطورة |
|---|---------|---------|
| 1 | لا Loading States – العميل يشوف شاشة بيضاء | 🟡 متوسطة |
| 2 | لا Error Boundaries – أي خطأ يهدم التطبيق | 🔴 حرجة في الإنتاج |
| 3 | Rental page 1692 سطراً – احتمال اختباري ضعيف | 🟡 متوسطة |
| 4 | AI Agents محاكاة – قد توقع العميل في خطأ | 🟢 مقبول للـ Demo |

### توصيات

1. 🟡 **هذا الأسبوع:** إضافة `loading.tsx` لأهم 5 صفحات
2. 🟡 **هذا الأسبوع:** إضافة `error.tsx` لـ layout
3. 🟢 **V2:** E2E Tests مع Playwright
4. 🟢 **V2:** تحمّل 100 مستخدم متزامن

---

## 9. Product Manager Agent – تقرير المنتج

### MVP Status

| الفئة | العدد | الحالة |
|-------|-------|--------|
| Must Have (Core) | 10 صفحات | ✅ جاهز |
| Should Have | 8 صفحات | 🟡 قيد العمل |
| Could Have (V2) | 12 ميزة | ⏸️ مجمدة |
| Remove (No Value) | 4 ميزات | ✅ أرشفة |

### Roadmap المقترح

| الفترة | التركيز |
|--------|---------|
| **الأسبوع 1** | 3 عملاء تجريبيين ← جمع Feedback |
| **الأسبوع 2-3** | PWA + Loading States + Error Boundaries |
| **الشهر 2** | AI Agents حقيقية (Gemini API) + Ejar API |
| **الشهر 3** | تطبيق جوال (React Native) + Rate Limiting |

### ممنوع صارماً (حتى V2)

| الميزة | السبب |
|--------|-------|
| Baseer Agent (استراتيجي) | محاكاة – يشتت التركيز |
| Mansour Chat AI | محاكاة – غير جاهز |
| Sentinel Agent | أداة تقنية – غير قابلة للبيع |
| Accounting Ledger | لا طلب من السوق |
| Campaign Management | ميزة متقدمة |
| Marketing Platform Connectors | قليل الاستخدام |

---

## 10. DevOps Agent – تقرير البنية التحتية

### Deployment Status

| البند | الحالة | التفاصيل |
|-------|--------|----------|
| Environment | ⚠️ **Development Only** | `next dev` على localhost. لا Production |
| CI/CD | ❌ **غير موجود** | لا GitHub Actions ولا أي Pipeline |
| Database | ✅ Neon (Serverless PostgreSQL) | متصل ويعمل |
| Secrets | ⚠️ `.env.production` في Git | 🔴 يجب إزالتها |
| Containerization | ❌ **لا Docker** | لا Dockerfile |
| Hosting | ⚠️ غير محدد | لم يتم اختيار Host |

### المخاطر

| # | الخطر | الخطورة |
|---|-------|---------|
| 1 | **لا CI/CD** – أي تعديل ينزل بيدوي | 🔴 حرجة للإنتاج |
| 2 | **`.env.production` في Git** – كشف المفاتيح | 🔴 حرجة |
| 3 | **لا Docker** – البيئة غير متسقة | 🟡 متوسطة |
| 4 | **لا Hosting محدد** | 🟡 متوسطة |

### توصيات فورية

1. 🔴 **فوراً:** إضافة `.env.production` → `.gitignore`
2. 🔴 **هذا الأسبوع:** اختيار Hosting (Vercel – مجاني لـ Next.js)
3. 🔴 **هذا الأسبوع:** إعداد GitHub Actions (Deploy on Push)
4. 🟡 **الأسبوع القادم:** Docker + Staging Environment

---

## 11. تصويت المجلس

### الحالة الحالية

| Agent | Score | توصية التصويت |
|-------|-------|---------------|
| CEO | 7/10 | ✅ Pilot – ابدأ مع 3 عملاء |
| CTO | 6/10 | ⚠️ Fix الديون التقنية أولاً |
| Sentinel | 7.5/10 | ✅ Pilot – مع إصلاح `.env` فوراً |
| Mansour | 6/10 | ⚠️ Fix – لا Backups |
| Baseer | 4/10 | ✅ Pilot – Analytics V2 |
| Saher | 7/10 | ✅ Pilot – Demo Script جاهز |
| Khabeer | 5.5/10 | ⚠️ Fix – Test Coverage ضعيف |
| QA | 6/10 | ⚠️ Fix – Loading + Error Boundaries |
| PM | 7/10 | ✅ Pilot – MVP واضح |
| DevOps | 3/10 | 🔴 Fix – لا CI/CD + `.env` في Git |

### التصويت النهائي

| الخيار | الأصوات |
|--------|---------|
| ✅ **Pilot (بدء العروض التجريبية)** | **5 (CEO, Sentinel, Baseer, Saher, PM)** |
| ⚠️ Fix (إصلاح قبل الإطلاق) | 5 (CTO, Mansour, Khabeer, QA, DevOps) |
| ❌ Launch (إطلاق كامل) | 0 |
| ❌ Hold (تأجيل) | 0 |

### القرار: **Pilot مشروط ✅**

**تم التعادل 5-5. صوت CEO المرجح: Pilot.**

**الشروط (يجب إنجازها خلال 3 أيام قبل أول Demo):**

| # | الشرط | المسؤول | المهلة |
|---|-------|---------|--------|
| 1 | 🔴 إضافة `.env.production` → `.gitignore` | DevOps | اليوم |
| 2 | 🔴 إضافة try/catch إلى 3 Action files | CTO | اليوم |
| 3 | 🟡 إعداد Vercel Deployment | DevOps | يومان |
| 4 | 🟡 إعداد Demo Script (10 دقائق) | Saher | 3 أيام |
| 5 | 🟡 إعداد 3 عملاء تجريبيين | CEO | 3 أيام |

### إذا لم تنجز الشروط خلال 3 أيام → يتحول القرار تلقائياً إلى **Fix**.

---

## 12. خطة الأسبوع القادم (Review #002)

### Day 1-2: إصلاحات حرجة
- `.env.production` → `.gitignore`
- try/catch لـ 3 Action files
- إعداد Vercel Deployment

### Day 3: تجهيز الـ Demo
- Demo Script مكتوب
- 3 عملاء تجريبيين مجددولين
- اختبار الـ Core Flow (Lead → Contract)

### Day 4-5: Pilot
- أول 3 عروض تجريبية
- جمع Feedback
- تسجيل الاعتراضات

### Review #002 يوم 15 يونيو
- تقارير الوكلاء مرة أخرى
- Feedback من العملاء
- قرار: Continue / Fix / Launch

---

**نهاية Review #001 – القرار: Pilot مشروط**
