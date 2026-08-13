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
import { isProductionRuntime } from '@/lib/api-auth-guard';
import { decryptProviderCredentials } from '@/lib/revenue-integrity/trust-gates';
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

    // ── 2. Ejar credentials from CONNECTED hub — no mock allowed ─────────────
    const connection = await rawPrisma.revenueProviderConnection.findFirst({
      where: { tenantId, provider: 'EJAR', status: 'CONNECTED' },
      orderBy: { updatedAt: 'desc' },
      select: { encryptedCredentials: true, baseUrl: true },
    });

    if (!connection?.encryptedCredentials) {
      return blocked('MISSING_CREDENTIALS', 'No mock allowed');
    }

    let accessToken = '';
    let configuredUrl = String(connection.baseUrl ?? '').trim();
    try {
      const credentials = decryptProviderCredentials(connection.encryptedCredentials);
      accessToken = String(credentials.accessToken ?? '').trim();
      if (!configuredUrl) {
        configuredUrl = String(credentials.healthUrl ?? credentials.baseUrl ?? '').trim();
      }
    } catch {
      return blocked('MISSING_CREDENTIALS', 'No mock allowed');
    }

    if (!credentialValid(accessToken)) {
      return blocked('MISSING_CREDENTIALS', 'No mock allowed');
    }

    const production = isProductionRuntime();
    if (production && /sandbox/i.test(configuredUrl)) {
      return blocked('SANDBOX_BLOCKED_NO_PRODUCTION_CREDENTIALS',
        'EJAR hub URL points to sandbox in production');
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

    // ── 3. Credentials integrity from CONNECTED hub ──────────────────────────
    const connection = await rawPrisma.revenueProviderConnection.findFirst({
      where: { tenantId, provider: 'ZATCA', status: 'CONNECTED' },
      orderBy: { updatedAt: 'desc' },
      select: { encryptedCredentials: true },
    });

    if (!connection?.encryptedCredentials) {
      return blocked('MISSING_CREDENTIALS');
    }

    try {
      const credentials = decryptProviderCredentials(connection.encryptedCredentials);
      const binarySecurityToken = String(credentials.binarySecurityToken ?? '').trim();
      const secret = String(credentials.secret ?? '').trim();
      if (!credentialValid(binarySecurityToken) || !credentialValid(secret)) {
        return blocked('CREDENTIALS_INTEGRITY_FAILED');
      }
    } catch {
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
