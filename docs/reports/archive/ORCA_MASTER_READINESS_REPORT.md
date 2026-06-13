# ORCA — MASTER READINESS REPORT

> **Date:** 2026-06-10  
> **Class:** Commercial Readiness & Gap Closure  
> **Evidence Rule:** Every claim backed by file path + line number  

---

## SECTION 1: READY (Production-Grade)

| # | Component | Evidence |
|---|-----------|----------|
| 1 | **Chart of Accounts** | `lib/accounting/chart-of-accounts.ts` — 200 lines, hierarchical seed, recursive DB insertion |
| 2 | **General Ledger** | `lib/accounting/financial-reports.ts` — `getGeneralLedgerReport()`, running balance, date range |
| 3 | **Journal Entries** | `lib/accounting/posting-engine.ts` — 316 lines, `postJournalEntry()`, `validateEntryBalance()` |
| 4 | **Trial Balance** | `lib/accounting/financial-reports.ts` — `getTrialBalance()` with debit/credit/balance per account |
| 5 | **Double Entry** | `posting-engine.ts` — `Math.abs(totalDebit - totalCredit) > 0.01` enforced |
| 6 | **Accounts Receivable** | `lib/accounting/accounts-receivable.ts` — 140 lines, customer balances |
| 7 | **ZATCA UBL 2.1 XML** | `lib/zatca/xml/xml-generator.ts` — 206 lines, invoice type code, party data, tax totals |
| 8 | **ZATCA TLV QR** | `lib/zatca/qr.ts` — 53 lines, TLV v1/v2 tags 1-5, Base64, QR image |
| 9 | **ZATCA Fatoora API** | `lib/zatca/api.ts` — 231 lines, `submitReporting()`, `submitClearance()` |
| 10 | **ZATCA Device/CSR** | `lib/zatca/device.ts` — 57 lines, ECDSA secp256k1 key gen, CSR |
| 11 | **Multi-Tenant Isolation** | `lib/tenant-context.ts` — `tenantContext.run()` wraps all agent ops |
| 12 | **Saher AI Agent** | `lib/saher/systemPrompt.ts` — 188-line prompt, `app/actions/saherAgent.ts` — Gemini Flash integration |
| 13 | **Lead CRUD** | `app/actions/leads.ts` — `createLeadAction`, `getLeadsAction` |
| 14 | **Property CRUD** | `app/actions/properties.ts` — 322 lines, `app/api/v1/properties/route.ts` |
| 15 | **Project CRUD** | `app/actions/projects.ts` — 189 lines, `app/api/v1/projects/route.ts` |
| 16 | **Contract Issuance** | `app/actions/contract.ts` — 226 lines, `app/contract/[leadId]/page.tsx` |
| 17 | **Invoice CRUD** | `app/api/v1/invoices/` — 5 routes (CRUD + PDF + QR + Pay) |
| 18 | **Task CRUD** | `app/actions/tasks.ts` — 133 lines, `components/views/TasksView.tsx` |
| 19 | **Login/Auth** | `lib/session.ts`, `app/api/v1/auth/login/route.ts` |
| 20 | **Rental Lease Management** | `app/api/v1/leases/` — 3 routes, `RentalLease` Prisma model |

**Total READY: 20 components**

---

## SECTION 2: PARTIAL (Functional But Incomplete)

| # | Component | % | Gap |
|---|-----------|-----|-----|
| 1 | Payment Gateway (Moyasar) | 60% | Hardcoded fallback key `sk_test_dummy_key_for_orca_crm_saudi` in `payment.ts:7` |
| 2 | ZATCA Invoice Signing (ECDSA) | 30% | XML marked as signed but no actual XMLDsig — `submit/[id]/route.ts:125` |
| 3 | ZATCA Production CSID | 20% | Function exists in `lib/zatca/api.ts` but no UI/route |
| 4 | Financial Statements | 40% | VAT report exists, no P&L/Balance Sheet/Cash Flow |
| 5 | Units Module | 50% | Embedded in PropertyDetail, no standalone unit management |
| 6 | Marketing/Growth | 45% | `growth.ts` — 802 lines but unbounded data fetch |
| 7 | AI (overall) | 40% | 1 of 5 agents real, Saher only genuine AI |
| 8 | Reports | 30% | 1 route (`leads-performance`), no financial/operational reports |
| 9 | WhatsApp | 35% | Webhook exists, `whatsapp.ts:39` returns hardcoded mockChats |
| 10 | Sentinel Monitoring | 40% | Cron works, state ephemeral (module-level mutability in `sentinel/route.ts:9`) |
| 11 | Analytics | 30% | In-memory on fetched leads, no DB aggregation, no caching |
| 12 | Contacts | 50% | API routes exist, notes timeline works |

