import {
  EXEC_003_PERMISSION_ASSIGNMENTS,
  type Exec003LegacyGuardKind,
  type Exec003PermissionKey,
} from "@/lib/auth/exec-003-permission-assignments";

export const EXEC_003_EVIDENCE_IDENTITY = Object.freeze({
  commitSha: "PENDING FINAL VALIDATION",
  ciRun: "PENDING FINAL VALIDATION",
  checkoutMode: "PENDING FINAL VALIDATION",
  syntheticMergeSha: "PENDING FINAL VALIDATION",
  baseSha: "PENDING FINAL VALIDATION",
});

type ImportMode = "STATIC" | "DYNAMIC_ACTUAL";

type EvidenceBinding = {
  operationId: string;
  testFile: string;
  entryPointModule: string;
  entryPointExport: string;
  entryPointLocalName: string;
  importMode: ImportMode;
  allowTestName: string;
  denyTestName: string;
  downstreamSymbol: string | null;
  requiredAllowCase: string;
  requiredDenyCase: string;
};

const PILOT = "tests/foundation/g5-exec-003-contract-behavior-pilot.test.ts";
const P0 = "tests/foundation/g5-exec-003-contract-behavior-p0.test.ts";
const P1_MUTATION =
  "tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts";
const P1_READ =
  "tests/foundation/g5-exec-003-contract-behavior-p1-sensitive-read.test.ts";
const SIGNED = "tests/foundation/g5-exec-003-signed-boundary-behavior.test.ts";
const DELEGATED =
  "tests/foundation/g5-exec-003-delegated-boundary-behavior.test.ts";
const EXACT =
  "tests/foundation/g5-exec-003-exact-claim-boundary-behavior.test.ts";

// Deliberately assembled to prevent a source-path literal from granting every
// export in the shared logs action file a structural G4 test reference.
const LOG_ACTIONS_MODULE = ["@/app/actions", "logs"].join("/");

