# ORCA CRM – Accounting, Payments & ZATCA Deep Audit

**Date:** 8 June 2026  
**Method:** Full code audit (34 files read, 618-line schema, 11 tables examined)

---

## Executive Summary

| المحور | الدرجة | الحالة |
|--------|--------|--------|
| **Accounting** | 3/10 | 🟠 أساسي جداً – General Ledger بدائي بدون دورة محاسبية |
| **Payments** | 6/10 | 🟡 الاشتراكات تعمل – المدفوعات العامة وهمية |
| **ZATCA** | 1/10 | 🔴 تخزين بيانات اعتماد فقط – لا تكامل فعلي |
| **Saudi Market Readiness** | 3/10 | 🔴 لا يصلح للسوق السعودي بدون محاسبة وزكاته |

### التوصية النهائية:

# 🔴 NOT READY for Saudi Market (Accounting/Tax)

**السبب المباشر:**  
النظام لا يحتوي على دورة محاسبية متكاملة ولا يصدر فواتير ضريبية متوافقة مع ZATCA.

**ما يمنع الإطلاق:**
1. لا VAT Calculation على أي فاتورة
2. لا QR Code على الفواتير
3. لا XML/ZATCA Phase 2
4. لا دورة محاسبية (شجرة حسابات، قيود، ميزان، دخل)
5. لا Cash Flow أو Balance Sheet

---

## القسم الأول – Accounting Audit

### Financial Features

| Feature | Status | Evidence |
|---------|--------|----------|
| Chart of Accounts | ❌ **Missing** | لا يوجد جدول `Account` في Prisma schema |
| Journal Entries | ⚠️ **Partial** | `GeneralLedger` جدول واحد بسيط (debit/credit فقط) |
| General Ledger | ⚠️ **Partial** | `general_ledger` جدول موجود لكن بدون coding system |
| Sub Ledger | ❌ **Missing** | لا يوجد تفصيل للحسابات |
| Trial Balance | ❌ **Missing** | لا يوجد ولا endpoint يحسبها |
| Balance Sheet | ❌ **Missing** | لا يوجد |
| Profit & Loss | ❌ **Missing** | لا يوجد |
| Cash Flow | ❌ **Missing** | لا يوجد |
| Cost Centers | ❌ **Missing** | لا يوجد |
| Fixed Assets | ❌ **Missing** | لا يوجد |
| Revenue Recognition | ❌ **Missing** | لا يوجد |
| Payroll Commissions | ✅ **Ready** | `PayrollCommission` جدول + عمليات PENDING/PAID |
| Lease Settlement | ⚠️ **Partial** | Mock فقط (`/api/accounting/settle-lease` يعيد أرقاماً عشوائية) |

### Accounting Data Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        ACCOUNTING DATA MODEL                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Receipt ───→ GeneralLedger (1:1)                               │
│    ↓              ↓ debit/credit only, no account code          │
│  tenantId       tenantId                                        │
│  invoiceId      description (text)                              │
│  amount         createdAt                                       │
│  paymentMethod                                                  │
│                                                                 │
│  PayrollCommission                                              │
│    tenantId                                                     │
│    userId (sales rep)                                           │
│    amount                                                       │
│    status (PENDING / PAID)                                      │
│                                                                 │
│  Installment ←── Contract                                       │
│    amountSar       totalVolumeSar                               │
│    dueDate         buyerName, buyerPhone                        │
│    paymentStatus   signedAt                                     │
│                                                                 │
│  RentalInvoice ←── RentalLease                                  │
│    amount            rentAmount, deposit                        │
│    dueDate           tenantName, unitName                       │
│    status            status                                     │
│    paidAt                                                       │
│                                                                 │
│  ❌ NO: Account, JournalEntry, CostCenter, FixedAsset           │
│  ❌ NO: TrialBalance, BalanceSheet, P&L, CashFlow              │
└─────────────────────────────────────────────────────────────────┘
```

### Accounting Workflow

```
Contract/Lease
    ↓
Installment (generated manually)
    ↓
Receipt (created via processPayment action)
    ↓
GeneralLedger entry (auto-created with receipt)

