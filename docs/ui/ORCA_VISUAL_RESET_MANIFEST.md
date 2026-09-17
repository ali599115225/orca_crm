# ORCA VISUAL RESET — ZERO BASE MANIFEST

## Protected
- `/login` and all login visual implementation: DO NOT CHANGE.
- APIs, database behavior, RBAC, Server Actions, tenant isolation, realtime behavior: PRESERVE.
- Current ORCA light/dark color variables: PRESERVE.
- Arabic font: Calibri.
- English font: Inter.

## Global V1 Rules
- No legacy page visual contract is authoritative.
- No card-inside-card stacking unless the inner element is semantically required.
- Tabs use one rounded segmented surface.
- Hover/focus/selected surfaces retain rounded edges.
- Interactive controls are at least 44px.
- Scrollbars remain functional but are visually hidden across all operations pages, tabs, fields, cards, drawers, dialogs, and internal scroll regions.
- No visible UUID or technical idempotency keys.
- Empty/loading/error states are part of the page contract.
- One page is rebuilt and visually closed before moving to the next.

## Primary operations destinations
1. Dashboard
2. Leads
3. Revenue Integrity
4. Offers
5. Tours
6. Properties
7. Contracts & Payments
8. Calculator
9. Marketing
10. Campaigns
11. Sales
12. Tasks
13. Documents
14. Helpdesk
15. Agents
16. Email
17. WhatsApp
18. Settings

## Known deep operational screens
- Lead detail `/operations/leads/[id]`
- Rental leases
- Rental invoices
- Rental payments
- Rental reconciliation
- Rental settlements
- Sales contracts
- Sales contract detail `/operations/rental/sales/contracts/[id]`

## Migration order
V0. Global operations shell
V1. Dashboard
V2. Leads + Lead Detail
V3. Revenue Integrity
V4. Offers
V5. Tours
V6. Properties
V7. Contracts & Payments + Sales Contract Detail
V8. Calculator
V9. Marketing
V10. Campaigns
V11. Sales
V12. Tasks
V13. Documents
V14. Helpdesk
V15. Agents
V16. Email
V17. WhatsApp
V18. Settings
V19. Legacy visual contract deletion + final cross-page verification

## Current status
- V0 Global Operations Shell: IMPLEMENTATION STARTED
- Page rebuilds: NOT STARTED