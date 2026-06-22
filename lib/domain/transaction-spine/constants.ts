export const CONTRACT_STATUS = {
  PENDING_SIGNATURE: "PENDING_SIGNATURE",
  SIGNED: "SIGNED",
} as const;

export const PAYMENT_PLAN_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const PAYMENT_PLAN_TEMPLATE = {
  SINGLE_PAYMENT: "SINGLE_PAYMENT",
  DEPOSIT_AND_BALANCE: "DEPOSIT_AND_BALANCE",
  MONTHLY: "MONTHLY",
  CUSTOM: "CUSTOM",
} as const;

export const INSTALLMENT_STATUS = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  PARTIAL: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
} as const;

export const INVOICE_STATUS = {
  UNPAID: "unpaid",
  PARTIAL: "partial",
  PAID: "paid",
  OVERDUE: "overdue",
  VOID: "void",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
} as const;

export const OFFER_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;

export const OPPORTUNITY_STATUS = {
  OPEN: "OPEN",
  COMMITTED: "COMMITTED",
  WON: "WON",
  LOST: "LOST",
} as const;

export const UNIT_STATUS = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
} as const;

export const DEFAULT_RESERVATION_DAYS = 7;
export const DEFAULT_PAYMENT_DUE_DAYS = 30;


export const RESTRUCTURE_MODE = {
  REDUCE_INSTALLMENT: "REDUCE_INSTALLMENT",
  REDUCE_TERM: "REDUCE_TERM",
} as const;
