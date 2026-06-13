# ORCA CRM – Financial Recovery Sprint Plan

**Target:** Accounting 8/10 – Payments 8/10 – ZATCA 8/10  
**Baseline:** Accounting 3/10 – Payments 6/10 – ZATCA 1/10  
**Strategy:** Minimum effort, maximum compliance impact, zero bloat  
**Constraint:** No new features outside accounting/payments/ZATCA scope  
**Total effort:** 24–34 days (4 sprints × 6–8 days)

---

## Phase 1: Architecture Review (Current State)

### 1.1 Financial Database Tables (11 tables)

| # | Table | Model | Purpose | Verdict |
|---|-------|-------|---------|---------|
| 1 | `tenants` | `Tenant` | Company info, VAT, credentials, subscription | **KEEP** – add vatRate, nextInvoiceNumber |
| 2 | `contracts` | `Contract` | Sales contracts (buyer, volume) | **KEEP** – add vatRate override, invoiceRef |
| 3 | `installments` | `Installment` | Payment schedule per contract | **KEEP** – add paidAmount, vatAmount |
| 4 | `rental_leases` | `RentalLease` | Rental agreements | **KEEP** – same VAT additions |
| 5 | `rental_invoices` | `RentalInvoice` | Rental invoices | **REFACTOR** → full tax invoice |
| 6 | `receipts` | `Receipt` | Payment receipts | **REFACTOR** → link to invoice + ledger |
| 7 | `general_ledger` | `GeneralLedger` | Single-entry bookkeeping | **REFACTOR** → double-entry with accountCode |
| 8 | `payroll_commissions` | `PayrollCommission` | Sales commissions | **KEEP** – already solid |
| 9 | `agent_telemetry_logs` | `AgentTelemetryLog` | Agent logs | **KEEP** – already solid |
| 10 | `audit_logs` | `AuditLog` | Audit trail | **KEEP** – already solid |
| 11 | `agent_leases` | `AgentLease` | AI agent contracts | **KEEP** – no change |

### 1.2 Financial API Routes (6 routes)

| # | Route | Method | Current State | Verdict |
|---|-------|--------|---------------|---------|
| 1 | `/api/v1/invoices` | GET/POST | CRUD for RentalInvoice | **REFACTOR** – add VAT fields |
| 2 | `/api/v1/invoices/[id]` | GET | **MOCK** – hardcoded data | **REPLACE** – real DB query |
| 3 | `/api/v1/invoices/[id]/pay` | POST | **MOCK** – random payment ID | **REPLACE** – real payment + receipt + ledger |
| 4 | `/api/payment/callback` | GET | Moyasar callback (real+mock) | **KEEP** – already works |
| 5 | `/api/accounting/settle-lease` | POST | **MOCK** – random settlement ID | **DELETE** – replace with real endpoint |
| 6 | `/api/v1/reconciliation/upload` | POST | **MOCK** – hardcoded matches | **DELETE** – V2 (not needed for pilot) |

### 1.3 Financial Server Actions (7 files)

| # | File | Current State | Verdict |
|---|------|---------------|---------|
| 1 | `app/actions/payment.ts` | Moyasar subscription + addon (real+mock) | **KEEP** – already solid |
| 2 | `app/actions/finance.ts` | `processPayment` – creates Receipt + GL entry | **REFACTOR** – double-entry posting |
| 3 | `app/actions/accounting.ts` | `getLedgerEntriesAction`, `getErpStatsAction` | **REFACTOR** – use real GL accounts |
| 4 | `app/actions/compliance.ts` | ZATCA credential storage + compliance check | **KEEP** – add actual ZATCA API calls |
| 5 | `app/actions/billingAgent.ts` | Subscription activation + SMS/email | **KEEP** – already solid |
| 6 | `app/actions/sanadAgent.ts` | Installment reminder WhatsApp | **KEEP** – already solid |
| 7 | `app/actions/ejar.ts` | Payroll commissions CRUD | **KEEP** – already solid |

### 1.4 Financial UI Components (3 files)

| # | Component | Current State | Verdict |
|---|-----------|---------------|---------|
| 1 | `components/settings/SettingsBilling.tsx` | Subscription pricing + upgrade | **KEEP** – add VAT display on prices |
| 2 | `components/settings/SettingsCompliance.tsx` | ZATCA credentials + compliance checklist | **KEEP** – add invoice preview |
| 3 | `components/properties/PropertyDetail.tsx` | Handover settlement + price sim | **REFACTOR** – real accounting link |

---

## Phase 2: VAT Engine

### 2.1 VAT Rules

| Type | Rate | When |
|------|------|------|
| Standard | 15% | Default for all sales and rentals |
| Zero-rated | 0% | Export, international transport, etc. |
| Exempt | N/A | Residential rent (if under specific scheme), financial services |

### 2.2 Database Changes

**On `Tenant` table (existing):**
```
vatNumber: String?     ✅ already exists
commercialRegistry: String?  ✅ already exists
```

**On `Contract` table (new fields):**
```
vatType: String?       @default("STANDARD")  // STANDARD | ZERO_RATED | EXEMPT
vatRate: Decimal?      @default(15.00)
vatAmount: Decimal?    // calculated on invoice
```

**On `RentalLease` table (new fields):**
```
vatType: String?       @default("STANDARD")
vatRate: Decimal?      @default(15.00)
```

