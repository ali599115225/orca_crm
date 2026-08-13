نتيجة [ORCA STEP 2 branch audit](f239fa9c-f147-473b-97b2-6f0ab51ffa36) جاهزة لمراجعة Command Center. الثلاثون بنداً رُبطت بالمراجع السبعة المحددة. المستودع لم يُعدَّل.

## 1. LOAD GATE

OWNER-CONFIRMED EVIDENCE = LOADED  
ITEM COUNT = 30  
E2E COUNT = 10  
FC COUNT = 20  
MISSING IDS = 0  
DUPLICATE IDS = 0  
STEP 1 RECLASSIFICATION PERFORMED = NO

## 2. FINAL BRANCH RECONCILIATION LEDGER

| STEP1_ID | GOVERNED_TITLE | FROZEN_STEP1_CLASS | BASELINE_EVIDENCE | HISTORICAL_EVIDENCE_REF | HISTORICAL_COMMIT_SHA | EXACT_PATHS | STEP2_CLASS | EVIDENCE_STATUS | RATIONALE |
|---|---|---|---|---|---|---|---|---|---|
| E2E-01 | Lead -> WON/LOST | PASS / NO ACTION | `2b9c050` `createLeadCore` `lib/leads/service.ts`; `updateLeadStatusAction` `app/actions/leads.ts`; `LeadStatus` includes `WON`/`LOST` `prisma/schema.prisma` | NONE | NONE | `lib/leads/service.ts`; `app/actions/leads.ts`; `prisma/schema.prisma` | ALREADY_PRESENT | PRESENT | Frozen PASS. Primary create/status path including WON/LOST is on pinned baseline. No historical absorption required. |
| E2E-02 | Property/Project Inventory -> Transaction Readiness | PRODUCT_DEFECT | `2b9c050` Create Project button has no `onClick` `components/views/ProjectsView.tsx`; `listingReadiness` is display mapping only `app/api/properties/route.ts` | Inspected EXEC-008/009/010; no ProjectsView/properties-route change | NONE | `components/views/ProjectsView.tsx`; `app/api/properties/route.ts` | DIRECT_FIX | PRESENT | Frozen defect remains on baseline. Bounded EXEC refs do not touch these files. |
| E2E-03 | Inquiry -> Tour Outcome | PRODUCT_DEFECT | `2b9c050` `updateTourStatus` follow-up `Task` only when `status === "COMPLETED"` `lib/domain/transaction-spine/update-tour-status.ts`; `ALLOWED_STATUSES` includes `NO_SHOW` with no follow-up | EXEC-009 `lib/workflow-communication/*` is durable workflow/thread integrity, not tour confirm/conflict | NONE | `lib/domain/transaction-spine/update-tour-status.ts` | DIRECT_FIX | PRESENT | Tour outcome path exists but frozen defect (no confirm/conflict; no-show follow-up) is unfixed. EXEC-009 excludes UI and does not implement tour scheduling. |
| E2E-04 | Offer -> Reservation | PRODUCT_DEFECT | `2b9c050` `acceptOfferAndCreateContract` accepts `PENDING`/`ACCEPTED` only `lib/domain/transaction-spine/accept-offer.ts`; PATCH `ALLOWED` excludes `ACCEPTED` `app/api/v1/offers/[id]/route.ts` | EXEC-008 diff does not include `accept-offer.ts` | NONE | `lib/domain/transaction-spine/accept-offer.ts`; `app/api/v1/offers/[id]/route.ts` | DIRECT_FIX | PRESENT | `SENT`/`NEGOTIATION` cannot complete accept. No bounded historical implementation of this accept/reservation gap. |
| E2E-05 | Contract -> Active Deal | PRODUCT_DEFECT | `2b9c050` `_createContractInTx` sets `signedAt: null` `lib/domain/transaction-spine/issue-contract.ts`; wizard success calls `contract.signedAt.toISOString()` `app/actions/contract.ts` | EXEC-008 `e68ae101` amends `issue-contract.ts`/`sign-contract.ts` for template/authority; allowlist excludes UI; `app/actions/contract.ts` not in 008-vs-baseline diff | NONE | `lib/domain/transaction-spine/issue-contract.ts`; `app/actions/contract.ts` | DIRECT_FIX | PRESENT | Frozen defect is wizard crash / no operator sign UI. EXEC-008 companion does not modify the crashing action and forbids UI. Not a usable absorption for this ID. |
| E2E-06 | Contract -> Cash / Settlement / Accounting | PRODUCT_DEFECT + CLIENT_CONFIGURATION_REQUIRED | `2b9c050` `app/api/v1/invoices/[id]/pay/route.ts` has no installment/`completePaymentTransaction` usage; `getDefaultPaymentProviderRuntime` requires CONNECTED `NGENIUS`/`CUSTOM_PAYMENT` `lib/revenue-integrity/trust-gates.ts` | EXEC-008 adds to `payment-reconciliation.ts` but does not modify `invoices/[id]/pay/route.ts`; provider activation excluded | NONE | `app/api/v1/invoices/[id]/pay/route.ts`; `lib/revenue-integrity/trust-gates.ts` | DIRECT_FIX | PRESENT | Default invoice-pay path still skips installment close. Config requirement is already in the frozen class. 008 does not wire the default pay route. |
| E2E-07 | Task / Approval -> Verified Closure | PRODUCT_DEFECT | `2b9c050` `toggleTaskStatusAction` `app/actions/tasks.ts`; `TaskStatus` is `PENDING`/`COMPLETED`/`OVERDUE` `prisma/schema.prisma` | EXEC-009 approval is workflow-run SoD, not Task verified closure; 009 does not change `app/actions/tasks.ts` | NONE | `app/actions/tasks.ts`; `prisma/schema.prisma` | DIRECT_FIX | PRESENT | Close is a reversible toggle, not verified approval. No bounded historical Task-closure implementation. |
| E2E-08 | Customer Communication / Support -> Resolution | PRODUCT_DEFECT + CLIENT_CONFIGURATION_REQUIRED | `2b9c050` `createTicketAction`/`closeTicketAction` `app/actions/helpdesk.ts`; no Email/WhatsApp/SMS on close | EXEC-009 communication threads exist at `8a5edf31` `lib/workflow-communication/contracts.ts` but 009 excludes UI and live send; does not modify helpdesk | NONE | `app/actions/helpdesk.ts` | DIRECT_FIX | PRESENT | Internal ticket close is unwired to customer identity/channels. EXEC-009 is not a drop-in for this helpdesk cycle. |
| E2E-09 | Provider Setup -> Safe Operation | PRODUCT_DEFECT + CLIENT_CONFIGURATION_REQUIRED | `2b9c050` hub encrypts AES-256-GCM `lib/revenue-integrity/trust-gates.ts` `encryptCredentials`; email send decrypts CBC `lib/email.ts` `parseEncryptedCredentials`/`decryptText` | EXEC-008/009/010 explicitly exclude provider credentials/activation | NONE | `lib/revenue-integrity/trust-gates.ts`; `lib/email.ts`; `lib/crypto.ts` | DIRECT_FIX | PRESENT | Product crypto-path break is on baseline. Missing customer credentials remain config, already in frozen class. No historical fix. |
| E2E-10 | Incident -> Recovery | PRODUCT_DEFECT | `2b9c050` `ALLOWED_TRANSITIONS.OPEN` is only ACKNOWLEDGED/FALSE_POSITIVE `lib/sentinel/incident.ts`; heartbeat calls `resolveIncident` `lib/sentinel/heartbeat.ts`; `workStartedAt`/`falsePositiveAt` written in `incident.ts` | No sentinel/heartbeat files in 008/009/010 diffs | NONE | `lib/sentinel/incident.ts`; `lib/sentinel/heartbeat.ts` | DIRECT_FIX | PRESENT | Illegal OPEN→RESOLVED auto-resolve remains. Bounded EXEC refs do not contain a sentinel recovery fix. |
| FC-001 | Authentication & Session | PASS / NO ACTION | `2b9c050` `loginAction` `app/actions/auth.ts`; `getSession` `lib/session.ts` | 008/009/010 delete `app/login/layout.tsx` relative to EXEC-011 baseline (visual line later than those refs); not a session-path gap | NONE | `app/actions/auth.ts`; `lib/session.ts` | ALREADY_PRESENT | PRESENT | Frozen PASS. Primary login/session path is on pinned baseline. |
| FC-002 | Staff & User Management | PRODUCT_DEFECT — narrow role/UI gap | `2b9c050` `Role` enum has 5 values `prisma/schema.prisma`; create UI options are 3 (`SALES_EMPLOYEE`/`SALES_MANAGER`/`ADMIN`) `components/settings/SettingsStaff.tsx` | No SettingsStaff change on bounded EXEC refs | NONE | `prisma/schema.prisma`; `components/settings/SettingsStaff.tsx` | DIRECT_FIX | PRESENT | Narrow frozen UI/role gap remains. No historical implementation. |
| FC-003 | Organization Structure | PRODUCT_DEFECT — Company -> Branches | `2b9c050` `lib/organization/service.ts` exists; no `app/` import of `@/lib/organization` | EXEC-009/010 consume org authority inside new modules only; no app wiring of Company→Branches | NONE | `lib/organization/service.ts` | DIRECT_FIX | PRESENT | Organization service is unused by app runtime. Bounded refs do not add Company→Branches product wiring. |
| FC-004 | Leads & Contacts | PRODUCT_DEFECT | `2b9c050` `Contact.leadId` is a bare optional UUID with no `Lead` relation `prisma/schema.prisma`; `LeadContactsPanel` has no importers | EXEC migrations add exec008/009/010 tables only, not Contact↔Lead | NONE | `prisma/schema.prisma`; `components/leads/panels/LeadContactsPanel.tsx` | DIRECT_FIX | PRESENT | Contact/Lead link remains unwired. No bounded historical schema/UI fix. |
| FC-005 | Projects & Properties | PRODUCT_DEFECT | Same baseline as E2E-02: unwired Create Project `components/views/ProjectsView.tsx`; readiness display-only `app/api/properties/route.ts` | No matching files on 008/009/010 diffs | NONE | `components/views/ProjectsView.tsx`; `app/api/properties/route.ts` | DIRECT_FIX | PRESENT | Frozen inventory/project-create defect is unfixed on bounded refs. |
| FC-006 | Tours & Offers | PRODUCT_DEFECT | `2b9c050` tour follow-up only on COMPLETED `update-tour-status.ts`; offer accept rejects non-PENDING `accept-offer.ts`; PATCH ALLOWED `app/api/v1/offers/[id]/route.ts` | Neither 008 nor 009 modifies these files | NONE | `lib/domain/transaction-spine/update-tour-status.ts`; `lib/domain/transaction-spine/accept-offer.ts`; `app/api/v1/offers/[id]/route.ts` | DIRECT_FIX | PRESENT | Combined tours/offers frozen defects remain on baseline with no historical solver. |
| FC-007 | Contracts & Payment Plans | PRODUCT_DEFECT | `2b9c050` wizard `signedAt.toISOString()` `app/actions/contract.ts`; issue writes `signedAt: null` `issue-contract.ts` | EXEC-008 `e68ae101` `lib/contract-finance/*` + spine template bind; UI/out-of-allowlist; `app/actions/contract.ts` unchanged vs baseline | NONE | `app/actions/contract.ts`; `lib/domain/transaction-spine/issue-contract.ts` | DIRECT_FIX | PRESENT | Frozen UI/configure/sign defect is not implemented by EXEC-008 companion (UI excluded). |
| FC-008 | Installments & Invoices | PRODUCT_DEFECT | `2b9c050` invoice pay route has no installment close `app/api/v1/invoices/[id]/pay/route.ts` | EXEC-008 allowlists that pay route but 008-vs-baseline does not change it | NONE | `app/api/v1/invoices/[id]/pay/route.ts` | DIRECT_FIX | PRESENT | Default pay path still skips installment/plan close. 008 did not apply a usable fix on that route. |
| FC-009 | Rental Operations | PRODUCT_DEFECT | `2b9c050` `getRentalContractsAction` reads sales `prisma.contract.findMany` `app/actions/rentals.ts` | No rentals.ts change on bounded EXEC refs | NONE | `app/actions/rentals.ts` | DIRECT_FIX | PRESENT | Sales contracts are labeled as rentals. No historical rental-model correction. |
| FC-010 | Tasks & Maintenance | PRODUCT_DEFECT | `2b9c050` reversible `toggleTaskStatusAction` `app/actions/tasks.ts`; maintenance is REST only `app/api/v1/maintenance/route.ts` (no app UI consumer) | 008/009/010 do not add maintenance UI or verified task close | NONE | `app/actions/tasks.ts`; `app/api/v1/maintenance/route.ts` | DIRECT_FIX | PRESENT | Frozen task/maintenance defect remains. No bounded historical UI/verified-close implementation. |
| FC-011 | Documents | PASS / NO ACTION | `2b9c050` `POST` stores `content` bytes `app/api/v1/documents/route.ts` | EXEC-010 `c6eb0262` `lib/document-governance/service.ts` is extra trust/export layer; 010-vs-baseline does not change documents route; frozen PASS does not require it | NONE | `app/api/v1/documents/route.ts` | ALREADY_PRESENT | PRESENT | Frozen PASS. Implemented in-DB document path is on baseline. |
| FC-012 | Email | PRODUCT_DEFECT — credential crypto path | `2b9c050` GCM save `trust-gates.ts` `encryptCredentials`; CBC decrypt `lib/crypto.ts` / `lib/email.ts` `parseEncryptedCredentials` | Provider crypto excluded from 008/009/010 | NONE | `lib/revenue-integrity/trust-gates.ts`; `lib/crypto.ts`; `lib/email.ts` | DIRECT_FIX | PRESENT | CONNECTED hub credentials cannot be read by send. No historical crypto-path fix. |
| FC-013 | WhatsApp | CLIENT_CONFIGURATION_REQUIRED / NO PRODUCT FIX | `2b9c050` matching GCM decrypt `lib/whatsapp/connection-resolver.ts` via `decryptProviderCredentials` | EXEC-009 notes WhatsApp inventory but excludes live send/credentials; frozen class is config-only | NONE | `lib/whatsapp/connection-resolver.ts` | OBSOLETE | PRESENT | Frozen class is configuration-only with no product fix. Product path exists; remaining need is customer Meta/360dialog config. |
| FC-014 | SMS | PRODUCT_DEFECT + CLIENT_CONFIGURATION_REQUIRED | `2b9c050` `sendSMSNotification` fail-closed without `SMS_API_KEY` `lib/notifications.ts`; called from `createLeadCore`; no SMS inbox/UI | EXEC-009 lists SMS as a thread channel only; no SMS inbox implementation | NONE | `lib/notifications.ts`; `lib/leads/service.ts` | DIRECT_FIX | PRESENT | Product gap is missing inbox/storage/UI. Missing `SMS_API_KEY` stays config per frozen class. |
| FC-015 | Payment Gateway | PRODUCT_DEFECT + CLIENT_CONFIGURATION_REQUIRED | `2b9c050` default runtime requires CONNECTED `NGENIUS`/`CUSTOM_PAYMENT` `getDefaultPaymentProviderRuntime` `lib/revenue-integrity/trust-gates.ts` | EXEC-008 excludes provider routes/credentials | NONE | `lib/revenue-integrity/trust-gates.ts` | DIRECT_FIX | PRESENT | Product gap is default-provider gate / hub adapters not in `REVENUE_PROVIDERS`. Provider account config remains config. |
| FC-016 | Advertising | PRODUCT_DEFECT | `2b9c050` `registerMarketingProviderAdapter` `lib/marketing/provider-registry.ts`; production callers only in `tests/marketing-provider-foundation.test.ts` | No marketing registry change on bounded EXEC refs | NONE | `lib/marketing/provider-registry.ts`; `tests/marketing-provider-foundation.test.ts` | DIRECT_FIX | PRESENT | Runtime adapter map is never registered outside tests. No historical production adapter wiring. |
| FC-017 | ZATCA / Ejar / Government | PRODUCT_DEFECT + CLIENT_CONFIGURATION_REQUIRED | `2b9c050` fail-closed `SaudiTrustGateService.evaluateEjar`/`evaluateZatca` `lib/saudi-trust-gate/index.ts`; hub GCM save does not feed this decryptCompat path | Government/provider activation excluded from 008/009/010 | NONE | `lib/saudi-trust-gate/index.ts` | DIRECT_FIX | PRESENT | Product gap is hub save unused by this runtime. Missing tenant ZATCA/EJAR credentials remain config. |
| FC-018 | Agents & Sentinel | PRODUCT_DEFECT | `2b9c050` `sendAdminEmailAlert` is `console.info` only `lib/email.ts`; illegal heartbeat resolve `lib/sentinel/heartbeat.ts`; `workStartedAt` written `lib/sentinel/incident.ts` | No sentinel/email-alert change on bounded EXEC refs | NONE | `lib/email.ts`; `lib/sentinel/heartbeat.ts`; `lib/sentinel/incident.ts` | DIRECT_FIX | PRESENT | Frozen sentinel/alert defects remain. No historical recovery-path implementation. |
| FC-019 | Tenant Registration & SaaS Billing | LEGACY_DISABLED / KEEP / NO ACTION | `2b9c050` `app/register/page.tsx` `notFound()`; billing cron `skipped: true` `app/api/cron/billing/route.ts`; `isLegacySaasEnabled(): false` `lib/platform-operating-model.ts` | Bounded EXEC refs do not reactivate SaaS | NONE | `app/register/page.tsx`; `app/api/cron/billing/route.ts`; `lib/platform-operating-model.ts` | OBSOLETE | PRESENT | Frozen LEGACY_DISABLED / KEEP / NO ACTION. Not an execution problem. No conflict with bounded refs. |
| FC-020 | Dashboard & Reporting | PRODUCT_DEFECT | `2b9c050` `leads-performance` fabricates funnel (`contacted: totalLeads * 0.7`, static CAC 1200) `app/api/v1/reports/leads-performance/route.ts` | EXEC-010 metric/export service `c6eb0262` `lib/document-governance/service.ts` is not wired to this route (010-vs-baseline does not change it) | NONE | `app/api/v1/reports/leads-performance/route.ts` | DIRECT_FIX | PRESENT | Fabricated funnel remains. EXEC-010 governance metrics are not a usable replacement of this route. |

