# ORCA — TENANT PORTAL SPECIFICATION

> **Date:** 2026-06-10
> **Author:** Agent 3 — Product & Operations Lead
> **Status:** MISSING (0%) — Full specification for new build

---

## 1. Executive Summary

The Tenant Portal is a self-service web interface for tenants who rent units managed through ORCA. It enables tenants to view their lease, pay rent online, submit maintenance requests, communicate with management, and access documents. The landing page (`EnterpriseHome.tsx:821-823`) already advertises this portal. It must be built.

### Current State: MISREPRESENTED
The marketing page lists these Tenant Portal features:
- View lease and contract details
- Online rent payment
- Submit and track maintenance requests
- Direct communication with property management
- Document access (lease, receipts, payment history)

**None of these exist in the codebase.** There is no tenant-facing interface, no tenant authentication flow, and no tenant-specific API.

---

## 2. User Personas

### 2.1 Primary: Residential Tenant
- Renting an apartment or villa
- Primary needs: pay rent, submit maintenance requests, view lease
- Tech comfort: moderate (uses smartphone primarily)
- Language: Arabic primary, English secondary

### 2.2 Secondary: Commercial Tenant
- Renting office/retail space
- Primary needs: payment history for accounting, lease document access, multi-unit management
- Tech comfort: moderate to high

---

## 3. Feature Specification

### 3.1 Dashboard — Tenant Home

| Feature | Priority | Description |
|---------|----------|-------------|
| **Next Payment Due** | P0 | Amount due, due date, pay now button |
| **Payment Status** | P0 | Current: paid / pending / overdue |
| **Lease Summary** | P0 | Unit name, lease start/end dates, monthly rent |
| **Open Maintenance Requests** | P0 | Count of open tickets with status |
| **Recent Activity** | P1 | Last payment, last message, last maintenance update |
| **Quick Actions** | P0 | Pay rent, submit maintenance, view lease, message management |
| **Notifications** | P1 | Rent due reminder, maintenance update, lease renewal notice |

#### Data Sources (Existing)
| Data Needed | Source Model | Current Status |
|-------------|-------------|----------------|
| Lease info | `RentalLease` model | Available |
| Payment status | `RentalInvoice` status field | Available |
| Next payment | `Installment` or `RentalInvoice` | Available (broken FKs) |
| Maintenance requests | **No maintenance model** | **Missing entirely** |
| Tenant auth | **No tenant user model** | **Missing entirely** |

### 3.2 Lease View — My Lease

| Feature | Priority | Description |
|---------|----------|-------------|
| **Lease Details** | P0 | Property name/address, unit number, monthly rent, deposit |
| **Lease Period** | P0 | Start date, end date, remaining months |
| **Lease Document** | P0 | View/download signed lease agreement PDF |
| **Terms & Conditions** | P1 | Key lease terms (notice period, renewal terms, rules) |
| **Property Details** | P1 | Unit specs (beds, area, amenities) |
| **Property Photos** | P2 | Photos of the unit (if available) |

#### Data Sources (Existing)
| Data Needed | Source Model | Current Status |
|-------------|-------------|----------------|
| Lease details | `RentalLease` model fields | Available |
| Unit info | `Unit` model via `RentalLease.unitId` | Available (broken FK) |
| Project info | `Project` model via `Unit.projectId` | Available |
| Lease document PDF | **No PDF generation** | **Missing entirely** |
| Unit photos | `Unit.media` (JSON) — no upload capability | **Missing** |

### 3.3 Payments — Pay Rent

| Feature | Priority | Description |
|---------|----------|-------------|
| **Pay Rent** | P0 | Online payment via Moyasar (card, Apple Pay, STC Pay) |
| **Payment History** | P0 | All past payments with date, amount, method, receipt |
| **Upcoming Payments** | P0 | Schedule of future payments with due dates |
| **Payment Receipt** | P0 | Download/print receipt for each payment |
| **Auto-Pay Setup** | P2 | Recurring payment authorization |
| **Partial Payment** | P2 | Pay partial amount (if allowed by lease) |
| **Late Fee Display** | P2 | Show late payment penalties (if applicable) |

#### Data Sources (Existing)
| Data Needed | Source Model | Current Status |
|-------------|-------------|----------------|
| Invoices | `RentalInvoice` model | Available |
| Payment transactions | `PaymentTransaction` model | Available (broken FKs) |
| Payment gateway | Moyasar integration | Partial (hardcoded API key) |
| Receipts | `Receipt` model | Available (unused in tenant flow) |
| Installment schedule | `Installment` model | Available (sales contracts, not rental) |
| Late fees | **No model exists** | **Missing entirely** |

