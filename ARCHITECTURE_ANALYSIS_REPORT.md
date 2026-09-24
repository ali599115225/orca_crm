# 📊 تقرير تحليل معمارية ORCA CRM الشامل

**تاريخ التقرير:** 26 يونيو 2026  
**الحالة:** تحت الفحص والنقل  
**نسبة الإنجاز:** 80% من النطاق الأساسي

---

## 📋 جدول المحتويات

1. ملخص المشروع التنفيذي
2. رؤية معمارية شاملة
3. التقنيات والأدوات
4. تحليل الحالة الحالية
5. التوصيات الفورية
6. خريطة الطريق
7. الأخطار والمخاطر

---

## 1️⃣ ملخص المشروع التنفيذي

### ما هو ORCA CRM؟

**منصة تشغيل عقارية متعددة المستأجرين (Multi-Tenant CRM)** موجهة لشركات العقارات.

```
ORCA CRM = نظام إدارة عقاري موحد
├─ CRM وإدارة العملاء
├─ إدارة المشاريع والمخزون
├─ دورة المبيعات والعقود
├─ خطط السداد والتحصيل
├─ إدارة الإيجارات
├─ التكاملات الحكومية (ZATCA, Ejar)
├─ التكاملات المالية (Paylink, N-Genius)
└─ تكاملات الذكاء الاصطناعي
```

### الفئات المستهدفة

- **الشركات:** مطورون عقاريون، مديرو أملاك، شركات تأجير
- **الموظفون:** مديرو مبيعات، موظفو تحصيل، مسؤولو مالية

### المشكلة المحلولة

| المشكلة | الحل في ORCA |
|--------|-------------|
| تشتت البيانات | مستودع مركزي واحد |
| انقطاع الربط بين الكيانات | تدفق بيانات موحد |
| عدم وضوح المسؤولية | تدقيق شامل لكل عملية |
| صعوبة الامتثال | معايير حكومية مدمجة |

---

## 2️⃣ رؤية معمارية شاملة

### 2.1 نمط المعمارية

**Modular Full-Stack Monolith** (أحادي معياري)

```
┌─────────────────────────────────────────────────────┐
│         مستوى العرض (Presentation)                 │
│  React Components + Server Components + UI Kit     │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│       طبقة الجلسة والأمان (Session & RBAC)          │
│  Tenant Context, User Session, Authorization      │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│       طبقة الخوادم (Server Layer)                   │
│  Server Actions, Route Handlers, Webhooks         │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│     طبقة قواعد الأعمال (Domain Services)           │
│  Sales, Rental, Contracts, Payments, Audit        │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│      طبقة البيانات (Data Layer - Prisma)           │
│  ORM Layer, Query Building, Migration Management   │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│   قاعدة البيانات (PostgreSQL via Neon)            │
│  Multi-Tenant Data, Indexes, Constraints          │
└─────────────────────────────────────────────────────┘
```

### 2.2 تدفق البيانات الأساسي

```
المستخدم
  ↓
[واجهة React]
  ↓
[Server Component / Server Action]
  ↓
[Session Verification + RBAC Check]
  ↓
[Tenant Guard - تحقق tenantId]
  ↓
[Domain Service - قواعد الأعمال]
  ↓
[Prisma Query - استخرج البيانات]
  ↓
[PostgreSQL - قاعدة البيانات]
  ↓
[Audit Log - سجل العملية]
  ↓
[View Model - تحويل للعرض]
  ↓
[إعادة البيانات للمتصفح]
```

### 2.3 الموديولات الرئيسية

