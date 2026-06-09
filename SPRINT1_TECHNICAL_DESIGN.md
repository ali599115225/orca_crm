# ORCA Sprint 1 – Technical Design Document

**Design Freeze – No Code Until Approved**  
**Target:** ZATCA 1/10 → 5/10, Financial Readiness 3/10 → 5-6/10  
**Scope:** VAT Engine + Invoice Numbering + QR Code + Invoice Model  
**Non-Scope:** ZATCA XML submission (Sprint 2), Payment endpoint (Sprint 3)

---

## 1. Database Changes

### 1.1 New Columns on `Tenant`

```prisma
model Tenant {
  // ... existing fields ...
  invoicePrefix       String @default("INV") @map("invoice_prefix")   // Customizable prefix
  nextInvoiceNumber   Int    @default(1) @map("next_invoice_number")  // Sequential counter
}
```

- `invoicePrefix`: Per-tenant customizable prefix (default `INV`, can be `ORCA`, `TENANTCODE`, etc.)
- `nextInvoiceNumber`: Starts at 1, atomic increment via `$transaction`
- Final label computed as: `{prefix}-{year}-{number:06d}` → `INV-2026-000001`
- Design supports multi-tenant safety via `UNIQUE(tenantId, invoiceNumber)` constraint
- Scalable: future format changes only affect display (invoiceNumber remains Int)

### 1.2 New Columns on `RentalLease`

```prisma
model RentalLease {
  // ... existing fields ...
  vatType  String   @default("STANDARD") @map("vat_type")   // STANDARD | ZERO_RATED | EXEMPT
  vatRate  Decimal  @default(15.00) @map("vat_rate")        // 15.00 | 0.00
}
```

### 1.3 New Columns on `RentalInvoice` (Major Refactor)

```prisma
model RentalInvoice {
  id             String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId       String      @map("tenant_id") @db.Uuid
  tenant         Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  leaseId        String      @map("lease_id") @db.Uuid
  lease          RentalLease @relation(fields: [leaseId], references: [id], onDelete: Cascade)

  // Invoice identity
  invoiceNumber  Int         @map("invoice_number")       // Sequential per tenant (1, 2, 3...)
  invoicePrefix  String      @map("invoice_prefix")       // Copied from tenant at creation time
  zatcaUuid      String      @default(uuid()) @map("zatca_uuid") // UUIDv4 – generated at creation

  // Dates
  issueDate      DateTime    @default(now()) @map("issue_date") @db.Date
  dueDate        DateTime    @map("due_date") @db.Date

  // Amounts (VAT)
  subtotal       Decimal     @map("subtotal") @db.Decimal(12, 2)   // Before VAT
  vatRate        Decimal     @default(15.00) @map("vat_rate") @db.Decimal(5, 2)  // 15% | 0%
  vatAmount      Decimal     @map("vat_amount") @db.Decimal(12, 2)  // subtotal × vatRate/100
  totalAmount    Decimal     @map("total_amount") @db.Decimal(12, 2) // subtotal + vatAmount

  // QR Payload (primary source)
  qrPayload      String?     @map("qr_payload")            // JSON: {sellerName, vatNumber, timestamp, total, vat}
  qrCode         String?     @map("qr_code")               // TLV → Base64 (generated from qrPayload)
  qrImage        String?     @map("qr_image")              // Base64 PNG image (generated from qrCode)

  // ZATCA fields (stored for Sprint 2+)
  zatcaXml       String?     @map("zatca_xml")             // Generated XML (Sprint 2)
  zatcaSignedXml String?     @map("zatca_signed_xml")      // Signed XML (Sprint 2)
  zatcaStatus    String      @default("PENDING") @map("zatca_status") // PENDING | REPORTED | CLEARED | FAILED

  // Status
  status         String      @default("unpaid")            // unpaid | paid | overdue | cancelled
  paidAt         DateTime?   @map("paid_at") @db.Timestamptz
  paymentMethod  String?     @map("payment_method")
  paymentRef     String?     @map("payment_ref")

  createdAt      DateTime    @default(now()) @map("created_at") @db.Timestamptz

  @@unique([tenantId, invoiceNumber], name: "uq_tenant_invoice_number")
  @@index([leaseId], map: "idx_rental_invoices_lease_id")
  @@index([tenantId], map: "idx_rental_invoices_tenant_id")
  @@map("rental_invoices")
}
```

