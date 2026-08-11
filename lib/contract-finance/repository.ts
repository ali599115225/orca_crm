import type {
  ContractTemplateVersion,
  ContractVersion,
  FinancialCorrection,
  FinancialObligation,
  IdempotencyRecord,
  PaymentAllocation,
  PaymentEvidence,
  PaymentRecord,
  RefundRequest,
  SignatoryAuthorityEvidence,
} from "@/lib/contract-finance/contracts";

export type ContractFinanceTransaction = {
  findIdempotency(
    tenantId: string,
    operation: string,
    keyHash: string,
  ): Promise<IdempotencyRecord | null>;
  insertIdempotency(record: IdempotencyRecord): Promise<void>;

  findTemplateVersion(
    tenantId: string,
    templateVersionId: string,
  ): Promise<ContractTemplateVersion | null>;
  findContractVersion(
    tenantId: string,
    contractVersionId: string,
  ): Promise<ContractVersion | null>;
  findCurrentContractVersion(
    tenantId: string,
    contractId: string,
  ): Promise<ContractVersion | null>;
  insertContractVersion(version: ContractVersion): Promise<void>;
  markContractVersionSigned(input: {
    tenantId: string;
    contractVersionId: string;
    signedAt: Date;
    evidence: SignatoryAuthorityEvidence;
  }): Promise<ContractVersion>;
  markContractVersionActivated(input: {
    tenantId: string;
    contractVersionId: string;
    activatedAt: Date;
  }): Promise<ContractVersion>;

  findObligation(
    tenantId: string,
    obligationId: string,
  ): Promise<FinancialObligation | null>;
  insertCorrection(correction: FinancialCorrection): Promise<void>;

  findPaymentEvidence(
    tenantId: string,
    evidenceId: string,
  ): Promise<PaymentEvidence | null>;
  findPayment(tenantId: string, paymentId: string): Promise<PaymentRecord | null>;
  insertPayment(payment: PaymentRecord): Promise<void>;
  insertPaymentAllocation(allocation: PaymentAllocation): Promise<void>;
  allocatedMinorUnitsForObligation(
    tenantId: string,
    obligationId: string,
  ): Promise<number>;

  findRefund(tenantId: string, refundId: string): Promise<RefundRequest | null>;
  insertRefund(refund: RefundRequest): Promise<void>;
  markRefundApproved(input: {
    tenantId: string;
    refundId: string;
    approvedByUserId: string;
  }): Promise<RefundRequest>;
  refundedMinorUnitsForPayment(tenantId: string, paymentId: string): Promise<number>;
};

export interface ContractFinanceRepository {
  transaction<T>(
    work: (transaction: ContractFinanceTransaction) => Promise<T>,
  ): Promise<T>;
}
