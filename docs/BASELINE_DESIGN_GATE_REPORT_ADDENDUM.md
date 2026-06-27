# Historical Baseline Design Gate — Addendum 1

**تاريخ:** 26 يونيو 2026
**يُلحَق بـ:** [BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md) (لا يُحذف، هذا ملحق إضافي فقط)
**النطاق:** إغلاق ثغرة rental_invoices، حل تعارض ترقيم units/contracts، نتيجة اختبار مباشر على قاعدة معزولة.

---

## 1. إغلاق أرشيف rental_invoices (يُلغي التحذير في التقرير الأصلي §5)

مراجعة مستقلة (وكيل Plan) أعادت تتبّع كل الكوميتات بين `1136cfb` و`9be2984` التي لمست `model RentalInvoice` فعلياً (لا فقط ظهوره/اختفاءه):

**الكوميتات الست الفعلية:** `31b608f, da816e5, 270d6be, 48a600d, 0bc1d79, 9be2984`

**جدول provenance كامل (33 حقلاً/علاقة، بلا فجوة) عند الحالة الصحيحة (`9be2984^`، أي مباشرة قبل rename إلى `invoices`):**

| الحقل | أُضيف عند | ملاحظة |
|---|---|---|
| id | 1136cfb | `dbgenerated(gen_random_uuid())` |
| lease_id, lease relation | 1136cfb | **NOT NULL** عند هذه النقطة (يصبح nullable فقط عند 9be2984/transaction_spine) |
| due_date, status(default unpaid), paid_at, payment_method, payment_ref, created_at | 1136cfb | |
| tenant_id, tenant relation | 31b608f | |
| invoice_number, invoice_prefix(default INV), zatca_uuid(default uuid()) | da816e5 | |
| issue_date, subtotal, vat_rate(default 15.00), vat_amount, total_amount | da816e5 | |
| qr_payload, qr_code, qr_image | da816e5 | |
| invoice_type_code(default 388), previous_invoice_hash | da816e5 | |
| zatca_xml, zatca_signed_xml, zatca_status(default DRAFT), zatca_response, zatca_error, zatca_cleared_at | da816e5 | |
| updated_at | da816e5 | `@updatedAt` تطبيقي، ليس DB trigger — يكفي `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| **مستبعد:** gateway_provider, gateway_status, payment_url | 48a600d | تُضاف بـ `ADD COLUMN IF NOT EXISTS` في `20260614_add_paylink_gateway_fields` — لا تدخل الـbaseline |
| **مستبعد:** type, contract_id, nullable lease_id، علاقات installments/paymentTransactions، إعادة تسمية الفهارس | 9be2984 | جزء من transaction_spine، ليس الـbaseline |

اسم الجدول وقت الـbaseline: `rental_invoices`. فهارس: `idx_rental_invoices_lease_id`, `idx_rental_invoices_tenant_id`. قيد فريد: `uq_tenant_invoice_number` على `(tenant_id, invoice_number)`.

**الحكم:**
```
RENTAL_INVOICES_FIELD_PROVENANCE: CLOSED  (جدول الـ33 حقلاً كامل، بلا فجوة)
RENTAL_INVOICES_BASELINE_DDL: NOT_YET_APPROVED  (لم يُكتب أي ملف migration.sql فعلي بعد)
```
هذا الجدول محفوظ كمرجع جاهز فقط؛ البناء الفعلي خارج نطاق هذه الجولة.

---

## 2. حل تعارض ترقيم units/contracts

### المشكلة
`20260612235962_create_contracts_baseline` يحتل أدنى فتحة رقمية متاحة، بينما `contracts` يحتوي FK **NOT NULL** على `unit_id` يتطلب وجود `units` قبله. لا توجد فتحة رقمية حرة بين `235958`(محتل)-`235962`(محتل) تسبق `235962`.

### القرار المعتمد (Option C)
لا تعديل على اسم أو محتوى `20260612235962_create_contracts_baseline`. إنشاء migration مستقلة:

```
prisma/migrations/20260612235961a_create_units_baseline/migration.sql
```

### إثبات الترتيب حسابياً (مرتين: نصياً ثم على القرص الفعلي)

```
$ printf "...\n" | sort
20260612235960_create_whatsapp_messages_baseline
20260612235961_create_mansour_chats_baseline
20260612235961a_create_units_baseline
20260612235962_create_contracts_baseline
20260613_add_hash_columns

