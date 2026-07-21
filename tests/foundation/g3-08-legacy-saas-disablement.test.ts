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
      expect(getLegacySaasCapability(capability)).toMatchObject({
        enabled: false,
        code: LEGACY_SAAS_OUT_OF_SCOPE,
        capability,
        reason: 'SINGLE_COMPANY_OPERATIONAL_MODE',
      })
    }

    expect(
      legacySaasBlockedResult('SUBSCRIPTION_CHECKOUT', 'disabled'),
    ).toMatchObject({
      success: false,
      enabled: false,
      code: LEGACY_SAAS_OUT_OF_SCOPE,
      capability: 'SUBSCRIPTION_CHECKOUT',
      error: 'disabled',
    })
  })

  it('blocks public company creation at page, component, and action layers', () => {
    const page = read('app/register/page.tsx')
    const form = read('app/register/RegisterForm.tsx')
    const action = read('app/actions/register.ts')

    expect(page).toContain('notFound()')
    expect(form).not.toContain('<form')
    expect(form).not.toContain('<input')
    expect(form).not.toContain('registerTenantAction')
    expect(action).toContain('legacySaasBlockedResult')
    expect(action).toContain('PUBLIC_TENANT_REGISTRATION')
    expect(action).not.toContain('@/lib/prisma')
    expect(action).not.toContain('cookies()')
  })

  it('blocks checkout and billing automation without persistence dependencies', () => {
    const payment = read('app/actions/payment.ts')
    const billing = read('app/api/cron/billing/route.ts')

    expect(payment).toContain('SUBSCRIPTION_CHECKOUT')
    expect(payment).toContain('ADDON_CHECKOUT')
    expect(payment).toContain('legacySaasBlockedResult')
    expect(payment).not.toContain('@/lib/prisma')
    expect(payment).not.toContain('@/lib/payments')

    expect(billing).toContain('CRON_SECRET')
    expect(billing).toContain('rateLimit')
    expect(billing).toContain('skipped: true')
    expect(billing).toContain('BILLING_CRON')
    expect(billing).not.toContain('@/lib/prisma')
    expect(billing).not.toContain('@/lib/payments')
  })

  it('keeps agent leasing and package gates behind the immutable model switch', () => {
    const growth = read('app/actions/growth.ts')
    const planGuard = read('lib/plan-guard.ts')
    const leaseStart = growth.indexOf('export async function leaseAgentAction')
    const leaseBoundary = growth.slice(leaseStart)

    expect(leaseStart).toBeGreaterThanOrEqual(0)
    expect(leaseBoundary).toContain('if (!isLegacySaasEnabled())')
    expect(leaseBoundary).toContain('LEGACY_SAAS_OUT_OF_SCOPE')
    expect(planGuard).toContain('if (!isLegacySaasEnabled()')
    expect(planGuard).toContain('return true;')
  })

  it('keeps upgrade and checkout actions absent from the compatibility billing UI', () => {
    const billingUi = read('components/settings/SettingsBilling.tsx')
    expect(billingUi).not.toContain('initiateSubscriptionPaymentAction')
    expect(billingUi).not.toContain('initiateAddonPaymentAction')
    expect(billingUi).toContain('Operational billing')
  })

  it('preserves historical SaaS structures and additive migration safety', () => {
    const schema = read('prisma/schema.prisma')
    const migration = read(
      'prisma/migrations/20260721010000_g3_rbac_expand/migration.sql',
    )

    for (const anchor of [
      'model Tenant {',
      'subscriptionPlan',
      'subscriptionExpiresAt',
      'paymentStatus',
      'billingCycle',
      'extraAgents',
      'model AgentLease {',
    ]) {
      expect(schema).toContain(anchor)
    }

    expect(migration).not.toMatch(
      /DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|DELETE\s+FROM/i,
    )
  })
})
