import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { authorizeTrustedJob } from '../../lib/authz/trusted-job'
import type { EnforcementDomain } from '../../lib/authz/enforcement'

const jobsEnabled = new Set<EnforcementDomain>(['jobs'])

describe('G3-07 trusted background-job boundary', () => {
  it('preserves the existing secret decision while jobs enforcement is disabled', () => {
    expect(
      authorizeTrustedJob(true, 'realtime.purge', {
        enforcedDomains: new Set<EnforcementDomain>(),
      }),
    ).toMatchObject({
      enforced: false,
      effectiveAllowed: true,
      reason: 'LEGACY_MODE',
    })
  })

  it('requires both the existing trusted secret and a SYSTEM permission', () => {
    expect(
      authorizeTrustedJob(true, 'realtime.purge', {
        enforcedDomains: jobsEnabled,
      }),
    ).toMatchObject({
      enforced: true,
      systemPermissionValid: true,
      effectiveAllowed: true,
      reason: 'TRUSTED_SYSTEM_ALLOW',
    })

    expect(
      authorizeTrustedJob(false, 'realtime.purge', {
        enforcedDomains: jobsEnabled,
      }),
    ).toMatchObject({
      effectiveAllowed: false,
      reason: 'LEGACY_DENY',
    })
  })

  it('rejects unknown and non-system permissions at the trusted boundary', () => {
    expect(
      authorizeTrustedJob(true, 'unknown.permission', {
        enforcedDomains: jobsEnabled,
      }),
    ).toMatchObject({
      effectiveAllowed: false,
      reason: 'UNKNOWN_PERMISSION',
    })

    expect(
      authorizeTrustedJob(true, 'accounting.read', {
        enforcedDomains: jobsEnabled,
      }),
    ).toMatchObject({
      effectiveAllowed: false,
      reason: 'NOT_SYSTEM_PERMISSION',
    })
  })

  it('integrates realtime retention without accepting browser tenant input', () => {
    const route = readFileSync('app/api/cron/realtime-retention/route.ts', 'utf8')
    expect(route).toContain('authorizeTrustedJob')
    expect(route).toContain('"realtime.purge"')
    expect(route).toContain('CRON_SECRET')
    expect(route).not.toMatch(/searchParams.*tenant|request\.json\(\).*tenant/is)
  })
})
