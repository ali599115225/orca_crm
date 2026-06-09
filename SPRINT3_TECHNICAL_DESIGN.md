# SPRINT 3 – Technical Design Document

## Overview

Sprint 3 delivers the **Accounting Core** (double-entry engine, chart of accounts, financial reports) and **Real Payment Engine** (replacing all mock payment endpoints with production database-backed logic).

## Architecture

### Before Sprint 3
```
Invoice → [Mock Payment] → Random ID
Receipt  → GeneralLedger (single-entry)
No chart of accounts, no double-entry, no aging, no reports
```

### After Sprint 3
```
Invoice → JournalEntry (double-entry) → AccountBalance → TrialBalance
       → AccountsReceivable → Aging Report → AR Report
       → PaymentTransaction → Receipt → Cash Account
Commission → JournalEntry → CommissionExpense → Cash
```

## New Database Models

### 1. Account (Chart of Accounts)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Tenant isolation |
| code | String | Hierarchical code (e.g., "1.1.1") |
| nameAr | String | Arabic name |
| nameEn | String | English name |
| type | AccountType | ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE |
| parentId | UUID | Self-referential hierarchy |

### 2. AccountBalance
Stores aggregated debit/credit totals per account per period.

### 3. JournalEntry
| Field | Type | Description |
|-------|------|-------------|
| entryNumber | Int | Sequential per tenant |
| status | JournalEntryStatus | DRAFT/POSTED/REVERSED |
| source | String | INVOICE/RECEIPT/COMMISSION/INSTALLMENT/REFUND/REVERSAL |
| sourceId | String | Link to originating transaction |

### 4. JournalLine
Each entry has 2+ balanced lines (total debit = total credit).

### 5. PaymentTransaction
Persistent record of all payment gateway transactions, replacing mock random IDs.

### 6. CommissionPayment
Tracks actual payment of commissions with double-entry posting.

## Chart of Accounts Structure

```
1 Assets
  1.1 Current Assets
    1.1.1 Cash
    1.1.2 Cash at Bank
    1.1.3 Accounts Receivable
    1.1.4 Prepaid Expenses
2 Liabilities
  2.1 Current Liabilities
    2.1.1 VAT Payable
    2.1.2 Accounts Payable
    2.1.3 Deferred Revenue
3 Equity
  3.1 Capital
  3.2 Retained Earnings
4 Revenue
  4.1 Rental Revenue
  4.2 Sales Revenue
  4.3 Other Revenue
5 Expenses
  5.1 Commission Expense
  5.2 Salary Expense
  5.3 Operating Expenses
```

## Mandatory Journal Entry Rules

| Event | Debit | Credit |
|-------|-------|--------|
| Invoice Created | Accounts Receivable | Revenue (+ VAT Payable) |
| Payment Received | Cash | Accounts Receivable |
| Commission Paid | Commission Expense | Cash |
| Refund | Revenue | Cash |
| Installment Due | Accounts Receivable | Revenue (+ VAT Payable) |

## API Endpoints

### New Endpoints
- `GET /api/v1/accounting/chart-of-accounts` – Get chart
- `POST /api/v1/accounting/seed` – Seed COA
- `GET /api/v1/accounting/trial-balance` – Trial balance
- `GET /api/v1/accounting/general-ledger` – GL report
- `GET /api/v1/accounting/accounts-receivable` – AR summary/report
- `GET /api/v1/accounting/aging-report` – Aging buckets
- `GET /api/v1/accounting/vat-report` – VAT report
- `GET /api/v1/accounting/journal-entries` – List entries
- `POST /api/v1/accounting/journal-entries` – Create manual entry
- `GET /api/v1/accounting/journal-entries/[id]` – Get entry
- `POST /api/v1/accounting/journal-entries/[id]` – Reverse entry
- `GET /api/v1/accounting/audit` – Audit checks

### Updated Endpoints
- `POST /api/v1/invoices/[id]/pay` – Real payment with double-entry posting
- `POST /api/accounting/settle-lease` – Real lease settlement with invoice + JE
- `POST /api/v1/reconciliation/upload` – Real reconciliation against DB

## Audit Controls

1. **Duplicate Posting Prevention** – SourceId uniqueness enforced
2. **Transaction Integrity** – All entries verified debit = credit
3. **Rollback Safety** – All operations wrapped in Prisma $transaction
4. **Tenant Isolation** – Every query scoped by tenantId
5. **Reversal Support** – Full reversal entries with linking

## File Structure

```
lib/accounting/
  index.ts                – Barrel exports
  chart-of-accounts.ts    – COA seed, query
  posting-engine.ts       – Double-entry posting, reversal, helpers
  accounts-receivable.ts  – Customer balances, aging buckets
  aging-report.ts         – Aging report
  financial-reports.ts    – Trial balance, GL, AR, VAT reports
  audit-controls.ts       – Audit checks
  utils.ts                – Period helpers
app/actions/
  accounting.ts           – Updated with all new server actions
  finance.ts              – Updated with double-entry posting
  ejar.ts                 – Commission payment with JE
app/api/v1/accounting/   – New REST API endpoints
```

## Migration Path

1. New tables created (no existing table modifications)
2. `GeneralLedger` table preserved for backward compatibility
3. All new code uses double-entry JournalEntry/JournalLine
4. Old GeneralLedger entries remain readable