### 1.4 New Columns on `Contract`

```prisma
model Contract {
  // ... existing fields ...
  vatType  String   @default("STANDARD") @map("vat_type")
  vatRate  Decimal  @default(15.00) @map("vat_rate")
}
```

### 1.5 New Columns on `Installment`

```prisma
model Installment {
  // ... existing fields ...
  vatAmount  Decimal?  @map("vat_amount") @db.Decimal(12, 2)
}
```

### 1.6 Migration SQL

```sql
-- Sprint 1 Migration
-- 1. Tenant
ALTER TABLE tenants ADD COLUMN invoice_prefix VARCHAR(20) DEFAULT 'INV';
ALTER TABLE tenants ADD COLUMN next_invoice_number INTEGER DEFAULT 1;

-- 2. RentalLease
ALTER TABLE rental_leases ADD COLUMN vat_type VARCHAR(20) DEFAULT 'STANDARD';
ALTER TABLE rental_leases ADD COLUMN vat_rate DECIMAL(5,2) DEFAULT 15.00;

-- 3. RentalInvoice (rebuild — we drop old and recreate)
-- Step A: Rename old table for backup
ALTER TABLE rental_invoices RENAME TO rental_invoices_legacy;

-- Step B: Create new table with all Sprint 1 fields
CREATE TABLE rental_invoices (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lease_id        UUID NOT NULL REFERENCES rental_leases(id) ON DELETE CASCADE,
  invoice_number  INTEGER NOT NULL,
  invoice_prefix  VARCHAR(20) NOT NULL DEFAULT 'INV',
  zatca_uuid      UUID DEFAULT gen_random_uuid(),
  issue_date      DATE DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  subtotal        DECIMAL(12,2) NOT NULL,
  vat_rate        DECIMAL(5,2) DEFAULT 15.00,
  vat_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount    DECIMAL(12,2) NOT NULL,
  qr_payload      TEXT,
  qr_code         TEXT,
  qr_image        TEXT,
  zatca_xml       TEXT,
  zatca_signed_xml TEXT,
  zatca_status    VARCHAR(20) DEFAULT 'PENDING',
  status          VARCHAR(20) DEFAULT 'unpaid',
  paid_at         TIMESTAMPTZ,
  payment_method  VARCHAR(50),
  payment_ref     VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX idx_rental_invoices_lease_id ON rental_invoices(lease_id);
CREATE INDEX idx_rental_invoices_tenant_id ON rental_invoices(tenant_id);

-- Step C: Migrate legacy data (approximate — existing invoices have no VAT breakdown)
INSERT INTO rental_invoices (id, tenant_id, lease_id, invoice_number, invoice_prefix, zatca_uuid, issue_date, due_date, subtotal, vat_rate, vat_amount, total_amount, status, paid_at, payment_method, payment_ref, created_at)
SELECT
  id, tenant_id, lease_id,
  ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) AS invoice_number,
  'INV', gen_random_uuid(), created_at::DATE, due_date,
  amount AS subtotal,
  15.00, ROUND(amount * 15 / 115, 2) AS vat_amount,
  amount AS total_amount,
  status, paid_at, payment_method, payment_ref, created_at
FROM rental_invoices_legacy;

-- Step D: Update tenant counters + prefixes
UPDATE tenants t
SET
  next_invoice_number = (
    SELECT COALESCE(MAX(invoice_number), 0) + 1
    FROM rental_invoices
    WHERE tenant_id = t.id
  ),
  invoice_prefix = 'INV'
WHERE invoice_prefix IS NULL;

-- Step E: Drop legacy table (keep for 1 week, then DROP rental_invoices_legacy)
-- DROP TABLE rental_invoices_legacy; -- manual after verification

-- 4. Contract
ALTER TABLE contracts ADD COLUMN vat_type VARCHAR(20) DEFAULT 'STANDARD';
ALTER TABLE contracts ADD COLUMN vat_rate DECIMAL(5,2) DEFAULT 15.00;

-- 5. Installment
ALTER TABLE installments ADD COLUMN vat_amount DECIMAL(12,2);
```

### 1.7 Rollback SQL

