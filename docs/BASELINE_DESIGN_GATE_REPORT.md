# Historical Baseline Design Gate — تقرير تدقيق (قراءة فقط)

**تاريخ:** 26 يونيو 2026
**النطاق:** تدقيق سلسلة Prisma Migrations الكاملة بحثاً عن جداول بلا Creation Migration
**المنهجية:** فحص منهجي لكل الـ79 جدولاً المعرّفة في `schema.prisma` ضد كل ملفات `prisma/migrations/*/migration.sql`، مع حفر تاريخي (`git log -S`, `git show <commit>:prisma/schema.prisma`) لكل جدول مشكوك فيه.
**هذا التقرير قراءة فقط:** لم يُشغَّل `migrate deploy` بعد كتابته، ولم تُعدَّل قواعد البيانات.

---

## 1. القائمة الكاملة — MODELS_WITHOUT_CREATION_MIGRATION

**32 جدولاً إجمالاً** (3 منها بُنيت مسبقاً كـ baseline تحت المراجعة + 29 مكتشَفة حديثاً بالفحص المنهجي):

### مجموعة أ — بُنيت لها baselines مسبقاً (تحت المراجعة في هذا التقرير)
| # | الجدول | Model | الملف |
|---|--------|-------|------|
| 1 | whatsapp_messages | WhatsAppMessage | `20260612235960_create_whatsapp_messages_baseline` |
| 2 | mansour_chats | MansourChat | `20260612235961_create_mansour_chats_baseline` |
| 3 | contracts | Contract | `20260612235962_create_contracts_baseline` |

### مجموعة ب — مكتشَفة بالفحص المنهجي (29 جدولاً، بلا أي baseline بعد)
agent_leases, agent_slots, agent_telemetry_logs, audit_logs, automation_workflows, commission_payments, failed_login_attempts, followup_sequences, general_ledger, installments, **invoices (انظر تحذير §5)**, maintenance_tickets, offers, opportunities, payment_transactions, payroll_commissions, platform_connections, receipts, rental_leases, sentinel_chat_messages, telemetry_events, tickets, tours, units, usage_meters, user_favorites, whatsapp_attachments, zatca_devices, zatca_queue

---

## 2. أول ظهور لكل Model في schema.prisma

| الجدول | أول Commit | التاريخ | الرسالة |
|---|---|---|---|
| whatsapp_messages | abd3efc | 2026-06-11 | WhatsApp DB storage |
| mansour_chats | be33a7c | 2026-06-01 | تحديث تصميم لوحة التحكم |
| contracts | 74e2375 | 2026-05-29 | dashboard isolated metrics + Sanad |
| agent_leases | be33a7c | 2026-06-01 | تحديث تصميم لوحة التحكم |
| agent_slots | 422fba6 | 2026-05-28 | luxury UI concept landing page |
| agent_telemetry_logs | 74e2375 | 2026-05-29 | dashboard isolated metrics |
| audit_logs | be33a7c | 2026-06-01 | تحديث تصميم لوحة التحكم |
| automation_workflows | be80185 | 2026-06-04 | 7-tabs leads workspace |
| commission_payments | ef38b60 | 2026-06-09 | Lighthouse remediation |
| failed_login_attempts | ef38b60 | 2026-06-09 | Lighthouse remediation |
| followup_sequences | be33a7c | 2026-06-01 | تحديث تصميم لوحة التحكم |
| general_ledger | 533853a | 2026-06-04 | Predictive AI Assistant |
| installments | 74e2375 | 2026-05-29 | dashboard isolated metrics |
| **invoices / rental_invoices** | **1136cfb (كـ RentalInvoice)** | **2026-06-06** | phase2 rental prisma |
| maintenance_tickets | a9514d5 | 2026-06-11 | Phase 2-3 production hardening |
| offers | be80185 | 2026-06-04 | 7-tabs leads workspace |
| opportunities | be80185 | 2026-06-04 | 7-tabs leads workspace |
| payment_transactions | ef38b60 | 2026-06-09 | Lighthouse remediation |
| payroll_commissions | 422fba6 | 2026-05-28 | luxury UI concept |
| platform_connections | be33a7c | 2026-06-01 | تحديث تصميم لوحة التحكم |
| receipts | 533853a | 2026-06-04 | Predictive AI Assistant |
| rental_leases | 1136cfb | 2026-06-06 | phase2 rental prisma |
| sentinel_chat_messages | de8d604 | 2026-06-13 | Sentinel chat + owner sidebar |
| telemetry_events | be80185 | 2026-06-04 | 7-tabs leads workspace |
| tickets | 0c68ab0 | 2026-05-27 | support tickets + maintenance |
| tours | be80185 | 2026-06-04 | 7-tabs leads workspace |
| units | 74e2375 | 2026-05-29 | dashboard isolated metrics |
| usage_meters | 422fba6 | 2026-05-28 | luxury UI concept |
| user_favorites | ef38b60 | 2026-06-09 | Lighthouse remediation |
| whatsapp_attachments | 09e4023 | 2026-06-11 | WhatsApp CRM Integration Sprint |
| zatca_devices | da816e5 | 2026-06-09 | ZATCA Phase 2 Full Compliance |
| zatca_queue | da816e5 | 2026-06-09 | ZATCA Phase 2 Full Compliance |

