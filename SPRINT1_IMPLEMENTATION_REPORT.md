# Sprint 1 – Implementation Report

## Summary

Sprint 1 delivered the VAT Engine, Invoice Numbering, QR Code, and updated Invoice Model. All legacy mock data routes were replaced with real database-driven endpoints. Build passes with zero TypeScript errors.

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `lib/vat/engine.ts` | VAT calculation engine: `calculateVat`, `validateVatInput`, `validateVatBreakdown` |
| `lib/vat/types.ts` | `VatType`, `VatBreakdown`, `QrPayload`, `TaxInvoiceData` interfaces |
| `lib/zatca/qr.ts` | QR generation pipeline: `buildQrPayload`, `encodeTlv`, `encodeQrCode`, `generateQrImage`, `formatInvoiceLabel` |
| `lib/zatca/types.ts` | `ZatcaStatus`, `InvoiceStatus` types |
| `app/api/v1/invoices/[id]/qr/route.ts` | `GET` – returns QR image as PNG (from stored `qrImage` or generated on the fly) |
| `app/api/v1/invoices/[id]/pdf/route.ts` | `GET` – returns HTML tax invoice with seller info, VAT breakdown, QR, print button |

### Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | `Tenant`: added `invoicePrefix`, `nextInvoiceNumber`. `RentalLease`: added `vatType`, `vatRate`. `RentalInvoice`: rebuilt with 22 fields (invoiceNumber, invoicePrefix, zatcaUuid, subtotal, vatRate, vatAmount, totalAmount, qrPayload, qrCode, qrImage, zatcaXml, zatcaSignedXml, zatcaStatus, payment fields). `Contract`: added `vatType`, `vatRate`. `Installment`: added `vatAmount` |
| `package.json` | Added `qrcode` and `@types/qrcode` dependencies |
| `prisma/seed.ts` | Updated seed invoice creation to use new schema fields (subtotal, vatRate, vatAmount, totalAmount) |
| `app/api/v1/invoices/route.ts` | `GET` – real DB query with full VAT fields, invoice labels. `POST` – VAT calculation, atomic invoice numbering, QR payload + code + image generation |
| `app/api/v1/invoices/[id]/route.ts` | Replaced mock with real DB query + tenant info |
| `app/api/v1/leases/[id]/invoices/route.ts` | Replaced mock with real invoice creation (delegates to POST /api/v1/invoices) |
| `app/operations/rental/page.tsx` | Updated `Invoice` interface (22 fields), creation modal (VAT type dropdown, live breakdown preview), invoice list (VAT columns, QR button, PDF download), removed `enableZakat`, `invoiceAmount`, `invoiceContractId`, `invoiceDue` |

## Database Changes

### Migration: `sprint1_migration.sql`

- ALTER TABLE `tenants`: added `invoice_prefix` (VARCHAR, DEFAULT 'INV'), `next_invoice_number` (INTEGER, DEFAULT 1)
- ALTER TABLE `rental_leases`: added `vat_type` (VARCHAR, DEFAULT 'STANDARD'), `vat_rate` (DECIMAL(5,2), DEFAULT 15.00)
- ALTER TABLE `contracts`: added `vat_type` (VARCHAR, DEFAULT 'STANDARD'), `vat_rate` (DECIMAL(5,2), DEFAULT 15.00)
- ALTER TABLE `installments`: added `vat_amount` (DECIMAL(12,2), DEFAULT 0)
- Rebuilt `rental_invoices` table: renamed old table to `rental_invoices_legacy`, created new table with 22 columns, migrated data with backward VAT calculation (`subtotal = ROUND(amount * 100 / 115)`, `vat_amount = ROUND(amount * 15 / 115)`)
- Updated `tenants.next_invoice_number` based on max existing invoice numbers

### Data Integrity

- Legacy table `rental_invoices_legacy` retained for 1 week for rollback
- Unique constraint: `uq_tenant_invoice_number` (tenant_id, invoice_number)

## API Changes

### New Endpoints

- `GET /api/v1/invoices/[id]/qr` – QR image as PNG
- `GET /api/v1/invoices/[id]/pdf` – HTML tax invoice

### Enhanced Endpoints

- `GET /api/v1/invoices` – real DB with VAT fields
- `POST /api/v1/invoices` – VAT calculation + atomic numbering + QR generation
- `GET /api/v1/invoices/[id]` – real DB query
- `POST /api/v1/leases/[id]/invoices` – real invoice creation

### Invoice Numbering

Format: `{prefix}-{year}-{sequential:06d}` (e.g., `INV-2026-000001`)

- `prefix` = `Tenant.invoicePrefix` (default `INV`)
- `year` = current year
- `sequential` = auto-increment per tenant (atomic `$transaction` with `{ increment: 1 }`)

## VAT Engine

- `vatType`: `STANDARD` (15%), `ZERO_RATED` (0%), `EXEMPT` (0%)
- Validation: non-negative subtotal, valid vatType, correct vatAmount
- Rate is decimal for future flexibility

## QR Code (ZATCA-compliant)

TLV encoding of 5 tags (per ZATCA specification):
1. Seller name (1)
2. VAT number (2)
3. Timestamp (3)
4. Total with VAT (4)
5. VAT total (5)

Three persistence layers:
- `qrPayload`: JSON object (for API consumption)
- `qrCode`: TLV base64 (for XML embedding in Sprint 2)
- `qrImage`: base64 PNG (for immediate display)

## Build Status

- Next.js 16.2.7: **Compiled successfully**
- TypeScript: **Zero errors**
- Generated routes: 69 total (all dynamic + new invoice routes)

## Scorecard Update

| Area | Before (Audit) | After Sprint 1 | Target |
|------|---------------|----------------|--------|
| ZATCA Readiness | 1/10 | **5/10** | 8/10 |
| Financial Readiness | 3/10 | **5/10** | 8/10 |
| Payments | 6/10 | 6/10 | 8/10 |
| Saudi Market | 3/10 | 3/10 | 8/10 |
