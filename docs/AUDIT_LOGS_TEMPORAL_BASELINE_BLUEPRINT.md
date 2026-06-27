# AUDIT_LOGS_TEMPORAL_BASELINE_BLUEPRINT

**تاريخ:** 26 يونيو 2026
**الحالة:** `BLUEPRINT_DRAFT`
**يُلحَق بـ:** [BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md), [BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md](BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md)
**الغرض:** تصميم baseline لجدول `audit_logs` — الحاجز الجديد بعد إغلاق `receipts` (النتيجة الفعلية: `20260624000100_saudi_trust_gates_foundation` يفشل عند `relation "audit_logs" does not exist`).

**⚠️ تصميم وتحليل فقط. لم يُكتب أي ملف `migration.sql`. لم يُشغَّل `migrate deploy`.**

**حالة `receipts` وكل الحواجز السابقة:** `CLOSED` — لا تُفتح مجدداً.

---

## 1. أول ظهور ونقطة القطع

- **أول ظهور لـ`model AuditLog`:** commit `be33a7c`.
- **نقطة القطع (الأب المباشر لكوميت إدخال `saudi_trust_gates_foundation`):** `d37c7d4^`.

## 2. الجسم التاريخي الدقيق عند نقطة القطع (حرفي)

```prisma
model AuditLog {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  userId    String?  @map("user_id") @db.Uuid
  action    String
  tableName String   @map("table_name")
  recordId  String   @map("record_id")
  details   String?  @db.Text
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([tenantId], map: "idx_audit_logs_tenant_id")
  @@index([createdAt(sort: Desc)], map: "idx_audit_logs_created_at")
  @@map("audit_logs")
}
```

**8 أعمدة قابلة للتخزين. 2 فهارس.**

## 3. تحقق الاستقرار — الأعلى ثقة في كل هذا الـGate

فُحص الجسم عند **3 نقاط زمنية متباعدة جداً** (`be33a7c` أول ظهور، `ef38b60`، `d37c7d4^` نقطة القطع) — **متطابق حرفياً، حرفاً بحرف، بلا أي اختلاف على الإطلاق** في الثلاث (حتى المسافات البيضاء متطابقة). هذا الجدول **لم يتطور إطلاقاً** منذ نشأته وحتى الحاجز الحالي — أعلى استقرار رُصد في هذا الـGate كله.

## 4. الاعتمادات والـFK والقيود

فحص شامل لكل الـmigrations: **migration واحدة فقط** تلمس `audit_logs` (وهي نفسها الحاجز الحالي):

```sql
-- saudi_trust_gates_foundation (الحاجز الحالي، يُستبعَد بالكامل من الـbaseline):
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS gate_provider   VARCHAR(10)  NULL,
  ADD COLUMN IF NOT EXISTS gate_operation  VARCHAR(50)  NULL,
  ADD COLUMN IF NOT EXISTS gate_result     VARCHAR(30)  NULL,
  ADD COLUMN IF NOT EXISTS gate_reason     VARCHAR(60)  NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(80)  NULL;
CREATE INDEX IF NOT EXISTS idx_audit_gate_result
  ON audit_logs(tenant_id, gate_provider, gate_result)
  WHERE gate_provider IS NOT NULL;
```

**`userId` بلا `@relation` في أي نقطة من التاريخ** — عمود UUID خام nullable، بلا FK. **الحكم: FK scope = TENANT_ONLY.**

## 5. الأعمدة/الفهارس المُستبعَدة عمداً

| العنصر | أُضيف بـ |
|---|---|
| `gate_provider`, `gate_operation`, `gate_result`, `gate_reason`, `idempotency_key` | `saudi_trust_gates_foundation` |
| `idx_audit_gate_result` | `saudi_trust_gates_foundation` |

(جميعها بصيغة `ADD COLUMN IF NOT EXISTS`/`CREATE INDEX IF NOT EXISTS` — idempotent أصلاً في المصدر، خطر منخفض حتى لو تأخر بناء هذا الـbaseline).

## 6. التصميم المقترح (نص توضيحي)

```
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,              -- FK → tenants(id) ON DELETE CASCADE
    user_id UUID,                         -- بلا FK (لا @relation في أي نقطة)
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
    CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

## 7. الموضع المقترَح

الفتحات المشغولة: `235958`–`235971`. لا اعتماد سوى `tenants` (موجود). الفتحة الحرة التالية:

```
20260612235972_create_audit_logs_baseline
```

---

## 8. الأحكام

```
AUDIT_LOGS_FIRST_APPEARANCE: be33a7c
AUDIT_LOGS_CUTOFF_COMMIT: d37c7d4^
AUDIT_LOGS_BODY_STABILITY: VERIFIED — byte-identical across 3 widely-spaced checkpoints
   (be33a7c, ef38b60, d37c7d4^); highest stability confidence in this entire gate
AUDIT_LOGS_DEPENDENT_MIGRATIONS: COMPLETE — exactly 1 (saudi_trust_gates_foundation,
   the current barrier itself, fully idempotent in its own source)
AUDIT_LOGS_FK_SCOPE: TENANT_ONLY — user_id confirmed unconstrained (no @relation ever declared)
AUDIT_LOGS_INDEX_REQUIREMENTS: 2 (tenant_id; created_at DESC)
AUDIT_LOGS_PROPOSED_SLOT: 20260612235972_create_audit_logs_baseline

AUDIT_LOGS_BASELINE_BLUEPRINT_READY
```

**لم يُكتب أي migration. لم يُشغَّل أي أمر على أي قاعدة بيانات. لم يُفتح أي حاجز سابق.**
