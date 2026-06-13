# ORCA — MAINTENANCE MODULE SPECIFICATION

> **Date:** 2026-06-10
> **Author:** Agent 3 — Product & Operations Lead
> **Status:** MISSING (0%) — Full specification for new build

---

## 1. Executive Summary

The Maintenance Module manages the full lifecycle of property maintenance — from tenant-submitted requests through vendor assignment, work scheduling, completion tracking, cost management, and reporting. This is a core capability for any real estate management platform. The landing page (`EnterpriseHome.tsx:983,1013,1046`) already advertises maintenance features to prospects. It must be built.

### Current State: ADVERTISED BUT NON-EXISTENT
The marketing page describes:
- "Integrated maintenance ticket system with status tracking, cost management, and instant notifications"
- "Submit and track maintenance requests" (Tenant Portal)
- "Fully automated maintenance system" (Before/After comparison)

**Nothing exists.** No Prisma models, no API routes, no server actions, no UI components. The word "maintenance" appears only in marketing copy and comments mentioning "Maintenance" as a future feature.

---

## 2. User Personas

### 2.1 Primary: Property Manager / Maintenance Coordinator
- Manages 50–500+ units
- Receives maintenance requests from tenants
- Assigns work to in-house staff or external vendors
- Tracks costs and budgets
- Reports to owners on maintenance expenses

### 2.2 Secondary: Tenant
- Submits maintenance requests via Tenant Portal
- Tracks status of their requests
- Provides access to unit for scheduled work
- Rates completed work

### 2.3 Tertiary: Vendor / Contractor
- Receives work orders
- Updates job status
- Submits invoices for completed work
- Communicates with property management

### 2.4 Quaternary: Property Owner
- Views maintenance costs per unit
- Approves expenses above threshold
- Reviews maintenance reports

---

## 3. Feature Specification

### 3.1 Maintenance Tickets — Core CRUD

| Feature | Priority | Description |
|---------|----------|-------------|
| **Create Ticket** | P0 | From admin dashboard (management-initiated) or tenant portal (tenant-initiated) |
| **Ticket Categories** | P0 | Plumbing, Electrical, HVAC, Structural, Appliance, Pest Control, Cleaning, Painting, Landscaping, Other |
| **Priority Levels** | P0 | Emergency (24h), Urgent (48h), Normal (5 days), Low (14 days), Scheduled (preventive) |
| **Ticket Statuses** | P0 | Submitted → Reviewed → Assigned → Scheduled → In Progress → Completed → Verified → Closed; + Rejected, On Hold |
| **Ticket Detail** | P0 | Full view: description, photos, status timeline, comments, assigned vendor, cost |
| **Edit/Update Ticket** | P1 | Change priority, reassign vendor, update description |
| **Bulk Actions** | P2 | Bulk assign, bulk close, bulk status change |
| **Ticket Linking** | P2 | Link related tickets (e.g., recurring issue) |

### 3.2 Scheduling & Dispatching

| Feature | Priority | Description |
|---------|----------|-------------|
| **Schedule Work** | P0 | Set date/time for maintenance visit |
| **Calendar View** | P1 | Visual calendar showing all scheduled work by vendor/staff |
| **Tenant Availability** | P1 | Tenant provides preferred time slots |
| **Auto-Scheduling** | P2 | AI suggests optimal schedule based on priority, location, vendor availability |
| **Schedule Conflict Detection** | P2 | Warn if double-booking vendor |
| **Recurring Maintenance** | P2 | Schedule preventive maintenance (e.g., AC service every 6 months) |

### 3.3 Vendor Management

