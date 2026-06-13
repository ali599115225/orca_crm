# ORCA — OWNER PORTAL SPECIFICATION

> **Date:** 2026-06-10
> **Author:** Agent 3 — Product & Operations Lead
> **Status:** MISSING (0%) — Full specification for new build

---

## 1. Executive Summary

The Owner Portal is a dedicated web interface for property owners/investors who have units managed through ORCA. It provides portfolio visibility, financial reporting, document access, and direct communication with the property management company. The landing page (`EnterpriseHome.tsx:808-823`) already advertises this portal to prospects. It must be built.

### Current State: MISREPRESENTED
The marketing page lists these Owner Portal features:
- Portfolio dashboard with real-time valuation
- Contract and lease details
- Financial reports and statements
- Direct communication with management
- Document access and storage

**None of these exist in the codebase.** The only reference to "owner" is the `UserRole` type which includes `'owner'` with permissions `['VIEW']` in `app/context/AuthContext.tsx:17`.

---

## 2. User Personas

### 2.1 Primary: Property Owner / Investor
- Owns 1–50+ units managed by the property company
- Needs visibility into: occupancy, rent collection, expenses, net income
- Expects quarterly/annual financial statements
- Wants to see lease agreements and tenant information
- May have multiple properties across different projects

### 2.2 Secondary: Unit Owner (Single-Unit)
- Owns 1 unit in a multi-unit project
- Wants to see: rent payments received, expenses deducted, net payout
- Expects annual statement for tax purposes
- Simple interface, minimal features

---

## 3. Feature Specification

### 3.1 Dashboard — Owner Home

| Feature | Priority | Description |
|---------|----------|-------------|
| **Portfolio Summary** | P0 | Total units owned, occupied vs vacant, total asset value |
| **Monthly Revenue** | P0 | Rent collected this month, outstanding rent, collection rate |
| **Expense Summary** | P0 | Maintenance costs, management fees, other deductions per unit |
| **Net Income** | P0 | Revenue minus expenses = net payout to owner |
| **Occupancy Rate** | P0 | % of owned units currently rented, lease expiry timeline |
| **Quick Actions** | P1 | Download statement, contact manager, view documents |
| **Notifications** | P1 | Upcoming lease expiries, maintenance updates, payment received |

#### Data Sources (Existing)
| Data Needed | Source Model | Current Status |
|-------------|-------------|----------------|
| Units owned | `Unit` model — needs `ownerId` FK to `User` | **Missing linkage** |
| Occupancy status | `Contract` model (unit status) | Available |
| Rent payments | `PaymentTransaction` model | Available (broken FKs) |
| Expenses | **No expense model exists** | **Missing entirely** |
| Lease details | `Contract` + `RentalLease` models | Available |

### 3.2 Portfolio View — Properties & Units

| Feature | Priority | Description |
|---------|----------|-------------|
| **Property List** | P0 | List of all properties/units owned with status (occupied/vacant/maintenance) |
| **Unit Detail** | P0 | Per-unit: current tenant, lease dates, rent amount, payment history |
| **Tenant Info** | P1 | Tenant name, contact details, lease start/end |
| **Lease Document View** | P1 | View PDF of current lease agreement |
| **Occupancy Timeline** | P2 | Visual timeline showing lease periods per unit |
| **Property Valuation** | P2 | Current estimated value (if available), appreciation tracking |

#### Data Sources (Existing)
| Data Needed | Source Model | Current Status |
|-------------|-------------|----------------|
| Unit details | `Unit` model with `Project` relation | Available |
| Tenant info | `Contract.buyerName`, `RentalLease.tenantName` | Available |
| Lease dates | `RentalLease.startDate`, `RentalLease.endDate` | Available |
| Rent amount | `RentalLease.rentAmount` | Available |
| Contract docs | `Contract` — no document attachment field | **Missing** |
| Valuation history | **No model exists** | **Missing entirely** |

### 3.3 Financial Reports — Owner Statements