```sql
-- Rollback Sprint 1
ALTER TABLE tenants DROP COLUMN invoice_prefix;
ALTER TABLE tenants DROP COLUMN next_invoice_number;
ALTER TABLE rental_leases DROP COLUMN vat_type;
ALTER TABLE rental_leases DROP COLUMN vat_rate;
ALTER TABLE contracts DROP COLUMN vat_type;
ALTER TABLE contracts DROP COLUMN vat_rate;
ALTER TABLE installments DROP COLUMN vat_amount;

-- Restore old invoices table
DROP TABLE rental_invoices;
ALTER TABLE rental_invoices_legacy RENAME TO rental_invoices;
```

---

## 2. Invoice Model (Final Fields)

### 2.1 Invoice Data Structure (API Response)

```typescript
interface TaxInvoice {
  id: string;
  invoiceNumber: number;      // Sequential: 1001, 1002...
  invoiceLabel: string;       // Formatted: "ORCA-INV-01001"
  zatcaUuid: string;          // UUIDv4
  issueDate: string;          // YYYY-MM-DD
  dueDate: string;            // YYYY-MM-DD

  // Supplier (from Tenant)
  sellerName: string;
  sellerVat: string;
  sellerCr: string;
  sellerAddress: string;

  // Customer (from Lease/Contract)
  customerName: string;
  customerVat?: string;

  // VAT breakdown
  subtotal: number;           // Before VAT
  vatRate: number;            // 15.00 | 0.00
  vatAmount: number;          // subtotal × vatRate/100
  totalAmount: number;        // subtotal + vatAmount

  // ZATCA
  qrCode: string;             // Base64 TLV QR
  zatcaStatus: string;        // PENDING

  // Status
  status: string;             // unpaid | paid | overdue | cancelled
  paidAt: string | null;
  paymentMethod: string | null;

  // Lease reference
  leaseId: string;
  unitName: string;
}
```

### 2.2 Invoice Numbering Convention (Amendment 1)

```
Format:  {prefix}-{year}-{sequential:06d}
Example: INV-2026-000001
         ORCA-2026-000042
         TENANTX-2026-000103
```

**Design:**
- `prefix`: From `tenant.invoicePrefix` (default `INV`, customizable per tenant)
- `year`: From `invoice.issueDate` (e.g., `2026`)
- `sequential`: From `invoice.invoiceNumber` padded to 6 digits (1 → `000001`)
- Stored as: `invoiceNumber` (Int) + `invoicePrefix` (String) – label is computed

**Why this design:**
| Requirement | How it's met |
|-------------|--------------|
| Unique | `UNIQUE(tenantId, invoiceNumber)` enforces per-tenant uniqueness |
| Sequential | Atomic increment via Prisma `$transaction` |
| Multi-tenant safe | Each tenant has their own counter and prefix |
| Customizable | `invoicePrefix` field on Tenant, editable in settings |
| Yearly reset (future) | Add `fiscalYear` counter; reset on year change |
| Scalable | 6 digits = 999,999 invoices per prefix per year |

### 2.3 State Machine

```
                 ┌─────────┐
                 │ PENDING │  (Invoice created, ZATCA not yet submitted)
                 └────┬────┘
                      │
            ┌─────────┴──────────┐
            ▼                    ▼
       ┌─────────┐         ┌──────────┐
       │ REPORTED│         │  FAILED  │  (ZATCA rejected)
       └────┬────┘         └──────────┘
            │                    │
            ▼                    ▼
       ┌─────────┐         Retry → PENDING
       │  PAID   │
       └─────────┘
```

For Sprint 1: Only `unpaid → paid` (ZATCA states are stored but not active until Sprint 2).

---

## 3. VAT Engine Rules

### 3.1 VAT Types

| Type | Code | Rate | When |
|------|------|------|------|
| Standard | `STANDARD` | 15% | All commercial property rent, sales |
| Zero-rated | `ZERO_RATED` | 0% | Export, international transport |
| Exempt | `EXEMPT` | N/A | Residential rent (specific scheme), financial services, insurance |

### 3.2 Calculation Rules

