# ORCA — PRODUCT GAP ANALYSIS

> **Date:** 2026-06-10
> **Auditor:** Agent 3 — Product & Operations Lead
> **Purpose:** Module-by-module gap analysis identifying what's implemented, what's missing, and what prevents production use.

---

## 1. CRM / Leads — READY (85%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Lead CRUD (create, read, update, delete) | `app/actions/leadActions.ts`, `app/actions/leads.ts` | Real |
| Pipeline stages (NEW → CONTACTED → ... → WON/LOST) | `prisma/schema.prisma` (LeadStatus enum), `app/actions/leadActions.ts` | Real |
| Kanban pipeline UI (drag & drop stages) | `components/views/pipeline/Pipeline.tsx`, `KanbanColumn.tsx`, `KanbanCard.tsx` | Real |
| Lead detail tabs (Activities, Contacts, Opportunities, Offers, Tasks, Tours, AI Analysis) | `components/views/tabs/` | Real |
| Lead scoring (0–100) | `prisma/schema.prisma:122` (leadScore), `app/actions/leads.ts` | Real |
| Lead-to-project linking | `prisma/schema.prisma:110` (projectId FK) | Real |
| Lead-to-agent assignment | `prisma/schema.prisma:130` (assignedAgentId) | Real |
| Activity logging | `prisma/schema.prisma:139-151` (LeadActivity model) | Real |
| Task linking per lead | `prisma/schema.prisma:154-172` (Task model) | Real |
| Bulk operations | None | Missing |
| CSV import/export | None | Missing |
| **LeadsPipeline V2** (prototype) | `components/views/pipeline/LeadsPipelineV2.tsx` | Mock — 32 hardcoded names, 42 fake leads |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| Pipeline V2 has zero DB integration | HIGH | The most polished pipeline UI is entirely decorative |
| No bulk lead actions (merge, delete, reassign) | MEDIUM | Manual ops at scale |
| No CSV import/export | MEDIUM | Migration from spreadsheets requires manual entry |
| No lead duplicate detection | MEDIUM | Data quality risk |
| No automated lead routing (round-robin assignment) | LOW | Manual assignment only |
| AI Analysis tab uses mock/fallback data | MEDIUM | `components/views/tabs/AIAnalysis.tsx` — rule-based fallback |

### Critical Gap Preventing Production Use
**Pipeline V2 is a prototype with 100% mock data.** The UI pattern (30/70 split, collapsible lists) is correct but renders zero real leads. This is currently the primary lead management interface visible in the sidebar.

---

## 2. Properties — READY (80%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Unit CRUD | `app/actions/properties.ts`, `components/properties/PropertyList.tsx` | Real |
| Property detail view | `components/properties/PropertyDetail.tsx` | Real |
| Unit ↔ Project linking | `prisma/schema.prisma:298-331` (Unit model, projectId FK) | Real |
| Book Unit flow | `components/properties/PropertyDetail.tsx` (Book Unit Modal) | Real |
| Handover flow | `components/properties/PropertyDetail.tsx` (Handover Modal) | Real |
| Unit status tracking (Available, Reserved, Sold) | `prisma/schema.prisma:322` (status field) | Real |
| Media/docs attachments (JSON) | `prisma/schema.prisma:316-319` | Real |
| Lat/Lng coordinates | `prisma/schema.prisma:312-313` | Real |
| Tour type/URL (3D tours) | `prisma/schema.prisma:320-321` | Real |
| Search & filter | `components/properties/PropertyList.tsx` | Real |
| Favorites (in-memory only) | `app/api/properties/[id]/favorites/route.ts` | Mock — lost on restart |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| No property image upload | HIGH | Cannot attach real property photos |
| No map/GIS view | MEDIUM | No spatial browsing of portfolio |
| Favorites volatile (in-memory Map) | MEDIUM | Lost on server restart — `UserFavorite` model exists but unused |
| No property comparison view | LOW | Cannot compare 2+ units side-by-side |
| No property valuation history | LOW | Price changes not tracked |
| Missing enum for property types | LOW | `type` field is free-text String not enum |

