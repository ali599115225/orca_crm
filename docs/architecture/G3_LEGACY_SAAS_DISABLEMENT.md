# G3 Legacy SaaS Disablement Contract

- **Stage:** G3-08 — Legacy SaaS Disablement
- **Operating model:** single independent company
- **Data policy:** disable, do not delete
- **Production deployment:** not performed by this stage

## Central capability registry

`lib/platform-operating-model.ts` is the canonical boundary. The following capabilities are permanently disabled in the current product model:

1. public Tenant/company registration;
2. self-service trials;
3. platform subscription checkout;
4. plan changes;
5. add-on checkout;
6. paid agent leasing;
7. automatic SaaS renewal;
8. subscription billing Cron;
9. package-limit enforcement;
10. upgrade or checkout navigation.

Every capability resolves to:

```text
enabled = false
code = LEGACY_SAAS_OUT_OF_SCOPE
reason = SINGLE_COMPANY_OPERATIONAL_MODE
```

No environment variable, deployment-license mode, request value, query parameter, form field, or stale client may re-enable these capabilities.

## Layered disablement

### UI and navigation

- `/register` returns `notFound()`.
- `RegisterForm` is compatibility-only and contains no form, input, submit action, subdomain field, or tenant-creation path.
- Settings billing explains operational customer billing only and exposes no platform package, trial, upgrade, or add-on checkout action.

### Server actions

- `registerTenantAction()` always returns the public-registration block before reading submitted data.
- subscription and add-on payment actions always return their capability block and do not load providers, sessions, Prisma, or payment services.
- paid agent leasing checks the immutable SaaS-disabled state before session, Tenant, or AgentLease access.

### Jobs

- the retired billing Cron retains secret authentication and rate limiting so stale schedules fail safely;
- after authentication it returns `skipped: true` with the `BILLING_CRON` block;
- it performs no subscription update, provider call, password reset, renewal, notification, or data mutation.

### Package gates

Legacy package limits and package-feature checks return before database access. Historical plan metadata is not used to restrict the single-company runtime.

## Historical-data retention

The following remain intentionally present for compatibility, audit, recovery, and a later separately approved Contract phase:

- `Tenant`;
- `Tenant.subscriptionPlan`;
- `Tenant.subscriptionExpiresAt`;
- `Tenant.paymentStatus`;
- `Tenant.billingCycle`;
- `Tenant.extraAgents`;
- `AgentLease` and historical rows;
- prior payment/provider records and archived reports.

G3-08 authorizes no table deletion, column deletion, data purge, plan-field rewrite, or irreversible contraction.

## Operational versus platform billing

G3-08 does not disable legitimate company operations such as:

- contract invoices;
- installment schedules;
- customer payments and receipts;
- rental billing;
- accounting and ZATCA processing;
- customer payment links where separately authorized.

It disables only billing where ORCA itself is sold as a multi-company SaaS subscription or add-on marketplace.

## Rollback

Source rollback is a normal revert. A runtime re-enable is not an approved rollback because the accepted architecture requires single-company mode. Historical data remains intact, so no schema or data rollback is needed.