```
IF vatType = 'EXEMPT':
    vatRate   = 0
    vatAmount = 0
    total     = subtotal

IF vatType = 'ZERO_RATED':
    vatRate   = 0
    vatAmount = 0
    total     = subtotal

IF vatType = 'STANDARD':
    vatRate   = 15.00
    vatAmount = ROUND(subtotal × 0.15, 2)
    total     = subtotal + vatAmount
```

### 3.3 Validation Rules

| Rule | Error | Severity |
|------|-------|----------|
| `subtotal > 0` | Subtotal must be positive | BLOCKING |
| `vatRate ∈ {0, 15}` | VAT rate must be 0 or 15 | BLOCKING |
| `vatType ∈ {STANDARD, ZERO_RATED, EXEMPT}` | Invalid VAT type | BLOCKING |
| `vatAmount = ROUND(subtotal × vatRate/100, 2)` | VAT amount mismatch | BLOCKING |
| `totalAmount = subtotal + vatAmount` | Total must equal subtotal + VAT | BLOCKING |
| `vatRate = 0 AND vatAmount = 0` | Zero rate must have zero VAT | WARNING |
| `vatType = STANDARD AND vatRate = 15` | Standard rate must be 15% | WARNING |

### 3.4 Rounding Policy

- All monetary values rounded to 2 decimal places (halalas)
- Use `ROUND(x, 2)` or `Math.round(x * 100) / 100`
- VAT calculated as: `ROUND(subtotal * vatRate / 100, 2)`
- Total calculated as: `ROUND(subtotal + vatAmount, 2)`

---

## 4. QR Strategy (Amendment 3 – Payload Persistence)

### 4.1 Three-Layer Architecture

```
qrPayload (JSON)                    ← Primary source, stored in DB
    │
    ▼
TLV Encoding (Tag-Length-Value)     ← ZATCA standard format
    │
    ▼
qrCode (Base64 string)              ← TLV bytes as base64, stored in DB
    │
    ▼
qrImage (Base64 PNG)                ← QR code image, stored in DB
```

Each invoice stores ALL three layers. `qrPayload` is the source of truth; `qrImage` is generated once and cached.

### 4.2 QR Payload Structure

Stored as JSON in `rental_invoices.qr_payload`:

```json
{
  "sellerName": "ORCA Demo Real Estate",
  "vatNumber": "312345678901234",
  "timestamp": "2026-06-09T14:30:00Z",
  "total": "11500.00",
  "vatTotal": "1500.00"
}
```

All 5 fields are required. No null values allowed.

### 4.3 TLV Format (ZATCA Phase 2)

The QR code contains 5 tags in TLV (Tag-Length-Value) format:

| Tag | Field | Source | Format |
|-----|-------|--------|--------|
| 1 | Seller Name | `qrPayload.sellerName` | UTF-8 string |
| 2 | Seller VAT Number | `qrPayload.vatNumber` | String (15 digits) |
| 3 | Time Stamp | `qrPayload.timestamp` | ISO 8601 (YYYY-MM-DDTHH:mm:ssZ) |
| 4 | Invoice Total | `qrPayload.total` | Decimal string (2 decimal places) |
| 5 | Total VAT | `qrPayload.vatTotal` | Decimal string (2 decimal places) |

### 4.4 Encoding Pipeline

```typescript
// Step 1: Generate payload JSON
function buildQrPayload(params: {
  sellerName: string;
  vatNumber: string;
  total: number;
  vatTotal: number;
}): QrPayload {
  return {
    sellerName: params.sellerName,
    vatNumber: params.vatNumber,
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    total: params.total.toFixed(2),
    vatTotal: params.vatTotal.toFixed(2),
  };
}

// Step 2: Encode TLV tags
function encodeTlv(payload: QrPayload): Buffer {
  const tags = [
    { tag: 1, value: payload.sellerName },
    { tag: 2, value: payload.vatNumber },
    { tag: 3, value: payload.timestamp },
    { tag: 4, value: payload.total },
    { tag: 5, value: payload.vatTotal },
  ];
  return Buffer.concat(tags.map(t => {
    const buf = Buffer.from(t.value, 'utf-8');
    return Buffer.concat([
      Buffer.from([t.tag]),
      Buffer.from([buf.length]),
      buf,
    ]);
  }));
}

// Step 3: Base64 encode TLV → qrCode
const tlvBuffer = encodeTlv(payload);
const qrCode = tlvBuffer.toString('base64');

// Step 4: Generate QR image → qrImage
const qrImage = await QRCode.toDataURL(qrCode, {
  width: 300,
  margin: 2,
  color: { dark: '#000', light: '#fff' },
});
// qrImage is a data URL: "data:image/png;base64,iVBOR..."
```