### Critical Gap Preventing Production Use
**No image upload capability.** A property management system without photo upload is incomplete for real-world use by agents and buyers.

---

## 3. Projects — READY (75%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Project CRUD | `app/actions/projects.ts`, `components/projects/ProjectsOverview.tsx` | Real |
| Project detail with unit listing | `components/projects/ProjectDetail.tsx` | Real |
| Unit status toggling (Available/Hold) | `app/actions/projects.ts` | Real |
| Installment tracking | `prisma/schema.prisma:355-373` (Installment model) | Real |
| Construction timeline | `components/projects/ProjectDetail.tsx` | Real |
| Project KPI cards (total units, sold, booked, price range) | `components/projects/ProjectsOverview.tsx` | Real |
| Project status enum (PLANNING, UNDER_CONSTRUCTION, COMPLETED, SOLD_OUT) | `prisma/schema.prisma:36-41` | Real |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| No progress photos/timeline uploads | HIGH | Construction tracking is text-only |
| No project-level financial rollup | MEDIUM | Cannot see total revenue per project aggregated from units |
| No project document repository | MEDIUM | Blueprints, permits, contracts not attachable |
| No milestone/phase management | LOW | Construction timeline is flat, not phased |
| No contractor/vendor linking | LOW | No vendor model exists |

### Critical Gap Preventing Production Use
**No project financial rollup.** Developers need to see total project revenue, costs, and margin. Currently only individual unit prices are tracked.

---

## 4. Contracts — READY (75%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Contract creation (unified view) | `app/contract/[leadId]/page.tsx`, `app/contract/[leadId]/ContractView.tsx` | Real |
| Contract ↔ Unit ↔ Lead linking | `prisma/schema.prisma:333-352` (Contract model) | Real |
| Installment schedule | `prisma/schema.prisma:355-373` (Installment model) | Real |
| Vat type/rate tracking | `prisma/schema.prisma:345-346` | Real |
| Signing date tracking | `prisma/schema.prisma:342` | Real |
| Contract printing (print-friendly view) | `app/contract/[leadId]/PrintButton.tsx` | Real |
| Contract wizard for creation | `components/features/ContractWizard.tsx` | Real |
| Ejar integration (submit button) | `app/actions/ejar.ts` | Partial — client-side mock |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| No contract templates (sales vs. rental) | HIGH | All contracts use same format regardless of type |
| No digital signature integration | HIGH | Print-and-sign only, no electronic signing |
| No contract amendment workflow | MEDIUM | Cannot modify active contracts |
| No contract termination/cancellation flow | MEDIUM | Status only Active/Cancelled, no formal workflow |
| No contract renewal automation | MEDIUM | Rental contracts don't auto-renew |
| Ejar submission is mock (no real API call) | HIGH | `app/actions/ejar.ts` — hardcoded API key fallback |

### Critical Gap Preventing Production Use
**No digital signatures** and **Ejar integration is mock.** Saudi real estate contracts require Ejar registration by law. Without it, contracts are legally non-compliant.

---

## 5. Invoices — READY (80%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Invoice CRUD | `app/api/v1/invoices/`, `app/actions/finance.ts` | Real |
| Invoice ZATCA compliance fields | `prisma/schema.prisma:399-445` (RentalInvoice model) | Real |
| VAT calculation (15%) | `lib/vat/engine.ts` | Real |
| Invoice numbering (auto-increment per tenant) | `prisma/schema.prisma:189-190` (invoicePrefix, nextInvoiceNumber) | Real |
| Payment status tracking | `prisma/schema.prisma:432` | Real |
| ZATCA UBL 2.1 XML generation | `lib/zatca/xml/xml-generator.ts` | Real |
| TLV QR code generation | `lib/zatca/qr.ts` | Real |
| ZATCA Fatoora API client | `lib/zatca/api.ts` | Real |
| ZATCA retry queue | `lib/zatca/queue.ts`, `prisma/schema.prisma:467-487` (ZatcaQueue) | Real |
| ZATCA device/CSR generation | `lib/zatca/device.ts` | Real |
| PIH (Previous Invoice Hash) | `lib/zatca/pih.ts` | Real |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| **ZATCA ECDSA invoice signing is MOCK** | **CRITICAL** | `lib/zatca/encrypt.ts` — generates keys but doesn't sign with real ECDSA |
| Production CSID flow is stub | HIGH | Cannot get production ZATCA compliance certificate |
| QR code not rendered on PDF invoices | MEDIUM | ZATCA phase 2 requires QR on printed invoices |
| No ZATCA dashboard/UI for compliance monitoring | MEDIUM | No visibility into ZATCA submission status |
| No invoice PDF generation | MEDIUM | Invoices exist as DB records, no PDF output |
| Bank reconciliation missing | HIGH | `lib/accounting/` — Accounts Payable is stub, no bank rec |