**On `RentalInvoice` table (new fields):**
```
subtotal: Decimal      // before VAT
vatRate: Decimal       @default(15.00)
vatAmount: Decimal     // calculated
totalWithVat: Decimal  // subtotal + vat
invoiceNumber: Int     // sequential per tenant
zatcaUuid: String?     // ZATCA invoice UUID
qrCode: String?        // base64 QR
zatcaStatus: String?   @default("PENDING") // PENDING | REPORTED | CLEARED
zatcaXml: String?      // stored XML
zatcaSignedXml: String? // signed XML
```

**On `Installment` table (new fields):**
```
vatAmount: Decimal?    // VAT portion of installment
```

### 2.3 Calculation Logic

```
subtotal = lineItems sum (or contract total / installments)
vatAmount = subtotal × (vatRate / 100)
totalWithVat = subtotal + vatAmount

For ZERO_RATED: vatAmount = 0
For EXEMPT: vatAmount = 0, vatRate = 0
```

### 2.4 Migration Plan

```sql
-- Phase 2 migration
ALTER TABLE contracts ADD COLUMN vat_type VARCHAR(20) DEFAULT 'STANDARD';
ALTER TABLE contracts ADD COLUMN vat_rate DECIMAL(5,2) DEFAULT 15.00;
ALTER TABLE contracts ADD COLUMN vat_amount DECIMAL(12,2);

ALTER TABLE rental_leases ADD COLUMN vat_type VARCHAR(20) DEFAULT 'STANDARD';
ALTER TABLE rental_leases ADD COLUMN vat_rate DECIMAL(5,2) DEFAULT 15.00;

ALTER TABLE rental_invoices ADD COLUMN subtotal DECIMAL(12,2);
ALTER TABLE rental_invoices ADD COLUMN vat_rate DECIMAL(5,2) DEFAULT 15.00;
ALTER TABLE rental_invoices ADD COLUMN vat_amount DECIMAL(12,2);
ALTER TABLE rental_invoices ADD COLUMN total_with_vat DECIMAL(12,2);
ALTER TABLE rental_invoices ADD COLUMN invoice_number INTEGER;
ALTER TABLE rental_invoices ADD COLUMN zatca_uuid VARCHAR(64);
ALTER TABLE rental_invoices ADD COLUMN qr_code TEXT;
ALTER TABLE rental_invoices ADD COLUMN zatca_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE rental_invoices ADD COLUMN zatca_xml TEXT;
ALTER TABLE rental_invoices ADD COLUMN zatca_signed_xml TEXT;

ALTER TABLE installments ADD COLUMN vat_amount DECIMAL(12,2);

-- Tenant-level counter for sequential invoice numbers
ALTER TABLE tenants ADD COLUMN next_invoice_number INTEGER DEFAULT 1001;
```

---

## Phase 3: Saudi Tax Invoice Engine

### 3.1 Invoice Data Model (Per ZATCA Requirements)

| ZATCA Field | DB Field | Source |
|-------------|----------|--------|
| Invoice UUID | `rental_invoices.zatca_uuid` | Generated as UUIDv4 |
| Invoice Number | `rental_invoices.invoice_number` | Auto-increment per tenant |
| Issue Date | `rental_invoices.created_at` | Auto |
| Due Date | `rental_invoices.due_date` | From lease |
| Seller Name | `tenants.company_name` | From tenant |
| Seller VAT | `tenants.vat_number` | From tenant |
| Seller CR | `tenants.commercial_registry` | From tenant |
| Seller Address | `tenants.national_address` | From tenant |
| Buyer Name | `rental_leases.tenant_name` / `contracts.buyer_name` | From lease/contract |
| Buyer VAT | (optional) | Customer input |
| Line Items | Invoice line items | Unit description + amount |
| Subtotal | `rental_invoices.subtotal` | Calculated |
| VAT Rate | `rental_invoices.vat_rate` | 15% default |
| VAT Amount | `rental_invoices.vat_amount` | Calculated |
| Total | `rental_invoices.total_with_vat` | Calculated |
| QR Code | `rental_invoices.qr_code` | Generated (TLV format) |
| XML | `rental_invoices.zatca_xml` | Generated XML |
| Signed XML | `rental_invoices.zatca_signed_xml` | Digitally signed |
| Status | `rental_invoices.zatca_status` | PENDING → REPORTED/CLEARED |

### 3.2 Sequential Invoice Number

Per-tenant counter stored in `tenants.next_invoice_number`.  
On invoice creation: `counter = tenant.next_invoice_number++; format: {tenantId}-INV-{counter:05d}`.

### 3.3 QR Code Structure (TLV Format)

```
Tag 1: Seller Name (string)
Tag 2: Seller VAT (string)
Tag 3: Timestamp (ISO 8601)
Tag 4: Invoice Total (decimal)
Tag 5: Total VAT (decimal)
Tag 6: Hash (base64 of XML hash)
```

Generated using zatca-qr-sdk or manual TLV encoding. Stored as base64 string in `qr_code`.

### 3.4 Invoice Numbering Convention

```
{tenantSubdomain}-INV-{NNNNN}
Example: demo-inv-01001
```

### 3.5 API Changes for Invoices

**`POST /api/v1/invoices` (REFACTOR):**
```
Input: { contractId/leaseId, due, amount, vatType? }
Process:
  1. Auto-calculate subtotal, vatRate, vatAmount, totalWithVat
  2. Generate invoiceNumber from tenant counter
  3. Generate zatcaUuid (UUIDv4)
  4. Create invoice with all VAT fields
  5. Return full tax invoice
```