| Feature | Priority | Description |
|---------|----------|-------------|
| **Monthly Statement** | P0 | Revenue, expenses, net payout per property/unit |
| **Annual Statement** | P0 | Full year financial summary for tax purposes |
| **Payment History** | P0 | All rent payments received with dates and amounts |
| **Expense Breakdown** | P1 | Maintenance costs, management fees, utilities, taxes |
| **Collection Report** | P1 | Which tenants paid on time vs. late |
| **Download PDF** | P0 | Export statements as PDF |
| **Download Excel** | P1 | Export data as Excel for accountant |

#### Data Sources (Existing)
| Data Needed | Source Model | Current Status |
|-------------|-------------|----------------|
| Rent received | `PaymentTransaction` per invoice | Available (broken FKs) |
| Management fees | **No fee model exists** | **Missing entirely** |
| Maintenance costs | **No maintenance model** | **Missing entirely** |
| PDF generation | **No PDF generation library** | **Missing entirely** |
| Owner payout tracking | **No model exists** | **Missing entirely** |

### 3.4 Document Access — Owner Document Repository

| Feature | Priority | Description |
|---------|----------|-------------|
| **Lease Agreements** | P0 | View/download current and past lease contracts |
| **Financial Statements** | P0 | All generated monthly/annual statements |
| **Tax Documents** | P1 | VAT invoices, tax certificates |
| **Property Documents** | P1 | Title deeds, permits, insurance certificates |
| **Maintenance Reports** | P2 | Completed maintenance work reports |
| **Document Upload** | P2 | Owner uploads documents for management |

#### Data Sources (Existing)
| Data Needed | Source Model | Current Status |
|-------------|-------------|----------------|
| Lease documents | `Contract` — no document URL field | **Missing** |
| Financial statements | Would be generated, not stored | **To be built** |
| Document storage | `app/actions/documents.ts` — JSON file mock | **Needs real storage** |
| Owner-specific docs | **No model exists** | **Missing entirely** |

### 3.5 Communication — Owner ↔ Management

| Feature | Priority | Description |
|---------|----------|-------------|
| **Messages / Inbox** | P0 | Send/receive messages with property manager |
| **Notifications** | P1 | Lease renewal alerts, payment received, maintenance updates |
| **Maintenance Approval** | P2 | Approve/reject maintenance requests that exceed cost threshold |
| **Contact Directory** | P2 | Management team contacts (property manager, accountant) |

#### Data Sources (Existing)
| Data Needed | Source Model | Current Status |
|-------------|-------------|----------------|
| Messaging | **No message model** | **Missing entirely** |
| Notifications | `lib/notifications.ts` — exists, needs owner routing | Partial |
| Contact info | `User` model — needs role filter | Available |

---

## 4. Technical Architecture

### 4.1 New Prisma Models Required

```prisma
model Owner {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String   @map("tenant_id") @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  ownershipPct Decimal? @map("ownership_pct") @db.Decimal(5, 2)
  iban         String?
  nationalId   String?  @map("national_id")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  units        OwnerUnit[]
  payouts      OwnerPayout[]
  messages     OwnerMessage[]
  documents    OwnerDocument[]

  @@unique([tenantId, userId])
  @@map("owners")
}

model OwnerUnit {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId   String   @map("owner_id") @db.Uuid
  unitId    String   @map("unit_id") @db.Uuid
  sharePct  Decimal? @map("share_pct") @db.Decimal(5, 2)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@unique([ownerId, unitId])
  @@map("owner_units")
}

model OwnerPayout {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId      String   @map("owner_id") @db.Uuid
  tenantId     String   @map("tenant_id") @db.Uuid
  period       String
  totalRevenue Decimal  @map("total_revenue") @db.Decimal(15, 2)
  totalExpense Decimal  @map("total_expense") @db.Decimal(15, 2)
  netPayout    Decimal  @map("net_payout") @db.Decimal(15, 2)
  status       String   @default("PENDING")
  paidAt       DateTime? @map("paid_at") @db.Timestamptz
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([ownerId, period])
  @@map("owner_payouts")
}

model OwnerMessage {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId   String   @map("owner_id") @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  senderRole String  @map("sender_role")
  message   String   @db.Text
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([ownerId, createdAt(sort: Desc)])
  @@map("owner_messages")
}

model OwnerDocument {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId   String   @map("owner_id") @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  unitId    String?  @map("unit_id") @db.Uuid
  docType   String   @map("doc_type")
  fileName  String   @map("file_name")
  fileUrl   String   @map("file_url")
  fileSize  Int      @map("file_size")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([ownerId])
  @@map("owner_documents")
}
```