### Critical Gap Preventing Production Use
**ZATCA ECDSA signing is mock.** Without real cryptographic signing, invoices are not ZATCA-compliant. Saudi businesses legally require phase 2 compliance for electronic invoicing.

---

## 6. Accounting (Double-Entry) — READY (85%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Chart of Accounts (hierarchical) | `lib/accounting/chart-of-accounts.ts`, `prisma/schema.prisma:632-653` (Account model) | Real |
| Journal Entries (double-entry) | `lib/accounting/posting-engine.ts`, `prisma/schema.prisma:672-709` | Real |
| Trial Balance | `lib/accounting/financial-reports.ts` | Real |
| General Ledger | `lib/accounting/index.ts`, `prisma/schema.prisma:615-628` | Real |
| Accounts Receivable | `lib/accounting/accounts-receivable.ts` | Real |
| Aging Reports | `lib/accounting/aging-report.ts` | Real |
| Account Balances | `prisma/schema.prisma:655-669` (AccountBalance) | Real |
| Audit controls (all writes logged) | `lib/accounting/audit-controls.ts` | Real |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| Cash Flow Statement | HIGH | Missing entirely — one of 3 core financial statements |
| Bank Reconciliation | HIGH | No bank statement import or matching |
| Accounts Payable | HIGH | Stub only (`lib/accounting/accounts-receivable.ts` covers AR only) |
| Financial statements are partial | MEDIUM | Balance Sheet exists, Income Statement partial, Cash Flow missing |
| No period closing process | MEDIUM | No fiscal year-end close workflow |
| No budget vs. actual comparison | LOW | No budgeting module |

### Critical Gap Preventing Production Use
**Missing Cash Flow Statement and Bank Reconciliation.** Any real estate business requires these for financial operations. The accounting engine is technically capable but incomplete for CFO-level reporting.

---

## 7. Tasks — READY (70%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Task CRUD | `app/actions/tasks.ts`, `components/views/TasksView.tsx` | Real |
| Task ↔ Lead linking | `prisma/schema.prisma:158-159` | Real |
| Task ↔ User assignment | `prisma/schema.prisma:160-161` | Real |
| Priority levels (LOW, MEDIUM, HIGH) | `prisma/schema.prisma:55-59` | Real |
| Task status (PENDING, COMPLETED, OVERDUE) | `prisma/schema.prisma:61-64` | Real |
| Due date tracking | `prisma/schema.prisma:164` | Real |
| Pagination | `components/views/TasksView.tsx` | Real |
| Stat summary cards | `components/views/TasksView.tsx` | Real |
| Inline toggle complete | `app/actions/tasks.ts` | Real |
| Audit trail | `prisma/schema.prisma:169-170` | Real |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| No task notifications (email/push) | MEDIUM | Due dates not alerted |
| No recurring tasks | MEDIUM | Weekly/monthly tasks must be recreated |
| No task dependencies | LOW | Cannot link tasks (blocked by / blocks) |
| No time tracking | LOW | No effort estimation or time logging |
| No task templates | LOW | Repetitive task sets must be created manually |

### Critical Gap Preventing Production Use
None critical. Tasks module is functional for basic task management. Missing notifications reduce utility for deadline-driven workflows.

---

