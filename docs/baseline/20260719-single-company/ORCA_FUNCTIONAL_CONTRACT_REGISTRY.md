# ORCA FUNCTIONAL CONTRACT REGISTRY
**Document ID:** ORCA-FCR-001
**Version:** 1.0
**Date:** 2026-07-19
**Status:** `BASELINE — NOT A GO-LIVE CERTIFICATE`
| ID | المجال | العقد التجاري | الحقيقة الحالية | حالة التكامل | القرار |
|---|---|---|---|---|---|
| FC-001 | Authentication & Session | Internal users only | Implemented / needs active-user revalidation | No external provider | P0 hardening |
| FC-002 | Staff & User Management | Company employees/agents | Implemented partially; role model inconsistent | None | P1 redesign |
| FC-003 | Organization Structure | Departments/branches/teams | Department text only; Branch/Team missing | None | P1 design first |
| FC-004 | Leads & Contacts | Internal sales operations | Implemented; visual/detail closure not fully proven | Inbound adapters optional | Verify after build |
| FC-005 | Projects & Properties | Company inventory/projects | Implemented across work branches; not integrated | Maps/storage NOT_CONFIGURED | Verify after branch integration |
| FC-006 | Tours & Offers | Internal workflow | Implemented in specialty branches; preview failed globally | WhatsApp/email notifications optional | Verify; no real sends |
| FC-007 | Contracts & Payment Plans | Company business transactions | Implemented; authorization and tenant context require ongoing proof | Payment provider NOT_CONFIGURED | No real payment |
| FC-008 | Installments & Invoices | Internal finance operations | Runtime cron failure due context | Payment/SMS/email adapters | P0 cron fix; mock only |
| FC-009 | Rental Operations | Internal rental management | Implemented partially; no DB rental role | Ejar NOT PROVEN | P1 RBAC |
| FC-010 | Tasks & Maintenance | Internal operations | Implemented | Notification adapter optional | Verify |
| FC-011 | Documents | Internal metadata/files | Implemented model; external storage not proven | Storage NOT_CONFIGURED | Adapter readiness only |
| FC-012 | Email | Company-owned future provider | Draft/fail-safe path present | NOT_CONFIGURED | Keep; mock tests |
| FC-013 | WhatsApp | Company-owned future provider | UI/actions present; authorization gap | NOT_CONFIGURED | P0 security; no real send |
| FC-014 | SMS | Company-owned future provider | Helpers remain Integration-Ready؛ hardcoded Runtime recipients removed from P0-02 paths | NOT_CONFIGURED | DEFERRED WITH OWNER GATE؛ no real sends |
| FC-015 | Payment Gateway | Company-owned future provider | SaaS initiation/callback blocked؛ invoice/installment classification preserved | NOT_CONFIGURED | FIXED for P0-02؛ keep business-payment adapters |
| FC-016 | Advertising | Company-owned future provider | Campaign/provider models present | NOT_CONFIGURED / no license proven | Mock only |
| FC-017 | ZATCA/Ejar/Government | Future company responsibility | Models/jobs/docs exist; license/readiness not proven | NOT CONFIGURED | No compliance claim |
| FC-018 | Agents & Sentinel | Internal automation/monitoring | Schema drift and cron failures | AI providers NOT_CONFIGURED | P0 operations |
| FC-019 | Tenant Registration & SaaS Billing | No valid business contract | Runtime disabled؛ register 404؛ billing schedule removed؛ actions/services no-op | No provider call | OUT OF SCOPE / FIXED in P0-02 |
| FC-020 | Dashboard & Reporting | Internal management | Production available; work-branch build blocked | None | Verify after build |
## حالات التحقق
- `Implemented` لا تعني Verified Runtime.
- `NOT_CONFIGURED` لا تعد فشلًا وظيفيًا متى كان Adapter والعقود والاختبارات جاهزة.
- أي وظيفة ذات أثر خارجي تبقى غير قابلة للاختبار الحقيقي دون موافقة وبيانات الشركة.

## دليل P0-02
- `VERIFIED`: 43/43 اختبارات مستهدفة، TypeScript وProduction Build ناجحان.
- `FIXED`: FC-019 ومسار SaaS من FC-015 وFC-014.
- `DEFERRED WITH OWNER GATE`: تفعيل مزودي الدفع/SMS/Email الحقيقيين ومدفوعات المعاملات العقارية المستقبلية.
- `OUT OF SCOPE`: onboarding متعدد الشركات، subscriptions، plan upgrades، paid add-ons، SaaS billing Cron.