### 3.4 Maintenance Requests

| Feature | Priority | Description |
|---------|----------|-------------|
| **Submit Request** | P0 | Create maintenance ticket (category, description, urgency, photos) |
| **Request Status** | P0 | Track status: submitted → in-progress → completed |
| **Request History** | P0 | All past maintenance requests with resolution details |
| **Upload Photos** | P1 | Attach photos of the issue |
| **Schedule Visit** | P1 | View scheduled maintenance visit date/time |
| **Rate Service** | P2 | Rate completed maintenance work |
| **Emergency Contact** | P1 | Display emergency maintenance phone number |

#### Data Sources (Existing)
| Data Needed | Source Model | Current Status |
|-------------|-------------|----------------|
| Maintenance tickets | **No maintenance model** | **Missing entirely** |
| Photo upload | `documents.ts` — JSON mock | **Needs real storage** |
| Service ratings | **No model exists** | **Missing entirely** |
| Vendor assignment | **No vendor model** | **Missing entirely** |

### 3.5 Communication — Messages

| Feature | Priority | Description |
|---------|----------|-------------|
| **Message Management** | P0 | Send/receive messages with property management |
| **Message History** | P0 | Threaded conversation view |
| **File Attachments** | P2 | Send documents/photos in messages |
| **Read Receipts** | P2 | See when management has read your message |
| **WhatsApp Integration** | P2 | Option to receive messages via WhatsApp |

#### Data Sources (Existing)
| Data Needed | Source Model | Current Status |
|-------------|-------------|----------------|
| Tenant messaging | **No tenant-message model** | **Missing entirely** |
| WhatsApp | `app/actions/whatsapp.ts` — mock | **Needs real integration** |

### 3.6 Documents — My Documents

| Feature | Priority | Description |
|---------|----------|-------------|
| **Lease Agreement** | P0 | View/download signed lease PDF |
| **Payment Receipts** | P0 | All payment receipts in one place |
| **Tax Invoices** | P1 | VAT-compliant invoices (ZATCA) |
| **Maintenance Reports** | P2 | Completed maintenance work reports |
| **Move-In Checklist** | P2 | Signed move-in condition report |
| **Community Rules** | P2 | Building/community regulations |

#### Data Sources (Existing)
| Data Needed | Source Model | Current Status |
|-------------|-------------|----------------|
| Lease PDF | **No PDF generation** | **Missing entirely** |
| Receipts | `Receipt` model — no PDF gen | **Missing** |
| Tax invoices | `RentalInvoice` with ZATCA fields | Available (ECDSA signing mock) |
| Maintenance reports | **No maintenance model** | **Missing entirely** |

---

## 4. Technical Architecture

### 4.1 New Prisma Models Required

```prisma
model TenantPortalUser {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String   @map("tenant_id") @db.Uuid
  leaseId      String   @map("lease_id") @db.Uuid
  email        String   @unique
  phone        String
  passwordHash String   @map("password_hash")
  name         String
  isActive     Boolean  @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at") @db.Timestamptz
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  maintenanceRequests MaintenanceRequest[]
  tenantMessages      TenantMessage[]

  @@index([tenantId])
  @@index([leaseId])
  @@map("tenant_portal_users")
}

model MaintenanceRequest {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String   @map("tenant_id") @db.Uuid
  tenantUserId String   @map("tenant_user_id") @db.Uuid
  unitId       String   @map("unit_id") @db.Uuid
  leaseId      String   @map("lease_id") @db.Uuid
  category     String
  priority     String   @default("NORMAL")
  title        String
  description  String   @db.Text
  status       String   @default("SUBMITTED")
  photos       Json?    @default("[]")
  scheduledAt  DateTime? @map("scheduled_at") @db.Timestamptz
  completedAt  DateTime? @map("completed_at") @db.Timestamptz
  resolution   String?  @db.Text
  cost         Decimal? @db.Decimal(12, 2)
  vendorId     String?  @map("vendor_id") @db.Uuid
  rating       Int?
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  comments     MaintenanceComment[]

  @@index([tenantUserId, status])
  @@index([unitId])
  @@index([status, createdAt(sort: Desc)])
  @@map("maintenance_requests")
}

model MaintenanceComment {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  requestId   String   @map("request_id") @db.Uuid
  authorRole  String   @map("author_role")
  message     String   @db.Text
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([requestId, createdAt(sort: Asc)])
  @@map("maintenance_comments")
}

model TenantMessage {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String   @map("tenant_id") @db.Uuid
  tenantUserId String   @map("tenant_user_id") @db.Uuid
  senderRole   String   @map("sender_role")
  message      String   @db.Text
  isRead        Boolean  @default(false) @map("is_read")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([tenantUserId, createdAt(sort: Desc)])
  @@map("tenant_messages")
}
```

