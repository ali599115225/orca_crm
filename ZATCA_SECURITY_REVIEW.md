# ZATCA Phase 2 – Security Review

## Overview

Security review of all Sprint 2 ZATCA compliance components: encryption, secrets management, certificates, access control, and audit trail.

---

## 1. Encryption Standards

| Component | Algorithm | Key Size | Mode | Status |
|-----------|-----------|----------|------|--------|
| Private key storage | AES-256-GCM | 256 bit | Authenticated (GCM) | ✅ Compliant |
| CSR generation | ECDSA (secp256k1) | 256 bit | NIST P-256 equivalent | ✅ Compliant |
| PIH (hash) | SHA-256 | 256 bit | — | ✅ Compliant |
| Transport (ZATCA API) | TLS 1.2+ | — | — | ✅ (External) |

### AES-256-GCM Implementation (`lib/zatca/encrypt.ts`)

```typescript
function encryptValue(plaintext: string): string {
  const key = getEncryptionKey();           // 256-bit from ENCRYPTION_KEY env
  const iv = crypto.randomBytes(16);         // Random IV per operation
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  // ... ciphertext + authTag
  return `${iv}:${authTag}:${ciphertext}`;  // Self-contained format
}
```

**Security properties:**
- Unique random IV per encryption (prevents key stream reuse)
- GCM auth tag validated on decryption (prevents tampering)
- Key derived from `ENCRYPTION_KEY` env var (64 hex chars = 256 bits)
- Self-contained format: IV + authTag + ciphertext (no external state needed)

---

## 2. Secrets Management

| Secret | Storage | Encryption | Access |
|--------|---------|------------|--------|
| `ENCRYPTION_KEY` | Environment variable | N/A (key itself) | Never logged, never in code |
| `DATABASE_URL` | Environment variable | N/A | Prisma only |
| `JWT_SECRET` | Environment variable | N/A | Auth middleware only |
| `ZATCA_OTP` | Environment variable | N/A | Device registration only |
| Private keys (ECDSA) | `zatca_devices.private_key` | AES-256-GCM encrypted | Never returned in API responses |
| Compliance cert | `zatca_devices.compliance_cert` | AES-256-GCM encrypted | API use only |
| Production cert | `zatca_devices.production_cert` | AES-256-GCM encrypted | API use only |

### Security rules

- **Private keys are NEVER:**
  - Logged to console or files
  - Returned in API responses
  - Exposed to the client/browser
  - Stored in plain text
- **CSR values** are returned once at device creation and can be regenerated
- **Certificates** are encrypted at rest and decrypted only when making ZATCA API calls

---

## 3. Certificate Lifecycle

```
1. Generate ECDSA key pair (secp256k1)
   ├── Private key → encrypted → zatca_devices.private_key
   └── Public key  → plaintext  → zatca_devices.public_key
   
2. Generate CSR
   ├── CN = deviceName
   ├── O  = companyName
   └── C  = SA
   
3. Submit CSR to ZATCA CSID API
   ├── OTP required
   └── Returns compliance certificate
   
4. Store compliance certificate
   └── Encrypted → zatca_devices.compliance_cert
   
5. Submit to production PCSID
   ├── Compliance cert required
   └── Returns production certificate
   
6. Store production certificate
   └── Encrypted → zatca_devices.production_cert
```

---

## 4. Access Control

| Action | Required Role | Endpoint |
|--------|--------------|----------|
| View compliance dashboard | Any authenticated | `/operations/compliance` |
| View ZATCA status | Any authenticated | `/api/v1/zatca/status/[id]` |
| Submit invoice to ZATCA | SALES_MANAGER+ | `/api/v1/zatca/submit/[id]` |
| Register/manage devices | ADMIN only | `/api/v1/zatca/device` |
| Submit CSR to ZATCA | ADMIN only | `/api/v1/zatca/csid` |
| Manual queue retry | ADMIN only | `/api/v1/zatca/queue/[id]/retry` |
| Process cron queue | Cron job (no auth) | `/api/cron/zatca` |

### Middleware

