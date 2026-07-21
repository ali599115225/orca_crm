import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  LEGACY_SAAS_CAPABILITIES,
  LEGACY_SAAS_OUT_OF_SCOPE,
  ORCA_PLATFORM_MODEL,
  getLegacySaasCapability,
  isLegacySaasEnabled,
  legacySaasBlockedResult,
} from '../../lib/platform-operating-model'

const read = (path: string) => readFileSync(path, 'utf8')

describe('G3-08 layered legacy SaaS disablement', () => {
  it('defines a complete immutable disabled capability registry', () => {
    expect(ORCA_PLATFORM_MODEL).toMatchObject({
      businessModel: 'SINGLE_INDEPENDENT_COMPANY',
      platformModel: 'INTERNAL_COMPANY_OPERATING_PLATFORM',
      legacySaasEnabled: false,
    })
    expect(isLegacySaasEnabled()).toBe(false)
    expect(new Set(LEGACY_SAAS_CAPABILITIES).size).toBe(
      LEGACY_SAAS_CAPABILITIES.length,
    )
    expect(LEGACY_SAAS_CAPABILITIES).toEqual([
      'PUBLIC_TENANT_REGISTRATION',
      'SELF_SERVICE_TRIAL',
      'SUBSCRIPTION_CHECKOUT',
      'SUBSCRIPTION_CHANGE',
      'ADDON_CHECKOUT',
      'AGENT_LEASING',
      'AUTOMATIC_RENEWAL',
      'BILLING_CRON',
      'PACKAGE_LIMIT_ENFORCEMENT',
      'UPGRADE_NAVIGATION',
    ])

    for (const capability of LEGACY_SAAS_CAPABILITIES) {
      expect(getLegacySaasCapability(capability)).toEqual({
        enabled: false,
        code: LEGACY_SAAS_OUT_OF_SCOPE,
        capability,
        platformModel: 'INTERNAL_COMPANY_OPERATING_PLATFORM',
        reason: 'SINGLE_COMPANY_OPERATIONAL_MODE',
      })
    }
  })

  it('returns a stable non-executable compatibility result', () => {
    expect(
      legacySaasBlockedResult(
        'SUBSCRIPTION_CHECKOUT',
        'subscription disabled',
      ),
    ).toEqual({
      success: false,
      error: 'subscription disabled',
      enabled: false,
      code: LEGACY_SAAS_OUT_OF_SCOPE,
      capability: 'SUBSCRIPTION_CHECKOUT',
      platformModel: 'INTERNAL_COMPANY_OPERATING_PLATFORM',
      reason: 'SINGLE_COMPANY_OPERATIONAL_MODE',
    })
  })

  it('blocks public company creation at page, component, and server-action layers', () => {
    const page = read('app/register/page.tsx')
    const form = read('app/register/RegisterForm.tsx')
    const action = read('app/actions/register.ts')

    expect(page).toContain('notFound()')
    expect(form).not.toContain('<form')
    expect(form).not.toContain('<input')
    expect(form).not.toContain('registerTenantAction')
    expect(form).not.toContain('name="subdomain"')
    expect(action).toContain('legacySaasBlockedResult')
    expect(action).toContain('"PUBLIC_TENANT_REGISTRATION"')
    expect(action).not.toMatch(/@\/lib\/prisma|\.tenant\.create|cookies\(|setCookie|bcrypt|payment/i)
  })

  it('blocks subscription and add-on checkout before provider or persistence access', () => {
    const payment = read('app/actions/payment.ts')
    expect(payment).toContain('"SUBSCRIPTION_CHECKOUT"')
    expect(payment).toContain('"ADDON_CHECKOUT"')
    expect(payment).toContain('legacySaasBlockedResult')
    expect(payment).not.toMatch(/@\/lib\/prisma|initiatePayment|paymentTransaction|provider\.create/i)
  })

  it('keeps retired billing automation authenticated, skipped, and side-effect free', () => {
    const billing = read('app/api/cron/billing/route.ts')
    expect(billing).toContain('CRON_SECRET')
    expect(billing).toContain('rateLimit')
    expect(billing).toContain('skipped: true')
    expect(billing).toContain('"BILLING_CRON"')
    expect(billing).not.toMatch(/@\/lib\/prisma|subscriptionExpiresAt|paymentStatus\s*:|\.update\(|\.create\(|sendEmail|notification/i)
  })

  it('blocks agent leasing before session, tenant, or AgentLease data access', () => {
    const growth = read('app/actions/growth.ts')
    const start = growth.indexOf('export async function leaseAgentAction')
    const leaseBoundary = growth.slice(start)
    const guard = leaseBoundary.indexOf('if (!isLegacySaasEnabled())')
    const session = leaseBoundary.indexOf('const session = await getSession()')
    const persistence = leaseBoundary.indexOf('prisma.agentLease')

    expect(start).toBeGreaterThanOrEqual(0)
    expect(guard).toBeGreaterThanOrEqual(0)
    expect(guard).toBeLessThan(session)
    expect(guard).toBeLessThan(persistence)
    expect(leaseBoundary.slice(guard, session)).toContain(
      'LEGACY_SAAS_OUT_OF_SCOPE',
    )
  })

  it('disables package limits and package feature gates without database reads', () => {
    const guard = read('lib/plan-guard.ts')
    const countGuard = guard.indexOf(
      'if (!isLegacySaasEnabled() || getDeploymentLicenseMode() === "DEDICATED_COPY") return;',
    )
    const tenantLock = guard.indexOf('FOR UPDATE')
    const featureGuard = guard.indexOf(
      'if (!isLegacySaasEnabled() || getDeploymentLicenseMode() === "DEDICATED_COPY") return true;',
    )

    expect(countGuard).toBeGreaterThanOrEqual(0)
    expect(countGuard).toBeLessThan(tenantLock)
    expect(featureGuard).toBeGreaterThanOrEqual(0)
  })

  it('removes upgrade and checkout actions from the billing UI', () => {
    const billingUi = read('components/settings/SettingsBilling.tsx')
    expect(billingUi).toContain('لا توجد باقات أو ترقيات اشتراك')
    expect(billingUi).not.toContain('initiateSubscriptionPaymentAction')
    expect(billingUi).not.toContain('initiateAddonPaymentAction')
    expect(billingUi).not.toMatch(/شراء الباقة|ابدأ التجربة|ترقية الآن|checkout/i)
  })

  it('preserves historical SaaS data structures and forbids destructive contraction', () => {
    const schema = read('prisma/schema.prisma')
    const migration = read(
      'prisma/migrations/20260721010000_g3_rbac_expand/migration.sql',
    )

    expect(schema).toContain('model Tenant {')
    expect(schema).toContain('subscriptionPlan')
    expect(schema).toContain('subscriptionExpiresAt')
    expect(schema).toContain('paymentStatus')
    expect(schema).toContain('billingCycle')
    expect(schema).toContain('extraAgents')
    expect(schema).toContain('model AgentLease {')
    expect(migration).not.toMatch(/DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|DELETE\s+FROM/i)
  })
})
