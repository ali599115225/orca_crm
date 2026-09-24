# P1 — WhatsApp والتكاملات الخارجية

## WhatsApp

- Migration baseline restored: `20260612235958_create_whatsapp_contacts_baseline`
- Commit: `08f5b70`
- Tests: `41/41 PASS`
- Round-trip حقيقي تحقق سابقًا:
  1. إرسال من ORCA.
  2. وصول للهاتف.
  3. رد من الهاتف.
  4. ظهور الرد في المحادثة الصحيحة.
  5. Tenant صحيح.

## الحاجز الخارجي

`META PRODUCTION ACCOUNT REVIEW / ACTIVATION`

لا يعاد الاختبار الكامل إلا عند تغير:

- الرقم.
- Credentials.
- Webhook.
- App mode.

## Stash مهم

- الاسم: `wip-whatsapp-before-consolidation`
- hash: `dfab62b870d185dcaf077464bdb88429691dd2c5`
- يمنع حذفه أوPop غير المنضبط.

## ملاحظة Database

نجاح WhatsApp وظيفيًا لا يلغي أن `whatsapp_messages` لا يملك Creation Migration أصلية داخل Prisma chain.
