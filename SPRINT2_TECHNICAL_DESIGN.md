# Sprint 2 – ZATCA Phase 2 Full Compliance – Technical Design

## Architecture Review (Sprint 1 Outputs)

### VAT Engine (`lib/vat/`)
- **Reuse as-is**: `calculateVat`, `validateVatInput`, `validateVatBreakdown`
- STANDARD 15%, ZERO_RATED 0%, EXEMPT 0% — fully compliant with ZATCA
- No changes required

### Invoice Model (`prisma/schema.prisma → RentalInvoice`)
- UUID strategy: `zatcaUuid @default(uuid())` — correct for ZATCA
- Invoice numbering: per-tenant atomic counter — correct
- `zatcaStatus` field exists at `PENDING` default — needs enum expansion
- Missing: `previousInvoiceHash`, `zatcaResponse`, `zatcaError`, `deviceId`
- **Action**: Add fields for PIH, compliance statuses, ZATCA metadata

### QR Payload (`lib/zatca/qr.ts`)
- TLV encoding with 5 ZATCA tags (1–5) — fully compliant
- Seller name, VAT number, timestamp, total, vatTotal
- **No changes required**

### PDF Engine (`app/api/v1/invoices/[id]/pdf/route.ts`)
- Basic HTML tax invoice with QR, VAT breakdown, print button
- **Action**: Add ZATCA UUID display, PIH reference, submission timestamp

---

## Sprint 2 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Invoice Created                       │
│              (Sprint 1: VAT + QR + UUID)                │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Phase 9: Validation Layer                   │
│  VatNumber │ UUID │ InvoiceNumber │ Totals │ HashChain  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Phase 2: XML Generator                      │
│  UBL 2.1 + ZATCA Extensions → unsigned XML              │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Phase 3: PIH Generator                      │
│  SHA-256(Previous Invoice XML) → chain                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Phase 4: Digital Signature                  │
│  ECDSA secp256k1 → XAdES-BES → signed XML               │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
               ┌──────┴──────┐
               ▼              ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Phase 5: Reporting  │  │  Phase 6: Clearance  │
│  API (Standard)     │  │  API (Simplified)    │
│  POST /api/v1/zatca │  │  POST /api/v1/zatca  │
│  /report            │  │  /clearance          │
└─────────┬───────────┘  └──────────┬────────────┘
          │                         │
          ▼                         ▼
┌─────────────────────────────────────────────┐
│         Phase 7: Retry & Queue System        │
│  Persist → Retry → Log → Status Update      │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│         Phase 8: Compliance Dashboard        │
│  Sent │ Cleared │ Rejected │ Pending │ Error │
└─────────────────────────────────────────────┘

