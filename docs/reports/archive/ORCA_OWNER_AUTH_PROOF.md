# ORCA Owner Portal — Per-User Authorization Static Analysis

**Target file:** `app\dashboard\owner-portal\page.tsx`
**Analysis date:** 2026-06-10

---

## 1. Auth Gate: Can an unauthenticated user access this page?

### Result: FAIL

| Check | File | Line(s) | Status |
|-------|------|---------|--------|
| Dashboard layout auth check | `app\dashboard\layout.tsx` | 1–9 | **NO AUTH CHECK** — does not call `getSession()`, no redirect |
| Global middleware | `middleware.ts` | 58 | Matcher is `/api/:path*` only — does NOT protect dashboard routes |
| Page-level session guard | `app\dashboard\owner-portal\page.tsx` | 18 | `ownerName` falls back to `"المالك"` when `session` is null — page renders with partial data |

**Contrast:** `app\operations\layout.tsx:19-23` correctly gates with:
```tsx
const session = await getSession();
if (!session) { redirect("/login"); }
```

---

## 2. User Identification

**File:** `app\dashboard\owner-portal\page.tsx`

| Step | Line | Code |
|------|------|------|
| JWT session from cookie | 17 | `const session = await getSession();` |
| Derive owner identity | 18 | `const ownerName = session?.name \|\| session?.email \|\| "المالك";` |
| userId (unused!) | 19 | `const ownerUserId = session?.userId;` — **defined but never used anywhere in the file** |

---

## 3. Per-Query Access Control Audit

### 3a. Contracts Query — WORKING

**Lines 22–26:**
```tsx
prisma.contract.findMany({
  where: { unit: { project: { tenantId: tenant.id } }, buyerName: ownerName },
  // ...
})
```

- `tenantId` enforces multi-tenant isolation
- `buyerName: ownerName` enforces per-owner filtering
- **Owner A cannot see Owner B's contracts** because `buyerName` must match `session.name`/`session.email`

**Verdict: PASS**

---

### 3b. Units Query (KPIs) — WORKING for KPIs, but TABLE LEAKS

**Lines 27–29 (database query):**
```tsx
prisma.unit.findMany({
  where: { tenantId: tenant.id },
  // NO ownerName filter — fetches ALL units in the tenant
})
```

**Line 52 (in-memory filter for KPIs):**
```tsx
const ownerUnits = units.filter(u => u.contract?.buyerName === ownerName);
```
- KPIs (totalUnits, occupiedUnits) are computed from `ownerUnits` — correct scoping

**Lines 201–228 (Units table — PRIVACY LEAK):**
```tsx
{units.slice(0, 10).map(u => ( ... u.unitNumber ... u.project.name ... u.priceSar ... u.contract?.buyerName ... ))}
```
- The units table shows **ALL units** in the tenant (`units.slice(0, 10)`), NOT `ownerUnits`
- Exposes other owners' unit numbers, project names, prices, and buyer names
- This is a **cross-owner data exposure**

**Verdict: FAIL** — Units table leaks other owners' data

**File/Line:** `app\dashboard\owner-portal\page.tsx:215`

---

### 3c. Maintenance Tickets — WORKING

**Lines 39–43:**
```tsx
prisma.maintenanceTicket.findMany({
  where: { tenantId: tenant.id, reportedBy: ownerName },
})
```
- Filtered by both `tenantId` and `reportedBy: ownerName`
- Owner A only sees tickets they reported

**Verdict: PASS**

---

### 3d. Rental Leases — PARTIAL LEAK

**Lines 31–34:**
```tsx
prisma.rentalLease.findMany({
  where: { tenantId: tenant.id, status: 'active' },
})
```
- Only `tenantId` + `status: 'active'` — NO `ownerName` filter
- All active rental leases across the entire tenant are fetched and counted
- The KPI at line 74: `const activeRentalLeases = rentalLeases.filter(l => l.status === 'active').length;` counts ALL active leases
- This exposes how many active leases exist in the tenant (aggregate leak)

