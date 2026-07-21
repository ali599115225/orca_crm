import { describe, expect, it } from 'vitest'

import {
  PERMISSION_BY_KEY,
  PERMISSION_KEYS,
  PERMISSION_REGISTRY,
  isPermissionKey,
} from '@/lib/authz/permission-registry'

describe('G3-02 permission registry contract', () => {
  it('contains a broad inventory derived from real ORCA server boundaries', () => {
    expect(PERMISSION_REGISTRY.length).toBeGreaterThanOrEqual(75)

    const resources = new Set(
      PERMISSION_REGISTRY.map((permission) => permission.resource),
    )

    for (const required of [
      'users',
      'organization',
      'access',
      'leads',
      'projects',
      'properties',
      'tasks',
      'tours',
      'offers',
      'contracts',
      'installments',
      'invoices',
      'payments',
      'accounting',
      'marketing',
      'whatsapp',
      'email',
      'documents',
      'agents',
      'settings',
      'compliance',
      'zatca',
      'automations',
      'sentinel',
      'audit',
      'webhooks',
      'health',
    ]) {
      expect(resources.has(required), `missing resource ${required}`).toBe(true)
    }
  })

  it('uses stable unique permission keys and a complete lookup map', () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length)
    expect(Object.keys(PERMISSION_BY_KEY)).toHaveLength(PERMISSION_KEYS.length)

    for (const permission of PERMISSION_REGISTRY) {
      expect(permission.key).toMatch(/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/)
      expect(permission.key).toBe(`${permission.resource}.${permission.action}`)
      expect(isPermissionKey(permission.key)).toBe(true)
      expect(PERMISSION_BY_KEY[permission.key]).toBe(permission)
    }

    expect(isPermissionKey('legacy.ADMIN')).toBe(false)
    expect(isPermissionKey('unknown.permission')).toBe(false)
  })

  it('keeps every subordinate scope inside the verified tenant boundary', () => {
    const allowedScopes = new Set([
      'TENANT',
      'BRANCH',
      'DEPARTMENT',
      'TEAM',
      'SELF',
      'RESOURCE',
    ])

    for (const permission of PERMISSION_REGISTRY) {
      expect(permission.scopes.length).toBeGreaterThan(0)
      for (const scope of permission.scopes) {
        expect(allowedScopes.has(scope)).toBe(true)
      }
    }
  })

  it('records repository evidence for every permission', () => {
    for (const permission of PERMISSION_REGISTRY) {
      expect(permission.sourcePaths.length).toBeGreaterThan(0)
      expect(permission.description.trim().length).toBeGreaterThan(10)

      for (const sourcePath of permission.sourcePaths) {
        expect(sourcePath).toMatch(/^(app|features|lib)\//)
        expect(sourcePath).not.toContain('..')
      }
    }
  })

  it('does not use the legacy Role enum as the permission authority', () => {
    const serialized = JSON.stringify(PERMISSION_REGISTRY)
    expect(serialized).not.toContain('SALES_MANAGER')
    expect(serialized).not.toContain('SALES_EMPLOYEE')
    expect(serialized).not.toContain('READ_ONLY')
  })
})
