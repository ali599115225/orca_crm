export const EXEC_003_DATABASE_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
  "READ_ONLY",
] as const;

export type Exec003DatabaseRole = (typeof EXEC_003_DATABASE_ROLES)[number];

export const EXEC_003_PERMISSION_KEYS = [
  "properties.finance_request.create",
  "revenue.webhook.ingest",
  "contracts.cancel.execute",
  "contracts.invoices.read",
  "contracts.invoices.issue",
  "contracts.payment_plan.read",
  "contracts.payment_plan.update",
  "contracts.payment_plan.create",
  "contracts.payment_plan.restructure",
  "contracts.sign.execute",
  "invoices.paylink.create",
  "leads.webhook.ingest",
  "leases.invoices.create",
  "settings.leads_webhook.read",
  "settings.leads_webhook.rotate",
  "accounting.journal_entries.read",
  "accounting.journal_entries.reverse",
  "accounting.seed.execute",
  "automation.workflows.read",
  "automation.workflows.create",
  "maintenance.tickets.read",
  "maintenance.tickets.create",
  "maintenance.tickets.update",
  "ai.lead_insight.generate",
  "system.logs.clear",
  "system.logs.mock_error",
  "accounting.payables.read",
  "contracts.pdf.read",
  "invoices.paylink_status.read",
  "invoices.pdf.read",
  "invoices.qr.read",
  "rentals.contracts.read",
] as const;

export type Exec003PermissionKey = (typeof EXEC_003_PERMISSION_KEYS)[number];

export type Exec003LegacyGuardKind =
  | "AUTHENTICATED_SESSION"
  | "DATABASE_RBAC"
  | "SIGNED_BOUNDARY"
  | "DELEGATED_DATABASE_RBAC"
  | "SESSION_CLAIM_EXACT";

export type Exec003OperationAssignment = {
  method: string;
  permissionKey: Exec003PermissionKey;
  legacyGuardKind: Exec003LegacyGuardKind;
  legacyAllowedRoles: readonly string[];
  progressiveAllowedRoles: readonly Exec003DatabaseRole[];
  sharedGuardEligible: boolean;
  evidence: string;
};

export type Exec003ContractAssignment = {
  contractId: string;
  priority:
    | "P0_SECURITY_CRITICAL_SURFACE"
    | "P1_MUTATION_SURFACE"
    | "P1_SENSITIVE_READ_SURFACE";
  kind: "API" | "SERVER_ACTION";
  routeOrContract: string;
  source: string;
  operations: readonly Exec003OperationAssignment[];
};

const ALL_TENANT_ROLES = EXEC_003_DATABASE_ROLES;
const CONTRACT_WRITE_ROLES = ["ADMIN", "SALES_MANAGER"] as const;
const ACCOUNTING_WRITE_ROLES = ["ADMIN"] as const;

function databaseOperation(
  method: string,
  permissionKey: Exec003PermissionKey,
  legacyAllowedRoles: readonly Exec003DatabaseRole[],
  evidence: string,
  legacyGuardKind: Extract<
    Exec003LegacyGuardKind,
    "AUTHENTICATED_SESSION" | "DATABASE_RBAC"
  > = "DATABASE_RBAC",
): Exec003OperationAssignment {
  return {
    method,
    permissionKey,
    legacyGuardKind,
    legacyAllowedRoles,
    progressiveAllowedRoles: legacyAllowedRoles,
    sharedGuardEligible: true,
    evidence,
  };
}

function signedBoundaryOperation(
  method: string,
  permissionKey: Exec003PermissionKey,
  evidence: string,
): Exec003OperationAssignment {
  return {
    method,
    permissionKey,
    legacyGuardKind: "SIGNED_BOUNDARY",
    legacyAllowedRoles: [],
    progressiveAllowedRoles: [],
    sharedGuardEligible: false,
    evidence,
  };
}

function delegatedOperation(
  method: string,
  permissionKey: Exec003PermissionKey,
  legacyAllowedRoles: readonly Exec003DatabaseRole[],
  evidence: string,
): Exec003OperationAssignment {
  return {
    method,
    permissionKey,
    legacyGuardKind: "DELEGATED_DATABASE_RBAC",
    legacyAllowedRoles,
    progressiveAllowedRoles: [],
    sharedGuardEligible: false,
    evidence,
  };
}

