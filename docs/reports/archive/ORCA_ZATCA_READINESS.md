# ORCA ZATCA Readiness Audit

**Date:** 2026-06-10 | **Auditor:** Agent 2 (Finance, Accounting & ZATCA Lead)

---

## Component Status Summary

| # | Component | Status | Evidence File | Gaps / Notes |
|---|-----------|--------|---------------|--------------|
| 1 | **UBL 2.1 XML Generation** | READY | `lib/zatca/xml/xml-generator.ts:1-206` | Full UBL 2.1 Invoice XML with namespaces (cac, cbc, ext, sac). Generates supplier/customer parties, line items, tax totals, legal monetary totals, UBL extensions with invoice hash and previous hash. Supports Standard/ZERO_RATED/Exempt tax categories. |
| 2 | **XML Types** | READY | `lib/zatca/xml/xml-types.ts:1-50` | TypeScript interfaces: ZatcaInvoiceData, ZatcaParty, ZatcaLineItem, ZatcaAddress, TaxCategoryId. |
| 3 | **XML Validation** | READY | `lib/zatca/xml/xml-validator.ts:1-91` | `validateXmlStructure()` checks: XML declaration, Invoice root, UBL namespace, UBLVersionID 2.1, CustomizationID, ProfileID, UUID, IssueDate, IssueTime, InvoiceTypeCode, currency, supplier, customer, tax total, legal monetary total, line items, UBL extensions, signature element, PreviousInvoiceHash, InvoiceHash. |
| 4 | **TLV QR Code** | READY | `lib/zatca/qr.ts:1-53` | TLV tags 1-5 (Seller Name, VAT Number, Timestamp, Total, VAT Total) per ZATCA spec. `encodeQrCode()` produces Base64. `generateQrImage()` renders via `qrcode` npm to Data URL. `formatInvoiceLabel()` for invoice numbering. Legacy wrapper also in `lib/zatca.ts:1-18`. |
| 5 | **Fatoora API Integration** | READY | `lib/zatca/api.ts:1-231` | 4 endpoints: `submitReporting()`, `submitClearance()`, `submitCsid()`, `submitProductionCsid()`. Sandbox/production URL toggle via `ZATCA_SANDBOX_MODE`. Bearer auth using device cert. OTP support for CSID. JSON request/response handling. |
| 6 | **Device Key Generation** | READY | `lib/zatca/device.ts:1-57` | `generateEcdsaKeyPair()` using `secp256k1` curve (SPKI public, PKCS8 private). `generateCsr()` produces PEM CSR with CN, O, C. Private key encryption via `encryptValue()` (AES-256-GCM). |
| 7 | **CSR/CSID Flow** | READY | `app/api/v1/zatca/device/route.ts:1-83` + `app/api/v1/zatca/csid/route.ts:1-48` | Device creation: generates ECDSA pair, creates CSR, stores encrypted private key. CSID: submits CSR + OTP to ZATCA, stores `complianceCert` encrypted. |
| 8 | **Retry Queue** | READY | `lib/zatca/queue.ts:1-21` + `app/api/cron/zatca/route.ts:1-154` | Exponential backoff: 5s, 15s, 45s, 135s, 405s. Prisma `ZatcaQueue` model. Cron job processes up to 10 pending items per run. Retryable status check. Max retries enforcement. CRON_SECRET auth. Rate limited to 1 req/5min. |
| 9 | **Queue API Routes** | READY | `app/api/v1/zatca/queue/route.ts` + `app/api/v1/zatca/queue/[id]/retry/route.ts` | List queue items (filterable by status). Manual retry endpoint with retryable/expired validation. |
| 10 | **Invoice UUID** | READY | `app/api/v1/zatca/submit/[id]/route.ts:55` | Uses `invoice.zatcaUuid` from Prisma `RentalInvoice` model (defaults to `uuid()`). Passed to XML generator as `<cbc:UUID>`. |
| 11 | **Pre-submission Validation** | READY | `lib/zatca/validate.ts:1-126` | Validates: VAT number (15 digits, Saudi format), UUID format, invoice number, totals (subtotal+vat=total), issue date (not future), line item totals, seller VAT config. Returns `ValidationError[]`. |
| 12 | **PI Hash (Previous Invoice Hash)** | READY | `lib/zatca/pih.ts:1-16` | `computeInvoiceHash()` uses SHA256 of XML (uppercased). `getZeroHash()` returns 64 zeros. `computePreviousInvoiceHash()` chains from previous invoice's signed XML. |
| 13 | **Encryption** | READY | `lib/zatca/encrypt.ts:1-35` | AES-256-GCM encryption with random IV. Key from `ENCRYPTION_KEY` env var (256-bit hex). Format: `iv:authTag:ciphertext`. Used for private key and compliance cert storage. |
| 14 | **ZATCA Submission Flow** | READY | `app/api/v1/zatca/submit/[id]/route.ts:1-168` | Complete pipeline: validatePreSubmission -> generateUnsignedInvoiceXml -> computeInvoiceHash -> validateXmlStructure -> submitReporting/submitClearance -> store results -> queue failures. |
| 15 | **ZATCA Status Query** | READY | `app/api/v1/zatca/status/[id]/route.ts:1-37` | Returns invoice ZATCA status, XML, response, errors, clearedAt, PI hash. |
| 16 | **ZATCA Dashboard API** | READY | `app/api/v1/zatca/dashboard/route.ts:1-56` | Aggregates: total invoices, zatcaStatus counts (DRAFT/ISSUED/REPORTED/CLEARED/REJECTED/ERROR), queue status counts (PENDING/PROCESSING/COMPLETED/FAILED), active device count. |
| 17 | **ZATCA Activity Feed** | READY | `app/api/v1/zatca/activity/route.ts:1-33` | Returns last 50 invoices with ZATCA activity (excluding DRAFT). Includes UUID, status, errors, clearedAt, PI hash. |
| 18 | **ZATCA E2E Tests** | READY | `tests/e2e/zatca-scenarios.spec.ts:1-83` | Tests: QR generation, invoice creation + ZATCA submission, label format. Uses Playwright fixtures. |
| 19 | **ECDSA XML Signature (XMLDsig)** | **MOCK** | `lib/zatca/xml/xml-generator.ts:98-104` + `app/api/v1/zatca/submit/[id]/route.ts:124-125` | `buildSignatureXml()` generates only an empty `<cac:Signature>` with ID and method URIs. The submit route stores `zatcaSignedXml` as the **same unsigned XML** (`zatcaXml: unsignedXml; zatcaSignedXml: unsignedXml`). No actual XMLDsig envelope calculation, no canonicalization, no ECDSA signing of the XML content. This is the **blocker for production ZATCA compliance**. |
| 20 | **Production CSID** | STUB | `lib/zatca/api.ts:186-231` | `submitProductionCsid()` function exists and implements the PCSID API call, but no UI route or action calls it. Only compliance CSID is integrated in the flow. |
| 21 | **QR on Invoice PDF** | MISSING | `app/api/v1/invoices/[id]/pdf/route.ts:84,129` | PDF includes UUID as text but QR code image is not embedded/rendered in the PDF. QR is generated separately via `generateQrImage()` but never included in the PDF template. |
| 22 | **ZATCA Dashboard UI** | MISSING | — | Dashboard API (`/api/v1/zatca/dashboard`) is implemented but there is no corresponding frontend page/component to display the dashboard data. |
| 23 | **Device UI Management** | PARTIAL | API routes exist, no UI | Device CRUD is API-only. No UI for managing ZATCA devices, viewing CSR, triggering CSID, or monitoring device status. |