**`GET /api/v1/invoices/[id]` (REPLACE mock):**
```
Input: invoice ID
Process:
  1. Query rental_invoices + tenant + lease
  2. Return full tax invoice with QR, XML
```

**`POST /api/v1/invoices/[id]/pay` (REPLACE mock):**
→ See Phase 5: Real Invoice Payments

---

## Phase 4: ZATCA Compliance Layer

### 4.1 Architecture

```
┌───────────────────────────────┐
│         ORCA App Layer        │
├───────────────────────────────┤
│  Invoice Created              │
│  → zatcaUuid generated        │
│  → XML generated              │
│  → Digitally signed           │
│  → QR generated               │
│  → Invoice stored (PENDING)   │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│     ZATCA Compliance Gateway  │
├───────────────────────────────┤
│  checkReadiness()             │
│  → Credentials OK?            │
│  → Compliance OK?             │
│  → Gate passes?               │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│     ZATCA API Integration     │
├───────────────────────────────┤
│  Phase 2:                         │
│  → POST /compliance/invoices     │
│  → GET  /compliance/invoices/:id │
│                                   │
│  Phase 1 (future):               │
│  → POST /compliance (Clearance)  │
└───────────────────────────────┘
```

### 4.2 ZATCA XML Generation

**Library:** `zatca-egs` (npm) or manual XML construction.

**XML Structure (Phase 2 Simplified Invoice):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>SIMPLIFIED</cbc:CustomizationID>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>{invoiceNumber}</cbc:ID>
  <cbc:UUID>{zatcaUuid}</cbc:UUID>
  <cbc:IssueDate>{date}</cbc:IssueDate>
  <cbc:IssueTime>{time}</cbc:IssueTime>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>{sellerVat}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>{buyerVat}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">{vatAmount}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">{subtotal}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">{vatAmount}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>  <!-- S=Standard, Z=Zero, E=Exempt -->
        <cbc:Percent>{vatRate}</cbc:Percent>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">{subtotal}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">{totalWithVat}</cbc:TaxInclusiveAmount>
  </cac:LegalMonetaryTotal>
</Invoice>
```

### 4.3 Digital Signature

**Method:** ECDSA (Elliptic Curve Digital Signature Algorithm)  
**Key:** Loaded from `tenants.encryptedZatcaCredentials`  
**Process:**
1. Hash XML (SHA-256)
2. Sign hash with ECDSA private key
3. Embed signature in XML `<cbc:Signature>`

### 4.4 UUID Strategy

- Format: UUIDv4 (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`)
- Stored in `rental_invoices.zatca_uuid`
- Used as invoice UUID in XML
- Used for idempotency when sending to ZATCA API

### 4.5 ZATCA API Flow

```
1. Invoice Created (status = PENDING)
2. XML generated + signed + QR generated
3. POST to ZATCA /compliance/invoices
   Headers: { Authorization: Basic <credentials>, Accept-Version: 2 }
   Body: { invoiceHash, uuid, invoice: base64(xml) }
4. Response:
   - 200: status = REPORTED
   - 400: status = REJECTED (retry or escalate)
   - 409: status = DUPLICATE (already reported)
5. Store zatcaStatus + zatcaXml + zatcaSignedXml on invoice
```

### 4.6 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/zatca/xml.ts` | **NEW** | XML generator for ZATCA Phase 2 |
| `lib/zatca/qr.ts` | **NEW** | QR code generator (TLV) |
| `lib/zatca/signer.ts` | **NEW** | ECDSA digital signer |
| `lib/zatca/client.ts` | **NEW** | ZATCA API HTTP client |
| `lib/zatca/types.ts` | **NEW** | TypeScript types for ZATCA |
| `lib/compliance-gateway.ts` | **MODIFY** | Add ZATCA API readiness check |
| `app/actions/compliance.ts` | **MODIFY** | Add submitToZatca action |
| `app/api/v1/invoices/route.ts` | **MODIFY** | Generate XML + QR on create |

---

## Phase 5: Real Invoice Payments

### 5.1 Replace Mock Endpoints

| Current Endpoint | Current Behavior | New Behavior |
|-----------------|-----------------|--------------|
| `POST /api/v1/invoices/[id]/pay` | Returns random `P-XXXX` ID | Creates Receipt + GL posting + marks invoice paid |
| `GET /api/v1/invoices/[id]` | Returns hardcoded data | Real DB query with VAT fields |
| `POST /api/accounting/settle-lease` | Random `FS-Settle-XXX` | DELETE (not needed) |
| `POST /api/v1/reconciliation/upload` | Hardcoded matches | DELETE (V2 feature) |

### 5.2 Real Payment Flow

```
Invoice (exists, unpaid)
    │
    ▼
POST /api/v1/invoices/{id}/pay
    │
    ├── Idempotency check (idempotency-key header)
    │   └── If processed: return existing receipt (HTTP 200)
    │   └── If not: continue
    │
    ├── Validate: invoice exists, is unpaid, amount matches
    │
    ├── Create Receipt (status=COMPLETED)
    │
    ├── Update Invoice (status=paid, paidAt=now, paymentMethod, paymentRef)
    │
    ├── Update Installments (if applicable)
    │
    ├── Post to General Ledger (double-entry):
    │   DR: Cash/Bank (asset)
    │   CR: Accounts Receivable (asset)
    │
    └── Return receipt + invoice (HTTP 201)
```

