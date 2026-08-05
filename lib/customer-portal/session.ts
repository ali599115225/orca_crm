import { randomBytes } from "node:crypto";
import { sha256Hex } from "../offer-management/canonicalization";
import type { CustomerAssuranceLevel, CustomerSessionContract } from "./contracts";

export const CUSTOMER_IDLE_SESSION_MS = 30 * 60 * 1000;
export const CUSTOMER_ABSOLUTE_SESSION_MS = 8 * 60 * 60 * 1000;
export const CUSTOMER_DECISION_STEP_UP_MS = 10 * 60 * 1000;

export function issueCustomerSession(input: {
  tenantId: string;
  principalId: string;
  subjectGrantId: string;
  authVersion: number;
  grantVersion: number;
  assuranceLevel: CustomerAssuranceLevel;
  now: Date;
}) {
  const token = randomBytes(32).toString("base64url");
  const session: Omit<CustomerSessionContract, "id"> = {
    tenantId: input.tenantId,
    principalId: input.principalId,
    subjectGrantId: input.subjectGrantId,
    status: "ACTIVE",
    assuranceLevel: input.assuranceLevel,
    authVersion: input.authVersion,
    grantVersion: input.grantVersion,
    lastSeenAt: input.now,
    decisionStepUpAt:
      input.assuranceLevel === "CUSTOMER_DECISION_STEP_UP" ? input.now : null,
    idleExpiresAt: new Date(input.now.getTime() + CUSTOMER_IDLE_SESSION_MS),
    absoluteExpiresAt: new Date(input.now.getTime() + CUSTOMER_ABSOLUTE_SESSION_MS),
  };
  return { token, tokenHash: sha256Hex(token), session };
}

export function assertSessionCurrent(
  session: CustomerSessionContract,
  current: { authVersion: number; grantVersion: number; now: Date; requireDecisionStepUp: boolean },
): void {
  if (session.status !== "ACTIVE") throw new Error("customer session inactive");
  if (session.authVersion !== current.authVersion || session.grantVersion !== current.grantVersion) {
    throw new Error("customer session version invalidated");
  }
  if (current.now >= session.idleExpiresAt || current.now >= session.absoluteExpiresAt) {
    throw new Error("customer session expired");
  }
  if (current.requireDecisionStepUp) {
    if (
      session.assuranceLevel !== "CUSTOMER_DECISION_STEP_UP" ||
      !session.decisionStepUpAt ||
      current.now.getTime() - session.decisionStepUpAt.getTime() > CUSTOMER_DECISION_STEP_UP_MS
    ) {
      throw new Error("recent customer decision step-up required");
    }
  }
}