| Feature | Priority | Description |
|---------|----------|-------------|
| **Vendor CRUD** | P0 | Add/edit/remove vendors (company name, contact, specialties, rates) |
| **Vendor Categories** | P0 | Which maintenance types each vendor handles |
| **Vendor Assignment** | P0 | Assign vendor to ticket |
| **Vendor Performance** | P1 | Track response time, completion time, tenant ratings |
| **Vendor Pricing** | P1 | Contract rates, per-visit fees, material markup |
| **Vendor Documents** | P2 | Insurance certificates, trade licenses, contracts (with expiry alerts) |
| **Vendor Rating** | P2 | Aggregate rating from completed work |
| **In-House vs External** | P0 | Track if work done by staff or external vendor |

### 3.4 Cost Tracking

| Feature | Priority | Description |
|---------|----------|-------------|
| **Cost Estimate** | P1 | Estimated cost before work begins |
| **Actual Cost** | P0 | Final cost after completion (labor + materials) |
| **Cost Approval** | P0 | Workflow: costs above threshold require management approval |
| **Invoice Upload** | P1 | Vendor uploads invoice for completed work |
| **Expense Attribution** | P0 | Cost linked to specific unit → owner → property |
| **Budget Tracking** | P1 | Monthly/quarterly maintenance budget vs. actual spend |
| **Cost per Unit** | P1 | Track maintenance cost history per unit (for ROI analysis) |
| **Warranty Tracking** | P2 | Link repairs to warranty coverage |

### 3.5 Notifications & Communication

| Feature | Priority | Description |
|---------|----------|-------------|
| **New Request Alert** | P0 | Notify management when tenant submits request |
| **Status Updates to Tenant** | P0 | Auto-notify tenant on status change (assigned, scheduled, completed) |
| **Vendor Assignment Alert** | P0 | Notify vendor when assigned to ticket |
| **SLA Breach Alert** | P1 | Alert if ticket not resolved within priority timeframe |
| **Cost Threshold Alert** | P1 | Alert owner/manager if cost exceeds threshold |
| **Maintenance Digest** | P2 | Weekly summary of all maintenance activity |
| **Comment Notifications** | P1 | Notify relevant parties on new comments |

### 3.6 Tenant Portal Integration (see Tenant Portal Spec)

| Feature | Priority | Description |
|---------|----------|-------------|
| **Submit Request** | P0 | Tenant submits maintenance request with category, description, photos |
| **Request Tracking** | P0 | Tenant views status of all their requests |
| **Schedule Access** | P1 | Tenant confirms availability for scheduled visit |
| **Rate Service** | P2 | Tenant rates completed work (1–5 stars + comments) |
| **View Cost (if applicable)** | P2 | Tenant sees cost breakdown if chargeable to them |

### 3.7 Owner Portal Integration (see Owner Portal Spec)

| Feature | Priority | Description |
|---------|----------|-------------|
| **Maintenance Cost per Unit** | P1 | Owner sees all maintenance costs for their units |
| **Approval Workflow** | P1 | Owner approves expenses above configured threshold |
| **Maintenance Reports** | P2 | Owner receives maintenance summary reports |
| **Cost Trend Analysis** | P2 | Maintenance cost trends over time per property |

### 3.8 Reports & Analytics

| Feature | Priority | Description |
|---------|----------|-------------|
| **Ticket Volume Report** | P1 | Tickets by category, priority, status over time |
| **Vendor Performance Report** | P1 | Average response time, completion time, rating per vendor |
| **Cost Report** | P1 | Total maintenance spend by unit, property, category, period |
| **SLA Compliance Report** | P2 | % of tickets resolved within SLA by priority |
| **Recurring Issues Report** | P2 | Identify units/properties with high repeat-maintenance rate |
| **Preventive Maintenance Schedule** | P2 | Upcoming scheduled preventive maintenance |
| **Export to Excel/PDF** | P1 | Download any report |

---

## 4. Technical Architecture

### 4.1 New Prisma Models Required

