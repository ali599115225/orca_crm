# FINANCIAL INTEGRITY REVIEW — ORCA CRM Core Platform

**Date:** 2026-06-09  
**Reviewer:** Financial Systems Architect  
**Scope:** Chart of accounts, journal entries, payments, invoices, VAT, ZATCA  

---

## Overall Score: 7.0 / 10

---

## 1. Double-Entry Integrity

### Architecture

```
JournalEntry (PK) 
  └── JournalLine (FK → JournalEntry, FK → Account)
        ├── debit (DECIMAL)
        └── credit (DECIMAL)

AccountBalance (tenantId, accountId, period)
  ├── debit (DECIMAL) — running total
  └── credit (DECIMAL) — running total
```

### Integrity Enforcements

| Check | Location | Type | Effective? |
|-------|----------|------|-----------|
| `debit === credit` per journal | `posting-engine.ts:41-45` | Application-level | ✅ Enforced before creation |
| `@@unique([tenantId, entryNumber])` | Schema | Database-level | ✅ Prevents duplicate entry numbers |
| `AccountBalance upsert` with `increment` | `posting-engine.ts:77-96` | Database-level | ✅ Atomic balance updates |
| Reversal swaps debits/credits | `posting-engine.ts:103-137` | Application-level | ✅ Proper reversal |
| Audit scan for unbalanced entries | `audit-controls.ts` | Application-level | ✅ Periodic check |

---

## 2. CRITICAL FINDINGS — Payment Transaction Integrity

### Finding FI-01: Journal Entry Outside Payment Transaction (CRITICAL)

**Location:** `app/api/v1/invoices/[id]/pay/route.ts`, `app/actions/finance.ts`

**Problem:**
```typescript
// Transaction 1: Record payment
const result = await prisma.$transaction(async (tx) => {
  const receipt = await tx.receipt.create({...});
  await tx.rentalInvoice.update({where: {id: invoiceId}, data: {status: 'paid', ...}});
  return receipt;
});
// Transaction 2 (OUTSIDE!): Post journal entry — NOT in the same transaction
const journalEntry = await postPaymentEntry({amount, accountId, ...});
```

If the server crashes between Transaction 1 (success) and Transaction 2 (not yet executed):
- ✅ Receipt is created
- ✅ Invoice is marked as paid
- ❌ **No journal entry** — the payment is invisible to the general ledger
- ❌ **Account balances are wrong** — cash was received but not recorded
- ❌ **Trial balance won't balance**

**Fix:** Include `postPaymentEntry` inside the same `$transaction` callback.

### Finding FI-02: Idempotency Key Not Enforced (CRITICAL)

**Location:** `app/api/v1/invoices/[id]/pay/route.ts`

**Problem:**
The route requires an `Idempotency-Key` header but **never checks if it was already used**. Two concurrent requests with different idempotency keys (or the same key) can:

1. Both pass the `invoice.status !== 'paid'` check (race condition at READ COMMITTED isolation)
2. Both create receipts
3. Both mark the invoice as paid (second one succeeds silently)
4. Result: **Double payment** — same invoice paid twice

**Fix:** 
- Check if `Idempotency-Key` was already processed (in a `processed_idempotency_keys` table)
- Use `SERIALIZABLE` transaction isolation for payment processing
- Add a unique constraint on `(invoiceId, paymentMethod, amount)` as defense-in-depth

### Finding FI-03: Entry Number Race Condition (CRITICAL)

**Location:** `lib/accounting/posting-engine.ts:47-52`

**Problem:**
```typescript
const lastEntry = await prisma.journalEntry.findFirst({
  where: { tenantId },
  orderBy: { entryNumber: 'desc' },
});
const nextNumber = (lastEntry?.entryNumber || 0) + 1;
// TRANSACTION STARTS HERE — entryNumber already determined outside!
```

Two concurrent journal postings will get the same `entryNumber`, causing a `@@unique([tenantId, entryNumber])` constraint violation. One will fail, but more importantly:

- The `entryNumber` increment is NOT atomic
- PostgreSQL `SERIALIAL` sequences exist for this purpose
- Failed entries create gaps in the entry number sequence

**Fix:** Use a PostgreSQL sequence or `count()` inside the transaction.

---

## 3. HIGH FINDINGS

### Finding FI-04: Parallel Ledger System (HIGH)

**Location:** Schema — `GeneralLedger` model exists alongside `JournalEntry`+`JournalLine`+`AccountBalance`

**Problem:**
- `GeneralLedger` is an older single-entry ledger
- `JournalEntry` is the newer double-entry system
- The posting engine writes to `JournalEntry` but NOT to `GeneralLedger`
- Some code paths may still write to `GeneralLedger`
- Reports could show different balances depending on which system is queried

**Fix:** Remove `GeneralLedger` model after migrating any remaining code paths to `JournalEntry`.

### Finding FI-05: Missing Transaction in Billing Activation (HIGH)

**Location:** `app/actions/billingAgent.ts:handleSuccessfulPaymentAction`

**Problem:**
```typescript
await prisma.tenant.update({...});  // Activates tenant
await prisma.user.update({...});    // Updates password
await sendSMS(...);                  // Sends credentials
await sendEmail(...);                // Sends welcome email
```

No transaction wraps these operations. If the SMS or email fails after the tenant is activated:
- Tenant is active but user never received credentials
- No rollback mechanism
- Admin must manually intervene

---

## 4. MEDIUM FINDINGS

### Finding FI-06: No Serializable Isolation for Payments (MEDIUM)

At `READ COMMITTED` isolation (Prisma default), concurrent payment requests can both see `status = 'unpaid'` and both proceed. Use `SERIALIZABLE` or add `SELECT ... FOR UPDATE` via `$queryRawUnsafe`.

### Finding FI-07: ZATCA Empty Invoice Hash (MEDIUM)

**Location:** `lib/zatca/api.ts:49-52, 97-100`

The ZATCA API submission sends `invoiceHash: ''` and `uuid: ''` as empty strings. Per ZATCA specification, these must be computed from the signed XML invoice. Empty values will cause compliance rejection in production.

### Finding FI-08: `AccountBalance` No Period Closure Enforcement (MEDIUM)

There is no mechanism to prevent posting to a closed accounting period. Entries can be backdated without restriction.

---

## 5. LOW FINDINGS

| ID | Finding | Location | Recommendation |
|----|---------|----------|----------------|
| FI-09 | Hardcoded phone `+966557516311` | `billingAgent.ts`, `billing/route.ts` | Move to env var |
| FI-10 | SMS credentials in plaintext | `billingAgent.ts` | Include a "change your password on first login" flow instead |
| FI-11 | Dynamic import in payment | `finance.ts:19` | Replace with static import |
| FI-12 | `PaymentTransaction` unused | Schema | Evidently created but no code writes to it |
| FI-13 | No daily reconciliation job | None | Add a cron that verifies payments = receipts = journal entries |

---

## Findings Summary

| Severity | Count | IDs |
|----------|-------|-----|
| **CRITICAL** | 3 | FI-01, FI-02, FI-03 |
| **HIGH** | 2 | FI-04, FI-05 |
| **MEDIUM** | 3 | FI-06, FI-07, FI-08 |
| **LOW** | 5 | FI-09 to FI-13 |

---

## Sign-off

**Financial Integrity Verdict:** ⚠️ FUNCTIONAL WITH ISSUES — The double-entry accounting engine is well-designed (balanced journals, atomic balance updates, reversal support). However, three critical transaction integrity bugs in the payment flow must be fixed before production. The parallel ledger issue and missing serializable isolation are high/medium concerns.
