import { canonicalDomainPayload, hashCanonicalDomain } from "./canonicalization";
import { signHmacSha256, type HmacKey } from "./hmac";
import type { DecisionIntent, MinimizedDecisionEvidence } from "./decision-contracts";

export function buildDecisionEvidence(
  intent: DecisionIntent,
  input: {
    action: "ACCEPT" | "DECLINE";
    confirmationTextVersion: string;
    serverConfirmedAt: Date;
    assuranceLevel: "CUSTOMER_DECISION_STEP_UP";
  },
  key: HmacKey,
) {
  if (intent.action !== input.action || intent.state !== "PENDING") throw new Error("decision intent is not confirmable");
  if (input.serverConfirmedAt >= intent.expiresAt) throw new Error("decision intent expired");
  const evidence: MinimizedDecisionEvidence = {
    tenantId: intent.tenantId,
    intentId: intent.id,
    offerVersionId: intent.offerVersionId,
    principalId: intent.principalId,
    subjectPartyId: intent.subjectPartyId,
    customerAccountId: intent.customerAccountId,
    action: input.action,
    contentHash: intent.contentHash,
    pricingHash: intent.pricingHash,
    termsHash: intent.termsHash,
    confirmationTextVersion: input.confirmationTextVersion,
    assuranceLevel: input.assuranceLevel,
    serverConfirmedAt: input.serverConfirmedAt,
    canonicalizationVersion: "EXEC007-CANON-1",
  };
  const evidenceHash = hashCanonicalDomain("evidence", evidence);
  return {
    evidence,
    evidenceHash,
    networkHmac: signHmacSha256(canonicalDomainPayload("evidence", evidence), key),
    hmacKeyVersion: key.version,
  };
}