### 5.3 `POST /api/v1/invoices/[id]/pay` – Implementation

```typescript
// app/api/v1/invoices/[id]/pay/route.ts (REWRITE)
export async function POST(request, { params }) {
  const { id } = await params;
  const idempotencyKey = request.headers.get('idempotency-key');
  const session = await authenticateRequest(request);

  // 1. Idempotency check
  const existing = await prisma.receipt.findFirst({
    where: { invoiceId: id, idempotencyKey }
  });
  if (existing) return Response.json({ success: true, receipt: existing });

  // 2. Validate
  const invoice = await prisma.rentalInvoice.findFirst({
    where: { id, tenantId: session.tenantId, status: 'unpaid' }
  });
  if (!invoice) return Response.json({ error: 'not found or already paid' }, { status: 404 });

  const body = await request.json();
  if (!body.amount || !body.method) return Response.json({ error: 'missing fields' }, { status: 400 });

  // 3. Prisma transaction
  const result = await prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.create({
      data: {
        tenantId: session.tenantId,
        invoiceId: id,
        amount: body.amount,
        paymentMethod: body.method,
        status: 'COMPLETED',
        idempotencyKey
      }
    });

    await tx.rentalInvoice.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date(), paymentMethod: body.method, paymentRef: receipt.id }
    });

    // Double-entry posting
    await tx.generalLedger.create({
      data: {
        tenantId: session.tenantId,
        receiptId: receipt.id,
        accountCode: '1100', // Cash
        debit: body.amount,
        credit: 0,
        description: `Payment for invoice ${invoice.invoiceNumber}`
      }
    });
    await tx.generalLedger.create({
      data: {
        tenantId: session.tenantId,
        receiptId: receipt.id,
        accountCode: '1200', // AR
        debit: 0,
        credit: body.amount,
        description: `Payment for invoice ${invoice.invoiceNumber}`
      }
    });

    return receipt;
  });

  return Response.json({ success: true, receipt: result }, { status: 201 });
}
```

### 5.4 `processPayment` Action – Refactor

```typescript
// app/actions/finance.ts (REFACTOR)
export async function processPayment(invoiceId: string, amount: number, method: string) {
  // Same flow as above but as server action for internal use
  // Uses double-entry posting with account codes
}
```

### 5.5 Files to Modify/Create

| File | Action |
|------|--------|
| `app/api/v1/invoices/[id]/pay/route.ts` | **REWRITE** – real payment flow |
| `app/api/v1/invoices/[id]/route.ts` | **REWRITE** – real DB query |
| `app/api/accounting/settle-lease/route.ts` | **DELETE** |
| `app/api/v1/reconciliation/upload/route.ts` | **DELETE** |
| `app/actions/finance.ts` | **REWRITE** – double-entry posting |

---

## Phase 6: Double-Entry Accounting Core

### 6.1 Chart of Accounts (Saudi Standard – Simplified)

| Code | Name (AR) | Name (EN) | Type | Side |
|------|-----------|-----------|------|------|
| 1100 | النقدية والبنوك | Cash & Bank | Asset | Debit |
| 1200 | حسابات القبض | Accounts Receivable | Asset | Debit |
| 1300 | الضريبة على القيمة المضافة المسددة | VAT Recoverable | Asset | Debit |
| 2100 | حسابات الدفع | Accounts Payable | Liability | Credit |
| 2200 | ضريبة القيمة المضافة المستحقة | VAT Payable | Liability | Credit |
| 3100 | رأس المال | Capital | Equity | Credit |
| 4100 | إيرادات العقود | Contract Revenue | Revenue | Credit |
| 4200 | إيرادات الإيجار | Rental Revenue | Revenue | Credit |
| 4300 | عمولات البيع | Sales Commission Income | Revenue | Credit |
| 5100 | رواتب وعمولات | Salaries & Commissions | Expense | Debit |
| 5200 | مصاريف تشغيلية | Operating Expenses | Expense | Debit |

### 6.2 Database Schema Changes

```prisma
model Account {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  code        String   // e.g. "1100"
  nameAr      String   @map("name_ar")
  nameEn      String   @map("name_en")
  type        String   // ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@unique([tenantId, code])
  @@map("accounts")
}

model JournalEntry {
  id          String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String           @map("tenant_id") @db.Uuid
  tenant      Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  entryDate   DateTime         @map("entry_date") @db.Date
  description String
  reference   String?          // e.g. "INV-01001" or "REC-001"
  referenceType String?        // e.g. "INVOICE" | "RECEIPT" | "COMMISSION"
  createdAt   DateTime         @default(now()) @map("created_at") @db.Timestamptz
  lines       JournalEntryLine[]

  @@index([tenantId], map: "idx_journal_entries_tenant_id")
  @@index([entryDate], map: "idx_journal_entries_date")
  @@map("journal_entries")
}

model JournalEntryLine {
  id             String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  journalEntryId String       @map("journal_entry_id") @db.Uuid
  journalEntry   JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  accountCode    String       @map("account_code")
  account        Account      @relation(fields: [accountCode], references: [code])
  debit          Decimal      @default(0) @db.Decimal(12, 2)
  credit         Decimal      @default(0) @db.Decimal(12, 2)
  description    String?

  @@index([journalEntryId], map: "idx_journal_entry_lines_entry_id")
  @@map("journal_entry_lines")
}
```

