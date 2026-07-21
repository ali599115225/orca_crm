# ORCA G4 Pages and Visual Surfaces

## Pages

| Route | Source | Models | Permissions | States | Test refs | Visual status |
|---|---|---:|---:|---|---:|---|
| `/` | `app/page.tsx` | 0 | 0 | — | 1 | NOT_PROVEN |
| `/admin/command-center` | `app/admin/command-center/page.tsx` | 0 | 0 | loading, empty | 5 | HISTORICAL_EVIDENCE_ONLY |
| `/contract/[leadId]` | `app/contract/[leadId]/page.tsx` | 19 | 0 | — | 0 | HISTORICAL_EVIDENCE_ONLY |
| `/dashboard` | `app/dashboard/page.tsx` | 0 | 0 | — | 6 | CLOSED_RETAINED |
| `/demo` | `app/demo/page.tsx` | 15 | 0 | — | 0 | HISTORICAL_EVIDENCE_ONLY |
| `/disclaimer` | `app/disclaimer/page.tsx` | 0 | 0 | — | 0 | NOT_PROVEN |
| `/leads` | `app/leads/page.tsx` | 0 | 0 | — | 12 | CLOSED_RETAINED |
| `/login` | `app/login/page.tsx` | 1 | 0 | error | 13 | CLOSED_RETAINED |
| `/operations` | `app/operations/page.tsx` | 0 | 0 | — | 35 | NOT_PROVEN |
| `/operations/agents` | `app/operations/agents/page.tsx` | 2 | 0 | — | 2 | HISTORICAL_EVIDENCE_ONLY |
| `/operations/calculator` | `app/operations/calculator/page.tsx` | 0 | 0 | — | 0 | NOT_PROVEN |
| `/operations/campaigns` | `app/operations/campaigns/page.tsx` | 3 | 0 | loading | 0 | NOT_PROVEN |
| `/operations/compliance` | `app/operations/compliance/page.tsx` | 0 | 0 | loading, error | 0 | HISTORICAL_EVIDENCE_ONLY |
| `/operations/dashboard` | `app/operations/dashboard/page.tsx` | 18 | 0 | — | 3 | CLOSED_RETAINED |
| `/operations/documents` | `app/operations/documents/page.tsx` | 0 | 0 | — | 0 | HISTORICAL_EVIDENCE_ONLY |
| `/operations/email` | `app/operations/email/page.tsx` | 5 | 6 | — | 7 | PARTIAL |
| `/operations/health` | `app/operations/health/page.tsx` | 0 | 0 | loading | 0 | HISTORICAL_EVIDENCE_ONLY |
| `/operations/helpdesk` | `app/operations/helpdesk/page.tsx` | 1 | 0 | — | 3 | PARTIAL |
| `/operations/leads` | `app/operations/leads/page.tsx` | 15 | 0 | — | 2 | CLOSED_RETAINED |
| `/operations/leads/[id]` | `app/operations/leads/[id]/page.tsx` | 17 | 6 | — | 1 | PARTIAL_DOCUMENTED_ISSUE |
| `/operations/marketing` | `app/operations/marketing/page.tsx` | 2 | 0 | loading | 0 | HISTORICAL_EVIDENCE_ONLY |
| `/operations/offers` | `app/operations/offers/page.tsx` | 0 | 0 | — | 2 | CLOSED_RETAINED |
| `/operations/onboarding` | `app/operations/onboarding/page.tsx` | 1 | 0 | — | 0 | NOT_PROVEN |
| `/operations/projects` | `app/operations/projects/page.tsx` | 3 | 0 | — | 1 | PARTIAL |
| `/operations/properties` | `app/operations/properties/page.tsx` | 0 | 0 | — | 2 | CLOSED_RETAINED |
| `/operations/rental` | `app/operations/rental/page.tsx` | 0 | 0 | — | 5 | CLOSED_RETAINED |
| `/operations/rental/invoices` | `app/operations/rental/invoices/page.tsx` | 0 | 0 | — | 1 | CLOSED_RETAINED |
| `/operations/rental/leases` | `app/operations/rental/leases/page.tsx` | 0 | 0 | — | 0 | CLOSED_RETAINED |
| `/operations/rental/payments` | `app/operations/rental/payments/page.tsx` | 0 | 0 | — | 1 | CLOSED_RETAINED |
| `/operations/rental/reconciliation` | `app/operations/rental/reconciliation/page.tsx` | 0 | 0 | — | 0 | CLOSED_RETAINED |
| `/operations/rental/sales` | `app/operations/rental/sales/page.tsx` | 0 | 0 | — | 3 | HISTORICAL_EVIDENCE_ONLY |
| `/operations/rental/sales/contracts/[id]` | `app/operations/rental/sales/contracts/[id]/page.tsx` | 0 | 0 | — | 1 | HISTORICAL_EVIDENCE_ONLY |
| `/operations/rental/settlements` | `app/operations/rental/settlements/page.tsx` | 0 | 0 | — | 0 | CLOSED_RETAINED |
| `/operations/revenue-integrity` | `app/operations/revenue-integrity/page.tsx` | 19 | 0 | — | 1 | NOT_PROVEN |
| `/operations/sales` | `app/operations/sales/page.tsx` | 1 | 0 | — | 2 | CLOSED_RETAINED |
| `/operations/sales/contracts/[id]` | `app/operations/sales/contracts/[id]/page.tsx` | 0 | 0 | — | 1 | HISTORICAL_EVIDENCE_ONLY |
| `/operations/settings` | `app/operations/settings/page.tsx` | 14 | 8 | loading | 12 | PARTIAL |
| `/operations/tasks` | `app/operations/tasks/page.tsx` | 12 | 0 | — | 3 | PARTIAL |
| `/operations/tours` | `app/operations/tours/page.tsx` | 0 | 0 | — | 2 | CLOSED_RETAINED |
| `/operations/whatsapp` | `app/operations/whatsapp/page.tsx` | 13 | 7 | error | 5 | PARTIAL |
| `/privacy-policy` | `app/privacy-policy/page.tsx` | 0 | 0 | — | 0 | NOT_PROVEN |
| `/register` | `app/register/page.tsx` | 0 | 0 | — | 3 | LEGACY_DISABLED |
| `/terms-and-conditions` | `app/terms-and-conditions/page.tsx` | 0 | 0 | empty | 1 | NOT_PROVEN |

