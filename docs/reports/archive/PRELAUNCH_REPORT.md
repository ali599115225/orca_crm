# ORCA CRM – Pre-Launch Critical Fix Sprint Report

**تاريخ التقرير:** 8 يونيو 2026  
**الهدف:** تحويل ORCA CRM من مرحلة البناء إلى مرحلة التجربة مع أول 3 عملاء

---

## Task 1: Pricing Consistency

### All Price Sources Before Fix

| Location | File | Basic | Silver | Gold | Addon/Agent |
|----------|------|-------|--------|------|-------------|
| UI Display | `SettingsBilling.tsx` | 450 SAR | 900 SAR | 2,400 SAR | 250 SAR |
| Payment Action | `payment.ts` | **299 SAR** (29,900 hal) | **599 SAR** (59,900 hal) | **1,299 SAR** (129,900 hal) | **75/60 SAR** (7,500/6,000 hal) |
| Plan Names Used | `payment.ts` | `basic` | `professional` | `enterprise` | — |
| Plan Names Expected | `SettingsBilling.tsx` | `basic` | `silver` | `gold` | — |

### 🔴 Problems Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **أسعار مختلفة** – الواجهة تقول 450/900/2400، الكود يرسل 299/599/1299 | 🔴 حرجة – العميل سيدفع أقل مما يظهر |
| 2 | **أسماء خطط مختلفة** – الواجهة تستخدم `silver/gold`، الـ payment يستخدم `professional/enterprise` | 🔴 حرجة – قد يفشل الدفع |
| 3 | **سعر الإضافة (Addon) مختلف** – الواجهة تقول 250، الـ payment يرسل 75/60 | 🔴 حرجة |

### ✅ Fix Applied

| File | Change |
|------|--------|
| `app/actions/payment.ts` | `planPrices` → `basic: 45000, silver: 90000, gold: 240000` |
| `app/actions/payment.ts` | نوع الـ `plan` parameter → `"basic" | "silver" | "gold"` |
| `app/actions/payment.ts` | وصف الدفع → أسماء الخطط العربية الصحيحة |
| `app/actions/payment.ts` | سعر الـ Addon → `25000` halalas (250 SAR) موحد لجميع الباقات |
| `components/settings/SettingsBilling.tsx` | إزالة `paymentPlan` mapping – يمرر `plan` مباشرة |

### All Price Sources After Fix

| Location | Basic | Silver | Gold | Addon/Agent |
|----------|-------|--------|------|-------------|
| UI Display | 450 SAR | 900 SAR | 2,400 SAR | 250 SAR |
| Payment Action | 45,000 hal (450 SAR) | 90,000 hal (900 SAR) | 240,000 hal (2,400 SAR) | 25,000 hal (250 SAR) |
| Plan Names | `basic` | `silver` | `gold` | — |
| ✅ **مطابقة تامة** | ✅ | ✅ | ✅ | ✅ |

---

## Task 2: Broken Links

### Routes Found in UI

| Link | Location in UI | Status Before | Status After |
|------|----------------|---------------|--------------|
| `/privacy-policy` | LoginClient.tsx footer | 🔴 **مكسور** – لا يوجد page.tsx | ✅ تم إنشاء الصفحة |
| `/disclaimer` | LoginClient.tsx footer | 🔴 **مكسور** – لا يوجد page.tsx | ✅ تم إنشاء الصفحة |
| `/terms-and-conditions` | LoginClient.tsx footer | 🔴 **مكسور** – لا يوجد page.tsx | ✅ تم إنشاء الصفحة |

### Pages Created

| Route | File | Content |
|-------|------|---------|
| `/privacy-policy` | `app/privacy-policy/page.tsx` | سياسة الخصوصية والأمان |
| `/disclaimer` | `app/disclaimer/page.tsx` | إخلاء المسؤولية |
| `/terms-and-conditions` | `app/terms-and-conditions/page.tsx` | الأحكام والشروط |