```
src/app/
├── operations/          صفحات رئيسية
│   ├── sales/          المبيعات والعقود
│   ├── operations/    الإيجارات والتحصيل
│   ├── admin/         إدارة النظام
│   └── settings/      الإعدادات
├── api/                Route Handlers
│   ├── webhook/       WhatsApp, Payments
│   └── cron/          مهام دورية
├── actions/            Server Actions
└── context/            App Context

lib/
├── domain/            قواعد الأعمال
│   ├── sales/
│   ├── rental/
│   ├── payments/
│   └── audit/
├── auth/              الأمان والتحقق
├── integrations/      التكاملات
└── display/           عرض البيانات

components/
├── views/             واجهات نطاقية
└── ui/                Primitives مشتركة

prisma/
├── schema.prisma      نموذج البيانات
└── migrations/        تطور قاعدة البيانات
```

---

## 3️⃣ التقنيات والأدوات

### 3.1 Stack الكامل

| الطبقة | التقنية | الإصدار | الدور |
|-------|---------|---------|------|
| **اللغة** | TypeScript | الأحدث | Type-safety في كل مكان |
| **Frontend Framework** | Next.js | 16 | Server Components + App Router |
| **UI Library** | React | الأحدث | Components التفاعلية |
| **Styling** | Tailwind CSS + CSS Variables | - | Responsive + Dark Mode |
| **ORM** | Prisma | 7.8.0 | Database abstraction |
| **Database** | PostgreSQL | عبر Neon | Multi-tenant data |
| **Hosting** | Vercel | - | Deployment + CI/CD |
| **CI/CD** | GitHub Actions | - | Automated workflows |
| **WhatsApp** | Meta Cloud API | - | Messaging integration |
| **Payments** | Paylink + N-Genius | - | Payment processing |
| **Email** | Resend | - | Email delivery |
| **Government** | ZATCA + Ejar | - | Compliance |
| **AI** | Multi-provider | - | OpenAI, Gemini, Claude |

### 3.2 الأدوات والمكتبات الأساسية

```json
{
  "devDependencies": {
    "@playwright/test": "اختبارات E2E",
    "vitest": "اختبارات الوحدة",
    "typescript": "Type checking",
    "@tailwindcss/postcss": "CSS preprocessing"
  },
  "dependencies": {
    "@prisma/client": "ORM client",
    "next": "App framework",
    "react": "UI rendering",
    "jose": "JWT handling",
    "bcryptjs": "Password hashing",
    "resend": "Email service"
  }
}
```

---

## 4️⃣ تحليل الحالة الحالية

### 4.1 المراحل المبنية (80% إنجاز)

| المرحلة | الحالة | الملاحظات |
|--------|--------|----------|
| **Phase 1: Transaction Spine** | ✅ مكتملة | العقود والدفعات والفواتير |
| **Phase 2: Deal Passport** | ✅ مكتملة | سجل الصفقات والأحداث |
| **Phase 3: Realtime Sync** | ✅ مكتملة | تحديث فوري للبيانات |
| **Phase 4: AI Agents** | ✅ مكتملة | Foundation فقط |
| **Phase 5: Production Gate** | ✅ مكتملة | بحاجة إعادة verify |

### 4.2 الميزات المشغولة

✅ **المبيعات:**
- Leads, Contacts, Opportunities
- Tours وGemini-powered suggestions
- Offers والتفاوض
- Contracts وPayment Plans

✅ **التحصيل:**
- Invoices والفواتير
- Installments والأقساط
- Payment Transactions وتسجيلها
- Partial payments وsettlements

✅ **الإيجارات:**
- Rental Leases
- Rental Invoices وتحصيلها
- Multi-unit properties

✅ **الإدارة:**
- RBAC وصلاحيات مختلفة
- Audit Log شامل
- Dark/Light Mode
- Arabic/English (ثنائي اللغة)

✅ **التكاملات:**
- WhatsApp messaging
- ZATCA + Ejar gates
- Email foundation
- Payment webhooks

### 4.3 الحالة الحرجة - Git والبيانات

| البند | الحالة | الإجراء |
|------|--------|--------|
| **Canonical Branch** | `integration/revenue-integrity` | ✅ معروف |
| **Current HEAD** | `c5deccb` | ⚠️ بحاجة إثبات مباشر |
| **Git Status** | قد يحتوي تعارضات | 🔴 بحاجة تنظيف |
| **Stash** | `wip-whatsapp-before-consolidation` | ⚠️ بحاجة معالجة آمنة |
| **Database Migrations** | ناقصة بعض الـ baselines | 🔴 بحاجة إغلاق |
| **Schema Drift** | قد يوجد drift | 🔴 بحاجة Fresh DB test |

