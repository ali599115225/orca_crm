# ORCA Accounting Status Audit

**Date:** 2026-06-10 | **Auditor:** Agent 2 (Finance, Accounting & ZATCA Lead)

---

## Component Status Summary

| # | Component | Status | Evidence File | Gaps / Notes |
|---|-----------|--------|---------------|--------------|
| 1 | **Chart of Accounts** | READY | `lib/accounting/chart-of-accounts.ts:1-200` | Full bilingual (Ar/En) hierarchy: Assets (1.x), Liabilities (2.x), Equity (3.x), Revenue (4.x), Expenses (5.x). 26 leaf accounts. Includes VAT Payable (2.1.1), AR (1.1.3), Cash (1.1.1), Cash at Bank (1.1.2). Exported via `lib/accounting/index.ts:1`. |
| 2 | **General Ledger** | READY | `lib/accounting/financial-reports.ts:57-93` | `getGeneralLedgerReport()` queries `journalLine` with running balance. Supports filtering by accountId, date range. Outputs `GeneralLedgerRow[]` with entryNumber, debit, credit, balance. |
| 3 | **Journal Entries** | READY | `lib/accounting/posting-engine.ts:1-316` | 316 lines. `postJournalEntry()`, `reverseJournalEntry()`, `postPaymentEntry()`, `validateEntryBalance()`. Minimum 2 lines enforced. Transactions use `prisma.$transaction`. |
| 4 | **Trial Balance** | READY | `lib/accounting/financial-reports.ts:13-46` | `getTrialBalance()` aggregates `AccountBalance` records by period. Computes balance as debit-credit (assets/expenses) or credit-debit (liabilities/revenue/equity). Returns per-account rows with totals. |
| 5 | **Double-Entry Enforcement** | READY | `lib/accounting/posting-engine.ts:27-28,38-40` | `round2()` helper normalizes to 2 decimals. `validateEntryBalance` checks `Math.abs(totalDebit - totalCredit) > 0.01` and throws `PostingError` on imbalance. |
| 6 | **Accounts Receivable** | READY | `lib/accounting/accounts-receivable.ts:1-140` | `getCustomerBalances()` aggregates invoices + receipts per tenant. Computes outstanding, overdueAmount, status (CURRENT/OVERDUE/PAID). Outputs `CustomerBalance[]`. |
| 7 | **AR Aging Report** | READY | `lib/accounting/aging-report.ts:1-89` | `getAgingReport()` groups unpaid invoices into 0-30, 31-60, 61-90, 90+ day buckets. `getAgingDetail()` returns per-invoice aging with bucket labels. |
| 8 | **AR Detailed Report** | READY | `lib/accounting/financial-reports.ts:108-153` | `getAccountsReceivableReport()` returns invoice-level AR with customer, unit, daysOverdue, outstanding, status in Arabic. |
| 9 | **VAT Report** | READY | `lib/accounting/financial-reports.ts:165-203` | `getVatReport()` aggregates invoices with VAT > 0 by date range. Returns totalSubtotal, totalVat, totalAmount. Excludes non-VAT invoices. |
| 10 | **Audit Controls** | READY | `lib/accounting/audit-controls.ts:1-183` | 6 checks: Duplicate Posting, Transaction Integrity, Unbalanced Entries, Tenant Isolation, Orphaned Receipts, Unreversed Reversals. Returns `AuditCheckResult[]` with PASS/FAIL/WARN. |
| 11 | **Payment Entry Posting** | READY | `lib/accounting/posting-engine.ts:188` | `postPaymentEntry()` creates journal entry debiting Cash (1.1.1) and crediting AR (1.1.3). Called by `app/api/v1/invoices/[id]/pay/route.ts:99` and `app/actions/finance.ts:40`. |
| 12 | **Accounts Payable** | STUB | `lib/accounting/chart-of-accounts.ts:74` | COA code 2.1.2 "Accounts Payable / دائنون" defined but no AP engine, no AP report, no supplier/vendor management, no AP aging. |
| 13 | **Cash Flow Statement** | MISSING | — | No cash flow report file, no `getCashFlowStatement()` function, no indirect/direct method implementation. |
| 14 | **Bank Reconciliation** | MISSING | — | No bank statement import, no reconciliation matching engine. The `app/api/v1/reconciliation/upload/` route exists but handles invoice-payment matching, not bank-to-books reconciliation. |
| 15 | **Profit & Loss / Income Statement** | MISSING | — | No `getProfitLoss()` or `getIncomeStatement()`. Revenue and expense accounts exist in COA (4.x, 5.x) but no report aggregates them by category. |
| 16 | **Balance Sheet** | MISSING | — | No `getBalanceSheet()` function. Assets, liabilities, and equity accounts exist in COA but no report aggregates them into the standard BS format. |
| 17 | **Accounting Utilities** | READY | `lib/accounting/utils.ts:1-10` | `getPeriod()` for YYYY-MM format, `getTodayString()` for ISO date strings. |
| 18 | **Accounting Index** | READY | `lib/accounting/index.ts:1-7` | Barrel export of all 7 modules. |

---

## Critical Gaps — Priority Order

### P0: Financial Statements (MISSING)
No P&L, Balance Sheet, or Cash Flow statement exists. These are fundamental financial reports required by most stakeholders. Revenue (4.x) and Expense (5.x) accounts are in COA but never aggregated into P&L. The data model (`AccountBalance`, `JournalLine`) supports these reports — implementation is needed.

### P1: Accounts Payable (STUB)
COA code 2.1.2 exists but has zero supporting code. No supplier/vendor management, no AP invoice capture, no AP aging, no payment scheduling. For a real estate/property management CRM, AP is essential for tracking maintenance vendor payments, utility bills, and service contracts.

### P2: Bank Reconciliation (MISSING)
The existing `reconciliation/upload` route does invoice-payment matching, not true bank reconciliation (bank statement vs. GL Cash at Bank account 1.1.2). Missing: statement import (CSV/OFX), matching engine, reconciling items tracking.

---

## Verification Checklist

- [x] Double-entry enforced at post time (posting-engine.ts:38-40)
- [x] Tenant-scoped all accounting queries (Prisma `where: { tenantId }`)
- [x] Audit controls catch duplicates, imbalances, orphaned receipts
- [x] AR aging available in 4 buckets with detail mode
- [x] Journal entries run in Prisma transactions (`$transaction`)
- [ ] P&L report implementation needed
- [ ] Balance Sheet report implementation needed
- [ ] Cash Flow statement implementation needed
- [ ] AP engine with supplier management needed
- [ ] True bank reconciliation (statement vs. GL) needed