```prisma
enum MaintenanceCategory {
  PLUMBING
  ELECTRICAL
  HVAC
  STRUCTURAL
  APPLIANCE
  PEST_CONTROL
  CLEANING
  PAINTING
  LANDSCAPING
  OTHER
}

enum MaintenancePriority {
  EMERGENCY
  URGENT
  NORMAL
  LOW
  SCHEDULED
}

enum MaintenanceStatus {
  SUBMITTED
  REVIEWED
  REJECTED
  ASSIGNED
  SCHEDULED
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  VERIFIED
  CLOSED
}

model MaintenanceTicket {
  id            String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String              @map("tenant_id") @db.Uuid
  unitId        String              @map("unit_id") @db.Uuid
  leaseId       String?             @map("lease_id") @db.Uuid
  submittedBy   String              @map("submitted_by")
  submittedById String?             @map("submitted_by_id") @db.Uuid
  category      MaintenanceCategory
  priority      MaintenancePriority @default(NORMAL)
  title         String
  description   String              @db.Text
  status        MaintenanceStatus   @default(SUBMITTED)
  photos        Json?               @default("[]")

  vendorId      String?             @map("vendor_id") @db.Uuid
  assignedToId  String?             @map("assigned_to_id") @db.Uuid
  scheduledAt   DateTime?           @map("scheduled_at") @db.Timestamptz
  startedAt     DateTime?           @map("started_at") @db.Timestamptz
  completedAt   DateTime?           @map("completed_at") @db.Timestamptz
  verifiedAt    DateTime?           @map("verified_at") @db.Timestamptz
  closedAt      DateTime?           @map("closed_at") @db.Timestamptz

  estimatedCost Decimal?            @map("estimated_cost") @db.Decimal(12, 2)
  actualCost    Decimal?            @map("actual_cost") @db.Decimal(12, 2)
  costApproved  Boolean             @default(false) @map("cost_approved")
  costApproverId String?            @map("cost_approver_id") @db.Uuid
  isChargeable  Boolean             @default(false) @map("is_chargeable")

  resolution    String?             @db.Text
  tenantRating  Int?
  tenantFeedback String?            @map("tenant_feedback") @db.Text

  slaHours      Int?                @map("sla_hours")
  slaBreachedAt DateTime?           @map("sla_breached_at") @db.Timestamptz

  isRecurring   Boolean             @default(false) @map("is_recurring")
  recurringRule String?             @map("recurring_rule")
  parentTicketId String?            @map("parent_ticket_id") @db.Uuid

  createdAt     DateTime            @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime            @default(now()) @updatedAt @map("updated_at") @db.Timestamptz
  createdBy     String?             @map("created_by") @db.Uuid
  updatedBy     String?             @map("updated_by") @db.Uuid

  comments      MaintenanceComment[]
  timeline      MaintenanceTimeline[]

  @@index([tenantId, status])
  @@index([unitId])
  @@index([vendorId, status])
  @@index([status, priority, createdAt(sort: Desc)])
  @@index([scheduledAt])
  @@map("maintenance_tickets")
}

model Vendor {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String   @map("tenant_id") @db.Uuid
  companyName   String   @map("company_name")
  contactName   String   @map("contact_name")
  phone         String
  email         String?
  specialties   String[]
  hourlyRate    Decimal? @map("hourly_rate") @db.Decimal(10, 2)
  isActive      Boolean  @default(true) @map("is_active")
  isInHouse     Boolean  @default(false) @map("is_in_house")
  notes         String?  @db.Text
  documents     Json?    @default("[]")
  avgRating     Float?   @map("avg_rating")
  totalJobs     Int      @default(0) @map("total_jobs")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  tickets       MaintenanceTicket[]

  @@index([tenantId])
  @@index([tenantId, specialties])
  @@map("vendors")
}

model MaintenanceComment {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ticketId   String   @map("ticket_id") @db.Uuid
  authorId   String   @map("author_id") @db.Uuid
  authorRole String   @map("author_role")
  authorName String   @map("author_name")
  message    String   @db.Text
  isInternal Boolean  @default(false) @map("is_internal")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([ticketId, createdAt(sort: Asc)])
  @@map("maintenance_comments")
}

model MaintenanceTimeline {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ticketId  String   @map("ticket_id") @db.Uuid
  event     String
  fromStatus String? @map("from_status")
  toStatus  String?  @map("to_status")
  actorId   String?  @map("actor_id") @db.Uuid
  actorName String?  @map("actor_name")
  details   String?  @db.Text
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([ticketId, createdAt(sort: Desc)])
  @@map("maintenance_timeline")
}

model MaintenanceExpense {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId       String   @map("tenant_id") @db.Uuid
  ticketId       String   @map("ticket_id") @db.Uuid
  unitId         String   @map("unit_id") @db.Uuid
  expenseType    String   @map("expense_type")
  description    String
  amount         Decimal  @db.Decimal(12, 2)
  vendorId       String?  @map("vendor_id") @db.Uuid
  vendorInvoiceUrl String? @map("vendor_invoice_url")
  approvedBy     String?  @map("approved_by") @db.Uuid
  approvedAt     DateTime? @map("approved_at") @db.Timestamptz
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([tenantId, createdAt(sort: Desc)])
  @@index([unitId])
  @@index([ticketId])
  @@map("maintenance_expenses")
}

model MaintenanceSLA {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String              @map("tenant_id") @db.Uuid
  priority        MaintenancePriority
  responseHours   Int                 @map("response_hours")
  resolutionHours Int                 @map("resolution_hours")
  isActive        Boolean             @default(true) @map("is_active")
  createdAt       DateTime            @default(now()) @map("created_at") @db.Timestamptz

  @@unique([tenantId, priority])
  @@map("maintenance_slas")
}
```

