# Financial Architecture – ORCA CRM

## Overview

The ORCA CRM financial system is built on **double-entry bookkeeping** principles with full **tenant isolation**, **transaction safety**, and **Saudi VAT/ZATCA compliance**.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    UI / API Layer                         │
│  (REST API + Server Actions + Client Components)         │
└────────────┬───────────────────────────────┬────────────┘
             │                               │
┌────────────▼──────────────┐  ┌────────────▼──────────────┐
│   Accounting Engine        │  │   Payment Engine           │
│   (lib/accounting/)        │  │   (app/actions/finance.ts) │
│                            │  │   (app/api/v1/payment/)    │
│  • Chart of Accounts       │  │                            │
│  • PostingEngine           │  │  • Moyasar Integration     │
│  • JournalEntry/Line       │  │  • Invoice Payment         │
│  • AccountBalance          │  │  • Lease Settlement        │
│  • AR Management           │  │  • Commission Payment      │
│  • Aging Report            │  │  • Subscription Billing    │
│  • Financial Reports       │  │  • Refund/Reversal         │
│  • Audit Controls          │  │  • Reconciliation          │
└────────────┬──────────────┘  └────────────┬──────────────┘
             │                               │
┌────────────▼──────────────┐  ┌────────────▼──────────────┐
│   Core Financial Models    │  │   ZATCA Compliance        │
│   (Prisma Schema)          │  │   (lib/zatca/)            │
│                            │  │                            │
│  • Account                 │  │  • XML Generation (UBL)    │
│  • JournalEntry            │  │  • QR Code / TLV Encoding  │
│  • JournalLine             │  │  • API Client (CSID)       │
│  • AccountBalance          │  │  • Previous Invoice Hash   │
│  • Receipt                 │  │  • Device Management       │
│  • RentalInvoice           │  │  • Retry Queue             │
│  • PaymentTransaction      │  │                            │
│  • PayrollCommission       │  │                            │
│  • CommissionPayment       │  │                            │
│  • GeneralLedger (legacy)  │  │                            │
└────────────────────────────┘  └────────────────────────────┘
```

## Core Principles

### 1. Double-Entry Bookkeeping
Every financial transaction generates a balanced journal entry (debit = credit) with at least two lines.

### 2. Tenant Isolation
All financial data is scoped by `tenantId`. Every query includes tenant filtering.

### 3. Transaction Safety
All financial operations are wrapped in Prisma `$transaction` for atomicity and rollback.

### 4. Audit Trail
- Journal entries are immutable once posted (status = POSTED)
- Reversals create new entries linked to the original
- Status tracking: POSTED → REVERSED
- Source tracking for every entry

### 5. Sequential Numbering
Journal entries use sequential entry numbers per tenant (auto-increment).

## Mandatory Journal Entry Matrix

| Financial Event | Accounts Involved | Debit | Credit |
|-----------------|-------------------|-------|--------|
| Invoice Created (no VAT) | Accounts Receivable, Revenue | AR | Revenue |
| Invoice Created (with VAT) | Accounts Receivable, Revenue, VAT Payable | AR | Revenue + VAT |
| Payment Received | Cash, Accounts Receivable | Cash | AR |
| Commission Paid | Commission Expense, Cash | Expense | Cash |
| Refund Issued | Revenue, Cash | Revenue | Cash |
| Installment Due | Accounts Receivable, Revenue, VAT Payable | AR | Revenue + VAT |
| Journal Entry Reversal | Reversed accounts | Reversed credit | Reversed debit |

## Chart of Accounts

```
1.1.1   Cash                    (ASSET)
1.1.2   Cash at Bank            (ASSET)
1.1.3   Accounts Receivable      (ASSET)
1.1.4   Prepaid Expenses        (ASSET)
2.1.1   VAT Payable             (LIABILITY)
2.1.2   Accounts Payable        (LIABILITY)
2.1.3   Deferred Revenue        (LIABILITY)
3.1     Capital                 (EQUITY)
3.2     Retained Earnings       (EQUITY)
4.1     Rental Revenue          (REVENUE)
4.2     Sales Revenue           (REVENUE)
4.3     Other Revenue           (REVENUE)
5.1     Commission Expense      (EXPENSE)
5.2     Salary Expense          (EXPENSE)
5.3     Operating Expenses      (EXPENSE)
```

## Report Capabilities

| Report | Source | Period |
|--------|--------|--------|
| Trial Balance | AccountBalance | Monthly |
| General Ledger | JournalLine | Date range |
| Accounts Receivable | RentalInvoice + Receipt | Real-time |
| Aging Report | RentalInvoice | Real-time |
| VAT Report | RentalInvoice | Date range |

## Payment Flow

```
1. Invoice created (status: unpaid)
2. Customer pays → POST /api/v1/invoices/[id]/pay
3. System creates:
   a. Receipt record (payment proof)
   b. PaymentTransaction record (gateway log)
   c. Journal Entry (Debit Cash, Credit AR)
   d. Updates invoice status to "paid"
4. AR report reflects payment
5. Cash balance updated
```

## Integration Points

- **Moyasar** – Subscription and addon payments (real, production)
- **ZATCA** – E-invoicing compliance (XML + QR + CSID)
- **Ejar** – Rental contract registration
- **Sanad Agent** – Installment reminders via WhatsApp

## Future Enhancements (Out of Scope for Sprint 3)

- Balance Sheet
- Profit & Loss Statement
- Cash Flow Statement
- Fixed Assets Register
- Cost Centers
- Multi-currency
- Bank Feed Integration
