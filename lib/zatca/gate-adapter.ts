/**
 * lib/zatca/gate-adapter.ts
 * ORCA CRM — ZATCA Saudi Trust Gate Adapter
 *
 * Wraps SaudiTrustGateService + GovernmentOutbox idempotency for all ZATCA operations.
 * Fail-closed: any gate failure blocks the operation and writes an audit entry.
 *
 * RULES enforced here:
 *  - Unsigned XML is NEVER submitted (signing failure = hard block)
 *  - Sandbox is never considered a production success
 *  - Duplicate invoice submission is blocked via idempotency
 *  - Legal state (invoice.zatcaStatus) only changes AFTER provider confirmation
 */
import { writeAuditLog } from '@/lib/audit';
import { SaudiTrustGateService } from '@/lib/saudi-trust-gate';
import {
  buildIdempotencyKey,
  checkAndReserve,
  markProcessing,
  markDelivered,
  markRetrying,
  markFailed,
} from '@/lib/saudi-trust-gate/idempotency';
import type { GateOperation, DuplicateResolution } from '@/lib/saudi-trust-gate/types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Whether the runtime is pointed at the ZATCA sandbox gateway */
export function isSandboxRuntime(): boolean {
  return process.env.ZATCA_SANDBOX_MODE !== 'false';
}

// ─── Gate evaluation ──────────────────────────────────────────────────────────

export interface ZatcaGateEvalResult {
  allowed: boolean;
  errorResponse?: { success: false; error: string };
}

/**
 * Evaluates the Saudi Trust Gate for a ZATCA operation.
 * Writes an audit entry on every decision (pass or block).
 * Returns { allowed: true } or { allowed: false, errorResponse }
 */
export async function evaluateZatcaGate(params: {
  tenantId: string;
  userId: string;
  operation: GateOperation;
  entityId: string;
}): Promise<ZatcaGateEvalResult> {
  const { tenantId, userId, operation, entityId } = params;

  let gateInput: Parameters<typeof SaudiTrustGateService.evaluate>[0];

  switch (operation) {
    case 'ZATCA_SUBMIT_INVOICE':
      gateInput = {
        provider: 'ZATCA',
        operation: 'ZATCA_SUBMIT_INVOICE',
        tenantId,
        invoiceId: entityId,
        operationType: 'REPORT',
      };
      break;
    case 'ZATCA_CSID_REQUEST':
      gateInput = {
        provider: 'ZATCA',
        operation: 'ZATCA_CSID_REQUEST',
        tenantId,
        deviceId: entityId,
      };
      break;
    case 'ZATCA_CREATE_DEVICE':
      gateInput = {
        provider: 'ZATCA',
        operation: 'ZATCA_CREATE_DEVICE',
        tenantId,
      };
      break;
    default: {
      return {
        allowed: false,
        errorResponse: { success: false, error: `Unknown ZATCA operation: ${operation}` },
      };
    }
  }

  const result = await SaudiTrustGateService.evaluate(gateInput);

  // Audit every gate decision
  await writeAuditLog({
    tenantId,
    userId,
    action: result.status === 'READY' ? 'SAUDI_TRUST_GATE_PASSED' : 'SAUDI_TRUST_GATE_BLOCKED',
    tableName: 'government_outbox',
    recordId: entityId,
    details: JSON.stringify({ operation, gateResult: result }),
  });

  if (result.status !== 'READY') {
    const reason = (result as any).reason ?? result.status;
    return {
      allowed: false,
      errorResponse: { success: false, error: `ZATCA gate blocked: ${reason}` },
    };
  }

  return { allowed: true };
}

// ─── Idempotency helpers for ZATCA operations ─────────────────────────────────

export interface IdempotencyResult {
  action: 'NEW' | 'RETURN_CACHED' | 'IN_PROGRESS' | 'FAILED_FINAL' | 'FAILED_RETRYABLE';
  outboxId: string;
  cachedResponse?: string;
  errorResponse?: { success: false; error: string; outboxStatus?: string };
}

/**
 * Reserves an idempotency slot in government_outbox.
 * Returns an IdempotencyResult that tells the caller what to do.
 */
export async function reserveZatcaSlot(params: {
  tenantId: string;
  operation: GateOperation;
  businessEntityType: 'invoice' | 'device' | 'device_creation';
  businessEntityId: string;
  payload: string;
}): Promise<IdempotencyResult> {
  const resolution: DuplicateResolution = await checkAndReserve({
    tenantId: params.tenantId,
    provider: 'ZATCA',
    operation: params.operation,
    businessEntityType: params.businessEntityType,
    businessEntityId: params.businessEntityId,
    payload: params.payload,
  });

  switch (resolution.type) {
    case 'NEW':
      return { action: 'NEW', outboxId: resolution.outboxId };

    case 'SUCCEEDED':
      return {
        action: 'RETURN_CACHED',
        outboxId: resolution.outboxId,
        cachedResponse: resolution.providerResponse,
      };

    case 'IN_PROGRESS':
      return {
        action: 'IN_PROGRESS',
        outboxId: resolution.outboxId,
        errorResponse: {
          success: false,
          error: 'العملية قيد المعالجة. يرجى الانتظار.',
          outboxStatus: 'IN_PROGRESS',
        },
      };

    case 'FAILED_RETRYABLE':
      // Let caller retry
      return { action: 'FAILED_RETRYABLE', outboxId: resolution.outboxId };

    case 'FAILED_FINAL':
      return {
        action: 'FAILED_FINAL',
        outboxId: resolution.outboxId,
        errorResponse: {
          success: false,
          error: `فشل نهائي: ${resolution.reason}. يرجى التواصل مع الدعم.`,
          outboxStatus: 'FAILED_FINAL',
        },
      };
  }
}

// Re-export lifecycle transitions for convenience
export { markProcessing, markDelivered, markRetrying, markFailed };
