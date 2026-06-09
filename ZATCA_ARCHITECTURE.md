# ZATCA Phase 2 – Architecture Document

## Overview

This document describes the ZATCA Phase 2 compliance architecture built in Sprint 2. It extends Sprint 1 (VAT Engine + QR Code) with full invoice lifecycle management: XML generation, invoice hash chaining, device registration, Reporting API, Clearance API, retry queue, and compliance dashboard.

---

## Architecture Layers

```
┌────────────────────────────────────────────────────────────┐
│                    UI / Dashboard                          │
│  operations/compliance (Compliance Dashboard)              │
│  operations/rental (Invoice list with ZATCA status)        │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│                 API Routes (Next.js)                        │
│                                                             │
│  POST /api/v1/zatca/submit/[id]  — Submit to ZATCA         │
│  GET  /api/v1/zatca/status/[id]  — Get ZATCA status        │
│  GET  /api/v1/zatca/dashboard    — Compliance metrics      │
│  GET  /api/v1/zatca/activity     — Recent activity          │
│  GET  /api/v1/zatca/queue        — Queue items              │
│  POST /api/v1/zatca/device       — Register device          │
│  GET  /api/v1/zatca/device       — List devices             │
│  DELETE /api/v1/zatca/device/[id]— Remove device            │
│  POST /api/v1/zatca/csid         — Submit CSR to ZATCA      │
│  GET  /api/cron/zatca            — Queue processor (cron)   │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│                   Core Libraries (lib/zatca/)               │
│                                                             │
│  xml/xml-generator.ts  — UBL 2.1 XML builder               │
│  xml/xml-validator.ts  — XML structure validation           │
│  xml/xml-types.ts      — XML data type definitions          │
│  pih.ts                — PIH (Previous Invoice Hash)        │
│  device.ts             — ECDSA key pair + CSR generation    │
│  encrypt.ts            — AES-256-GCM encryption             │
│  validate.ts           — Pre-submission validation          │
│  api.ts                — ZATCA API client (HTTP)            │
│  queue.ts              — Retry/backoff logic                │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│                    Database (PostgreSQL)                    │
│                                                             │
│  rental_invoices — +invoice_type_code, +previous_invoice_  │
│                    hash, +zatca_response, +zatca_error,     │
│                    +zatca_cleared_at, +updated_at            │
│  zatca_devices   — ECDSA keys, CSR, certificates (encrypted)│
│  zatca_queue     — Submission queue with retry status       │
└────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Invoice → ZATCA Submission

```
1. Create Invoice (Sprint 1)
   ↓
2. Pre-submission Validation (Phase 9)
   - VAT number format
   - UUID format
   - Subtotals + VAT = Total
   - Line item sums
   - Issue date not in future
   ↓
3. XML Generation (Phase 2)
   - UBL 2.1 with ZATCA extensions
   - 388 (standard) or 381 (simplified)
   ↓
4. PIH Computation (Phase 3)
   - SHA-256 of previous invoice signed XML
   - First invoice = 64 zero chars
   ↓
5. Embed PIH in XML extensions
   ↓
6. Validation XML structure (Phase 9)
   ↓
7. Submit to ZATCA API (Phase 5/6)
   - Standard (388) → Reporting API
   - Simplified (381) → Clearance API
   ↓
8. Response Handling
   - Success → Update status to REPORTED/CLEARED
   - Failure → Push to retry queue
   ↓
9. Compliance Dashboard (Phase 8)
   - Real-time status display
   - Queue monitoring
```

### Retry Queue Flow

```
Submission Failure
        ↓
Create ZatcaQueue (status=PENDING)
        ↓
Cron Job (/api/cron/zatca)
  Queries: PENDING or RETRYING where nextRetryAt <= now
        ↓
For each item:
  - Set status = PROCESSING
  - Resubmit to ZATCA
  - Success → status = COMPLETED, invoice updated
  - Failure → retryCount++, compute backoff, nextRetryAt
        ↓
After maxRetries:
  status = FAILED (manual intervention required)
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| XML generated as string template (no DOM) | Performance, no external XML library dependency |
| ECDSA secp256k1 for keys | ZATCA standard curve |
| AES-256-GCM for encryption | Industry standard, authenticated encryption |
| SHA-256 for PIH | ZATCA requirement, available in Node crypto |
| Exponential backoff (5s→405s) | Standard retry strategy, avoids rate limiting |
| Separate `zatca_queue` table | Isolates failures from invoice data |
| `zatraStatus = DRAFT` default | Invoice must be explicitly submitted to ZATCA |
| Invoice type 388 vs 381 | ZATCA distinguishes standard vs simplified |
| Per-tenant isolated data | All tables tenant-scoped via Prisma middleware |

---

## Invoice Status Lifecycle

```
DRAFT ──→ ISSUED ──→ REPORTED (Standard)
                    → CLEARED (Simplified)
                    → REJECTED ←── ERROR
                          │
                          ▼
                     Retry Queue
                          │
                     ┌────┴────┐
                     ▼         ▼
                 RETRYING   FAILED
                     │
                     ▼
                REPORTED/CLEARED
```

---

## API Endpoints Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/zatca/submit/[id]` | POST | Session/Bearer | Submit invoice to ZATCA |
| `/api/v1/zatca/status/[id]` | GET | Session/Bearer | Get ZATCA status |
| `/api/v1/zatca/device` | POST | Session/Bearer | Register new device |
| `/api/v1/zatca/device` | GET | Session/Bearer | List devices |
| `/api/v1/zatca/device/[id]` | DELETE | Session/Bearer | Remove device |
| `/api/v1/zatca/csid` | POST | Session/Bearer | Submit CSR to ZATCA |
| `/api/v1/zatca/dashboard` | GET | Session/Bearer | Compliance metrics |
| `/api/v1/zatca/activity` | GET | Session/Bearer | Recent activity |
| `/api/v1/zatca/queue` | GET | Session/Bearer | Queue items |
| `/api/v1/zatca/queue/[id]/retry` | POST | Session/Bearer | Manual retry |
| `/api/cron/zatca` | GET | None | Process queue (cron) |

---

## Dependencies

- `crypto` (Node.js built-in): SHA-256 hashing, ECDSA key generation, AES-256-GCM encryption
- `@prisma/client`: Database ORM with tenant isolation middleware
- No external XML or crypto libraries required

---

## Scorecard Impact

| Area | Sprint 1 | Sprint 2 | Target |
|------|----------|----------|--------|
| ZATCA Readiness | 5/10 | **8/10** | 8/10 |
| Financial Readiness | 5/10 | 5/10 | 8/10 |
| Payments | 6/10 | 6/10 | 8/10 |
| Saudi Market Readiness | 6/10 | **7–8/10** | 8/10 |
