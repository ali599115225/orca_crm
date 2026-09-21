/**
 * lib/saudi-trust-gate/types.ts
 * ORCA CRM — Saudi Trust Gates: shared types
 *
 * All types used by SaudiTrustGateService, IdempotencyService,
 * GovernmentOutbox, and per-provider adapters.
 * No runtime code — pure types only.
 */

// ─── Providers & Operations ───────────────────────────────────────────────────

export type GovernmentProvider = 'ZATCA' | 'EJAR';

export type GateOperation =
  | 'ZATCA_SUBMIT_INVOICE'
  | 'ZATCA_CSID_REQUEST'
  | 'ZATCA_CREATE_DEVICE'
  | 'EJAR_REGISTER_CONTRACT';

export type BusinessEntityType =
  | 'invoice'       // ZATCA_SUBMIT_INVOICE
  | 'device'        // ZATCA_CSID_REQUEST
  | 'device_creation' // ZATCA_CREATE_DEVICE (no pre-existing entity)
  | 'contract';     // EJAR_REGISTER_CONTRACT — uses Contract.id, NOT lead.id

// ─── Gate Result ─────────────────────────────────────────────────────────────

export type GateReason =
  | 'TENANT_INACTIVE'
  | 'MISSING_VAT_NUMBER'
  | 'MISSING_COMMERCIAL_REGISTRY'
  | 'MISSING_NATIONAL_ADDRESS'
  | 'MISSING_CREDENTIALS'
  | 'CREDENTIALS_INTEGRITY_FAILED'
  | 'NO_ACTIVE_DEVICE'
  | 'DEVICE_EXPIRED'
  | 'DISCLAIMER_NOT_SIGNED'
  | 'SANDBOX_BLOCKED_NO_PRODUCTION_CREDENTIALS'
  | 'PRODUCTION_RUNTIME_MISSING_FOUNDATION';

export type GateResult =
  | { status: 'READY' }
  | { status: 'BLOCKED'; reason: GateReason; detail?: string }
  | { status: 'REAUTH_REQUIRED'; reason: GateReason }
  | { status: 'PROVIDER_UNAVAILABLE'; reason: GateReason; detail?: string };

// ─── Per-operation Gate Inputs ────────────────────────────────────────────────

/** FK validated before Gate: invoice.tenantId = session.tenantId */
export interface ZatcaSubmitGateInput {
  provider: 'ZATCA';
  operation: 'ZATCA_SUBMIT_INVOICE';
  tenantId: string;
  invoiceId: string;
  operationType: 'REPORT' | 'CLEAR';
}

/** FK validated before Gate: device.tenantId = session.tenantId */
export interface ZatcaCsidGateInput {
  provider: 'ZATCA';
  operation: 'ZATCA_CSID_REQUEST';
  tenantId: string;
  deviceId: string;
}

export interface ZatcaCreateDeviceGateInput {
  provider: 'ZATCA';
  operation: 'ZATCA_CREATE_DEVICE';
  tenantId: string;
}

/**
 * FK validated before Gate: contract.tenantId = session.tenantId
 * businessEntityId = contract.id — NEVER lead.id
 */
export interface EjarRegisterContractGateInput {
  provider: 'EJAR';
  operation: 'EJAR_REGISTER_CONTRACT';
  tenantId: string;
  contractId: string; // Contract.id from ORCA DB
}

export type GateInput =
  | ZatcaSubmitGateInput
  | ZatcaCsidGateInput
  | ZatcaCreateDeviceGateInput
  | EjarRegisterContractGateInput;

// ─── Idempotency / Outbox ─────────────────────────────────────────────────────

/** Parameters for building the idempotency key and reserving an outbox slot */
export interface IdempotencyParams {
  tenantId: string;
  provider: GovernmentProvider;
  operation: GateOperation;
  businessEntityType: BusinessEntityType;
  businessEntityId: string;
  payload: string; // JSON-serialised request payload — stored for retry without recalculation
}

export type OutboxStatus =
  | 'PENDING'      // inserted, not yet picked up by worker
  | 'PROCESSING'   // TX_1 committed — external call in flight
  | 'DELIVERED'    // provider confirmed + TX_2 committed (terminal ✅)
  | 'RETRYING'     // provider failed — waiting for next_retry_at
  | 'FAILED'       // max retries exhausted (terminal ⚠️ — needs intervention)
  | 'DEAD_LETTER'; // manually moved — requires human action (terminal ❌)

/**
 * Result of checkAndReserve():
 *
 * NEW            — slot created, proceed with external call
 * SUCCEEDED      — already DELIVERED; return cached providerResponse (HTTP 200)
 * IN_PROGRESS    — PENDING / PROCESSING / RETRYING+future; return HTTP 202
 * FAILED_RETRYABLE — RETRYING + window passed; caller may re-attempt
 * FAILED_FINAL   — FAILED / DEAD_LETTER; block with typed reason (HTTP 422)
 */
export type DuplicateResolution =
  | { type: 'NEW'; outboxId: string }
  | { type: 'SUCCEEDED'; providerResponse: string; outboxId: string }
  | { type: 'IN_PROGRESS'; outboxId: string; nextRetryAt?: Date | null }
  | { type: 'FAILED_RETRYABLE'; outboxId: string }
  | { type: 'FAILED_FINAL'; reason: string; outboxId: string };
