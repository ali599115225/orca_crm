# DATABASE ARCHITECTURE REVIEW — ORCA CRM Core Platform

**Date:** 2026-06-09  
**Reviewer:** Principal Database Architect  
**Scope:** All 40 models, relationships, naming, normalization, indexing, query efficiency  

---

## Overall Score: 7.0 / 10

---

## 1. Naming Consistency

| Pattern | Assessment | Issues |
|---------|-----------|--------|
| Model names: `PascalCase` | ✅ Consistent (40/40) | None |
| Table names: `snake_case` via `@@map` | ✅ Consistent (40/40) | None |
| Field names: `camelCase` | ✅ Consistent | None |
| Column names: `snake_case` via `@map` | ⚠️ Partial | 5 fields missing `@map` |
| ID generation: `dbgenerated("gen_random_uuid()")` | ⚠️ Inconsistent | 2 models use `@default(uuid())` instead |

### Fields Missing `@map`

| Model | Field | Column Name (auto) | Issue |
|-------|-------|--------------------|-------|
| `Receipt` | `invoiceId` | `invoiceId` | Should be `invoice_id` |
| `Receipt` | `amount` | `amount` | Should be `amount` (minor) |
| `Receipt` | `paymentMethod` | `paymentMethod` | Should be `payment_method` |
| `Receipt` | `receivedDate` | `receivedDate` | Should be `received_date` |
| `GeneralLedger` | `debit` | `debit` | Should be `debit` (minor) |
| `GeneralLedger` | `credit` | `credit` | Should be `credit` (minor) |

### ID Generation Inconsistency

| Model | ID Generation | 
|-------|--------------|
| 38 models | `@default(dbgenerated("gen_random_uuid()"))` |
| `Receipt` | `@default(uuid())` (Prisma-level) |
| `GeneralLedger` | `@default(uuid())` (Prisma-level) |

**Impact:** `@default(uuid())` generates UUIDs at the application layer, adding latency and preventing DB-level optimizations. These 2 models should be migrated to match the other 38.

---

## 2. Model Boundaries & Normalization

### Well-Normalized Models

| Model | Assessment |
|-------|-----------|
| `Tenant` | ✅ Proper root entity |
| `User` | ✅ Properly scoped to tenant |
| `Lead` | ✅ Good separation of concerns |
| `LeadActivity` | ✅ Proper activity log |
| `Unit` | ✅ Good with project association |
| `JournalEntry`/`JournalLine` | ✅ Proper double-entry design |
| `Account`/`AccountBalance` | ✅ Self-referential hierarchy |
| `ZatcaQueue` | ✅ Proper queue pattern |

### Denormalization & Data Duplication

| Model | Field | Issue | Severity |
|-------|-------|-------|----------|
| `Lead` | `stage`,`score` | Duplicates `status` and `leadScore` functionality | LOW |
| `Project` | `unitsTotal`,`unitsSold`,`unitsBooked` | Cached counts that can drift from actual data | MEDIUM |
| `RentalLease` | `unitName`,`tenantName` | Duplicates data that should be in related models | LOW |
| `Invoice` → `GeneralLedger` | Parallel ledger | Two ledger systems that can diverge | **HIGH** |

### Parallel Ledger Risk (`GeneralLedger` vs `JournalEntry`+`JournalLine`+`AccountBalance`)

The `GeneralLedger` model appears to be a legacy single-entry table. The newer `JournalEntry`+`JournalLine`+`AccountBalance` system is the proper double-entry accounting system. However:

- `Receipt` has a 1:1 relation to `GeneralLedger` but NO relation to `JournalEntry`
- The posting engine (`posting-engine.ts`) writes to `JournalEntry` + `AccountBalance` but NOT to `GeneralLedger`
- Other code paths may still write to `GeneralLedger`

**Risk:** The two systems can diverge. Financial reports could show different balances depending on which system they query.

---

## 3. Missing Constraints

| Constraint | Models Missing | Risk |
|-----------|---------------|------|
| `tenantId` NOT NULL + FK | 0 models (all have it) | ✅ Good |
| Unique on business keys | 5 models missing | MEDIUM |
| Check constraints (e.g., debit >= 0) | All models | MEDIUM |
| Foreign key on FK fields | 8 dangling references | **HIGH** |

### Dangling Foreign Key References (No Prisma Relation)

These fields store IDs that reference other tables but have no Prisma relation or FK constraint:

| Model | Field | Should Reference | Risk |
|-------|-------|-----------------|------|
| `PayrollCommission` | `contractId` | `Contract` | Data integrity |
| `RentalLease` | `unitId` | `Unit` | Orphan records |
| `Receipt` | `invoiceId` | `RentalInvoice` | Unlinked payments |
| `PaymentTransaction` | `invoiceId` | `RentalInvoice` | Unlinked transactions |
| `PaymentTransaction` | `installmentId` | `Installment` | Unlinked transactions |
| `Contact` | `leadId` | `Lead` | Orphan contacts |
| `Opportunity` | `leadId` | `Lead` | Orphan opportunities |
| `Tour` | `leadId`, `assignedTo` | `Lead`, `User` | Orphan tours |
| `AuditLog` | `userId` | `User` | Unlinked audit entries |
| `UserFavorite` | `propertyId` | `Unit` | Weak reference |

---

## 4. Missing Indexes

### Critical Missing Indexes (Affecting Query Performance)

