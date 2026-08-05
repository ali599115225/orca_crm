export type ApprovalType = "STANDARD" | "EXCEPTION" | "FINANCIAL_REVIEW";

export interface ApprovalRequirement {
  id: string;
  tenantId: string;
  offerVersionId: string;
  approvalType: ApprovalType;
  requirementKey: string;
  requiredPermission: string;
  initiatorUserId: string;
  creatorUserId: string;
  lastCommercialEditorId: string;
  contentHash: string;
  pricingHash: string;
  termsHash: string;
}

export interface ApprovalActor {
  actorUserId: string;
  assignmentId: string;
  permissions: ReadonlySet<string>;
  tenantId: string;
}
