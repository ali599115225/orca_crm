export type CustomerIdentityType = "VERIFIED_PHONE" | "VERIFIED_EMAIL" | "EXTERNAL_SUBJECT";
export type CustomerAssuranceLevel = "CUSTOMER_VIEW_VERIFIED" | "CUSTOMER_DECISION_STEP_UP";

export interface CustomerPrincipalContract {
  id: string;
  tenantId: string;
  status: "ACTIVE" | "LOCKED" | "REVOKED";
  authVersion: number;
}

export interface CustomerSubjectGrantContract {
  id: string;
  tenantId: string;
  principalId: string;
  actorPartyId: string;
  subjectPartyId: string;
  customerAccountId: string | null;
  branchId: string;
  serviceLine: "SALES" | "LEASING";
  resourceScope: Readonly<Record<string, string>>;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  grantVersion: number;
  effectiveAt: Date;
  expiresAt: Date | null;
}

export interface CustomerSessionContract {
  id: string;
  tenantId: string;
  principalId: string;
  subjectGrantId: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  assuranceLevel: CustomerAssuranceLevel;
  authVersion: number;
  grantVersion: number;
  lastSeenAt: Date;
  decisionStepUpAt: Date | null;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
}


export interface CustomerDecisionChallengeContract {
  id: string;
  tenantId: string;
  principalId: string;
  sessionId: string;
  subjectGrantId: string;
  subjectPartyId: string;
  customerAccountId: string | null;
  offerVersionId: string;
  action: "ACCEPT" | "DECLINE";
  tokenHash: string;
  payloadProofHash: string;
  status: "PENDING" | "CONSUMED" | "EXPIRED" | "REVOKED";
  expiresAt: Date;
  consumedAt: Date | null;
}
