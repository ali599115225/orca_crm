# TOURS_TEMPORAL_BASELINE_BLUEPRINT

**تاريخ:** 26 يونيو 2026
**الحالة:** `BLUEPRINT_DRAFT`
**يُلحَق بـ:** [BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md), [BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md](BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md)
**الغرض:** تصميم baseline لجدول `tours` — الحاجز الجديد المُثبَت بعد إغلاق `PRE_20260614` (انظر النتيجة الفعلية: `20260621000200_transaction_spine` يفشل بـ `relation "tours" does not exist`).

**⚠️ هذا تصميم وتحليل فقط. لم يُكتب أي ملف `migration.sql`. لم يُشغَّل `migrate deploy`. لا توسيع للنطاق إلى جداول أخرى.**

**حالة `PRE_20260614`:** `CLOSED` — معتمَدة، لا تُفتح مجدداً في هذا المستند.

---

## 1. أول ظهور ونقطة القطع

- **أول ظهور لـ`model Tour`:** commit `be80185` ("feat: implement 7-tabs leads workspace and version 1 APIs").
- **نقطة القطع الصحيحة (الأب المباشر لكوميت إدخال `transaction_spine`):** `9be2984^` — نفس المنهجية المستخدمة لـUnit/PaymentTransaction/RentalInvoice/RentalLease.

## 2. الجسم التاريخي الدقيق عند نقطة القطع (حرفي، لا استنتاج)

```prisma
model Tour {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId   String   @map("tenant_id") @db.Uuid
  tenant     Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  leadId     String   @map("lead_id") @db.Uuid
  assignedTo String   @map("assigned_to") @db.Uuid
  startAt    DateTime @map("start_at") @db.Timestamptz
  endAt      DateTime @map("end_at") @db.Timestamptz
  location   String
  status     String   @default("SCHEDULED")
  attendees  Int      @default(1)
  notes      String?  @db.Text
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz
  createdBy  String?  @map("created_by") @db.Uuid
  updatedBy  String?  @map("updated_by") @db.Uuid
  auditLog   String?  @map("audit_log") @db.Text

  @@map("tours")
}
```

**15 عموداً.** لا `@@index` ولا `@@unique` في هذا الجسم (مؤكَّد بفحص مباشر).

## 3. تحقق الاستقرار (حلقة فحص الكوميتات الكاملة)

نُفِّذت حلقة فحص لكل commit بين `be80185` و`9be2984` (الحد الأعلى) على نمط الفحص المعتمَد لـ`unit`/`rental_invoices`:

| Commit | Hits | الطبيعة |
|---|---|---|
| `270d6be` | 2 | إعادة محاذاة مسافات فقط في قائمة علاقات `Tenant` (`tours Tour[]`) — **ليس تغييراً في جسم Tour** |
| `0bc1d79` | 2 | نفس الشيء، إعادة محاذاة فقط |
| `9be2984` | 4 | هذا هو commit إدخال `transaction_spine` نفسه (التغييرات الحقيقية، مُستبعَدة من الـbaseline أصلاً) |

**النتيجة: لا يوجد أي تطوّر خفي لجسم `model Tour` بين أول ظهوره ونقطة القطع.** هذا يختلف عن حالات `Unit`/`PaymentTransaction`/`RentalInvoice` التي شهدت تطوراً كبيراً غير متتبَّع — `Tour` مستقر تماماً طوال هذه الفترة. ثقة عالية في دقة الشكل أعلاه.

## 4. الاعتمادات والـFK والقيود (الحالة الدقيقة عند نقطة القطع، لا الحالة الحالية)

قراءة مباشرة لكل ما تضيفه `20260621000200_transaction_spine` و`20260621000500_add_tour_offer_relation` على `tours` (الملفان الوحيدان اللذان يلمسان هذا الجدول — مؤكَّد بفحص شامل لكل ملفات الـmigrations):