### 4.5 Database Storage

| Field | Type | Content | Generated At |
|-------|------|---------|-------------|
| `qrPayload` | TEXT (JSON) | `{sellerName, vatNumber, timestamp, total, vatTotal}` | Invoice creation |
| `qrCode` | TEXT | Base64 TLV bytes | Invoice creation |
| `qrImage` | TEXT | Base64 PNG data URL | Invoice creation |

All three are generated once at invoice creation time and stored. No regeneration needed.

### 4.6 Library Choice

| Purpose | Library | Why |
|---------|---------|-----|
| TLV encoding | Manual (`Buffer.concat`) | Simple, standard, no dependencies |
| QR image generation | `qrcode` (npm) | Lightweight, server-side PNG generation |
| QR validation | ZATCA mobile app | Official validator |

---

## 5. API Contract

### 5.1 `POST /api/v1/invoices` (Enhanced)

**Request:**
```json
{
  "leaseId": "uuid-here",
  "subtotal": 10000.00,
  "vatType": "STANDARD",
  "dueDate": "2026-07-01"
}
```

**Response (201):**
```json
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoiceNumber": 1,
    "invoicePrefix": "INV",
    "invoiceLabel": "INV-2026-000001",
    "zatcaUuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "issueDate": "2026-06-09",
    "dueDate": "2026-07-01",
    "sellerName": "ORCA Demo Real Estate",
    "sellerVat": "312345678901234",
    "sellerCr": "1234567890",
    "sellerAddress": "Riyadh, Saudi Arabia",
    "customerName": "Ahmed Ali",
    "subtotal": 10000.00,
    "vatRate": 15.00,
    "vatAmount": 1500.00,
    "totalAmount": 11500.00,
    "qrPayload": {
      "sellerName": "ORCA Demo Real Estate",
      "vatNumber": "312345678901234",
      "timestamp": "2026-06-09T14:30:00Z",
      "total": "11500.00",
      "vatTotal": "1500.00"
    },
    "qrCode": "AQV...TLV-base64...",
    "qrImage": "data:image/png;base64,iVBOR...",
    "zatcaStatus": "PENDING",
    "status": "unpaid",
    "leaseId": "uuid",
    "unitName": "A-101"
  }
}
```

### 5.2 `GET /api/v1/invoices` (Enhanced)

**Response:**
```json
{
  "success": true,
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": 1,
      "invoicePrefix": "INV",
      "invoiceLabel": "INV-2026-000001",
      "zatcaUuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "customerName": "Ahmed Ali",
      "unitName": "A-101",
      "subtotal": 10000.00,
      "vatRate": 15.00,
      "vatAmount": 1500.00,
      "totalAmount": 11500.00,
      "status": "unpaid",
      "issueDate": "2026-06-09",
      "dueDate": "2026-07-01",
      "qrCode": "AQV...base64...",
      "qrImage": "data:image/png;base64,..."
    }
  ]
}
```

### 5.3 `GET /api/v1/invoices/[id]` (Replace Mock)

**Response:**
```json
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoiceNumber": 1,
    "invoicePrefix": "INV",
    "invoiceLabel": "INV-2026-000001",
    "zatcaUuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "issueDate": "2026-06-09",
    "dueDate": "2026-07-01",
    "sellerName": "ORCA Demo Real Estate",
    "sellerVat": "312345678901234",
    "sellerCr": "1234567890",
    "sellerAddress": "Riyadh, Saudi Arabia",
    "customerName": "Ahmed Ali",
    "customerVat": null,
    "subtotal": 10000.00,
    "vatRate": 15.00,
    "vatAmount": 1500.00,
    "totalAmount": 11500.00,
    "qrPayload": {
      "sellerName": "ORCA Demo Real Estate",
      "vatNumber": "312345678901234",
      "timestamp": "2026-06-09T14:30:00Z",
      "total": "11500.00",
      "vatTotal": "1500.00"
    },
    "qrCode": "AQV...base64...",
    "qrImage": "data:image/png;base64,...",
    "zatcaStatus": "PENDING",
    "status": "unpaid",
    "paidAt": null,
    "paymentMethod": null,
    "leaseId": "uuid",
    "unitName": "A-101"
  }
}
```