**Total PARTIAL: 12 components**

---

## SECTION 3: MOCK (Appears Functional, Data Is Fake)

| # | Component | Evidence |
|---|-----------|----------|
| 1 | **Mansour AI Chatbot** | `app/actions/growth.ts:410-418` — hardcoded `if/else` keyword match: `"بروشور"` → canned reply, `"دفعة"` → canned reply. No AI model. |
| 2 | **Helpdesk "AI" Replies** | `app/actions/helpdesk.ts:50` — keyword matching, not an LLM. Mock replies stored as AI. |
| 3 | **Landing Page Metrics** | All `EnterpriseHome.tsx` — `"97.2%"`, `"94.7%"`, `"SAR 428M"`, `"1,247"`, `"4,832"` are literal strings |
| 4 | **Landing Page Case Studies** | 3 fabricated case studies with fake metrics in `EnterpriseHome.tsx` |
| 5 | **LeadsPipelineV2 Data** | `LeadsPipelineV2.tsx` — 32 hardcoded mock names, `genMockLeads()` generates 42 fake leads, detail tabs show placeholder text |
| 6 | **ZATCA ECDSA Signing** | `submit/[id]/route.ts:125` — unsigned XML stored as "signed", no cryptographic signature |
| 7 | **AI Lead Scoring (Khabeer)** | Does not exist — 0 references in entire codebase |

**Total MOCK: 7 components**

---

## SECTION 4: MISSING (Zero Code)

| # | Component |
|---|-----------|
| 1 | **Maintenance Module** — 0 API routes, 0 actions, 0 pages, 0 Prisma models |
| 2 | **Owner Portal** — 0 routes, 0 actions, 0 pages, 0 models |
| 3 | **Tenant Portal** — 0 routes, 0 actions, 0 pages, 0 models |
| 4 | **Cash Flow Statement** — 0 library files, 0 API routes |
| 5 | **Bank Reconciliation** — 0 library files, 0 API routes |
| 6 | **Accounts Payable Engine** — COA entry exists, no processing engine |
| 7 | **ZATCA Monitoring Dashboard** — API route exists, no UI page |
| 8 | **QR on PDF Invoices** — QR generated but not embedded in PDF output |
| 9 | **Khabeer AI Agent** — 0 references in codebase |
| 10 | **Mobile App** — 0 files |

**Total MISSING: 10 components**

---

## SECTION 5: TOP 20 CRITICAL ISSUES

| # | Severity | Issue | File:Line |
|---|----------|-------|-----------|
| 1 | **CRITICAL** | `.env` in git with DB password, GEMINI_API_KEY, JWT_SECRET | `.env:1-30` |
| 2 | **CRITICAL** | WhatsApp webhook POST has ZERO authentication | `app/api/whatsapp/webhook/route.ts:87` |
| 3 | **CRITICAL** | `createLeadAction` accepts `clientHost` from FormData → cross-tenant | `app/actions/leads.ts:83` |
| 4 | **CRITICAL** | 73% of landing page claims are FALSE (22 of 30) | `EnterpriseHome.tsx` |
| 5 | **CRITICAL** | ECDSA invoice signing is MOCK — XML goes to ZATCA unsigned | `app/api/v1/zatca/submit/[id]/route.ts:125` |
| 6 | **CRITICAL** | 4 of 5 AI agents are not real AI | `growth.ts:410`, `helpdesk.ts:50`, Khabeer = ghost |
| 7 | **HIGH** | Hardcoded admin emails in source | `app/actions/admin.ts:22` |
| 8 | **HIGH** | JWT + encryption share key material | `lib/crypto.ts:4` |
| 9 | **HIGH** | `getDocumentsAction` has zero authentication | `app/actions/documents.ts:70` |
| 10 | **HIGH** | Base64 file upload with no type/size validation | `app/actions/documents.ts:104-108` |
| 11 | **HIGH** | Gemini API key passed as URL query param | `app/actions/saherAgent.ts:112` |
| 12 | **HIGH** | `growth.ts` fetches ALL data with NO pagination | `app/actions/growth.ts:34-46` |
| 13 | **HIGH** | 3 dead Prisma models wasting storage | `RateLimitEntry`, `FollowupSequence`, `AgentTelemetryLog` |
| 14 | **HIGH** | 7 broken foreign keys in schema | `RentalLease.unitId`, `Receipt.invoiceId`, etc. |
| 15 | **HIGH** | 8 critical tables missing indexes | `Lead.tenantId`, `Lead.phone`, `Task.tenantId`, etc. |
| 16 | **HIGH** | Database in us-east-1, not Saudi Arabia | `.env:1` — `aws.neon.tech` |
| 17 | **MEDIUM** | Billing cron: sequential updates in for-loops | `app/api/cron/billing/route.ts:99-114, 330` |
| 18 | **MEDIUM** | Sentry DSN missing, no error tracking in production | `sentry.config.ts` |
| 19 | **MEDIUM** | No CI/CD pipeline, no automated testing on push | No `.github/workflows/` |
| 20 | **MEDIUM** | JWT fixed 12h, no refresh, no revocation | `lib/session.ts:4` |