---

## ZATCA API Routes Inventory (10 routes)

| # | Route | Method | Purpose |
|---|-------|--------|---------|
| 1 | `/api/v1/zatca/submit/[id]` | POST | Submit invoice to ZATCA Fatoora |
| 2 | `/api/v1/zatca/status/[id]` | GET | Get invoice ZATCA status |
| 3 | `/api/v1/zatca/queue` | GET | List ZATCA retry queue |
| 4 | `/api/v1/zatca/queue/[id]/retry` | POST | Manual queue retry |
| 5 | `/api/v1/zatca/device` | GET, POST | List/create ZATCA devices (ECDSA + CSR) |
| 6 | `/api/v1/zatca/device/[id]` | DELETE | Remove ZATCA device |
| 7 | `/api/v1/zatca/csid` | POST | Request CSID from ZATCA |
| 8 | `/api/v1/zatca/dashboard` | GET | Dashboard statistics |
| 9 | `/api/v1/zatca/activity` | GET | Recent ZATCA activity (50 items) |
| 10 | `/api/cron/zatca` | GET | Cron job: process retry queue |

---

## Production Readiness Roadmap

### Phase 1 - Critical (Blocking Production)

| Task | Effort | Details |
|------|--------|---------|
| **Implement XMLDsig (ECDSA Signing)** | L | Replace `buildSignatureXml()` with actual XML Digital Signature per UBL 2.1 + XAdES enveloped spec. Requires: XML canonicalization (C14N), SHA256 digest of canonicalized Invoice, ECDSA secp256k1 signing with device private key, generating `<ds:Signature>` element with SignedInfo, SignatureValue, KeyInfo. Library options: `xml-crypto`, `xmldom`, or manual Node.js crypto. |
| **Complete Production CSID Flow** | M | Add UI route and frontend to call `submitProductionCsid()` after compliance CSID is obtained. ZATCA requires compliance testing phase before granting production CSID. |

