# PRE_20260614_TRANSACTION_BASELINE_BLUEPRINT (v2 — مصحَّحة)

**تاريخ:** 26 يونيو 2026
**الحالة:** `BLUEPRINT_CORRECTED — NOT_YET_APPROVED`
**يُلحَق بـ:** [BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md) و[BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md](BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md)
**الغرض:** تصميم الحد الأدنى من الجداول المطلوبة لتجاوز الحاجز الحالي المُثبَت (`20260614_add_paylink_gateway_fields` يفشل لأن `payment_transactions`/`rental_invoices` غير موجودين على قاعدة فارغة).

**⚠️ هذا تصميم فقط. لم يُكتب أي ملف `migration.sql` جديد. لم يُشغَّل `migrate deploy`. لا تنفيذ في هذا الملف.**

**ملخص التصحيح عن v1:** الحكم السابق كان `PRE_20260614_TRANSACTION_BASELINE_BLUEPRINT: CONDITIONALLY_VALID — NOT_APPROVED`. هذا الإصدار يحل الأربع نقاط المطلوبة بأدلة حرفية مباشرة، لا افتراضات.

---

## 1. النطاق الدقيق للحاجز (بلا تغيير، كان صحيحاً)

قراءة مباشرة لمحتوى `prisma/migrations/20260614_add_paylink_gateway_fields/migration.sql` (الملف الكامل):

```sql
-- PaymentTransaction gateway tracking fields
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'manual';
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider_invoice_id TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider_reference TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS gateway_status TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMPTZ;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- RentalInvoice gateway tracking fields
ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS gateway_provider TEXT;
ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS gateway_status TEXT;
ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS payment_url TEXT;
```

لا `FOREIGN KEY`/`REFERENCES` في هذا الملف. المطلوب فقط وجود الجدولين كجدولين خام.

---

## 2. سلسلة الاعتماد (بلا تغيير، كانت صحيحة)

```
Tenant (موجود)
  ├─→ RentalLease (Tier 0)
  │     └─→ rental_invoices (FK على lease_id NOT NULL)
  └─→ payment_transactions (بلا أي FK سوى tenant_id عند هذه النقطة)
```

`rental_invoices` و`payment_transactions` مستقلان عن بعضهما عند هذه النقطة الزمنية تحديداً (الـFK بينهما يُضاف لاحقاً في `transaction_spine`).

---

## 3. التصحيح #1 — `RENTAL_LEASES_COLUMN_MATRIX: VERIFIED`

**الخطأ في v1:** قيل "17 عمودًا" بينما سُرد 15 فقط، والمصدر كان `schema.prisma` الحالي لا الجسم التاريخي عند نقطة القطع الصحيحة.

**التصحيح:** استُخرج جسم `model RentalLease` حرفياً عند **نفس نقطة القطع المستخدمة لـPaymentTransaction/RentalInvoice** (`48a600d^`، الأب المباشر لكوميت إدخال `20260614`):

```prisma
model RentalLease {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String    @map("tenant_id") @db.Uuid
  tenant       Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  unitId       String?   @map("unit_id") @db.Uuid
  unitName     String    @map("unit_name")
  tenantName   String    @map("tenant_name")
  startDate    DateTime  @map("start_date") @db.Date
  endDate      DateTime  @map("end_date") @db.Date
  rentAmount   Decimal   @map("rent_amount") @db.Decimal(12, 2)
  deposit      Decimal   @default(0) @map("deposit") @db.Decimal(12, 2)
  currency     String    @default("SAR")
  status       String    @default("active")
  financialRef String?   @map("financial_ref")
  vatType      String    @default("STANDARD") @map("vat_type")
  vatRate      Decimal   @default(15.00) @map("vat_rate") @db.Decimal(5, 2)
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  invoices     RentalInvoice[]

  @@index([tenantId], map: "idx_rental_leases_tenant_id")
  @@map("rental_leases")
}
```

**النتيجة:** الجسم التاريخي عند `48a600d^` **مطابق حرفياً** لشكل `schema.prisma` الحالي (الفرق الوحيد: اسم نوع العلاقة `RentalInvoice[]` بدل `Invoice[]` — تبعاً لإعادة التسمية اللاحقة، ليس عمود حقيقي). **العدد الصحيح: 15 عموداً قابلاً للتخزين** (`id, tenant_id, unit_id, unit_number→لا يوجد، unit_name, tenant_name, start_date, end_date, rent_amount, deposit, currency, status, financial_ref, vat_type, vat_rate, created_at` = 15، لا 17 ولا 14). الرقم "17" في v1 كان خطأ كتابي بحت، مُصحَّح الآن بدليل استخراج حرفي، لا بإعادة عدّ فقط.