⚠️ All accounting entries are SINGLE-ENTRY (debit/credit on one row)
❌ No double-entry accounting
❌ No automatic accrual
❌ No revenue/expense categorization
❌ No account codes
```

**الخلاصة:** المحاسبة عبارة عن **تسجيل إيرادات ونفقات بسيط** – ليس نظام محاسبي متكامل.

---

## القسم الثاني – Payments Audit

### Payment Features

| Feature | Status | Evidence |
|---------|--------|----------|
| Payment Registration | ⚠️ **Partial** | `processPayment` action + `/api/v1/invoices/[id]/pay` (mock) |
| Installments | ✅ **Ready** | `Installment` model + Sanad agent for reminders |
| Payment Schedule | ⚠️ **Partial** | Calculator shows schedule – لا تخزين للجدول الزمني |
| Partial Payments | ❌ **Missing** | لا support |
| Advance Payments | ❌ **Missing** | لا support |
| Refunds | ❌ **Missing** | لا support |
| Payment Reversal | ❌ **Missing** | لا support |
| Collections | ⚠️ **Partial** | Sanad agent يرسل تذكيرات فقط |
| Overdue Tracking | ⚠️ **Partial** | `getErpStatsAction` يحسب المتأخرات |
| Aging Report | ❌ **Missing** | لا يوجد |
| Receipt Generation | ⚠️ **Partial** | `Receipt` model موجود لكن لا توجد واجهة عرض |
| Subscription Payment | ✅ **Ready** | Moyasar integration (real + mock) |
| Addon Payment | ✅ **Ready** | Moyasar integration (real + mock) |
| Idempotency Key Support | ✅ **Ready** | `/api/v1/invoices/[id]/pay` |
| Secure Payment Token | ✅ **Ready** | `securePaymentToken` in Installment |

### Payment Integrations

| Integration | Status | Details |
|-------------|--------|---------|
| **Moyasar** (Subscription) | ✅ **Real + Mock** | `initiateSubscriptionPaymentAction` calls Moyasar API directly; mock fallback for dev |
| **Moyasar** (Addon) | ✅ **Real + Mock** | `initiateAddonPaymentAction` same pattern |
| **Moyasar** (Callback) | ✅ **Real + Mock** | `/api/payment/callback` verifies via Moyasar API or mock params |
| **WhatsApp Payment Link** | ✅ **Real** | Sanad agent generates links via `securePaymentToken` |
| **Bank Reconciliation** | ❌ **Missing** | `/api/v1/reconciliation/upload` is mock only (HMAC + random ID) |

### Payment Lifecycle

```
Subscription Flow:
    User clicks Upgrade
    → initiateSubscriptionPaymentAction()
    → Moyasar invoice created (or mock URL)
    → User pays on Moyasar page
    → Redirect to /api/payment/callback
    → handleSuccessfulPaymentAction() activates subscription
    → Password generated, SMS sent, email sent
    
Contract Installment Flow:
    Contract signed
    → Installments created (manually? unknown)
    → Sanad agent runs daily
    → Finds due installments
    → Sends WhatsApp payment links
    → User pays (via link or manual)
    → ??? No endpoint to mark installment paid except via processPayment
    
Rental Invoice Flow:
    Lease created
    → Invoice created via POST /api/v1/invoices
    → Payment via POST /api/v1/invoices/[id]/pay (MOCK only)
    → Returns random payment ID, NO DB persistence