### Phase 2 - Required (Compliance)

| Task | Effort | Details |
|------|--------|---------|
| **Embed QR in Invoice PDF** | S | Insert `generateQrImage()` output into the PDF generation template in `app/api/v1/invoices/[id]/pdf/route.ts`. QR must be visible on every printed/emailed invoice per ZATCA mandate. |
| **Build ZATCA Dashboard UI** | M | Frontend page consuming `/api/v1/zatca/dashboard` and `/api/v1/zatca/activity`. Should show: status pie chart, queue health, recent submissions, error logs. |
| **Build Device Management UI** | M | Frontend for creating devices, viewing CSR, requesting CSID with OTP, monitoring device cert expiry, handling renewal. |

### Phase 3 - Enhancement

| Task | Effort | Details |
|------|--------|---------|
| **Add Production CSID API Route** | S | Create `/api/v1/zatca/pcsid` route wrapping `submitProductionCsid()`. |
| **CSR Expiry Monitoring** | S | Add cron or alert for device cert expiry dates. Prisma model has `expiresAt` field. |
| **Webhook for ZATCA status** | M | Handle async ZATCA status callbacks instead of poll-only model. |

---

## Data Model Coverage

Prisma models supporting ZATCA:

| Model | Fields | Notes |
|-------|--------|-------|
| `RentalInvoice` | `zatcaUuid`, `zatcaStatus`, `zatcaXml`, `zatcaSignedXml`, `zatcaResponse`, `zatcaError`, `zatcaClearedAt`, `previousInvoiceHash`, `invoiceTypeCode` | Core model. `zatcaSignedXml` currently stores unsigned XML (MOCK). |
| `ZatcaQueue` | `invoiceId`, `tenantId`, `action`, `status`, `retryCount`, `maxRetries`, `nextRetryAt`, `lastError`, `payload`, `response` | Retry queue with exponential backoff. |
| `ZatcaDevice` | `deviceName`, `deviceType`, `csr`, `privateKey`, `publicKey`, `complianceCert`, `productionCert`, `status`, `expiresAt` | Device/cert management. Keys encrypted at rest. |
| `Tenant` | `vatNumber`, `commercialRegistry`, `nationalAddress`, `companyName` | Used as ZATCA seller party. |

---

## Verification Checklist

- [x] UBL 2.1 XML generation with all required namespaces
- [x] TLV QR with tags 1-5, Base64 encoding, QR image via qrcode npm
- [x] Fatoora API with sandbox/production toggle
- [x] Device ECDSA key generation (secp256k1)
- [x] CSR generation and CSID integration
- [x] Retry queue with exponential backoff and cron processor
- [x] Pre-submission validation (VAT, UUID, totals, dates, line items)
- [x] Previous Invoice Hash chaining (SHA256)
- [x] AES-256-GCM encryption for sensitive keys
- [ ] **XMLDsig (ECDSA signing) — MOCKED, not production-ready**
- [ ] Production CSID UI/route — function exists, no integration
- [ ] QR embedded in invoice PDF — missing
- [ ] ZATCA Dashboard frontend — missing
- [ ] Device management frontend — missing
