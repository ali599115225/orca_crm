# FINAL_REMAINING_BASELINE_INVENTORY

**تاريخ:** 26 يونيو 2026
**الحالة:** `INVENTORY_DRAFT — READ_ONLY_SCAN_COMPLETE`
**يُلحَق بـ:** [BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md), [BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md](BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md)
**الغرض:** فحص read-only شامل لكل ما تبقى من سلسلة الـmigrations (من حاجز `audit_logs` حتى نهاية السلسلة)، لاستخراج **كل** الجداول والأعمدة المفقودة المتبقية دفعة واحدة، بدل أسلوب حاجز-واحد-في-كل-مرة.

**⚠️ هذا فحص وتحليل فقط. لم يُكتب أي ملف `migration.sql` جديد بخلاف ما اعتمدته الجولات السابقة. لم يُشغَّل `migrate deploy`.**

**حالة `audit_logs` وكل الحواجز الـ12 السابقة (`whatsapp_messages, mansour_chats, contracts, units, rental_leases, rental_invoices, payment_transactions, tours, installments, opportunities, offers, leads.unit_id, receipts`):** `CLOSED` — لا تُفتح مجدداً.

---

## 1. نطاق الفحص

بعد إغلاق حاجز `audit_logs`، تبقّى في كامل سلسلة الـmigrations (51 مجلداً إجمالاً) **migration واحدة فقط لم تُفحَص بعد**:

```
$ ls prisma/migrations/ | sort | بحث عما بعد saudi_trust_gates_foundation
20260624000100_saudi_trust_gates_foundation   ← الحاجز الحالي (audit_logs، مُصمَّم بالفعل)
20260625000100_predictive_intelligence_closure ← الملف الوحيد المتبقي فعلياً، لم يُفحَص قبل الآن
```

**هذه هي نهاية السلسلة بالكامل.** لا توجد migrations أخرى بعد `predictive_intelligence_closure`.

## 2. فحص `20260624000100_saudi_trust_gates_foundation` كاملاً (لا اقتطاع)

```sql
-- 1. government_outbox: CREATE TABLE IF NOT EXISTS كاملة ومكتفية ذاتياً
--    الاعتماد الوحيد: tenants(id) — موجود من init_database. لا فجوة.
CREATE TABLE IF NOT EXISTS government_outbox (...);
CREATE INDEX ... (3 فهارس، كلها IF NOT EXISTS)

-- 2. audit_logs: ALTER TABLE فقط (إضافة أعمدة gate_*)
--    مُغطاة بالكامل بـbaseline audit_logs المُصمَّم والمعتمَد سابقاً (لم يُكتب الملف بعد).
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ...
```

**النتيجة: لا جدول مفقود جديد، لا عمود مفقود جديد.** الاعتماد الوحيد (`audit_logs`) محلول تصميمياً بالفعل.

## 3. فحص `20260625000100_predictive_intelligence_closure` كاملاً (لا اقتطاع)

```sql
-- 1. ALTER TABLE revenue_intelligence_scores (إضافة status/risk_band/horizon_days/feature_hash/expires_at
--    + جعل score/confidence nullable)
--    هذا الجدول يُنشأ في migration سابقة منفصلة: 20260624000100_add_revenue_intelligence_scores
--    (تأكَّد فعلياً بقراءة الملف: `CREATE TABLE IF NOT EXISTS "revenue_intelligence_scores"`)
--    وهذه الـmigration نجحت فعلياً في اختبارنا الأخير (ظهرت "Applying migration
--    `20260624000100_add_revenue_intelligence_scores`" بنجاح في تشغيل receipts).
--    ترتيب الفرز: "add_revenue..." < "saudi_trust..." (الحرف 'a' < 's') → تُطبَّق أولاً، بالترتيب الصحيح.
ALTER TABLE "revenue_intelligence_scores" ADD COLUMN IF NOT EXISTS ...

-- 2. revenue_predictive_runs: CREATE TABLE IF NOT EXISTS كاملة ومكتفية ذاتياً
--    لا FK على الإطلاق (حتى tenant_id بلا قيد) — صفر اعتماد خارجي.
CREATE TABLE IF NOT EXISTS "revenue_predictive_runs" (...);
```

**النتيجة: لا جدول مفقود جديد، لا عمود مفقود جديد.** كل ما تشير إليه هذه الـmigration (سواء جدول قائم بذاته أو جدول مُنشأ مسبقاً في migration سابقة ناجحة) محلول بالفعل.

## 4. الحكم الإجمالي على ما تبقّى من السلسلة المتتبَّعة

```
TRACKED_MIGRATION_CHAIN_REMAINING_GAPS: ZERO (beyond the already-designed audit_logs baseline)
```

**بمجرد كتابة واختبار `20260612235972_create_audit_logs_baseline` (المُصمَّم والمعتمَد، لم يُكتب بعد)، يُتوقَّع أن تنجح السلسلة المتتبَّعة بالكامل حتى آخر migration.**

