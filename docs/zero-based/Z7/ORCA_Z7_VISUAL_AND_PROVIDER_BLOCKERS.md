# ORCA Z7 — Visual Closure and Provider/Owner Blocker Register

- **Document ID:** ORCA-Z7-BLOCKERS-001
- **Version:** 1.0
- **Date:** 2026-07-25
- **Status:** `COMPLETE / EXECUTION BLOCKERS RECORDED`
- **Assessed SHA:** `75e0e25ed0247c7da2a4720c6e8aeb27f8bba959`

## 1. Visual decision rule

The current G4 registry retains historical visual labels, but Z3 records **zero owner-approved item-level target references**. Therefore every page, tab, and overlay remains `NOT_PROVEN` against the zero-based target until its independent visual cycle is completed.

## 2. Page routes

| Route | Source | Current functional evidence | Historical/current visual label | Zero-based target visual disposition |
|---|---|---|---|---|
| `/` | `app/page.tsx` | `EVIDENCE_REFERENCED` | `NOT_PROVEN` | `NOT_PROVEN` |
| `/admin/command-center` | `app/admin/command-center/page.tsx` | `EVIDENCE_REFERENCED` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/contract/[leadId]` | `app/contract/[leadId]/page.tsx` | `NOT_PROVEN` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/dashboard` | `app/dashboard/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/demo` | `app/demo/page.tsx` | `NOT_PROVEN` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/disclaimer` | `app/disclaimer/page.tsx` | `NOT_PROVEN` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/leads` | `app/leads/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/login` | `app/login/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations` | `app/operations/page.tsx` | `EVIDENCE_REFERENCED` | `NOT_PROVEN` | `NOT_PROVEN` |
| `/operations/agents` | `app/operations/agents/page.tsx` | `EVIDENCE_REFERENCED` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/calculator` | `app/operations/calculator/page.tsx` | `NOT_PROVEN` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/campaigns` | `app/operations/campaigns/page.tsx` | `NOT_PROVEN` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/compliance` | `app/operations/compliance/page.tsx` | `NOT_PROVEN` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/dashboard` | `app/operations/dashboard/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/documents` | `app/operations/documents/page.tsx` | `NOT_PROVEN` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/email` | `app/operations/email/page.tsx` | `EVIDENCE_REFERENCED` | `PARTIAL` | `NOT_PROVEN` |
| `/operations/health` | `app/operations/health/page.tsx` | `NOT_PROVEN` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/helpdesk` | `app/operations/helpdesk/page.tsx` | `EVIDENCE_REFERENCED` | `PARTIAL` | `NOT_PROVEN` |
| `/operations/leads` | `app/operations/leads/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/leads/[id]` | `app/operations/leads/[id]/page.tsx` | `EVIDENCE_REFERENCED` | `PARTIAL_DOCUMENTED_ISSUE` | `NOT_PROVEN` |
| `/operations/marketing` | `app/operations/marketing/page.tsx` | `NOT_PROVEN` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/offers` | `app/operations/offers/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/onboarding` | `app/operations/onboarding/page.tsx` | `NOT_PROVEN` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/projects` | `app/operations/projects/page.tsx` | `EVIDENCE_REFERENCED` | `PARTIAL` | `NOT_PROVEN` |
| `/operations/properties` | `app/operations/properties/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/rental` | `app/operations/rental/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/rental/invoices` | `app/operations/rental/invoices/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/rental/leases` | `app/operations/rental/leases/page.tsx` | `NOT_PROVEN` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/rental/payments` | `app/operations/rental/payments/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/rental/reconciliation` | `app/operations/rental/reconciliation/page.tsx` | `NOT_PROVEN` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/rental/sales` | `app/operations/rental/sales/page.tsx` | `EVIDENCE_REFERENCED` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/rental/sales/contracts/[id]` | `app/operations/rental/sales/contracts/[id]/page.tsx` | `EVIDENCE_REFERENCED` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/rental/settlements` | `app/operations/rental/settlements/page.tsx` | `NOT_PROVEN` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/revenue-integrity` | `app/operations/revenue-integrity/page.tsx` | `EVIDENCE_REFERENCED` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/sales` | `app/operations/sales/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/sales/contracts/[id]` | `app/operations/sales/contracts/[id]/page.tsx` | `EVIDENCE_REFERENCED` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/operations/settings` | `app/operations/settings/page.tsx` | `EVIDENCE_REFERENCED` | `PARTIAL` | `NOT_PROVEN` |
| `/operations/tasks` | `app/operations/tasks/page.tsx` | `EVIDENCE_REFERENCED` | `PARTIAL` | `NOT_PROVEN` |
| `/operations/tours` | `app/operations/tours/page.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| `/operations/whatsapp` | `app/operations/whatsapp/page.tsx` | `EVIDENCE_REFERENCED` | `PARTIAL` | `NOT_PROVEN` |
| `/privacy-policy` | `app/privacy-policy/page.tsx` | `NOT_PROVEN` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| `/register` | `app/register/page.tsx` | `EVIDENCE_REFERENCED` | `LEGACY_DISABLED` | `NOT_PROVEN` |
| `/terms-and-conditions` | `app/terms-and-conditions/page.tsx` | `EVIDENCE_REFERENCED` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |

## 3. Tabs and overlays

