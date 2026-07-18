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
| FC-014 | SMS | Company-owned future provider | Real helper paths exist; hardcoded-number conflict | NOT_CONFIGURED | Disable real effects |
| FC-015 | Payment Gateway | Company-owned future provider | Adapters/actions present; SaaS subscription actions conflict | NOT_CONFIGURED | Keep business-payment adapters; remove SaaS surface |
| FC-016 | Advertising | Company-owned future provider | Campaign/provider models present | NOT_CONFIGURED / no license proven | Mock only |
| FC-017 | ZATCA/Ejar/Government | Future company responsibility | Models/jobs/docs exist; license/readiness not proven | NOT CONFIGURED | No compliance claim |
| FC-018 | Agents & Sentinel | Internal automation/monitoring | Schema drift and cron failures | AI providers NOT_CONFIGURED | P0 operations |
| FC-019 | Tenant Registration & SaaS Billing | No valid business contract | Implemented legacy; billing Cron scheduled daily | External payment/SMS/email | OUT OF SCOPE / disable before provider setup |
| FC-020 | Dashboard & Reporting | Internal management | Production available; work-branch build blocked | None | Verify after build |
## حالات التحقق
- `Implemented` لا تعني Verified Runtime.
- `NOT_CONFIGURED` لا تعد فشلًا وظيفيًا متى كان Adapter والعقود والاختبارات جاهزة.
- أي وظيفة ذات أثر خارجي تبقى غير قابلة للاختبار الحقيقي دون موافقة وبيانات الشركة.