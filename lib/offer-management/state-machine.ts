export type CommercialOfferState =
  | "DRAFT"
  | "OPEN"
  | "PREPARATION_REQUESTED"
  | "CLOSED"
  | "ARCHIVED";

export type OfferVersionState =
  | "DRAFT"
  | "DISCARDED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "APPROVAL_REJECTED"
  | "ISSUED"
  | "SUPERSEDED"
  | "WITHDRAWN"
  | "EXPIRED"
  | "DECLINED"
  | "CONDITIONALLY_ACCEPTED";

export type ApprovalDecisionState =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REVOKED"
  | "STALE";

export type DecisionIntentState = "PENDING" | "CONFIRMED" | "EXPIRED" | "REVOKED";
export type AcceptanceCompletionState = "PENDING" | "COMPLETED" | "FAILED";
export type PreparationRequestState = "REQUESTED";
export type Exec007CutoverMode =
  | "LEGACY_ONLY"
  | "EXEC007_READY"
  | "EXEC007_ACTIVE"
  | "RECOVERY_STOP";

const transitions = <T extends string>(pairs: ReadonlyArray<readonly [T, T]>) =>
  new Set(pairs.map(([from, to]) => `${from}->${to}`));

const offerTransitions = transitions<CommercialOfferState>([
  ["DRAFT", "OPEN"],
  ["DRAFT", "CLOSED"],
  ["OPEN", "PREPARATION_REQUESTED"],
  ["OPEN", "CLOSED"],
  ["CLOSED", "ARCHIVED"],
]);

const versionTransitions = transitions<OfferVersionState>([
  ["DRAFT", "DISCARDED"],
  ["DRAFT", "PENDING_APPROVAL"],
  ["PENDING_APPROVAL", "APPROVED"],
  ["PENDING_APPROVAL", "APPROVAL_REJECTED"],
  ["APPROVED", "ISSUED"],
  ["ISSUED", "SUPERSEDED"],
  ["ISSUED", "WITHDRAWN"],
  ["ISSUED", "EXPIRED"],
  ["ISSUED", "DECLINED"],
  ["ISSUED", "CONDITIONALLY_ACCEPTED"],
]);

const approvalTransitions = transitions<ApprovalDecisionState>([
  ["PENDING", "APPROVED"],
  ["PENDING", "REJECTED"],
  ["PENDING", "STALE"],
  ["APPROVED", "REVOKED"],
  ["APPROVED", "STALE"],
]);

const intentTransitions = transitions<DecisionIntentState>([
  ["PENDING", "CONFIRMED"],
  ["PENDING", "EXPIRED"],
  ["PENDING", "REVOKED"],
]);

const completionTransitions = transitions<AcceptanceCompletionState>([
  ["PENDING", "COMPLETED"],
  ["PENDING", "FAILED"],
]);

const cutoverTransitions = transitions<Exec007CutoverMode>([
  ["LEGACY_ONLY", "EXEC007_READY"],
  ["EXEC007_READY", "LEGACY_ONLY"],
  ["EXEC007_READY", "EXEC007_ACTIVE"],
  ["EXEC007_ACTIVE", "RECOVERY_STOP"],
  ["RECOVERY_STOP", "EXEC007_ACTIVE"],
]);

export function canTransitionOffer(from: CommercialOfferState, to: CommercialOfferState): boolean {
  return offerTransitions.has(`${from}->${to}`);
}

export function canTransitionVersion(from: OfferVersionState, to: OfferVersionState): boolean {
  return versionTransitions.has(`${from}->${to}`);
}

export function canTransitionApproval(from: ApprovalDecisionState, to: ApprovalDecisionState): boolean {
  return approvalTransitions.has(`${from}->${to}`);
}

export function canTransitionIntent(from: DecisionIntentState, to: DecisionIntentState): boolean {
  return intentTransitions.has(`${from}->${to}`);
}

export function canTransitionCompletion(
  from: AcceptanceCompletionState,
  to: AcceptanceCompletionState,
): boolean {
  return completionTransitions.has(`${from}->${to}`);
}

export function canTransitionCutover(from: Exec007CutoverMode, to: Exec007CutoverMode): boolean {
  return cutoverTransitions.has(`${from}->${to}`);
}

export function assertTransition<T extends string>(
  domain: string,
  from: T,
  to: T,
  predicate: (from: T, to: T) => boolean,
): void {
  if (!predicate(from, to)) {
    throw new Error(`EXEC-007 invalid ${domain} transition: ${from} -> ${to}`);
  }
}