```
RENTAL_LEASES_COLUMN_MATRIX: VERIFIED — 15 columns, historical body at 48a600d^ identical to current schema.prisma
```

---

## 4. التصحيح #2 — `PAYMENT_TRANSACTIONS_netAmount_PROVENANCE: VERIFIED`

**الخطأ في v1:** افتراض غير مُسنَد بأن الفجوة في الترقيم التسلسلي (الموضع 7 غائب) "قرينة" على حذف عمود قديم، بلا تتبّع فعلي.

**التحقيق الكامل المنفَّذ الآن:**

1. **المصدر الأول (سكربت يدوي):** `docs/reports/archive/sql/sprint3_migration.sql` — موجود منذ commit `ef38b60` (نفس commit إدخال `model PaymentTransaction` لأول مرة)، **بلا تغيير منذ ذلك الحين** (مؤكَّد بـ`diff`). يعرّف الجدول بصيغة snake_case كاملة:
   ```sql
   CREATE TABLE IF NOT EXISTS "payment_transactions" (
     "id" UUID DEFAULT gen_random_uuid() NOT NULL,
     "tenant_id" UUID NOT NULL,
     "invoice_id" TEXT,
     "installment_id" TEXT,
     "amount" DECIMAL(12,2) NOT NULL,
     "fee" DECIMAL(12,2) DEFAULT 0 NOT NULL,
     "net_amount" DECIMAL(12,2) NOT NULL,        -- ترتيبه السابع بالضبط، بين fee وcurrency
     "currency" TEXT DEFAULT 'SAR' NOT NULL,
     ...
   ```
   هذا الترتيب (`net_amount` بين `fee` و`currency`) **يطابق تماماً** موضع الفجوة (الموضع 7) في تصدير CSV الحقيقي.

2. **المصدر الثاني (schema.prisma، نفس الكوميت `ef38b60` تحديداً):**
   ```prisma
   netAmount     Decimal  @db.Decimal(12, 2)
   ```
   **بلا `@map(...)` على الإطلاق** (مؤكَّد بـ`git log -S '@map("net_amount")'` على كامل تاريخ الملف — صفر نتائج). بدون `@map`، تستخدم Prisma الاسم الحرفي للحقل (`netAmount`) كاسم العمود مباشرة، دون أي تحويل لـsnake_case تلقائي.

**الاستنتاج المُسنَد (لا افتراض):** السكربت اليدوي والـschema.prisma **يتعارضان منذ نفس اللحظة التاريخية** على اسم هذا العمود تحديداً. الدليل القوي (تطابق موضع الفجوة 7 مع ترتيب السكربت) يدعم أن العمود أُنشئ أصلاً بصيغة `net_amount` (عبر السكربت اليدوي أو db push أول)، ثم في مرحلة لاحقة اكتشف `prisma db push` — المُعتمِد فقط على schema.prisma — أن الحقل `netAmount` بلا عمود مطابق، فأضاف عموداً جديداً بالاسم الحرفي `netAmount` (واضعاً إياه في آخر الترتيب التسلسلي وقتها، أي الموضع 25)، تاركاً `net_amount` القديم مهجوراً (إن لم يُحذف صريحاً، فهو غير مُستخدَم؛ التصدير الحقيقي يؤكد عدم وجود `net_amount` الآن أصلاً، فقط `netAmount`).

**الحكم العملي:** بغضّ النظر عن دقة تفاصيل ما حدث، **القاعدة الحقيقية الآن تحتوي `netAmount` (camelCase) لا `net_amount`** — هذا مؤكَّد مباشرة من CSV، وهو ما يجب أن يطابقه الـbaseline.

```
PAYMENT_TRANSACTIONS_netAmount_PROVENANCE: VERIFIED — column is literally "netAmount" (no @map ever existed),
   gap at ordinal position 7 is consistent with (not proven beyond doubt, but evidence-backed) a superseded
   net_amount column from sprint3_migration.sql never reconciled with schema.prisma's unmapped field name.
   Baseline MUST use literal "netAmount" identifier (double-quoted in SQL to preserve case).
```

---

## 5. التصحيح #3 — `RENTAL_INVOICES_UPDATED_AT_DEFAULT: VERIFIED`

**الخطأ في v1:** صياغة "`@updatedAt` تطبيقي، يكفي افتراض `DEFAULT now()`" — تبدو كاستنتاج من `@updatedAt` وحده، وهذا غير سليم منهجياً كما أشرتَ.

