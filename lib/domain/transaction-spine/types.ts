export interface ScheduleTourInput {
  tenantId: string;
  userId: string;
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
  opportunityId: string;
  unitId: string;
  price: number;
  validUntil: Date;
  documentUrl?: string;
}

export interface AcceptOfferInput {
  tenantId: string;
  userId: string;
  offerId: string;
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
  invoiceId?: string;
  installmentId?: string;
  amount: number;
  method: string;
  idempotencyKey: string;
}

export interface IssueContractInput {
  tenantId: string;
  userId: string;
  clientId: string;
  propertyId: string;
  amount: number;
}
