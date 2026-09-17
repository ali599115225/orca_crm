# ORCA Repository Agent Rules

## ORCA OPERATIONS PAGE CONTRACT — MANDATORY

Before modifying any user-visible `/operations/*` page, read and obey:

`docs/ui/ORCA_OPERATIONS_PAGE_CONTRACT.md`

This contract is repository governance, not optional styling guidance.

Non-negotiable rules:

1. Dashboard is the canonical visual reference for user-visible Operations pages.
2. Do not invent a separate visual language per page.
3. Do not fix visual drift with one-off per-page patches when the shared contract should solve it.
4. Shared shell/header/actions/KPI/panel/table/tabs/empty-state/dialog behavior must be reused or extended centrally.
5. Preserve page-specific business logic, authorization, DB behavior, routing, and server actions.
6. Every visible action must be real. No dead controls, fake success, mock actions, or placeholder mutations.
7. Create/edit workflows use the shared dialog/modal contract unless an explicit product decision approves another pattern.
8. Do not expose UUIDs or technical IDs to end users.
9. A page is not CLOSED from static tests alone.

Required closure gate:

`VISUAL PASS + FUNCTIONAL PASS + NO DEAD UI`

For visual work, verify the whole page contract in one pass. Do not use repeated discovery/patch cycles as the implementation method.

No Commit / Push / Deploy / Migration unless explicitly authorized by the owner.