**الدليل الحرفي المباشر** (لا استنتاج) — السطر الفعلي في جسم `model RentalInvoice` عند `48a600d^`:
```
38:  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
39:  updatedAt     DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz
```

هذا تصريح Prisma **يحتوي حرفياً `@default(now())` بجانب `@updatedAt`** — وهما توجيهان مستقلان في نفس السطر: `@default(now())` يحدد قيمة الإدخال الأولى (ويُترجَم عادة إلى `DEFAULT now()` على مستوى قاعدة البيانات عبر `db push`/`migrate`)، و`@updatedAt` سلوك تطبيقي إضافي منفصل (يُحدِّث القيمة عند كل UPDATE عبر Prisma Client، لا DB trigger). الإثبات هنا هو وجود `@default(now())` الصريح، لا الاستنتاج من `@updatedAt`.

```
RENTAL_INVOICES_UPDATED_AT_DEFAULT: VERIFIED — literal "@default(now())" present in the Prisma declaration
   at 48a600d^, independent of and in addition to "@updatedAt". DB-level DEFAULT now() is justified by this
   explicit directive, not inferred from @updatedAt alone.
```

---

## 6. التصحيح #4 — `RENAME_AWARE_LEGACY_PATH: DESIGNED`

**المشكلة المرصودة:** الـbaseline المقترح لـ`rental_invoices` (بالقالب المعتاد: `IF to_regclass('public.rental_invoices') IS NULL THEN CREATE ... ELSE validate ...`) **سيتصرف بشكل خاطئ على أي قاعدة حقيقية سبق أن طبّقت `transaction_spine` بنجاح** — لأن `transaction_spine` يُعيد تسمية الجدول إلى `invoices`، فيصبح `to_regclass('public.rental_invoices')` يُعيد `NULL` (الجدول غير موجود بهذا الاسم بعد الآن)، فيحاول الـbaseline **إنشاء جدول `rental_invoices` جديد من الصفر** — وهذا خاطئ تماماً: البيانات الحقيقية موجودة فعلاً تحت اسم `invoices`، ولا يجوز إنشاء جدول مكرر باسم قديم.

**التصميم المصحَّح (Rename-aware)، بصيغة شبه-كود — لم يُكتب كملف migration فعلي بعد:**

```sql
DO $migration$
BEGIN
    IF to_regclass('public.rental_invoices') IS NULL THEN
        -- الحالة 1: الجدول غير موجود بالاسم القديم. هل أُعيدت تسميته فعلاً؟
        IF to_regclass('public.invoices') IS NOT NULL THEN
            -- transaction_spine سبق وطُبِّق بنجاح؛ هذه الحالة الصحيحة المتوقعة على
            -- قاعدة حقيقية متطوّرة. لا شيء يُفعَل — الجدول موجود تحت اسمه الجديد
            -- وهذا الـbaseline لا ينطبق هنا.
            RAISE NOTICE 'rental_invoices already renamed to invoices; baseline is a no-op here.';
        ELSE
            -- الحالة 2: لا الاسم القديم ولا الجديد موجود. قاعدة فارغة فعلاً.
            -- يُنشأ الجدول بشكله التاريخي الصحيح (33 حقلاً، انظر Addendum §1).
            CREATE TABLE public.rental_invoices ( /* ... 33 columns ... */ );
        END IF;
    ELSE
        -- الحالة 3: الجدول موجود بالاسم القديم فعلاً (قاعدة لم تُطبَّق عليها
        -- transaction_spine بعد). تحقق من تطابق الأعمدة كالعادة.
        /* ... DO block تحقق الأعمدة المعتاد ... */
    END IF;
END
$migration$;
```

**نقطة تحتاج قراراً منك قبل الاعتماد النهائي:** هل نفس منطق "Rename-aware" مطلوب لجداول أخرى لاحقاً (مثل أي جدول آخر اكتشفنا له تاريخ rename)؟ حسب الفحص الحالي، `rental_invoices→invoices` هي **حالة الـrename الوحيدة المعروفة** بين كل الـ32 جدولاً قيد الدراسة — لا حاجة لتعميم هذا النمط الآن، فقط لهذا الجدول تحديداً.

```
RENAME_AWARE_LEGACY_PATH: DESIGNED — three-way branch (old-name-exists / new-name-exists-already / neither-exists)
   specified above. Not yet written into an actual migration.sql file.
```

---