## 8. Payments — PARTIAL (60%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Moyasar payment integration | `app/actions/payment.ts` | Partial — API key hardcoded fallback |
| Payment transaction tracking | `prisma/schema.prisma:711-733` (PaymentTransaction) | Real |
| Subscription payments (Basic/Silver/Gold) | `app/actions/payment.ts` | Real |
| Addon payments | `app/actions/payment.ts` | Real |
| Payment callback handler | `app/api/payment/callback/` | Real |
| Commission payments | `prisma/schema.prisma:583-598` (CommissionPayment) | Real |
| Installment payment tokens | `prisma/schema.prisma:366` (securePaymentToken UUID) | Real |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| No payment gateway for tenant-to-owner rent payments | CRITICAL | Tenants cannot pay rent online |
| No payment link generation for invoices | HIGH | Manual payment collection |
| No payment reminders/dunning | HIGH | No automated late payment follow-up |
| No receipt generation for payments | MEDIUM | Receipt model exists but unused in payment flow |
| No refund workflow | MEDIUM | No reversal or credit note flow |
| PaymentTransaction has broken FKs (invoiceId, installmentId are plain Strings) | MEDIUM | `prisma/schema.prisma:715-716` — no relation constraints |
| Receipt.invoiceId is plain String with no FK | MEDIUM | `prisma/schema.prisma:604` |

### Critical Gap Preventing Production Use
**No tenant rent payment capability.** The payment system handles internal subscriptions but cannot accept rent payments from tenants. A real estate platform without rent collection is commercial dead weight.

---

## 9. Units — PARTIAL (50%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Unit CRUD under projects | `prisma/schema.prisma:298-331`, `app/actions/properties.ts` | Real |
| Unit ↔ Contract 1:1 link | `prisma/schema.prisma:337-338` (unique unitId on Contract) | Real |
| Unit pricing | `prisma/schema.prisma:306` | Real |
| Unit specs (beds, area, floor, type) | `prisma/schema.prisma:307-310` | Real |
| Unit status | `prisma/schema.prisma:322` | Real |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| No unit availability calendar | HIGH | Cannot view unit availability over time |
| No unit type categorization (apartment, villa, commercial, land) | MEDIUM | Free-text type field, no enum |
| No unit pricing history / price changes | MEDIUM | Price changes not tracked |
| No unit-level expense tracking | MEDIUM | Unit costs (maintenance, utilities) not tracked |
| No unit occupancy history | LOW | Past occupants not linked to unit |
| Unit ↔ RentalLease link is broken (unitId exists but no FK relation) | MEDIUM | `prisma/schema.prisma:380` — plain String, no relation |

### Critical Gap Preventing Production Use
**No availability calendar.** Real estate sales and leasing requires knowing which units are available at any given time. Without it, double-booking is probable.

---

## 10. Marketing — PARTIAL (45%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Campaign management CRUD | `components/views/CampaignsView.tsx` | Real — Basic CRUD |
| Platform connections (encrypted API keys) | `components/marketing/PlatformConnectors.tsx`, `prisma/schema.prisma:550-565` | Real |
| Campaign KPI cards | `components/views/CampaignsView.tsx` | Real |
| Lead source tracking | `prisma/schema.prisma:119` (source field on Lead) | Real |
| Marketing landing page (EnterpriseHome) | `app/components/EnterpriseHome.tsx` | Real — Landing page with portal claims |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| No real ad platform integration (Google Ads, Meta, Snapchat) | CRITICAL | Platform connection keys are stored but never used for actual ad management |
| No campaign ROI calculation | HIGH | Cannot measure which campaigns generate leads |
| No lead attribution tracking | HIGH | Cannot attribute leads to specific campaigns |
| No email marketing | MEDIUM | No email campaign builder or send capability |
| No social media scheduling | MEDIUM | No content calendar or posting |
| Landing page claims about portals, maintenance, and metrics are fabricated | CRITICAL | `EnterpriseHome.tsx:808-823` — Owner/Tenant portal features listed but don't exist |