---

## 3 و 4. أول Migration تابعة + كل ALTER/INDEX/CONSTRAINT اللاحقة

### تصنيف بحسب وجود تبعيات لاحقة

**Tier "صفر تبعيات" (20 جدولاً) — لا يوجد أي migration لاحقة تلمسها إطلاقاً:**
agent_leases, agent_slots, agent_telemetry_logs, automation_workflows, commission_payments, failed_login_attempts, followup_sequences, general_ledger, maintenance_tickets, payroll_commissions, platform_connections, rental_leases, sentinel_chat_messages, telemetry_events, tickets, usage_meters, user_favorites, whatsapp_attachments, zatca_devices, zatca_queue

→ بالنسبة لهذه: **شكل schema.prisma الحالي يُفترض أنه يساوي الشكل التاريخي**، لأنه لا توجد أي migration متتبَّعة عدّلت عليها بعد إنشائها. **لكن** هذا افتراض غير مُتحقَّق له بنفس الصرامة التي طُبّقت على rental_invoices أدناه (انظر §9 المخاطر).

**Tier "بها تبعيات" (9 جداول) — تحتاج إعادة بناء تاريخي دقيق:**

| الجدول | أول Migration تابعة | كل التعديلات اللاحقة المكتشفة |
|---|---|---|
| audit_logs | `20260624000100_saudi_trust_gates_foundation` | `ADD COLUMN IF NOT EXISTS` لـ 5 أعمدة gate_* (idempotent، منخفض الخطر) |
| units | `20260612235962_create_contracts_baseline` (الخاص بنا) | لا ALTER فعلي على units نفسها سوى FK من tours |
| offers | `20260621000200_transaction_spine` | `ADD COLUMN unit_id`؛ تعديلات إضافية في `offer_unit_integrity` و`phase1_quote_to_cash_closure` |
| opportunities | `20260621000200_transaction_spine` | `ADD COLUMN unit_id`؛ تعديلات في `offer_unit_integrity` و`phase02_full_closure` |
| tours | `20260621000200_transaction_spine` | `ADD COLUMN opportunity_id, unit_id`، تحويل status إلى enum `TourStatus`، 4 FK جديدة؛ `ADD COLUMN offer_id` في migration لاحقة |
| **rental_invoices→invoices** | `20260614_add_paylink_gateway_fields` | **الأقدم بين كل الجداول.** هذه migration تضيف `gateway_provider, gateway_status, payment_url` لجدول **rental_invoices** (الاسم القديم!). ثم `transaction_spine` يُعيد تسميته إلى `invoices` ويضيف `type, contract_id`، ويجعل `lease_id` nullable |
| payment_transactions | `20260614_add_paylink_gateway_fields` | **نفس أقدم نقطة.** يضيف 10 أعمدة provider/gateway (idempotent)، ثم `provider_neutral_security`، ثم FK لـ invoice/installment في transaction_spine، ثم تعديل nullable على paid_at |
| installments | `20260621000200_transaction_spine` | إضافة FK لـ invoice_id |
| receipts | `20260622060000_phase1_quote_to_cash_closure` | `ADD COLUMN IF NOT EXISTS payment_transaction_id` (idempotent) |