---

## 5. ⚠️ بند مهم: الـ19 جدولاً "Tier 0" من التقرير الأصلي — لماذا لم تظهر كحواجز أبداً

التقرير الأصلي ([BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md) §7) صنّف 20 جدولاً كـ"Tier 0" (بلا migrations تابعة). 11 منها أصبحت حواجز فعلية وأُغلقت (`units, rental_leases, rental_invoices, payment_transactions, tours, installments, opportunities, offers, receipts, audit_logs`، بالإضافة لـ`leads.unit_id` كعمود لا جدول). **الـ19 الباقية لم تظهر كحاجز أبداً طوال كل هذا الفحص، وقد ثبت الآن نهائياً السبب:**

> **لأننا وصلنا الآن لنهاية سلسلة الـmigrations المتتبَّعة بالكامل، ولا توجد أي migration — من البداية للنهاية — تُشير إليها على الإطلاق.**

القائمة الكاملة المتبقية بلا أي إشارة من أي migration متتبَّعة:

```
agent_leases, agent_slots, agent_telemetry_logs, automation_workflows,
commission_payments, failed_login_attempts, followup_sequences,
general_ledger, maintenance_tickets, payroll_commissions,
platform_connections, sentinel_chat_messages, telemetry_events, tickets,
usage_meters, user_favorites, whatsapp_attachments, zatca_devices, zatca_queue
```

**الأثر العملي:**
```
FRESH_DATABASE_DEPLOY_SUCCESS: لا يتطلب هذه الـ19 جدولاً على الإطلاق — مؤكَّد الآن بفحص شامل
   للسلسلة كاملة من أول migration حتى آخرها، لا مجرد افتراض.
PRODUCTION_SCHEMA_FIDELITY: هذه الـ19 جدولاً تبقى بلا Creation Migration متتبَّعة (نفس وضعها الأصلي
   منذ التقرير الأول) — يُدارَى وجودها الفعلي على القاعدة الحقيقية عبر `prisma db push` فقط، تماماً
   كحال units/tours/إلخ قبل بنائنا لها. هذا قيد منفصل تماماً عن هدف "نجاح migrate deploy"،
   ولا يُغلَق إلا إذا قرَّر المستخدم مستقبلاً أن المطابقة الحرفية لكل جدول مطلوبة بصرف النظر عن
   الحاجة الفعلية لنجاح الـdeploy (قرار سياسة، لا حاجز فني).
```

**لا حاجة لبناء baselines لهذه الـ19 جدولاً لتحقيق `Fresh Database Deploy` ناجحاً بالكامل.**

---

## 6. ترتيب الاعتماديات والمواضع — كل ما تبقّى فعلياً

| العنصر | الحالة | الموضع |
|---|---|---|
| `audit_logs` baseline | **مُصمَّم ومعتمَد، لم يُكتب الملف بعد** | `20260612235972_create_audit_logs_baseline` |
| `government_outbox` | مُكتفٍ ذاتياً (CREATE TABLE IF NOT EXISTS في `saudi_trust_gates_foundation` نفسها) | لا حاجة لـbaseline منفصلة |
| `revenue_intelligence_scores` | تُنشأ في `add_revenue_intelligence_scores` (نجحت فعلياً، مؤكَّد) | لا حاجة لـbaseline منفصلة |
| `revenue_predictive_runs` | مُكتفٍ ذاتياً (CREATE TABLE IF NOT EXISTS في `predictive_intelligence_closure` نفسها) | لا حاجة لـbaseline منفصلة |
| الـ19 جدولاً "Tier 0" المتبقية | لا إشارة من أي migration متتبَّعة | **خارج نطاق Fresh Deploy، غير مطلوبة الآن** |

**لا ترتيب اعتماديات إضافي مطلوب** — العنصر الوحيد المتبقي فعلياً (`audit_logs`) مُصمَّم بالفعل ومستقل (FK = tenant فقط، موجود).

---

## 7. الحكم النهائي

```
FINAL_REMAINING_BASELINE_INVENTORY: COMPLETE
NEW_GAPS_DISCOVERED: ZERO
ONLY_REMAINING_ACTION: write + test 20260612235972_create_audit_logs_baseline (already designed)
TRACKED_CHAIN_END_TO_END: WITHIN_REACH after that single file
TIER_0_19_TABLES: OUT_OF_SCOPE for fresh-deploy success, confirmed by full-chain scan,
   remains an open production-fidelity item for future policy decision
```

**لم يُكتب أي ملف migration جديد في هذا الفحص (فقط قراءة). بانتظار اعتمادك قبل الكتابة والتنفيذ الدفعة الواحدة المطلوبة (audit_logs) ثم Fresh Deploy مرتين متتاليتين.**