### 5.4 `POST /api/v1/leases/[id]/invoices` (Replace Mock)

**Request:**
```json
{
  "subtotal": 10000.00,
  "vatType": "STANDARD",
  "dueDate": "2026-07-01"
}
```

**Response (201):** Same as POST /api/v1/invoices

### 5.5 `GET /api/v1/invoices/[id]/qr` (New Endpoint)

Returns QR code as PNG image.

```
GET /api/v1/invoices/[id]/qr
→ Content-Type: image/png
→ Binary PNG data of QR code
```

### 5.6 `GET /api/v1/invoices/[id]/pdf` (New Endpoint)

Returns HTML page formatted as printable tax invoice.

```
GET /api/v1/invoices/[id]/pdf
→ Content-Type: text/html
→ Print-friendly invoice template
```

---

## 6. File Structure (Sprint 1)

### 6.1 New Files

| File | Purpose |
|------|---------|
| `lib/vat/engine.ts` | VAT calculation engine (calculateVat, validateVat) |
| `lib/vat/types.ts` | VAT types (VatType enum, VatBreakdown interface) |
| `lib/zatca/qr.ts` | TLV QR generator |
| `lib/zatca/types.ts` | ZATCA shared types |
| `app/api/v1/invoices/[id]/qr/route.ts` | QR image endpoint |
| `app/api/v1/invoices/[id]/pdf/route.ts` | Invoice PDF (HTML template) |

### 6.2 Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add all new columns + models |
| `app/api/v1/invoices/route.ts` | VAT calculation, invoice numbering, QR generation |
| `app/api/v1/invoices/[id]/route.ts` | Replace mock with real DB query |
| `app/api/v1/leases/[id]/invoices/route.ts` | Replace mock with real logic |
| `app/operations/rental/page.tsx` | Show VAT breakdown, invoice label, QR, download link |

### 6.3 Deleted/Mocked Files

| File | Action |
|------|--------|
| `app/api/v1/invoices/[id]/route.ts` (current) | Replace (was hardcoded mock) |
| `app/api/v1/leases/[id]/invoices/route.ts` (current) | Replace (was random ID mock) |

---

## 7. UI Screens (Changes)

### 7.1 Invoice List (rental page – invoicing pane)

Current: Shows `id`, `contractId`, `due`, `amount`, `status`  
After: Shows `invoiceLabel`, `customerName`, `unitName`, `subtotal`, `vatAmount`, `totalAmount`, `status`, QR icon, PDF icon

### 7.2 Invoice Creation Modal

Current: `contractId`, `amount`, `dueDate` inputs + enableZakat toggle  
After: `lease` selector, `subtotal` input, `vatType` dropdown (STANDARD/ZERO_RATED/EXEMPT), `dueDate` input. Auto-calculate and display:
- Subtotal: 10,000.00 SAR
- VAT (15%): 1,500.00 SAR
- Total: 11,500.00 SAR

### 7.3 Invoice Detail View (new)

A detail panel/sheet showing:

```
┌──────────────────────────────────────┐
│    INV-2026-000001                   │
│    Standard Tax Invoice              │
│    الحالة: غير مدفوعة                │
│                                      │
│  البائع (Seller):                    │
│  ORCA Demo Real Estate               │
│  الرقم الضريبي: 312345678901234      │
│  السجل التجاري: 1234567890           │
│                                      │
│  العميل (Customer):                  │
│  Ahmed Ali                           │
│                                      │
│  الوحدة: A-101                       │
│  تاريخ الإصدار: 2026-06-09           │
│  تاريخ الاستحقاق: 2026-07-01         │
│                                      │
│  ----------------------------------  │
│  Subtotal (قبل الضريبة)  10,000.00   │
│  VAT 15% (ضريبة القيمة)   1,500.00   │
│  ─────────────────────────────       │
│  TOTAL (الإجمالي)        11,500.00   │
│  ----------------------------------  │
│                                      │
│  ┌──────────────────────────────┐    │
│  │         [QR Code]            │    │
│  │     Scan with ZATCA app      │    │
│  └──────────────────────────────┘    │
│                                      │
│  UUID: a1b2c3d4-e5f6-7890-abcd...   │
│                                      │
│  [📄 تحميل PDF / Download PDF]       │
└──────────────────────────────────────┘
```