```sql
-- من transaction_spine:
ALTER TABLE "tours" ADD COLUMN "opportunity_id" UUID;
ALTER TABLE "tours" ADD COLUMN "unit_id" UUID;
ALTER TABLE "tours" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tours" ALTER COLUMN "status" TYPE "TourStatus" USING "status"::text::"TourStatus";
ALTER TABLE "tours" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'::"TourStatus";
ALTER TABLE "tours" ADD CONSTRAINT "tours_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT;
ALTER TABLE "tours" ADD CONSTRAINT "tours_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL;
ALTER TABLE "tours" ADD CONSTRAINT "tours_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL;
ALTER TABLE "tours" ADD CONSTRAINT "tours_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT;

-- من add_tour_offer_relation:
ALTER TABLE "tours" ADD COLUMN "offer_id" UUID;
ALTER TABLE "tours" ADD CONSTRAINT "tours_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

**استنتاج حاسم:** `lead_id` و`assigned_to` عمودان **موجودان أصلاً** عند نقطة القطع (لا `ADD COLUMN` لهما هنا، فقط `ADD CONSTRAINT`) — أي أن الجدول التاريخي يحتوي هذين العمودين **بلا أي قيد FK مفروض بعد**. الـFK الحقيقي يُضاف فقط لاحقاً في `transaction_spine`.

**الأثر العملي المهم:** الـbaseline **لا يحتاج فعلياً إلى وجود `leads`/`users`/`opportunities`/`units` كقيد صارم وقت إنشائه** — الأعمدة خام بلا FK مفروض. (`leads`/`users` موجودان أصلاً من `init_database`، و`units` بنيناه، لكن هذا غير ذي صلة بالـbaseline نفسه لأنه لا يفرض FK في كل الأحوال).

## 5. الأعمدة المُستبعَدة عمداً من الـbaseline

| العمود | أُضيف بـ | السبب |
|---|---|---|
| `opportunity_id` | `transaction_spine` | عمود جديد، `ADD COLUMN` صريح |
| `unit_id` | `transaction_spine` | عمود جديد، `ADD COLUMN` صريح |
| `offer_id` | `add_tour_offer_relation` | عمود جديد لاحق |
| تحويل `status` إلى enum `TourStatus` | `transaction_spine` | الـbaseline يستخدم `TEXT DEFAULT 'SCHEDULED'` الأصلي، لا الـenum |
| FK على `lead_id`, `assigned_to` | `transaction_spine` | القيد يُضاف لاحقاً؛ الأعمدة خام في الـbaseline |

## 6. التصميم المقترح للـbaseline (نص توضيحي — ليس ملف SQL فعلياً)

```
CREATE TABLE public.tours (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,            -- FK → tenants(id) ON DELETE CASCADE
    lead_id UUID NOT NULL,              -- بلا FK عند هذه النقطة
    assigned_to UUID NOT NULL,          -- بلا FK عند هذه النقطة
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    attendees INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),   -- @default(now()) صريح في Prisma، مستقل عن @updatedAt
    created_by UUID,
    updated_by UUID,
    audit_log TEXT,
    CONSTRAINT tours_pkey PRIMARY KEY (id),
    CONSTRAINT tours_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
-- لا فهارس إضافية مطلوبة: لا @@index في الجسم التاريخي.
```

**ملاحظة على `updated_at`:** نفس نمط `rental_invoices` بالضبط — السطر الحرفي `@default(now()) @updatedAt @map("updated_at")` يحتوي `@default(now())` مستقلاً وصريحاً، فهو دليل كافٍ على `DEFAULT now()` على مستوى القاعدة، لا استنتاج من `@updatedAt` وحده.

## 7. موضع الـbaseline المقترَح في الترتيب

الفتحات المشغولة حالياً: `235958` إلى `235965`. الفتحة الحرة التالية:

```
20260612235966_create_tours_baseline
```

**التحقق:** `tours` ليس له أي اعتماد FK صارم على أي جدول آخر بنيناه أو لم نبنِه بعد (انظر §4) — لذلك لا يوجد قيد ترتيب نسبي يفرضه على نفسه بخلاف: يجب أن يسبق `20260621000200_transaction_spine` (أول وآخر migration تعتمد عليه فعلياً قبل `add_tour_offer_relation`). الفتحة `235966` تحقق ذلك (تسبق `20260613_*` وكل ما بعدها حسب الفرز النصي المؤكَّد سابقاً).

---

## 8. الأحكام

```
TOURS_FIRST_APPEARANCE: be80185
TOURS_CUTOFF_COMMIT: 9be2984^ (immediate parent of transaction_spine's introducing commit)
TOURS_BODY_STABILITY: VERIFIED — zero real evolution between introduction and cutoff (only whitespace noise)
TOURS_DEPENDENT_MIGRATIONS: COMPLETE — exactly 2 (transaction_spine, add_tour_offer_relation), confirmed by full scan
TOURS_FK_CONSTRAINTS_AT_BASELINE: NONE — lead_id/assigned_to are unconstrained raw UUID columns at this point
TOURS_INDEX_REQUIREMENTS: NONE — no @@index/@@unique at any point in tracked history
TOURS_UPDATED_AT_DEFAULT: VERIFIED — explicit @default(now()) literal, independent of @updatedAt
TOURS_PROPOSED_SLOT: 20260612235966_create_tours_baseline

TOURS_BASELINE_BLUEPRINT_READY
```

**لم يُكتب أي migration. لم يُشغَّل أي أمر على أي قاعدة بيانات. لم يتم التوسع لأي جدول آخر غير `tours`.**
