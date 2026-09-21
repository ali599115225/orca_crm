/**
 * lib/saudi-trust-gate/idempotency.ts
 * ORCA CRM — Government Outbox Idempotency Service
 *
 * Manages the government_outbox table with idempotency semantics.
 *
 * Key format (SHA-256 hex):
 *   tenantId + ':' + provider + ':' + operation + ':' + businessEntityType + ':' + businessEntityId
 *
 * Duplicate resolution per outbox status — see DuplicateResolution in types.ts
 * No single 409 response: each outbox state has its own semantics.
 */
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { IdempotencyParams, DuplicateResolution } from './types';

// ─── Key Builder ─────────────────────────────────────────────────────────────

/**
 * Deterministic idempotency key:
 * SHA-256(tenantId:provider:operation:businessEntityType:businessEntityId)
 */
export function buildIdempotencyKey(
  params: Omit<IdempotencyParams, 'payload'>
): string {
  const raw = [
    params.tenantId,
    params.provider,
    params.operation,
    params.businessEntityType,
    params.businessEntityId,
  ].join(':');
  return createHash('sha256').update(raw).digest('hex');
}

// ─── Reserve ─────────────────────────────────────────────────────────────────

/**
 * Attempts to reserve an idempotency slot in government_outbox.
 *
 * Uses INSERT ... ON CONFLICT DO NOTHING to guarantee exactly-once insertion.
 * Reads the existing record when a conflict occurs and returns the appropriate
 * DuplicateResolution based on its current status.
 */
export async function checkAndReserve(
  params: IdempotencyParams
): Promise<DuplicateResolution> {
  const key = buildIdempotencyKey(params);

  // ── Step 1: Try atomic INSERT ──────────────────────────────────────────────
  const inserted = await prisma.$queryRaw<
    Array<{ id: string }>
  >`
    INSERT INTO government_outbox (
      tenant_id,
      provider,
      operation,
      idempotency_key,
      business_entity_type,
      business_entity_id,
      payload,
      status,
      retry_count,
      max_retries
    )
    VALUES (
      ${params.tenantId}::uuid,
      ${params.provider},
      ${params.operation},
      ${key},
      ${params.businessEntityType},
      ${params.businessEntityId}::uuid,
      ${params.payload},
      'PENDING',
      0,
      5
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  `;

  // New slot reserved — proceed with external call
  if (inserted.length > 0) {
    return { type: 'NEW', outboxId: inserted[0].id };
  }

  // ── Step 2: Conflict → fetch existing record ───────────────────────────────
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      status: string;
      provider_response: string | null;
      next_retry_at: Date | null;
      retry_count: number;
      max_retries: number;
    }>
  >`
    SELECT id, status, provider_response, next_retry_at, retry_count, max_retries
    FROM government_outbox
    WHERE idempotency_key = ${key}
    LIMIT 1
  `;

  // Extremely unlikely but handle empty result gracefully (concurrent delete)
  if (rows.length === 0) {
    return { type: 'IN_PROGRESS', outboxId: '' };
  }

  const rec = rows[0];

  // ── Step 3: Resolve by status ──────────────────────────────────────────────
  switch (rec.status as string) {
    case 'DELIVERED':
      // Already committed — return cached provider response (HTTP 200, no re-call)
      return {
        type: 'SUCCEEDED',
        providerResponse: rec.provider_response ?? '{}',
        outboxId: rec.id,
      };

    case 'PENDING':
    case 'PROCESSING':
      // In flight — tell caller to wait (HTTP 202)
      return { type: 'IN_PROGRESS', outboxId: rec.id };

    case 'RETRYING': {
      const now = new Date();
      const nextRetry = rec.next_retry_at;

      // Still within backoff window — wait
      if (nextRetry && nextRetry > now) {
        return { type: 'IN_PROGRESS', outboxId: rec.id, nextRetryAt: nextRetry };
      }

      // Backoff expired + max reached — permanent failure
      if (rec.retry_count >= rec.max_retries) {
        return {
          type: 'FAILED_FINAL',
          reason: 'MAX_RETRIES_EXCEEDED',
          outboxId: rec.id,
        };
      }

      // Backoff expired, retries remain — caller may retry
      return { type: 'FAILED_RETRYABLE', outboxId: rec.id };
    }

    case 'FAILED':
      return {
        type: 'FAILED_FINAL',
        reason: 'MAX_RETRIES_EXCEEDED',
        outboxId: rec.id,
      };

    case 'DEAD_LETTER':
      return {
        type: 'FAILED_FINAL',
        reason: 'DEAD_LETTER',
        outboxId: rec.id,
      };

    default:
      // Unknown status — treat as in-progress to be safe
      return { type: 'IN_PROGRESS', outboxId: rec.id };
  }
}

// ─── Lifecycle Transitions ────────────────────────────────────────────────────

/** Called just before the external provider call — transitions PENDING → PROCESSING */
export async function markProcessing(outboxId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE government_outbox
    SET    status     = 'PROCESSING',
           updated_at = now()
    WHERE  id = ${outboxId}::uuid
      AND  status IN ('PENDING', 'RETRYING')
  `;
}

/**
 * Called in TX_2 after a confirmed provider success.
 * Stores the raw provider response for future idempotent reads.
 */
export async function markDelivered(
  outboxId: string,
  providerResponse: string
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE government_outbox
    SET    status            = 'DELIVERED',
           provider_response = ${providerResponse},
           delivered_at      = now(),
           updated_at        = now()
    WHERE  id = ${outboxId}::uuid
  `;
}

/**
 * Called when the provider call fails but retries remain.
 * Applies exponential backoff: next_retry_at = now + 2^retryCount minutes.
 */
export async function markRetrying(
  outboxId: string,
  error: string,
  currentRetryCount: number
): Promise<void> {
  const backoffMinutes = Math.pow(2, currentRetryCount); // 1, 2, 4, 8, 16, 32 …
  const newCount = currentRetryCount + 1;

  await prisma.$executeRaw`
    UPDATE government_outbox
    SET    status        = CASE WHEN ${newCount} >= max_retries THEN 'FAILED' ELSE 'RETRYING' END,
           last_error    = ${error},
           retry_count   = ${newCount},
           next_retry_at = CASE WHEN ${newCount} >= max_retries
                             THEN NULL
                             ELSE now() + (${backoffMinutes} * INTERVAL '1 minute')
                           END,
           updated_at    = now()
    WHERE  id = ${outboxId}::uuid
  `;
}

/** Directly moves a record to FAILED (used when we detect permanent failure outside retry logic) */
export async function markFailed(outboxId: string, error: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE government_outbox
    SET    status     = 'FAILED',
           last_error = ${error},
           updated_at = now()
    WHERE  id = ${outboxId}::uuid
  `;
}
