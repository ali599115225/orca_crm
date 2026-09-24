# PRISMA SCHEMA AUDIT — ORCA CRM Core Platform

**Date:** 2026-06-09  
**Reviewer:** Principal Database Architect  
**Scope:** Relations, foreign keys, cascades, unique constraints, composite indexes  

---

## Overall Score: 7.5 / 10

---

## 1. Relations Audit

### 1:1 Relations (3 total)

| Model A | Model B | Direction | Cascade | Safe? |
|---------|---------|-----------|---------|-------|
| `Unit` | `Contract` | Unit ← Contract (Contract.unitId unique) | `Restrict` on Unit delete | ✅ Prevents accidental unit deletion with active contract |
| `AgentSlot` | `UsageMeter` | AgentSlot ← UsageMeter | `SetNull` on AgentSlot delete | ⚠️ Nullable — OK |
| `Receipt` | `GeneralLedger` | Receipt ← GL (GL.receiptId unique) | `NoAction` (default, neither side specifies) | ⚠️ Danger — referential action defaults to `NoAction`, which prevents deletion of either |

### 1:N Relations

All 1:N relations properly cascade from parent to child (`onDelete: Cascade`). Exceptions:

| Parent | Child | Cascade | Issue |
|--------|-------|---------|-------|
| `Account` | `JournalLine` | `NoAction` (default) | ⚠️ Cannot delete an account that has journal lines |
| `Account` | `AccountBalance` | `Cascade` | ✅ OK |
| `User` | `FailedLoginAttempt` | None (no relation defined) | ⚠️ Orphan records if user is deleted |

---

## 2. Foreign Key Analysis

### Proper FK Relations (with Prisma `@relation`)

32 relations properly defined with `@relation`, `fields`, `references`, and `onDelete`.

### Missing FK Relations (8 fields with no Prisma relation)

| Field | Type | Should Reference | Risk |
|-------|------|-----------------|------|
| `PayrollCommission.contractId` | `String` (no Uuid) | `Contract` | Data type mismatch — cannot add FK |
| `RentalLease.unitId` | `String? @db.Uuid` | `Unit` | No constraint |
| `Receipt.invoiceId` | `String` (no Uuid) | `RentalInvoice` | Data type + no constraint |
| `PaymentTransaction.invoiceId` | `String?` | `RentalInvoice` | No constraint |
| `PaymentTransaction.installmentId` | `String?` | `Installment` | No constraint |
| `Contact.leadId` | `String? @db.Uuid` | `Lead` | No constraint |
| `Opportunity.leadId` | `String @db.Uuid` | `Lead` | No constraint — **NOT NULL** so every opportunity must have a leadId |
| `Tour.leadId` | `String @db.Uuid` | `Lead` | No constraint — **NOT NULL** |
| `Tour.assignedTo` | `String @db.Uuid` | `User` | No constraint — **NOT NULL** |
| `AuditLog.userId` | `String? @db.Uuid` | `User` | No constraint |
| `UserFavorite.propertyId` | `String` (no Uuid) | `Unit` | Data type mismatch |
| `FailedLoginAttempt.userId` | `String @db.Uuid` | `User` | No constraint |

---

## 3. Cascade Behavior Analysis

### Safe Cascades

| Parent → Child | Cascade | Reasoning |
|---------------|---------|-----------|
| `Tenant → All models` | `Cascade` | ✅ Required for tenant deletion — all data removed |
| `Project → Unit` | `Cascade` | ✅ Project deletion removes its units |
| `Lead → LeadActivity, Task, MansourChat` | `Cascade` | ✅ Lead deletion removes related records |
| `Contract → Installment` | `Cascade` | ✅ Contract deletion removes installments |
| `RentalLease → RentalInvoice` | `Cascade` | ✅ Lease deletion removes invoices |
| `JournalEntry → JournalLine` | `Cascade` | ✅ Entry deletion removes lines |

### Dangerous Cascades

| Parent → Child | Cascade | Risk |
|---------------|---------|------|
| `Unit → Contract` via `Contract.unitId` | `Restrict` | ✅ Intentional — prevents deleting a sold unit |
| `Account → JournalLine` via `JournalLine.accountId` | `NoAction` (default) | ⚠️ Prevents deleting an account with journal entries — intentional but blocks chart of accounts cleanup |