### Other Routes Verified

| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ | يعمل – إعادة توجيه |
| `/login` | ✅ | يعمل |
| `/register` | ✅ | يعمل |
| `/operations/dashboard` | ✅ | موجود في الـ Sidebar |
| `/operations/leads` | ✅ | موجود في الـ Sidebar |
| `/operations/projects` | ✅ | موجود في الـ Sidebar |
| `/operations/properties` | ✅ | موجود في الـ Sidebar |
| `/operations/rental` | ✅ | موجود في الـ Sidebar |
| `/operations/calculator` | ✅ | موجود في الـ Sidebar |
| `/operations/offers` | ✅ | موجود في الـ Sidebar |
| `/operations/tours` | ✅ | موجود في الـ Sidebar |
| `/operations/marketing` | ✅ | موجود في الـ Sidebar |
| `/operations/campaigns` | ✅ | موجود في الـ Sidebar |
| `/operations/sales` | ✅ | موجود في الـ Sidebar |
| `/operations/agents` | ✅ | موجود في الـ Sidebar |
| `/operations/tasks` | ✅ | موجود في الـ Sidebar |
| `/operations/documents` | ✅ | موجود في الـ Sidebar |
| `/operations/whatsapp` | ✅ | موجود في الـ Sidebar |
| `/operations/helpdesk` | ✅ | موجود في الـ Sidebar |
| `/operations/settings` | ✅ | موجود في الـ Sidebar |
| `/operations/onboarding` | ✅ | لا يوجد رابط – يظهر بعد التسجيل |
| `/operations/health` | 🟡 | لا يوجد رابط – أداة تطوير (متعمد) |
| `/contract/[leadId]` | ✅ | رابط ديناميكي – يعمل |

---

## Task 3: Campaigns Page Bug

### Root Cause

`app/operations/campaigns/page.tsx` كان يستورد `MarketingView` من `@/components/views/MarketingView` بدلاً من `CampaignsView` من `@/components/views/CampaignsView`. هذا خطأ برمجي – `CampaignsView` موجود فعلياً في المجلد ولم يكن يُستخدم كصفحة مستقلة.

### Fix Applied

| Before | After |
|--------|-------|
| `import MarketingView from '@/components/views/MarketingView'` | `import CampaignsView from '@/components/views/CampaignsView'` |
| `<MarketingView />` | `<CampaignsView />` |

### Verification

- ✅ `CampaignsView.tsx` موجود ويحتوي على 576 سطراً من كود إدارة الحملات
- ✅ `CampaignsView` يصدر `Campaign` type + `RAW_CAMPAIGNS` mock data
- ✅ TypeScript compilation: لا أخطاء
- ✅ Tests: 18/18 passing

---

## Task 4: Dead Items Removal

### Items Found, Evaluated, and Removed

| Item | Path | Used By | Action |
|------|------|---------|--------|
| **AccountingView** | `components/views/AccountingView.tsx` | **0 imports** (باستثناء self) | 🗂️ **أرشفة** – نقل إلى `_archive` |
| **AdvancedErpView** | `components/views/AdvancedErpView.tsx` | فقط `WarRoomCommandPageClient` (وهو ميت) | 🗂️ **أرشفة** |
| **LogsViewer** | `components/views/LogsViewer.tsx` | فقط `WarRoomCommandPageClient` (وهو ميت) | 🗂️ **أرشفة** |
| **WarRoomCommandPageClient** | `app/operations/WarRoomCommandPageClient.tsx` | **0 صفحات تستخدمه** | 🗂️ **أرشفة** |
| `LeadsTabs.tsx.bak` | `components/views/tabs/` | نسخة قديمة | 🗑️ **حذف** |
| `PropertiesView.tsx.bak` | `components/views/` | نسخة قديمة | 🗑️ **حذف** |
| `ProjectsView.tsx.bak` | `components/views/` | نسخة قديمة | 🗑️ **حذف** |
| `rental/page.tsx.bak` | `app/operations/rental/` | نسخة قديمة | 🗑️ **حذف** |