| Kind | Contract | Functional evidence | Historical/current visual label | Zero-based target disposition |
|---|---|---|---|---|
| MODAL_OR_OVERLAY | `OVERLAY:components/real-estate/properties/PropertiesWorkspace.tsx:UnitModal` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| MODAL_OR_OVERLAY | `OVERLAY:features/leads/components/EngagementTabs.tsx:CreateOfferDialog` | `EVIDENCE_REFERENCED` | `PARTIAL` | `NOT_PROVEN` |
| MODAL_OR_OVERLAY | `OVERLAY:features/leads/components/EngagementTabs.tsx:CreateOpportunityDialog` | `EVIDENCE_REFERENCED` | `PARTIAL` | `NOT_PROVEN` |
| MODAL_OR_OVERLAY | `OVERLAY:features/leads/components/EngagementTabs.tsx:ScheduleTourDialog` | `EVIDENCE_REFERENCED` | `PARTIAL` | `NOT_PROVEN` |
| MODAL_OR_OVERLAY | `OVERLAY:features/leads/components/LeadDetailClient.tsx:LeadFormDialog` | `EVIDENCE_REFERENCED` | `PARTIAL_DOCUMENTED_ISSUE` | `NOT_PROVEN` |
| MODAL_OR_OVERLAY | `OVERLAY:features/leads/components/LeadsWorkspace.tsx:LeadFormDialog` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| TAB_SET | `TAB_SET:app/operations/compliance/page.tsx` | `NOT_PROVEN` | `NOT_PROVEN` | `NOT_PROVEN` |
| TAB_SET | `TAB_SET:components/marketing/PlatformConnectors.tsx` | `EVIDENCE_REFERENCED` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| TAB_SET | `TAB_SET:components/properties/PropertyDetail.tsx` | `NOT_PROVEN` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| TAB_SET | `TAB_SET:components/revenue-integrity/RevenueIntegrityView.tsx` | `EVIDENCE_REFERENCED` | `HISTORICAL_EVIDENCE_ONLY` | `NOT_PROVEN` |
| TAB_SET | `TAB_SET:components/views/ProjectsView.tsx` | `EVIDENCE_REFERENCED` | `PARTIAL` | `NOT_PROVEN` |
| TAB_SET | `TAB_SET:features/dashboard/components/DailyOperationsCenter.tsx` | `EVIDENCE_REFERENCED` | `CLOSED_RETAINED` | `NOT_PROVEN` |
| TAB_SET | `TAB_SET:features/leads/components/EngagementTabs.tsx` | `EVIDENCE_REFERENCED` | `PARTIAL` | `NOT_PROVEN` |
| TAB_SET | `TAB_SET:features/leads/components/LeadDetailClient.tsx` | `EVIDENCE_REFERENCED` | `PARTIAL_DOCUMENTED_ISSUE` | `NOT_PROVEN` |

## 4. Provider and external-evidence blockers

| Provider/category | Repository signals | Unverified evidence | Safe status |
|---|---|---|---|
| Database/Postgres/Neon | `DATABASE_URL`, `DIRECT_URL` | Required Runtime dependency; ownership/location/backup evidence not inspected | OWNER_EVIDENCE_REQUIRED |
| Vercel/DNS/domain | Vercel commit/env refs, Production URL | Preview evidence exists; protected Production ownership and rollback package absent | OWNER_EVIDENCE_REQUIRED |
| Sentry | `@sentry/nextjs`, DSN/auth references | Code/config present; active account, retention/location and alert routing not verified | NOT_PROVEN |
| Email/Resend | `resend`, `RESEND_API_KEY`, `EMAIL_FROM` | Provider-safe state exists; company account/domain/delivery evidence not verified | NOT_CONFIGURED / NOT_PROVEN |
| WhatsApp/Meta | WhatsApp tokens, IDs, webhook secrets; rich models/routes/tests | Implementation substantial; company ownership, callback configuration and Production truth not verified | NOT_CONFIGURED / NOT_PROVEN |
| Google AI/Gemini | `@google/generative-ai`, API key/model refs | Assistive code exists; approved use case/data policy/account not verified | NOT_CONFIGURED |
| Payments | Paylink, Moyasar, N-Genius env/routes | Multiple paths exist; owner provider selection, exact evidence and reconciliation activation not verified | NOT_CONFIGURED |
| ZATCA/Ejar | credentials, OTP, API refs, outbox/cron/routes | Contracts/tooling exist; legal authority, company credentials and Production filing not verified | NOT_CONFIGURED / OWNER_EVIDENCE_REQUIRED |
| SMS/Msegat | API key/username/sender refs | No company provider/consent evidence inspected | NOT_CONFIGURED |
| Object storage/AWS S3 | bucket/region/KMS refs in recovery tooling | Provider lifecycle, access, KMS ownership and restore evidence absent | OWNER_DECISION_REQUIRED |
| TikTok/advertising | OAuth routes/connectors | Outside required Release 1 until owner scope/provider approval | DEFER |
| Revenue event sink/custom providers | sink URL/secret and encrypted integration keys | Custom integration surface exists; destination ownership and failure contract unverified | NOT_CONFIGURED |

## 5. Owner decisions that remain required

- exact regulated real-estate activities and license evidence;
- actual branches, departments, teams, personas and job titles;
- final Release 1 scope and retirement of legacy SaaS paths;
- Z2R-003 commitment priority, Z2R-004 acceptance/reservation atomicity, and Z2R-006 financial precision/correction policy;
- official contract/invoice templates, signatories, approval/refund/settlement/export limits and manual payment-evidence authority;
- privacy notices, marketing purpose/consent, rights, retention and legal hold;
- providers, locations, contracts, budgets, accounts, domains and secrets;
- AI allowed use cases and data;
- performance/capacity/browser and MTPD/RTO/RPO/SLO targets;
- support, warranty, UAT, training and handover signers;
- every item-level visual reference;
- separate Production release authorization.

## 6. Safety conclusion

No provider or visual blocker is resolved by repository presence alone. All providers remain non-authorized for activation, and all zero-based item-level visual matches remain unproven.
