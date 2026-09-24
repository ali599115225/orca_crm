# RECEIPTS_TEMPORAL_BASELINE_BLUEPRINT

**تاريخ:** 26 يونيو 2026
**الحالة:** `BLUEPRINT_DRAFT`
**يُلحَق بـ:** [BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md), [BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md](BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md)
**الغرض:** تصميم baseline لجدول `receipts` — الحاجز الجديد بعد إغلاق `leads.unit_id` (النتيجة الفعلية: `20260622060000_phase1_quote_to_cash_closure` يفشل بـ`relation "receipts" does not exist`).

**⚠️ تصميم وتحليل فقط. لم يُكتب أي ملف `migration.sql`. لم يُشغَّل `migrate deploy`.**

**حالة `leads.unit_id` وكل الحواجز السابقة:** `CLOSED` — لا تُفتح مجدداً.

---

## 1. أول ظهور ونقطة القطع

- **أول ظهور لـ`model Receipt`:** commit `533853a` — شكل أولي بسيط جداً **بلا `tenant_id` إطلاقاً**.
- **نقطة القطع (الأب المباشر لكوميت إدخال `phase1_quote_to_cash_closure`):** `ab75ce0^`.

## 2. الجسم التاريخي الدقيق عند نقطة القطع (حرفي)

```prisma
model Receipt {
  id            String         @id @default(uuid())
  tenantId      String         @map("tenant_id") @db.Uuid
  tenant        Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invoiceId     String
  amount        Decimal
  paymentMethod String
  receivedDate  DateTime       @default(now())
  status        String         @default("COMPLETED")
  ledgerEntry   GeneralLedger?

  @@index([tenantId], map: "idx_receipts_tenant_id")
  @@map("receipts")
}
```

**عند أول ظهور (`533853a`):** الشكل أبسط — **بلا `tenant_id`** على الإطلاق (`id, invoiceId, amount, paymentMethod, receivedDate, status, ledgerEntry` فقط، 6 أعمدة). أُضيف `tenant_id` (مع فهرسه) عبر `db push` غير متتبَّع في وقت ما بين `533853a` ونقطة القطع. **الشكل المعتمَد للـbaseline هو حالة نقطة القطع** (7 أعمدة)، لا الشكل الأولي.

## 3. ⚠️ ملاحظة جوهرية: هذا الموديل مكتوب بأسلوب مختلف عن كل ما سبق

خلافاً لكل الجداول السابقة في هذا الـGate، نموذج `Receipt` **لا يستخدم `@map` لمعظم الحقول، ولا `@db.Uuid` لـ`invoiceId`، ولا `dbgenerated()` لـ`id`**:

| الحقل | الإعلان الحرفي | الاستنتاج |
|---|---|---|
| `id` | `@default(uuid())` — **لا** `dbgenerated()` | توليد UUID من طرف Prisma Client، **لا default على مستوى القاعدة**. بلا `@db.Uuid` → النوع `TEXT` لا `UUID` |
| `invoiceId` | `String` بلا `@map` وبلا `@db.Uuid` | اسم العمود الحرفي **`invoiceId`** (camelCase، لا `invoice_id`) — نفس نمط شذوذ `netAmount` المُكتشَف سابقاً. النوع `TEXT`، ليس FK حقيقياً (لا UUID، لا علاقة) |
| `amount` | `Decimal` بلا `@db.Decimal(p,s)` | النوع الافتراضي لـPrisma/PostgreSQL لـ`Decimal` بلا تحديد دقة: `DECIMAL(65,30)` (التوثيق الرسمي لـPrisma) |
| `paymentMethod` | `String` بلا `@map` | اسم العمود الحرفي **`paymentMethod`** (camelCase) |
| `receivedDate` | `DateTime @default(now())` بلا `@db.Timestamptz`/`@db.Date` | اسم العمود الحرفي **`receivedDate`** (camelCase)، والنوع الافتراضي لـ`DateTime` بلا تحديد: `TIMESTAMP(3)` **بلا timezone** (يختلف عن كل الحقول الأخرى في المشروع التي تستخدم `@db.Timestamptz` صريحاً) |

