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

export interface ConditionalAcceptanceInput {
  tenantId: string;
  offerVersionId: string;
  principalId: string;
  subjectGrantId: string;
  sessionId: string;
  challengeId: string;
  holdId: string;
  actorUserId: string;
  assignmentId: string;
  expectedHoldVersion: number;
  reservationExpiresAt: Date;
  acceptanceMethod: string;
  evidencePayload: Record<string, unknown>;
  evidenceHash: string;
  correlationId: string;
  idempotencyKeyHash: string;
  payloadHash: string;
  now?: Date;
}

export interface ConditionalAcceptanceResult {
  acceptanceIntentId: string;
  acceptanceEvidenceId: string;
  completionAttemptId: string;
  reservationId: string;
  preparationRequestId: string;
}

export interface Exec007SqlExecutor {
  query<T extends Record<string, unknown>>(
    sql: string,
    values: readonly unknown[],
  ): Promise<{ rows: T[] }>;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

export async function completeConditionalAcceptance(
  executor: Exec007SqlExecutor,
  input: ConditionalAcceptanceInput,
): Promise<ConditionalAcceptanceResult> {
  if (!Number.isInteger(input.expectedHoldVersion) || input.expectedHoldVersion < 1) {
    throw new Error("expectedHoldVersion must be a positive integer");
  }
  for (const [name, value] of [
    ["evidenceHash", input.evidenceHash],
    ["idempotencyKeyHash", input.idempotencyKeyHash],
    ["payloadHash", input.payloadHash],
  ] as const) {
    if (!SHA256_HEX.test(value)) throw new Error(`${name} must be lowercase SHA-256`);
  }
  if (!input.correlationId.trim() || !input.acceptanceMethod.trim()) {
    throw new Error("correlationId and acceptanceMethod are required");
  }
  if (
    input.evidencePayload.action !== "ACCEPT" ||
    input.evidencePayload.offerVersionId !== input.offerVersionId ||
    input.evidencePayload.challengeId !== input.challengeId ||
    input.evidencePayload.payloadProofHash !== input.payloadHash
  ) {
    throw new Error("evidencePayload must bind ACCEPT to the exact OfferVersion, challenge, and payload proof");
  }

  const result = await executor.query<{
    acceptance_intent_id: string;
    acceptance_evidence_id: string;
    completion_attempt_id: string;
    reservation_id: string;
    preparation_request_id: string;
  }>(
    `SELECT * FROM fn_exec007_complete_conditional_acceptance(
      $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::uuid,$8::uuid,$9::uuid,
      $10::integer,$11::timestamptz,$12::text,$13::jsonb,$14::text,$15::text,$16::text,$17::text,$18::timestamptz
    )`,
    [
      input.tenantId,
      input.offerVersionId,
      input.principalId,
      input.subjectGrantId,
      input.sessionId,
      input.challengeId,
      input.holdId,
      input.actorUserId,
      input.assignmentId,
      input.expectedHoldVersion,
      input.reservationExpiresAt,
      input.acceptanceMethod,
      JSON.stringify(input.evidencePayload),
      input.evidenceHash,
      input.correlationId,
      input.idempotencyKeyHash,
      input.payloadHash,
      input.now ?? new Date(),
    ],
  );

  const row = result.rows[0];
  if (!row || result.rows.length !== 1) {
    throw new Error("conditional acceptance did not return exactly one governed result");
  }
  return {
    acceptanceIntentId: row.acceptance_intent_id,
    acceptanceEvidenceId: row.acceptance_evidence_id,
    completionAttemptId: row.completion_attempt_id,
    reservationId: row.reservation_id,
    preparationRequestId: row.preparation_request_id,
  };
}