### 7.4 QR Code Display

- Shown as image in invoice detail
- Generated via `GET /api/v1/invoices/[id]/qr` or inline using `qrcode` library
- Scannable by ZATCA mobile app

---

## 8. Migration Safety

### 8.1 Does it break existing data?

| Change | Breaks? | Mitigation |
|--------|---------|------------|
| `tenants.next_invoice_number` | No | Default 1001, existing tenants get sequential assignment |
| `rental_leases.vat_type` | No | Default 'STANDARD' for all existing leases |
| `rental_leases.vat_rate` | No | Default 15.00 for all existing leases |
| `rental_invoices` rebuild | **YES** | Migration copies data with backward VAT calculation |
| `contracts.vat_type` | No | Default 'STANDARD' |
| `contracts.vat_rate` | No | Default 15.00 |
| `installments.vat_amount` | No | NULL for existing installments |

### 8.2 Legacy Data Migration (RentalInvoice)

Existing invoices had a single `amount` field that represented the total (including VAT in most cases). The migration extracts VAT from the total:

```sql
-- For invoices where amount is total-with-VAT:
subtotal  = ROUND(amount * 100 / 115, 2)  -- Extract base
vatAmount = ROUND(amount * 15 / 115, 2)   -- Extract VAT
total     = amount                         -- Keep original total
```

**Limitation:** If some existing invoices were entered without VAT, the backward calculation will show slightly different subtotal/VAT. This is acceptable because:
1. These are historical records (not new ZATCA-submitted invoices)
2. The total amount remains unchanged
3. The VAT amounts can be corrected manually if needed

### 8.3 Zero-Downtime Migration Strategy

```
Step 1: Run migration SQL (non-blocking ALTER TABLE ADD COLUMN)
Step 2: Deploy new code (handles NULL vat fields gracefully)
Step 3: Run data backfill script (assigns invoice numbers)
Step 4: Deploy final code (requires new fields)
```

Old code continues to work because:
- New columns have defaults (NULL allowed for transitional period)
- New invoice creation via old code creates minimal records → backfilled later

---

## 9. Rollback Plan

### 9.1 When to Rollback

Trigger conditions:
- Invoice creation returns 500 errors
- Invoice numbers are duplicated
- QR code generation fails
- VAT calculation produces incorrect totals (> 1 halala rounding error)

### 9.2 Rollback Steps

```bash
# 1. Revert code
git revert HEAD --no-commit  # Revert Sprint 1 changes
git commit -m "rollback: revert Sprint 1 VAT changes"

# 2. Revert database
psql $DATABASE_URL -f rollback-sprint1.sql

# 3. Verify
curl GET /api/v1/invoices/  # Should return old format
curl POST /api/v1/invoices/ -d '{"leaseId":"x","amount":10000,"due":"2026-07-01"}'
# Should work without VAT fields

# 4. Notify team
echo "Sprint 1 rolled back. Reason: [reason]"
```

### 9.3 Rollback SQL

See Section 1.7 above.

---

## 10. Success Criteria (Sprint 1)

At the end of Sprint 1, the following flow must work end-to-end:

```
1. Admin has Tenant with: companyName, vatNumber, commercialRegistry, invoicePrefix
2. Admin creates a RentalLease with vatType and vatRate
3. Admin creates an Invoice via:
   - POST /api/v1/invoices
   - POST /api/v1/leases/[id]/invoices
4. Invoice is created with:
   ✅ Invoice label: INV-2026-000001 (prefix-year-sequential)
   ✅ Invoice number is sequential per tenant (1, 2, 3...)
   ✅ UUID generated at creation (a1b2c3d4-...)
   ✅ VAT breakdown (subtotal, vatRate, vatAmount, totalAmount)
   ✅ QR Payload stored as JSON {sellerName, vatNumber, timestamp, total, vat}
   ✅ QR Code stored as TLV base64
   ✅ QR Image stored as base64 PNG
   ✅ Status = "unpaid"
5. Invoice can be retrieved via:
   ✅ GET /api/v1/invoices → list with QR
   ✅ GET /api/v1/invoices/[id] → full detail with qrPayload + qrImage
   ✅ GET /api/v1/invoices/[id]/qr → QR image (PNG)
   ✅ GET /api/v1/invoices/[id]/pdf → print view
6. UI shows:
   ✅ Invoice label (INV-2026-000001) in list and detail
   ✅ VAT breakdown on invoice creation
   ✅ QR code image displayed
   ✅ Download PDF link
   ✅ UUID visible in invoice detail
```

