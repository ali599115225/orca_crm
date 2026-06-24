/**
 * lib/saudi-trust-gate/index.ts
 * ORCA CRM — SaudiTrustGateService
 *
 * Per-operation, DB-backed gate evaluation. Evaluates fresh on every call.
 * NO state is stored on Tenant — avoids stale-cache problems.
 *
 * Fail-closed: any unrecognised error returns BLOCKED rather than allowing
 * the operation to proceed.
 */
import { rawPrisma } from '@/lib/prisma';
import { decryptCompat } from '@/lib/crypto-gcm';
import { isProductionRuntime } from '@/lib/api-auth-guard';
import type {
  GateInput,
  GateResult,
  GateReason,
} from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function blocked(reason: GateReason, detail?: string): GateResult {
  return { status: 'BLOCKED', reason, detail };
}

function providerUnavailable(reason: GateReason, detail?: string): GateResult {
  return { status: 'PROVIDER_UNAVAILABLE', reason, detail };
}

/** Validates a decrypted credential: non-null and meaningfully long */
function credentialValid(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length >= 5;
}

// ─── Gate Service ─────────────────────────────────────────────────────────────

export class SaudiTrustGateService {
  /**
   * Evaluate the Gate for a given operation.
   *
   * @param input - Typed gate input (provider + operation + entity IDs)
   * @returns GateResult — callers MUST check status === 'READY' before proceeding
   */
  static async evaluate(input: GateInput): Promise<GateResult> {
    try {
      switch (input.provider) {
        case 'EJAR':
          return await SaudiTrustGateService.evaluateEjar(input);
        case 'ZATCA':
          return await SaudiTrustGateService.evaluateZatca(input);
        default: {
          const _exhaustive: never = input;
          return blocked('TENANT_INACTIVE', `Unknown provider: ${(_exhaustive as any).provider}`);
        }
      }
    } catch (err: any) {
      // Fail-closed: any unexpected error blocks the operation
      return blocked('TENANT_INACTIVE', `Gate evaluation error: ${err?.message ?? 'unknown'}`);
    }
  }

  // ─── Ejar Gate ─────────────────────────────────────────────────────────────

  private static async evaluateEjar(
    input: Extract<GateInput, { provider: 'EJAR' }>
  ): Promise<GateResult> {
    const { tenantId, contractId } = input as { tenantId: string; contractId: string };

    // ── 1. Tenant active check ───────────────────────────────────────────────
    const tenant = await rawPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { isActive: true },
    });

    if (!tenant) {
      return blocked('TENANT_INACTIVE', 'Tenant not found');
    }
    if (!tenant.isActive) {
      return blocked('TENANT_INACTIVE');
    }

    // ── 2. Ejar Credentials (from ENV — global for this deployment) ──────────
    const configuredUrl = (process.env.EJAR_API_URL ?? '').trim();
    const configuredKey = (process.env.EJAR_API_KEY ?? '').trim();
    const production = isProductionRuntime();

    if (production) {
      // Production must have a real, non-sandbox URL and a real key
      if (!configuredUrl || /sandbox/i.test(configuredUrl)) {
        return blocked('SANDBOX_BLOCKED_NO_PRODUCTION_CREDENTIALS',
          'EJAR_API_URL is missing or points to sandbox in production');
      }
      if (!configuredKey) {
        return blocked('MISSING_CREDENTIALS', 'EJAR_API_KEY is not set in production');
      }
    } else {
      // Non-production: if credentials are missing, block with MISSING_FOUNDATION
      // — no mock success is ever permitted
      if (!configuredUrl || !configuredKey) {
        return blocked('PRODUCTION_RUNTIME_MISSING_FOUNDATION',
          'EJAR credentials are not configured. Set EJAR_API_URL and EJAR_API_KEY in .env.local. No mock allowed.');
      }
    }

    // ── 3. FK: contractId belongs to this tenant ─────────────────────────────
    const contract = await rawPrisma.contract.findFirst({
      where: { id: contractId, tenantId },
      select: { id: true, status: true },
    });

    if (!contract) {
      // Return 404-like block — do NOT reveal whether other tenants have this contract
      return blocked('TENANT_INACTIVE', 'Contract not found or access denied');
    }

    // ── 4. All checks passed ─────────────────────────────────────────────────
    return { status: 'READY' };
  }

  // ─── Zatca Gate (foundation — full enforcement in Batch 3) ────────────────

  private static async evaluateZatca(
    input: Extract<GateInput, { provider: 'ZATCA' }>
  ): Promise<GateResult> {
    const { tenantId } = input;

    // ── 1. Tenant active + profile completeness ──────────────────────────────
    const tenant = await rawPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        isActive: true,
        vatNumber: true,
        commercialRegistry: true,
        nationalAddress: true,
        encryptedZatcaCredentials: true,
      },
    });

    if (!tenant) return blocked('TENANT_INACTIVE', 'Tenant not found');
    if (!tenant.isActive) return blocked('TENANT_INACTIVE');

    if (!/^3\d{14}$/.test((tenant.vatNumber ?? '').trim())) {
      return blocked('MISSING_VAT_NUMBER');
    }
    if (!/^\d{10}$/.test((tenant.commercialRegistry ?? '').trim())) {
      return blocked('MISSING_COMMERCIAL_REGISTRY');
    }
    if ((tenant.nationalAddress ?? '').trim().length < 5) {
      return blocked('MISSING_NATIONAL_ADDRESS');
    }

    // ── 2. Compliance disclaimer signed ─────────────────────────────────────
    const signedLog = await rawPrisma.auditLog.findFirst({
      where: { tenantId, action: 'COMPLIANCE_DISCLAIMER_SIGNED' },
      select: { id: true },
    });
    if (!signedLog) return blocked('DISCLAIMER_NOT_SIGNED');

    // ── 3. Credentials integrity ─────────────────────────────────────────────
    if (!tenant.encryptedZatcaCredentials) {
      return blocked('MISSING_CREDENTIALS');
    }
    const decrypted = decryptCompat(tenant.encryptedZatcaCredentials);
    if (!credentialValid(decrypted)) {
      return blocked('CREDENTIALS_INTEGRITY_FAILED');
    }

    // ── 4. Active ZATCA device (skip for create — we're making the first one) ─
    if (input.operation !== 'ZATCA_CREATE_DEVICE') {
      const device = await rawPrisma.zatcaDevice.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        select: { id: true, expiresAt: true },
      });
      if (!device) return providerUnavailable('NO_ACTIVE_DEVICE');
      if (device.expiresAt && device.expiresAt < new Date()) {
        return providerUnavailable('DEVICE_EXPIRED');
      }
    }

    return { status: 'READY' };
  }
}
