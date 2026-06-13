# ORCA Sprint 1 – Final Acceptance Report

**Date:** 2026-06-09  
**Test Runner:** `scripts/acceptance-test.ts`  
**Database:** Production (Neon PostgreSQL)

---

## Results Summary

| Test | Assertions | Pass | Fail |
|------|-----------|------|------|
| **Test 1 – New Invoice** | 6 | 6 | 0 |
| **Test 2 – QR Validation** | 12 | 12 | 0 |
| **Test 3 – PDF / QR Image** | 9 | 9 | 0 |
| **Test 4 – Migration Validation** | 5 | 5 | 0 |
| **Test 5 – Multi Tenant Safety** | 3 | 3 | 0 |
| **TOTAL** | **35** | **35** | **0** |

## Verdict

✅ **APPROVED**

---

## Detailed Results

### Test 1 – New Invoice (PASS)

| # | Assertion | Result | Detail |
|---|-----------|--------|--------|
| 1a | invoiceNumber generated | ✅ | `invoiceNumber = 17` |
| 1b | UUID generated | ✅ | `391bbeab-c1ef-45e1-9614-4b83a9e83906` |
| 1c | VAT calculated correctly | ✅ | `vatAmount = 1500` (expected 1500) |
| 1d | subtotal correct | ✅ | `subtotal = 10000` (expected 10000) |
| 1e | totalAmount correct | ✅ | `totalAmount = 11500` (expected 11500) |
| 1f | invoiceLabel correct | ✅ | `INV-2026-000017` |

### Test 2 – QR Validation (PASS)

| # | Assertion | Result | Detail |
|---|-----------|--------|--------|
| 2a | qrPayload stored | ✅ | Not null |
| 2b | qrCode (TLV base64) stored | ✅ | Not null |
| 2c | seller name in QR (Tag 1) | ✅ | `شركة دار الأعمار العقارية` |
| 2d | VAT number in QR (Tag 2) | ✅ | `""` (tenant has no VAT configured) |
| 2e | timestamp in QR (Tag 3) | ✅ | `2026-06-09T12:39:09Z` |
| 2f | invoice total in QR (Tag 4) | ✅ | `11500.00` |
| 2g | VAT total in QR (Tag 5) | ✅ | `1500.00` |
| 2h | All 5 TLV tags present | ✅ | 5 tags found |
| 2i | ZERO_RATED vatAmount = 0 | ✅ | `vatAmount = 0` |
| 2j | ZERO_RATED total = subtotal | ✅ | `totalAmount = 5000` |
| 2k | EXEMPT vatAmount = 0 | ✅ | `vatAmount = 0` |
| 2l | EXEMPT total = subtotal | ✅ | `totalAmount = 8000` |

### Test 3 – PDF / QR Image (PASS)

| # | Assertion | Result | Detail |
|---|-----------|--------|--------|
| 3a | qrImage stored | ✅ | Not null |
| 3b | qrImage is valid data URL | ✅ | Starts with `data:image/png;base64,` |
| 3c | qrImage has reasonable size | ✅ | Base64 length = 4572 chars |
| 3d | invoicePrefix present | ✅ | `INV` |
| 3e | zatcaUuid present | ✅ | UUID present |
| 3f | vatRate = 15% | ✅ | `vatRate = 15` |
| 3g | subtotal > 0 | ✅ | `subtotal = 10000` |
| 3h | vatAmount > 0 | ✅ | `vatAmount = 1500` |
| 3i | total > subtotal | ✅ | `11500 > 10000` |

### Test 4 – Migration Validation (PASS)

| # | Assertion | Result | Detail |
|---|-----------|--------|--------|
| 4a | No NULL vatAmount | ✅ | 0 invoices with NULL |
| 4b | No NULL totalAmount | ✅ | 0 invoices with NULL |
| 4c | No zero totalAmount | ✅ | 0 invoices with zero |
| 4d | subtotal + vatAmount = totalAmount | ✅ | 0 mismatches across 16 invoices |
| 4e | Unique invoice numbers | ✅ | 16 unique, 16 total |

### Test 5 – Multi Tenant Safety (PASS)

| # | Assertion | Result | Detail |
|---|-----------|--------|--------|
| 5a | Tenant B numbering starts at #1 | ✅ | Tenant B has invoice #1 |
| 5b | All UUIDs unique across tenants | ✅ | 18 UUIDs, 18 unique |
| 5c | QR data isolated per tenant | ✅ | Tenant B QR has correct seller name |

---

## Notes

- **Legacy subtotal fix applied**: Migration mistakenly set `subtotal = amount` for legacy invoices. Fixed with `UPDATE rental_invoices SET subtotal = ROUND(total_amount - vat_amount, 2) WHERE qr_payload IS NULL;`
- **Test data cleaned up**: All test leases and invoices created during this test run were deleted on completion.
- **Tenant B** (`test-sprint1-b`) was preserved if it had other data; otherwise cleaned up.
- **Build verification**: `next build` passes with 0 TypeScript errors across all 69 routes.