**Verdict: FAIL** (aggregate data leak — Owner sees total lease count across all owners)

**File/Line:** `app\dashboard\owner-portal\page.tsx:32`

---

### 3e. Rental Invoices Aggregate — PARTIAL LEAK

**Lines 35–38:**
```tsx
prisma.rentalInvoice.aggregate({
  where: { tenantId: tenant.id },
  _sum: { totalAmount: true },
})
```
- Only `tenantId` — NO owner filter
- The KPI at line 62: `const totalRentalRevenue = Number(rentalInvoices._sum.totalAmount || 0);` shows total rental revenue for the **entire tenant**, not just this owner's units

**Verdict: FAIL** (aggregate data leak)

**File/Line:** `app\dashboard\owner-portal\page.tsx:36`

---

### 3f. Installments KPI — PARTIAL LEAK

**Lines 44–49:**
```tsx
prisma.installment.findMany({
  where: { tenantId: tenant.id, paymentStatus: 'Paid' },
})
```
- Only `tenantId` + `paymentStatus: 'Paid'` — NO owner filter
- The KPI at line 64: `const totalInstallmentsPaid = installments.reduce((s, i) => s + Number(i.amountSar), 0);` shows total paid installments across **all contracts** in the tenant
- The revenue chart (lines 66–72) also aggregates across the entire tenant

**Verdict: FAIL** (aggregate data leak)

**File/Line:** `app\dashboard\owner-portal\page.tsx:45`

---

## 4. Complete Data-Flow Trace: User Identity → Access Control

```
getSession()                      — JWT from "session_token" cookie (lib/session.ts:33-38)
  ↓
session?.name || email || "المالك" — ownerName (page.tsx:18)
  ↓
  ├─ contracts query  → buyerName: ownerName  → ✅ ISOLATED
  ├─ units KPI        → in-memory filter      → ✅ ISOLATED
  ├─ units TABLE      → NO filter             → ❌ LEAKS all units + buyerNames
  ├─ maintenance      → reportedBy: ownerName → ✅ ISOLATED
  ├─ rentalLeases     → NO ownerName filter   → ❌ LEAKS aggregate
  ├─ rentalInvoices   → NO ownerName filter   → ❌ LEAKS aggregate
  └─ installments     → NO ownerName filter   → ❌ LEAKS aggregate
```

---

## 5. Verdict: **FAIL**

### Critical Issues

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | No auth gate on dashboard layout — unauthenticated users can access | HIGH | `app\dashboard\layout.tsx:4-9` |
| 2 | Units table shows all units (including other owners' buyer names, prices) | HIGH | `app\dashboard\owner-portal\page.tsx:215` |
| 3 | Rental leases KPI aggregates across all owners | MEDIUM | `app\dashboard\owner-portal\page.tsx:32` |
| 4 | Rental invoices aggregate across all owners | MEDIUM | `app\dashboard\owner-portal\page.tsx:36` |
| 5 | Installments KPI aggregates across all owners | MEDIUM | `app\dashboard\owner-portal\page.tsx:45` |
| 6 | `session.userId` is fetched but never used as a filter | LOW | `app\dashboard\owner-portal\page.tsx:19` |

### What Works

- Contracts are correctly filtered by `buyerName: ownerName`
- Maintenance tickets are correctly filtered by `reportedBy: ownerName`
- Unit KPI calculations use `ownerUnits` (in-memory filtered by buyerName)

### Recommended Fixes

1. Add `getSession()` + redirect to `app\dashboard\layout.tsx` (copy pattern from `app\operations\layout.tsx:19-23`)
2. Change `units.slice(0,10)` to `ownerUnits.slice(0,10)` at line 215 for the units table
3. Add `ownerName` filter to rentalLeases, rentalInvoices, and installments queries or join through contracts to scope to the owner's data
4. Use `session.userId` instead of (or in addition to) `session.name` for identity binding — names can collide
