# OPPORTUNITIES_TEMPORAL_BASELINE_BLUEPRINT

**تاريخ:** 26 يونيو 2026
**الحالة:** `BLUEPRINT_DRAFT`
**يُلحَق بـ:** [BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md), [BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md](BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md)
**الغرض:** تصميم baseline لجدول `opportunities` — الحاجز الجديد بعد إغلاق `installments` (النتيجة الفعلية: `20260621000200_transaction_spine` يفشل عند `relation "opportunities" does not exist`).

**⚠️ تصميم وتحليل فقط. لم يُكتب أي ملف `migration.sql`. لم يُشغَّل `migrate deploy`.**

**حالة `installments`:** `CLOSED` — معتمَدة، مبنية، مختبَرة فعلياً، لا تُفتح مجدداً.

---

## 1. أول ظهور ونقطة القطع

- **أول ظهور لـ`model Opportunity`:** commit `be80185` (نفس commit إدخال `Tour`/`Offer`/`TelemetryEvent`).
- **نقطة القطع:** `9be2984^` (الأب المباشر لكوميت إدخال `transaction_spine`).

## 2. ملاحظة دقيقة على سبب الحاجز

`transaction_spine` نفسها **لا تُعدِّل `opportunities` على الإطلاق** — السطر الوحيد المتعلق بها هو FK *من* `tours` *إلى* `opportunities`:
```sql
ALTER TABLE "tours" ADD CONSTRAINT "tours_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL;
```
هذا يكفي لتفسير الفشل (`opportunities` يجب أن يكون موجوداً كجدول خام فقط ليصبح هدف FK صالحاً)، وهو نفس نمط الحاجز السابق لـ`tours` نفسها.

## 3. الجسم التاريخي الدقيق عند نقطة القطع (حرفي)

```prisma
model Opportunity {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String   @map("tenant_id") @db.Uuid
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  leadId        String   @map("lead_id") @db.Uuid
  value         Decimal  @db.Decimal(12, 2)
  probability   Int
  closeDate     DateTime @map("close_date") @db.Timestamptz
  status        String   @default("OPEN")
  linkedUnitIds String?  @map("linked_unit_ids") @db.Text
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz
  createdBy     String?  @map("created_by") @db.Uuid
  updatedBy     String?  @map("updated_by") @db.Uuid
  auditLog      String?  @map("audit_log") @db.Text
  offers        Offer[]

  @@map("opportunities")
}
```

**13 عموداً قابلاً للتخزين.** لا `@@index` ولا `@@unique` في أي نقطة (مؤكَّد).

## 4. تحقق الاستقرار

فُحص الجسم عند **3 نقاط زمنية** (`ef38b60`، `a60a604`، `9be2984^`) — **متطابق حرفياً بلا أي اختلاف** في الثلاث. استقرار كامل، أعلى ثقة ممكنة، يماثل حالة `tours`.

## 5. الاعتمادات والـFK (الاكتشاف الجوهري: مطابق لنمط `tours`، لا `installments`)

فحص شامل لكل الـmigrations يؤكد **4 ملفات فقط** تلمس `opportunities`:

| Migration | الفعل |
|---|---|
| `20260621000200_transaction_spine` | فقط FK من `tours` إليها (لا تعديل عليها مباشرة) |
| `20260621000300_offer_unit_integrity` | `ADD COLUMN unit_id` + backfill + FK + فهرس |
| `20260622110000_deal_passport_foundation` | فقط FK من `deal_passports` إليها (لا تعديل مباشر) |
| `20260622130000_phase02_full_closure` | **`ADD CONSTRAINT opportunities_lead_id_fkey`** — التعليق الحرفي في الملف: *"Make the existing Opportunity.leadId column an explicit Prisma/DB relation"* |

**استنتاج حاسم (بدليل تعليق المصدر نفسه):** `lead_id` كان عموداً **بلا أي FK مفروض** منذ نشأته وحتى `phase02_full_closure` (تاريخ لاحق بكثير لحاجزنا الحالي). هذا **مطابق تماماً لنمط `tours`** (lead_id/assigned_to بلا FK)، **وليس** نمط `installments` (contract_id بـFK حقيقي منذ البداية).

**الحكم: FK scope = TENANT_ONLY.**

## 6. الأعمدة المُستبعَدة عمداً

| العمود | أُضيف بـ |
|---|---|
| `unit_id` | `20260621000300_offer_unit_integrity` |

(لا أعمدة أخرى مُستبعَدة — الجسم بقي بـ13 عموداً من النشأة حتى نقطة القطع وما بعدها بقليل).

## 7. التصميم المقترح (نص توضيحي)

```
CREATE TABLE public.opportunities (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,                    -- FK → tenants(id) ON DELETE CASCADE
    lead_id UUID NOT NULL,                      -- بلا FK عند هذه النقطة (يُضاف لاحقاً في phase02_full_closure)
    value DECIMAL(12,2) NOT NULL,
    probability INTEGER NOT NULL,
    close_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    linked_unit_ids TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),   -- @default(now()) صريح، مستقل عن @updatedAt
    created_by UUID,
    updated_by UUID,
    audit_log TEXT,
    CONSTRAINT opportunities_pkey PRIMARY KEY (id),
    CONSTRAINT opportunities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
-- لا فهارس إضافية: لا @@index في الجسم التاريخي.
```

## 8. الموضع المقترَح

الفتحات المشغولة: `235958`–`235967`. لا اعتماد على أي جدول لم يُبنَ بعد (FK = tenant فقط، موجود). الفتحة الحرة التالية:

```
20260612235968_create_opportunities_baseline
```

---

## 9. الأحكام

```
OPPORTUNITIES_FIRST_APPEARANCE: be80185
OPPORTUNITIES_CUTOFF_COMMIT: 9be2984^
OPPORTUNITIES_BODY_STABILITY: VERIFIED — identical across 3 checkpoints (ef38b60, a60a604, 9be2984^)
OPPORTUNITIES_DEPENDENT_MIGRATIONS: COMPLETE — 4 files scanned; only offer_unit_integrity and
   phase02_full_closure actually ALTER the table; transaction_spine/deal_passport_foundation only
   reference it as an FK target from other tables
OPPORTUNITIES_FK_SCOPE: TENANT_ONLY — lead_id confirmed unconstrained at baseline point by the
   source migration's own comment ("Make the existing Opportunity.leadId column an explicit
   Prisma/DB relation"), added only by phase02_full_closure, well past the current barrier
OPPORTUNITIES_INDEX_REQUIREMENTS: NONE
OPPORTUNITIES_PROPOSED_SLOT: 20260612235968_create_opportunities_baseline

OPPORTUNITIES_BASELINE_BLUEPRINT_READY
```

**لم يُكتب أي migration. لم يُشغَّل أي أمر على أي قاعدة بيانات.**