---

## 5. ⚠️ اكتشاف حرج: invoices ليس جدولاً جديداً

السطر الحاسم من `20260621000200_transaction_spine`:
```sql
ALTER TABLE "rental_invoices" RENAME TO "invoices";
```

**هذا يعني:** المطلوب فعلياً ليس "Creation Migration لـ invoices"، بل **Creation Migration لـ rental_invoices** (الاسم القديم)، بالشكل الذي كان قائماً مباشرة قبل لحظة إعادة التسمية. الـ Invoice الحالي في schema.prisma لا يمثل الشكل المطلوب للـ baseline.

تتبّع تاريخي لـ `model RentalInvoice` كشف **تطوراً كبيراً غير متتبَّع بالكامل عبر db push**:

- عند 1136cfb (أول ظهور): id, lease_id, due_date, amount, status('unpaid'), paid_at, payment_method, payment_ref, created_at — **بلا tenant_id**.
- عند 9be2984^ (الأب المباشر لـ commit الـ rename): أضيفت tenant_id + حقول ZATCA كاملة (invoice_number, invoice_prefix, zatca_uuid, issue_date, subtotal, vat_rate, vat_amount, total_amount, qr_payload, qr_code, …) دون أي migration متتبَّعة.

**الحكم:** هذا الجدول يحتاج تتبعاً أعمق من أي جدول آخر في القائمة؛ الشكل الكامل لم يُستخرج 100% بعد (يحتاج قراءة الكوميت `9be2984^` كاملاً دون اقتطاع، وربما كوميتات وسيطة إضافية بين 1136cfb و9be2984 للتأكد من عدم وجود تطورات أخرى غير مرصودة).

---

## 6. Dependency DAG وترتيب الإنشاء الصحيح

```
Tenant, Project, Lead, User, PaymentPlan  ← موجودة بالفعل (init_database / migrations سابقة)
        │
        ▼
┌─ Tier 0 (لا تبعيات داخلية، تحتاج فقط Tenant/Project/Lead/User) ─┐
│ Ticket, AgentSlot, PayrollCommission, RentalLease, ZatcaDevice,│
│ AgentTelemetryLog, AuditLog, FollowupSequence,                  │
│ PlatformConnection, AgentLease, AutomationWorkflow,             │
│ TelemetryEvent, UserFavorite, FailedLoginAttempt,               │
│ MaintenanceTicket, SentinelChatMessage,                         │
│ Opportunity (← Lead فقط), Unit (← Project فقط)                  │
│ [WhatsAppMessage, MansourChat: مبنية مسبقاً ✅]                  │
└──────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─ Tier 1 ─────────────────────────────────────────┐
│ UsageMeter (← AgentSlot)                          │
│ CommissionPayment (← PayrollCommission)           │
│ Offer (← Opportunity)                             │
│ WhatsAppAttachment (← WhatsAppMessage) [مبنية ✅]  │
└────────────────────────────────────────────────────┘
        │
        ▼
┌─ Tier 2 ──────────────────────────────────┐
│ Contract (← Unit, Offer, Lead) [مبنية ⚠️ راجع §9] │
│ Tour (← Opportunity, Offer)                │
└──────────────────────────────────────────────┘
        │
        ▼
┌─ Tier 3 ────────────────────────────────────────┐
│ Installment (← Contract, PaymentPlan)            │
│ rental_invoices/Invoice (← RentalLease, Contract) │
└────────────────────────────────────────────────────┘
        │
        ▼
┌─ Tier 4 ──────────────────────────────────────┐
│ PaymentTransaction (← Invoice, Installment)    │
│ ZatcaQueue (← Invoice)                         │
└──────────────────────────────────────────────────┘
        │
        ▼
┌─ Tier 5 ─────────────────────┐
│ Receipt (← PaymentTransaction) │
└─────────────────────────────────┘
        │
        ▼
┌─ Tier 6 ──────────────────┐
│ GeneralLedger (← Receipt)  │
└──────────────────────────────┘
```

