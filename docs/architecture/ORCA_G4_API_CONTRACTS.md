# ORCA G4 API Contracts

Every current `app/**/route.*` contract is listed. Methods are detected from direct exports and re-exports. Model and permission counts are transitive through local imports.

| Route | Methods | Source | Models | Permissions | Test refs |
|---|---|---|---:|---:|---:|
| `/api/accounting/settle-lease` | POST | `app/api/accounting/settle-lease/route.ts` | 9 | 0 | 1 |
| `/api/admin/command-center` | GET, POST | `app/api/admin/command-center/route.ts` | 20 | 0 | 5 |
| `/api/cron/billing` | GET | `app/api/cron/billing/route.ts` | 1 | 0 | 3 |
| `/api/cron/installments` | GET | `app/api/cron/installments/route.ts` | 7 | 0 | 1 |
| `/api/cron/realtime-retention` | GET | `app/api/cron/realtime-retention/route.ts` | 4 | 5 | 2 |
| `/api/cron/retention` | GET | `app/api/cron/retention/route.ts` | 5 | 0 | 1 |
| `/api/cron/revenue-integrity` | GET | `app/api/cron/revenue-integrity/route.ts` | 0 | 0 | 1 |
| `/api/cron/sentinel` | GET | `app/api/cron/sentinel/route.ts` | 6 | 0 | 2 |
| `/api/cron/sentinel-heartbeats` | GET | `app/api/cron/sentinel-heartbeats/route.ts` | 5 | 0 | 1 |
| `/api/cron/zatca` | GET | `app/api/cron/zatca/route.ts` | 8 | 0 | 2 |
| `/api/deploy-marker` | GET | `app/api/deploy-marker/route.ts` | 0 | 0 | 0 |
| `/api/health/deployment` | GET | `app/api/health/deployment/route.ts` | 0 | 0 | 1 |
| `/api/health/live` | GET | `app/api/health/live/route.ts` | 0 | 0 | 1 |
| `/api/health/ready` | GET | `app/api/health/ready/route.ts` | 0 | 0 | 1 |
| `/api/integrations/tiktok/oauth/callback` | GET | `app/api/integrations/tiktok/oauth/callback/route.ts` | 0 | 0 | 3 |
| `/api/integrations/tiktok/oauth/pending` | GET, POST | `app/api/integrations/tiktok/oauth/pending/route.ts` | 0 | 0 | 2 |
| `/api/integrations/tiktok/oauth/start` | GET | `app/api/integrations/tiktok/oauth/start/route.ts` | 0 | 0 | 3 |
| `/api/payment/callback` | GET | `app/api/payment/callback/route.ts` | 4 | 0 | 1 |
| `/api/payments/custom/return` | GET | `app/api/payments/custom/return/route.ts` | 18 | 0 | 1 |
| `/api/payments/custom/webhook/[connectionId]` | GET, POST | `app/api/payments/custom/webhook/[connectionId]/route.ts` | 18 | 0 | 1 |
| `/api/payments/ngenius/webhook` | GET, POST | `app/api/payments/ngenius/webhook/route.ts` | 18 | 0 | 2 |
| `/api/payments/paylink/webhook` | POST | `app/api/payments/paylink/webhook/route.ts` | 10 | 0 | 1 |
| `/api/projects` | GET, POST, PUT, DELETE | `app/api/projects/route.ts` | 3 | 0 | 1 |
| `/api/projects/[id]` | GET, PUT, DELETE | `app/api/projects/[id]/route.ts` | 1 | 0 | 1 |
| `/api/properties` | GET, POST | `app/api/properties/route.ts` | 3 | 0 | 6 |
| `/api/properties/[id]` | GET, PUT, DELETE | `app/api/properties/[id]/route.ts` | 2 | 0 | 4 |
| `/api/properties/[id]/favorites` | GET, POST | `app/api/properties/[id]/favorites/route.ts` | 2 | 0 | 1 |
| `/api/properties/[id]/request-finance` | POST | `app/api/properties/[id]/request-finance/route.ts` | 0 | 0 | 0 |
| `/api/properties/[id]/schedule-visit` | POST | `app/api/properties/[id]/schedule-visit/route.ts` | 0 | 4 | 1 |
| `/api/revenue-integrity/webhook/[provider]` | POST | `app/api/revenue-integrity/webhook/[provider]/route.ts` | 0 | 0 | 0 |
| `/api/v1/accounting/accounts-receivable` | GET | `app/api/v1/accounting/accounts-receivable/route.ts` | 8 | 0 | 1 |
| `/api/v1/accounting/aging-report` | GET | `app/api/v1/accounting/aging-report/route.ts` | 8 | 0 | 1 |
| `/api/v1/accounting/audit` | GET | `app/api/v1/accounting/audit/route.ts` | 8 | 0 | 0 |
| `/api/v1/accounting/balance-sheet` | GET | `app/api/v1/accounting/balance-sheet/route.ts` | 8 | 0 | 0 |
| `/api/v1/accounting/cash-flow` | GET | `app/api/v1/accounting/cash-flow/route.ts` | 8 | 0 | 0 |
| `/api/v1/accounting/chart-of-accounts` | GET | `app/api/v1/accounting/chart-of-accounts/route.ts` | 8 | 0 | 0 |
| `/api/v1/accounting/general-ledger` | GET | `app/api/v1/accounting/general-ledger/route.ts` | 8 | 5 | 2 |
| `/api/v1/accounting/income-statement` | GET | `app/api/v1/accounting/income-statement/route.ts` | 8 | 0 | 0 |
| `/api/v1/accounting/journal-entries` | GET, POST | `app/api/v1/accounting/journal-entries/route.ts` | 8 | 0 | 2 |
| `/api/v1/accounting/journal-entries/[id]` | GET, POST | `app/api/v1/accounting/journal-entries/[id]/route.ts` | 8 | 0 | 0 |
| `/api/v1/accounting/payables` | GET | `app/api/v1/accounting/payables/route.ts` | 8 | 0 | 0 |
| `/api/v1/accounting/seed` | POST | `app/api/v1/accounting/seed/route.ts` | 8 | 0 | 0 |
| `/api/v1/accounting/trial-balance` | GET | `app/api/v1/accounting/trial-balance/route.ts` | 8 | 0 | 1 |
| `/api/v1/accounting/vat-report` | GET | `app/api/v1/accounting/vat-report/route.ts` | 8 | 0 | 1 |
| `/api/v1/agents` | GET | `app/api/v1/agents/route.ts` | 3 | 0 | 3 |
| `/api/v1/agents/[id]/logs` | GET | `app/api/v1/agents/[id]/logs/route.ts` | 3 | 0 | 2 |
| `/api/v1/agents/[id]/run` | POST | `app/api/v1/agents/[id]/run/route.ts` | 18 | 0 | 2 |
| `/api/v1/agents/[id]/toggle` | POST, PATCH | `app/api/v1/agents/[id]/toggle/route.ts` | 3 | 0 | 2 |
| `/api/v1/ai/lead-score` | POST | `app/api/v1/ai/lead-score/route.ts` | 3 | 0 | 1 |
| `/api/v1/ai/offer-optimize` | POST | `app/api/v1/ai/offer-optimize/route.ts` | 3 | 0 | 1 |
| `/api/v1/ai/summarize-conversation` | POST | `app/api/v1/ai/summarize-conversation/route.ts` | 3 | 0 | 1 |
| `/api/v1/auth/login` | POST | `app/api/v1/auth/login/route.ts` | 1 | 0 | 10 |
| `/api/v1/automation/workflows` | GET, POST | `app/api/v1/automation/workflows/route.ts` | 1 | 0 | 0 |
| `/api/v1/contacts` | GET, POST | `app/api/v1/contacts/route.ts` | 3 | 0 | 1 |
| `/api/v1/contacts/[id]/notes` | POST | `app/api/v1/contacts/[id]/notes/route.ts` | 1 | 0 | 1 |
| `/api/v1/contracts` | GET | `app/api/v1/contracts/route.ts` | 1 | 0 | 5 |
| `/api/v1/contracts/[id]` | GET | `app/api/v1/contracts/[id]/route.ts` | 18 | 0 | 2 |
| `/api/v1/contracts/[id]/cancel` | POST | `app/api/v1/contracts/[id]/cancel/route.ts` | 18 | 0 | 0 |
| `/api/v1/contracts/[id]/early-settlement` | POST | `app/api/v1/contracts/[id]/early-settlement/route.ts` | 18 | 0 | 1 |
| `/api/v1/contracts/[id]/invoices` | GET, POST | `app/api/v1/contracts/[id]/invoices/route.ts` | 18 | 0 | 0 |
| `/api/v1/contracts/[id]/payment-plan` | GET, POST, PUT | `app/api/v1/contracts/[id]/payment-plan/route.ts` | 19 | 0 | 0 |
| `/api/v1/contracts/[id]/pdf` | GET | `app/api/v1/contracts/[id]/pdf/route.ts` | 1 | 0 | 0 |
| `/api/v1/contracts/[id]/restructure` | POST | `app/api/v1/contracts/[id]/restructure/route.ts` | 18 | 0 | 0 |
| `/api/v1/contracts/[id]/sign` | POST | `app/api/v1/contracts/[id]/sign/route.ts` | 18 | 0 | 0 |
| `/api/v1/contracts/issue` | GET, POST | `app/api/v1/contracts/issue/route.ts` | 18 | 0 | 2 |
| `/api/v1/dashboard/metrics` | GET | `app/api/v1/dashboard/metrics/route.ts` | 1 | 0 | 0 |
| `/api/v1/dashboard/telemetry` | GET | `app/api/v1/dashboard/telemetry/route.ts` | 1 | 0 | 0 |
| `/api/v1/dashboard/units` | GET | `app/api/v1/dashboard/units/route.ts` | 2 | 0 | 0 |
| `/api/v1/documents` | GET, POST | `app/api/v1/documents/route.ts` | 2 | 0 | 3 |
| `/api/v1/documents/[id]` | GET, DELETE | `app/api/v1/documents/[id]/route.ts` | 2 | 0 | 3 |
| `/api/v1/health` | GET | `app/api/v1/health/route.ts` | 0 | 0 | 0 |
| `/api/v1/installments/[id]/pay` | POST | `app/api/v1/installments/[id]/pay/route.ts` | 18 | 0 | 6 |
| `/api/v1/installments/[id]/pay/ngenius` | POST | `app/api/v1/installments/[id]/pay/ngenius/route.ts` | 18 | 0 | 1 |
| `/api/v1/invoices` | GET, POST | `app/api/v1/invoices/route.ts` | 2 | 0 | 4 |
| `/api/v1/invoices/[id]` | GET | `app/api/v1/invoices/[id]/route.ts` | 1 | 0 | 1 |
| `/api/v1/invoices/[id]/pay` | POST | `app/api/v1/invoices/[id]/pay/route.ts` | 9 | 0 | 1 |
| `/api/v1/invoices/[id]/paylink/create` | POST | `app/api/v1/invoices/[id]/paylink/create/route.ts` | 2 | 0 | 0 |
| `/api/v1/invoices/[id]/paylink/status` | GET | `app/api/v1/invoices/[id]/paylink/status/route.ts` | 1 | 0 | 0 |
| `/api/v1/invoices/[id]/pdf` | GET | `app/api/v1/invoices/[id]/pdf/route.ts` | 1 | 0 | 0 |
| `/api/v1/invoices/[id]/qr` | GET | `app/api/v1/invoices/[id]/qr/route.ts` | 1 | 0 | 0 |
| `/api/v1/leads` | GET, POST | `app/api/v1/leads/route.ts` | 14 | 0 | 4 |
| `/api/v1/leads/[id]/move` | PATCH | `app/api/v1/leads/[id]/move/route.ts` | 4 | 0 | 2 |
| `/api/v1/leads/webhook` | POST | `app/api/v1/leads/webhook/route.ts` | 6 | 0 | 0 |
| `/api/v1/leases` | GET, POST, PUT | `app/api/v1/leases/route.ts` | 1 | 0 | 4 |
| `/api/v1/leases/[id]` | GET | `app/api/v1/leases/[id]/route.ts` | 1 | 0 | 1 |
| `/api/v1/leases/[id]/invoices` | POST | `app/api/v1/leases/[id]/invoices/route.ts` | 1 | 0 | 0 |
| `/api/v1/maintenance` | GET, POST | `app/api/v1/maintenance/route.ts` | 1 | 0 | 0 |
| `/api/v1/maintenance/[id]` | PATCH | `app/api/v1/maintenance/[id]/route.ts` | 1 | 0 | 0 |
| `/api/v1/offers` | GET, POST | `app/api/v1/offers/route.ts` | 19 | 0 | 3 |
| `/api/v1/offers/[id]` | PATCH | `app/api/v1/offers/[id]/route.ts` | 1 | 0 | 2 |
| `/api/v1/offers/[id]/accept` | POST | `app/api/v1/offers/[id]/accept/route.ts` | 18 | 0 | 1 |
| `/api/v1/offers/[id]/tours` | POST | `app/api/v1/offers/[id]/tours/route.ts` | 18 | 0 | 1 |
| `/api/v1/opportunities` | GET, POST | `app/api/v1/opportunities/route.ts` | 19 | 0 | 4 |
| `/api/v1/opportunities/[id]/offers` | POST | `app/api/v1/opportunities/[id]/offers/route.ts` | 19 | 0 | 1 |
| `/api/v1/payments` | GET | `app/api/v1/payments/route.ts` | 1 | 0 | 4 |
| `/api/v1/reconciliation/upload` | POST | `app/api/v1/reconciliation/upload/route.ts` | 4 | 0 | 1 |
| `/api/v1/reports/leads-performance` | GET | `app/api/v1/reports/leads-performance/route.ts` | 2 | 0 | 0 |
| `/api/v1/settings` | GET, PUT | `app/api/v1/settings/route.ts` | 1 | 6 | 4 |
| `/api/v1/settings/api-keys` | GET, POST, DELETE | `app/api/v1/settings/api-keys/route.ts` | 0 | 0 | 1 |
| `/api/v1/settings/leads-webhook` | GET, POST | `app/api/v1/settings/leads-webhook/route.ts` | 2 | 0 | 0 |
| `/api/v1/settlements` | GET | `app/api/v1/settlements/route.ts` | 2 | 0 | 2 |
| `/api/v1/support/tickets` | GET, POST | `app/api/v1/support/tickets/route.ts` | 1 | 0 | 2 |
| `/api/v1/support/tickets/[id]` | PUT | `app/api/v1/support/tickets/[id]/route.ts` | 1 | 0 | 1 |
| `/api/v1/support/tickets/[id]/reply` | GET, POST | `app/api/v1/support/tickets/[id]/reply/route.ts` | 2 | 0 | 1 |
| `/api/v1/sync/events` | GET | `app/api/v1/sync/events/route.ts` | 0 | 0 | 1 |
| `/api/v1/tasks` | GET, POST | `app/api/v1/tasks/route.ts` | 3 | 0 | 4 |
| `/api/v1/tasks/[id]/complete` | PATCH | `app/api/v1/tasks/[id]/complete/route.ts` | 1 | 0 | 3 |
| `/api/v1/tours` | GET, POST | `app/api/v1/tours/route.ts` | 19 | 0 | 4 |
| `/api/v1/tours/[id]` | PATCH | `app/api/v1/tours/[id]/route.ts` | 2 | 0 | 3 |
| `/api/v1/tours/[id]/status` | PATCH | `app/api/v1/tours/[id]/status/route.ts` | 18 | 0 | 3 |
| `/api/v1/whatsapp/send` | POST | `app/api/v1/whatsapp/send/route.ts` | 9 | 0 | 3 |
| `/api/v1/whatsapp/threads` | GET | `app/api/v1/whatsapp/threads/route.ts` | 0 | 0 | 1 |
| `/api/v1/zatca/activity` | GET | `app/api/v1/zatca/activity/route.ts` | 1 | 0 | 0 |
| `/api/v1/zatca/csid` | POST | `app/api/v1/zatca/csid/route.ts` | 1 | 0 | 2 |
| `/api/v1/zatca/dashboard` | GET | `app/api/v1/zatca/dashboard/route.ts` | 3 | 0 | 1 |
| `/api/v1/zatca/device` | GET, POST | `app/api/v1/zatca/device/route.ts` | 2 | 0 | 2 |
| `/api/v1/zatca/device/[id]` | DELETE | `app/api/v1/zatca/device/[id]/route.ts` | 1 | 0 | 1 |
| `/api/v1/zatca/queue` | GET | `app/api/v1/zatca/queue/route.ts` | 1 | 0 | 2 |
| `/api/v1/zatca/queue/[id]/retry` | POST | `app/api/v1/zatca/queue/[id]/retry/route.ts` | 1 | 0 | 1 |
| `/api/v1/zatca/status/[id]` | GET | `app/api/v1/zatca/status/[id]/route.ts` | 1 | 0 | 0 |
| `/api/v1/zatca/submit/[id]` | POST | `app/api/v1/zatca/submit/[id]/route.ts` | 3 | 0 | 1 |
| `/api/whatsapp/embedded-signup/callback` | GET | `app/api/whatsapp/embedded-signup/callback/route.ts` | 0 | 0 | 2 |
| `/api/whatsapp/embedded-signup/complete` | POST | `app/api/whatsapp/embedded-signup/complete/route.ts` | 4 | 0 | 1 |
| `/api/whatsapp/embedded-signup/disconnect` | POST | `app/api/whatsapp/embedded-signup/disconnect/route.ts` | 4 | 0 | 1 |
| `/api/whatsapp/embedded-signup/session` | POST | `app/api/whatsapp/embedded-signup/session/route.ts` | 4 | 0 | 1 |
| `/api/whatsapp/embedded-signup/status` | GET | `app/api/whatsapp/embedded-signup/status/route.ts` | 4 | 0 | 1 |
| `/api/whatsapp/webhook` | GET, POST | `app/api/whatsapp/webhook/route.ts` | 12 | 0 | 4 |
| `/api/whatsapp/webhook/360dialog/[webhookToken]` | POST | `app/api/whatsapp/webhook/360dialog/[webhookToken]/route.ts` | 2 | 0 | 2 |
| `/login/googlef13f3ae3c9c363b1.html` | GET | `app/login/googlef13f3ae3c9c363b1.html/route.ts` | 0 | 0 | 0 |