### 4.2 Existing Models Requiring Changes

| Model | Change | Reason |
|-------|--------|--------|
| `Unit` | Add `ownerId` FK or junction table (see Owner Portal spec) | Attribute maintenance costs to owner |
| `RentalLease` | Fix `unitId` FK | Link maintenance requests to lease/tenant |
| `Tenant` | Add `maintenanceBudgetMonthly` field | Budget tracking |
| `PaymentTransaction` | Add optional `maintenanceExpenseId` FK | Link payments to maintenance expenses |

### 4.3 New API Routes Required

```
// Admin / Management Routes
GET    /api/v1/maintenance/tickets              — List tickets (filterable by status, priority, category, unit, vendor, date range)
POST   /api/v1/maintenance/tickets              — Create ticket
GET    /api/v1/maintenance/tickets/:id          — Ticket detail with timeline + comments
PUT    /api/v1/maintenance/tickets/:id          — Update ticket
PATCH  /api/v1/maintenance/tickets/:id/status   — Update status (with timeline entry)
POST   /api/v1/maintenance/tickets/:id/assign   — Assign vendor
POST   /api/v1/maintenance/tickets/:id/schedule — Schedule visit
POST   /api/v1/maintenance/tickets/:id/complete — Complete work
POST   /api/v1/maintenance/tickets/:id/verify   — Verify completion
POST   /api/v1/maintenance/tickets/:id/close    — Close ticket

// Comments
POST   /api/v1/maintenance/tickets/:id/comments — Add comment
GET    /api/v1/maintenance/tickets/:id/comments — List comments

// Vendors
GET    /api/v1/maintenance/vendors              — List vendors
POST   /api/v1/maintenance/vendors              — Create vendor
GET    /api/v1/maintenance/vendors/:id          — Vendor detail + performance
PUT    /api/v1/maintenance/vendors/:id          — Update vendor
DELETE /api/v1/maintenance/vendors/:id          — Deactivate vendor
GET    /api/v1/maintenance/vendors/:id/performance — Performance stats

// Expenses
GET    /api/v1/maintenance/expenses             — List expenses (filterable)
POST   /api/v1/maintenance/expenses             — Record expense
GET    /api/v1/maintenance/expenses/:id         — Expense detail
PUT    /api/v1/maintenance/expenses/:id         — Update expense
POST   /api/v1/maintenance/expenses/:id/approve — Approve expense

// Reports
GET    /api/v1/maintenance/reports/summary      — Summary stats (open, completed, costs)
GET    /api/v1/maintenance/reports/by-unit      — Cost per unit report
GET    /api/v1/maintenance/reports/by-vendor    — Vendor performance report
GET    /api/v1/maintenance/reports/sla          — SLA compliance report

// SLA Configuration
GET    /api/v1/maintenance/slas                 — Get SLA rules
PUT    /api/v1/maintenance/slas                 — Update SLA rules

// Calendar
GET    /api/v1/maintenance/calendar             — Scheduled work for date range
```