**Modify `GeneralLedger` table:**
```prisma
model GeneralLedger {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id") @db.Uuid
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  receiptId   String?  @unique
  receipt     Receipt? @relation(fields: [receiptId], references: [id])
  accountCode String   @map("account_code") // NEW
  account     Account  @relation(fields: [accountCode], references: [code]) // NEW
  debit       Decimal
  credit      Decimal
  description String
  createdAt   DateTime @default(now())

  @@index([tenantId], map: "idx_general_ledger_tenant_id")
  @@index([accountCode], map: "idx_general_ledger_account_code")
  @@map("general_ledger")
}
```

### 6.3 Auto-Posting Rules (Accounting Engine)

| Event | DR | CR | Description |
|-------|----|----|-------------|
| Invoice Created | 1200 AR | 4100/4200 Revenue | Revenue recognition on invoice |
| Invoice Created (VAT) | 1200 AR | 2200 VAT Payable | VAT liability |
| Payment Received | 1100 Cash | 1200 AR | AR settlement |
| Commission Accrued | 5100 Salaries | 2100 AP | Commission liability |
| Commission Paid | 2100 AP | 1100 Cash | Payment to sales rep |
| Refund | 4100 Revenue | 1100 Cash | Revenue reversal |
| Lease Settlement | 4200 Revenue | 3100 Capital | Owner distribution |

### 6.4 Accounting Posting Engine

```typescript
// lib/accounting/poster.ts (NEW)
export async function postJournalEntry(params: {
  tenantId: string;
  entryDate: Date;
  description: string;
  reference: string;
  referenceType: string;
  lines: Array<{ accountCode: string; debit: number; credit: number }>;
}) {
  return prisma.$transaction(async (tx) => {
    // Validate: total debits = total credits
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('Journal entry not balanced');
    }

    // Create journal entry
    const entry = await tx.journalEntry.create({
      data: {
        tenantId: params.tenantId,
        entryDate: params.entryDate,
        description: params.description,
        reference: params.reference,
        referenceType: params.referenceType,
        lines: {
          create: params.lines.map(l => ({
            accountCode: l.accountCode,
            debit: l.debit,
            credit: l.credit,
          }))
        }
      },
      include: { lines: true }
    });

    // Sync to GeneralLedger for reporting
    for (const line of params.lines) {
      await tx.generalLedger.create({
        data: {
          tenantId: params.tenantId,
          accountCode: line.accountCode,
          debit: line.debit,
          credit: line.credit,
          description: `${params.referenceType}: ${params.reference}`
        }
      });
    }

    return entry;
  });
}
```

### 6.5 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | **MODIFY** | Add Account, JournalEntry, JournalEntryLine models |
| `lib/accounting/poster.ts` | **NEW** | Accounting posting engine |
| `lib/accounting/seed-accounts.ts` | **NEW** | Default COA seeder |
| `lib/accounting/reports.ts` | **NEW** | Trial Balance, GL, AR reports |
| `app/actions/finance.ts` | **REWRITE** | Use poster engine |
| `app/actions/accounting.ts` | **REWRITE** | Use real GL accounts |

---

## Phase 7: Reporting Layer

### 7.1 Reports to Build

| Report | Source | Method | Priority |
|--------|--------|--------|----------|
| Trial Balance | `GeneralLedger` grouped by `accountCode` | SQL GROUP BY | P1 |
| General Ledger | `GeneralLedger` with filters | Query by date/account | P1 |
| Accounts Receivable | `JournalEntry` where accountCode=1200 | Balance per customer | P1 |
| VAT Report | `RentalInvoice` vatAmount grouped by month | SQL GROUP BY | P1 |
| Aging Report | `RentalInvoice` where status=unpaid | Days past due buckets | P2 |

### 7.2 Trial Balance Query

```typescript
async function getTrialBalance(tenantId: string, asOf: Date) {
  const result = await prisma.$queryRaw`
    SELECT
      a.code,
      a.name_ar,
      a.type,
      COALESCE(SUM(gl.debit), 0) as total_debit,
      COALESCE(SUM(gl.credit), 0) as total_credit
    FROM accounts a
    LEFT JOIN general_ledger gl ON gl.account_code = a.code
      AND gl.tenant_id = ${tenantId}::uuid
      AND gl.created_at <= ${asOf}::timestamp
    WHERE a.tenant_id = ${tenantId}::uuid
    GROUP BY a.code, a.name_ar, a.type
    ORDER BY a.code;
  `;
  return result;
}
```

### 7.3 VAT Report Query

```typescript
async function getVatReport(tenantId: string, year: number, month: number) {
  const result = await prisma.$queryRaw`
    SELECT
      SUM(subtotal) as total_sales,
      SUM(vat_amount) as total_vat,
      COUNT(*) as invoice_count
    FROM rental_invoices
    WHERE tenant_id = ${tenantId}::uuid
      AND EXTRACT(YEAR FROM created_at) = ${year}
      AND EXTRACT(MONTH FROM created_at) = ${month}
      AND status = 'paid';
  `;
  return result;
}
```

### 7.4 Aging Report Query