**قيد توقيت حرج:** أقدم نقطة تبعية فعلية في كامل السلسلة هي `20260614_add_paylink_gateway_fields` (تلمس rental_invoices وpayment_transactions). هذا يعني أن **كل الشريحة من Tier 0 حتى Tier 4** (Unit → Offer → Contract → Installment/rental_invoices → PaymentTransaction) يجب أن تُحشر بين `20260612235959_create_sentinel_command_baseline` و`20260613_add_hash_columns`/`20260614_add_paylink_gateway_fields` — نافذة زمنية ضيقة جداً تتطلب ترقيم migrations دقيق (مثل 20260612235963 → 20260612235970...).

---

## 7. التصنيف النهائي لكل جدول

| التصنيف | الجداول |
|---|---|
| **SAFE_TO_BASELINE** (شكل schema.prisma الحالي = الشكل التاريخي المرجّح، بلا migrations تابعة) | agent_leases, agent_slots, agent_telemetry_logs, automation_workflows, commission_payments, failed_login_attempts, followup_sequences, general_ledger, maintenance_tickets, payroll_commissions, platform_connections, rental_leases, sentinel_chat_messages, telemetry_events, tickets, usage_meters, user_favorites, whatsapp_attachments, zatca_devices, zatca_queue, audit_logs (تعديلاتها idempotent) |
| **NEEDS_HISTORICAL_RECONSTRUCTION** (تحتاج استبعاد أعمدة لاحقة بدقة) | units, offers, opportunities, tours, installments, payment_transactions, contracts (مبنية، تحتاج فقط إصلاح ترتيب), **rental_invoices (الأعمق، يحتاج حفراً إضافياً)** |
| **DEPENDENCY_UNRESOLVED** (لا يمكن بناؤها قبل غيرها) | Receipt (يحتاج PaymentTransaction أولاً), GeneralLedger (يحتاج Receipt أولاً), ZatcaQueue (يحتاج Invoice أولاً) — هذه ليست مشكلة في ذاتها، فقط ترتيب |

---

## 8. الحد الأدنى المقترح من Historical Baseline Migrations

بدل migration واحدة شاملة (ممنوعة)، أو 32 ملفاً منفصلاً (غير عملي)، يُقترح **6 ملفات baseline مجمّعة حسب نقطة الإدراج**، كل ملف idempotent بنفس نمط whatsapp_contacts:

1. **`..._create_tier0_foundation_baseline`** — يضم 18 جدولاً من Tier 0 البسيطة (بلا offer/unit). يُدرج فوراً بعد `20260612235959_create_sentinel_command_baseline`.
2. **`..._create_units_baseline`** — units فقط (حرجة لأن contracts الحالية تعتمد عليها). تُدرج قبل `20260612235962_create_contracts_baseline` الموجودة.
3. **`..._create_opportunity_offer_baseline`** — Opportunity ثم Offer (بالترتيب). تُدرج قبل contracts الموجودة أيضاً، بعد units.
4. **`..._fix_contracts_baseline_ordering`** — لا migration جديدة؛ فقط نقل/إعادة ترقيم الموجودة لو لزم لضمان أنها بعد (2) و(3).
5. **`..._create_installment_rental_invoice_baseline`** — Installment + rental_invoices معاً (يحتاجان Contract من الخطوة السابقة). يجب أن تكون **قبل** `20260614_add_paylink_gateway_fields`.
6. **`..._create_payment_transaction_receipt_ledger_baseline`** — PaymentTransaction → Receipt → GeneralLedger → ZatcaQueue بالترتيب. أيضاً قبل `20260614_add_paylink_gateway_fields` (لأن payment_transactions تابعة لها أيضاً).
7. **`..._create_tours_baseline`** — Tour (تابعة فقط لـ transaction_spine، مرونة زمنية أكبر، يمكن دمجها مع (3) أو إفرادها).

**ملاحظة:** الخطوات 5 و6 تشتركان في قيد التوقيت الأقدم (قبل 20260614)، فيجب أن يكون ترقيمها ضمن نفس النافذة الضيقة بين sentinel_command_baseline وadd_hash_columns/add_paylink_gateway_fields.

---

## 9. مراجعة الـ3 Baselines المبنية مسبقاً