### Critical Gap Preventing Production Use
**Marketing landing page claims features that don't exist** (Owner Portal, Tenant Portal, Maintenance module, 97.2% collection rate, 94.7% accuracy, ISO 27001, GDPR compliance). This creates legal exposure for false advertising. Also, **no real ad integration** — platform connectors store credentials but perform no actual ad operations.

---

## 11. AI — PARTIAL (40%)

### What's Implemented
| Agent | File(s) | AI Model | Status |
|-------|---------|----------|--------|
| **Saher** (Compliance Agent) | `lib/agents/saher.ts` | Gemini Flash + system prompt | **REAL** — Contract/invoice compliance checking via Gemini |
| **Mansour** (Sales Agent) | `app/actions/growth.ts:274-428` | None (keyword-matching) | **MOCK** — 4-template keyword matcher, stores chats in DB |
| **Baseer** (Strategy Agent) | `lib/agents/baseer.ts` | None (math calculator) | **PARTIAL** — Cash flow calculations, no AI inference |
| **Sanad** (Recovery Agent) | `lib/agents/sanad.ts` | None (retry logic) | **PARTIAL** — Retry/self-healing, no AI inference |
| **Sentinel** (Monitoring Agent) | `app/actions/sentinel.ts` | None (shell commands) | **PARTIAL** — System diagnostics via CLI + DNS + HTTP |
| **Khabeer** (Expert Agent) | DOES NOT EXIST | N/A | **GHOST** — Referenced but no code anywhere |

### Saher Deep Dive (The Only Real Agent)
| Component | File | Status |
|-----------|------|--------|
| System prompt (Arabic, 188 lines) | `lib/saher/systemPrompt.ts` | Real |
| Gemini Flash API call | `lib/saher/replayEngine.ts` | Real |
| WhatsApp lead qualification | `app/actions/saherAgent.ts` | Real — Connected to Green API webhook |
| WhatsApp webhook endpoint | `app/api/whatsapp/` | Real — But ZERO auth (S10) |
| Lead scoring via AI | `app/actions/saherAgent.ts` | Real |

### Mansour Deep Dive (Mock)
| Behavior | Implementation | File |
|----------|---------------|------|
| Creates hardcoded mock chats on first load | `growth.ts:302-314` — 2 fixed Arabic conversations | Real |
| Responds to user messages | 4-template keyword matcher: "price"/"location"/"tour"/fallback | Mock |
| Stores chats in DB | `prisma.schema.prisma:533-548` (MansourChat model) | Real |
| DB writes for new conversations | `growth.ts:323` | Real |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| **Mansour needs real Gemini integration** | CRITICAL | The sales agent is a 4-template bot, not AI |
| **Khabeer agent doesn't exist** | CRITICAL | Advertised as 5th agent, zero code |
| **Baseer needs LLM for scenario reasoning** | HIGH | Only does math — no inference about strategy |
| WhatsApp webhook has ZERO authentication | CRITICAL | Anyone can POST to the WhatsApp webhook |
| Sentinel has no persistent monitoring | MEDIUM | One-shot CLI check, no continuous monitoring |
| No AI usage dashboard or cost tracking | MEDIUM | No visibility into Gemini API spend |
| Gemini API key passed as URL query param | HIGH | `app/actions/aiClient.ts` — API key in URL leaks to logs |

### Critical Gap Preventing Production Use
**4 of 5 advertised AI agents are not real AI.** Mansour is a keyword matcher, Khabeer is a ghost, Baseer is a calculator, and Sentinel is a shell script. Only Saher has actual LLM integration. This is a fundamental product integrity issue.

---

