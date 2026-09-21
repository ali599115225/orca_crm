export type DecisionAction = "ACCEPT" | "DECLINE";
export type DecisionIntentState = "PENDING" | "CONFIRMED" | "EXPIRED" | "REVOKED";

export interface DecisionIntent {
  id: string;
  tenantId: string;
  offerVersionId: string;
  customerSessionId: string;
  principalId: string;
  subjectPartyId: string;
  customerAccountId: string | null;
  action: DecisionAction;
  state: DecisionIntentState;
  nonceHash: string;
  contentHash: string;
  pricingHash: string;
  termsHash: string;
  expiresAt: Date;
}

export interface MinimizedDecisionEvidence {
  tenantId: string;
  intentId: string;
  offerVersionId: string;
  principalId: string;
  subjectPartyId: string;
  customerAccountId: string | null;
  action: DecisionAction;
  contentHash: string;
  pricingHash: string;
  termsHash: string;
  confirmationTextVersion: string;
  assuranceLevel: "CUSTOMER_DECISION_STEP_UP";
  serverConfirmedAt: Date;
  canonicalizationVersion: "EXEC007-CANON-1";
}
