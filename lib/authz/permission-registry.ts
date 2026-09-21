export type PermissionScope =
  | 'TENANT'
  | 'BRANCH'
  | 'DEPARTMENT'
  | 'TEAM'
  | 'SELF'
  | 'RESOURCE'

export type PermissionRisk =
  | 'READ'
  | 'WRITE'
  | 'APPROVE'
  | 'ADMIN'
  | 'SYSTEM'

export type PermissionDefinition = Readonly<{
  key: string
  resource: string
  action: string
  risk: PermissionRisk
  scopes: readonly PermissionScope[]
  sourcePaths: readonly string[]
  description: string
}>

const TENANT_SCOPES = [
  'TENANT',
  'BRANCH',
  'DEPARTMENT',
  'TEAM',
  'SELF',
  'RESOURCE',
] as const satisfies readonly PermissionScope[]

const COMPANY_ONLY = ['TENANT'] as const satisfies readonly PermissionScope[]
const COMPANY_OR_RESOURCE = [
  'TENANT',
  'RESOURCE',
] as const satisfies readonly PermissionScope[]
const COMPANY_OR_SELF = [
  'TENANT',
  'SELF',
] as const satisfies readonly PermissionScope[]

const p = (
  key: string,
  resource: string,
  action: string,
  risk: PermissionRisk,
  scopes: readonly PermissionScope[],
  sourcePaths: readonly string[],
  description: string,
): PermissionDefinition => ({
  key,
  resource,
  action,
  risk,
  scopes,
  sourcePaths,
  description,
})

/**
 * Canonical G3 permission inventory.
 *
 * Permission keys are stable server contracts. UI labels, legacy Prisma Role
 * values, and JWT role claims must never replace these keys as authorization
 * evidence. Every scope remains subordinate to the verified tenantId boundary.
 */
