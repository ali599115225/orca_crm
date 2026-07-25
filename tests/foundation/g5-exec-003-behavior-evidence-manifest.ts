import {
  EXEC_003_PERMISSION_ASSIGNMENTS,
  type Exec003LegacyGuardKind,
  type Exec003PermissionKey,
} from "@/lib/auth/exec-003-permission-assignments";

type ImportMode = "STATIC" | "DYNAMIC_ACTUAL";

type OutcomeAssertionContract =
  | {
      kind: "DOWNSTREAM_CALL";
      symbol: string;
    }
  | {
      kind: "RESPONSE_STATUS";
      allowStatus: number;
      denyStatus: number;
    }
  | {
      kind: "RESULT_OBJECT";
      allowRequiredText: readonly string[];
      denyRequiredText: readonly string[];
    };

type EvidenceBinding = {
  testFile: string;
  entryPointModule: string;
  entryPointExport: string;
  entryPointLocalName: string;
  importMode: ImportMode;
  allowTestName: string;
  denyTestName: string;
  requiredAllowCase: string;
  requiredDenyCase: string;
  assertionContract: OutcomeAssertionContract;
};

const PILOT = "tests/foundation/g5-exec-003-contract-behavior-pilot.test.ts";
const P0 = "tests/foundation/g5-exec-003-contract-behavior-p0.test.ts";
const P1M = "tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts";
const P1R = "tests/foundation/g5-exec-003-contract-behavior-p1-sensitive-read.test.ts";
const SIGNED = "tests/foundation/g5-exec-003-signed-boundary-behavior.test.ts";
const DELEGATED = "tests/foundation/g5-exec-003-delegated-boundary-behavior.test.ts";
const EXACT = "tests/foundation/g5-exec-003-exact-claim-boundary-behavior.test.ts";
const COOKIE_MUTATION =
  "tests/foundation/g5-exec-003-cookie-mutation-boundary.test.ts";
const ENTRYPOINT_MATRIX =
  "tests/foundation/g5-exec-003-entrypoint-security-matrix.test.ts";
const LOG_ACTIONS_MODULE = ["@/app/actions", "logs"].join("/");

function downstream(symbol: string): OutcomeAssertionContract {
  return { kind: "DOWNSTREAM_CALL", symbol };
}

function binding(
  testFile: string,
  entryPointModule: string,
  entryPointExport: string,
  entryPointLocalName: string,
  importMode: ImportMode,
  allowTestName: string,
  denyTestName: string,
  assertionContract: OutcomeAssertionContract,
  requiredAllowCase: string,
  requiredDenyCase: string,
): EvidenceBinding {
  return {
    testFile,
    entryPointModule,
    entryPointExport,
    entryPointLocalName,
    importMode,
    allowTestName,
    denyTestName,
    assertionContract,
    requiredAllowCase,
    requiredDenyCase,
  };
}

