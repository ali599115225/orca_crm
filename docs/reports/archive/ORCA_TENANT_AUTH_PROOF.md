# ORCA Tenant Portal — Per-User Authorization Static Analysis

**Target file:** `app\dashboard\tenant-portal\page.tsx`
**Analysis date:** 2026-06-10

---

## 1. Auth Gate: Can an unauthenticated user access this page?

### Result: FAIL

| Check | File | Line(s) | Status |
|-------|------|---------|--------|
| Dashboard layout auth check | `app\dashboard\layout.tsx` | 1–9 | **NO AUTH CHECK** — does not call `getSession()`, no redirect |
| Global middleware | `middleware.ts` | 58 | Matcher is `/api/:path*` only — does NOT protect dashboard routes |
| Page-level session guard | `app\dashboard\tenant-portal\page.tsx` | 18 | `tenantName` falls back to `"المستأجر"` when `session` is null — page renders with partial data |

**Contrast:** `app\operations\layout.tsx:19-23` correctly gates:
```tsx
const session = await getSession();
if (!session) { redirect("/login"); }
```

---

## 2. User Identification

**File:** `app\dashboard\tenant-portal\page.tsx`

| Step | Line | Code |
|------|------|------|
| JWT session from cookie | 17 | `const session = await getSession();` |
| Derive tenant identity | 18 | `const tenantName = session?.name \|\| session?.email \|\| "المستأجر";` |

**Note:** The variable is named `tenantName` (meaning "the user's name who is a rental tenant"), NOT `tenant.id` (the multi-tenant organization). There is a naming collision with the org tenant concept.

---

## 3. Per-Query Access Control Audit

### 3a. Rental Leases — WORKING

**Lines 21–25:**
```tsx
prisma.rentalLease.findMany({
  where: { tenantId: tenant.id, tenantName },
  // tenantId = multi-tenant org ID
  // tenantName = session.name (the logged-in user's name as it appears on the lease)
})
```

- `tenantId` enforces multi-tenant isolation
- `tenantName` enforces per-user filtering — matches the lease's `tenantName` field against the logged-in user's name/email
- **Tenant A cannot see Tenant B's leases** because `tenantName` must match the session identity

**Verdict: PASS**

---

### 3b. Rental Invoices — DATA LEAK

**Lines 26–30:**
```tsx
prisma.rentalInvoice.findMany({
  where: { tenantId: tenant.id },
  // NO tenantName filter — fetches ALL invoices in the org
})
```

- Only scoped to the multi-tenant org (`tenantId`) — NO per-user filter
- The invoices table at lines 170–204 shows `invoices.slice(0, 10)` — **all invoices across all lease-holders in the org**
- Invoice details exposed: invoice number, issue date, due date, total amount, status
- Filtering by `leaseId` only happens later at line 124 for the lease detail cards

**Verdict: FAIL** — cross-tenant-user data exposure

**File/Line:** `app\dashboard\tenant-portal\page.tsx:27`

---

### 3c. Payment Transactions — DATA LEAK

**Lines 31–35:**
```tsx
prisma.paymentTransaction.findMany({
  where: { tenantId: tenant.id },
  // NO tenantName filter — fetches ALL payments in the org
})
```

- Only `tenantId` — NO per-user filter
- Payments table at lines 207–233 shows all payments across the org
- Data exposed: payment date, amount, fees, net amount, method, status

**Verdict: FAIL** — cross-tenant-user data exposure

**File/Line:** `app\dashboard\tenant-portal\page.tsx:32`

---

### 3d. Maintenance Tickets — WORKING

**Lines 36–40:**
```tsx
prisma.maintenanceTicket.findMany({
  where: { tenantId: tenant.id, reportedBy: tenantName },
})
```

- Filtered by both `tenantId` and `reportedBy: tenantName`
- Tenant user A only sees tickets they reported

**Verdict: PASS**

---

## 4. Complete Data-Flow Trace: User Identity → Access Control

```
getSession()                          — JWT from "session_token" cookie (lib/session.ts:33-38)
  ↓
session?.name || email || "المستأجر"   — tenantName (page.tsx:18)
  ↓
  ├─ rentalLeases    → tenantName filter         → ✅ ISOLATED
  ├─ rentalInvoices  → NO tenantName filter      → ❌ LEAKS all invoices in org
  ├─ payments        → NO tenantName filter      → ❌ LEAKS all payments in org
  └─ maintenance     → reportedBy: tenantName    → ✅ ISOLATED
```

---

## 5. Verdict: **FAIL**

### Critical Issues

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | No auth gate on dashboard layout — unauthenticated users can access | HIGH | `app\dashboard\layout.tsx:4-9` |
| 2 | Invoices table shows ALL invoices across all tenants in org | HIGH | `app\dashboard\tenant-portal\page.tsx:27` |
| 3 | Payments table shows ALL payments across all tenants in org | HIGH | `app\dashboard\tenant-portal\page.tsx:32` |

### What Works

- RentalLeases are correctly filtered by `tenantName` — cross-tenant-user isolation holds
- Maintenance tickets are correctly filtered by `reportedBy: tenantName`

---

### Recommended Fixes

1. **Add auth gate to dashboard layout** — insert `getSession()` check + redirect to `/login` in `app\dashboard\layout.tsx`
2. **Scope invoices to the user's leases:**
   ```tsx
   where: { tenantId: tenant.id, lease: { tenantName } }
   ```
3. **Scope payments to the user's leases:**
   ```tsx
   where: { tenantId: tenant.id, lease: { tenantName } }
   ```
4. Consider binding by `userId` instead of `name`/`email` — names can collide and emails can change