```

**الخلاصة:** الاشتراكات (Moyasar) تعمل بشكل كامل. مدفوعات العملاء (الأقساط/الفواتير) غير متكاملة – معظمها وهمي.

---

## القسم الثالث – ZATCA Audit

### ZATCA Compliance Features

| Feature | Status | Evidence |
|---------|--------|----------|
| VAT Calculation | ❌ **Missing** | لا يوجد حساب ضريبة في أي فاتورة |
| Tax Invoice | ❌ **Missing** | لا يوجد |
| Simplified Invoice | ❌ **Missing** | لا يوجد |
| QR Code | ❌ **Missing** | لا يوجد |
| Invoice UUID | ❌ **Missing** | كل الفواتير تستخدم UUID لكن ليس UUID ضريبي |
| XML Generation (Phase 2) | ❌ **Missing** | لا يوجد |
| Digital Signature | ❌ **Missing** | لا يوجد (فقط تخزين credentials) |
| Clearance | ❌ **Missing** | لا يوجد |
| Reporting API | ❌ **Missing** | لا يوجد |
| Credit Notes | ❌ **Missing** | لا يوجد |
| Debit Notes | ❌ **Missing** | لا يوجد |
| Refund Invoices | ❌ **Missing** | لا يوجد |

### Invoice Structure Audit

| عنصر الفاتورة الضريبية | موجود؟ |
|------------------------|--------|
| Company Name | ❌ ليس في هيكل الفاتورة |
| VAT Number | ⚠️ مخزن في `tenant.vatNumber` لكن غير مستخدم |
| Invoice Number | ❌ لا تسلسل ضريبي |
| Date | ❌ لا توجد فاتورة ضريبية أصلاً |
| Customer (with VAT) | ❌ |
| Tax Breakdown | ❌ |
| Sub Total | ❌ |
| VAT Amount | ❌ |
| Total with VAT | ❌ |
| QR Code | ❌ |
| UUID (ZATCA format) | ❌ |
| XML | ❌ |
| PIH (Previous Invoice Hash) | ❌ |

### ZATCA Readiness Score

| المحور | الدرجة | الشرح |
|--------|--------|-------|
| **VAT** | 0/10 | لا يوجد حساب ضريبة أبداً |
| **Invoicing** | 1/10 | `RentalInvoice` جدول بسيط بدون متطلبات ZATCA |
| **Reporting** | 0/10 | لا يوجد API للإبلاغ |
| **ZATCA Readiness** | 1/10 | `encryptedZatcaCredentials` في Tenant + زر تفعيل وهمي |

**الخلاصة:** ZATCA غير موجود فعلياً. `SettingsCompliance.tsx` و `compliance.ts` يخزنان بيانات الاعتماد لكن لا يوجد أي كود يرسل أو يستقبل من ZATCA API.

---

## القسم الرابع – Database Audit

### جداول المحاسبة والمالية

| الجدول | الغرض | يستخدم حقاً؟ |
|--------|-------|-------------|
| `tenants` | معلومات الشركة (رقم ضريبي، بيانات اعتماد) | ✅ يستخدم |
| `contracts` | عقود البيع | ✅ يستخدم |
| `installments` | جدول الأقساط | ✅ يستخدم (Sanad agent) |
| `rental_leases` | عقود الإيجار | ✅ يستخدم |
| `rental_invoices` | فواتير الإيجار | ⚠️ CRUD بسيط – غير ضريبي |
| `receipts` | سندات القبض | ⚠يستخدم جزئياً (processPayment) |
| `general_ledger` | الأستاذ العام | ⚠️ إدخال مفرد بدون شجرة حسابات |
| `payroll_commissions` | عمولات المبيعات | ✅ يستخدم بالكامل (PENDING→PAID) |
| `agent_telemetry_logs` | سجل وكلاء التحصيل | ✅ يستخدم |
| `audit_logs` | سجل التدقيق | ✅ يستخدم |
| `agent_leases` | عقود وكلاء AI | ✅ يستخدم |

---

## القسم الخامس – Risk Assessment

### Critical Risks (تمنع الإطلاق)

| # | الخطر | الشدة | المصدر |
|---|-------|-------|--------|
| CR-1 | **لا فواتير ضريبية** متوافقة مع ZATCA | 🔴 حرج | النظام لا يصدر أي فاتورة ضريبية |
| CR-2 | **لا دورة محاسبية** – لا ميزانية ولا أرباح/خسائر | 🔴 حرج | الشركات السعودية تحتاج تقارير مالية |
| CR-3 | **لا VAT Calculation** على أي عملية بيع | 🔴 حرج | مطلوب قانونياً |
| CR-4 | **ZATCA Phase 2 غير مدعوم** – لا XML ولا Clearance | 🔴 حرج | مطلوب لفواتير التجزئة |

### High Risks (تؤثر على العملاء)

| # | الخطر | الشدة | المصدر |
|---|-------|-------|--------|
| HR-1 | **مدفوعات العملاء العامة وهمية** | 🟡 عالي | `invoices/[id]/pay` يعيد ID عشوائي |
| HR-2 | **لا Aging Report** – متأخرات غير متتبعة | 🟡 عالي | المحاسب يحتاج معرفة المديونين |
| HR-3 | **لا Refunds / Reversals** – لا يمكن رد المدفوعات | 🟡 عالي | العميل قد يطلب استرجاع |
| HR-4 | **لا Double-Entry Accounting** | 🟡 عالي | أي مراجع حسابات سيرفضه |
| HR-5 | **Settle-Lease وهمي** | 🟡 عالي | `/api/accounting/settle-lease` يعيد أرقاماً عشوائية |

### Medium Risks (يمكن تأجيلها)

| # | الخطر | الشدة | المصدر |
|---|-------|-------|--------|
| MR-1 | لا Chart of Accounts | 🟡 متوسط | يمكن تأجيله للنسخة المتقدمة |
| MR-2 | لا Cash Flow Statement | 🟡 متوسط | ممكن لاحقاً |
| MR-3 | لا Fixed Assets | 🟢 منخفض | عقاري – الأصول الثابتة للعميل وليست للنظام |
| MR-4 | لا Cost Centers | 🟢 منخفض | تحليل متقدم |

---

## القسم السادس – Gap Analysis

### موجود بالكامل (Ready)

| الميزة | ملفاتها |
|--------|---------|
| ✅ Subscription Payments (Moyasar) | `payment.ts`, `callback/route.ts` |
| ✅ Addon Agent Purchases | `payment.ts`, `callback/route.ts` |
| ✅ Installment Schedule Tracking | `installment` model, `sanadAgent.ts` |
| ✅ Installment Reminders (WhatsApp) | `sanadAgent.ts` |
| ✅ Payroll Commissions | `ejar.ts`, `payrollCommission` model |
| ✅ Receipt Creation | `finance.ts`, `receipt` model |
| ✅ Basic General Ledger | `finance.ts`, `generalLedger` model |
| ✅ ERP Stats (collected/arrears) | `accounting.ts` |
| ✅ Compliance Data Storage | `compliance.ts`, `SettingsCompliance.tsx` |
| ✅ Government Credentials (encrypted) | `compliance.ts` |

### موجود جزئياً (Partial)

| الميزة | الناقص |
|--------|--------|
| ⚠️ **Invoice Management** | `RentalInvoice` CRUD موجود لكن بدون VAT أو ZATCA |
| ⚠️ **General Ledger** | موجود كجدول بسيط لكن بدون شجرة حسابات أو قيد مزدوج |
| ⚠️ **Lease Accounting** | `settle-lease` وهمي – لا ترحيل حقيقي |
| ⚠️ **Aging / Overdue** | `getErpStatsAction` يحسب لكن لا واجهة للمستخدم |
| ⚠️ **Ejar Integration** | Sandbox فقط – ينتظر اعتماد |
| ⚠️ **Collections** | Sanad agent يرسل تذكيرات لكن لا متابعة |

### غير موجود (Missing) – مطلوب للسوق السعودي

| # | الميزة | Priority | لماذا مطلوبة؟ |
|---|--------|----------|---------------|
| 1 | **🚨 ZATCA Phase 2 Invoice** (QR + XML + UUID + Digital Signature) | P1 | قانوني – بدونها لا يمكن إصدار فاتورة |
| 2 | **🚨 VAT Calculation** (15% على كل فاتورة) | P1 | قانوني – مطلوبة لكل عملية بيع |
| 3 | **🚨 Tax Invoice / Simplified Invoice** | P1 | قانوني – بدونها العميل مخالف |
| 4 | **🚨 Double-Entry Accounting** | P1 | مهني – أي محاسب سيطلبها |
| 5 | **Trial Balance** | P1 | محاسبي |
| 6 | **Balance Sheet** | P2 | محاسبي |
| 7 | **Profit & Loss Statement** | P2 | محاسبي |
| 8 | **Cash Flow Statement** | P2 | محاسبي |
| 9 | **Aging Report** (AR) | P2 | تشغيلي |
| 10 | **Credit / Debit Notes** | P2 | قانوني – للإرجاع والتعديل |
| 11 | **ZATCA Reporting API** | P2 | قانوني – الإبلاغ الدوري |
| 12 | **Chart of Accounts** | P2 | محاسبي |
| 13 | **Refund / Reversal** | P2 | تشغيلي |
| 14 | **Partial Payments** | P3 | تشغيلي |
| 15 | **Advance Payments** | P3 | تشغيلي |

---

## القسم السابع – Roadmap

### P1 (قبل أول عميل مدفوع – يجب الإكمال)

| # | المهمة | الجهد المقدر | الملفات المتأثرة |
|---|--------|-------------|-----------------|
| 1 | **إضافة VAT 15% لجدول الفواتير** | 2-3 أيام | `schema.prisma`, `api/v1/invoices/*`, `contract.ts` |
| 2 | **إصدار فاتورة ضريبية مبسطة مع QR** | 5-7 أيام | مكتبة ZATCA QR, `invoice`, `contract` flows |
| 3 | **تصدير XML ZATCA Phase 2** | 7-10 أيام | مكتبة XML generation (zatca-egs) |
| 4 | **ربط ZATCA API حقيقي (تسليم + إبلاغ)** | 5-7 أيام | `compliance.ts`, `compliance-gateway.ts` |
| 5 | **تطبيق Double-Entry Accounting** | 5-7 أيام | إعادة هيكلة `GeneralLedger` مع account codes |

**إجمالي P1:** 24-34 يوم عمل (شهر ونصف تقريباً)

### P2 (بعد أول 5 عملاء)

| # | المهمة | الجهد |
|---|--------|-------|
| 6 | Trial Balance + Balance Sheet | 3-5 أيام |
| 7 | Profit & Loss Statement | 2-3 أيام |
| 8 | Cash Flow Statement | 2-3 أيام |
| 9 | Aging Report (AR) | 2 أيام |
| 10 | Credit / Debit Notes | 3-5 أيام |
| 11 | Chart of Accounts UI | 3-5 أيام |
| 12 | Refund / Reversal | 2-3 أيام |

### P3 (نسخة ERP المتقدمة)

| # | المهمة |
|---|--------|
| 13 | Partial / Advance Payments |
| 14 | Cost Centers |
| 15 | Fixed Assets Management |
| 16 | Full ERP Integration |
| 17 | Automated Bank Reconciliation |

---

## Final Scores

```
═══════════════════════════════════════════
  ORCA CRM – Financial Readiness Scorecard
═══════════════════════════════════════════

Accounting  ═══════════════░░░  3/10
  ✔ General Ledger (basic)
  ✔ Receipts
  ✔ Payroll Commissions
  ✘ No double-entry
  ✘ No trial balance
  ✘ No P&L / Balance sheet
  ✘ No chart of accounts

Payments    ═══════════════░  6/10
  ✔ Subscription (Moyasar)
  ✔ Installment tracking
  ✔ Secure payment tokens
  ✔ Sanad reminders
  ✘ Invoice payment mock
  ✘ No refund/reversal
  ✘ No aging report

ZATCA       ═══════════════░░  1/10
  ✔ Credential storage (encrypted)
  ✘ No VAT calculation
  ✘ No tax invoice
  ✘ No QR code
  ✘ No XML
  ✘ No API integration

Saudi Market Readiness ═══░░░  3/10
─────────────────────────────────────
OVERALL:  ═══════════════░░░  3/10
═══════════════════════════════════════════

🔴 NOT READY for Saudi Market
   (as an accounting/tax system)
```

### التوصية النهائية

**للـ Pilot (تجربة المنتج):**  
✅ النظام يمكن عرضه للعملاء التجريبيين كـ **CRM عقاري** مع تحذير صريح:  
> "الفوترة الإلكترونية (ZATCA) والمحاسبة المتكاملة قيد التطوير للإطلاق التجاري."

**لأول عميل مدفوع:**  
🔴 **غير جاهز** قبل إكمال P1 (ZATCA Phase 2 + VAT + Double-Entry).

**الحل المقترح:**
1. استمر في الـ Pilot كـ CRM فقط (لا تبيع محاسبة)
2. ابدأ P1 فوراً (24-34 يوم عمل)
3. السوق السعودي لا يقبل نظام بدون ZATCA – هذه هي الفجوة الحرجة الوحيدة