## 12. Helpdesk — MOCK (40%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Ticket CRUD | `app/actions/helpdesk.ts`, `components/views/HelpdeskView.tsx` | Real |
| Ticket ↔ Tenant scoping | `prisma/schema.prisma:239-251` (Ticket model) | Real |
| Ticket status (OPEN/CLOSED) | `app/actions/helpdesk.ts` | Real |
| Auto-reply on ticket creation | `app/actions/helpdesk.ts:49-61` | Mock — Keyword matching |
| AI response storage | `prisma/schema.prisma:246` (aiResponse field) | Real |
| Close ticket action | `app/actions/helpdesk.ts:82-101` | Real |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| **AI responses are keyword-matched, not AI-generated** | CRITICAL | 4 if/else templates, NOT AI |
| No ticket categories/priorities | MEDIUM | All tickets are equal priority |
| No ticket assignment to staff | HIGH | Tickets float unassigned |
| No SLA tracking or response time metrics | HIGH | No service level measurement |
| No knowledge base / FAQ | MEDIUM | No self-service help content |
| No file attachments on tickets | MEDIUM | Cannot attach screenshots |
| No ticket history / threaded replies | MEDIUM | Single aiResponse field, no conversation |
| No email-to-ticket gateway | LOW | Tickets must be created via UI only |

### Critical Gap Preventing Production Use
**Helpdesk claims "AI" but uses 4 hardcoded if/else templates.** The `description` field is matched against keywords like "باقة", "ربط", "خطأ", with a fallback generic response. There is zero AI inference. This is misrepresented as an "AI helpdesk."

---

## 13. WhatsApp — MOCK (35%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| WhatsApp chat UI | `components/views/WhatsAppView.tsx` | Real — Chat interface |
| Mock chat data | `app/actions/whatsapp.ts:39-80` | Mock — 3 hardcoded conversations |
| Mock message sending | `app/actions/whatsapp.ts:91-118` | Mock — Keyword-matching responses |
| Tenant WhatsApp connection toggle | `app/actions/whatsapp.ts:11-29` | Real — Updates `tenants.whatsappConnected` |
| Green API webhook handler | `app/api/whatsapp/` | Real — Processes inbound messages |
| Saher ↔ WhatsApp integration | `app/actions/saherAgent.ts` | Real — Saher processes WhatsApp leads |
| WhatsApp chat UI view | `components/views/WhatsAppView.tsx` | Real |
| Inline chat panel | `components/views/WhatsAppView.tsx` | Real |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| **WhatsApp chat data is hardcoded mock** | CRITICAL | `whatsapp.ts:39` — `mockChats` array, never reads from DB |
| No real WhatsApp Business API integration | CRITICAL | `whatsapp.ts:91` — `sendMockWhatsAppMessageAction` keyword-matches |
| No multi-number/conversation routing | MEDIUM | Only mock 3 conversations |
| No media message support | MEDIUM | Text-only mock |
| No message templates (pre-approved WhatsApp templates) | MEDIUM | No template management |
| Webhook has ZERO authentication | CRITICAL | `app/api/whatsapp/webhook/route.ts` — open to abuse |

### Critical Gap Preventing Production Use
**WhatsApp integration is entirely mock.** The chat UI shows hardcoded conversations. The "send message" action uses 5 if/else branches not AI. Real WhatsApp Business API integration (Green API or Meta Cloud API) needs to be built. Saher can process leads from the webhook, but the chat interface users see is fake.

---

## 14. Reports — PARTIAL (30%)

### What's Implemented
| Feature | File(s) | Status |
|---------|---------|--------|
| Lead performance reports | `app/api/v1/reports/` | Real |
| Conversion rate reports | `app/api/v1/reports/` | Real |
| CAC calculation | `app/api/v1/reports/` | Real |
| Financial reports (partial) | `lib/accounting/financial-reports.ts` | Partial |
| Aging reports | `lib/accounting/aging-report.ts` | Real |
| Agent performance reports | `app/actions/dashboard.ts` | Real |

### What's Missing
| Gap | Severity | Impact |
|-----|----------|--------|
| No visual dashboard reports (charts/graphs) | HIGH | Data exists but no visualization |
| No exportable reports (PDF/Excel) | HIGH | Cannot share reports externally |
| No scheduled/automated reports | MEDIUM | Must manually request each report |
| No owner financial report (portfolio summary) | CRITICAL | The Owner Portal's primary need |
| No tenant payment history report | CRITICAL | Tenant's primary document need |
| No occupancy report | HIGH | Cannot report unit occupancy rates |
| No revenue per property/project report | HIGH | Cannot report per-asset performance |
| No custom report builder | MEDIUM | Fixed report types only |

