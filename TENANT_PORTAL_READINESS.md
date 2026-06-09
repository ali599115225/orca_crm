# Phase 7: Tenant Portal Readiness Review

**Date:** 2026-06-09
**Reviewer:** Architecture Gate
**Scope:** Tenant (renter) routes, API, self-service features, authentication, lease management, maintenance requests, payment portal, notifications, mobile responsiveness
**Score:** **1.0/10**

---

## TP-01: No Renter Routes or Pages [CRITICAL]

**Files:** All `app/` directories
**Severity:** Critical
**Status:** Not addressed

There are zero routes dedicated to renters/residents. No `app/portal/`, `app/renter/`, or `app/resident/` directories. All pages are for property management staff. The `Tenant` model in Prisma (`prisma/schema.prisma:175`) refers to the B2B property management company, not to individual renters.

**Recommendation:** This requires a complete new portal. Minimum MVP: renter login, lease overview, payment portal, and maintenance request submission.

---

## TP-02: No Renter User Model [CRITICAL]

**File:** `prisma/schema.prisma`
**Severity:** Critical
**Status:** Not addressed

No `Renter`, `Resident`, or `TenantProfile` model exists. The `User` model is linked to `Tenant` (company) via `tenantId` — every user is an employee of a property management company. There is no separate user type for renters.

**Recommendation:** Add a `Renter` model with tenantId, identity fields, lease references, authentication credentials, and contact information.

---

## TP-03: No Renter Authentication or Login [CRITICAL]

**Files:** `app/login/LoginForm.tsx`, `app/actions/auth.ts`, `lib/session.ts`, `app/context/AuthContext.tsx`
**Severity:** Critical
**Status:** Not addressed

The authentication system is for property management staff only. Roles are `ADMIN | SALES_MANAGER | SALES_EMPLOYEE | MARKETING | READ_ONLY`. No renter role exists. Sessions are tied to a `User` record that links to `Tenant` (company).

**Recommendation:** Build a separate renter login flow with a new `RENTER` role. Consider passwordless login (OTP via SMS/email) for better renter experience. Ensure tenant-context isolation so renters only see their own data.

---

## TP-04: No Renter-Facing Lease Views [CRITICAL]

**Files:** `prisma/schema.prisma:376` (RentalLease model exists for staff); `app/operations/rental/page.tsx` (staff only)
**Severity:** Critical
**Status:** Not addressed

The `RentalLease` model and lease management UI exist but are staff-only. There is no renter-facing lease overview, lease document access, or lease status view.

**Recommendation:** Build renter-facing lease views: current lease summary, lease documents (PDF download), lease start/end dates, and renewal status.

---

## TP-05: No Renter Payment Portal [CRITICAL]

**Files:** `app/actions/payment.ts` (SaaS subscription only); `app/api/v1/invoices/[id]/pay/route.ts` (staff only)
**Severity:** Critical
**Status:** Not addressed

Payment integration exists (Moyasar gateway) but is used only for ORCA's own SaaS subscriptions. The invoice payment endpoint is staff-only. No public/renter-facing checkout flow exists.

**Recommendation:** Build a renter payment portal with: invoice listing, online payment via Moyasar/Tabby, payment history, and automated receipt generation.

---

## TP-06: No Maintenance Request System [CRITICAL]

**Files:** `prisma/schema.prisma` — no `MaintenanceRequest` or `WorkOrder` model
**Severity:** Critical
**Status:** Not addressed

There is zero maintenance request infrastructure: no database model, no API routes, no UI components, no notification flows. The `Ticket` model (`prisma/schema.prisma:239`) is for platform technical support, not property maintenance.

**Recommendation:** Create a complete maintenance request system: `MaintenanceRequest` model (tenantId, unitId, description, priority, status, assignedTo, createdAt, resolvedAt), renter submission form, staff assignment workflow, and status tracking.

---

## TP-07: No Renter Notification Flows [HIGH]

**Files:** `lib/notifications.ts` (SMS + WhatsApp); `lib/email.ts` (Resend)
**Severity:** High
**Status:** Not addressed

Notification infrastructure exists but has no renter-specific templates or triggers. No flows for: rent due reminders, payment confirmations, maintenance updates, lease expiration alerts.

**Recommendation:** Add renter notification templates: payment reminders (3/7 days before due), payment confirmations, maintenance request acknowledgments and status updates, lease renewal reminders.

---

## TP-08: No Renter Onboarding or Invitation [HIGH]

**Files:** `app/register/page.tsx` (B2B only); `app/actions/register.ts` (Tenant registration only)
**Severity:** High
**Status:** Not addressed

No mechanism exists to onboard renters to a portal. No invitation system, no renter registration, no profile setup flow.

**Recommendation:** Build an invitation flow where property managers can invite renters via email/SMS with a secure onboarding link. Include initial password/OTP setup and profile completion.

---

## TP-09: No Communication Between Renters and Managers [HIGH]

**Files:** `app/operations/whatsapp/` (lead CRM only); `app/operations/helpdesk/` (platform support only)
**Severity:** High
**Status:** Not addressed

There is no direct communication feature between renters and property managers. The WhatsApp integration is for lead/buyer CRM. The helpdesk is for platform technical support.

**Recommendation:** Implement a renter-manager messaging system. Could reuse the WhatsApp integration for two-way renter communication, or build an in-app messaging feature scoped to each renter-manager relationship.

---

## TP-10: No Renter Payment History View [HIGH]

**Files:** `prisma/schema.prisma:600` (Receipt model); `prisma/schema.prisma:711` (PaymentTransaction model)
**Severity:** High
**Status:** Not addressed

While `Receipt` and `PaymentTransaction` models exist for internal tracking, there is no renter-facing payment history view. Renters cannot see their past payments, outstanding balances, or download receipts.

**Recommendation:** Build a renter payment history view with: invoice list with status (paid/unpaid/overdue), downloadable PDF receipts, balance summary, and payment method history.

---

## Summary

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| TP-01 | No renter routes/pages | Critical | Not addressed |
| TP-02 | No renter user model | Critical | Not addressed |
| TP-03 | No renter authentication | Critical | Not addressed |
| TP-04 | No renter lease views | Critical | Not addressed |
| TP-05 | No renter payment portal | Critical | Not addressed |
| TP-06 | No maintenance request system | Critical | Not addressed |
| TP-07 | No renter notification flows | High | Not addressed |
| TP-08 | No renter onboarding | High | Not addressed |
| TP-09 | No renter-manager communication | High | Not addressed |
| TP-10 | No renter payment history | High | Not addressed |

**Blocking findings:** 6 Critical, 4 High
**Gate verdict:** **BLOCKED** — The Tenant (Renter) Portal is entirely absent. No models, routes, authentication, payment portal, or maintenance system exist. Estimated 3-6 months for an MVP.