export const PERMISSION_REGISTRY = [
  p('dashboard.read', 'dashboard', 'read', 'READ', TENANT_SCOPES, ['features/dashboard/server/getDashboardReadModel.ts'], 'Read company operational dashboards.'),

  p('users.read', 'users', 'read', 'READ', TENANT_SCOPES, ['app/actions/users.ts'], 'Read active company users.'),
  p('users.create', 'users', 'create', 'ADMIN', COMPANY_ONLY, ['app/actions/users.ts'], 'Create an internal company user.'),
  p('users.update', 'users', 'update', 'ADMIN', COMPANY_OR_RESOURCE, ['app/actions/users.ts'], 'Update an internal company user.'),
  p('users.disable', 'users', 'disable', 'ADMIN', COMPANY_OR_RESOURCE, ['app/actions/users.ts'], 'Disable or reactivate an internal company user.'),

  p('organization.read', 'organization', 'read', 'READ', TENANT_SCOPES, ['lib/authz/permission-registry.ts'], 'Read organizational units and assignments.'),
  p('organization.manage', 'organization', 'manage', 'ADMIN', COMPANY_ONLY, ['lib/authz/permission-registry.ts'], 'Create and maintain branches, departments, teams, and memberships.'),
  p('access.read', 'access', 'read', 'ADMIN', COMPANY_ONLY, ['lib/api-auth-guard.ts'], 'Read roles, permissions, assignments, and access audit records.'),
  p('access.manage', 'access', 'manage', 'ADMIN', COMPANY_ONLY, ['lib/api-auth-guard.ts'], 'Manage roles, permission mappings, and scoped role assignments.'),

  p('leads.read', 'leads', 'read', 'READ', TENANT_SCOPES, ['app/actions/leads.ts', 'app/api/v1/leads/route.ts'], 'Read leads and lead activity.'),
  p('leads.create', 'leads', 'create', 'WRITE', TENANT_SCOPES, ['app/actions/leads.ts', 'app/api/v1/leads/route.ts'], 'Create a lead.'),
  p('leads.update', 'leads', 'update', 'WRITE', TENANT_SCOPES, ['app/actions/leads.ts'], 'Update lead details or status.'),
  p('leads.assign', 'leads', 'assign', 'APPROVE', TENANT_SCOPES, ['app/actions/leads.ts'], 'Assign or reassign a lead.'),
  p('leads.archive', 'leads', 'archive', 'APPROVE', TENANT_SCOPES, ['app/actions/leads.ts'], 'Archive or restore a lead.'),

  p('projects.read', 'projects', 'read', 'READ', TENANT_SCOPES, ['app/api/projects/route.ts'], 'Read development projects.'),
  p('projects.manage', 'projects', 'manage', 'WRITE', TENANT_SCOPES, ['app/api/projects/route.ts'], 'Create or update development projects.'),
  p('properties.read', 'properties', 'read', 'READ', TENANT_SCOPES, ['app/api/properties/[id]/schedule-visit/route.ts'], 'Read properties and units.'),
  p('properties.manage', 'properties', 'manage', 'WRITE', TENANT_SCOPES, ['app/api/projects/route.ts'], 'Create or update properties and units.'),
  p('properties.schedule-visit', 'properties', 'schedule-visit', 'WRITE', TENANT_SCOPES, ['app/api/properties/[id]/schedule-visit/route.ts'], 'Schedule a property visit.'),

  p('contacts.read', 'contacts', 'read', 'READ', TENANT_SCOPES, ['app/actions/leads.ts'], 'Read company contacts.'),
  p('contacts.manage', 'contacts', 'manage', 'WRITE', TENANT_SCOPES, ['app/actions/leads.ts'], 'Create or update company contacts.'),
  p('opportunities.read', 'opportunities', 'read', 'READ', TENANT_SCOPES, ['app/actions/leads.ts'], 'Read sales opportunities.'),
  p('opportunities.manage', 'opportunities', 'manage', 'WRITE', TENANT_SCOPES, ['app/actions/leads.ts'], 'Create or update sales opportunities.'),

  p('tasks.read', 'tasks', 'read', 'READ', TENANT_SCOPES, ['app/actions/tasks.ts'], 'Read operational tasks.'),
  p('tasks.create', 'tasks', 'create', 'WRITE', TENANT_SCOPES, ['app/actions/tasks.ts'], 'Create an operational task.'),
  p('tasks.update', 'tasks', 'update', 'WRITE', TENANT_SCOPES, ['app/actions/tasks.ts'], 'Update task details or status.'),
  p('tasks.assign', 'tasks', 'assign', 'APPROVE', TENANT_SCOPES, ['app/actions/tasks.ts'], 'Assign or reassign a task.'),

  p('tours.read', 'tours', 'read', 'READ', TENANT_SCOPES, ['app/actions/tours.ts'], 'Read property tours.'),
  p('tours.schedule', 'tours', 'schedule', 'WRITE', TENANT_SCOPES, ['app/actions/tours.ts'], 'Schedule a property tour.'),
  p('tours.update-status', 'tours', 'update-status', 'WRITE', TENANT_SCOPES, ['app/actions/tours.ts', 'lib/domain/transaction-spine/update-tour-status.ts'], 'Update a tour lifecycle status.'),

  p('offers.read', 'offers', 'read', 'READ', TENANT_SCOPES, ['app/api/v1/offers/route.ts'], 'Read commercial offers.'),
  p('offers.create', 'offers', 'create', 'WRITE', TENANT_SCOPES, ['app/api/v1/offers/route.ts'], 'Create a commercial offer.'),
  p('offers.approve', 'offers', 'approve', 'APPROVE', TENANT_SCOPES, ['lib/domain/transaction-spine/accept-offer.ts'], 'Accept or approve a commercial offer.'),

  p('contracts.read', 'contracts', 'read', 'READ', TENANT_SCOPES, ['app/actions/contract.ts'], 'Read contracts.'),
  p('contracts.create', 'contracts', 'create', 'WRITE', TENANT_SCOPES, ['app/actions/contract.ts'], 'Create a contract.'),
  p('contracts.issue', 'contracts', 'issue', 'APPROVE', TENANT_SCOPES, ['app/actions/contract.ts'], 'Issue or finalize a contract.'),

  p('installments.read', 'installments', 'read', 'READ', TENANT_SCOPES, ['lib/domain/transaction-spine/create-installments.ts'], 'Read installment schedules.'),
  p('installments.manage', 'installments', 'manage', 'WRITE', TENANT_SCOPES, ['lib/domain/transaction-spine/create-installments.ts'], 'Create or modify installment schedules.'),
  p('installments.collect', 'installments', 'collect', 'APPROVE', TENANT_SCOPES, ['app/api/v1/installments/[id]/pay/route.ts'], 'Collect or record an installment payment.'),

  p('invoices.read', 'invoices', 'read', 'READ', TENANT_SCOPES, ['app/api/v1/invoices/route.ts'], 'Read invoices.'),
  p('invoices.issue', 'invoices', 'issue', 'APPROVE', TENANT_SCOPES, ['app/api/v1/invoices/route.ts'], 'Issue an invoice.'),
  p('invoices.void', 'invoices', 'void', 'APPROVE', TENANT_SCOPES, ['app/api/v1/invoices/route.ts'], 'Void an invoice using an auditable path.'),
  p('payments.read', 'payments', 'read', 'READ', TENANT_SCOPES, ['app/actions/payment.ts', 'lib/payments/service.ts'], 'Read payment transactions and reconciliation state.'),
  p('payments.collect', 'payments', 'collect', 'APPROVE', TENANT_SCOPES, ['app/actions/payment.ts', 'lib/domain/transaction-spine/record-payment.ts'], 'Record or reconcile a payment.'),
  p('payments.refund', 'payments', 'refund', 'APPROVE', TENANT_SCOPES, ['lib/payments/custom-payment-reconciliation.ts'], 'Approve or record a payment refund.'),

  p('accounting.read', 'accounting', 'read', 'READ', TENANT_SCOPES, ['app/actions/accounting.ts', 'app/api/v1/accounting/general-ledger/route.ts'], 'Read ledgers and financial reports.'),
  p('accounting.post', 'accounting', 'post', 'APPROVE', TENANT_SCOPES, ['app/actions/accounting.ts'], 'Post accounting entries.'),
  p('accounting.reverse', 'accounting', 'reverse', 'APPROVE', TENANT_SCOPES, ['lib/accounting/audit-controls.ts'], 'Reverse an accounting entry with audit evidence.'),
  p('accounting.manage', 'accounting', 'manage', 'ADMIN', COMPANY_ONLY, ['app/actions/finance.ts'], 'Manage the chart of accounts and accounting configuration.'),

  p('rentals.read', 'rentals', 'read', 'READ', TENANT_SCOPES, ['app/actions/contract.ts'], 'Read rental leases and payments.'),
  p('rentals.manage', 'rentals', 'manage', 'WRITE', TENANT_SCOPES, ['app/actions/contract.ts'], 'Create or update rental leases.'),

  p('marketing.read', 'marketing', 'read', 'READ', TENANT_SCOPES, ['app/actions/marketing.ts', 'app/actions/marketing-campaigns.ts'], 'Read marketing campaigns and channel state.'),
  p('marketing.manage', 'marketing', 'manage', 'WRITE', TENANT_SCOPES, ['app/actions/marketing.ts', 'app/actions/marketing-campaigns.ts'], 'Create or update marketing campaigns.'),
  p('marketing.publish', 'marketing', 'publish', 'APPROVE', TENANT_SCOPES, ['app/actions/marketing-campaigns.ts'], 'Publish or activate a marketing campaign.'),

  p('whatsapp.read', 'whatsapp', 'read', 'READ', TENANT_SCOPES, ['app/actions/whatsapp.ts'], 'Read WhatsApp conversations and integration state.'),
  p('whatsapp.send', 'whatsapp', 'send', 'WRITE', TENANT_SCOPES, ['app/actions/whatsapp.ts'], 'Send a WhatsApp message.'),
  p('whatsapp.manage', 'whatsapp', 'manage', 'ADMIN', COMPANY_ONLY, ['lib/whatsapp/embedded-signup-service.ts'], 'Manage WhatsApp connection, numbers, templates, and consent controls.'),
  p('email.read', 'email', 'read', 'READ', TENANT_SCOPES, ['app/actions/email.ts'], 'Read company email conversations.'),
  p('email.send', 'email', 'send', 'WRITE', TENANT_SCOPES, ['app/actions/email.ts', 'lib/email.ts'], 'Send company email.'),
  p('email.manage', 'email', 'manage', 'ADMIN', COMPANY_ONLY, ['app/actions/email.ts'], 'Manage email provider configuration.'),

  p('helpdesk.read', 'helpdesk', 'read', 'READ', TENANT_SCOPES, ['app/actions/helpdesk.ts'], 'Read support tickets.'),
  p('helpdesk.manage', 'helpdesk', 'manage', 'WRITE', TENANT_SCOPES, ['app/actions/helpdesk.ts'], 'Create or update support tickets.'),
  p('documents.read', 'documents', 'read', 'READ', TENANT_SCOPES, ['lib/documents/access.ts'], 'Read permitted documents.'),
  p('documents.upload', 'documents', 'upload', 'WRITE', TENANT_SCOPES, ['lib/documents/file-policy.ts'], 'Upload a document under company file policy.'),
  p('documents.manage', 'documents', 'manage', 'ADMIN', TENANT_SCOPES, ['lib/documents/access.ts'], 'Classify, replace, archive, or delete a document.'),
  p('notifications.read', 'notifications', 'read', 'READ', COMPANY_OR_SELF, ['app/actions/notifications.ts', 'lib/notifications.ts'], 'Read notifications for the acting user or company.'),
  p('notifications.manage', 'notifications', 'manage', 'WRITE', COMPANY_OR_SELF, ['app/actions/notifications.ts'], 'Mark, dismiss, or configure notifications.'),

  p('agents.read', 'agents', 'read', 'READ', TENANT_SCOPES, ['app/api/v1/agents/route.ts', 'lib/agents/access.ts'], 'Read internal agent status and output.'),
  p('agents.execute', 'agents', 'execute', 'APPROVE', TENANT_SCOPES, ['app/actions/aiActions.ts', 'lib/agents/access.ts'], 'Execute an internal AI agent operation.'),
  p('agents.manage', 'agents', 'manage', 'ADMIN', COMPANY_ONLY, ['app/actions/agentSlots.ts', 'app/actions/ai-providers.ts'], 'Manage agent slots, providers, quotas, and activation.'),

  p('settings.read', 'settings', 'read', 'READ', COMPANY_ONLY, ['app/api/v1/settings/route.ts'], 'Read company settings.'),
  p('settings.manage', 'settings', 'manage', 'ADMIN', COMPANY_ONLY, ['app/api/v1/settings/route.ts'], 'Update company settings.'),
  p('integrations.read', 'integrations', 'read', 'READ', COMPANY_ONLY, ['lib/marketing/tiktok-connection.ts'], 'Read integration configuration and health.'),
  p('integrations.manage', 'integrations', 'manage', 'ADMIN', COMPANY_ONLY, ['lib/marketing/tiktok-connection.ts'], 'Connect, rotate, or disconnect external integrations.'),
  p('compliance.read', 'compliance', 'read', 'READ', COMPANY_ONLY, ['app/actions/compliance.ts'], 'Read compliance and trust-gate state.'),
  p('compliance.manage', 'compliance', 'manage', 'ADMIN', COMPANY_ONLY, ['app/actions/compliance.ts', 'lib/saudi-trust-gate/index.ts'], 'Manage compliance configuration and evidence.'),
  p('zatca.submit', 'zatca', 'submit', 'APPROVE', COMPANY_OR_RESOURCE, ['app/api/v1/zatca/submit/[id]/route.ts'], 'Submit a fiscal document to ZATCA.'),
  p('zatca.read', 'zatca', 'read', 'READ', COMPANY_ONLY, ['app/api/v1/zatca/dashboard/route.ts'], 'Read ZATCA processing state.'),

  p('automations.read', 'automations', 'read', 'READ', TENANT_SCOPES, ['lib/realtime/read-sync-events.ts'], 'Read automation workflows and execution state.'),
  p('automations.manage', 'automations', 'manage', 'ADMIN', TENANT_SCOPES, ['lib/realtime/purge-sync-events.ts'], 'Create, update, pause, or purge automation state.'),
  p('sentinel.read', 'sentinel', 'read', 'READ', COMPANY_ONLY, ['lib/sentinel/incident.ts'], 'Read Sentinel incidents and heartbeat state.'),
  p('sentinel.decide', 'sentinel', 'decide', 'APPROVE', COMPANY_ONLY, ['lib/sentinel/task-order.ts'], 'Approve or reject Sentinel task orders.'),
  p('sentinel.execute', 'sentinel', 'execute', 'SYSTEM', COMPANY_ONLY, ['app/api/cron/sentinel/route.ts', 'lib/sentinel/heartbeat.ts'], 'Run trusted Sentinel background work.'),
  p('audit.read', 'audit', 'read', 'ADMIN', COMPANY_ONLY, ['lib/audit.ts', 'lib/sentinel/audit.ts'], 'Read security and operational audit evidence.'),
  p('reports.read', 'reports', 'read', 'READ', TENANT_SCOPES, ['lib/accounting/financial-reports.ts'], 'Read generated operational and financial reports.'),
  p('realtime.read', 'realtime', 'read', 'READ', TENANT_SCOPES, ['lib/realtime/read-sync-events.ts'], 'Read real-time synchronization events.'),
  p('realtime.purge', 'realtime', 'purge', 'SYSTEM', COMPANY_ONLY, ['lib/realtime/purge-sync-events.ts'], 'Purge expired real-time synchronization events.'),
  p('webhooks.receive', 'webhooks', 'receive', 'SYSTEM', COMPANY_ONLY, ['app/api/v1/leads/route.ts'], 'Receive an authenticated external webhook.'),
  p('health.read', 'health', 'read', 'SYSTEM', COMPANY_ONLY, ['app/api/health/live/route.ts', 'app/api/v1/health/route.ts'], 'Read service liveness and readiness state.'),
] as const satisfies readonly PermissionDefinition[]

export type PermissionKey = (typeof PERMISSION_REGISTRY)[number]['key']

export const PERMISSION_KEYS = Object.freeze(
  PERMISSION_REGISTRY.map(({ key }) => key),
) as readonly PermissionKey[]

export const PERMISSION_BY_KEY = Object.freeze(
  Object.fromEntries(PERMISSION_REGISTRY.map((permission) => [permission.key, permission])),
) as Readonly<Record<PermissionKey, PermissionDefinition>>

export function isPermissionKey(value: string): value is PermissionKey {
  return Object.prototype.hasOwnProperty.call(PERMISSION_BY_KEY, value)
}
