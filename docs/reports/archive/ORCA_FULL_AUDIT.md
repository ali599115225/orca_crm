# ORCA — INDEPENDENT HOSTILE AUDIT V1

> **Date:** 2026-06-10  
> **Auditor:** External Independent Assessment  
> **Scope:** Full-system hostile audit — production readiness, security, claims verification, acquisition valuation  

---

## ⚠️ EXECUTIVE SUMMARY

**ORCA is NOT ready for production, investment, or acquisition.** The platform has 1 genuinely working AI feature (Saher), a functional multi-tenant architecture, and basic CRUD. Everything else is either fabricated, missing, or incomplete. Marketing claims on the landing page are unsubstantiated. Sensitive credentials are exposed in the codebase.

**Overall Readiness: 28%**

---

## PHASE 1: SYSTEM INVENTORY

| Asset | Exact Count |
|-------|------------|
| Page Files | 31 |
| API Routes | 83 |
| Server Actions | 34 |
| Prisma Models | 40 (3 dead) |
| Component Files | 52 |
| Forms | 28 |
| Modal Usages | 166 |
| Dashboards | 30 |
| AI Agent Files | 19 (1 real agent) |
| External Integrations | 7 |

---

## PHASE 2: FEATURE COMPLETENESS

| Module | Status | Completion |
|--------|--------|-----------|
| CRM / Leads | Ready | 85% |
| Properties | Ready | 80% |
| Projects | Ready | 75% |
| Contracts | Ready | 75% |
| Invoices | Ready | 80% |
| Accounting (Double-Entry) | Ready | 85% |
| Tasks | Ready | 70% |
| Payments | Partial | 60% |
| Units | Partial | 50% |
| Marketing | Partial | 45% |
| AI | Partial | 40% |
| Helpdesk | Mock | 40% |
| WhatsApp | Mock | 35% |
| Reports | Partial | 30% |
| **Maintenance** | **MISSING** | **0%** |
| **Owner Portal** | **MISSING** | **0%** |
| **Tenant Portal** | **MISSING** | **0%** |

---

## PHASE 3: DATABASE AUDIT

### Dead Models (Zero Application Code)
- `RateLimitEntry` — schema exists, no code uses it
- `FollowupSequence` — schema exists, no code uses it
- `AgentTelemetryLog` — schema exists, no code uses it

### Broken Foreign Keys (7)
- `RentalLease.unitId` — field exists, no relation defined
- `Receipt.invoiceId` — plain String, no FK
- `PaymentTransaction.invoiceId` — plain String, no FK
- `PaymentTransaction.installmentId` — plain String, no FK
- `UserFavorite.tenantId` — no relation to Tenant
- `UserFavorite.userId` — no relation to User
- `FailedLoginAttempt.userId` — no relation to User

---

## PHASE 4: SECURITY AUDIT

### Critical (5)
| ID | Issue |
|----|-------|
| S1 | `.env` committed to git with DATABASE_URL + GEMINI_API_KEY + JWT_SECRET |
| S5 | Super admin emails hardcoded in source (`admin.ts:22`) |
| S10 | WhatsApp webhook POST has ZERO authentication — open to abuse |
| S15 | DB password in `.env`: `npg_hwtN9rdcgS0F` |
| S16 | GEMINI_API_KEY in `.env` |

### High (9)
- S6: `createLeadAction` accepts `clientHost` from FormData → cross-tenant hijacking
- S7: `getDocumentsAction` has zero authentication
- S8: Base64 file upload with no type/size validation (`documents.ts:104-108`)
- S9: Gemini API key passed as URL query param (logged, leakable)
- S11: WhatsApp webhook uses non-timing-safe string comparison
- S17: Moyasar key hardcoded fallback
- S18: EJAR API key hardcoded fallback
- S19: Resend API key hardcoded fallback
- S3: Same key material for JWT + encryption (`crypto.ts:4`)

### Medium (10), Low (3)

---

## PHASE 5: PERFORMANCE AUDIT

### Critical (4)
| ID | Issue |
|----|-------|
| P1 | Billing cron: sequential `tenant.update` in for-loop |
| P2 | Billing cron: sequential `agentLease.update` in for-loop |
| P10 | `growth.ts:34` — fetches ALL projects with ALL leads/units/contracts — NO pagination |
| P14 | `OffersView.tsx` — 1301 lines, monolithic |

### N+1 Queries: 6 found
### Missing Indexes: 8 critical tables
### Sequential Queries (should be Promise.all): 3

---

## PHASE 6: UX AUDIT

**Best pages:** Contract View (9/10), TasksView (8/10)  
**Worst pages:** LeadsPipeline V2 (prototype, 100% mock data), SettingsCompliance (755-line single component)

**LeadsPipeline V2 is a prototype** — 32 hardcoded mock names, 42 fake leads, detail tabs show placeholder text. The UI pattern (30/70 split, collapsible lists) is correct but the data integration is zero.

---

## PHASE 7: ACCOUNTING AUDIT