**هذا قرار تصميم موثَّق بثقة عالية (سلوك Prisma الافتراضي معروف ومُوثَّق رسمياً)، لكنه غير مُتحقَّق منه بدليل CSV حقيقي مباشر** (لا يتوفر تصدير `information_schema` لجدول `receipts` تحديداً، خلافاً لـ`contracts`/`units`/`installments`/`payment_transactions`). يُسجَّل هذا بصراحة كفرق ثقة عن الحالات السابقة.

## 4. تحقق الاستقرار

فحص نقطتي زمن (`533853a` و`ab75ce0^`) يُظهر فرقاً واحداً واضحاً (`tenant_id` + فهرسه). لا توجد نقاط وسيطة إضافية تستدعي فحصاً (لا migrations تلمس الجدول بين هاتين النقطتين، انظر §5).

## 5. الاعتمادات والـFK والقيود

فحص شامل لكل الـmigrations: **migration واحدة فقط** تلمس `receipts` (وهي نفسها الحاجز الحالي):

```sql
-- phase1_quote_to_cash_closure (الحاجز الحالي، يُستبعَد من الـbaseline):
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "payment_transaction_id" UUID;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_transaction_id_fkey"
    FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_payment_transaction_id_key"
    ON "receipts"("payment_transaction_id") WHERE "payment_transaction_id" IS NOT NULL;
```

**الحكم: FK scope = TENANT_ONLY عند نقطة القطع.** `payment_transaction_id` (والـFK/الفهرس المرتبطان به) مُستبعَدون بالكامل — هم بالضبط ما تضيفه هذه الـmigration نفسها.

## 6. التصميم المقترح (نص توضيحي)

```
CREATE TABLE public.receipts (
    id TEXT NOT NULL,                          -- بلا default على مستوى DB (Prisma Client يولّده)
    tenant_id UUID NOT NULL,                   -- FK → tenants(id) ON DELETE CASCADE
    "invoiceId" TEXT NOT NULL,                  -- اسم حرفي camelCase، ليس FK حقيقياً
    amount DECIMAL(65,30) NOT NULL,
    "paymentMethod" TEXT NOT NULL,               -- اسم حرفي camelCase
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT now(),  -- بلا timezone، اسم حرفي camelCase
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    CONSTRAINT receipts_pkey PRIMARY KEY (id),
    CONSTRAINT receipts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_receipts_tenant_id ON receipts(tenant_id);
```

## 7. الموضع المقترَح

الفتحات المشغولة: `235958`–`235970`. لا اعتماد سوى `tenants` (موجود). الفتحة الحرة التالية:

```
20260612235971_create_receipts_baseline
```

---

## 8. الأحكام

```
RECEIPTS_FIRST_APPEARANCE: 533853a (initial shape: 6 columns, NO tenant_id)
RECEIPTS_CUTOFF_COMMIT: ab75ce0^
RECEIPTS_BODY_STABILITY: VERIFIED -- single documented delta (tenant_id + index) between the two checkpoints
RECEIPTS_DEPENDENT_MIGRATIONS: COMPLETE -- exactly 1 (phase1_quote_to_cash_closure, the current barrier itself)
RECEIPTS_FK_SCOPE: TENANT_ONLY at baseline point
RECEIPTS_NAMING_ANOMALY: invoiceId, paymentMethod, receivedDate are literal camelCase column names
   (no @map directives), consistent with the project's established netAmount precedent
RECEIPTS_TYPE_CONFIDENCE: MEDIUM-HIGH -- id/amount/receivedDate native-type inference relies on
   documented Prisma default mappings (no dbgenerated() -> no DB default; unmapped Decimal -> 65,30;
   unmapped DateTime -> TIMESTAMP(3) no timezone), NOT on a real information_schema export for this
   specific table (none available, unlike contracts/units/installments/payment_transactions)

RECEIPTS_BASELINE_BLUEPRINT_READY
```

**لم يُكتب أي migration. لم يُشغَّل أي أمر على أي قاعدة بيانات. لم يُفتح أي حاجز سابق.**