### 4.2 Existing Models Requiring Changes

| Model | Change | Reason |
|-------|--------|--------|
| `Unit` | Add `ownerId` FK (or use `OwnerUnit` junction) | Link units to owners |
| `User` | Add role `OWNER` (already has `'owner'` in AuthContext) | Owner authentication |
| `RentalLease` | Fix `unitId` FK (currently plain String, no relation) | Required for owner-to-unit-to-lease chain |
| `PaymentTransaction` | Fix `invoiceId` + `installmentId` FKs | Required for payment history |

### 4.3 New API Routes Required

```
GET    /api/v1/owner/dashboard          — Portfolio KPI summary
GET    /api/v1/owner/units              — List owned units with status
GET    /api/v1/owner/units/:id          — Unit detail with lease + payment info
GET    /api/v1/owner/financials         — Revenue, expenses, net income by period
GET    /api/v1/owner/payouts            — Payout history
GET    /api/v1/owner/documents          — Document list
GET    /api/v1/owner/documents/:id      — Document download
GET    /api/v1/owner/messages           — Message inbox
POST   /api/v1/owner/messages           — Send message to management
GET    /api/v1/owner/statements/:period — Generate/download statement PDF
```

### 4.4 New Server Actions Required

```
getOwnerDashboardAction()        — Aggregate portfolio KPIs
getOwnerUnitsAction()            — Owned units with occupancy status
getOwnerUnitDetailAction(id)     — Single unit detail
getOwnerFinancialsAction(period) — Period financial data
getOwnerPayoutsAction()          — Payout history
getOwnerDocumentsAction()        — Document list
getOwnerMessagesAction()         — Message inbox
sendOwnerMessageAction(message)  — Send message
generateOwnerStatementAction()   — Generate PDF statement
```

### 4.5 New Pages Required

```
/app/owner/
  page.tsx              — Redirect to portal login
  login/
    page.tsx            — Owner-specific login page
  dashboard/
    page.tsx            — Owner dashboard (KPI cards)
  portfolio/
    page.tsx            — All owned units list
  portfolio/[unitId]/
    page.tsx            — Unit detail
  financials/
    page.tsx            — Financial reports and statements
  documents/
    page.tsx            — Document repository
  messages/
    page.tsx            — Inbox
  settings/
    page.tsx            — Profile, bank details, notifications
```

---

## 5. Data Flow Diagrams

### 5.1 Revenue Calculation for Owner

```
RentalInvoice (paid)
  └─ PaymentTransaction (status=COMPLETED)
      └─ linked via invoiceId (needs FK fix)
          └─ RentalLease
              └─ Unit
                  └─ OwnerUnit (new junction)
                      └─ Owner → net payout = revenue - fees - expenses
```

### 5.2 Owner Authentication Flow

```
Owner credentials → /api/v1/auth/login
  → session.role === 'owner'
    → Redirect to /owner/dashboard
    → Tenant context restricted to owned units only
    → All queries filtered by ownerId
```

### 5.3 Statement Generation Flow

```
Request statement for period (e.g., Q1 2026)
  → Query all RentalInvoices paid in period (filtered by owner units)
  → Query all expenses attributed to owner units (maintenance costs, fees)
  → Calculate: total revenue - total expenses = net payout
  → Generate PDF via puppeteer/html-pdf
  → Store document in OwnerDocument
  → Return download URL
```