const BINDINGS = [
  {
    operationId: "EXEC-003-C01-O01",
    testFile: P0,
    entryPointModule: "@/app/api/properties/[id]/request-finance/route",
    entryPointExport: "POST",
    entryPointLocalName: "requestFinance",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C01-O01 reaches the audit boundary after authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C01-O01 denies before audit when the database role is rejected",
    downstreamSymbol: "serviceMocks.writeAuditLog",
    requiredAllowCase: "active user and tenant reach audit write",
    requiredDenyCase: "missing database user blocks audit write",
  },
  {
    operationId: "EXEC-003-C02-O01",
    testFile: SIGNED,
    entryPointModule: "@/app/api/revenue-integrity/webhook/[provider]/route",
    entryPointExport: "POST",
    entryPointLocalName: "revenueWebhook",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C02-O01 accepts a valid provider HMAC without a user-session boundary",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C02-O01 rejects an invalid provider HMAC through the real signed boundary",
    downstreamSymbol: null,
    requiredAllowCase: "valid provider HMAC is accepted",
    requiredDenyCase: "invalid provider HMAC is rejected",
  },
  {
    operationId: "EXEC-003-C03-O01",
    testFile: PILOT,
    entryPointModule: "@/app/api/v1/contracts/[id]/cancel/route",
    entryPointExport: "POST",
    entryPointLocalName: "cancelContract",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL C03 reaches the real mutation boundary after authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL C03 returns 403 when the current database role is denied",
    downstreamSymbol: "domainMocks.cancelDraftContract",
    requiredAllowCase: "allowed current role reaches cancellation",
    requiredDenyCase: "disallowed current role blocks cancellation",
  },
  {
    operationId: "EXEC-003-C04-O01",
    testFile: PILOT,
    entryPointModule: "@/app/api/v1/contracts/[id]/invoices/route",
    entryPointExport: "GET",
    entryPointLocalName: "listContractInvoices",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL C04 reaches the tenant-scoped read after Cookie authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL C04 returns 403 before data access when the database denies",
    downstreamSymbol: "prismaMocks.invoiceFindMany",
    requiredAllowCase: "Cookie identity and database decision reach read",
    requiredDenyCase: "missing database user blocks read",
  },
  {
    operationId: "EXEC-003-C04-O02",
    testFile: P0,
    entryPointModule: "@/app/api/v1/contracts/[id]/invoices/route",
    entryPointExport: "POST",
    entryPointLocalName: "issueContractInvoice",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C04-O02 reaches invoice issuance after Cookie authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C04-O02 keeps invoice issuance Cookie-only",
    downstreamSymbol: "domainMocks.signContract",
    requiredAllowCase: "Cookie identity reaches invoice issuance",
    requiredDenyCase: "Bearer-only identity blocks invoice issuance",
  },
  {
    operationId: "EXEC-003-C05-O01",
    testFile: P0,
    entryPointModule: "@/app/api/v1/contracts/[id]/payment-plan/route",
    entryPointExport: "GET",
    entryPointLocalName: "readPaymentPlan",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C05-O01 reaches the tenant-scoped payment-plan read",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C05-O01 denies payment-plan read before Prisma",
    downstreamSymbol: "prismaMocks.paymentPlanFindFirst",
    requiredAllowCase: "active user and tenant reach payment-plan read",
    requiredDenyCase: "missing database user blocks payment-plan read",
  },
  {
    operationId: "EXEC-003-C05-O02",
    testFile: P0,
    entryPointModule: "@/app/api/v1/contracts/[id]/payment-plan/route",
    entryPointExport: "PUT",
    entryPointLocalName: "updatePaymentPlan",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C05-O02 reaches payment-plan update after authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C05-O02 denies update before the domain mutation",
    downstreamSymbol: "domainMocks.configurePaymentPlan",
    requiredAllowCase: "allowed role reaches payment-plan update",
    requiredDenyCase: "disallowed role blocks payment-plan update",
  },
  {
    operationId: "EXEC-003-C05-O03",
    testFile: P0,
    entryPointModule: "@/app/api/v1/contracts/[id]/payment-plan/route",
    entryPointExport: "POST",
    entryPointLocalName: "createPaymentPlan",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C05-O03 reaches payment-plan creation after authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C05-O03 denies creation before the domain mutation",
    downstreamSymbol: "domainMocks.ensureDefaultPaymentPlan",
    requiredAllowCase: "allowed role reaches payment-plan creation",
    requiredDenyCase: "disallowed role blocks payment-plan creation",
  },
  {
    operationId: "EXEC-003-C06-O01",
    testFile: P0,
    entryPointModule: "@/app/api/v1/contracts/[id]/restructure/route",
    entryPointExport: "POST",
    entryPointLocalName: "restructurePaymentPlanRoute",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C06-O01 reaches restructuring after Cookie authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C06-O01 rejects Bearer-only access on restructure",
    downstreamSymbol: "domainMocks.restructurePaymentPlan",
    requiredAllowCase: "Cookie identity reaches restructuring",
    requiredDenyCase: "Bearer-only identity blocks restructuring",
  },
  {
    operationId: "EXEC-003-C07-O01",
    testFile: P0,
    entryPointModule: "@/app/api/v1/contracts/[id]/sign/route",
    entryPointExport: "POST",
    entryPointLocalName: "signContractRoute",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C07-O01 reaches signing after authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C07-O01 denies signing before the domain operation",
    downstreamSymbol: "domainMocks.signContract",
    requiredAllowCase: "allowed role reaches signing",
    requiredDenyCase: "disallowed role blocks signing",
  },
  {
    operationId: "EXEC-003-C08-O01",
    testFile: P0,
    entryPointModule: "@/app/api/v1/invoices/[id]/paylink/create/route",
    entryPointExport: "POST",
    entryPointLocalName: "createPaylink",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C08-O01 reaches the tenant-scoped invoice lookup after authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C08-O01 returns 403 when Legacy database roles deny",
    downstreamSymbol: "prismaMocks.invoiceFindFirst",
    requiredAllowCase: "allowed role reaches Paylink lookup",
    requiredDenyCase: "disallowed role blocks Paylink lookup",
  },
  {
    operationId: "EXEC-003-C09-O01",
    testFile: SIGNED,
    entryPointModule: "@/app/api/v1/leads/webhook/route",
    entryPointExport: "POST",
    entryPointLocalName: "leadsWebhook",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C09-O01 accepts the real timestamped HMAC and reaches tenant-scoped lead creation",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C09-O01 rejects an invalid leads HMAC before lead creation",
    downstreamSymbol: "leadMocks.leadCreate",
    requiredAllowCase: "valid HMAC reaches lead creation",
    requiredDenyCase: "invalid HMAC blocks lead creation",
  },
  {
    operationId: "EXEC-003-C10-O01",
    testFile: P0,
    entryPointModule: "@/app/api/v1/leases/[id]/invoices/route",
    entryPointExport: "POST",
    entryPointLocalName: "createLeaseInvoice",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C10-O01 reaches the tenant-scoped lease lookup",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C10-O01 keeps lease invoice creation Cookie-only",
    downstreamSymbol: "prismaMocks.rentalLeaseFindFirst",
    requiredAllowCase: "Cookie identity reaches lease lookup",
    requiredDenyCase: "Bearer-only identity blocks lease lookup",
  },
  {
    operationId: "EXEC-003-C11-O01",
    testFile: P0,
    entryPointModule: "@/app/api/v1/settings/leads-webhook/route",
    entryPointExport: "GET",
    entryPointLocalName: "readLeadsWebhookSettings",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C11-O01 reaches the tenant-scoped settings read",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C11-O01 enforces ADMIN before reading webhook settings",
    downstreamSymbol: "prismaMocks.tenantFindFirst",
    requiredAllowCase: "ADMIN reaches settings read",
    requiredDenyCase: "non-ADMIN blocks settings read",
  },
  {
    operationId: "EXEC-003-C11-O02",
    testFile: P0,
    entryPointModule: "@/app/api/v1/settings/leads-webhook/route",
    entryPointExport: "POST",
    entryPointLocalName: "rotateLeadsWebhookSecret",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C11-O02 reaches credential rotation only after ADMIN authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C11-O02 denies credential rotation before the transaction",
    downstreamSymbol: "prismaMocks.transaction",
    requiredAllowCase: "ADMIN reaches rotation transaction",
    requiredDenyCase: "non-ADMIN blocks rotation transaction",
  },
  {
    operationId: "EXEC-003-C12-O01",
    testFile: P1_MUTATION,
    entryPointModule: "@/app/api/v1/accounting/journal-entries/[id]/route",
    entryPointExport: "GET",
    entryPointLocalName: "readJournalEntry",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C12-O01 reaches tenant-scoped journal-entry read",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C12-O01 denies journal-entry read before Prisma",
    downstreamSymbol: "prismaMocks.journalEntryFindFirst",
    requiredAllowCase: "active user and tenant reach journal read",
    requiredDenyCase: "missing database user blocks journal read",
  },
  {
    operationId: "EXEC-003-C12-O02",
    testFile: P1_MUTATION,
    entryPointModule: "@/app/api/v1/accounting/journal-entries/[id]/route",
    entryPointExport: "POST",
    entryPointLocalName: "reverseJournalEntryRoute",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C12-O02 reaches reversal after ADMIN authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C12-O02 denies reversal before the mutation",
    downstreamSymbol: "accountingMocks.reverseJournalEntry",
    requiredAllowCase: "ADMIN reaches reversal",
    requiredDenyCase: "non-ADMIN blocks reversal",
  },
  {
    operationId: "EXEC-003-C13-O01",
    testFile: P1_MUTATION,
    entryPointModule: "@/app/api/v1/accounting/seed/route",
    entryPointExport: "POST",
    entryPointLocalName: "seedAccounting",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C13-O01 reaches tenant-scoped accounting seed",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C13-O01 denies accounting seed before execution",
    downstreamSymbol: "accountingMocks.seedChartOfAccounts",
    requiredAllowCase: "ADMIN reaches accounting seed",
    requiredDenyCase: "non-ADMIN blocks accounting seed",
  },
  {
    operationId: "EXEC-003-C14-O01",
    testFile: P1_MUTATION,
    entryPointModule: "@/app/api/v1/automation/workflows/route",
    entryPointExport: "GET",
    entryPointLocalName: "readWorkflows",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C14-O01 reaches tenant-scoped workflow read",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C14-O01 rejects Bearer-only workflow reads",
    downstreamSymbol: "prismaMocks.workflowFindMany",
    requiredAllowCase: "Cookie identity reaches workflow read",
    requiredDenyCase: "Bearer-only identity blocks workflow read",
  },
  {
    operationId: "EXEC-003-C14-O02",
    testFile: P1_MUTATION,
    entryPointModule: "@/app/api/v1/automation/workflows/route",
    entryPointExport: "POST",
    entryPointLocalName: "createWorkflow",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C14-O02 reaches workflow creation after Cookie authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C14-O02 denies workflow creation before Prisma",
    downstreamSymbol: "prismaMocks.workflowCreate",
    requiredAllowCase: "Cookie identity reaches workflow creation",
    requiredDenyCase: "missing database user blocks workflow creation",
  },
  {
    operationId: "EXEC-003-C15-O01",
    testFile: P1_MUTATION,
    entryPointModule: "@/app/api/v1/maintenance/route",
    entryPointExport: "GET",
    entryPointLocalName: "readMaintenanceTickets",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C15-O01 reaches tenant-scoped maintenance read",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C15-O01 rejects Bearer-only maintenance reads",
    downstreamSymbol: "prismaMocks.ticketFindMany",
    requiredAllowCase: "Cookie identity reaches maintenance read",
    requiredDenyCase: "Bearer-only identity blocks maintenance read",
  },
  {
    operationId: "EXEC-003-C15-O02",
    testFile: P1_MUTATION,
    entryPointModule: "@/app/api/v1/maintenance/route",
    entryPointExport: "POST",
    entryPointLocalName: "createMaintenanceTicket",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C15-O02 reaches maintenance creation after Cookie authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C15-O02 denies maintenance creation before Prisma",
    downstreamSymbol: "prismaMocks.ticketCreate",
    requiredAllowCase: "Cookie identity reaches maintenance creation",
    requiredDenyCase: "missing database user blocks maintenance creation",
  },
  {
    operationId: "EXEC-003-C16-O01",
    testFile: P1_MUTATION,
    entryPointModule: "@/app/api/v1/maintenance/[id]/route",
    entryPointExport: "PATCH",
    entryPointLocalName: "updateMaintenanceTicket",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C16-O01 reaches tenant-scoped maintenance update",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C16-O01 denies maintenance update before Prisma",
    downstreamSymbol: "prismaMocks.ticketUpdate",
    requiredAllowCase: "Cookie identity reaches maintenance update",
    requiredDenyCase: "missing Cookie identity blocks maintenance update",
  },
  {
    operationId: "EXEC-003-C17-O01",
    testFile: DELEGATED,
    entryPointModule: "@/app/actions/aiClient",
    entryPointExport: "generateAIInsight",
    entryPointLocalName: "generateAIInsight",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C17-O01 delegates allow behavior to requireAgentAccess",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C17-O01 preserves delegated denial without a shared-guard bypass",
    downstreamSymbol: "providerMocks.generateAgentJson",
    requiredAllowCase: "allowed active tenant user reaches AI provider",
    requiredDenyCase: "disallowed role blocks AI provider",
  },
  {
    operationId: "EXEC-003-C18-O01",
    testFile: EXACT,
    entryPointModule: LOG_ACTIONS_MODULE,
    entryPointExport: "clearSystemLogsAction",
    entryPointLocalName: "clearSystemLogsAction",
    importMode: "DYNAMIC_ACTUAL",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C18-O01 keeps the exact legacy Admin claim",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C18-O01 keeps the exact legacy Admin claim",
    downstreamSymbol: null,
    requiredAllowCase: "exact Admin claim succeeds",
    requiredDenyCase: "ADMIN claim is denied",
  },
  {
    operationId: "EXEC-003-C19-O01",
    testFile: EXACT,
    entryPointModule: LOG_ACTIONS_MODULE,
    entryPointExport: "triggerMockErrorAction",
    entryPointLocalName: "triggerMockErrorAction",
    importMode: "DYNAMIC_ACTUAL",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C19-O01 keeps the exact legacy Admin claim",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C19-O01 keeps the exact legacy Admin claim",
    downstreamSymbol: "logMocks.loggerError",
    requiredAllowCase: "exact Admin claim reaches logger",
    requiredDenyCase: "ADMIN claim blocks logger",
  },
  {
    operationId: "EXEC-003-C20-O01",
    testFile: PILOT,
    entryPointModule: "@/app/api/v1/accounting/payables/route",
    entryPointExport: "GET",
    entryPointLocalName: "readPayables",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL C20 reaches the tenant-scoped sensitive read after authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL C20 returns 403 for an unknown or database-denied role",
    downstreamSymbol: "accountingMocks.getSupplierBalances",
    requiredAllowCase: "active user and tenant reach payables read",
    requiredDenyCase: "missing database user blocks payables read",
  },
  {
    operationId: "EXEC-003-C21-O01",
    testFile: PILOT,
    entryPointModule: "@/app/api/v1/contracts/[id]/pdf/route",
    entryPointExport: "GET",
    entryPointLocalName: "readContractPdf",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL C21 reaches the tenant-scoped PDF lookup after authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL C21 keeps the sensitive PDF read Cookie-only",
    downstreamSymbol: "prismaMocks.contractFindFirst",
    requiredAllowCase: "Cookie identity reaches PDF lookup",
    requiredDenyCase: "Bearer-only identity blocks PDF lookup",
  },
  {
    operationId: "EXEC-003-C22-O01",
    testFile: P1_READ,
    entryPointModule: "@/app/api/v1/invoices/[id]/paylink/status/route",
    entryPointExport: "GET",
    entryPointLocalName: "readPaylinkStatus",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C22-O01 reaches the tenant-scoped Paylink status lookup",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C22-O01 returns 403 when the database user is missing",
    downstreamSymbol: "prismaMocks.invoiceFindFirst",
    requiredAllowCase: "active user and tenant reach Paylink status lookup",
    requiredDenyCase: "missing database user blocks Paylink status lookup",
  },
  {
    operationId: "EXEC-003-C23-O01",
    testFile: P1_READ,
    entryPointModule: "@/app/api/v1/invoices/[id]/pdf/route",
    entryPointExport: "GET",
    entryPointLocalName: "readInvoicePdf",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C23-O01 reaches the tenant-scoped invoice PDF lookup",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C23-O01 rejects Bearer-only invoice PDF access",
    downstreamSymbol: "prismaMocks.invoiceFindFirst",
    requiredAllowCase: "Cookie identity reaches invoice PDF lookup",
    requiredDenyCase: "Bearer-only identity blocks invoice PDF lookup",
  },
  {
    operationId: "EXEC-003-C24-O01",
    testFile: P1_READ,
    entryPointModule: "@/app/api/v1/invoices/[id]/qr/route",
    entryPointExport: "GET",
    entryPointLocalName: "readInvoiceQr",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C24-O01 reaches the tenant-scoped invoice QR lookup",
    denyTestName:
      "DIRECT_BEHAVIORAL EXEC-003-C24-O01 rejects Bearer-only invoice QR access",
    downstreamSymbol: "prismaMocks.invoiceFindFirst",
    requiredAllowCase: "Cookie identity reaches invoice QR lookup",
    requiredDenyCase: "Bearer-only identity blocks invoice QR lookup",
  },
  {
    operationId: "EXEC-003-C25-O01",
    testFile: PILOT,
    entryPointModule: "@/app/actions/rentals",
    entryPointExport: "getRentalContractsAction",
    entryPointLocalName: "getRentalContractsAction",
    importMode: "STATIC",
    allowTestName:
      "DIRECT_BEHAVIORAL C25 reaches the tenant-scoped Server Action read after authorization",
    denyTestName:
      "DIRECT_BEHAVIORAL C25 has no Platform Owner bypass when the database denies",
    downstreamSymbol: "prismaMocks.contractFindMany",
    requiredAllowCase: "active tenant user reaches rental contracts",
    requiredDenyCase: "platform owner without tenant user is denied",
  },
] as const satisfies readonly EvidenceBinding[];