### 4.2 Existing Models Requiring Changes

| Model | Change | Reason |
|-------|--------|--------|
| `RentalLease` | Fix `unitId` FK (currently plain String, no relation) | Required for tenant-to-unit navigation |
| `RentalInvoice` | Add `tenantPortalUserId` FK | Link invoices to portal users |
| `PaymentTransaction` | Fix `invoiceId` + `installmentId` FKs | Required for payment history |
| `Receipt` | Fix `invoiceId` FK | Required for receipt display |
| `Unit` | Add `address` or `full address` fields | Tenant needs property address |

### 4.3 New API Routes Required

```
POST   /api/v1/tenant/auth/login         — Tenant login
POST   /api/v1/tenant/auth/reset-password — Password reset
GET    /api/v1/tenant/dashboard           — Dashboard summary data
GET    /api/v1/tenant/lease               — Current lease details
GET    /api/v1/tenant/payments            — Payment history
GET    /api/v1/tenant/payments/upcoming   — Upcoming payments schedule
POST   /api/v1/tenant/payments/pay        — Initiate payment
GET    /api/v1/tenant/payments/:id/receipt— Download receipt
GET    /api/v1/tenant/maintenance         — List maintenance requests
POST   /api/v1/tenant/maintenance         — Create maintenance request
GET    /api/v1/tenant/maintenance/:id     — Request detail + comments
POST   /api/v1/tenant/maintenance/:id/comment — Add comment
POST   /api/v1/tenant/maintenance/:id/rate — Rate completed work
GET    /api/v1/tenant/messages            — Message inbox
POST   /api/v1/tenant/messages            — Send message
GET    /api/v1/tenant/documents           — Document list
GET    /api/v1/tenant/documents/:id       — Document download
PUT    /api/v1/tenant/profile             — Update profile
```

### 4.4 New Server Actions Required

```
tenantLoginAction(email, password)
getTenantDashboardAction()
getTenantLeaseAction()
getTenantPaymentsAction()
initiateTenantPaymentAction(invoiceId, amount)
getTenantMaintenanceRequestsAction()
createMaintenanceRequestAction(formData)
getMaintenanceRequestDetailAction(id)
addMaintenanceCommentAction(requestId, message)
getTenantMessagesAction()
sendTenantMessageAction(message)
getTenantDocumentsAction()
updateTenantProfileAction(formData)
```

### 4.5 New Pages Required

```
/app/tenant/
  page.tsx              — Redirect to login
  login/
    page.tsx            — Tenant login (tenant subdomain or invite code)
  dashboard/
    page.tsx            — Tenant dashboard
  lease/
    page.tsx            — Lease details + document
  payments/
    page.tsx            — Payment history + pay now
  payments/[invoiceId]/
    page.tsx            — Payment detail + receipt
  maintenance/
    page.tsx            — Maintenance request list
  maintenance/new/
    page.tsx            — Create maintenance request
  maintenance/[requestId]/
    page.tsx            — Request detail + status + comments
  messages/
    page.tsx            — Message inbox
  documents/
    page.tsx            — Document repository
  profile/
    page.tsx            — Profile settings
```

---

## 5. Data Flow Diagrams

### 5.1 Tenant Onboarding Flow

```
Property manager creates RentalLease for tenant
  → System auto-generates TenantPortalUser invitation
    → Email sent to tenant with setup link
      → Tenant sets password
        → Tenant logs in → /tenant/dashboard
          → System scopes all data to leaseId
```

### 5.2 Rent Payment Flow

```
Tenant clicks "Pay Now" on dashboard
  → GET /api/v1/tenant/payments/upcoming
    → Returns unpaid invoices with secure payment tokens
      → Tenant selects invoice, clicks pay
        → POST /api/v1/tenant/payments/pay { invoiceId, amount }
          → Server calls Moyasar API with payment details
            → Redirect to Moyasar payment page
              → Payment complete → Moyasar callback
                → Server marks invoice as paid
                  → Creates PaymentTransaction + Receipt
                    → Redirects tenant to confirmation page
                      → Shows receipt download
```

### 5.3 Maintenance Request Flow

```
Tenant submits maintenance request (category, description, photos)
  → POST /api/v1/tenant/maintenance
    → Creates MaintenanceRequest (status=SUBMITTED)
      → Notifies property management (dashboard notification + email)
        → Management reviews, assigns vendor, schedules visit
          → Status → SCHEDULED (tenant notified)
            → Vendor completes work
              → Status → COMPLETED (tenant notified)
                → Tenant rates service (optional)
```