### Scorecard Progress

```
ZATCA:       1/10 → 5/10  ✅ (+4)
  - Invoice structure  +1
  - VAT calculation    +1
  - Invoice numbering  +1
  - QR code            +1
  - (missing: XML, signature, API - Sprint 2)

Payments:    6/10 → 6/10  (no change)
Accounting:  3/10 → 4/10  (+1 for invoice structure)

Financial Readiness: 3/10 → 5/10  ✅
```

---

## 11. Acceptance Test Script

```typescript
// Acceptance test: Sprint 1
async function testSprint1() {
  // 1. Create lease
  const leaseRes = await fetch('/api/v1/leases/', {
    method: 'POST',
    body: JSON.stringify({ unit: 'Test-Unit', tenant: 'Test Customer', start: '2026-01-01', end: '2026-12-31', rent: 10000 })
  });
  const lease = await leaseRes.json();
  assert(lease.success);

  // 2. Create invoice with STANDARD VAT
  const invRes = await fetch('/api/v1/invoices/', {
    method: 'POST',
    body: JSON.stringify({ leaseId: lease.lease.id, subtotal: 10000, vatType: 'STANDARD', dueDate: '2026-07-01' })
  });
  const inv = await invRes.json();
  assert(inv.success);
  assert(inv.invoice.invoiceNumber >= 1);
  assert(inv.invoice.invoicePrefix === 'INV');
  assert(inv.invoice.invoiceLabel === `INV-2026-${String(inv.invoice.invoiceNumber).padStart(6, '0')}`);
  assert(inv.invoice.zatcaUuid.length > 0);        // UUID generated
  assert(inv.invoice.vatAmount === 1500.00);        // 15% of 10000
  assert(inv.invoice.totalAmount === 11500.00);     // subtotal + vat
  assert(inv.invoice.qrPayload !== null);            // QR payload stored
  assert(inv.invoice.qrPayload.total === '11500.00');
  assert(inv.invoice.qrCode.length > 0);             // TLV base64 stored
  assert(inv.invoice.qrImage.length > 0);            // QR image stored
  assert(inv.invoice.status === 'unpaid');

  // 3. Create invoice with ZERO_RATED VAT
  const invZero = await fetch('/api/v1/invoices/', {
    method: 'POST',
    body: JSON.stringify({ leaseId: lease.lease.id, subtotal: 5000, vatType: 'ZERO_RATED', dueDate: '2026-08-01' })
  });
  const zero = await invZero.json();
  assert(zero.success);
  assert(zero.invoice.vatAmount === 0);
  assert(zero.invoice.totalAmount === 5000);
  assert(zero.invoice.invoiceNumber === 2);          // Sequential: second invoice

  // 4. Get invoice by ID
  const getRes = await fetch(`/api/v1/invoices/${inv.invoice.id}`);
  const get = await getRes.json();
  assert(get.success);
  assert(get.invoice.qrPayload.sellerName.length > 0);

  // 5. Get QR image
  const qrRes = await fetch(`/api/v1/invoices/${inv.invoice.id}/qr`);
  assert(qrRes.ok);
  assert(qrRes.headers.get('content-type') === 'image/png');

  // 6. Get PDF
  const pdfRes = await fetch(`/api/v1/invoices/${inv.invoice.id}/pdf`);
  assert(pdfRes.ok);
  assert(pdfRes.headers.get('content-type') === 'text/html');

  // 7. Invoice list contains all invoices
  const listRes = await fetch('/api/v1/invoices/');
  const list = await listRes.json();
  assert(list.success);
  assert(list.invoices.length >= 2);

  return 'All Sprint 1 tests passed ✅';
}
```