- All API routes use `authenticateRequest()` which checks:
  1. Session cookie (`session_token`)
  2. Bearer token (`Authorization: Bearer <token>`)
- Prisma middleware auto-filters by `tenantId` (tenant isolation)
- Audit log middleware records all write operations

---

## 5. Audit Trail

All ZATCA-related write operations are automatically logged via the Prisma middleware (`lib/prisma.ts`):

| Operation | Table | Audit Record |
|-----------|-------|-------------|
| Invoice submitted | `rental_invoices` | Action: `UPDATE`, details: status change |
| Invoice status updated | `rental_invoices` | Action: `UPDATE`, details: new ZATCA status |
| Device created | `zatca_devices` | Action: `CREATE`, details: device name |
| Device deleted | `zatca_devices` | Action: `DELETE`, details: device ID |
| Queue item created | `zatca_queue` | Action: `CREATE`, details: invoice ID |
| Queue retry | `zatca_queue` | Action: `UPDATE`, details: retry count |

---

## 6. Input Validation & Sanitization

| Input | Validation | Sanitization |
|-------|-----------|--------------|
| XML content | `validateXmlStructure()` checks required elements | XML special chars escaped (`sanitizeXml()`) |
| VAT number | `validateVatNumber()`: 15-digit format | Whitespace stripped |
| UUID | `validateUuid()`: standard UUID v4 regex | Trimmed |
| Invoice totals | `validateTotals()`: subtotal + vat = total | Rounded to 2 decimals |
| Invoice date | `validateInvoiceDate()`: not in future | Parsed as ISO date |
| Line items | `validateLineItemTotals()`: sum matches invoice | Monetary rounding |

---

## 7. Threat Model

| Threat | Mitigation | Severity |
|--------|-----------|----------|
| Private key exfiltration | AES-256-GCM encrypted at rest, key in env var | High |
| Request tampering | GCM auth tag validation on decrypt | High |
| Invoice data manipulation | PIH chain (SHA-256), changing 1 char changes hash | High |
| Cross-tenant data access | Prisma middleware auto-filters by tenantId | High |
| Session hijacking | JWT with 12h expiry, Bearer token + cookie auth | Medium |
| Replay attack | Idempotency key on invoice creation | Medium |
| XML injection | `sanitizeXml()` escapes `&<>"'` | Medium |
| CSRF | Next.js built-in CSRF protection, Bearer token | Medium |
| DOS via XML bomb | No external entities in XML template | Low |

---

## 8. Recommendations for Production

1. **Rotate ENCRYPTION_KEY** periodically (every 90 days)
2. **Set ZATCA_SANDBOX_MODE=false** in production environment
3. **Restrict cron endpoint** (`/api/cron/zatca`) to internal network or add API key auth
4. **Monitor failed queue items** with alerting (email/Slack)
5. **Set up certificate expiry monitoring** and alert 30 days before expiry
6. **Enable ZATCA production CSID** after compliance testing
7. **Add rate limiting** to `/api/v1/zatca/submit/[id]` to prevent abuse

---

## 9. Compliance Checklist

| Requirement | Status | Evidence |
|------------|--------|----------|
| ECDSA secp256k1 key generation | ✅ | `lib/zatca/device.ts` |
| CSR generation | ✅ | `lib/zatca/device.ts` |
| AES-256-GCM encryption | ✅ | `lib/zatca/encrypt.ts` |
| SHA-256 hashing (PIH) | ✅ | `lib/zatca/pih.ts` |
| UBL 2.1 XML generation | ✅ | `lib/zatca/xml/xml-generator.ts` |
| ZATCA API client | ✅ | `lib/zatca/api.ts` |
| Pre-submission validation | ✅ | `lib/zatca/validate.ts` |
| Retry queue with backoff | ✅ | `lib/zatca/queue.ts` |
| Tenant isolation | ✅ | Prisma middleware (`lib/prisma.ts`) |
| Audit logging | ✅ | Prisma middleware (`lib/prisma.ts`) |
| Certificate storage (encrypted) | ✅ | `zatca_devices` table |
| Invoice status management | ✅ | `rental_invoices.zatcaStatus` |