```typescript
async function getAgingReport(tenantId: string) {
  const now = new Date();
  const result = await prisma.$queryRaw`
    SELECT
      CASE
        WHEN due_date >= ${now}::date THEN 'CURRENT'
        WHEN due_date >= ${new Date(now.getTime() - 30*86400000)}::date THEN '1-30'
        WHEN due_date >= ${new Date(now.getTime() - 60*86400000)}::date THEN '31-60'
        WHEN due_date >= ${new Date(now.getTime() - 90*86400000)}::date THEN '61-90'
        ELSE '90+'
      END as bucket,
      SUM(amount) as total,
      COUNT(*) as count
    FROM rental_invoices
    WHERE tenant_id = ${tenantId}::uuid
      AND status = 'unpaid'
    GROUP BY bucket
    ORDER BY bucket;
  `;
  return result;
}
```

### 7.5 Reports NOT to Build

- Fixed Assets Register → V2
- Cost Center Accounting → V2
- Cash Flow Statement → V3
- Balance Sheet → V3 (derived from Trial Balance)
- P&L Statement → V3 (derived from Trial Balance)

---

## Phase 8: Gap Closure Plan

### 8.1 Priority/Effort/Impact Matrix

| # | Feature | Priority | Effort (days) | Impact | Depends On |
|---|---------|----------|---------------|--------|------------|
| 1 | VAT fields on Invoice table | P1 | 1 | 🟢 High | — |
| 2 | VAT calculation in Invoice creation | P1 | 1 | 🟢 High | #1 |
| 3 | Sequential invoice numbers | P1 | 0.5 | 🟢 High | — |
| 4 | Invoice QR code (TLV) | P1 | 2 | 🟢 High | #1 |
| 5 | Invoice XML generation | P1 | 3 | 🟢 High | #1 |
| 6 | Digital signature for XML | P1 | 2 | 🟢 High | #5 |
| 7 | ZATCA API client + submit | P1 | 3 | 🔴 Critical | #5, #6 |
| 8 | Real payment endpoint (replace mock) | P1 | 2 | 🟢 High | #1 |
| 9 | Account model + default COA | P1 | 1 | 🟢 High | — |
| 10 | JournalEntry + JournalEntryLine models | P1 | 1 | 🟢 High | #9 |
| 11 | Accounting posting engine | P1 | 2 | 🟢 High | #10 |
| 12 | Wire payments → posting engine | P1 | 1 | 🟢 High | #8, #11 |
| 13 | Wire commission → posting engine | P1 | 1 | 🟢 High | #11 |
| 14 | Trial Balance report | P1 | 1 | 🟡 Medium | #9 |
| 15 | General Ledger report | P1 | 1 | 🟡 Medium | #9 |
| 16 | Aging Report | P2 | 1 | 🟡 Medium | #8 |
| 17 | VAT Report | P2 | 1 | 🟡 Medium | #1 |
| 18 | Credit / Debit notes | P2 | 3 | 🟡 Medium | #5 |
| 19 | Refund flow | P2 | 2 | 🟡 Medium | #8 |
| 20 | Invoice UI with VAT display | P2 | 2 | 🟡 Medium | #1 |
| 21 | ZATCA compliance dashboard | P2 | 2 | 🟡 Medium | #7 |
| 22 | Partial payments | P3 | 2 | 🟢 Low | #8 |
| 23 | Chart of Accounts UI | P3 | 2 | 🟢 Low | #9 |

### 8.2 Gap Closure Summary

```
Current Scores:
  Accounting:  3/10  ──→  Target: 8/10  (+5)
  Payments:    6/10  ──→  Target: 8/10  (+2)
  ZATCA:       1/10  ──→  Target: 8/10  (+7)

What gets us to 8/10:
  Accounting:  COA + Double Entry + Auto-posting + Trial Balance + AR Report
  Payments:    Real payment endpoint + Receipt → Ledger chain + Idempotency
  ZATCA:       VAT + QR + XML + Signature + API + Compliance flow
```

---

## Phase 9: Sprint Plan

### Sprint 1 – VAT + Invoice Foundation (Days 1-7)

**Goal:** All invoices have VAT, QR, sequential numbers

**Files affected:**
- `prisma/schema.prisma` – add VAT fields to RentalInvoice, Contract, Installment, Tenant
- `app/api/v1/invoices/route.ts` – VAT calculation on create
- `app/api/v1/invoices/[id]/route.ts` – real DB query (replace mock)
- `lib/zatca/qr.ts` – NEW – TLV QR generator
- `lib/zatca/types.ts` – NEW – ZATCA types
- Run migration on DB

**Tables affected:**
- `rental_invoices` – 8 new columns
- `contracts` – 3 new columns
- `rental_leases` – 2 new columns
- `installments` – 1 new column
- `tenants` – 1 new column (next_invoice_number)

**Risks:**
- Migration on existing data: existing invoices get NULL vat fields → default to 0
- Invoice number collision: ensure unique per tenant, not globally

**Dependencies:**
- Prisma migration tool (`npx prisma migrate dev`)

**Verification:**
- `POST /api/v1/invoices` creates invoice with VAT, QR, invoice number
- `GET /api/v1/invoices/[id]` returns full tax invoice object
- QR code scans on ZATCA reader

---

### Sprint 2 – ZATCA Integration (Days 8-14)

**Goal:** Invoices are XML-signed and reported to ZATCA

**Files affected:**
- `lib/zatca/xml.ts` – NEW – UBL XML generator
- `lib/zatca/signer.ts` – NEW – ECDSA signer
- `lib/zatca/client.ts` – NEW – ZATCA API HTTP client
- `app/actions/compliance.ts` – MODIFY – add `submitInvoiceToZatcaAction`
- `lib/compliance-gateway.ts` – MODIFY – add ZATCA API readiness rules
- `app/api/v1/invoices/route.ts` – MODIFY – trigger ZATCA submit after create

