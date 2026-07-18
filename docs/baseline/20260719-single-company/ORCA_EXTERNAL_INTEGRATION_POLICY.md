# ORCA EXTERNAL INTEGRATION POLICY
**Document ID:** ORCA-INT-OWN-001
**Version:** 1.0
**Date:** 2026-07-19
**Status:** `APPROVED AND BINDING`
## النموذج المعتمد
| البند | القرار |
|---|---|
| INTEGRATION OWNERSHIP | `COMPANY OWNER` |
| TECHNICAL PROVIDER RESPONSIBILITY | `INTEGRATION-READY PATHS AND ADAPTERS ONLY` |
| PRODUCTION PROVIDER ACCOUNTS | `NOT PROVIDED / NOT CONFIGURED` |
| LICENSES AND EXTERNAL SUBSCRIPTIONS | `COMPANY OWNER RESPONSIBILITY` |
| DEVELOPER-OWNED CREDENTIALS | `PROHIBITED` |
## قواعد المنتج
- `NOT_CONFIGURED` حالة سليمة وقابلة للعرض.
- لا بيانات اعتماد وهمية ولا fallback إلى حساب المطور.
- لا إرسال أو دفع أو استرداد أو رفع خارجي في الاختبارات الافتراضية.
- Provider calls تكون خلف Adapter قابل للاستبدال وMock.
- Webhooks تتحقق من التوقيع والدedupe والـreplay والحالة.
- الأسرار لا تدخل Git أو التقارير أو logs، وتدار في Secret Vault/Environment.
- واجهة الربط تعرض الحالة ولا تدعي اتصالًا دون إثبات Provider.
## عقد الجاهزية لكل مزود
1. Provider interface.
2. إعدادات وValidation بلا كشف قيم.
3. Connection state machine.
4. Safe error mapping.
5. Audit log.
6. Webhook signature/replay tests عند وجود Webhook.
7. Mock provider tests.
8. Activation runbook يملؤه مالك الشركة مستقبلًا.