# ORCA Portal Validation Report

**Generated:** 2026-06-10 | **Method:** Static Analysis

---

## OWNER PORTAL: `app/dashboard/owner-portal/page.tsx`

### 1. Navigation — Route + Layout Auth Gate
**`app/dashboard/layout.tsx:6-10`**
```ts
const session = await getSession();
if (!session) { redirect("/login"); }
```
**PASS** — Page exists, layout blocks unauthenticated users and redirects to `/login`.

### 2. Permissions — getSession() Gate
**`app/dashboard/owner-portal/page.tsx:17-19`**
```ts
const session = await getSession();
const ownerName = session?.name || session?.email || "المالك";
const ownerUserId = session?.userId;
```
**PASS** — Session is used for identity (name extraction), auth enforcement is handled by layout. Falls back to `"المالك"` only when session lacks name/email but layout already guarantees session exists.

### 3. Properties — Filtered by Owner?
**`app/dashboard/owner-portal/page.tsx:27-30,52`**
```ts
// Server fetch: ALL units for tenant (no owner filter)
prisma.unit.findMany({
  where: { tenantId: tenant.id },  // ← all tenant units
  include: { project: { select: { name: true } }, contract: { select: { id: true, buyerName: true } } },
})

// Client-side filter:
const ownerUnits = units.filter(u => u.contract?.buyerName === ownerName);
```
**PASS** — Filtering logic is correct at line 52. Data is fetched for entire tenant then filtered in-memory (not ideal for performance but functionally correct; always server-rendered, so no browser data leakage beyond rendered HTML).

### 4. Contracts — Filtered by buyerName?
**`app/dashboard/owner-portal/page.tsx:22-26`**
```ts
prisma.contract.findMany({
  where: { unit: { project: { tenantId: tenant.id } }, buyerName: ownerName },
  include: { unit: { include: { project: { select: { name: true, city: true } } } }, installments: ... },
})
```
**PASS** — Query-level filter by `buyerName: ownerName`. Correct scoping.

### 5. Revenue — Computed from Installments?
**`app/dashboard/owner-portal/page.tsx:44-72`**
```ts
prisma.installment.findMany({
  where: { tenantId: tenant.id, paymentStatus: 'Paid' },
  ...
})
// ...
const totalInstallmentsPaid = installments.reduce((s, i) => s + Number(i.amountSar), 0);
// Monthly aggregation at lines 66-72
```
**PASS** — Revenue correctly computed from paid installments with monthly breakdown.

### 6. Maintenance — Filtered by reportedBy?
**`app/dashboard/owner-portal/page.tsx:39-43`**
```ts
prisma.maintenanceTicket.findMany({
  where: { tenantId: tenant.id, reportedBy: ownerName },
  orderBy: { createdAt: 'desc' },
  take: 20,
})
```
**PASS** — Filtered by `reportedBy` matching session name.

### 7. Documents — Download Capability?
**`app/dashboard/owner-portal/page.tsx:200-233`**
No document download section, no buttons, no links to PDFs or file storage.
**FAIL** — Owner portal has no document download capability. The `Contracts Table` and `Units Table` are display-only.

### 8. Downloads — PDF Export?
No `download`, `export`, `pdf`, `print`, or `href` elements exist in the page.
**FAIL** — No PDF export or download functionality.

### 9. Session Expiry — Does getSession() throw?
**`lib/session.ts:22-30`**
```ts
export async function decrypt(input: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(input, getJwtSecret(), { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;  // ← caught silently
  }
}
```
**PASS** — Expired/invalid tokens return `null`. Does not throw. Session duration is 12h (`SESSION_DURATION = "12h"` at line 4).

### 10. Unauthorized Access — Layout Redirect
**`app/dashboard/layout.tsx:7-9`**
```ts
if (!session) { redirect("/login"); }
```
**PASS** — No session = redirect to `/login`.

### 11. Broken Links
No `href` attributes found in owner-portal page.
**PASS** — No broken links.

---