### Total Cleanup

- **4 ملفات** منقولة إلى `_archive`
- **4 ملفات `.bak`** محذوفة
- **تخفيض كود:** ~2,500 سطر من الملفات الميتة

---

## Task 5: MVP Review

### MVP Core – صفحات العرض التجريبي

هذه الصفحات تمثل الـ 80% من قيمة المنتج. يجب التركيز عليها في الـ Demo:

| الترتيب | الصفحة | لماذا؟ |
|---------|--------|--------|
| 1️⃣ | `/operations/dashboard` | الانطباع الأول – الأرقام الحية تبيع المنتج |
| 2️⃣ | `/operations/leads` | Pipeline + WhatsApp + AI = القصة الفريدة |
| 3️⃣ | `/operations/properties` | المخزون العقاري – جوهر العمل |
| 4️⃣ | `/operations/rental` | العقود والمدفوعات + إيجار |
| 5️⃣ | `/operations/whatsapp` | تدفق الـ WhatsApp AI – لحظة "Wow" |
| 6️⃣ | `/operations/projects` | إدارة المشاريع للمطورين |
| 7️⃣ | `/operations/tours` | جدولة الجولات |
| 8️⃣ | `/operations/offers` | العروض العقارية |
| 9️⃣ | `/operations/tasks` | المهام والتذكيرات |
| 🔟 | `/operations/settings` | إعدادات المستخدمين والصلاحيات |

### Hidden / Future – صفحات أقل أولوية للتجربة

| الصفحة | السبب |
|--------|-------|
| `/operations/calculator` | ميزة هامشية – محاكاة غير متصلة ببنوك |
| `/operations/marketing` | يحتاج عميل لديه حملات إعلانية فعلية |
| `/operations/campaigns` | ميزة متقدمة للإطلاق الثاني |
| `/operations/sales` | تقارير KPI – قيمة إضافية بعد الاستخدام |
| `/operations/agents` | AI Agents مربكة في Demo – اشرحها شفهياً |
| `/operations/documents` | مستودع مستندات – مفهوم بسيط يحتاج شرح بسيط |
| `/operations/helpdesk` | دعم فني – ليس جزءاً من Core workflow |
| `/operations/health` | أداة تقنية – للمطور فقط |
| `/operations/onboarding` | تظهر فقط بعد التسجيل – تلقائي |

---

## Task 6: Demo Readiness Audit

### Lead → WhatsApp → AI → Property → Contract → Payment Flow

| Step | Status | Notes |
|------|--------|-------|
| **1. Lead Entry (Manual)** | ✅ **جاهز** | `getLeadsAction` مع Pagination، إنشاء ليد، تحديث حالة |
| **2. Lead via WhatsApp** | 🟡 **بحاجة ترتيب** | Saher agent يتطلب Green API نشط. للـ Demo استخدم mock chats. |
| **3. Saher AI Qualification** | 🟡 **محاكاة** | `processSaherWhatsAppLeadAction` موجود، ولكن AI يعمل بمحاكاة (ليس Gemini حقيقي في وضع التطوير) |
| **4. Property Selection** | ✅ **جاهز** | `getPropertiesAction` مع Pagination وعرض الوحدات |
| **5. Offer Creation** | ✅ **جاهز** | `OffersView` كامل مع ربط بالوحدات |
| **6. Tour Scheduling** | ✅ **جاهز** | `scheduleTourActionDirect` مع إشعار واتساب |
| **7. Unified Contract** | ✅ **جاهز** | `ContractView` → عقد حجز موحد مع بيانات الليد والوحدة |
| **8. Payment Processing** | 🟡 **بحاجة ترتيب** | Moyasar في وضع Mock – للـ Demo يعمل، للواقع يحتاج مفاتيح API حقيقية |
| **9. Ejar Registration** | 🟡 **بحاجة ترتيب** | `submitContractToEjarAction` موجود، ولكن API إيجار الفعلي يحتاج اعتماد |
| **10. Installment Tracking** | ✅ **جاهز** | Sanad agent مع تتبع الأقساط |