$ ls prisma/migrations/ | grep "^2026061223596" | sort   # على القرص الفعلي بعد الإنشاء
20260612235960_create_whatsapp_messages_baseline
20260612235961_create_mansour_chats_baseline
20260612235961a_create_units_baseline
20260612235962_create_contracts_baseline
```

مطابق تماماً للمطلوب.

### تأكيد عدم وجود FK لـ offers/opportunities داخل contracts baseline
قراءة مباشرة لـ `20260612235962_create_contracts_baseline/migration.sql` الموجود تؤكد: الأعمدة الوحيدة `id, tenant_id, unit_id, buyer_name, buyer_phone, total_volume_sar, signed_at, end_date, status, vat_type, vat_rate, created_at` — **بلا** `lead_id` أو `offer_id` (هذان يُضافان لاحقاً بـ `transaction_spine`). لذلك: **لم تُبنَ migrations لـ opportunities/offers في هذه الجولة**، تماشياً مع توجيه المستخدم بعدم التجميع الاستباقي.

### تحقق تاريخي لـ units قبل البناء
- أول ظهور: `74e2375`.
- **لا يوجد أي `ALTER TABLE units`** في أي migration (تم تأكيده بـ`grep` شامل) — فقط FK *من* جداول أخرى (tours, contracts) *إلى* units.
- **اكتشاف:** جسم `model Unit` تطوّر بشكل كبير منذ `74e2375` (إضافة `tenant_id` و14 حقلاً إضافياً: type, area, beds, city, district, lat, lng, agent_name, description, media, docs, events, handovers, tour_type, tour_url, updated_at) عبر `db push` غير متتبَّع — لكن **لأن لا توجد migration متتبَّعة تُغيّر units بعد إنشائها أبداً، فإن الشكل الحالي في `schema.prisma` هو أفضل قيمة متاحة لكل من: (أ) نجاح migrate deploy، و(ب) تطابق الإنتاج الفعلي** (بما أن db push هو الآلية الوحيدة التي تُزامن هذا الجدول، وschema.prisma هو مصدرها).
- الملف المبني: `prisma/migrations/20260612235961a_create_units_baseline/migration.sql` — يستخدم الشكل الكامل الحالي بالضبط، بنفس قالب التحقق الـidempotent المستخدم في الـ3 baselines السابقة.

---

## 3. نتيجة الاختبار المباشر (دليل فعلي، لا نظري)

**البيئة:** قاعدة جديدة فارغة 100% (`migration_test_units_fix`) داخل الفرع المعزول `br-floral-cake-aqu1olyp` (project `weathered-cherry-24191909`) على Neon — لا صلة بـ`.env.local`/`.env.production`.

**الأمر:** `npx prisma migrate deploy`

**النتيجة:**
```
42 migrations found in prisma/migrations
✅ ... (كل ما قبل units نجح كالمعتاد)
✅ Applying migration `20260612235961a_create_units_baseline`   ← جديد، نجح
✅ Applying migration `20260612235962_create_contracts_baseline` ← لم يفشل هذه المرة (كان يفشل سابقاً بسبب غياب units)
✅ Applying migration `20260613_add_execution_payload_to_sentinel_task_orders`
✅ Applying migration `20260613_add_hash_columns`
✅ Applying migration `20260613_add_phonehash_unique`
✅ Applying migration `20260613_drop_phone_unique`
❌ Error P3018 at `20260614_add_paylink_gateway_fields`
   Database error 42P01: relation "payment_transactions" does not exist