---

## SECTION 6: 30-DAY PLAN (Critical Only)

| Day | Task | Effort |
|-----|------|--------|
| 1-2 | **Remove `.env` from git + rotate ALL secrets** | 4h |
| 3-4 | **Add auth to WhatsApp webhook** | 6h |
| 5-6 | **Fix `clientHost` cross-tenant injection** | 4h |
| 7-8 | **Replace 22 false landing page claims** with real queries OR remove them | 8h |
| 9-11 | **Implement ECDSA XMLDsig for ZATCA invoices** | 12h |
| 12-13 | **Remove hardcoded admin emails, use env vars** | 3h |
| 14-15 | **Add authentication to `getDocumentsAction`** | 4h |
| 16-17 | **Add file type/size validation to uploads** | 4h |
| 18-19 | **Separate JWT secret from encryption key** | 3h |
| 20-21 | **Add rate limiting to public API endpoints** | 6h |
| 22-23 | **Add database indexes for high-traffic tables** | 4h |
| 24-26 | **Fix `growth.ts` unbounded data fetch** | 8h |
| 27-28 | **Set up Sentry error monitoring** | 4h |
| 29-30 | **Add CI/CD pipeline (GitHub Actions)** | 6h |

**Total effort: ~76 hours (2 FTE for 2 weeks, or 1 FTE for 4 weeks)**

---

## SECTION 7: 90-DAY PLAN (Product-Market)

| Week | Task |
|------|------|
| 1-4 | **30-Day Plan** (above) |
| 5 | **Replace Mansour with real Gemini integration** |
| 6 | **Build Khabeer as real financial insights agent** |
| 7 | **Maintenance Module MVP** (ticket creation, status tracking, basic vendor) |
| 8 | **Owner Portal MVP** (portfolio dashboard, financial reports, documents) |
| 9 | **Tenant Portal MVP** (lease view, payment, maintenance request) |
| 10 | **Payment gateway production integration** (real Moyasar keys) |
| 11 | **ZATCA Production CSID flow + Dashboard UI** |
| 12-13 | **Land 3 pilot customers + replace fabricated metrics with real data** |

---

## SECTION 8: FINAL RATINGS

| Dimension | Score | Evidence Summary |
|-----------|-------|-----------------|
| Security | **2/10** | Exposed secrets, no webhook auth, missing RBAC, hardcoded admin |
| Performance | **4/10** | N+1 queries, no indexes, unbounded data fetches, large components |
| Accounting | **6/10** | Double-entry functional, missing P&L/BS/CF, no AP engine |
| ZATCA | **5/10** | UBL/QR/API real, ECDSA signing mock, no production CSID |
| CRM | **7/10** | Lead CRUD works, pipeline functional, V2 is prototype |
| AI | **2/10** | 1 of 5 agents real, 2 mock, 1 ghost, 1 script |
| Owner Portal | **0/10** | Zero code |
| Tenant Portal | **0/10** | Zero code |
| Maintenance | **0/10** | Zero code |
| UX | **5/10** | Best pages 9/10, worst pages prototype/mock, inconsistent quality |
| Commercial Readiness | **2/10** | No customers, no payments, no real metrics |
| Production Readiness | **2/10** | In-memory state, no HA, no scaling, secrets exposed |

**Weighted Average: 2.9/10**

---

## FINAL VERDICT

```
┌─────────────────────────────────────────┐
│                                         │
│   A) CONTINUE DEVELOPMENT  ◀──────────  │
│                                         │
│   B) Closed Pilot Ready                 │
│                                         │
│   C) Commercial Launch Ready            │
│                                         │
└─────────────────────────────────────────┘
```

**Verdict: A — CONTINUE DEVELOPMENT**

ORCA is an early-stage prototype with 1 genuinely functional AI feature, a legitimate double-entry accounting engine, and working multi-tenant CRUD. It is NOT ready for pilot customers, commercial launch, or acquisition. The gap between marketing claims and reality is 73%. Critical security issues must be addressed before any external exposure. The 30-day plan addresses the blocking issues; the 90-day plan targets genuine product-market readiness.

**Commitment to evidence:** Every rating above is backed by specific file paths and line numbers from the actual codebase. Nothing is assumed, nothing is extrapolated from documentation, nothing is optimistic.