### Critical Gap Preventing Production Use
**No exportable or visual reports.** All reporting data exists in the DB but there is no PDF/Excel export and no chart visualization. For an ERP that reports serve as the primary deliverable to owners, this is a fatal gap.

---

## 15. Maintenance — MISSING (0%)

### Status
**Nothing exists.** No Prisma models, no API routes, no server actions, no UI components, no pages. The word "maintenance" appears only in the landing page marketing copy (`EnterpriseHome.tsx`) and in comments.

### Required Components
See `ORCA_MAINTENANCE_MODULE_SPEC.md` for full specification.

### Critical Gap
This is a core module for any property management platform. Without maintenance management, the platform cannot serve the full operational lifecycle of real estate.

---

## 16. Owner Portal — MISSING (0%)

### Status
**Nothing exists.** The landing page (`EnterpriseHome.tsx:808-823`) advertises an Owner Portal with portfolio dashboard, financial reports, document access, and communication features. None of these exist in the codebase.

### Required Components
See `ORCA_OWNER_PORTAL_SPEC.md` for full specification.

### Critical Gap
The marketing page promises features that do not exist. Any owner onboarding would immediately discover the portal is non-functional. This is the highest-impact missing feature for commercial viability.

---

## 17. Tenant Portal — MISSING (0%)

### Status
**Nothing exists.** The landing page (`EnterpriseHome.tsx:821-823`) advertises a Tenant Portal with lease view, payment, maintenance requests, communication, and document access. None exist.

### Required Components
See `ORCA_TENANT_PORTAL_SPEC.md` for full specification.

### Critical Gap
Without a tenant portal, tenants cannot pay rent online, view their lease, or submit maintenance requests. This forces all tenant interactions through manual channels.

---

## System-Level Critical Gaps

| # | Gap | Modules Affected | Priority |
|---|-----|-----------------|----------|
| 1 | **ZATCA ECDSA signing is mock** | Invoices, Accounting | P0 |
| 2 | **No tenant rent payment capability** | Payments, Tenant Portal | P0 |
| 3 | **4 of 5 AI agents are mock/script/ghost** | AI, WhatsApp, Helpdesk | P0 |
| 4 | **Owner Portal advertised but doesn't exist** | Owner Portal, Marketing | P0 |
| 5 | **Tenant Portal advertised but doesn't exist** | Tenant Portal, Marketing | P0 |
| 6 | **Maintenance module entirely missing** | Maintenance | P0 |
| 7 | **Pipeline V2 is mock data (no DB integration)** | CRM / Leads | P1 |
| 8 | **No property image upload** | Properties | P1 |
| 9 | **No digital contract signing** | Contracts, Ejar | P1 |
| 10 | **No report export (PDF/Excel)** | Reports, Accounting | P1 |
| 11 | **Cash Flow Statement missing** | Accounting | P1 |
| 12 | **Bank Reconciliation missing** | Accounting | P1 |
| 13 | **Ejar integration is mock** | Contracts | P1 |
| 14 | **Marketing landing page claims fabricated metrics** | Marketing | P1 |
| 15 | **WhatsApp chats are hardcoded mock** | WhatsApp, AI | P2 |

---

## Summary

| Status | Count | Modules |
|--------|-------|---------|
| **READY (>=75%)** | 7 | CRM/Leads, Properties, Projects, Contracts, Invoices, Accounting, Tasks |
| **PARTIAL (30–60%)** | 5 | Payments, Units, Marketing, AI, Reports |
| **MOCK (<40%, not real)** | 2 | Helpdesk, WhatsApp |
| **MISSING (0%)** | 3 | Maintenance, Owner Portal, Tenant Portal |

**Overall Production Readiness:** The 7 "Ready" modules form a functional CRM core. The 5 "Partial" modules need completion. The 2 "Mock" modules need full rebuilds. The 3 "Missing" modules need to be built from scratch. **The platform cannot go to market with 10 of 17 modules incomplete, mocked, or missing.**
