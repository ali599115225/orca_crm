# INSTALLMENTS_TEMPORAL_BASELINE_BLUEPRINT

**تاريخ:** 26 يونيو 2026
**الحالة:** `BLUEPRINT_DRAFT`
**يُلحَق بـ:** [BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md), [BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md](BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md)
**الغرض:** تصميم baseline لجدول `installments` — الحاجز الجديد المُثبَت بعد إغلاق حاجز `tours` (النتيجة الفعلية: `20260621000200_transaction_spine` يفشل الآن عند `relation "installments" does not exist`).

**⚠️ تصميم وتحليل فقط. لم يُكتب أي ملف `migration.sql`. لم يُشغَّل `migrate deploy`.**

**حالة `tours`:** `CLOSED` — معتمَدة (FK: TENANT_ONLY)، اختُبرت فعلياً على قاعدة معزولة، لا تُفتح مجدداً.

---

## 1. أول ظهور ونقطة القطع

- **أول ظهور لـ`model Installment`:** commit `74e2375` (نفس commit إدخال `model Contract` لأول مرة) — شكل أولي بسيط جداً (8 أعمدة، **بلا** `tenant_id`).
- **نقطة القطع الصحيحة (الأب المباشر لكوميت إدخال `transaction_spine`):** `9be2984^`.

## 2. الجسم التاريخي الدقيق عند نقطة القطع (حرفي)

```prisma
model Installment {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId           String   @map("tenant_id") @db.Uuid
  tenant             Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  contractId         String   @map("contract_id") @db.Uuid
  contract           Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  installmentNumber  Int      @map("installment_number")
  amountSar          Decimal  @map("amount_sar") @db.Decimal(12, 2)
  vatAmount          Decimal? @map("vat_amount") @db.Decimal(12, 2)
  dueDate            DateTime @map("due_date") @db.Date
  paymentStatus      String   @default("Pending") @map("payment_status")
  securePaymentToken String   @unique @default(dbgenerated("gen_random_uuid()")) @map("secure_payment_token") @db.Uuid
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@unique([contractId, installmentNumber], name: "uq_contract_installment_number")
  @@index([contractId], map: "idx_installments_contract_id")
  @@index([dueDate], map: "idx_installments_due_date")
  @@index([tenantId], map: "idx_installments_tenant_id")
  @@map("installments")
}
```

**10 أعمدة قابلة للتخزين.** قيد فريد واحد + 3 فهارس.

## 3. تحقق الاستقرار

الشكل الأولي عند `74e2375` كان **بلا `tenant_id` وبلا `vat_amount`** (8 أعمدة فقط: `id, contract_id, installment_number, amount_sar, due_date, payment_status, secure_payment_token, created_at`). كلا الحقلين أُضيفا عبر `db push` غير متتبَّع **قبل** `ef38b60` (أول نقطة تحقَّق منها لاحقاً).

تم فحص الاستقرار عند **ثلاث نقاط متباعدة زمنياً** على طول النافذة ذات الصلة:
| النقطة | الشكل |
|---|---|
| `ef38b60` | 10 أعمدة، مطابق تماماً للنهائي |
| `a60a604` (نفس نقطة قطع Contract، قبل add_hash_columns) | 10 أعمدة، مطابق تماماً |
| `9be2984^` (نقطة القطع المعتمَدة) | 10 أعمدة، مطابق تماماً |

**النتيجة: الشكل مستقر تماماً طوال الفترة ذات الصلة بالـmigrations (من `ef38b60` حتى نقطة القطع)** — لا حاجة لتتبّع اللحظة الدقيقة لإضافة `tenant_id`/`vat_amount` بين `74e2375` و`ef38b60`، لأنها سابقة لكل الـmigrations المتتبَّعة ومستقرة منذ ذلك الحين بثلاث نقاط فحص مستقلة.

## 4. الاعتمادات والـFK (مؤكَّدة من قراءة الـmigrations الفعلية)

فحص شامل لكل ملفات الـmigrations يؤكد: **فقط ملفان** يلمسان `installments`:

```sql
-- من transaction_spine (السبب في الحاجز الحالي):
ALTER TABLE "installments" ADD COLUMN "invoice_id" UUID;
ALTER TABLE "installments" ADD CONSTRAINT "installments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL;
CREATE INDEX "idx_installments_invoice_id" ON "installments"("invoice_id");

-- من phase1_quote_to_cash_closure (لاحقة، أبعد من الحاجز الحالي):
ALTER TABLE "installments" ADD COLUMN IF NOT EXISTS "payment_plan_id" UUID;
-- + فهرس على payment_plan_id
```

