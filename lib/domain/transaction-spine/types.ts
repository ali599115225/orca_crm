
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

export interface SignContractInput {
  tenantId: string;
  userId: string;
  actorId?: string;
  correlationId?: string;
  contractId: string;
  signedAt?: Date;
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
