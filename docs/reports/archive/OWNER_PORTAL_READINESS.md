# Phase 6: Owner Portal Readiness Review

**Date:** 2026-06-09
**Reviewer:** Architecture Gate
**Scope:** Owner-specific routes, API endpoints, dashboard, permissions, financial reports, property management, onboarding, notifications, data isolation
**Score:** **0.5/10**

---

## OP-01: No Owner Routes or Pages [CRITICAL]

**Files:** All `app/` directories
**Severity:** Critical
**Status:** Not addressed

There are zero routes, pages, or views dedicated to property owners/landlords/investors. All 22+ page routes under `app/operations/` are agency/brokerage-facing. The root `app/page.tsx:3-4` redirects to `/operations/dashboard`.

**Recommendation:** This requires a complete new suite of UI pages. Minimum MVP: owner dashboard (`/owner/dashboard`), property portfolio view, and financial summary.

---

## OP-02: No Owner API Endpoints [CRITICAL]

**Files:** All `app/api/` directories
**Severity:** Critical
**Status:** Not addressed

All 60+ API routes under `app/api/v1/` are agency-scoped. No owner-specific endpoints exist for property data, financial reports, or account management.

**Recommendation:** Build a dedicated API surface under `/api/v1/owner/` for owner-scoped operations.

---

## OP-03: No Owner Dashboard [CRITICAL]

**File:** `app/operations/dashboard/DashboardView.tsx` (606 lines)
**Severity:** Critical
**Status:** Not addressed

The only dashboard tracks agency sales KPIs (leads, bookings, closed sales, agent performance). No owner-facing dashboard exists.

**Recommendation:** Design and implement an owner dashboard showing rental income, property performance, occupancy rates, and pending maintenance.

---

## OP-04: Owner Role is a Client-Side Stub Only [HIGH]

**Files:** `app/context/AuthContext.tsx:6,17` — `'owner'` in `UserRole` with `['VIEW']` permission; `prisma/schema.prisma:28-34` — No `OWNER` in `Role` enum
**Severity:** High
**Status:** Not addressed

The `owner` role exists only as a TypeScript union type with a single `VIEW` permission. The database schema has no `OWNER` role in the `Role` enum, meaning no backend enforcement of owner permissions is possible.

**Recommendation:** Add `OWNER` to the Prisma `Role` enum, create an `Owner` model, and implement full permission scoping.

---

## OP-05: No Owner-Facing Financial Reports [HIGH]

**Files:** `lib/accounting/financial-reports.ts` (agency only); `app/operations/rental/page.tsx:1124-1163,1392-1436` (mock settlement data only)
**Severity:** High
**Status:** Not addressed

Agency-scoped accounting reports exist (trial balance, AR aging, VAT), but no owner-facing reports. The rental page has a "Settlements" pane that references owner payout data but uses hardcoded mock arrays with no real API integration.

**Recommendation:** Build owner-specific financial reports: rental income statements, P&L per property, payout history, and owner net-settlements.

---

## OP-06: No Owner Property Management [HIGH]

**Files:** `components/views/PropertiesView.tsx`, `components/properties/PropertyList.tsx`, `components/properties/PropertyDetail.tsx`
**Severity:** High
**Status:** Not addressed

Properties are managed as units under projects, scoped to the agency. There is no concept of "my properties" for an owner. No `ownerId` on units, projects, or leases.

**Recommendation:** Add `ownerId` foreign key to relevant models (Unit, Property, Project, Lease). Create owner-scoped property listing views.

---

## OP-07: No Owner Onboarding or Registration [HIGH]

**Files:** `app/register/page.tsx` (agency only); `app/operations/onboarding/page.tsx` (agency only)
**Severity:** High
**Status:** Not addressed

Registration and onboarding flows are exclusively for property management companies (Tenants). No owner registration form, invitation flow, or account creation exists.

**Recommendation:** Build an owner invitation flow where agencies can invite property owners via email, and owners complete their own registration.

---

## OP-08: No Owner Notification Channels [MEDIUM]

**Files:** `lib/notifications.ts`, `lib/email.ts`
**Severity:** Medium
**Status:** Not addressed

Notification infrastructure exists (SMS via MSegat, WhatsApp via Meta API, email via Resend) but is used only for agency communications. No owner-specific notification templates exist (rent collected, lease expiring, maintenance request).

**Recommendation:** Add owner notification templates for: rent payment received, monthly statements, lease expiration reminders, and maintenance status updates.

---

## OP-09: No Owner Data Model [CRITICAL]

**File:** `prisma/schema.prisma`
**Severity:** Critical
**Status:** Not addressed

There is no `Owner` model, no relationship between owners and properties, and no `ownerId` on any schema. Multi-tenancy isolates between agencies, not between owners.

**Recommendation:** Create an `Owner` model with fields for identity, contact, banking details for payouts, and preferences. Add `ownerId` to `Unit`, `Property`, `Project`, and `Lease` models.

---

## OP-10: No Owner-Facing Mobile Responsiveness [MEDIUM]

**Files:** All UI components
**Severity:** Medium
**Status:** Not addressed

Since no owner views exist, mobile responsiveness for the Owner Portal is entirely unaddressed. The agency dashboard layout (`DashboardLayout.tsx`) has responsive patterns that could be reused.

**Recommendation:** Build owner portal views with mobile-first responsive design from the start.

---

## Summary

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| OP-01 | No owner routes/pages | Critical | Not addressed |
| OP-02 | No owner API endpoints | Critical | Not addressed |
| OP-03 | No owner dashboard | Critical | Not addressed |
| OP-09 | No owner data model | Critical | Not addressed |
| OP-04 | Owner role is client-side stub | High | Not addressed |
| OP-05 | No owner financial reports | High | Not addressed |
| OP-06 | No owner property management | High | Not addressed |
| OP-07 | No owner onboarding | High | Not addressed |
| OP-08 | No owner notifications | Medium | Not addressed |
| OP-10 | No mobile-responsive owner views | Medium | Not addressed |

**Blocking findings:** 4 Critical, 4 High
**Gate verdict:** **BLOCKED** — The Owner Portal is entirely absent. No database models, API routes, pages, or authentication flows exist. Estimated 3-6 months of development effort for an MVP.
