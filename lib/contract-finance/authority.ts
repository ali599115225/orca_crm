import { evaluateOrganizationAuthority } from "@/lib/organization/authority";
import type { OrganizationPermissionKey } from "@/lib/organization/contracts";
import type {
  ContractFinanceActorContext,
  ScopedResource,
} from "@/lib/contract-finance/contracts";

export type ContractFinanceAuthorityOperation =
  | "CONTRACT_WRITE"
  | "CONTRACT_SIGN"
  | "CONTRACT_ACTIVATE"
  | "FINANCE_WRITE"
  | "REFUND_INITIATE"
  | "REFUND_APPROVE";

const OPERATION_PERMISSION: Readonly<
  Record<ContractFinanceAuthorityOperation, OrganizationPermissionKey>
> = {
  CONTRACT_WRITE: "contracts.records.write",
  CONTRACT_SIGN: "contracts.records.write",
  CONTRACT_ACTIVATE: "contracts.records.write",
  FINANCE_WRITE: "finance.records.write",
  REFUND_INITIATE: "finance.refund.initiate",
  REFUND_APPROVE: "finance.refund.approve",
};

export type ContractFinanceAuthorityEvidence = Readonly<{
  assignmentId: string;
  permission: OrganizationPermissionKey;
}>;

export function requireContractFinanceAuthority(input: {
  actor: ContractFinanceActorContext;
  operation: ContractFinanceAuthorityOperation;
  resource: ScopedResource;
  initiatedByUserId?: string | null;
}): ContractFinanceAuthorityEvidence {
  const permission = OPERATION_PERMISSION[input.operation];
  const decision = evaluateOrganizationAuthority({
    actorUserId: input.actor.userId,
    actorTenantId: input.actor.tenantId,
    permission,
    resource: input.resource,
    assignments: input.actor.assignments,
    enabledBranchServices: input.actor.enabledBranchServices,
    initiatedByUserId: input.initiatedByUserId,
    now: input.actor.now,
  });

  if (!decision.allowed || !decision.assignmentId) {
    throw new Error(`EXEC-008 authority denied: ${decision.code}`);
  }

  return { assignmentId: decision.assignmentId, permission };
}