---

## 5️⃣ التوصيات الفورية

### 5.1 الأولوية الحرجة (P0) - الأسبوع الأول

#### 1. إثبات Git والمصدر
```bash
# تأكد من الموقع والفرع
cd C:\Users\ali59\Desktop\REDC-INTEGRATION
git status --short          # يجب أن يكون فارغ
git rev-parse HEAD          # يجب أن يكون c5deccb (تقريباً)
git branch -vv              # تأكد من tracking
```

**المخرجات:**
- ✅ Working tree clean
- ✅ Branch traced correctly
- ✅ HEAD confirmed

#### 2. استرجاع عمل WhatsApp بأمان
```bash
# قراءة Stash أولاً
git stash list                          # ابحث عن wip-whatsapp
git stash show -p stash@{n} | head -50  # عرض المحتوى بأمان
git stash show --stat stash@{n}         # إحصائيات التغييرات

# تطبيق آمن بعد نقطة رجوع
git checkout -b whatsapp-recovery
git stash apply stash@{n}              # استخدم apply بدل pop
```

**المخرجات:**
- ✅ Stash reviewed
- ✅ Applied cleanly
- ✅ No conflicts

#### 3. إغلاق Migrations من Fresh DB
```bash
# إنشاء قاعدة فارغة مؤقتة
# استخدم Neon branch جديد مؤقت

# تشغيل من الصفر
prisma migrate deploy --skip-generate

# التحقق
prisma migrate status      # يجب أن يكون clean
prisma db seed            # تطبيق seed data إن وجد
```

**المخرجات:**
- ✅ Migration chain complete
- ✅ No schema drift
- ✅ Fresh DB verified

### 5.2 الأولوية العالية (P1) - الأسبوع الثاني

#### 1. Acceptance Testing Pack
```
□ Authorization tests: 26/26 PASS
□ Cross-tenant isolation
□ Transaction spine verification
□ Revenue integrity paths
□ Login + core pages
□ WhatsApp paths
□ Bilingual (AR/EN)
□ Dark/Light modes
```

#### 2. Build والنشر
```
□ npm install (fresh)
□ npm run build (full)
□ npm run test (security + core)
□ npm run dev (local verification)
□ Vercel preview deployment
□ Production smoke test
```

#### 3. Integration Center إكمال
```
Settings > Integrations & Compliance
├─ WhatsApp: Connection + Credentials + Webhook
├─ Paylink/N-Genius: Production credentials
├─ Resend: Domain verification
├─ ZATCA/Ejar: Trust gate setup
├─ AI Providers: Multi-tenant activation
└─ Monitoring: Health dashboard
```

---

## 6️⃣ خريطة الطريق

### مرحلة التثبيت (Sprint 1: 1 أسبوع)

```
Day 1-2:
└─ إثبات المصدر والفرع
   └─ استرجاع Stash بأمان
      └─ حل أي تعارضات صغيرة

Day 3-4:
└─ إغلاق Migrations
   └─ Fresh DB verify
      └─ Schema diff = 0

Day 5:
└─ Acceptance Pack كامل
   └─ Build + Tests + Smoke
      └─ Production ready for next phase
```

### مرحلة الإكمال (Sprint 2-3: أسبوعين)

```
Sprint 2:
├─ Integration Center UI
├─ WhatsApp Self-Service
├─ Payment webhooks production
└─ ZATCA/Ejar production gates

Sprint 3:
├─ General Ledger basics
├─ Monitoring/Alerting
├─ DR/Backup strategy
└─ Production cutover runbook
```

---

## 7️⃣ الأخطار والمخاطر

### 🔴 الأخطار الحرجة