### Demo Flow Recommendation

للحصول على أفضل Demo، اتبع هذا المسار:

```
لوحة التحكم (نظرة عامة)
    ↓
العملاء (إنشاء ليد يدوي + إظهار Pipeline)
    ↓
واتساب (إظهار mock chat + كيف يستقبل AI)
    ↓
العقارات (إضافة وحدة + عرض المخزون)
    ↓
العقود (إصدار عقد لليد + الوحدة)
    ↓
الإعدادات (إضافة مستخدم + إظهار حدود الباقة)
```

⚠️ **لا تظهر AI Agents (الوكلاء) في Demo الأول** – ستشتت الانتباه. اشرحها فقط إذا سأل العميل.

---

## Task 7: Launch Readiness Score

| Area | Score | التعليق |
|------|-------|---------|
| **Pricing Consistency** | ✅ **10/10** | تم توحيد جميع الأسعار – الواجهة والدفع متطابقان الآن |
| **Navigation** | ✅ **9/10** | جميع الروابط تعمل. 3 صفحات جديدة تم إنشاؤها. الخصم: Health page بدون رابط (متعمد) |
| **Demo Readiness** | ✅ **8/10** | Core flow يعمل. AI Agents محاكاة. Moyasar في وضع Mock. Ejar يحتاج API حقيقي |
| **User Experience** | 🟡 **6/10** | لا توجد loading/error boundaries. صفحة الـ Rental ضخمة (1692 سطراً). يحتاج تحسين أداء |
| **Trust Factors** | ✅ **9/10** | صفحات الخصوصية والشروط موجودة الآن. Audit Logging نشط. Sentry مثبت |
| **MVP Clarity** | ✅ **8/10** | تم تحديد 10 صفحات Core للـ Demo. الملفات الميتة أزيلت. المحتوى أوضح |
| **المعدل العام** | ✅ **8.3/10** | |

---

## Final Decision

### 🟢 YES – جاهز للعروض التجريبية

**السبب:**

تم إصلاح جميع المشاكل الحرجة التي كانت تمنع العرض:

| المشكلة | الحالة |
|---------|--------|
| 🔴 أسعار غير متسقة (الواجهة vs الدفع) | ✅ **تم الإصلاح** |
| 🔴 روابط مكسورة (privacy, disclaimer, terms) | ✅ **تم الإصلاح** |
| 🔴 صفحة Campaigns تعرض محتوى خاطئ | ✅ **تم الإصلاح** |
| 🟡 مكونات ميتة تشوش على الكود | ✅ **تمت الأرشفة** |
| 🟡 أي مبهم في قيمة المنتج | ✅ **MVP واضح – 10 صفحات Core** |

**بقي ملاحظات غير مانعة:**

| الملاحظة | التأثير |
|----------|---------|
| AI Agents (Saher, Sanad) تعمل بمحاكاة – يحتاج Gemini API حقيقي | 🟢 مقبول – للـ Demo المحاكاة كافية |
| Ejar Integration يحتاج مفاتيح API حقيقية | 🟢 مقبول – Demo يظهر الواجهة فقط |
| لا يوجد تطبيق جوال | 🟢 مقبول – MVP يركز على Web أولاً |
| صفحة الـ Rental ضخمة وتحتاج إعادة هيكلة | 🟢 مقبول – تعمل حالياً |

**توصية:** ابدأ بجلسات Demo مع 3 مكاتب عقارية هذا الأسبوع. ركز على القصة: Lead → WhatsApp → Property → Contract. لا تذكر AI Agents إلا إذا سألوا.
