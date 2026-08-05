import type { ApprovalActor, ApprovalRequirement } from "./approval-contracts";

export function assertIndependentApproval(requirement: ApprovalRequirement, actor: ApprovalActor): void {
  if (actor.tenantId !== requirement.tenantId) throw new Error("cross-tenant approval denied");
  if (!actor.permissions.has(requirement.requiredPermission)) throw new Error("approval permission denied");
  const conflicts = new Set([
    requirement.initiatorUserId,
    requirement.creatorUserId,
    requirement.lastCommercialEditorId,
  ]);
  if (conflicts.has(actor.actorUserId)) throw new Error("self or conflicting approval denied");
  if (!actor.assignmentId) throw new Error("active assignment required");
}

export function approvalsAreEffective(
  requirements: readonly ApprovalRequirement[],
  approvedRequirementIds: ReadonlySet<string>,
): boolean {
  return requirements.length > 0 && requirements.every((item) => approvedRequirementIds.has(item.id));
}