| Table | Recommended Index | Queries Affected | Impact |
|-------|------------------|------------------|--------|
| `tenant` | `subscriptionExpiresAt` | Billing cron (full scan on 1000+ tenants) | **HIGH** |
| `lead` | `(tenantId, status)` | Dashboard pipeline queries | HIGH |
| `lead` | `(assignedTo, status)` | Sales employee workload queries | MEDIUM |
| `lead_activity` | `(leadId, createdAt)` | Lead timeline view | MEDIUM |
| `contact` | `(tenantId, phone)` | Duplicate contact detection | MEDIUM |
| `mansour_chat` | `(tenantId, updatedAt)` | WhatsApp chat listing | MEDIUM |
| `automation_workflows` | `(tenantId, isActive)` | Workflow trigger queries | LOW |
| `followup_sequences` | `(tenantId, isActive)` | Follow-up queries | LOW |
| `telemetry_events` | `(tenantId, eventType)` | Telemetry filtering | LOW |

### Well-Indexed Models (Good Examples)

| Model | Indexes | Rating |
|-------|---------|--------|
| `Unit` | `@@unique([projectId, unitNumber])`, `@@index([projectId])`, `@@index([tenantId])` | ✅ Excellent |
| `Contract` | `@@index([unitId])`, `@@index([tenantId])` | ✅ Good |
| `Installment` | `@@unique([contractId, installmentNumber])`, `@@index([contractId])`, `@@index([dueDate])`, `@@index([tenantId])` | ✅ Excellent |
| `RentalInvoice` | `@@unique([tenantId, invoiceNumber])`, `@@index([leaseId])`, `@@index([tenantId])` | ✅ Good |
| `ZatcaQueue` | `@@index([tenantId, status])`, `@@index([nextRetryAt])` | ✅ Excellent |
| `AccountBalance` | `@@unique([accountId, period, tenantId])`, `@@index([tenantId, period])` | ✅ Excellent |
| `JournalEntry` | `@@unique([tenantId, entryNumber])`, `@@index([tenantId, status])`, `@@index([tenantId, postedAt])` | ✅ Excellent |

### Models With Zero Indexes (CRITICAL)

| Model | Risk | Recommendation |
|-------|------|----------------|
| `LeadActivity` | **HIGH** — Queried by `leadId` in timelines | Add `@@index([leadId, createdAt])` |
| `Contact` | **HIGH** — Queried by `phone` for dedup | Add `@@index([tenantId, phone])` |
| `Opportunity` | **HIGH** — Queried by `leadId` and `status` | Add `@@index([tenantId, status])` |
| `Tour` | **MEDIUM** — Queried by `assignedTo` | Add `@@index([tenantId, assignedTo])` |
| `Offer` | **MEDIUM** — Queried by `linkedOpportunityId` | Add `@@index([linkedOpportunityId])` |
| `MansourChat` | **MEDIUM** — Queried by `leadId` | Add `@@index([leadId, updatedAt])` |
| `AgentTelemetryLog` | **LOW** — Queried by `createdAt` | Already has `@@index([createdAt(sort: Desc)])` ✅ |

---

## 5. N+1 Risk Analysis

| Risk | Location | Severity | Recommendation |
|------|----------|----------|----------------|
| Dashboard metrics fetches ALL leads for in-memory aggregation | `dashboard/metrics/route.ts` | **HIGH** | Use `groupBy` instead of in-memory filtering |
| Billing cron iterates all tenants with individual queries | `cron/billing/route.ts` | **HIGH** | Use batch operations + `Promise.all` with concurrency limit |
| Accounting reports load all rows in memory | `lib/accounting/` multiple files | **HIGH** | Add server-side pagination + `skip`/`take` parameters |
| `getErpStatsAction` runs 7+ sequential aggregates | `actions/accounting.ts` | MEDIUM | Batch into a single raw SQL query |

---

## 6. Large Table Risks

| Table | Projected Size (1000 tenants × 100 records) | Risk |
|-------|----------------------------------------------|------|
| `audit_logs` | ~10M rows/year | **HIGH** — Needs partitioning or archiving strategy |
| `lead_activities` | ~5M rows/year | MEDIUM — Needs index + retention policy |
| `journal_lines` | ~2M rows/year | MEDIUM — Properly indexed |
| `agent_telemetry_logs` | ~10M rows/year | **HIGH** — Needs retention policy |
| `rental_invoices` | ~1M rows/year | LOW — Properly indexed |

---

## Recommendations (Priority Order)

1. **Add missing indexes** on `lead`, `lead_activity`, `contact`, `opportunity`, `tour`, `offer`, `tenant.subscriptionExpiresAt`
2. **Add FK constraints** for all 8 dangling foreign key references
3. **Align `Receipt` and `GeneralLedger`** ID generation with the rest (use `dbgenerated("gen_random_uuid()")`)
4. **Resolve parallel ledger** — Decide: keep `JournalEntry` or `GeneralLedger`, then migrate and drop the other
5. **Add audit log archiving strategy** — Partition by month or implement TTL-based cleanup
6. **Add `@map` annotations** for the 5 fields currently missing them
7. **Add check constraints** for financial fields (`debit >= 0`, `amount > 0`, etc.)

---

## Sign-off

**Database Architecture Verdict:** ✅ SOUND FOUNDATION — Proper multi-tenant design, well-normalized core models, excellent indexing on financial tables. Needs cleanup on dangling FKs, missing indexes, and parallel ledger resolution before scaling beyond 100 tenants.