### 4.4 New Server Actions Required

```
// Core Ticket Actions
getMaintenanceTicketsAction(filters)
getMaintenanceTicketDetailAction(id)
createMaintenanceTicketAction(formData)
updateMaintenanceTicketAction(id, data)
updateTicketStatusAction(id, newStatus, notes)
assignVendorAction(ticketId, vendorId)
scheduleMaintenanceAction(ticketId, dateTime)
completeMaintenanceAction(ticketId, actualCost, resolution)
verifyMaintenanceAction(ticketId)
closeMaintenanceAction(ticketId)
rejectMaintenanceAction(ticketId, reason)

// Vendor Actions
getVendorsAction()
createVendorAction(formData)
updateVendorAction(id, data)
getVendorPerformanceAction(id)

// Comment Actions
addCommentAction(ticketId, message, isInternal)

// Expense Actions
getExpensesAction(filters)
createExpenseAction(ticketId, expenseData)
approveExpenseAction(expenseId)

// Report Actions
getMaintenanceSummaryAction(period)
generateMaintenanceReportAction(type, params)

// SLA Actions
getSlaRulesAction()
updateSlaRulesAction(data)

// Calendar Actions
getMaintenanceCalendarAction(startDate, endDate)
```

### 4.5 New Pages Required

```
/app/operations/maintenance/
  page.tsx                          — Maintenance dashboard (stats, recent tickets, calendar widget)
  tickets/
    page.tsx                        — Ticket list with filters (status, priority, category, unit, vendor)
  tickets/[ticketId]/
    page.tsx                        — Ticket detail (timeline, comments, assignment, cost)
  tickets/new/
    page.tsx                        — Create ticket form
  vendors/
    page.tsx                        — Vendor list
  vendors/[vendorId]/
    page.tsx                        — Vendor detail (performance, assigned tickets)
  vendors/new/
    page.tsx                        — Add vendor form
  calendar/
    page.tsx                        — Maintenance calendar view
  reports/
    page.tsx                        — Reports and analytics
  settings/
    page.tsx                        — SLA config, categories, notification preferences
  expenses/
    page.tsx                        — Expense list and approval queue
```

---

## 5. Data Flow Diagrams

### 5.1 Ticket Lifecycle

```
CREATION
  Tenant submits (via Tenant Portal) → status=SUBMITTED
    OR
  Management creates (via admin dashboard) → status=REVIEWED

TRIAGE
  [SUBMITTED] → Manager reviews → status=REVIEWED
    → May reject → status=REJECTED (with reason)
    → May set priority/category

ASSIGNMENT
  [REVIEWED] → Manager assigns vendor/in-house staff → status=ASSIGNED
    → May need cost estimate → estimatedCost populated

SCHEDULING
  [ASSIGNED] → Manager/Vendor schedules visit → status=SCHEDULED, scheduledAt set

EXECUTION
  [SCHEDULED] → Work begins → status=IN_PROGRESS, startedAt set
    → May be put on hold → status=ON_HOLD

COMPLETION
  [IN_PROGRESS] → Work done → status=COMPLETED, completedAt set, actualCost populated
    → Resolution notes and before/after photos added

VERIFICATION
  [COMPLETED] → Manager verifies quality → status=VERIFIED
    → Tenant rates work (optional)

CLOSURE
  [VERIFIED] → Ticket archived → status=CLOSED, closedAt set
```