const BINDING_BY_OPERATION: Readonly<Record<string, EvidenceBinding>> = {
  "EXEC-003-C01-O01": binding(P0, "@/app/api/properties/[id]/request-finance/route", "POST", "requestFinance", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C01-O01 reaches the audit boundary after authorization", "DIRECT_BEHAVIORAL EXEC-003-C01-O01 denies before audit when the database role is rejected", downstream("serviceMocks.writeAuditLog"), "active user and tenant reach audit write", "missing database user blocks audit write"),
  "EXEC-003-C02-O01": binding(SIGNED, "@/app/api/revenue-integrity/webhook/[provider]/route", "POST", "revenueWebhook", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C02-O01 accepts a valid provider HMAC without a user-session boundary", "DIRECT_BEHAVIORAL EXEC-003-C02-O01 rejects an invalid provider HMAC through the real signed boundary", { kind: "RESPONSE_STATUS", allowStatus: 202, denyStatus: 400 }, "valid provider HMAC is accepted", "invalid provider HMAC is rejected"),
  "EXEC-003-C03-O01": binding(PILOT, "@/app/api/v1/contracts/[id]/cancel/route", "POST", "cancelContract", "STATIC", "DIRECT_BEHAVIORAL C03 reaches the real mutation boundary after authorization", "DIRECT_BEHAVIORAL C03 returns 403 when the current database role is denied", downstream("domainMocks.cancelDraftContract"), "allowed current role reaches cancellation", "disallowed current role blocks cancellation"),
  "EXEC-003-C04-O01": binding(PILOT, "@/app/api/v1/contracts/[id]/invoices/route", "GET", "listContractInvoices", "STATIC", "DIRECT_BEHAVIORAL C04 reaches the tenant-scoped read after Cookie authorization", "DIRECT_BEHAVIORAL C04 returns 403 before data access when the database denies", downstream("prismaMocks.invoiceFindMany"), "Cookie identity and database decision reach read", "missing database user blocks read"),
  "EXEC-003-C04-O02": binding(P0, "@/app/api/v1/contracts/[id]/invoices/route", "POST", "issueContractInvoice", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C04-O02 reaches invoice issuance after Cookie authorization", "DIRECT_BEHAVIORAL EXEC-003-C04-O02 keeps invoice issuance Cookie-only", downstream("domainMocks.signContract"), "Cookie identity reaches invoice issuance", "Bearer-only identity blocks invoice issuance"),
  "EXEC-003-C05-O01": binding(P0, "@/app/api/v1/contracts/[id]/payment-plan/route", "GET", "readPaymentPlan", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C05-O01 reaches the tenant-scoped payment-plan read", "DIRECT_BEHAVIORAL EXEC-003-C05-O01 denies payment-plan read before Prisma", downstream("prismaMocks.paymentPlanFindFirst"), "active user and tenant reach payment-plan read", "missing database user blocks payment-plan read"),
  "EXEC-003-C05-O02": binding(P0, "@/app/api/v1/contracts/[id]/payment-plan/route", "PUT", "updatePaymentPlan", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C05-O02 reaches payment-plan update after authorization", "DIRECT_BEHAVIORAL EXEC-003-C05-O02 denies update before the domain mutation", downstream("domainMocks.configurePaymentPlan"), "allowed role reaches payment-plan update", "disallowed role blocks payment-plan update"),
  "EXEC-003-C05-O03": binding(P0, "@/app/api/v1/contracts/[id]/payment-plan/route", "POST", "createPaymentPlan", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C05-O03 reaches payment-plan creation after authorization", "DIRECT_BEHAVIORAL EXEC-003-C05-O03 denies creation before the domain mutation", downstream("domainMocks.ensureDefaultPaymentPlan"), "allowed role reaches payment-plan creation", "disallowed role blocks payment-plan creation"),
  "EXEC-003-C06-O01": binding(P0, "@/app/api/v1/contracts/[id]/restructure/route", "POST", "restructurePaymentPlanRoute", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C06-O01 reaches restructuring after Cookie authorization", "DIRECT_BEHAVIORAL EXEC-003-C06-O01 rejects Bearer-only access on restructure", downstream("domainMocks.restructurePaymentPlan"), "Cookie identity reaches restructuring", "Bearer-only identity blocks restructuring"),
  "EXEC-003-C07-O01": binding(P0, "@/app/api/v1/contracts/[id]/sign/route", "POST", "signContractRoute", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C07-O01 reaches signing after authorization", "DIRECT_BEHAVIORAL EXEC-003-C07-O01 denies signing before the domain operation", downstream("domainMocks.signContract"), "allowed role reaches signing", "disallowed role blocks signing"),
  "EXEC-003-C08-O01": binding(P0, "@/app/api/v1/invoices/[id]/paylink/create/route", "POST", "createPaylink", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C08-O01 reaches the tenant-scoped invoice lookup after authorization", "DIRECT_BEHAVIORAL EXEC-003-C08-O01 returns 403 when Legacy database roles deny", downstream("prismaMocks.invoiceFindFirst"), "allowed role reaches Paylink lookup", "disallowed role blocks Paylink lookup"),
  "EXEC-003-C09-O01": binding(SIGNED, "@/app/api/v1/leads/webhook/route", "POST", "leadsWebhook", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C09-O01 accepts the real timestamped HMAC and reaches tenant-scoped lead creation", "DIRECT_BEHAVIORAL EXEC-003-C09-O01 rejects an invalid leads HMAC before lead creation", downstream("leadMocks.leadCreate"), "valid HMAC reaches lead creation", "invalid HMAC blocks lead creation"),
  "EXEC-003-C10-O01": binding(P0, "@/app/api/v1/leases/[id]/invoices/route", "POST", "createLeaseInvoice", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C10-O01 reaches the tenant-scoped lease lookup", "DIRECT_BEHAVIORAL EXEC-003-C10-O01 keeps lease invoice creation Cookie-only", downstream("prismaMocks.rentalLeaseFindFirst"), "Cookie identity reaches lease lookup", "Bearer-only identity blocks lease lookup"),
  "EXEC-003-C11-O01": binding(P0, "@/app/api/v1/settings/leads-webhook/route", "GET", "readLeadsWebhookSettings", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C11-O01 reaches the tenant-scoped settings read", "DIRECT_BEHAVIORAL EXEC-003-C11-O01 enforces ADMIN before reading webhook settings", downstream("prismaMocks.tenantFindFirst"), "ADMIN reaches settings read", "non-ADMIN blocks settings read"),
  "EXEC-003-C11-O02": binding(P0, "@/app/api/v1/settings/leads-webhook/route", "POST", "rotateLeadsWebhookSecret", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C11-O02 reaches credential rotation only after ADMIN authorization", "DIRECT_BEHAVIORAL EXEC-003-C11-O02 denies credential rotation before the transaction", downstream("prismaMocks.transaction"), "ADMIN reaches rotation transaction", "non-ADMIN blocks rotation transaction"),
  "EXEC-003-C12-O01": binding(P1M, "@/app/api/v1/accounting/journal-entries/[id]/route", "GET", "readJournalEntry", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C12-O01 reaches tenant-scoped journal-entry read", "DIRECT_BEHAVIORAL EXEC-003-C12-O01 denies journal-entry read before Prisma", downstream("prismaMocks.journalEntryFindFirst"), "active user and tenant reach journal read", "missing database user blocks journal read"),
  "EXEC-003-C12-O02": binding(P1M, "@/app/api/v1/accounting/journal-entries/[id]/route", "POST", "reverseJournalEntryRoute", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C12-O02 reaches reversal after ADMIN authorization", "DIRECT_BEHAVIORAL EXEC-003-C12-O02 denies reversal before the mutation", downstream("accountingMocks.reverseJournalEntry"), "ADMIN reaches reversal", "non-ADMIN blocks reversal"),
  "EXEC-003-C13-O01": binding(P1M, "@/app/api/v1/accounting/seed/route", "POST", "seedAccounting", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C13-O01 reaches tenant-scoped accounting seed", "DIRECT_BEHAVIORAL EXEC-003-C13-O01 denies accounting seed before execution", downstream("accountingMocks.seedChartOfAccounts"), "ADMIN reaches accounting seed", "non-ADMIN blocks accounting seed"),
  "EXEC-003-C14-O01": binding(P1M, "@/app/api/v1/automation/workflows/route", "GET", "readWorkflows", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C14-O01 reaches tenant-scoped workflow read", "DIRECT_BEHAVIORAL EXEC-003-C14-O01 rejects Bearer-only workflow reads", downstream("prismaMocks.workflowFindMany"), "Cookie identity reaches workflow read", "Bearer-only identity blocks workflow read"),
  "EXEC-003-C14-O02": binding(COOKIE_MUTATION, "@/app/api/v1/automation/workflows/route", "POST", "createWorkflow", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C14-O02 ALLOW reaches workflow creation after Cookie authorization", "DIRECT_BEHAVIORAL EXEC-003-C14-O02 DENY rejects Bearer-only workflow creation", downstream("prismaMocks.workflowCreate"), "Cookie identity reaches workflow creation", "Bearer-only identity blocks workflow creation"),
  "EXEC-003-C15-O01": binding(P1M, "@/app/api/v1/maintenance/route", "GET", "readMaintenanceTickets", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C15-O01 reaches tenant-scoped maintenance read", "DIRECT_BEHAVIORAL EXEC-003-C15-O01 rejects Bearer-only maintenance reads", downstream("prismaMocks.ticketFindMany"), "Cookie identity reaches maintenance read", "Bearer-only identity blocks maintenance read"),
  "EXEC-003-C15-O02": binding(COOKIE_MUTATION, "@/app/api/v1/maintenance/route", "POST", "createMaintenanceTicket", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C15-O02 ALLOW reaches maintenance creation after Cookie authorization", "DIRECT_BEHAVIORAL EXEC-003-C15-O02 DENY rejects Bearer-only maintenance creation", downstream("prismaMocks.ticketCreate"), "Cookie identity reaches maintenance creation", "Bearer-only identity blocks maintenance creation"),
  "EXEC-003-C16-O01": binding(P1M, "@/app/api/v1/maintenance/[id]/route", "PATCH", "updateMaintenanceTicket", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C16-O01 reaches tenant-scoped maintenance update", "DIRECT_BEHAVIORAL EXEC-003-C16-O01 denies maintenance update before Prisma", downstream("prismaMocks.ticketUpdate"), "Cookie identity reaches maintenance update", "missing Cookie identity blocks maintenance update"),
  "EXEC-003-C17-O01": binding(DELEGATED, "@/app/actions/aiClient", "generateAIInsight", "generateAIInsight", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C17-O01 delegates allow behavior to requireAgentAccess", "DIRECT_BEHAVIORAL EXEC-003-C17-O01 preserves delegated denial without a shared-guard bypass", downstream("providerMocks.generateAgentJson"), "allowed active tenant user reaches AI provider", "disallowed role blocks AI provider"),
  "EXEC-003-C18-O01": binding(EXACT, LOG_ACTIONS_MODULE, "clearSystemLogsAction", "clearSystemLogsAction", "DYNAMIC_ACTUAL", "DIRECT_BEHAVIORAL EXEC-003-C18-O01 ALLOW accepts the exact legacy Admin claim", "DIRECT_BEHAVIORAL EXEC-003-C18-O01 DENY rejects the normalized ADMIN claim", { kind: "RESULT_OBJECT", allowRequiredText: ["success: true"], denyRequiredText: ["success: false", "Unauthorized access"] }, "exact Admin claim succeeds", "ADMIN claim is denied"),
  "EXEC-003-C19-O01": binding(EXACT, LOG_ACTIONS_MODULE, "triggerMockErrorAction", "triggerMockErrorAction", "DYNAMIC_ACTUAL", "DIRECT_BEHAVIORAL EXEC-003-C19-O01 ALLOW accepts Admin and reaches the logger", "DIRECT_BEHAVIORAL EXEC-003-C19-O01 DENY rejects ADMIN before the logger", downstream("logMocks.loggerError"), "exact Admin claim reaches logger", "ADMIN claim blocks logger"),
  "EXEC-003-C20-O01": binding(PILOT, "@/app/api/v1/accounting/payables/route", "GET", "readPayables", "STATIC", "DIRECT_BEHAVIORAL C20 reaches the tenant-scoped sensitive read after authorization", "DIRECT_BEHAVIORAL C20 returns 403 for an unknown or database-denied role", downstream("accountingMocks.getSupplierBalances"), "active user and tenant reach payables read", "missing database user blocks payables read"),
  "EXEC-003-C21-O01": binding(PILOT, "@/app/api/v1/contracts/[id]/pdf/route", "GET", "readContractPdf", "STATIC", "DIRECT_BEHAVIORAL C21 reaches the tenant-scoped PDF lookup after authorization", "DIRECT_BEHAVIORAL C21 keeps the sensitive PDF read Cookie-only", downstream("prismaMocks.contractFindFirst"), "Cookie identity reaches PDF lookup", "Bearer-only identity blocks PDF lookup"),
  "EXEC-003-C22-O01": binding(P1R, "@/app/api/v1/invoices/[id]/paylink/status/route", "GET", "readPaylinkStatus", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C22-O01 reaches the tenant-scoped Paylink status lookup", "DIRECT_BEHAVIORAL EXEC-003-C22-O01 returns 403 when the database user is missing", downstream("prismaMocks.invoiceFindFirst"), "active user and tenant reach Paylink status lookup", "missing database user blocks Paylink status lookup"),
  "EXEC-003-C23-O01": binding(P1R, "@/app/api/v1/invoices/[id]/pdf/route", "GET", "readInvoicePdf", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C23-O01 reaches the tenant-scoped invoice PDF lookup", "DIRECT_BEHAVIORAL EXEC-003-C23-O01 rejects Bearer-only invoice PDF access", downstream("prismaMocks.invoiceFindFirst"), "Cookie identity reaches invoice PDF lookup", "Bearer-only identity blocks invoice PDF lookup"),
  "EXEC-003-C24-O01": binding(P1R, "@/app/api/v1/invoices/[id]/qr/route", "GET", "readInvoiceQr", "STATIC", "DIRECT_BEHAVIORAL EXEC-003-C24-O01 reaches the tenant-scoped invoice QR lookup", "DIRECT_BEHAVIORAL EXEC-003-C24-O01 rejects Bearer-only invoice QR access", downstream("prismaMocks.invoiceFindFirst"), "Cookie identity reaches invoice QR lookup", "Bearer-only identity blocks invoice QR lookup"),
  "EXEC-003-C25-O01": binding(PILOT, "@/app/actions/rentals", "getRentalContractsAction", "getRentalContractsAction", "STATIC", "DIRECT_BEHAVIORAL C25 reaches the tenant-scoped Server Action read after authorization", "DIRECT_BEHAVIORAL C25 has no Platform Owner bypass when the database denies", downstream("prismaMocks.contractFindMany"), "active tenant user reaches rental contracts", "platform owner without tenant user is denied"),
};

export type Exec003BehaviorEvidenceCandidate = {
  contractId: string;
  operationId: string;
  operationFingerprint: string;
  entryPoint: string;
  entryPointModule: string;
  entryPointExport: string;
  entryPointLocalName: string;
  importMode: ImportMode;
  testFile: string;
  allowTestName: string;
  denyTestName: string;
  candidateClass: "CANDIDATE_DIRECT_BEHAVIORAL";
  boundaryType: Exec003LegacyGuardKind;
  permissionKey: Exec003PermissionKey;
  legacyRoles: readonly string[];
  requiredAllowCase: string;
  requiredDenyCase: string;
  securityDecisionDependency: string;
  assertionContract: OutcomeAssertionContract;
  finalGuardModule: string | null;
  forbiddenMockedGuardSymbol: string | null;
};

function operationFingerprint(input: {
  method: string;
  routeOrContract: string;
  permissionKey: string;
  legacyGuardKind: string;
}): string {
  return [
    input.method,
    input.routeOrContract,
    input.permissionKey,
    input.legacyGuardKind,
  ].join("|");
}

export const EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES: readonly Exec003BehaviorEvidenceCandidate[] =
  EXEC_003_PERMISSION_ASSIGNMENTS.flatMap((contract) =>
    contract.operations.map((operation, index) => {
      const operationId = `${contract.contractId}-O${String(index + 1).padStart(2, "0")}`;
      const evidence = BINDING_BY_OPERATION[operationId];
      if (!evidence) throw new Error(`Missing evidence binding for ${operationId}`);

      const databaseDecision = operation.sharedGuardEligible;
      const delegated = operation.legacyGuardKind === "DELEGATED_DATABASE_RBAC";
      return Object.freeze({
        contractId: contract.contractId,
        operationId,
        operationFingerprint: operationFingerprint({
          method: operation.method,
          routeOrContract: contract.routeOrContract,
          permissionKey: operation.permissionKey,
          legacyGuardKind: operation.legacyGuardKind,
        }),
        entryPoint: `${operation.method} ${contract.routeOrContract}`,
        entryPointModule: evidence.entryPointModule,
        entryPointExport: evidence.entryPointExport,
        entryPointLocalName: evidence.entryPointLocalName,
        importMode: evidence.importMode,
        testFile: evidence.testFile,
        allowTestName: evidence.allowTestName,
        denyTestName: evidence.denyTestName,
        candidateClass: "CANDIDATE_DIRECT_BEHAVIORAL" as const,
        boundaryType: operation.legacyGuardKind,
        permissionKey: operation.permissionKey,
        legacyRoles: operation.legacyAllowedRoles,
        requiredAllowCase: evidence.requiredAllowCase,
        requiredDenyCase: evidence.requiredDenyCase,
        securityDecisionDependency: delegated
          ? "requireAgentAccess"
          : databaseDecision
            ? "hasDatabaseRole"
            : operation.legacyGuardKind,
        assertionContract: evidence.assertionContract,
        finalGuardModule: delegated
          ? "@/lib/agents/access"
          : databaseDecision
            ? "@/lib/api-auth-guard"
            : null,
        forbiddenMockedGuardSymbol: delegated
          ? "requireAgentAccess"
          : databaseDecision
            ? "hasDatabaseRole"
            : null,
      });
    }),
  );

export const EXEC_003_BEHAVIOR_EVIDENCE =
  EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES;

export const EXEC_003_INACTIVE_USER_ENTRYPOINT_COVERAGE = [
  {
    testFile: ENTRYPOINT_MATRIX,
    testName:
      "INACTIVE_USER_ENTRY_POINT bearer-capable mutation C03 denies before downstream",
    entryPointLocalName: "cancelContract",
    downstreamSymbol: "domainMocks.cancelDraftContract",
    coverage: ["ROUTE_BEARER_CAPABLE", "MUTATION"],
  },
  {
    testFile: ENTRYPOINT_MATRIX,
    testName:
      "INACTIVE_USER_ENTRY_POINT Cookie-only read C04 denies before downstream",
    entryPointLocalName: "listContractInvoices",
    downstreamSymbol: "prismaMocks.invoiceFindMany",
    coverage: ["COOKIE_ONLY_ROUTE", "READ"],
  },
  {
    testFile: ENTRYPOINT_MATRIX,
    testName:
      "INACTIVE_USER_ENTRY_POINT sensitive read C20 denies before downstream",
    entryPointLocalName: "readPayables",
    downstreamSymbol: "accountingMocks.getSupplierBalances",
    coverage: ["ROUTE_BEARER_CAPABLE", "READ", "SENSITIVE_READ"],
  },
  {
    testFile: ENTRYPOINT_MATRIX,
    testName:
      "INACTIVE_USER_ENTRY_POINT Server Action C25 denies before downstream",
    entryPointLocalName: "getRentalContractsAction",
    downstreamSymbol: "prismaMocks.contractFindMany",
    coverage: ["SERVER_ACTION", "READ", "SENSITIVE_READ"],
  },
  {
    testFile: ENTRYPOINT_MATRIX,
    testName:
      "INACTIVE_USER_ENTRY_POINT Cookie-only mutation C14-O02 denies before downstream",
    entryPointLocalName: "createWorkflow",
    downstreamSymbol: "prismaMocks.workflowCreate",
    coverage: ["COOKIE_ONLY_ROUTE", "MUTATION"],
  },
  {
    testFile: ENTRYPOINT_MATRIX,
    testName:
      "INACTIVE_USER_ENTRY_POINT P1 sensitive read C22 denies before downstream",
    entryPointLocalName: "readPaylinkStatus",
    downstreamSymbol: "prismaMocks.invoiceFindFirst",
    coverage: ["ROUTE_BEARER_CAPABLE", "READ", "SENSITIVE_READ"],
  },
] as const;

export const EXEC_003_PROGRESSIVE_DENY_ENTRYPOINT_PROOF = Object.freeze({
  testFile: ENTRYPOINT_MATRIX,
  testName:
    "PROGRESSIVE_DENY_ENTRY_POINT C03 keeps Legacy allow AND Progressive deny as DENY",
  entryPointLocalName: "cancelContract",
  downstreamSymbol: "domainMocks.cancelDraftContract",
  permissionKey: "contracts.cancel.execute" as const,
});