**لا ملف آخر يلمس `installments` على الإطلاق** (مؤكَّد بفحص كل مجلدات الـmigrations).

**الفرق الجوهري عن `tours`:** هنا `contract_id` يحمل علاقة Prisma حقيقية (`@relation`) منذ أول ظهور، وكلا migration اللاحقتين **لا تضيفان** FK على `contract_id` أو `tenant_id` — مما يعني هذا الـFK **موجود أصلاً** في الشكل التاريخي نفسه (وُلِد مع الجدول عبر db push)، وليس قيداً يُضاف لاحقاً مثل حالة `tours`/`payment_transactions`. **هذا الـbaseline يحتاج فعلياً FK حقيقياً على `contract_id` (إلى `contracts`، المبنية ✅) و`tenant_id` (إلى `tenants`، موجودة ✅)** — لا قيد ناقص.

## 5. الأعمدة المُستبعَدة عمداً

| العمود | أُضيف بـ | السبب |
|---|---|---|
| `invoice_id` | `transaction_spine` | `ADD COLUMN` صريح + FK جديد إلى `invoices` (غير مبنية بعد) |
| `payment_plan_id` | `phase1_quote_to_cash_closure` | `ADD COLUMN IF NOT EXISTS`، أبعد من الحاجز الحالي |

## 6. التصميم المقترح (نص توضيحي — لا ملف SQL فعلي)

```
CREATE TABLE public.installments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,                         -- FK → tenants(id) ON DELETE CASCADE
    contract_id UUID NOT NULL,                       -- FK → contracts(id) ON DELETE CASCADE
    installment_number INTEGER NOT NULL,
    amount_sar DECIMAL(12,2) NOT NULL,
    vat_amount DECIMAL(12,2),
    due_date DATE NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Pending',
    secure_payment_token UUID NOT NULL DEFAULT gen_random_uuid(),  -- UNIQUE
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT installments_pkey PRIMARY KEY (id),
    CONSTRAINT installments_secure_payment_token_key UNIQUE (secure_payment_token),
    CONSTRAINT uq_contract_installment_number UNIQUE (contract_id, installment_number),
    CONSTRAINT installments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT installments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);
CREATE INDEX idx_installments_contract_id ON installments(contract_id);
CREATE INDEX idx_installments_due_date ON installments(due_date);
CREATE INDEX idx_installments_tenant_id ON installments(tenant_id);
```

**FK scope: TENANT + CONTRACT** (لا `invoice_id`/`payment_plan_id` — مُستبعَدان كما في §5). هذا يختلف عن نمط `tours` (TENANT_ONLY) لأن `contract_id` هنا علاقة حقيقية موجودة أصلاً في الشكل التاريخي، لا قيداً يُضاف لاحقاً.

## 7. الموضع المقترَح

الفتحات المشغولة: `235958`–`235966`. التبعية الوحيدة: يجب أن يأتي بعد `contracts` (235962) — متحقِّق تلقائياً لأي فتحة بعدها. الفتحة الحرة التالية:

```
20260612235967_create_installments_baseline
```

---

## 8. الأحكام

```
INSTALLMENTS_FIRST_APPEARANCE: 74e2375 (initial shape: 8 columns, no tenant_id/vat_amount)
INSTALLMENTS_CUTOFF_COMMIT: 9be2984^
INSTALLMENTS_BODY_STABILITY: VERIFIED across 3 checkpoints (ef38b60, a60a604, 9be2984^) — stable
   throughout the entire migration-relevant window; pre-ef38b60 evolution (adding tenant_id/vat_amount)
   predates all tracked migrations and is irrelevant to baseline correctness
INSTALLMENTS_DEPENDENT_MIGRATIONS: COMPLETE — exactly 2 (transaction_spine, phase1_quote_to_cash_closure)
INSTALLMENTS_FK_SCOPE: TENANT_AND_CONTRACT — both real FKs present at baseline point, both targets
   already exist (tenants from init_database, contracts baseline built and tested)
INSTALLMENTS_CONSTRAINTS: 1 unique (contract_id, installment_number) + 1 unique (secure_payment_token)
INSTALLMENTS_INDEX_REQUIREMENTS: 3 (contract_id, due_date, tenant_id)
INSTALLMENTS_PROPOSED_SLOT: 20260612235967_create_installments_baseline

INSTALLMENTS_BASELINE_BLUEPRINT_READY
```

**لم يُكتب أي migration. لم يُشغَّل أي أمر على أي قاعدة بيانات.**