---

## 6. Security Requirements

| Requirement | Description |
|-------------|-------------|
| **Owner isolation** | Owners can ONLY see their own units, never cross-tenant/owner data |
| **Tenant-scoped** | All owner queries filtered by `tenantId` + `ownerId` |
| **Read-only default** | Owners have VIEW permissions only (already defined in AuthContext) |
| **Document access control** | Signed URLs for document downloads, not direct file access |
| **Session management** | Separate owner session with restricted route access |
| **Audit logging** | All owner logins, document downloads, and message reads logged |

---

## 7. Integration with Existing Modules

| Existing Module | What Owners Need | Status |
|----------------|-----------------|--------|
| Properties/Units | View owned units, status, tenant info | Needs `OwnerUnit` junction |
| Contracts/Leases | View lease agreements for owned units | Available if FK chain fixed |
| Payments | See rent collected per unit per month | Needs FK fixes + owner filter |
| Accounting | Owner financial statements | Needs expense tracking + payout calc |
| Documents | Store/view owner-specific documents | Needs real file storage |
| Notifications | Lease expiry alerts, payment received | Needs owner routing in `notifications.ts` |
| Reports | Owner-specific report generation | Needs PDF export + owner filtering |

---

## 8. Build Priority & Effort Estimate

| Phase | Features | Effort (Days) |
|-------|----------|---------------|
| **Phase 1: MVP** | Owner auth, portfolio dashboard, unit list with status, payment history (read-only from existing data), basic document view | 15–20 |
| **Phase 2: Financial** | Monthly/annual statements, expense tracking, net payout calculation, PDF export | 10–15 |
| **Phase 3: Communication** | Owner ↔ management messaging, notifications, maintenance visibility | 8–10 |
| **Phase 4: Advanced** | Multi-property portfolio consolidation, property valuation, tax document management, maintenance approval workflow | 10–15 |
| **Total** | | **43–60 days** |

---

## 9. What Exists (Nothing)

| Component | Exists? | Notes |
|-----------|---------|-------|
| Owner pages | No | No `/app/owner/` directory |
| Owner API routes | No | No owner-specific endpoints |
| Owner server actions | No | No owner-specific actions |
| Owner Prisma models | No | No Owner, OwnerUnit, OwnerPayout models |
| Owner auth role | Partial | `'owner'` role defined in AuthContext with `['VIEW']` permissions |
| Owner ↔ Unit link | No | Unit model has no ownerId FK |
| Owner portal UI | No | Only marketing copy in EnterpriseHome.tsx |
| Expense tracking | No | No expense model — needed for owner net payout calc |
| PDF report generation | No | No PDF library integrated |

---

## 10. Dependencies on Other Missing Modules

| Dependency | Module | Impact |
|------------|--------|--------|
| Expense tracking for owner net income | Maintenance module | Without expense data, owner statements are revenue-only (useless) |
| Tenant portal for maintenance requests | Maintenance module | Without maintenance, owners can't see repair costs |
| Real file upload/storage | Documents module | `documents.ts` uses JSON file mock — needs real storage |
| PDF generation | Reports module | No PDF export exists anywhere in ORCA |
| FK fixes in PaymentTransaction | Payments / Accounting | Broken FKs block payment history for owners |

---

## 11. Acceptance Criteria

- [ ] Owner can log in and see only their owned units
- [ ] Dashboard shows real-time occupancy status of all owned units
- [ ] Owner can view lease details for each unit (tenant name, dates, rent)
- [ ] Owner can see payment history per unit with dates and amounts
- [ ] Owner can download a monthly statement as PDF
- [ ] Owner can send/receive messages with property management
- [ ] Owner receives notification when lease is expiring
- [ ] All data is tenant-isolated and owner-isolated
- [ ] Zero cross-owner data leakage
- [ ] Mobile-responsive (owners check from phones)
