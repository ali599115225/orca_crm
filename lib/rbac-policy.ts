export type RbacRole =
  | 'PLATFORM_OWNER'
  | 'ADMIN'
  | 'SALES_MANAGER'
  | 'SALES_EMPLOYEE'
  | 'MARKETING'
  | 'READ_ONLY';

export type TenantContextRule =
  | 'CONFIGURED_PLATFORM_OWNER'
  | 'TENANT_MEMBERSHIP_REQUIRED';

export type RbacPolicyRow = {
  role: RbacRole;
  codeRole: string;
  action: string;
  resource: string;
  tenantContext: TenantContextRule;
  allowed: boolean;
  evidence: string[];
};

export const RBAC_POLICY_AMBIGUOUS = false;

export const RBAC_POLICY_MATRIX: RbacPolicyRow[] = [
  {
    role: 'PLATFORM_OWNER',
    codeRole: 'SUPER_ADMIN_EMAILS',
    action: 'super-admin development access',
    resource: 'debug/test routes',
    tenantContext: 'CONFIGURED_PLATFORM_OWNER',
    allowed: true,
    evidence: ['lib/api-auth-guard.ts:isSuperAdmin', 'lib/api-auth-guard.ts:requireSuperAdminInDev'],
  },
  {
    role: 'ADMIN',
    codeRole: 'ADMIN',
    action: 'manage',
    resource: 'tenant resources',
    tenantContext: 'TENANT_MEMBERSHIP_REQUIRED',
    allowed: true,
    evidence: ['prisma/schema.prisma:Role.ADMIN', 'lib/api-auth-guard.ts:hasDatabaseRole'],
  },
  {
    role: 'MARKETING',
    codeRole: 'MARKETING',
    action: 'read/write marketing workflow',
    resource: 'campaigns, advertising integrations, and leads where allowed',
    tenantContext: 'TENANT_MEMBERSHIP_REQUIRED',
    allowed: true,
    evidence: ['prisma/schema.prisma:Role.MARKETING', 'app/actions/marketing-campaigns.ts'],
  },
  {
    role: 'SALES_MANAGER',
    codeRole: 'SALES_MANAGER',
    action: 'read/write sales workflow',
    resource: 'leads, opportunities, tours, contracts where allowed',
    tenantContext: 'TENANT_MEMBERSHIP_REQUIRED',
    allowed: true,
    evidence: ['app/context/AuthContext.tsx:PERMISSIONS', 'app/actions/leads.ts'],
  },
  {
    role: 'SALES_EMPLOYEE',
    codeRole: 'SALES_EMPLOYEE',
    action: 'read/write limited sales workflow',
    resource: 'leads, opportunities, tours where allowed',
    tenantContext: 'TENANT_MEMBERSHIP_REQUIRED',
    allowed: true,
    evidence: ['app/context/AuthContext.tsx:PERMISSIONS', 'app/api/v1/opportunities/route.ts'],
  },
  {
    role: 'READ_ONLY',
    codeRole: 'READ_ONLY',
    action: 'read',
    resource: 'revenue dashboard subset',
    tenantContext: 'TENANT_MEMBERSHIP_REQUIRED',
    allowed: true,
    evidence: ['lib/revenue-integrity/authorization.ts:ROLE_PERMISSIONS.READ_ONLY'],
  },
  {
    role: 'READ_ONLY',
    codeRole: 'READ_ONLY',
    action: 'write',
    resource: 'tenant resources',
    tenantContext: 'TENANT_MEMBERSHIP_REQUIRED',
    allowed: false,
    evidence: ['app/context/AuthContext.tsx:PERMISSIONS.READ_ONLY'],
  },
];

