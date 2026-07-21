import {
  PERMISSION_REGISTRY,
  type PermissionDefinition,
  type PermissionKey,
} from './permission-registry'

export const DEFAULT_BRANCH_CODE = 'default-branch'
export const DEFAULT_DEPARTMENT_CODE = 'default-department'

export const ACCESS_ROLE_KEYS = [
  'admin',
  'sales-manager',
  'sales-employee',
  'marketing',
  'read-only',
] as const

export type AccessRoleKey = (typeof ACCESS_ROLE_KEYS)[number]
export type LegacyRoleKey =
  | 'ADMIN'
  | 'SALES_MANAGER'
  | 'SALES_EMPLOYEE'
  | 'MARKETING'
  | 'READ_ONLY'

export const LEGACY_ROLE_TO_ACCESS_ROLE = {
  ADMIN: 'admin',
  SALES_MANAGER: 'sales-manager',
  SALES_EMPLOYEE: 'sales-employee',
  MARKETING: 'marketing',
  READ_ONLY: 'read-only',
} as const satisfies Record<LegacyRoleKey, AccessRoleKey>

export type AccessRoleBlueprint = Readonly<{
  key: AccessRoleKey
  name: string
  description: string
  permissionKeys: readonly PermissionKey[]
}>

const keysWhere = (
  predicate: (permission: PermissionDefinition) => boolean,
): readonly PermissionKey[] =>
  PERMISSION_REGISTRY.filter(predicate).map(({ key }) => key) as PermissionKey[]

const SALES_MANAGER_RESOURCES = new Set([
  'dashboard',
  'leads',
  'contacts',
  'opportunities',
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
  'rentals',
  'email',
  'whatsapp',
  'settings',
  'documents',
  'notifications',
  'reports',
])

const SALES_EMPLOYEE_RESOURCES = new Set([
  'dashboard',
  'leads',
  'contacts',
  'opportunities',
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
  'rentals',
  'email',
  'whatsapp',
  'settings',
  'documents',
  'notifications',
])

const MARKETING_PERMISSION_KEYS = new Set<PermissionKey>([
  'dashboard.read',
  'leads.read',
  'contacts.read',
  'marketing.read',
  'marketing.manage',
  'marketing.publish',
  'whatsapp.read',
  'documents.read',
  'documents.upload',
  'notifications.read',
  'notifications.manage',
  'reports.read',
])

const READ_ONLY_PERMISSION_KEYS = new Set<PermissionKey>([
  'dashboard.read',
  'leads.read',
  'projects.read',
  'properties.read',
  'contacts.read',
  'opportunities.read',
  'tasks.read',
  'tours.read',
  'offers.read',
  'contracts.read',
  'installments.read',
  'invoices.read',
  'payments.read',
  'rentals.read',
  'marketing.read',
  'whatsapp.read',
  'helpdesk.read',
  'documents.read',
  'notifications.read',
  'reports.read',
])

export const ACCESS_ROLE_BLUEPRINTS = [
  {
    key: 'admin',
    name: 'Company Administrator',
    description: 'Full company authority inside the verified tenant boundary.',
    permissionKeys: keysWhere(() => true),
  },
  {
    key: 'sales-manager',
    name: 'Sales Manager',
    description: 'Sales leadership and approval authority without company administration or trusted-system permissions.',
    permissionKeys: keysWhere(
      ({ resource, risk }) =>
        SALES_MANAGER_RESOURCES.has(resource) &&
        risk !== 'ADMIN' &&
        risk !== 'SYSTEM',
    ),
  },
  {
    key: 'sales-employee',
    name: 'Sales Employee',
    description: 'Day-to-day sales operations without approval, administration, or system authority.',
    permissionKeys: keysWhere(
      ({ resource, risk }) =>
        SALES_EMPLOYEE_RESOURCES.has(resource) &&
        (risk === 'READ' || risk === 'WRITE'),
    ),
  },
  {
    key: 'marketing',
    name: 'Marketing',
    description: 'Explicit marketing and read-only communication authority without implicit provider or send grants.',
    permissionKeys: keysWhere(({ key }) =>
      MARKETING_PERMISSION_KEYS.has(key as PermissionKey),
    ),
  },
  {
    key: 'read-only',
    name: 'Read Only',
    description: 'Explicit operational read visibility; no blanket grant for every READ-classified permission.',
    permissionKeys: keysWhere(({ key }) =>
      READ_ONLY_PERMISSION_KEYS.has(key as PermissionKey),
    ),
  },
] as const satisfies readonly AccessRoleBlueprint[]

export function accessRoleKeyForLegacyRole(role: string): AccessRoleKey {
  const mapped = LEGACY_ROLE_TO_ACCESS_ROLE[role as LegacyRoleKey]
  if (!mapped) {
    throw new Error(`Unsupported legacy role for G3 backfill: ${role}`)
  }
  return mapped
}