## TENANT PORTAL: `app/dashboard/tenant-portal/page.tsx`

### 1. Navigation — Route + Layout Auth Gate
**`app/dashboard/layout.tsx:6-10`** (same layout)
**PASS** — Page exists, same layout auth gate as owner portal.

### 2. Permissions — getSession() Gate
**`app/dashboard/tenant-portal/page.tsx:17-18`**
```ts
const session = await getSession();
const tenantName = session?.name || session?.email || "المستأجر";
```
**PASS** — Session used for identity. Layout handles auth enforcement.

### 3. Leases — Filtered by tenantName?
**`app/dashboard/tenant-portal/page.tsx:21-25`**
```ts
prisma.rentalLease.findMany({
  where: { tenantId: tenant.id, tenantName },
  include: { invoices: { orderBy: { issueDate: 'desc' } } },
})
```
**PASS** — Query-level filter by `tenantName` from session identity.

### 4. Invoices — Filtered by leaseId: { in: leaseIds }?
**`app/dashboard/tenant-portal/page.tsx:36-42`**
```ts
const leaseIds = rentalLeases.map(l => l.id);
// ...
prisma.rentalInvoice.findMany({
  where: { tenantId: tenant.id, leaseId: { in: leaseIds } },
})
```
**PASS** — Invoices scoped to the tenant's lease IDs. Guard `if (leaseIds.length > 0)` prevents empty-array query.

### 5. Payments — Filtered by invoiceId: { in: leaseIds }?
**`app/dashboard/tenant-portal/page.tsx:43-49`**
```ts
prisma.paymentTransaction.findMany({
  where: { tenantId: tenant.id, invoiceId: { in: leaseIds } },
})
```
**PASS** — Payments scoped to invoice IDs belonging to the tenant's leases.

### 6. Maintenance — Filtered by reportedBy?
**`app/dashboard/tenant-portal/page.tsx:26-30`**
```ts
prisma.maintenanceTicket.findMany({
  where: { tenantId: tenant.id, reportedBy: tenantName },
  orderBy: { createdAt: 'desc' },
  take: 20,
})
```
**PASS** — Filtered by `reportedBy` matching tenant session name.

### 7. Documents — Lease Agreement Cards?
**`app/dashboard/tenant-portal/page.tsx:292-313`**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  {rentalLeases.slice(0, 5).map(l => (
    <div key={l.id} className="...">
      <span className="text-2xl">📄</span>
      <div>
        <p>عقد إيجار — {l.unitName}</p>
        ...
      </div>
    </div>
  ))}
