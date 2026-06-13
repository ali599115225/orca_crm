# Sprint 1 – Production Validation Report

**Status:** ✅ Build Passes – Ready for Production Deployment

## Build Validation

| Check | Result |
|-------|--------|
| `next build` | ✅ Compiled successfully |
| TypeScript | ✅ Zero errors |
| Total Routes | 69 (all dynamic, including new invoice/QR/PDF) |

## API Validation (Manual – Run Against Production After Deploy)

### Invoice Creation Flow

| Step | Endpoint | Expected | Status |
|------|----------|----------|--------|
| Create invoice with STANDARD vat | `POST /api/v1/invoices` | Returns invoice with `invoiceNumber`, `invoicePrefix`, `invoiceLabel`, `zatcaUuid`, `subtotal`, `vatRate`=15.00, `vatAmount`, `totalAmount`, `qrPayload`, `qrCode`, `qrImage` | ⏳ Deploy to verify |
| Create invoice with ZERO_RATED vat | `POST /api/v1/invoices` | `vatAmount`=0, `totalAmount`=`subtotal` | ⏳ Deploy to verify |
| Create invoice with EXEMPT vat | `POST /api/v1/invoices` | `vatAmount`=0, `totalAmount`=`subtotal` | ⏳ Deploy to verify |
| Verify invoice numbering | `POST /api/v1/invoices` × 3 | `INV-2026-000001`, `INV-2026-000002`, `INV-2026-000003` | ⏳ Deploy to verify |
| Verify UUID uniqueness | `POST /api/v1/invoices` × 2 | Different UUIDs | ⏳ Deploy to verify |
| Verify invoice label | `GET /api/v1/invoices` | Label format: `INV-2026-000001` | ⏳ Deploy to verify |

### Invoice List

| Step | Endpoint | Expected | Status |
|------|----------|----------|--------|
| List all invoices | `GET /api/v1/invoices` | Returns all invoices with full VAT fields, `invoiceLabel`, QR data | ⏳ Deploy to verify |
| Get single invoice | `GET /api/v1/invoices/[id]` | Returns invoice with tenant info, lease info | ⏳ Deploy to verify |
| Get invoices by lease | `GET /api/v1/leases/[id]/invoices` | Returns invoices for specific lease | ⏳ Deploy to verify |

### QR & PDF

| Step | Endpoint | Expected | Status |
|------|----------|----------|--------|
| Download QR image | `GET /api/v1/invoices/[id]/qr` | Returns PNG image | ⏳ Deploy to verify |
| Download PDF invoice | `GET /api/v1/invoices/[id]/pdf` | Returns HTML tax invoice with print button | ⏳ Deploy to verify |

### VAT Check on PDF

| Field | Expected |
|-------|----------|
| Invoice Number | `INV-2026-00000X` |
| VAT Number | From tenant settings |
| Subtotal | `subtotal` SAR |
| VAT Rate | 15% |
| VAT Amount | `vatAmount` SAR |
| Total | `totalAmount` SAR |
| QR Code | Displayed as image |
| UUID | ZATCA UUID displayed |

## Scorecard Projection (After Deployment)

| Area | Audit | Sprint 1 | Delta | Reasoning |
|------|-------|----------|-------|-----------|
| **ZATCA** | 1/10 | **5/10** | +4 | VAT engine + QR code + invoice numbering + UUID at creation. Missing: XML generation, clearance, digital signature. |
| **Financial Readiness** | 3/10 | **5/10** | +2 | Real DB-based invoice with VAT fields. Missing: double-entry, journal engine, trial balance. |
| **Payments** | 6/10 | 6/10 | 0 | Unchanged. Payment matching still uses old structures. |
| **Saudi Market** | 3/10 | 3/10 | 0 | Unchanged. Core market readiness depends on ZATCA clearance (Sprint 2). |

## Rollback Procedure

If issues arise in production:

1. **Revert schema**: `DROP TABLE IF EXISTS rental_invoices; ALTER TABLE rental_invoices_legacy RENAME TO rental_invoices;`
2. **Revert columns on tenants**: `ALTER TABLE tenants DROP COLUMN invoice_prefix, DROP COLUMN next_invoice_number;`
3. **Revert columns on contracts/leases**: `ALTER TABLE rental_leases DROP COLUMN vat_type, DROP COLUMN vat_rate; ALTER TABLE contracts DROP COLUMN vat_type, DROP COLUMN vat_rate; ALTER TABLE installments DROP COLUMN vat_amount;`
4. **Revert code**: Deploy previous build

Legacy table `rental_invoices_legacy` will be dropped 7 days after successful deployment.

## Next Steps

1. ✅ Deploy to Vercel
2. ⏳ Run acceptance tests above against production API
3. ⏳ Verify invoice creation through UI (operations/rental)
4. ⏳ If all pass: proceed to **Sprint 2 Planning** (ZATCA XML + API integration)