| Component | Status |
|-----------|--------|
| Chart of Accounts | REAL ✅ |
| General Ledger | REAL ✅ |
| Journal Entries | REAL ✅ |
| Trial Balance | REAL ✅ |
| Double Entry | REAL ✅ |
| Accounts Receivable | REAL ✅ |
| Financial Statements | PARTIAL ⚠️ |
| Accounts Payable | STUB ⚠️ |
| Cash Flow | MISSING ❌ |
| Bank Reconciliation | MISSING ❌ |

---

## PHASE 8: ZATCA AUDIT

| Component | Status |
|-----------|--------|
| UBL 2.1 XML Generation | REAL ✅ |
| TLV QR Code | REAL ✅ |
| Fatoora API Client | REAL ✅ |
| Device/CSR Generation | REAL ✅ |
| Retry Queue | REAL ✅ |
| **ECDSA Invoice Signing** | **MOCK ❌** |
| Production CSID Flow | STUB ⚠️ |
| QR on PDF Invoices | MISSING ❌ |
| ZATCA Dashboard UI | MISSING ❌ |

---

## PHASE 9: AI AUDIT

| Agent | Status | Has Prompt? | Calls AI Model? | Real Output? |
|-------|--------|------------|-----------------|-------------|
| **Saher** | REAL ✅ | Yes | Gemini Flash | Yes |
| **Mansour** | MOCK ❌ | No | No (if/else) | Stored but fake |
| **Baseer** | PARTIAL ⚠️ | No | No (math) | Yes |
| **Khabeer** | GHOST ❌ | No | No | No |
| **Sentinel** | PARTIAL ⚠️ | No | No (shell) | Yes (email) |

**5 agents claimed. 1 is real AI. 2 are scripts. 1 is fake. 1 doesn't exist.**

---

## PHASE 10: SALES CLAIMS AUDIT

| Claim | Verdict |
|-------|---------|
| 97.2% collection rate | **HARDCODED** — literal string, zero DB backing |
| 94.7% accuracy | **HARDCODED** — literal string |
| 428M SAR assets | **HARDCODED** — literal string |
| 1,247+ assets | **HARDCODED** — literal string |
| 4,832+ units | **HARDCODED** — literal string |
| ISO 27001 | **MISLEADING** — no cert, no ISMS, no audit |
| GDPR | **MISLEADING** — no consent, no DPA, secrets in `.env` |
| AWS Saudi Arabia | **MISLEADING** — DB in `us-east-1`, not `me-central-1` |
| CMA compliance | **MISLEADING** — no license, no regulatory code |
| AES-256 encryption | **VERIFIED** — but key from hardcoded JWT_SECRET |

**All performance metrics are fabricated.**

---

## PHASE 11: COMMERCIAL READINESS

| Category | Score |
|----------|-------|
| Technical Readiness | 4/10 |
| Operational Readiness | 3/10 |
| Accounting Readiness | 4/10 |
| Compliance Readiness | 2/10 |
| Commercial Readiness | 3/10 |
| Pilot Readiness | 4/10 |
| **Production Readiness** | **2/10** |

---

## PHASE 12: ACQUISITION REVIEW

### 3 Real Strengths
1. Working Gemini ↔ WhatsApp lead qualification (Saher) — genuinely functional
2. Multi-tenant isolation with proper DB boundaries
3. Double-entry accounting engine — surprisingly complete

### 3 Fatal Weaknesses
1. **Deceptive marketing** — fake metrics, fake agents, fake certifications
2. **Security catastrophe** — `.env` with all secrets exposed in git
3. **No customers** — zero real users, zero revenue, zero real metrics

### Estimated Market Value: **50,000 – 150,000 SAR**

### What Prevents Acquisition Today
1. No real customers, revenue, or metrics
2. Exposed secrets in repository
3. Deceptive marketing claims
4. No payment/billing to accept money
5. Not production-ready
6. No regulatory approvals

### What Would 3x Value in 90 Days
1. Land 3 paying pilot customers → real metrics replace fabrication
2. Fix security → rotate all secrets, remove `.env` from git
3. Make AI agents real → Gemini for Mansour + Khabeer
4. Integrate payment gateway (Moyasar/HyperPay)
5. Deploy to AWS me-central-1
6. Persistent DLQ (Redis) + monitoring (Sentry)
7. Real ZATCA invoice signing (ECDSA)

---

## FINAL ANSWERS

| Question | Answer |
|----------|--------|
| **What is ORCA actually missing?** | Maintenance module, Owner Portal, Tenant Portal, Cash Flow, Bank Reconciliation, real AI for 4 of 5 agents, real customers, real metrics, payment integration, ZATCA signing, production security |
| **What must be built in 30 days?** | Remove `.env` from git + rotate secrets, add auth to WhatsApp webhook, replace 5 hardcoded metrics with real DB queries OR remove them, integrate payment gateway |
| **What must be built in 90 days?** | Real AI for Mansour + Khabeer, ZATCA ECDSA signing, Maintenance module, Owner Portal MVP, 3 pilot customers with real data |
| **Is ORCA ready to sell today?** | **NO.** Zero real customers, zero real metrics, fabrications on landing page, exposed secrets |
| **Is ORCA ready for investment today?** | **NO.** Deceptive marketing claims constitute fraud risk for investors. Security posture is negligent |
| **Is ORCA ready for acquisition today?** | **NO.** Any acquirer's technical due diligence would kill the deal within 15 minutes of code review |