Tenant Device Management (Phase 4):
┌─────────────────────────────────────────────┐
│  CSR → ZATCA CSID → Compliance Certificate │
│  CSR → ZATCA PCSID → Production Certificate │
│  (Encrypted storage)                        │
└─────────────────────────────────────────────┘
```

---

## Database Schema Changes

### RentalInvoice (existing model, add/modify fields)

| Field | Type | Change | Purpose |
|-------|------|--------|---------|
| `zatcaStatus` | String @default("DRAFT") | Modify default & enum | New: DRAFT, ISSUED, REPORTED, CLEARED, REJECTED, ERROR |
| `previousInvoiceHash` | String? | New | SHA-256 of previous invoice UBL XML |
| `zatcaXml` | String? | Exists | Unsigned UBL XML |
| `zatcaSignedXml` | String? | Exists | Signed UBL XML |
| `zatcaResponse` | String? | New | Raw JSON response from ZATCA API |
| `zatcaClearedAt` | DateTime? | New | When ZATCA cleared the invoice |
| `zatcaError` | String? | New | Last ZATCA error message |
| `invoiceTypeCode` | String @default("388") | New | 388=tax invoice, 381=simplified |

### New Model: ZatcaDevice

| Field | Type | Purpose |
|-------|------|---------|
| id | String @uuid | Primary key |
| tenantId | String (FK) | Tenant owner |
| deviceName | String | Human-readable name |
| deviceType | String | 'COMPLIANCE' or 'PRODUCTION' |
| csr | String? (encrypted) | Certificate Signing Request |
| complianceCert | String? (encrypted) | Compliance test certificate |
| productionCert | String? (encrypted) | Production certificate |
| privateKey | String (encrypted) | ECDSA secp256k1 private key |
| publicKey | String | ECDSA secp256k1 public key |
| status | String | ACTIVE, EXPIRED, REVOKED |
| expiresAt | DateTime? | Certificate expiry |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update |

### New Model: ZatcaQueue

| Field | Type | Purpose |
|-------|------|---------|
| id | String @uuid | Primary key |
| tenantId | String (FK) | Tenant owner |
| invoiceId | String (FK) | Referenced invoice |
| action | String | 'REPORT' or 'CLEAR' |
| status | String | PENDING, PROCESSING, COMPLETED, FAILED |
| retryCount | Int @default(0) | Current retry attempt |
| maxRetries | Int @default(5) | Maximum retry attempts |
| lastError | String? | Last error message |
| nextRetryAt | DateTime? | When to retry next |
| payload | String? | Serialized request payload |
| response | String? | Serialized response |
| createdAt | DateTime | Creation timestamp |
| completedAt | DateTime? | Completion timestamp |

---

## Phase 2: XML Generator (`lib/zatca/xml/`)

### Files

| File | Purpose |
|------|---------|
| `xml-types.ts` | Interfaces for XML data structure |
| `xml-generator.ts` | UBL 2.1 XML builder |
| `xml-validator.ts` | XML schema validation |

### XML Structure

```
Invoice (UBL 2.1)
├── UBLVersionID (2.1)
├── CustomizationID (INVOICE)
├── ProfileID (reporting:1.0 / clearance:1.0)
├── ID (invoice number with prefix)
├── IssueDate
├── IssueTime
├── InvoiceTypeCode (388/381)
├── Note
├── DocumentCurrencyCode (SAR)
├── TaxPointDate
├── InvoicePeriod
├── AccountingSupplierParty
│   └── Party
│       ├── PartyIdentification (VAT number)
│       ├── PartyLegalEntity (company name)
│       └── PostalAddress (national address)
├── AccountingCustomerParty
│   └── Party
│       ├── PartyIdentification (VAT number / CRN)
│       └── PartyLegalEntity (customer name)
├── Delivery
├── PaymentMeans
├── TaxTotal
│   ├── TaxAmount (total VAT)
│   └── TaxSubtotal
│       ├── TaxAmount
│       ├── TaxCategory
│       │   ├── ID (S=standard, Z=zero, E=exempt)
│       │   ├── Percent (15.00)
│       │   └── TaxScheme
│       └── TaxableAmount (subtotal)
├── LegalMonetaryTotal
│   ├── LineExtensionAmount (total before VAT)
│   ├── TaxExclusiveAmount (subtotal)
│   ├── TaxInclusiveAmount (total)
│   └── PayableAmount (total)
├── InvoiceLine
│   ├── ID (1)
│   ├── InvoicedQuantity
│   ├── LineExtensionAmount
│   ├── TaxTotal
│   └── Item
│       ├── Name
│       └── ClassifiedTaxCategory
│           ├── ID
│           ├── Percent
│           └── TaxScheme
├── Signature (xades:Signature)
│   ├── SignedSignatureProperties
│   │   ├── SigningTime
│   │   └── SigningCertificate
│   ├── SignedDataObjectProperties
│   │   └── DataObjectFormat
│   └── extension:UBLExtensions
│       └── extension:UBLExtension
│           ├── extension:ExtensionURI
│           └── extension:ExtensionContent
│               └── InvoiceHash
│               └── PreviousInvoiceHash (PIH)
```

### ZATCA Tax Categories

| VatType | TaxCategory ID | Percent | Description |
|---------|---------------|---------|-------------|
| STANDARD | S | 15.00 | Standard rate |
| ZERO_RATED | Z | 0.00 | Zero rated |
| EXEMPT | E | 0.00 | Exempt |

### Invoice Type Codes

| Code | Type | Usage |
|------|------|-------|
| 388 | Tax Invoice (Standard) | Reporting API |
| 381 | Simplified Invoice | Clearance API |

### Profile IDs

| Profile | Usage |
|---------|-------|
| `reporting:1.0` | Standard invoices → Reporting API |
| `clearance:1.0` | Simplified invoices → Clearance API |

---

## Phase 3: PIH (Previous Invoice Hash)

### Algorithm

```
PIH = SHA-256(Hash of Previous Invoice's Signed UBL XML)
```

### Implementation

```typescript
function computeInvoiceHash(xml: string): string {
  return crypto.createHash('sha256').update(xml, 'utf-8').digest('hex').toUpperCase();
}
```

### Chaining

- First invoice: PIH = all zeros hash (`0000000000000000000000000000000000000000000000000000000000000000`)
- Each subsequent invoice: PIH = hash of previous invoice's signed XML
- PIH stored in `RentalInvoice.previousInvoiceHash`
- PIH embedded in UBL XML under `extension:UBLExtension/PreviousInvoiceHash`

### Scope

- Per-tenant: each tenant has their own chain
- Invoice ordering: by `createdAt` ASC within tenant
- Stored in `rental_invoices.previous_invoice_hash`

---

## Phase 4: Device Registration

### Entity: `ZatcaDevice`

### Certificate Lifecycle

1. **Key Generation**: ECDSA secp256k1 key pair (Node `crypto.generateKeyPairSync`)
2. **CSR Generation**: X.509 CSR with tenant info (O=companyName, CN=deviceName)
3. **CSID API Call**: `POST /compliance/CSID` to ZATCA sandbox
4. **Certificate Storage**: Encrypted AES-256-GCM + base64
5. **Production PCSID**: `POST /production/CSID` with compliance cert

### Encryption

```typescript
function encrypt(value: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  // ... returns iv + authTag + ciphertext (all base64)
}
```

Encryption key: derived from `ENCRYPTION_KEY` env var + tenant ID salt.

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/zatca/device` | POST | Register new device |
| `/api/v1/zatca/device` | GET | List devices |
| `/api/v1/zatca/device/[id]` | DELETE | Remove device |
| `/api/v1/zatca/csid` | POST | Submit CSR to ZATCA CSID |
| `/api/v1/zatca/pcsid` | POST | Get production certificate |

---

## Phase 5 & 6: Reporting & Clearance APIs

### ZATCA API Endpoints

| Environment | Endpoint |
|-------------|---------|
| Sandbox Reporting | `https://gw-fatoora.zatca.gov.sa:3001/api/v1/invoices/reporting/single` |
| Production Reporting | `https://gw-fatoora.zatca.gov.sa/api/v1/invoices/reporting/single` |
| Sandbox Clearance | `https://gw-fatoora.zatca.gov.sa:3001/api/v1/invoices/clearance/single` |
| Production Clearance | `https://gw-fatoora.zatca.gov.sa/api/v1/invoices/clearance/single` |
| Sandbox CSID | `https://gw-fatoora.zatca.gov.sa:3001/api/v1/compliance/CSID` |
| Production CSID | `https://gw-fatoora.zatca.gov.sa/api/v1/compliance/CSID` |

### Our API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/zatca/submit/[id]` | POST | Submit invoice to ZATCA (auto-detects report vs clearance) |
| `/api/v1/zatca/status/[id]` | GET | Get ZATCA submission status |
| `/api/v1/zatca/queue` | GET | List queue items |

### Submission Flow

1. Generate XML (Phase 2)
2. Compute PIH (Phase 3)
3. Sign XML (ECDSA → XAdES-BES)
4. Validate (Phase 9)
5. Determine: standard → Reporting API, simplified → Clearance API
6. POST signed XML to ZATCA
7. Parse response, persist status
8. On failure: push to Queue (Phase 7)

---

## Phase 7: Retry & Queue System

### Queue Model (`ZatcaQueue`)

```
PENDING → PROCESSING → COMPLETED
  ↓          ↓
RETRYING    FAILED
  ↓
PENDING (after delay)
```

### Retry Strategy

- Exponential backoff: 5s, 15s, 45s, 135s, 405s
- Max retries: 5
- After max retries: status = `FAILED`, manual intervention required

### API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/zatca/queue` | GET | List queue |
| `/api/v1/zatca/queue/[id]/retry` | POST | Manual retry |
| `/api/v1/zatca/queue/[id]/cancel` | POST | Cancel queue item |

### Cron Job

A periodic job (`/api/cron/zatca`) processes queued items:
1. Query `ZatcaQueue` where `status=PENDING AND (nextRetryAt IS NULL OR nextRetryAt <= NOW())`
2. Process each item (regenerate XML if needed, submit)
3. Update status

---

## Phase 8: Compliance Dashboard

### Route: `/operations/compliance` or `/operations/zatca`

### Components

| Component | Data Source | Purpose |
|-----------|-------------|---------|
| Status Summary | Aggregate `RentalInvoice.zatcaStatus` | DRAFT/ISSUED/REPORTED/CLEARED/REJECTED/ERROR counts |
| Queue Monitor | Aggregate `ZatcaQueue` | Pending/Processing/Failed/Completed counts |
| Device Status | `ZatcaDevice` | Active devices, expiry dates |
| Recent Activity | Top 20 invoices by updatedAt | Invoice number, status, timestamp |
| Error List | Recent failed queue items | Error messages, retry buttons |

### API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/zatca/dashboard` | GET | Aggregated compliance stats |
| `/api/v1/zatca/activity` | GET | Recent compliance activity |

---

## Phase 9: Validation Layer

### File: `lib/zatca/validate.ts`

### Validations

| Validation | Logic |
|-----------|-------|
| `validateVatNumber` | Format: 3XXX-XXX-XXXXXXX (15 digits) |
| `validateUuid` | Standard UUID v4 format |
| `validateInvoiceNumber` | Positive integer, unique per tenant |
| `validateTotals` | subtotal + vatAmount = totalAmount (±0.01) |
| `validateHashChain` | Previous invoice hash matches stored PIH |
| `validateInvoiceDate` | Issue date not in future |
| `validateLineItems` | Sum of line amounts matches total |

---

## Phase 10: Security Review

### Encryption

- AES-256-GCM for stored private keys, certificates, CSRs
- Key derived from `ENCRYPTION_KEY` env var (64 hex chars = 256 bits)
- Unique IV per encryption operation
- Auth tag validation on decryption

### Access Control

- Device management: only ADMIN role
- ZATCA submission: SALES_MANAGER+ (configurable)
- View dashboard: all roles

### Secrets Management

- `ENCRYPTION_KEY`: 256-bit hex, stored in env
- `ZATCA_SANDBOX_MODE`: boolean toggle
- Private keys: never logged, never returned in API responses

### Audit Trail

All ZATCA submissions logged in `audit_logs` table (already configured in Sprint 1 Prisma middleware)

---

## Implementation Order

1. Database schema updates (Prisma + migration SQL)
2. Phase 2: XML Generator (`lib/zatca/xml/`)
3. Phase 3: PIH (`lib/zatca/pih.ts`)
4. Phase 4: Device Registration (`lib/zatca/device.ts`)
5. Phase 9: Validation Layer (`lib/zatca/validate.ts`)
6. Phase 5 & 6: Reporting + Clearance (`lib/zatca/api.ts`, API routes)
7. Phase 7: Retry & Queue (`lib/zatca/queue.ts`, API routes)
8. Phase 8: Compliance Dashboard (API route + UI)
9. Phase 10: Security Review (`ZATCA_SECURITY_REVIEW.md`)
10. Integration: wire everything into invoice creation/submission flow
11. Acceptance tests
12. Reports

---

## Scope Freeze Confirmation

### ✅ Included
- XML generator (UBL 2.1 + ZATCA extensions)
- PIH (hash chain)
- UUID validation
- CSR generator
- Device registration + certificate management
- Reporting API (standard invoices)
- Clearance API (simplified invoices)
- Retry queue with exponential backoff
- Compliance dashboard
- Pre-submission validation layer
- Security review

### ❌ Excluded (Sprint 3+)
- Double entry accounting
- Journal entries
- Chart of accounts
- Trial balance
- Balance sheet
- Profit & loss
- Aging reports
- Refund workflow
- Payment refactor
- Moyasar refactor
- Collections refactor
