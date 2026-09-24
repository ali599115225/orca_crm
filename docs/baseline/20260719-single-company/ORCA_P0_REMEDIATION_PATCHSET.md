# ORCA P0 REMEDIATION PATCHSET
**Patchset ID:** ORCA-P0-20260719-01
**Base SHA:** `f41c8dd81d730acc5b8b520971e8a47c5e72903b`
**Target branch:** `work/orca-central-baseline-execution-20260719`
**GitHub write state:** BLOCKED by missing GitHub App installation/write authorization
## Patch 1 — Restore TypeScript/Preview build
**File:** `components/features/ContractWizard.tsx`
```diff
@@ client selector
-                  emptyStateLabel={t("contractWizard.clientEmpty")}
+                  emptyLabel={t("contractWizard.clientEmpty")}
@@ property selector
-                    emptyStateLabel={t("contractWizard.propertyEmpty")}
+                    emptyLabel={t("contractWizard.propertyEmpty")}
```
### Acceptance
1. `tsc` / Next type check passes this file.
2. Contract wizard empty-state labels remain visible for zero clients/properties.
3. Vercel Preview progresses beyond the current TypeScript failure.
## Patch 2 — WhatsApp server-action authorization boundary
### New file
`lib/whatsapp/access.ts`
Responsibilities:
- Read `getSession()`.
- Require non-empty `tenantId` and `userId`.
- Enter `runWithTenantContext({tenantId, userId})`.
- Re-read active user from Prisma using `{id, tenantId, isActive:true}`.
- Enforce database role on every call.
- Return immutable `{tenantId, userId, role}`.
Role sets:
```ts
export const WHATSAPP_READ_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
  "READ_ONLY",
] as const;
export const WHATSAPP_WRITE_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
] as const;
export const WHATSAPP_CONNECTION_ROLES = ["ADMIN"] as const;
```
### Change `app/actions/whatsapp.ts`
- Replace every `getActiveTenant()` + `setTenantContext()` entry boundary with `requireWhatsAppAccess(...)`.
- `toggleWhatsAppConnectionAction`: `WHATSAPP_CONNECTION_ROLES`.
- `getCloudAPIStatusAction`: `WHATSAPP_READ_ROLES`.
- `getWhatsAppAssigneesAction`: `WHATSAPP_WRITE_ROLES`.
- `getWhatsAppChatsAction`: `WHATSAPP_READ_ROLES`.
- `sendWhatsAppMessageAction`: `WHATSAPP_WRITE_ROLES` before phone/provider work.
- `archiveChatAction`: `WHATSAPP_WRITE_ROLES`.
- `assignChatAction`: `WHATSAPP_WRITE_ROLES`.
- Never invoke provider send, Prisma mutation, or feature check before authorization succeeds.
- Remove unused internal imports (`logWhatsAppActivity`, deprecated `setTenantContext`, and any resolver helpers not used after cleanup).
### Change `app/actions/whatsapp-crm.ts`
- `createWhatsAppTaskAction`: enforce `WHATSAPP_WRITE_ROLES` through the shared access helper.
- `getWhatsAppDashboardStats`: enforce `WHATSAPP_READ_ROLES` and derive tenantId from verified access.
- Move `fetchWhatsAppDashboardStats(tenantId)` to `lib/whatsapp/dashboard-stats.ts` with `import "server-only"`.
- Move `logWhatsAppActivity(...)` to `lib/whatsapp/activity.ts` with `import "server-only"`, or remove it if confirmed unused.
- No exported function in a top-level `"use server"` file may accept caller-supplied `tenantId`.
### Change `features/dashboard/server/getDashboardReadModel.ts`
```diff
-import { fetchWhatsAppDashboardStats } from "@/app/actions/whatsapp-crm";
+import { fetchWhatsAppDashboardStats } from "@/lib/whatsapp/dashboard-stats";
```
The caller already supplies a server-derived tenantId and runs inside a tenant context.
### Change `app/operations/whatsapp/page.tsx`
- Use a secure database-backed session/role guard.
- Do not continue with nullable `session`.
- Pass a verified active `userId` to the client.
### Change `app/operations/layout.tsx`
- For non-privileged sessions, redirect/deny when the active tenant user query returns `null`.
- Do not render the operations shell with empty user identity and fallback `READ_ONLY` after account deactivation.
## Required tests
Create `tests/whatsapp/authorization-boundary.test.ts`:
1. Unauthenticated reads return authorization failure and make no Prisma calls.
2. Inactive user is denied and provider send is never called.
3. `READ_ONLY` may read chats/status but cannot send, archive, assign, toggle connection, or create task.
4. `SALES_EMPLOYEE` may send/archive/assign/create task but cannot toggle connection.
5. `ADMIN` may manage connection.
6. Any attempted write with a user from another tenant is denied.
7. All external provider functions remain uncalled on every failed authorization path.
8. No exported Server Action accepts a `tenantId` argument.
Update `tests/whatsapp/whatsapp-actions.test.ts` to mock the access boundary rather than `getActiveTenant()` directly.
## Test commands after implementation
```text
npx vitest run tests/whatsapp/authorization-boundary.test.ts tests/whatsapp/whatsapp-actions.test.ts
npx tsc --noEmit
npm run build
```
The tests must not call a real WhatsApp provider, send messages, mutate Production, or reveal credentials.
## Patch 3 — Disable legacy SaaS billing Cron in single-company mode
**Files:** `app/api/cron/billing/route.ts`, `vercel.json` or a central single-company mode guard.
- The current schedule calls `/api/cron/billing` daily.
- The route suspends expired tenants, renews agent leases, calculates upgrade messaging, and can send SMS to a fixed recipient when credentials exist.
- This is outside the approved business model and conflicts with the external integration policy.
### Safe remediation
1. Add an explicit `SINGLE_COMPANY`/internal-platform mode that returns `skipped: true` before any Prisma mutation or provider call.
2. Remove hardcoded recipients from executable code.
3. Add tests proving `sendSMSNotification`, payment, and subscription mutations are never called in the approved mode.
4. Remove the Cron schedule only after confirming no unrelated operational behavior depends on the same route.
5. Do not run the route against Production during verification.