| الخطر | التأثير | التخفيف |
|------|---------|---------|
| **Schema Drift** | البيانات قد تفقد عند Migration | Fresh DB test قبل Prod |
| **Stash Loss** | عمل WhatsApp قد يضيع | Backup وreview قبل apply |
| **Cross-Tenant Data Leak** | انتهاك أمني شديد | اختبار Cross-tenant شامل |
| **Invalid Transactions** | مشاكل مالية | التحقق من Transaction spine |
| **Merge Conflicts** | عمل مفقود | Review diff قبل merge |

### ⚠️ المتطلبات الحرجة

**يجب توفير قبل الإنتاج:**

- ✅ Database backup مشفر
- ✅ Secrets manager جاهز
- ✅ Monitoring dashboard
- ✅ Incident runbook
- ✅ Rollback procedure
- ✅ Support phone number

---

## 8️⃣ خطوات تنفيذية فورية

### خطوة 1: تثبيت المصدر (يوم 1-2)

```powershell
# 1. انتقل للمجلد الصحيح
cd C:\Users\ali59\Desktop\REDC-INTEGRATION

# 2. تحقق من الحالة
git status
git log --oneline -5

# 3. تأكد من الفرع
git branch -vv
git rev-parse HEAD

# 4. إذا كان هناك تعارضات
git stash list
git stash show stash@{n} --stat
```

### خطوة 2: استرجاع WhatsApp (يوم 2-3)

```powershell
# آمن جداً
git checkout -b whatsapp-staging
git stash apply stash@{n}

# راجع التغييرات
git diff --stat

# إذا كان نظيف
git commit -am "Apply WhatsApp stash"
```

### خطوة 3: إغلاق Database (يوم 3-4)

```bash
# إنشاء Neon branch مؤقت
# تعيين DATABASE_URL الجديد في .env.local

npm install
npx prisma migrate deploy
npx prisma migrate status

# يجب يكون clean
```

### خطوة 4: Acceptance (يوم 5)

```bash
# الاختبارات
npm run test

# البناء
npm run build

# التشغيل المحلي
npm run dev

# في terminal آخر
npm run test:whatsapp
```

---

## 9️⃣ قائمة التحقق قبل الإنتاج

### Pre-Production Checklist

```
□ Git Verification
  □ Branch: integration/revenue-integrity
  □ Status: clean
  □ HEAD: verified
  
□ Database
  □ Fresh migration: PASS
  □ Schema drift: 0
  □ Backup: created
  
□ Security
  □ Authorization tests: 26/26
  □ Cross-tenant: verified
  □ Session handling: secure
  □ Credentials: encrypted
  
□ Functional
  □ Sales workflow: E2E tested
  □ Payment flow: verified
  □ WhatsApp: working
  □ Reports: accurate
  
□ Technical
  □ Build: successful
  □ Tests: all pass
  □ Performance: acceptable
  □ Logs: clean
  
□ Deployment
  □ Vercel check: PASS
  □ Preview: functional
  □ DNS: ready
  □ Webhooks: configured
  
□ Documentation
  □ Runbook: written
  □ Rollback: documented
  □ Incidents: procedures ready
  □ Monitoring: alerts set
```

---

## 🔟 الملخص النهائي

### الحالة الحالية
- **الإنجاز:** 80% من النطاق الأساسي
- **الجودة:** معمارية سليمة، أمان مشدد
- **الخطورة:** تحتاج تثبيت مصدر وإغلاق DB

### الخطوات الفورية (أسبوع واحد)
1. إثبات Git والمصدر
2. استرجاع عمل WhatsApp
3. إغلاق Migrations من Fresh DB
4. Acceptance pack كامل
5. النشر على الإنتاج

### النجاح يعتمد على
✅ عدم إعادة بناء الأساسيات  
✅ التحقق الشامل من الأمان  
✅ اختبار منشأ البيانات  
✅ توثيق الإجراءات  

**المشروع جاهز للنقل والاستكمال** ✅