```

**الحكم:** `UNITS_CONTRACTS_FRESH_DATABASE_ORDERING: CLOSED` — مُثبَت بدليل تشغيل مباشر، لا نظري. السلسلة تقدّمت من نقطة فشل سابقة (عند `contracts`) إلى نقطة فشل جديدة لاحقة بكثير (عند `payment_transactions`)، بفارق 6 migrations ناجحة إضافية. هذا يطابق تماماً تنبؤ تحليل الاعتماديات (`payment_transactions` أول جدول تابع تالياً في `20260614_add_paylink_gateway_fields`).

**الحاجز الجديد الموثَّق:** `payment_transactions` — يحتاج بدوره `Invoice`/`Installment` (انظر §6 من التقرير الأصلي للـDAG الكامل). لم يُبنَ شيء له في هذه الجولة.

---

## 4. الأحكام الثابتة لهذا الملحق (مُصحَّحة)

```
UNITS_CONTRACTS_FRESH_DATABASE_ORDERING: CLOSED
UNITS_LEGACY_COLUMN_COMPATIBILITY: VALIDATED
CONTRACTS_LEGACY_COLUMN_COMPATIBILITY: VALIDATED
RENTAL_INVOICES_FIELD_PROVENANCE: CLOSED
RENTAL_INVOICES_BASELINE_DDL: NOT_YET_APPROVED
MIGRATION_HISTORY_ANOMALY_20260614: OPEN
REMAINING_TABLES_WITHOUT_CREATION_BASELINE: 28
OVERALL_BASELINE_DESIGN_GATE: BLOCKED
```

**تنبيه تصحيحي مهم:** التحقق في §5 أدناه هو **Column Compatibility فقط** (تطابق الأسماء/الأنواع/القيم الافتراضية للأعمدة)، **وليس Full Schema Compatibility**. لم يُفحَص: قيود CHECK، تفاصيل الفهارس الكاملة (partial/expression indexes)، triggers، RLS policies، أو دلالات ON DELETE/ON UPDATE الدقيقة على كل FK. هذه فجوة معرفية حقيقية يجب عدم التعامي عنها — `VALIDATED` تعني تطابق الأعمدة فقط.

## 5. تحقق Column Compatibility مع الإنتاج (ليس Full Schema Compatibility)

**المصدر:** المستخدم نفّذ استعلامات `information_schema.columns`/`information_schema.tables`/`_prisma_migrations` بنفسه عبر اتصال read-only منفصل (موسوم `legacy-schema-readonly`) على نفس مشروع Neon (`weathered-cherry-24191909`، قاعدة `neondb`)، وصدّر النتائج كـCSV وأرسلها مباشرة. **لم أتصل بأي قاعدة بنفسي في هذه الخطوة.** الملفات محفوظة في:
```
docs/knowledge-base/real-schema-evidence-2026-06-26/
  columns_contracts_installments_invoices_payment_transactions_units.csv
  tables_list.csv
  prisma_migrations_history_sample.csv