### 5.2 Cost Approval Flow

```
Vendor provides cost estimate → estimatedCost set on ticket
  IF estimatedCost > tenant's maintenance approval threshold:
    → status=ASSIGNED (awaiting approval)
      → Notification to Owner/Manager
        → Owner/Manager approves → costApproved=true
          → Work proceeds
        → Owner/Manager rejects → ticket re-evaluated
  ELSE:
    → Auto-approved → costApproved=true
      → Work proceeds

After completion:
  → actualCost recorded in MaintenanceExpense
    → Expense linked to unit → property → owner
      → Included in owner financial statement
```

### 5.3 SLA Calculation

```
On ticket creation:
  → Look up MaintenanceSLA for {tenantId, priority}
    → Set slaHours = responseHours + resolutionHours
      → slaDueAt = createdAt + slaHours

Cron job (hourly):
  → Find tickets WHERE
      status NOT IN (COMPLETED, VERIFIED, CLOSED)
      AND slaDueAt < now()
      AND slaBreachedAt IS NULL
    → Set slaBreachedAt = now()
      → Trigger alert to management
      → Log in MaintenanceTimeline
```

---

## 6. Notification Rules

| Event | Recipient | Channel |
|-------|-----------|---------|
| New ticket submitted by tenant | Property Manager | In-app + Email |
| Ticket status changed | Tenant (if tenant-submitted) | In-app (Tenant Portal) |
| Vendor assigned to ticket | Assigned Vendor | Email |
| Maintenance visit scheduled | Tenant + Vendor | In-app + Email |
| SLA breached | Property Manager | In-app + Email (urgent) |
| Cost estimate exceeds threshold | Owner / Senior Manager | Email + In-app |
| Work completed | Tenant | In-app + Email |
| Tenant rates work | Property Manager | In-app |
| Expense approved/rejected | Submitter | In-app + Email |

---

## 7. Security Requirements

| Requirement | Description |
|-------------|-------------|
| **Tenant isolation** | Tenants can only see their own tickets |
| **Vendor isolation** | Vendors can only see tickets assigned to them |
| **Unit-to-tenant validation** | Tenant can only submit tickets for their leased unit |
| **Cost approval gates** | Expenses above threshold require explicit approval |
| **Photo upload validation** | File type whitelist (jpg, png, webp), max 10MB per photo, max 5 photos per ticket |
| **Audit logging** | Every status change, assignment, cost entry, and comment logged in MaintenanceTimeline |
| **Tenant-scoped queries** | All queries filtered by tenantId |

---

## 8. Integration with Existing Modules

| Existing Module | Integration Point | Status |
|----------------|------------------|--------|
| Units | Link ticket to unit | Available |
| RentalLeases | Link ticket to lease (for tenant context) | Available (FK fix needed) |
| Notifications | `lib/notifications.ts` — needs maintenance event types added | Partial |
| Documents | Photo upload on tickets — needs real file storage | Mock (needs rebuild) |
| Accounting | Maintenance expenses → Journal Entry (debit expense, credit cash/AP) | Available (posting engine) |
| Dashboard | Maintenance KPI cards on operations dashboard | Needs new cards |
| Reports | Maintenance reports section | Needs new report generators |
| Email | `lib/email.ts` — already has `sendAdminEmailAlert` | Available |
| Tenant Portal | Submit/view maintenance requests | Needs building (see Tenant Portal spec) |
| Owner Portal | View maintenance costs per unit | Needs building (see Owner Portal spec) |

---

## 9. Build Priority & Effort Estimate