**Tables affected:**
- `rental_invoices` – zatcaUuid, zatcaXml, zatcaSignedXml, zatcaStatus

**Risks:**
- ZATCA API requires production credentials (CSR + OTP)
- Sandbox API may behave differently from production
- Digital signature requires proper ECDSA key management

**Dependencies:**
- ZATCA production account (CSR + compliance check)
- Valid VAT number registered with ZATCA

**Verification:**
- Invoice XML validates against ZATCA XSD
- QR code scans correctly
- `zatcaStatus` changes from `PENDING` → `REPORTED` after API call

---

### Sprint 3 – Real Payments + Double Entry Core (Days 15-21)

**Goal:** Every payment creates real receipts + double-entry ledger

**Files affected:**
- `app/api/v1/invoices/[id]/pay/route.ts` – REWRITE – real payment flow
- `app/api/accounting/settle-lease/route.ts` – DELETE
- `app/api/v1/reconciliation/upload/route.ts` – DELETE
- `app/actions/finance.ts` – REWRITE – use posting engine
- `app/actions/accounting.ts` – REWRITE – use real COA
- `lib/accounting/poster.ts` – NEW – posting engine
- `lib/accounting/seed-accounts.ts` – NEW – default COA
- `prisma/schema.prisma` – MODIFY – add Account, JournalEntry, JournalEntryLine

**Tables affected:**
- NEW: `accounts`, `journal_entries`, `journal_entry_lines`
- MODIFY: `general_ledger` – add accountCode FK
- EXISTING: `receipts` – add idempotencyKey field

**Risks:**
- Transaction deadlocks on high-frequency payments
- Migration for existing data: old GL entries have no accountCode
- Default COA might not match all tenant needs

**Dependencies:**
- Sprint 1 (VAT fields on receipts)
- Sprint 2 (none)

**Verification:**
- `POST /api/v1/invoices/[id]/pay` creates Receipt + 2 GL entries
- `processPayment` action creates balanced journal entry
- Trial Balance shows DR = CR for sample data

---

### Sprint 4 – Reporting + UI Polish (Days 22-28)

**Goal:** Trial Balance, GL Report, AR Report, VAT Report, Aging

**Files affected:**
- `lib/accounting/reports.ts` – NEW – all report queries
- `app/actions/reports.ts` – NEW – server actions for reports
- `app/api/v1/reports/*/route.ts` – NEW – report API endpoints
- `components/reports/` – NEW – report UI components
- `components/settings/SettingsBilling.tsx` – MODIFY – show VAT on prices
- `components/settings/SettingsCompliance.tsx` – MODIFY – ZATCA invoice status

**Tables affected:**
- Read-only queries on `general_ledger`, `accounts`, `rental_invoices`, `journal_entries`, `journal_entry_lines`

**Risks:**
- Performance on large GL datasets (mitigate with proper indexing)
- UI complexity for report filters

**Dependencies:**
- Sprint 3 (GL with account codes)

**Verification:**
- Trial Balance report returns balanced data (DR = CR)
- AR Aging report buckets match invoices correctly
- VAT report shows correct totals per month
- UI renders all reports without error

---

## Phase 10: Final Recommendation

### 10.1 What to Build NOW (Sprint 1-2-3)

| Priority | Item | Why Now |
|----------|------|---------|
| 🔴 Critical | VAT + QR + Invoice Number | Legal requirement for Saudi market |
| 🔴 Critical | ZATCA XML + API Submission | Legal requirement for Phase 2 |
| 🔴 Critical | Real Payment Endpoint | Currently broken (mock) |
| 🟡 High | Double-Entry Accounting | Professional requirement |
| 🟡 High | Trial Balance + GL Report | Basic accounting need |
| 🟡 High | AR Aging Report | Cash collection management |

### 10.2 What to Delay (Post-Sprint)

| Item | To When | Why Delay |
|------|---------|-----------|
| Balance Sheet | V3 | Derived from TB – build when customers ask |
| P&L Statement | V3 | Derived from TB – build when customers ask |
| Cash Flow Statement | V3 | Complex, rarely needed in small agencies |
| Fixed Assets | V2 | Not core to real estate CRM |
| Cost Centers | V2 | Advanced feature |
| Chart of Accounts UI | Post-Sprint | Default COA is sufficient for pilot |

### 10.3 What to DELETE

| Item | Reason |
|------|--------|
| `app/api/accounting/settle-lease/route.ts` | Mock – no real value |
| `app/api/v1/reconciliation/upload/route.ts` | Mock – V2 feature |
| `GET /api/v1/invoices/[id]` mock data | Replace with real query |

### 10.4 What to KEEP (no changes)

| Item | Reason |
|------|--------|
| Moyasar subscription payment | Working in production |
| Sanad installment reminders | Working in production |
| Payroll commissions CRUD | Working in production |
| Compliance credential storage | Correct approach |
| Billing agent (activation + SMS) | Working in production |
| Subscription expiry engine | Working in production |

### 10.5 Fastest Path to 8/8/8