### Missing Cascades

| Parent → Child | Current Behavior | Risk |
|---------------|-----------------|------|
| `Account → JournalLine` (Account.accountId) | `NoAction` | Cannot remove unused accounts without manually checking |
| `Receipt → GeneralLedger` | `NoAction` | Orphan ledger entry if receipt is deleted |

---

## 4. Unique Constraints Audit

| Model | Unique Constraint | Appropriate? |
|-------|------------------|--------------|
| `User` | `email` | ✅ Required for login |
| `Tenant` | `subdomain` | ✅ Required for subdomain routing |
| `Unit` | `(projectId, unitNumber)` | ✅ Prevents duplicate unit numbers |
| `Contract` | `unitId` | ✅ One contract per unit |
| `Installment` | `(contractId, installmentNumber)` | ✅ Sequential installments |
| `Installment` | `securePaymentToken` | ✅ Secure payment reference |
| `RentalInvoice` | `(tenantId, invoiceNumber)` | ✅ Sequential invoice numbers |
| `Account` | `(tenantId, code)` | ✅ Unique account codes |
| `AccountBalance` | `(accountId, period, tenantId)` | ✅ One balance per period |
| `JournalEntry` | `(tenantId, entryNumber)` | ✅ Sequential entries |
| `AgentSlot` | `(tenantId, slotNumber)` | ✅ Unique slots |
| `AgentLease` | `(tenantId, agentId)` | ✅ One lease per agent |
| `PlatformConnection` | `(tenantId, platform)` | ✅ One connection per platform |
| `UserFavorite` | `(userId, propertyId)` | ✅ One favorite per user per property |

---

## 5. Composite Index Coverage

### Excellent (Covering Indexes)

| Table | Index | Covers Queries For |
|-------|-------|-------------------|
| `account_balances` | `(tenantId, period)` | Trial balance by period |
| `journal_entries` | `(tenantId, status)` | Unposted entries |
| `journal_entries` | `(tenantId, postedAt)` | Period-based GL queries |
| `zatca_queue` | `(tenantId, status)` | Queue status by tenant |
| `zatca_queue` | `(nextRetryAt)` | Retry scheduler |

### Missing (Critical Performance Impact)

| Table | Needed Index | Why |
|-------|-------------|-----|
| `lead` | `(tenantId, status)` | Dashboard pipeline (status-based filtering) |
| `lead` | `(tenantId, assignedTo, status)` | Sales rep workload |
| `lead_activity` | `(leadId, createdAt)` | Lead timeline (most common query pattern) |
| `rental_invoice` | `(tenantId, status)` | Unpaid invoice queries |
| `audit_log` | `(tenantId, action, createdAt)` | Audit filtering by action |
| `payment_transaction` | `(tenantId, invoiceId)` | Payment lookup by invoice |

---

## 6. Tenant Isolation Coverage

### Models WITH `tenantId` (38 of 40 models)

All tenant-scoped models include `tenantId` with FK to `Tenant` and `onDelete: Cascade`. ✅

### Models WITHOUT `tenantId` (2 models)

| Model | Justification | Risk |
|-------|--------------|------|
| `RateLimitEntry` | Cross-tenant rate limiting by IP | ✅ Intentional |
| `FailedLoginAttempt` | Cross-tenant security tracking by userId | ✅ Intentional |

---

## Recommendations

1. **Add FK constraints** for all 8 dangling foreign key references — highest priority for data integrity
2. **Add composite indexes** on `lead(tenantId, status)`, `lead_activity(leadId, createdAt)`, `rental_invoice(tenantId, status)`
3. **Fix cascade on `Account → JournalLine`** — Add `onDelete: Restrict` explicitly (currently defaults to `NoAction`)
4. **Align `Receipt` and `GeneralLedger`** ID strategies with rest of schema
5. **Resolve the parallel `GeneralLedger` vs `JournalEntry`** ledger situation

---

## Sign-off

**Prisma Schema Verdict:** ✅ WELL-STRUCTURED — Proper multi-tenant foundation, excellent financial schema design, good unique constraint coverage. Needs FK constraint additions and index coverage improvements for production scale.
