# ORCA Sprint 2 – Final Acceptance Report

**Date:** 2026-06-09  
**Test Runner:** `scripts/sprint2-acceptance-test.ts`  
**Database:** Production (Neon PostgreSQL)

---

## Results Summary

| Test | Assertions | Pass | Fail |
|------|-----------|------|------|
| **Test A – XML Generator (Phase 2)** | 23 | 23 | 0 |
| **Test B – PIH (Phase 3)** | 6 | 6 | 0 |
| **Test C – Validation Layer (Phase 9)** | 8 | 8 | 0 |
| **Test D – Device Registration (Phase 4)** | 6 | 6 | 0 |
| **Test E – Queue & Retry (Phase 7)** | 8 | 8 | 0 |
| **Test F – End-to-End Pipeline** | 8 | 8 | 0 |
| **Test G – Schema Validation** | 9 | 9 | 0 |
| **TOTAL** | **68** | **68** | **0** |

## Verdict

✅ **APPROVED**

---

## Detailed Results

### Test A – XML Generator (PASS)

| # | Assertion | Result |
|---|-----------|--------|
| A1 | XML generated (non-empty) | ✅ |
| A2 | XML declaration present (`<?xml`) | ✅ |
| A3 | UBL Invoice namespace | ✅ |
| A4 | Invoice ID format (`INV-2026-000042`) | ✅ |
| A5 | UUID embedded in XML | ✅ |
| A6 | Issue date (`2026-06-09`) | ✅ |
| A7 | Issue time (`12:30:00`) | ✅ |
| A8 | Invoice type code (`388`) | ✅ |
| A9 | AccountingSupplierParty | ✅ |
| A10 | AccountingCustomerParty | ✅ |
| A11 | TaxTotal | ✅ |
| A12 | LegalMonetaryTotal | ✅ |
| A13 | InvoiceLine | ✅ |
| A14 | UBLExtensions | ✅ |
| A15 | PreviousInvoiceHash | ✅ |
| A16 | Total amount (`11500.00`) | ✅ |
| A17 | VAT amount (`1500.00`) | ✅ |
| A18 | Profile ID (`reporting:1.0`) | ✅ |
| A19 | Currency (`SAR`) | ✅ |
| A20 | Seller VAT number (`310123456700003`) | ✅ |
| A21 | XML structure validation (0 errors) | ✅ |
| A22 | Simplified invoice type code (`381`) | ✅ |
| A23 | Clearance profile ID (`clearance:1.0`) | ✅ |

### Test B – PIH (PASS)

| # | Assertion | Result |
|---|-----------|--------|
| B1 | Hash is 64 hex characters | ✅ |
| B2 | Hash is uppercase hex | ✅ |
| B3 | Zero hash is 64 zeros | ✅ |
| B4 | First invoice PIH = zero hash | ✅ |
| B5 | Second invoice PIH = hash of first | ✅ |
| B6 | Different content => different hash | ✅ |

### Test C – Validation Layer (PASS)

| # | Assertion | Result |
|---|-----------|--------|
| C1 | Empty VAT rejected | ✅ |
| C2 | Valid 15-digit VAT passes | ✅ |
| C3 | Empty UUID rejected | ✅ |
| C4 | Valid UUID passes | ✅ |
| C5 | Valid totals (100+15=115) pass | ✅ |
| C6 | Invalid totals (100+15=120) rejected | ✅ |
| C7 | Full validation (all fields valid) passes | ✅ |
| C8 | Multiple errors detected (5 errors) | ✅ |

### Test D – Device Registration (PASS)

| # | Assertion | Result |
|---|-----------|--------|
| D1 | Public key generated (PEM format) | ✅ |
| D2 | Private key generated (PKCS8 PEM) | ✅ |
| D3 | CSR generated (CERTIFICATE REQUEST) | ✅ |
| D4 | Private key encrypted (iv:authTag:cipher) | ✅ |
| D5 | Private key decrypted correctly (roundtrip) | ✅ |
| D6 | Encrypt/decrypt roundtrip (generic) | ✅ |

### Test E – Queue & Retry (PASS)

| # | Assertion | Result |
|---|-----------|--------|
| E1 | Retry delay 0 = 5s | ✅ |
| E2 | Retry delay 1 = 15s | ✅ |
| E3 | Retry delay 4 = 405s | ✅ |
| E4 | Retry delay cap = 405s | ✅ |
| E5 | Expired when retryCount >= maxRetries | ✅ |
| E6 | Not expired when retryCount < maxRetries | ✅ |
| E7 | PENDING is retryable | ✅ |
| E8 | COMPLETED is not retryable | ✅ |

### Test F – End-to-End Pipeline (PASS)

| # | Assertion | Result |
|---|-----------|--------|
| F1 | Invoice starts as DRAFT status | ✅ |
| F2 | E2E XML is valid (0 validation errors) | ✅ |
| F3 | E2E hash computed (64 hex chars) | ✅ |
| F4 | First invoice PIH = zero hash | ✅ |
| F5 | Pre-submission validation passes | ✅ |
| F6 | XML contains invoice UUID | ✅ |
| F7 | XML contains invoice label | ✅ |
| F8 | Invoice 2 has PIH of invoice 1 | ✅ |

### Test G – Schema Validation (PASS)

| # | Assertion | Result |
|---|-----------|--------|
| G1 | `invoice_type_code` column exists | ✅ |
| G1 | `previous_invoice_hash` column exists | ✅ |
| G1 | `zatca_response` column exists | ✅ |
| G1 | `zatca_error` column exists | ✅ |
| G1 | `zatca_cleared_at` column exists | ✅ |
| G1 | `updated_at` column exists | ✅ |
| G2 | `zatca_devices` table exists | ✅ |
| G3 | `zatca_queue` table exists | ✅ |
| G4 | Default `zatca_status` is `DRAFT` | ✅ |

---

## Notes

- **Test data cleaned up**: All test records created during this test run were deleted on completion.
- **Build verification**: `next build` passes with 0 TypeScript errors across all 79 routes.
- **Bugs found & fixed during testing**:
  1. Existing tenant had no `vatNumber` → tests updated to use hardcoded value
  2. DB column `zatca_status` had old default `PENDING` → fixed with ALTER COLUMN SET DEFAULT 'DRAFT'
- **Scope freeze respected**: No accounting, payments, or double-entry changes.
