import type { CommandContext, ExactOfferIdentity } from "./contracts";

export interface PersistedAssignment {
  id: string;
  tenantId: string;
  userId: string;
  branchId: string;
  serviceLine: "SALES" | "LEASING";
  resourceType: string;
  resourceId: string;
  active: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export function assertExactAuthority(
  context: CommandContext,
  assignment: PersistedAssignment,
  identity: ExactOfferIdentity,
  permission: string,
): void {
  const now = context.now;
  if (!context.permissions.has(permission)) throw new Error(`missing permission: ${permission}`);
  if (!assignment.active || assignment.effectiveFrom > now || (assignment.effectiveTo && now >= assignment.effectiveTo)) {
    throw new Error("inactive assignment");
  }
  if (
    assignment.id !== context.assignmentId ||
    assignment.userId !== context.actorUserId ||
    assignment.tenantId !== context.tenantId ||
    identity.tenantId !== context.tenantId ||
    assignment.branchId !== identity.branchId ||
    assignment.serviceLine !== identity.serviceLine ||
    assignment.resourceType !== context.resourceType ||
    assignment.resourceId !== context.resourceId
  ) {
    throw new Error("exact tenant/service/resource scope denied");
  }
}
