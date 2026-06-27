# P0 — Historical Migration Baseline

## القاعدة التي ظهر عليها الحاجز

- Provider: Neon PostgreSQL
- Database: `test_g4_fresh`
- Connection: Direct
- تعامل كقاعدة اختبار، لا إنتاج.

## حالة Prisma

- إجمالي Migration directories: 38
- Pending وقت الفحص: 27
- Migration الفاشلة: `20260613_add_hash_columns`
- Prisma error: `P3009`
- PostgreSQL error: `42P01`
- السبب المباشر: relation `whatsapp_messages` does not exist
- Statement الفاشل:
  `ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS phone_hash TEXT;`

## الجداول التي ثبت غياب Creation Migration لها

1. `whatsapp_messages`
2. `mansour_chats`
3. `contracts`

## الدليل التاريخي

### whatsapp_messages

- لا توجد Prisma creation migration.
- يوجد SQL يدوي في `scripts/create-whatsapp-tables.sql`.
- أول Commit معروف للـDDL اليدوي: `feb70d5`.

### mansour_chats

- Model موجود.
- لا Creation Migration.
- لا DDL تاريخي مكتوب تم العثور عليه.
- المرجح أنه أُنشئ عبر `prisma db push`.

### contracts

- Model موجود.
- لا Creation Migration أصلية.
- Migrations لاحقة تفترض وجود الجدول.
- المرجح أنه أُنشئ تاريخيًا خارج سلسلة Prisma Migrate.

## الحكم

`HISTORICAL_BASELINE_RECONSTRUCTION_REQUIRED`

## القيود الصارمة

ممنوع حاليًا:

- `prisma migrate deploy` على القاعدة الحالية.
- `prisma migrate resolve`
- `prisma migrate reset`
- `prisma db push`
- اعتبار `applied_steps_count = 0` دليلًا كافيًا على عدم وجود أي أثر.

## مواصفات الـBaseline الصحيحة

- يجب أن ترتب قبل `20260613_add_hash_columns`.
- تمثل الشكل التاريخي للجداول قبل Hash migration.
- لا تضيف مسبقًا:
  - `phone_hash`
  - `contact_phone_hash`
  - `buyer_phone_hash`
- لا تنشئ Foreign Keys إلى جداول لم تكن موجودة في تلك النقطة.
- يجب فحص جميع Models التي لا تملك Creation Migration، وليس الجداول الثلاثة فقط.
- يجب اختبار السلسلة كاملة على Database فارغة ومعزولة.

## شرط الإغلاق

- Fresh database.
- `migrate deploy`: PASS.
- `migrate status`: UP TO DATE.
- Schema diff: ZERO أوفرق مفسر ومعتمد.