function exactClaimOperation(
  method: string,
  permissionKey: Exec003PermissionKey,
  legacyAllowedRoles: readonly string[],
  evidence: string,
): Exec003OperationAssignment {
  return {
    method,
    permissionKey,
    legacyGuardKind: "SESSION_CLAIM_EXACT",
    legacyAllowedRoles,
    progressiveAllowedRoles: [],
    sharedGuardEligible: false,
    evidence,
  };
}

export const EXEC_003_PERMISSION_ASSIGNMENTS = [
  {
    contractId: "EXEC-003-C01",
    priority: "P0_SECURITY_CRITICAL_SURFACE",
    kind: "API",
    routeOrContract: "/api/properties/[id]/request-finance",
    source: "app/api/properties/[id]/request-finance/route.ts",
    operations: [
      databaseOperation(
        "POST",
        "properties.finance_request.create",
        ALL_TENANT_ROLES,
        "authenticateRequest permits any authenticated tenant role",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C02",
    priority: "P0_SECURITY_CRITICAL_SURFACE",
    kind: "API",
    routeOrContract: "/api/revenue-integrity/webhook/[provider]",
    source: "app/api/revenue-integrity/webhook/[provider]/route.ts",
    operations: [
      signedBoundaryOperation(
        "POST",
        "revenue.webhook.ingest",
        "provider connection, secret and signature verification; no user session",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C03",
    priority: "P0_SECURITY_CRITICAL_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/contracts/[id]/cancel",
    source: "app/api/v1/contracts/[id]/cancel/route.ts",
    operations: [
      databaseOperation(
        "POST",
        "contracts.cancel.execute",
        CONTRACT_WRITE_ROLES,
        "runWithDatabaseSession(CONTRACT_WRITE_ROLES)",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C04",
    priority: "P0_SECURITY_CRITICAL_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/contracts/[id]/invoices",
    source: "app/api/v1/contracts/[id]/invoices/route.ts",
    operations: [
      databaseOperation(
        "GET",
        "contracts.invoices.read",
        ALL_TENANT_ROLES,
        "getTenantAndUser requires an authenticated tenant session",
        "AUTHENTICATED_SESSION",
      ),
      databaseOperation(
        "POST",
        "contracts.invoices.issue",
        ALL_TENANT_ROLES,
        "getTenantAndUser requires an authenticated tenant session",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C05",
    priority: "P0_SECURITY_CRITICAL_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/contracts/[id]/payment-plan",
    source: "app/api/v1/contracts/[id]/payment-plan/route.ts",
    operations: [
      databaseOperation(
        "GET",
        "contracts.payment_plan.read",
        ALL_TENANT_ROLES,
        "runWithDatabaseSession(TENANT_ROLES)",
      ),
      databaseOperation(
        "PUT",
        "contracts.payment_plan.update",
        CONTRACT_WRITE_ROLES,
        "runWithDatabaseSession(CONTRACT_WRITE_ROLES)",
      ),
      databaseOperation(
        "POST",
        "contracts.payment_plan.create",
        CONTRACT_WRITE_ROLES,
        "runWithDatabaseSession(CONTRACT_WRITE_ROLES)",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C06",
    priority: "P0_SECURITY_CRITICAL_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/contracts/[id]/restructure",
    source: "app/api/v1/contracts/[id]/restructure/route.ts",
    operations: [
      databaseOperation(
        "POST",
        "contracts.payment_plan.restructure",
        CONTRACT_WRITE_ROLES,
        "explicit active user role check ADMIN or SALES_MANAGER",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C07",
    priority: "P0_SECURITY_CRITICAL_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/contracts/[id]/sign",
    source: "app/api/v1/contracts/[id]/sign/route.ts",
    operations: [
      databaseOperation(
        "POST",
        "contracts.sign.execute",
        CONTRACT_WRITE_ROLES,
        "runWithDatabaseSession(CONTRACT_WRITE_ROLES)",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C08",
    priority: "P0_SECURITY_CRITICAL_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/invoices/[id]/paylink/create",
    source: "app/api/v1/invoices/[id]/paylink/create/route.ts",
    operations: [
      databaseOperation(
        "POST",
        "invoices.paylink.create",
        CONTRACT_WRITE_ROLES,
        "hasDatabaseRole(session, ADMIN or SALES_MANAGER)",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C09",
    priority: "P0_SECURITY_CRITICAL_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/leads/webhook",
    source: "app/api/v1/leads/webhook/route.ts",
    operations: [
      signedBoundaryOperation(
        "POST",
        "leads.webhook.ingest",
        "tenant key id, timestamp, HMAC signature and replay controls; no user session",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C10",
    priority: "P0_SECURITY_CRITICAL_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/leases/[id]/invoices",
    source: "app/api/v1/leases/[id]/invoices/route.ts",
    operations: [
      databaseOperation(
        "POST",
        "leases.invoices.create",
        ALL_TENANT_ROLES,
        "local authenticated tenant session check",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C11",
    priority: "P0_SECURITY_CRITICAL_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/settings/leads-webhook",
    source: "app/api/v1/settings/leads-webhook/route.ts",
    operations: [
      databaseOperation(
        "GET",
        "settings.leads_webhook.read",
        ACCOUNTING_WRITE_ROLES,
        "hasDatabaseRole(session, ADMIN)",
      ),
      databaseOperation(
        "POST",
        "settings.leads_webhook.rotate",
        ACCOUNTING_WRITE_ROLES,
        "hasDatabaseRole(session, ADMIN)",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C12",
    priority: "P1_MUTATION_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/accounting/journal-entries/[id]",
    source: "app/api/v1/accounting/journal-entries/[id]/route.ts",
    operations: [
      databaseOperation(
        "GET",
        "accounting.journal_entries.read",
        ALL_TENANT_ROLES,
        "runWithDatabaseSession(TENANT_ROLES)",
      ),
      databaseOperation(
        "POST",
        "accounting.journal_entries.reverse",
        ACCOUNTING_WRITE_ROLES,
        "runWithDatabaseSession(ACCOUNTING_WRITE_ROLES)",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C13",
    priority: "P1_MUTATION_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/accounting/seed",
    source: "app/api/v1/accounting/seed/route.ts",
    operations: [
      databaseOperation(
        "POST",
        "accounting.seed.execute",
        ACCOUNTING_WRITE_ROLES,
        "hasDatabaseRole(session, ADMIN)",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C14",
    priority: "P1_MUTATION_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/automation/workflows",
    source: "app/api/v1/automation/workflows/route.ts",
    operations: [
      databaseOperation(
        "GET",
        "automation.workflows.read",
        ALL_TENANT_ROLES,
        "getTenantAndUser requires an authenticated tenant session",
        "AUTHENTICATED_SESSION",
      ),
      databaseOperation(
        "POST",
        "automation.workflows.create",
        ALL_TENANT_ROLES,
        "getTenantAndUser requires an authenticated tenant session",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C15",
    priority: "P1_MUTATION_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/maintenance",
    source: "app/api/v1/maintenance/route.ts",
    operations: [
      databaseOperation(
        "GET",
        "maintenance.tickets.read",
        ALL_TENANT_ROLES,
        "getTenantAndUser requires an authenticated tenant session",
        "AUTHENTICATED_SESSION",
      ),
      databaseOperation(
        "POST",
        "maintenance.tickets.create",
        ALL_TENANT_ROLES,
        "getTenantAndUser requires an authenticated tenant session",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C16",
    priority: "P1_MUTATION_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/maintenance/[id]",
    source: "app/api/v1/maintenance/[id]/route.ts",
    operations: [
      databaseOperation(
        "PATCH",
        "maintenance.tickets.update",
        ALL_TENANT_ROLES,
        "getTenantAndUser requires an authenticated tenant session",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C17",
    priority: "P1_MUTATION_SURFACE",
    kind: "SERVER_ACTION",
    routeOrContract: "SERVER_ACTION:app/actions/aiClient.ts:generateAIInsight",
    source: "app/actions/aiClient.ts",
    operations: [
      delegatedOperation(
        "INVOKE",
        "ai.lead_insight.generate",
        ALL_TENANT_ROLES,
        "client wrapper delegates to analyzeLeadAI -> requireAgentAccess(AGENT_READ_ROLES)",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C18",
    priority: "P1_MUTATION_SURFACE",
    kind: "SERVER_ACTION",
    routeOrContract: "SERVER_ACTION:app/actions/logs.ts:clearSystemLogsAction",
    source: "app/actions/logs.ts",
    operations: [
      exactClaimOperation(
        "INVOKE",
        "system.logs.clear",
        ["Admin"],
        "legacy exact session claim comparison session.role === Admin",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C19",
    priority: "P1_MUTATION_SURFACE",
    kind: "SERVER_ACTION",
    routeOrContract: "SERVER_ACTION:app/actions/logs.ts:triggerMockErrorAction",
    source: "app/actions/logs.ts",
    operations: [
      exactClaimOperation(
        "INVOKE",
        "system.logs.mock_error",
        ["Admin"],
        "legacy exact session claim comparison session.role === Admin",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C20",
    priority: "P1_SENSITIVE_READ_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/accounting/payables",
    source: "app/api/v1/accounting/payables/route.ts",
    operations: [
      databaseOperation(
        "GET",
        "accounting.payables.read",
        ALL_TENANT_ROLES,
        "local authenticated tenant session check",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C21",
    priority: "P1_SENSITIVE_READ_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/contracts/[id]/pdf",
    source: "app/api/v1/contracts/[id]/pdf/route.ts",
    operations: [
      databaseOperation(
        "GET",
        "contracts.pdf.read",
        ALL_TENANT_ROLES,
        "local authenticated tenant session check",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C22",
    priority: "P1_SENSITIVE_READ_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/invoices/[id]/paylink/status",
    source: "app/api/v1/invoices/[id]/paylink/status/route.ts",
    operations: [
      databaseOperation(
        "GET",
        "invoices.paylink_status.read",
        ALL_TENANT_ROLES,
        "local authenticated tenant session check",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C23",
    priority: "P1_SENSITIVE_READ_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/invoices/[id]/pdf",
    source: "app/api/v1/invoices/[id]/pdf/route.ts",
    operations: [
      databaseOperation(
        "GET",
        "invoices.pdf.read",
        ALL_TENANT_ROLES,
        "local authenticated tenant session check",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C24",
    priority: "P1_SENSITIVE_READ_SURFACE",
    kind: "API",
    routeOrContract: "/api/v1/invoices/[id]/qr",
    source: "app/api/v1/invoices/[id]/qr/route.ts",
    operations: [
      databaseOperation(
        "GET",
        "invoices.qr.read",
        ALL_TENANT_ROLES,
        "local authenticated tenant session check",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
  {
    contractId: "EXEC-003-C25",
    priority: "P1_SENSITIVE_READ_SURFACE",
    kind: "SERVER_ACTION",
    routeOrContract: "SERVER_ACTION:app/actions/rentals.ts:getRentalContractsAction",
    source: "app/actions/rentals.ts",
    operations: [
      databaseOperation(
        "INVOKE",
        "rentals.contracts.read",
        ALL_TENANT_ROLES,
        "getSession plus getActiveTenant; authenticated tenant role not narrowed",
        "AUTHENTICATED_SESSION",
      ),
    ],
  },
] as const satisfies readonly Exec003ContractAssignment[];

export const EXEC_003_OPERATION_ASSIGNMENTS =
  EXEC_003_PERMISSION_ASSIGNMENTS.flatMap((contract) =>
    contract.operations.map((operation) => ({
      contractId: contract.contractId,
      routeOrContract: contract.routeOrContract,
      source: contract.source,
      priority: contract.priority,
      kind: contract.kind,
      ...operation,
    })),
  );

const OPERATION_BY_PERMISSION = new Map(
  EXEC_003_OPERATION_ASSIGNMENTS.map((operation) => [
    operation.permissionKey,
    operation,
  ]),
);

export function exec003AssignmentForPermission(
  permissionKey: string,
): (typeof EXEC_003_OPERATION_ASSIGNMENTS)[number] | null {
  return OPERATION_BY_PERMISSION.get(permissionKey as Exec003PermissionKey) ?? null;
}

export function exec003ProgressiveRolesForPermission(
  permissionKey: string,
): readonly Exec003DatabaseRole[] | null {
  const assignment = exec003AssignmentForPermission(permissionKey);
  if (!assignment || !assignment.sharedGuardEligible) return null;
  return assignment.progressiveAllowedRoles;
}
