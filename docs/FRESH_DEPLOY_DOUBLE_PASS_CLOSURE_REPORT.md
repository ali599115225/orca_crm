# Fresh Deploy Double-Pass Closure Report

**تاريخ:** 26 يونيو 2026
**يُلحَق بـ:** [BASELINE_DESIGN_GATE_REPORT.md](BASELINE_DESIGN_GATE_REPORT.md), [BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md](BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md), [FINAL_REMAINING_BASELINE_INVENTORY.md](FINAL_REMAINING_BASELINE_INVENTORY.md)

---

## 1. الإجراء المنفَّذ

1. كُتب الملف الأخير المتبقي: `prisma/migrations/20260612235972_create_audit_logs_baseline/migration.sql` (مُصمَّم ومعتمَد مسبقاً في `AUDIT_LOGS_TEMPORAL_BASELINE_BLUEPRINT.md`).
2. **Fresh Deploy #1:** قاعدة Neon جديدة فارغة 100% (`fresh_deploy_run1`) داخل الفرع المعزول `br-floral-cake-aqu1olyp`.
3. **Fresh Deploy #2:** قاعدة Neon جديدة مستقلة تماماً (`fresh_deploy_run2`) في نفس الفرع المعزول.
4. `prisma migrate diff --from-config-datasource --to-schema=prisma/schema.prisma` على نتيجة Fresh Deploy #2، لفحص الانحراف (drift) الكامل.

## 2. نتيجة Fresh Deploy (الطلب الحرفي — مُحقَّق بالكامل)

```
Fresh Deploy #1: "All migrations have been successfully applied." ✅
Fresh Deploy #2: "All migrations have been successfully applied." ✅
migrate status:  "Database schema is up to date!" ✅

52 migrations — السلسلة الكاملة من 20260524004442_init_database
حتى 20260625000100_predictive_intelligence_closure — نجحت بالكامل، مرتين، بشكل مستقل.
```

```
TRACKED_MIGRATION_CHAIN: FULLY_DEPLOYABLE_ON_FRESH_DATABASE — CONFIRMED, DOUBLE-PASS, INDEPENDENT
```

هذا هو **أول نجاح كامل لكامل السلسلة منذ بداية هذا الـGate**. كل الحواجز الـ13 المُغلَقة (`whatsapp_messages, mansour_chats, contracts, units, rental_leases, rental_invoices, payment_transactions, tours, installments, opportunities, offers, leads.unit_id, receipts, audit_logs`) تراكمت بنجاح إلى نتيجة end-to-end.

## 3. ⚠️ اكتشاف جديد من `migrate diff` — غير مُغطّى بمنهجية فحص الـmigrations

`migrate diff` يفحص schema.prisma **كاملاً** (لا فقط ما تُشير إليه الـmigrations)، فاكتشف فئة جديدة من الانحراف: **أعمدة على جداول موجودة فعلاً (لها Creation Migration متتبَّعة) لكنها لم تُذكَر في أي migration على الإطلاق** — تماماً نفس نمط `leads.unit_id` الذي عالجناه، لكن لم يظهر في فحصنا اليدوي السابق لأنه لا migration تستدعيه ليُسبِّب فشلاً.

### الجداول والأعمدة الناقصة فعلياً (تأكيد مباشر من `migrate diff`، اتجاه واحد فقط — نقص لا زيادة)

| الجدول | الأعمدة الناقصة |
|---|---|
| `leads` | `assigned_agent_id`, `audit_log`, `created_by`, `score`, `stage`, `updated_by` (6) |
| `sentinel_config` | `deep_repair_wait_minutes`, `delegation_level`, `fallback_plan_active` (3) |
| `tasks` | `audit_log`, `created_by`, `updated_by` (3) |
| `tenants` | `commercial_registry`, `encrypted_api_key`, `encrypted_client_id`, `encrypted_client_secret`, `encrypted_zatca_credentials`, `extra_agents`, `growth_warning`, `invoice_prefix`, `national_address`, `next_invoice_number`, `vat_number`, `whatsapp_connected` (12) |

**الإجمالي: 24 عموداً ناقصاً عبر 4 جداول.** تأكَّد عبر `grep` أنه **لا توجد** أي حالة معكوسة (عمود في القاعدة المُهاجَرة غائب عن `schema.prisma`) — الانحراف اتجاه واحد فقط: نقص.

**لماذا لم تُكتشَف هذه الأعمدة أثناء فحص `FINAL_REMAINING_BASELINE_INVENTORY`؟** لأن منهجية ذلك الفحص اعتمدت على قراءة محتوى الـmigrations المتبقية بحثاً عن أسماء جداول/أعمدة مفقودة *تستخدمها* migration ما — وهذه الأعمدة بالتحديد لا تُستخدَم في أي migration متتبَّعة على الإطلاق (لا ALTER، لا إشارة)، فلم تكن قابلة للظهور بتلك المنهجية. الطريقة الوحيدة لاكتشافها فعلياً هي `migrate diff` الشامل — وهذا تماماً ما طلبه المستخدم وأثبت قيمته الآن.

### بقية التغييرات في `migrate diff` (37 جدولاً إجمالاً ظهرت كـ"Changed")

أغلبها **فروقات تمثيل لا فروقات بنيوية حقيقية**: إعادة تسمية فهارس (مثل `idx_contacts_tenant_phone_hash` → `contacts_tenant_id_phone_hash_idx`) وتمثيل FK بصيغة Remove+Add لنفس القيد — ناتجة عن اختلاف الاسم الذي ولّدته الـmigration التاريخية عن الاسم الذي يولّده Prisma افتراضياً اليوم لو أُعيد `db push` من الصفر. **هذه ليست أخطاء** — هي محافظة متعمَّدة على الأسماء التاريخية الحقيقية (نفس مبدأ Column/Constraint naming المعتمَد طوال هذا الـGate)، **لم تُفحَص كل واحدة منها فردياً بنفس عمق الفحص اليدوي** الذي طُبِّق على الجداول المبنية في هذه الجولة.

## 4. الحكم النهائي

```
FRESH_DEPLOY_DOUBLE_PASS: CONFIRMED — يلبّي الطلب الحرفي بالكامل
TRACKED_MIGRATION_CHAIN_INTEGRITY: PASS (نجاح كامل، مستقل، مرتين)
PRODUCTION_SCHEMA_FIDELITY: PARTIAL — اكتشاف جديد: 24 عموداً ناقصاً على 4 جداول (leads, sentinel_config,
   tasks, tenants)، بالإضافة إلى الـ19 جدولاً "Tier 0" المعروفة سابقاً
TIER_0_19_TABLES: لا تزال خارج نطاق Fresh Deploy (بلا تغيير عن الجولة السابقة)
NEW_COLUMN_GAPS_24: غير معالَجة بعد — تحتاج نفس منهجية الحفر التاريخي (أول ظهور، نقطة استقرار،
   نوع/nullable/default) المُطبَّقة على leads.unit_id، لكل عمود من الـ24
```

**لم يُكتب أي migration إضافي لهذه الأعمدة الـ24 في هذه الجولة** — هذا اكتشاف جديد يحتاج قراراً بشأن الاستمرار، خارج النطاق الحرفي المطلوب (Fresh Deploy x2، والذي تحقَّق بنجاح).