const BINDING_BY_OPERATION = new Map(
  BINDINGS.map((binding) => [binding.operationId, binding]),
);

export type Exec003BehaviorEvidence = {
  contractId: string;
  operationId: string;
  entryPoint: string;
  entryPointModule: string;
  entryPointExport: string;
  entryPointLocalName: string;
  importMode: ImportMode;
  testFile: string;
  allowTestName: string;
  denyTestName: string;
  evidenceClass: "DIRECT_BEHAVIORAL";
  boundaryType: Exec003LegacyGuardKind;
  permissionKey: Exec003PermissionKey;
  legacyRoles: readonly string[];
  requiredAllowCase: string;
  requiredDenyCase: string;
  securityDecisionDependency: string;
  downstreamSymbol: string | null;
  finalGuardModule: string | null;
  forbiddenMockedGuardSymbol: string | null;
};

export const EXEC_003_BEHAVIOR_EVIDENCE: readonly Exec003BehaviorEvidence[] =
  EXEC_003_PERMISSION_ASSIGNMENTS.flatMap((contract) =>
    contract.operations.map((operation, index) => {
      const operationId = `${contract.contractId}-O${String(index + 1).padStart(2, "0")}`;
      const binding = BINDING_BY_OPERATION.get(operationId);
      if (!binding) throw new Error(`Missing evidence binding for ${operationId}`);

      const usesDatabaseDecision = operation.sharedGuardEligible;
      const delegated = operation.legacyGuardKind === "DELEGATED_DATABASE_RBAC";

      return Object.freeze({
        contractId: contract.contractId,
        operationId,
        entryPoint: `${operation.method} ${contract.routeOrContract}`,
        entryPointModule: binding.entryPointModule,
        entryPointExport: binding.entryPointExport,
        entryPointLocalName: binding.entryPointLocalName,
        importMode: binding.importMode,
        testFile: binding.testFile,
        allowTestName: binding.allowTestName,
        denyTestName: binding.denyTestName,
        evidenceClass: "DIRECT_BEHAVIORAL" as const,
        boundaryType: operation.legacyGuardKind,
        permissionKey: operation.permissionKey,
        legacyRoles: operation.legacyAllowedRoles,
        requiredAllowCase: binding.requiredAllowCase,
        requiredDenyCase: binding.requiredDenyCase,
        securityDecisionDependency: delegated
          ? "requireAgentAccess"
          : usesDatabaseDecision
            ? "hasDatabaseRole"
            : operation.legacyGuardKind,
        downstreamSymbol: binding.downstreamSymbol,
        finalGuardModule: delegated
          ? "@/lib/agents/access"
          : usesDatabaseDecision
            ? "@/lib/api-auth-guard"
            : null,
        forbiddenMockedGuardSymbol: delegated
          ? "requireAgentAccess"
          : usesDatabaseDecision
            ? "hasDatabaseRole"
            : null,
      });
    }),
  );