## 7. الأحكام النهائية المُصحَّحة

```
RENTAL_LEASES_COLUMN_MATRIX: VERIFIED
PAYMENT_TRANSACTIONS_netAmount_PROVENANCE: VERIFIED
RENTAL_INVOICES_UPDATED_AT_DEFAULT: VERIFIED
RENAME_AWARE_LEGACY_PATH: DESIGNED
PRE_20260614_TRANSACTION_BASELINE_BLUEPRINT: CORRECTED — PENDING_FINAL_APPROVAL
OVERALL_BASELINE_DESIGN_GATE: BLOCKED
```

**لم يُكتب أي migration. لم يُشغَّل أي أمر على أي قاعدة بيانات في هذه التصحيحات.**

## الخطوة التالية
بانتظار اعتمادك النهائي لهذا الإصدار المُصحَّح قبل كتابة أي ملف `migration.sql` فعلي. لا أبدأ الكتابة دون توجيه صريح.

---

## 8. نتيجة التنفيذ الفعلي (بعد الاعتماد)

**الملفات المكتوبة فعلياً:**
- `prisma/migrations/20260612235963_create_rental_leases_baseline/migration.sql`
- `prisma/migrations/20260612235964_create_rental_invoices_baseline/migration.sql` (فرع rename-aware رباعي كامل)
- `prisma/migrations/20260612235965_create_payment_transactions_baseline/migration.sql` (`"netAmount"` حرفي)

**الاختبار:** قاعدة leaf جديدة فارغة 100% (`migration_test_3baselines`) داخل الفرع المعزول `br-floral-cake-aqu1olyp`.

```
45 migrations found
✅ ... (كل ما سبق نجح كالمعتاد، بما فيه units/contracts)
✅ 20260612235963_create_rental_leases_baseline       ← جديد، نجح
✅ 20260612235964_create_rental_invoices_baseline     ← جديد، نجح (فرع "neither exists" → CREATE)
✅ 20260612235965_create_payment_transactions_baseline ← جديد، نجح
✅ 20260613_add_execution_payload_to_sentinel_task_orders
✅ 20260613_add_hash_columns
✅ 20260613_add_phonehash_unique
✅ 20260613_drop_phone_unique
✅ 20260614_add_paylink_gateway_fields                ← الحاجز الأصلي المستهدف، تجاوزناه بنجاح
✅ 20260619000100_payment_transaction_provider_neutral_security
✅ 20260619000200_whatsapp_webhook_persistence_foundation
✅ 20260620000100_whatsapp_contact_assignment_archive
✅ 20260620000150_whatsapp_enum_prerequisites
✅ 20260620000200_whatsapp_multi_tenant_foundation
✅ 20260620000201_whatsapp_hardening
✅ 20260620000202_whatsapp_p0_final_integrity
✅ 20260621000100_security_final_core
❌ 20260621000200_transaction_spine
   Error 42P01: relation "tours" does not exist
```

**الحكم:**
```
PRE_20260614_TRANSACTION_BASELINE_BLUEPRINT: IMPLEMENTED_AND_TESTED
RENTAL_LEASES_BASELINE: PASSED_FRESH_DB_TEST
RENTAL_INVOICES_BASELINE_RENAME_AWARE_PATH: PASSED_FRESH_DB_TEST (فرع "neither exists" مُختبَر؛
   فرعا "invoices only" و"both exist" لم يُختبَرا فعلياً بعد — يحتاجان قاعدة بحالة مختلفة لاختبارهما)
PAYMENT_TRANSACTIONS_BASELINE_netAmount: PASSED_FRESH_DB_TEST
TARGET_BARRIER_20260614: CLEARED — السلسلة تقدّمت 9 migrations إضافية بعده
NEW_BARRIER: 20260621000200_transaction_spine — relation "tours" does not exist
OVERALL_BASELINE_DESIGN_GATE: BLOCKED (الحاجز انتقل من payment_transactions إلى tours)
```

**ملاحظة صادقة:** فرعا "rename-aware" الآخران (وجود `invoices` فقط، أو وجود الاثنين معاً) **لم يُختبَرا بتشغيل فعلي** — فقط الفرع "لا أحدهما موجود" (القاعدة الفارغة) اختُبر، لأنه الحالة الوحيدة المتاحة على قاعدة طازجة. اختبار الفرعين الآخرين يتطلب قاعدة وصلت فعلاً لمرحلة `transaction_spine` (لإنشاء حالة `invoices` فقط) — غير متوفرة حالياً ضمن هذا الاختبار المعزول.
