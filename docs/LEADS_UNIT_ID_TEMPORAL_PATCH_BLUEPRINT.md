# LEADS_UNIT_ID_TEMPORAL_PATCH_BLUEPRINT

**تاريخ:** 26 يونيو 2026
**الحالة:** `BLUEPRINT_DRAFT`
**يُلحَق بـ:** [BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md), [BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md](BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md)
**الغرض:** تصميم **patch صغيرة** (لا baseline جدول كامل) لإضافة عمود `leads.unit_id` المفقود — الحاجز الجديد بعد إغلاق `offers` (النتيجة الفعلية: `20260621000300_offer_unit_integrity` يفشل بـ`column l.unit_id does not exist`، خطأ `42703` لا `42P01` — **عمود ناقص على جدول موجود فعلاً، لا جدول كامل مفقود**).

**⚠️ تصميم وتحليل فقط. لم يُكتب أي ملف `migration.sql`. لم يُشغَّل `migrate deploy`. لا إعادة بناء لجدول `leads` نفسه (موجود من `init_database`، سليم بخلاف هذا العمود الواحد).**

**حالة `offers`:** `CLOSED` — معتمَدة، لا تُفتح مجدداً. ولا أي حاجز سابق آخر.

---

## 1. طبيعة الحاجز (مختلفة عن كل ما سبق)

كل الحواجز السابقة (`units`, `rental_leases`, `rental_invoices`, `payment_transactions`, `tours`, `installments`, `opportunities`, `offers`) كانت **جدولاً كاملاً مفقوداً** (`42P01: relation does not exist`). هذا الحاجز مختلف نوعياً: **`leads` موجود وسليم تماماً** (أُنشئ في `20260524004442_init_database` ولا أي migration أخرى تُعدِّل عليه بخلاف هذه النقطة) — المشكلة عمود واحد فقط (`unit_id`) غائب عنه، خطأ `42703` (`column does not exist`) لا `42P01`.

## 2. أول ظهور والشكل التاريخي

- **أول ظهور لـ`unitId` في `model Lead`:** commit `be80185` (نفس commit إدخال `Tour`/`Opportunity`/`Offer` — جزء من نفس دفعة "7-tabs leads workspace").
- **السطر الحرفي عند أول ظهور:**
  ```prisma
  unitId         String?        @map("unit_id") @db.Uuid
  ```
- **نقطة القطع (الأب المباشر لكوميت إدخال `20260621000300_offer_unit_integrity`، أي `358cd40^`):**
  ```prisma
  unitId          String?          @map("unit_id") @db.Uuid
  ```
- **السطر الحالي في `schema.prisma` الآن:**
  ```prisma
  unitId          String?          @map("unit_id") @db.Uuid
  ```

**النتيجة: حرفياً بلا أي اختلاف بين الثلاث نقاط.** أبسط وأكثر استقراراً من كل الحالات السابقة — فقط فروق مسافات بيضاء تنسيقية، لا تغيير دلالي.

## 3. النوع، Nullability، الـDefault

| الخاصية | القيمة |
|---|---|
| النوع | `UUID` (`@db.Uuid`) |
| Nullable | **نعم** (`String?`، لا `!`/إلزامي) |
| Default | **لا يوجد** (لا `@default(...)` في أي نقطة) |

## 4. FK وIndex عند هذه النقطة

- **لا `@relation`** مرفق بهذا الحقل في أي نقطة من التاريخ — مجرد عمود UUID خام بلا علاقة Prisma معرَّفة (لا يوجد سطر `unit Unit @relation(fields: [unitId], ...)` يقابله).
- **لا فهرس:** لا `@@index([unitId])` في `model Lead` في أي نقطة.
- بحث شامل في كل ملفات الـmigrations عن `leads_unit_id_fkey` أو `idx_leads_unit_id`: **صفر نتائج**.

**الحكم: لا FK ولا index مطلوبان لهذا الـpatch — عمود خام فقط.**

## 5. فحص شامل: هل أي migration تضيف هذا العمود؟

```
grep -rln 'leads.*unit_id\|"leads".*ADD COLUMN.*unit_id' prisma/migrations/*/migration.sql
→ صفر نتائج
```

**هذا العمود لم يُضَف عبر أي migration متتبَّعة على الإطلاق** — مادة `db push` خام منذ `be80185`، تماماً كحال باقي الجداول/الأعمدة المفقودة في هذا الـGate، لكنه هنا عمود منفرد على جدول مكتمل البناء بخلافه.

## 6. التصميم المقترح (نص توضيحي — Patch صغيرة، idempotent)

```sql
DO $migration$
DECLARE
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'unit_id'
    ) THEN
        -- العمود موجود فعلاً (قاعدة متطوّرة جزئياً) — تحقق من شكله فقط.
        SELECT data_type, is_nullable, column_default
        INTO actual_type, actual_nullable, actual_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'unit_id';

        IF actual_type <> 'uuid' THEN
            RAISE EXCEPTION 'leads.unit_id: type expected uuid, got %', actual_type;
        END IF;
        IF actual_nullable <> 'YES' THEN
            RAISE EXCEPTION 'leads.unit_id: expected nullable, got %', actual_nullable;
        END IF;
        IF actual_default IS NOT NULL THEN
            RAISE EXCEPTION 'leads.unit_id: expected no default, got %', actual_default;
        END IF;
    ELSE
        -- العمود غائب (الحالة المُثبَتة على قاعدة فارغة) — أضفه بشكله التاريخي.
        ALTER TABLE public.leads ADD COLUMN unit_id UUID;
    END IF;
END
$migration$;
```

لا حاجة لـ`CREATE TABLE` (الجدول موجود من `init_database`)، ولا فهرس، ولا FK — مطابقة §4/§5.

## 7. الموضع المقترَح

يكفي أن تسبق `20260621000300_offer_unit_integrity` لكسيكوغرافياً. الفتحات المشغولة حالياً: `235958`–`235969`. الفتحة الحرة التالية:

```
20260612235970_add_leads_unit_id_patch
```

---

## 8. الأحكام

```
LEADS_UNIT_ID_FIRST_APPEARANCE: be80185
LEADS_UNIT_ID_CUTOFF_COMMIT: 358cd40^ (immediate parent of offer_unit_integrity's introducing commit)
LEADS_UNIT_ID_STABILITY: VERIFIED — byte-identical declaration across introduction, cutoff, and current
LEADS_UNIT_ID_TYPE: uuid, NULLABLE, NO DEFAULT
LEADS_UNIT_ID_FK: NONE (no @relation ever declared)
LEADS_UNIT_ID_INDEX: NONE
LEADS_UNIT_ID_DEPENDENT_MIGRATIONS: NONE found adding this column via tracked migration -- pure
   untracked db-push gap, isolated to this single column on an otherwise-complete table
LEADS_UNIT_ID_PROPOSED_SLOT: 20260612235970_add_leads_unit_id_patch
LEADS_TABLE_ITSELF: NOT_REBUILT -- out of scope, already correctly created by init_database

LEADS_UNIT_ID_PATCH_BLUEPRINT_READY
```

**لم يُكتب أي migration. لم يُشغَّل أي أمر على أي قاعدة بيانات. لم يُعَد بناء جدول `leads`. لم يُفتح أي حاجز سابق.**
