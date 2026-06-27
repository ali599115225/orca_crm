# OFFERS_TEMPORAL_BASELINE_BLUEPRINT

**تاريخ:** 26 يونيو 2026
**الحالة:** `BLUEPRINT_DRAFT`
**يُلحَق بـ:** [BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md), [BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md](BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md)
**الغرض:** تصميم baseline لجدول `offers` — الحاجز الجديد بعد إغلاق `opportunities` (النتيجة الفعلية: `20260621000200_transaction_spine` يفشل عند `relation "offers" does not exist`).

**⚠️ تصميم وتحليل فقط. لم يُكتب أي ملف `migration.sql`. لم يُشغَّل `migrate deploy`.**

**حالة `opportunities`:** `CLOSED` — معتمَدة، لا تُفتح مجدداً.

---

## 1. أول ظهور ونقطة القطع

- **أول ظهور لـ`model Offer`:** commit `be80185` (نفس commit إدخال `Tour`/`Opportunity`).
- **نقطة القطع:** `9be2984^` (الأب المباشر لكوميت `transaction_spine`).
- **سبب الحاجز:** `transaction_spine` تضيف فقط FK *من* `contracts` *إلى* `offers` (`contracts_offer_id_fkey`) — لا تُعدِّل `offers` نفسها مباشرة، لكنها تتطلب وجودها كجدول.

## 2. الجسم التاريخي الدقيق عند نقطة القطع (حرفي)

```prisma
model Offer {
  id                  String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId            String      @map("tenant_id") @db.Uuid
  tenant              Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  linkedOpportunityId String      @map("linked_opportunity_id") @db.Uuid
  opportunity         Opportunity @relation(fields: [linkedOpportunityId], references: [id], onDelete: Cascade)
  price               Decimal     @db.Decimal(12, 2)
  validUntil          DateTime    @map("valid_until") @db.Timestamptz
  status              String      @default("PENDING")
  documentUrl         String?     @map("document_url")
  createdAt           DateTime    @default(now()) @map("created_at") @db.Timestamptz
  updatedAt           DateTime    @default(now()) @updatedAt @map("updated_at") @db.Timestamptz
  createdBy           String?     @map("created_by") @db.Uuid
  updatedBy           String?     @map("updated_by") @db.Uuid
  auditLog            String?     @map("audit_log") @db.Text

  @@map("offers")
}
```

**12 عموداً قابلاً للتخزين.** لا `@@index` ولا `@@unique` (مؤكَّد).

## 3. تحقق الاستقرار

فُحص الجسم عند 3 نقاط (`ef38b60`، `a60a604`، `9be2984^`) — **متطابق حرفياً بلا أي اختلاف**. استقرار كامل.

## 4. الاعتمادات والـFK — مطابق لنمط `installments`، لا `tours`/`opportunities`

فحص شامل لكل الـmigrations: **4 ملفات فقط** تلمس `offers`:

| Migration | الفعل |
|---|---|
| `20260621000200_transaction_spine` | فقط FK من `contracts` إليها (`contracts_offer_id_fkey`) — لا تعديل مباشر |
| `20260621000300_offer_unit_integrity` | `ADD COLUMN unit_id` + FK جديد (`offers_unit_id_fkey`) + فهرس |
| `20260621000500_add_tour_offer_relation` | فقط FK من `tours` إليها — لا تعديل مباشر |
| `20260622060000_phase1_quote_to_cash_closure` | `ADD CONSTRAINT offers_accepted_requires_unit_ck` (CHECK، على `unit_id` بعيد الزمن) |

**بحث شامل عن أي `ADD CONSTRAINT` يخص `linked_opportunity_id` في كل الـmigrations: صفر نتائج.** هذا يعني الـFK من `offers.linked_opportunity_id` إلى `opportunities` **موجود أصلاً منذ النشأة** عبر db push (الإعلان `Opportunity @relation(...)` موجود في Prisma منذ `be80185` نفسها، ولا migration تتدخل لإضافته لاحقاً) — **مطابق لنمط `installments.contract_id`**، خلافاً لـ`tours`/`opportunities` حيث الـFK يُضاف لاحقاً.

**الحكم: FK scope = TENANT + OPPORTUNITY.** كلا الهدفين موجودان (`tenants` من `init_database`، `opportunities` مبنية ومختبَرة الآن ✅).

## 5. الأعمدة/القيود المُستبعَدة عمداً

| العنصر | أُضيف بـ |
|---|---|
| `unit_id` (عمود) | `offer_unit_integrity` |
| `offers_unit_id_fkey` | `offer_unit_integrity` |
| `offers_accepted_requires_unit_ck` (CHECK) | `phase1_quote_to_cash_closure` |

## 6. التصميم المقترح (نص توضيحي)

```
CREATE TABLE public.offers (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,                       -- FK → tenants(id) ON DELETE CASCADE
    linked_opportunity_id UUID NOT NULL,           -- FK → opportunities(id) ON DELETE CASCADE (أصلي منذ النشأة)
    price DECIMAL(12,2) NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),    -- @default(now()) صريح
    created_by UUID,
    updated_by UUID,
    audit_log TEXT,
    CONSTRAINT offers_pkey PRIMARY KEY (id),
    CONSTRAINT offers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT offers_linked_opportunity_id_fkey FOREIGN KEY (linked_opportunity_id)
        REFERENCES opportunities(id) ON DELETE CASCADE
);
-- لا فهارس إضافية: لا @@index في الجسم التاريخي.
```

## 7. الموضع المقترَح

الفتحات المشغولة: `235958`–`235968`. الاعتماد: يجب أن يأتي بعد `opportunities` (235968) — متحقِّق تلقائياً.

```
20260612235969_create_offers_baseline
```

---

## 8. الأحكام

```
OFFERS_FIRST_APPEARANCE: be80185
OFFERS_CUTOFF_COMMIT: 9be2984^
OFFERS_BODY_STABILITY: VERIFIED — identical across 3 checkpoints
OFFERS_DEPENDENT_MIGRATIONS: COMPLETE — 4 files scanned; only offer_unit_integrity and
   phase1_quote_to_cash_closure actually ALTER the table
OFFERS_FK_SCOPE: TENANT_AND_OPPORTUNITY — linked_opportunity_id FK confirmed original (no migration
   ever adds it; zero hits searching for any ADD CONSTRAINT on linked_opportunity_id)
OFFERS_INDEX_REQUIREMENTS: NONE
OFFERS_PROPOSED_SLOT: 20260612235969_create_offers_baseline

OFFERS_BASELINE_BLUEPRINT_READY
```

**لم يُكتب أي migration. لم يُشغَّل أي أمر على أي قاعدة بيانات. لم يُفتح `opportunities` أو أي حاجز سابق.**