| Phase | Features | Effort (Days) |
|-------|----------|---------------|
| **Phase 1: Core** | Ticket CRUD, status workflow, vendor CRUD, ticket-vendor assignment, basic list/detail views, pruning of MaintenanceTicket + Vendor + MaintenanceTimeline models | 12–18 |
| **Phase 2: Operations** | Scheduling/calendar, cost tracking (estimates + actuals), SLA rules & breach detection, comments, photo upload, in-app notifications | 10–15 |
| **Phase 3: Tenant Portals** | Tenant Portal: submit/view/track requests (see Tenant Portal spec); Owner Portal: cost visibility (see Owner Portal spec); email notifications to all parties | 8–12 |
| **Phase 4: Advanced** | Recurring/preventive maintenance, vendor performance analytics, expense approval workflow, cost reports, budget tracking, bulk operations | 10–15 |
| **Phase 5: Polish** | Calendar view with drag-drop, vendor mobile access, AI ticket categorization, WhatsApp notifications, advanced SLA dashboards | 10–15 |
| **Total** | | **50–75 days** |

---

## 10. What Exists (Nothing)

| Component | Exists? | Notes |
|-----------|---------|-------|
| Maintenance pages | No | No `/app/operations/maintenance/` directory |
| Maintenance API routes | No | No maintenance endpoints |
| Maintenance server actions | No | No maintenance actions |
| Maintenance Prisma models | No | No MaintenanceTicket, Vendor, or MaintenanceExpense models |
| Tenant maintenance flow | No | Tenant Portal doesn't exist |
| Owner maintenance visibility | No | Owner Portal doesn't exist |
| Maintenance notifications | No | `notifications.ts` has no maintenance event types |
| Maintenance reports | No | No report generators for maintenance |
| Vendor management | No | No vendor model or UI |
| SLA tracking | No | No SLA model or breach detection |
| Cost tracking | No | No expense attribution to units |
| Calendar/scheduling | No | No maintenance calendar view |
| Photo upload for tickets | No | `documents.ts` mock needs real storage |
| Recurring maintenance | No | No model for recurring rules |

---

## 11. Dependencies on Other Missing Modules

| Dependency | Module | Impact |
|------------|--------|--------|
| Tenant Portal | Tenant Portal | Tenants need portal to submit maintenance requests |
| Owner Portal | Owner Portal | Owners need portal to see maintenance costs and approve expenses |
| Real file upload | Documents | Photo upload on tickets requires real storage |
| PDF generation | Reports | Maintenance reports need PDF export |
| WhatsApp integration | WhatsApp | WhatsApp notifications for maintenance updates |
| Accounting posting engine | Accounting | Maintenance expenses need to create journal entries |

---

## 12. Acceptance Criteria

- [ ] Property manager can create, view, edit, and close maintenance tickets
- [ ] Ticket supports full status lifecycle: Submitted → Reviewed → Assigned → Scheduled → In Progress → Completed → Verified → Closed
- [ ] Tickets can be filtered by status, priority, category, unit, vendor, and date range
- [ ] Vendors can be added, edited, assigned to tickets, and deactivated
- [ ] Each ticket has a timeline showing every status change with timestamp and actor
- [ ] Comments can be added to tickets (public to tenant or internal only)
- [ ] Photos can be attached to tickets (up to 5 photos, validated file types and sizes)
- [ ] Estimated and actual costs are tracked per ticket
- [ ] Expenses above configurable threshold require approval
- [ ] Expenses are attributed to unit → property → owner
- [ ] SLA rules are configurable per priority level
- [ ] SLA breaches trigger alerts to management
- [ ] Maintenance calendar shows scheduled visits by vendor
- [ ] Tenants can submit and track their own maintenance requests (requires Tenant Portal)
- [ ] Owners can view maintenance costs for their units (requires Owner Portal)
- [ ] All status changes, assignments, and cost entries are audit-logged
- [ ] Mobile-responsive for vendor field access
- [ ] Arabic-first interface with English option
