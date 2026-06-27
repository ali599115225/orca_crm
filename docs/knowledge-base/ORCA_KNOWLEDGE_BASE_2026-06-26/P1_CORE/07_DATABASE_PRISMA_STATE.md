# P1 — حالة قاعدة البيانات وPrisma

## آخر حالة موثقة

- قاعدة الاختبار: `test_g4_fresh`
- Applied migrations قبل الفشل: 10
- Pending: 27
- Migration blocker: `20260613_add_hash_columns`

## الـMigrations المكتملة قبل الفشل

1. `20260524004442_init_database`
2. `20260526001652_add_contract_terms`
3. `20260526150443_add_saas_billing_fields_for_sanad`
4. `20260611000000_create_contacts_baseline`
5. `20260611205518_add_email_message`
6. `20260612_fix_leads_schema_drift`
7. `20260612000000_add_lead_last_contacted_at`
8. `20260612235958_create_whatsapp_contacts_baseline`
9. `20260612235959_create_sentinel_command_baseline`
10. `20260613_add_execution_payload_to_sentinel_task_orders`

## مبدأ التصحيح

لا تُصلح قاعدة موجودة أولًا.  
صمم Historical Baseline، ثم اختبر سلسلة Migrations كاملة على قاعدة فارغة، وبعد نجاحها صمم Repair plan للقاعدة الحالية.

## نتيجة مطلوبة

`MIGRATION_CHAIN_PROVEN_ON_FRESH_DATABASE`