## 3. CLASSIFICATION COUNTS

| STEP2_CLASS | Count |
|---|---|
| ALREADY_PRESENT | 3 |
| ABSORB | 0 |
| DIRECT_FIX | 25 |
| SUPERSEDED | 0 |
| OBSOLETE | 2 |
| CONFLICT | 0 |
| **Sum** | **30** |

ALREADY_PRESENT = E2E-01, FC-001, FC-011  
OBSOLETE = FC-013, FC-019  
DIRECT_FIX = remaining 25 IDs

## 4. MISSING EVIDENCE

NONE

## 5. CONFLICTS

NONE

## 6. SCOPE / WRITE VERIFICATION

| Check | Result |
|---|---|
| HEAD | `2b9c0505c99c7074de1d213c720022cff4626727` |
| Working tree | clean |
| Governance files modified | 0 |
| `ORCA_STEP1_CLASSIFIED_REGISTER.md` created | NO |
| STEP 1 reopened | NO |
| E2E-11 / FC-021 | NO |
| REPOSITORY WRITES | 0 |

## 7. STEP CLOSURE REVIEW

STEP CLOSURE REVIEW  
CURRENT STEP = 2  
INPUT ITEMS = 30  
OUTPUT ROWS = 30  
REQUIRED OUTPUT = COMPLETE  
UNKNOWN = 0  
MISSING_EVIDENCE = 0  
CONFLICT = 0  
SCOPE EXPANSION = 0  
UNAUTHORIZED CHANGES = 0  
REPOSITORY WRITES = 0  
RECOMMENDATION =  
READY FOR ORCA COMMAND CENTER REVIEW