```
START:  Accounting 3/10, Payments 6/10, ZATCA 1/10

Sprint 1 (7 days):
  Accounting: 3→5 (VAT fields, invoice numbers)
  Payments:   6→6 (no change)
  ZATCA:      1→5 (QR, invoice structure)

Sprint 2 (7 days):
  Accounting: 5→5 (no change)
  Payments:   6→6 (no change)
  ZATCA:      5→8 (XML, signature, API submission)

Sprint 3 (7 days):
  Accounting: 5→8 (COA, double-entry, posting engine)
  Payments:   6→8 (real payment endpoint, receipt→ledger)
  ZATCA:      8→8 (no change)

Sprint 4 (7 days):
  Accounting: 8→8 (reports)
  Payments:   8→8 (no change)
  ZATCA:      8→8 (compliance dashboard)

END:  Accounting 8/10, Payments 8/10, ZATCA 8/10
TOTAL: 28 days
```

### 10.6 Scorecard at Each Stage

```
                                START    Sprint1   Sprint2   Sprint3   Sprint4  TARGET
Accounting  ═══════════░░░  3/10  ═══░  5/10  ═══░  5/10  ═══░  8/10  ═══░  8/10  ✅
  VAT fields                          ✅
  Sequential invoices                 ✅
  Double entry engine                                   ✅
  COA                                                   ✅
  Trial Balance                                                   ✅
  GL Report                                                       ✅

Payments    ═══════════░  6/10  ═══░  6/10  ═══░  6/10  ═══░  8/10  ═══░  8/10  ✅
  Real payment endpoint                                   ✅
  Receipt→Ledger chain                                    ✅
  Idempotency                                             ✅

ZATCA       ═══════════░░  1/10  ═══░  5/10  ═══░  8/10  ═══░  8/10  ═══░  8/10  ✅
  VAT structure                   ✅
  QR code                         ✅
  Invoice number                  ✅
  XML generation                          ✅
  Digital signature                       ✅
  API submission                           ✅

Saudi CRM + Billing   3/10  ═════  5/10  ═════  7/10  ═════  8/10  ═════  8/10  ✅
```

---

## Summary of New Files to Create

| # | File | Sprint |
|---|------|--------|
| 1 | `lib/zatca/types.ts` | S1 |
| 2 | `lib/zatca/qr.ts` | S1 |
| 3 | `lib/zatca/xml.ts` | S2 |
| 4 | `lib/zatca/signer.ts` | S2 |
| 5 | `lib/zatca/client.ts` | S2 |
| 6 | `lib/accounting/poster.ts` | S3 |
| 7 | `lib/accounting/seed-accounts.ts` | S3 |
| 8 | `lib/accounting/reports.ts` | S4 |
| 9 | `app/actions/reports.ts` | S4 |
| 10 | `components/reports/TrialBalance.tsx` | S4 |
| 11 | `components/reports/VatReport.tsx` | S4 |
| 12 | `components/reports/AgingReport.tsx` | S4 |
| 13 | `components/reports/GeneralLedgerReport.tsx` | S4 |

## Summary of Files to Modify

| # | File | Sprint |
|---|------|--------|
| 1 | `prisma/schema.prisma` | S1, S3 |
| 2 | `app/api/v1/invoices/route.ts` | S1 |
| 3 | `app/api/v1/invoices/[id]/route.ts` | S1 |
| 4 | `app/api/v1/invoices/[id]/pay/route.ts` | S3 |
| 5 | `app/actions/finance.ts` | S3 |
| 6 | `app/actions/accounting.ts` | S3 |
| 7 | `app/actions/compliance.ts` | S2 |
| 8 | `lib/compliance-gateway.ts` | S2 |
| 9 | `components/settings/SettingsCompliance.tsx` | S4 |
| 10 | `components/settings/SettingsBilling.tsx` | S4 |

## Summary of Files to Delete

| # | File | Sprint |
|---|------|--------|
| 1 | `app/api/accounting/settle-lease/route.ts` | S3 |
| 2 | `app/api/v1/reconciliation/upload/route.ts` | S3 |

---

## Final Score Post-Recovery

```
═══════════════════════════════════════════
  ORCA CRM – Financial Recovery Scorecard
═══════════════════════════════════════════

Accounting  ═══════════════════  8/10  ✅
  ✔ Chart of Accounts
  ✔ Double-entry journal entries
  ✔ General Ledger with account codes
  ✔ Auto-posting engine
  ✔ Trial Balance
  ✔ GL Report
  ✔ AR Aging Report
  ✘ No Balance Sheet (V3)
  ✘ No P&L (V3)

Payments    ═══════════════════  8/10  ✅
  ✔ Subscription (Moyasar – real)
  ✔ Invoice payment (real endpoint)
  ✔ Receipt generation
  ✔ Receipt→Ledger chain
  ✔ Idempotency key support
  ✔ Installment tracking
  ✔ Sanad reminders
  ✘ No refund/reversal (P2)
  ✘ No partial payments (P3)

ZATCA       ═══════════════════  8/10  ✅
  ✔ VAT calculation (15%)
  ✔ Tax invoice with all required fields
  ✔ Sequential invoice numbers
  ✔ QR code (TLV)
  ✔ XML generation (UBL 2.1)
  ✔ Digital signature (ECDSA)
  ✔ ZATCA API submission
  ✔ Compliance dashboard
  ✘ No credit/debit notes (P2)
  ✘ No Phase 1 clearance (when required)

Saudi Market Readiness ═══════  8/10  ✅
─────────────────────────────────────
READY for Saudi Market
   (as a Real Estate CRM + Billing Platform)
═══════════════════════════════════════════
```
