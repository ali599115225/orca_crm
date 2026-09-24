
export type RestructureMode =
  | "REDUCE_INSTALLMENT"
  | "REDUCE_TERM";

export interface RestructurePaymentPlanInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  contractId: string;
  prepaymentAmount: number;
  mode: RestructureMode;
  desiredInstallmentCount?: number;
  reason: string;
  method?: string;
  idempotencyKey: string;
}

export interface EarlySettlementInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  contractId: string;
  reason: string;
  idempotencyKey: string;
}

export type PaymentPlanTemplate =
  | "SINGLE_PAYMENT"
  | "DEPOSIT_AND_BALANCE"
  | "MONTHLY"
  | "CUSTOM";

export interface PaymentScheduleItem {
  installmentNumber: number;
  amountSar: number;
  dueDate: Date;
}

export interface ScheduleTourInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  assignedTo?: string;
  leadId: string;
  offerId?: string;
  opportunityId?: string;
  unitId?: string;
  location: string;
  startAt: Date;
  endAt: Date;
  attendees?: number;
  notes?: string;
}

export interface CreateOfferInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  opportunityId: string;
  unitId: string;
  price: number;
  validUntil: Date;
  documentUrl?: string;
}

export interface AcceptOfferInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  offerId: string;
}

export interface ConfigurePaymentPlanInput {
  tenantId: string;
  userId: string;
  contractId: string;
  template: PaymentPlanTemplate;
  installmentCount?: number;
  firstDueDate?: Date | string;
  intervalDays?: number;
  depositPercent?: number;
  customInstallments?: Array<{
    amountSar: number;
    dueDate: Date | string;
  }>;
}

/**
 * Generic, provider-neutral evidence captured when a contract is first signed.
 * Only its SHA-256 hash and the signing method are persisted; the raw
 * evidence is never stored.
 */
export interface ContractSignatureEvidence {
  method: string;
  signerName: string;
  capturedAt: Date | string;
  signerReference?: string;
  attributes?: Record<string, unknown>;
}

export interface SignContractInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  contractId: string;
  signedAt?: Date;
  /** Required for the first signing; ignored for an already-signed retry. */
  signatureEvidence?: ContractSignatureEvidence;
}

/**
 * Canonical per-signatory signing input. The authoritative signer identity is
 * ContractSignatory.id (signatoryId); signedAt is never client-controlled.
 */
export interface SignContractSignatoryInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  contractId: string;
  signatoryId: string;
  signatureEvidence: ContractSignatureEvidence;
}

/** One entry of the wire-level signatory configuration body (item 8). */
export interface ConfigureContractSignatoryEntry {
  role: string;
  required: boolean;
  signerReference?: string | null;
}

/**
 * Full-set replacement input for PUT /contracts/{id}/signatories. The client
 * never supplies id/status/signedAt/evidence hash/tenantId/contractId.
 */
export interface ConfigureContractSignatoriesInput {
  tenantId: string;
  userId: string;
  contractId: string;
  signatories: ConfigureContractSignatoryEntry[];
}

export interface CancelContractInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  contractId: string;
  reason: string;
}

export interface CreateInvoiceInput {
  tenantId: string;
  userId: string;
  type: "SALE" | "RENTAL";
  contractId?: string;
  leaseId?: string;
  subtotal: number;
  vatRate?: number;
  vatType?: "STANDARD" | "ZERO_RATED" | "EXEMPT";
  dueDate: Date;
}

export interface CreateInstallmentsInput {
  tenantId: string;
  userId: string;
  invoiceId: string;
  count: number;
  startDate: Date;
  intervalDays?: number;
}

export interface RecordPaymentInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  invoiceId?: string;
  installmentId?: string;
  amount: number;
  method: string;
  planCode?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface IssueContractInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  clientId: string;
  propertyId: string;
  amount: number;
}

export interface UpdateTourStatusInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  tourId: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "FOLLOW_UP";
}

/**
 * One durable schedule-proposal line in an amendment DRAFT's changesJson.
 * installmentId anchors the proposal to a real, existing Installment.id —
 * the proposal is never a free-standing array, it is a bijection over the
 * contract's currently-eligible (future, unpaid, non-terminal) installments.
 */
export interface AmendmentScheduleProposalItem {
  installmentId: string;
  installmentNumber: number;
  amountSar: number;
  /** Normalized YYYY-MM-DD, matching Installment.dueDate's @db.Date column. */
  dueDate: string;
}

/**
 * The only F3-2 change representation: a zero-net-delta reschedule of the
 * contract's eligible (future, unpaid, non-terminal) installments. No
 * monetary-delta field exists here by design — non-zero amount changes
 * remain blocked until a canonical financial-adjustment primitive exists.
 */
export interface AmendmentChangeSet {
  proposedSchedule: AmendmentScheduleProposalItem[];
}

/**
 * DRAFT-only. No approval/apply/financial mutation occurs here. The client
 * never supplies id/status/sourceContractVersion/sourceSnapshotId — those
 * are always server-derived inside the create transaction.
 */
export interface CreateAmendmentDraftInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  contractId: string;
  title: string;
  reason?: string;
  changesJson: AmendmentChangeSet;
  idempotencyKey: string;
}

/**
 * DRAFT -> APPROVED transition only. No apply, no financial mutation, no
 * AMENDMENT_RESULT snapshot. The client never supplies status/approvedBy/
 * approvedAt/tenantId — those are always server-derived.
 */
export interface ApproveAmendmentInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  contractId: string;
  amendmentId: string;
  idempotencyKey: string;
}

/**
 * APPROVED -> APPLIED transition only. Financial mutation and AMENDMENT_RESULT
 * snapshot occur here inside one Serializable transaction. The client never
 * supplies status/resultingSnapshotId/appliedAt/contractVersion/tenantId —
 * those are always server-derived.
 */
export interface ApplyAmendmentInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  contractId: string;
  amendmentId: string;
  idempotencyKey: string;
}

export interface AmendmentResultApprovalSnapshot {
  amendmentId: string;
  sourceSnapshotId: string;
  sourceContractVersion: number;
  approvedBy: string;
  approvedAt: string;
  appliedBy: string;
  appliedAt: string;
}

export interface CreateOpportunityInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  leadId: string;
  unitId: string;
  value: number;
  probability?: number;
  closeDate?: Date;
}