## Layouts

| Route | Source | Models | Test refs |
|---|---|---:|---:|
| `/` | `app/layout.tsx` | 0 | 0 |
| `/dashboard` | `app/dashboard/layout.tsx` | 1 | 6 |
| `/leads` | `app/leads/layout.tsx` | 1 | 12 |
| `/operations` | `app/operations/layout.tsx` | 2 | 35 |

## Route-level states

| Kind | Route | Source | Test refs |
|---|---|---|---:|
| ERROR_STATE | `/` | `app/error.tsx` | 0 |
| ERROR_STATE | `/operations/dashboard` | `app/operations/dashboard/error.tsx` | 3 |
| LOADING_STATE | `/operations/dashboard` | `app/operations/dashboard/loading.tsx` | 3 |
| ERROR_STATE | `/operations/leads` | `app/operations/leads/error.tsx` | 2 |
| LOADING_STATE | `/operations/leads` | `app/operations/leads/loading.tsx` | 2 |
| ERROR_STATE | `/operations/revenue-integrity` | `app/operations/revenue-integrity/error.tsx` | 1 |
| LOADING_STATE | `/operations/revenue-integrity` | `app/operations/revenue-integrity/loading.tsx` | 1 |

## Tab sets

| Source | Static values | Test refs | Visual status |
|---|---|---:|---|
| `app/operations/compliance/page.tsx` | `activity`, `devices`, `queue` | 0 | NOT_PROVEN |
| `components/marketing/PlatformConnectors.tsx` | `campaigns`, `connect`, `marketing` | 1 | NOT_PROVEN |
| `components/properties/PropertyDetail.tsx` | `accounting`, `docs`, `events`, `pricing` | 0 | CLOSED_RETAINED |
| `components/revenue-integrity/RevenueIntegrityView.tsx` | `actions`, `audit`, `predictive`, `radar` | 3 | NOT_PROVEN |
| `components/views/ProjectsView.tsx` | `bookings`, `documents`, `overview`, `phases`, `reports`, `units` | 1 | PARTIAL |
| `features/dashboard/components/DailyOperationsCenter.tsx` | `recentLeads`, `tasks`, `whatsapp` | 3 | CLOSED_RETAINED |
| `features/leads/components/EngagementTabs.tsx` | `offers`, `opportunities`, `tours` | 5 | PARTIAL |
| `features/leads/components/LeadDetailClient.tsx` | `communication`, `history`, `offers`, `opportunities`, `overview`, `tasks`, `tours` | 6 | PARTIAL_DOCUMENTED_ISSUE |

## Modals, dialogs, drawers, and overlays

| Component | Kind | Source | Test refs | Visual status |
|---|---|---|---:|---|
| `UnitModal` | MODAL_OR_OVERLAY | `components/real-estate/properties/PropertiesWorkspace.tsx` | 8 | CLOSED_RETAINED |
| `CreateOfferDialog` | MODAL_OR_OVERLAY | `features/leads/components/EngagementTabs.tsx` | 6 | PARTIAL |
| `CreateOpportunityDialog` | MODAL_OR_OVERLAY | `features/leads/components/EngagementTabs.tsx` | 6 | PARTIAL |
| `ScheduleTourDialog` | MODAL_OR_OVERLAY | `features/leads/components/EngagementTabs.tsx` | 6 | PARTIAL |
| `LeadFormDialog` | MODAL_OR_OVERLAY | `features/leads/components/LeadDetailClient.tsx` | 6 | PARTIAL_DOCUMENTED_ISSUE |
| `LeadFormDialog` | MODAL_OR_OVERLAY | `features/leads/components/LeadsWorkspace.tsx` | 4 | CLOSED_RETAINED |