---

## 6. Security Requirements

| Requirement | Description |
|-------------|-------------|
| **Tenant isolation** | Tenant can ONLY see their own lease, not other tenants' data |
| **Lease-scoped queries** | All data filtered by `leaseId` from session |
| **Payment token security** | Each invoice has unique `securePaymentToken` (UUID) — already exists |
| **No cross-tenant access** | `tenantId` filter on every query |
| **Password hashing** | bcrypt/scrypt (same as existing User model) |
| **Rate limiting** | Bruteforce protection on login (reuse existing rate limiter) |
| **Session timeout** | Auto-logout after inactivity |
| **Photo upload validation** | File type, size, and malware scan for maintenance photos |
| **Audit logging** | All logins, payments, and maintenance requests logged |

---

## 7. Integration with Existing Modules

| Existing Module | What Tenants Need | Status |
|----------------|-----------------|--------|
| RentalLeases | View current lease | Available (FK fix needed) |
| RentalInvoices | Pay rent, view payment history | Available (FK fix needed) |
| Payment/Moyasar | Online rent payment | Partial (hardcoded API key) |
| ZATCA | VAT-compliant invoices with QR | Partial (ECDSA signing mock) |
| Documents | Upload/download lease docs, receipts | Mock (needs real storage) |
| Notifications | Payment reminders, maintenance updates | Needs tenant routing |
| WhatsApp | Optional WhatsApp notifications | Mock (needs real integration) |
| Units | Property details, photos | Available (no photo upload) |

---

## 8. Build Priority & Effort Estimate

| Phase | Features | Effort (Days) |
|-------|----------|---------------|
| **Phase 1: MVP** | Tenant auth (login/invite), lease view, payment history, basic dashboard | 10–15 |
| **Phase 2: Payments** | Online rent payment via Moyasar, payment receipts, upcoming payments schedule | 8–12 |
| **Phase 3: Maintenance** | Submit maintenance requests, track status, photo upload, status notifications | 10–15 |
| **Phase 4: Communication** | Tenant ↔ management messaging, document access, profile management | 8–10 |
| **Phase 5: Polish** | WhatsApp integration, auto-pay, tenant satisfaction surveys, mobile-responsive optimization | 8–12 |
| **Total** | | **44–64 days** |

---

## 9. What Exists (Nothing)

| Component | Exists? | Notes |
|-----------|---------|-------|
| Tenant pages | No | No `/app/tenant/` directory |
| Tenant API routes | No | No tenant-specific endpoints |
| Tenant server actions | No | No tenant-specific actions |
| Tenant Prisma models | No | No TenantPortalUser or MaintenanceRequest models |
| Tenant auth | No | No tenant login flow |
| Rental lease data | Yes | `RentalLease` + `RentalInvoice` models exist |
| Payment gateway | Partial | Moyasar integrated but API key hardcoded |
| Documents storage | Mock | `documents.ts` uses JSON mock |
| Tenant role in AuthContext | No | Only 'owner' exists, no 'tenant' role |

---

## 10. Dependencies on Other Missing Modules

| Dependency | Module | Impact |
|------------|--------|--------|
| Maintenance module for tenant repair requests | Maintenance | Core tenant portal feature blocked |
| Real payment gateway for rent collection | Payments | Payment feature blocked |
| Real document storage for lease/receipts | Documents | Document access feature blocked |
| PDF generation for receipts/statements | Reports | Receipt download blocked |
| WhatsApp integration for tenant notifications | WhatsApp | WhatsApp notification option blocked |
| FK fixes in RentalLease/PaymentTransaction | Database | Multiple data views blocked |

---

## 11. Acceptance Criteria

- [ ] Tenant receives invitation email when lease is created
- [ ] Tenant can set password and log in
- [ ] Dashboard shows lease summary, next payment due, open maintenance requests
- [ ] Tenant can view full lease details including terms and property info
- [ ] Tenant can see payment history with dates, amounts, and status
- [ ] Tenant can pay rent online via card/STC Pay
- [ ] Tenant receives payment receipt after successful payment
- [ ] Tenant can submit maintenance requests with category, description, photos
- [ ] Tenant can track maintenance request status (submitted → scheduled → completed)
- [ ] Tenant can send/receive messages with property management
- [ ] Tenant can view/download lease document and payment receipts
- [ ] All data is tenant-isolated (can only see own lease)
- [ ] Mobile-responsive for smartphone use
- [ ] Arabic-first interface with English option