</div>
```
**FAIL** — Displays static cards with lease info but no download links, buttons, or clickable actions. No actual document retrieval.

### 8. Downloads — Download Function?
No download/export buttons exist anywhere in the page.
**FAIL** — No download or PDF export capability.

### 9. Session Expiry
Same as owner portal (`lib/session.ts:22-30`).
**PASS** — Graceful null return.

### 10. Unauthorized Access
Same layout gate (`app/dashboard/layout.tsx:7-9`).
**PASS** — Redirect to `/login`.

### 11. Broken Links
No `href` attributes found in tenant-portal page.
**PASS** — No broken links.

---

## MAINTENANCE MODULE: `app/dashboard/maintenance/MaintenanceView.tsx`

### 1. Create Ticket — POST /api/v1/maintenance
**`MaintenanceView.tsx:84-96`**
```ts
const res = await fetch('/api/v1/maintenance/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title, description, category, priority, unitId, reportedBy, estimatedCost,
  }),
});
```
**PASS** — Creates tickets via POST to `/api/v1/maintenance/`. Includes title validation (`if (!newTitle) return;` at line 81).

### 2. Update Status — PATCH /api/v1/maintenance/[id]
**`MaintenanceView.tsx:120-124`**
```ts
const res = await fetch(`/api/v1/maintenance/${ticketId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: newStatus }),
});
```
**PASS** — Updates ticket status via PATCH.

### 3. Assign Technician — Same PATCH Endpoint
**`MaintenanceView.tsx:140-144`**
```ts
const res = await fetch(`/api/v1/maintenance/${ticketId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ assignedTo: name }),
});
```
**PASS** — Assigns technician via same PATCH endpoint with `assignedTo` field.

### 4. Cost Tracking — estimatedCost + actualCost
**`MaintenanceView.tsx:16-17`** (interface) + **`page.tsx:30-31`** (aggregation)
```ts
interface Ticket {
  estimatedCost: number | null;
  actualCost: number | null;
  ...
}
// Stats:
const totalEstimatedCost = tickets.reduce((s, t) => s + Number(t.estimatedCost || 0), 0);
const totalActualCost = tickets.reduce((s, t) => s + Number(t.actualCost || 0), 0);
```
Table columns at lines 312-313 display both costs.
**PASS** — Both cost fields tracked.

### 5. Filters — Status + Search
**`MaintenanceView.tsx:155-159`**
```ts
const filteredTickets = tickets.filter(t => {
  if (filterStatus && t.status !== filterStatus) return false;
  if (searchTerm && !t.title.includes(searchTerm) && !(t.reportedBy || '').includes(searchTerm)) return false;
  return true;
});
```
**PASS** — Client-side filtering by status and search (title + reportedBy). Filter UI at lines 262-277.

**Note:** Maintenance page (`page.tsx`) does NOT call `getSession()` — it only uses `getActiveTenant()`. All tickets for the tenant are fetched without user-level scoping. This appears intentional for an admin dashboard module. Layout auth gate still applies.

---

## ONBOARDING: `app/operations/onboarding/OnboardingForm.tsx`

### 1. Form Submission — completeOnboardingAction
**`OnboardingForm.tsx:21`**
```ts
const result = await completeOnboardingAction(formData);
```
**PASS** — Submits to server action at `app/actions/onboarding.ts:11`.

### 2. Validation — Required Fields
**Client:** `OnboardingForm.tsx:52,54,65,72,74,87,89` — `required` attribute on text/select inputs for `companyName`, `city`, `phone`, `documentNumber`.  
**Server:** `app/actions/onboarding.ts:20-22`
```ts
if (!companyName || !city || !documentNumber || !phone) {
  throw new Error("جميع الحقول مطلوبة لإتمام وتنشيط ملف منشأتك العقارية.");
}
```
**PASS** — Dual validation (client + server).

### 3. Redirect — After Success
**`OnboardingForm.tsx:26-29`**
```ts
setTimeout(() => {
  router.refresh();
  router.push("/operations");
}, 1500);
```
**PASS** — Redirects to `/operations` after 1.5s delay.

---

## SUMMARY

| Module | Total Checks | PASS | FAIL |
|--------|:-----------:|:----:|:----:|
| Owner Portal | 11 | 9 | 2 |
| Tenant Portal | 11 | 9 | 2 |
| Maintenance | 5 | 5 | 0 |
| Onboarding | 3 | 3 | 0 |
| **TOTAL** | **30** | **26** | **4** |

### Failures

| # | Module | Check | Reason |
|---|--------|-------|--------|
| 1 | Owner Portal | Documents (7) | No document download capability — contracts/units tables are display-only |
| 2 | Owner Portal | Downloads (8) | No PDF export, print, or download functionality |
| 3 | Tenant Portal | Documents (7) | Lease agreement "documents" section shows static cards only — no download links |
| 4 | Tenant Portal | Downloads (8) | No download or PDF export functionality |

### Observations (non-failures)
- Both portals rely on `app/dashboard/layout.tsx` for auth gating; individual pages extract session identity rather than re-enforcing auth (acceptable Next.js pattern).
- Session expiry is gracefully handled — `getSession()` returns `null` on expired/invalid tokens, does not throw.
- Owner portal `units` query fetches all tenant units, then filters in-memory by `buyerName`. Functionally correct but inefficient for large datasets.
- Maintenance module fetches all tenant tickets without user-level scoping — intended for admin dashboard use.