| الملف | الحكم | السبب |
|---|---|---|
| `20260612235960_create_whatsapp_messages_baseline` | ✅ **صحيح كما هو** | لا تبعيات لجداول أخرى من القائمة المفقودة، نجح فعلياً في الاختبار |
| `20260612235961_create_mansour_chats_baseline` | ✅ **صحيح كما هو** | نفس السبب، نجح فعلياً في الاختبار |
| `20260612235962_create_contracts_baseline` | ⚠️ **يحتاج شرطاً سابقاً، وليس تعديلاً لمحتواه** | المحتوى نفسه (id, tenant_id, unit_id, buyer_name, buyer_phone, total_volume_sar, signed_at, end_date, status, vat_type, vat_rate, created_at) **صحيح ومطابق** لـ schema.prisma عند commit a60a604 — لكنه يفشل لأن `units` (FK) **غير موجود بعد**. الحل: إدراج `units` baseline (وربما opportunity/offer إن أُريد تفعيل العلاقات الكاملة لاحقاً) **قبل** هذا الملف، دون تعديل محتوى contracts نفسه. |

---

## 10. خطة Fresh Database Rehearsal (بعد اعتماد التصميم فقط)

1. بناء ملفات الـbaseline المجمّعة (القسم 8) بنفس نمط `whatsapp_contacts` (CREATE TABLE IF NOT EXISTS + تحقق من الأعمدة لو موجود الجدول).
2. إدراجها بالترقيم الزمني الصحيح حسب الـTiers (units وopportunity/offer قبل contracts، installment/rental_invoices وpayment_transaction/receipt/ledger قبل 20260614).
3. إنشاء قاعدة Neon فارغة ثالثة جديدة (نفس الفرع المعزول `br-floral-cake-aqu1olyp` المستخدَم بالفعل، أو فرع جديد).
4. تشغيل `prisma migrate deploy` كاملاً من الصفر.
5. عند أي فشل: تسجيله، **لا** إصلاحه بـ `db push` أو `migrate resolve`، إعادة الفحص التاريخي لذلك الجدول بنفس عمق rental_invoices.
6. تكرار حتى `migrate deploy` = PASS كاملاً (41+ migration) بلا أي يدوي.
7. `prisma migrate diff --from-empty --to-schema-datamodel` = صفر فرق جوهري.
8. فقط بعد PASS مزدوج (نسختين مستقلتين) يُعتبر P2 مغلقاً، وتبدأ P3.

---

## الحكم النهائي

```
BASELINE_DESIGN_BLOCKED
```

**السبب:** التصميم والترتيب (DAG) وتصنيف الجداول **جاهزة ومبنية على دليل مباشر**، لكن إعادة البناء التاريخي الدقيق لم تكتمل بالعمق المطلوب لكل الجداول المعقدة — وعلى الأخص:
- `rental_invoices` يحتاج حفراً تاريخياً إضافياً (الشكل الحالي المُستخرج قد يكون ناقصاً؛ ظهرت بالفعل طبقتان مختلفتان من التطور غير المتتبَّع بين نفس الكوميتين).
- 20 جدولاً في "Tier صفر تبعيات" تم تصنيفها SAFE_TO_BASELINE بافتراض أن schema.prisma الحالي = الشكل التاريخي، **دون تحقق فردي بنفس صرامة rental_invoices** لكل واحد منها.
- لم تُكتب بعد أي من ملفات الـbaseline المجمّعة المقترحة في §8 (عدا الثلاثة الأصلية تحت المراجعة).

**لا يُعتبر التصميم معتمداً (APPROVED) حتى:**
1. يراجع المستخدم هذا التقرير ويوافق على استراتيجية التجميع في §8.
2. يُستكمل الحفر التاريخي لـrental_invoices تحديداً (الجدول الأعلى خطورة).
3. يُقرَّر إن كانت الـ20 جدولاً "Tier صفر" تحتاج تحققاً فردياً إضافياً أو يُقبل الافتراض الحالي كمخاطرة محسوبة منخفضة (بما أنها بلا migrations تابعة، أي خطأ فيها لن يُسبب فشل Migration، فقط احتمال اختلاف طفيف عن شكل قاعدة الإنتاج الفعلية).