```

### CONTRACTS_LEGACY_COLUMN_COMPATIBILITY: VALIDATED
عدد الأعمدة الحقيقي: **23**. أعمدة الـbaseline (12) + كل الأعمدة التي تضيفها migrations لاحقة موثَّقة (`buyer_phone_hash`, `lead_id`, `offer_id`, `accepted_at`, `reservation_expires_at`, `cancelled_at`, `cancel_reason`, `version`, `spine_version`, `legacy_financial`, `legacy_reason` = 11) = **23 بالضبط. مطابقة تامة بالاسم والعدد على مستوى الأعمدة.**
الاختلافات الظاهرية الوحيدة (`status` default الآن `'PENDING_SIGNATURE'` لا `'Active'`؛ `signed_at` الآن nullable بلا default) **مفسَّرة بالكامل** بـ`ALTER COLUMN ... SET DEFAULT/DROP NOT NULL` الموجودة فعلياً في `phase1_quote_to_cash_closure` — لا تناقض، الـbaseline يمثّل الحالة عند نقطة إنشائه بشكل صحيح.
**نطاق الحكم: تطابق أعمدة فقط (أسماء/أنواع/defaults). لم تُفحَص القيود/الفهارس/الـtriggers.**

### UNITS_LEGACY_COLUMN_COMPATIBILITY: VALIDATED
عدد الأعمدة الحقيقي: **24**. **مطابقة على مستوى الأعمدة (24/24)** بالاسم والنوع والـdefault بلا أي استثناء — بما في ذلك القيم النصية العربية الدقيقة (`'شقة سكنية'`, `'120 م²'`) ونوع `DOUBLE PRECISION` لـ`lat`/`lng` و`JSONB DEFAULT '[]'` للحقول الأربعة.
**نطاق الحكم: تطابق أعمدة فقط. لم تُفحَص القيود/الفهارس/الـtriggers على units في القاعدة الحقيقية (لم يرد ذلك في تصدير CSV).**

### بيانات إضافية محفوظة للمستقبل (لم تُستخدم لبناء شيء الآن)
الـCSV يحتوي أيضاً البنية الحقيقية الكاملة لـ`installments` (12 عمود)، `invoices` (34 عمود فعلي، مع فجوتين بترقيم الأعمدة تشيران لعمودين محذوفين تاريخياً)، و`payment_transactions` (29 عمود فعلي، فجوة واحدة). هذا يؤكد بشكل مستقل دقة جدول provenance الذي بناه وكيل Plan لـ`rental_invoices`. تُحفظ كمرجع جاهز فقط — **لم تُبنَ أي migration بناءً عليها**.

---

## 6. MIGRATION_HISTORY_ANOMALY_20260614 — OPEN

من ملف `prisma_migrations_history_sample.csv` (سجل `_prisma_migrations` الحقيقي):

```
"20260614_add_paylink_gateway_fields","2026-06-12 16:50:11.579421+00","2026-06-12 16:50:11.579421+00",,0
"20260613_add_hash_columns",                "2026-06-13 06:12:17.812019+00","2026-06-13 06:12:22.293879+00",,1
```

**الشذوذ المرصود (وقائع، بلا تفسير نهائي):**
1. `20260614_add_paylink_gateway_fields` يحمل `started_at` و`finished_at` متطابقَين تماماً (نفس المللي ثانية) — أي صفر زمن تنفيذ فعلي — مع `applied_steps_count = 0`.
2. توقيت تسجيله (`2026-06-12 16:50:11`) **يسبق** توقيت تشغيل `20260613_add_hash_columns` (`2026-06-13 06:12:17`) — أي أن migration المُسمّاة بتاريخ لاحق (`20260614`) سُجّلت في `_prisma_migrations` **قبل** migration الأقدم اسمياً (`20260613`) بحوالي 13 ساعة.
3. مع ذلك، الأعمدة التي يُفترض أن هذه الـmigration تضيفها (`gateway_provider`, `gateway_status`, `payment_url` على `payment_transactions`/`rental_invoices`) **موجودة فعلياً** في القاعدة الحقيقية (مؤكَّد من CSV الأعمدة).

**الاستنتاج الممكن (غير مؤكَّد، يحتاج تحقيقاً إضافياً إن أُريد إصلاح القاعدة الحقيقية لاحقاً):** الأعمدة احتُملَ أنها أُضيفت عبر `db push` أو SQL يدوي، ثم سُجّلت هذه الـmigration في `_prisma_migrations` كـ"مُطبَّقة" دون تنفيذ SQL فعلي لها (نمط يشبه `migrate resolve --applied` بدلاً من تشغيل حقيقي) — لكن هذا **تخمين غير مُثبَت**، ولا يُعتمد كحقيقة دون تحقيق منفصل.

**الأثر على هذه الخطة:** لا يُغيّر شيئاً في تصميم baselines الـفresh-DB (مُثبَت أصلاً بشكل منفصل ومباشر أن `20260614` يفشل على قاعدة فارغة بسبب غياب `payment_transactions`/`rental_invoices` فعلياً — هذا واقع مُختبَر، لا يعتمد على تفسير الشذوذ). الشذوذ يخص فقط **فهم تاريخ القاعدة الحقيقية المُتطوِّرة**، منفصل عن نطاق Fresh Database Design Gate. **يبقى OPEN حتى تحقيق مخصَّص له إن طُلب.**

---

## القيود المفتوحة المتبقية

1. ~~مصدر تحقق Column Compatibility مع الإنتاج~~ — **محلول كآلية**، مُطبَّق على جدولين (units, contracts)، يُعاد تطبيقه لكل جدول جديد يُبنى. **لا يزال Full Schema Compatibility (قيود/فهارس/triggers) غير مفحوص لأي جدول.**
2. **MIGRATION_HISTORY_ANOMALY_20260614** — مفتوح، منفصل عن نطاق هذا الـGate.
3. **نطاق الاستمرار:** الخطوة التالية الوحيدة المعتمدة الآن هي `PRE_20260614_TRANSACTION_BASELINE_BLUEPRINT` (تصميم فقط، بلا migrations جديدة وبلا تشغيل `migrate deploy`).
