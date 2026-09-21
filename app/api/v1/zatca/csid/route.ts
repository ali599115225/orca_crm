import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, hasDatabaseRole } from '@/lib/api-auth-guard';
import { submitCsid } from '@/lib/zatca/api';
import { encryptValue } from '@/lib/zatca/encrypt';
import { writeAuditLog } from '@/lib/audit';
import {
  evaluateZatcaGate,
  reserveZatcaSlot,
  markProcessing,
  markDelivered,
  markRetrying,
} from '@/lib/zatca/gate-adapter';
import { ErrorCode } from "@/lib/errors";

// ─── POST: Issue/Renew CSID for a ZATCA device (Hardened) ────────────────────
//
// Authorization (ADMIN) → Tenant FK validation (device.tenantId) →
//   Saudi Trust Gate → Idempotency → submitCsid() →
//   Persist cert (encrypted) → Audit

export async function POST(request: NextRequest) {
  // ── Auth: DB-backed, ADMIN only ────────────────────────────────────────────
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasRole = await hasDatabaseRole(session, ['ADMIN']);
  if (!hasRole) return NextResponse.json({ error: 'Forbidden — ADMIN required' }, { status: 403 });

  const tenantId = session.tenantId;
  const userId = session.userId;

  try {
    const body = await request.json();
    const { deviceId, otp } = body;

    if (!deviceId || !otp) {
      return NextResponse.json({ success: false, error: 'deviceId and otp are required' }, { status: 400 });
    }

    // ── FK: Device belongs to this tenant ─────────────────────────────────────
    const device = await prisma.zatcaDevice.findFirst({
      where: { id: deviceId, tenantId },
    });
    if (!device || !device.csr) {
      return NextResponse.json({ success: false, error: 'Device not found or CSR not generated' }, { status: 404 });
    }

    // ── Saudi Trust Gate ──────────────────────────────────────────────────────
    const gate = await evaluateZatcaGate({
      tenantId, userId,
      operation: 'ZATCA_CSID_REQUEST',
      entityId: deviceId,
    });
    if (!gate.allowed) {
      return NextResponse.json(gate.errorResponse, { status: 403 });
    }

    // ── Idempotency: keyed on deviceId ────────────────────────────────────────
    const payloadSummary = JSON.stringify({ tenantId, deviceId, otp: `${otp.slice(0, 2)}***` });
    const idem = await reserveZatcaSlot({
      tenantId,
      operation: 'ZATCA_CSID_REQUEST',
      businessEntityType: 'device',
      businessEntityId: deviceId,
      payload: payloadSummary,
    });

    if (idem.action === 'RETURN_CACHED') {
      const cached = JSON.parse(idem.cachedResponse!);
      return NextResponse.json({ ...cached, idempotent: true });
    }
    if (idem.action === 'IN_PROGRESS' || idem.action === 'FAILED_FINAL') {
      return NextResponse.json(idem.errorResponse, { status: idem.action === 'FAILED_FINAL' ? 422 : 202 });
    }

    const outboxId = idem.outboxId;
    await markProcessing(outboxId);

    await writeAuditLog({
      tenantId, userId,
      action: 'GOVERNMENT_OUTBOX_ENQUEUED',
      tableName: 'zatca_devices',
      recordId: deviceId,
      details: JSON.stringify({ operation: 'ZATCA_CSID_REQUEST', outboxId }),
    });

    // ── Provider call ─────────────────────────────────────────────────────────
    let result;
    try {
      result = await submitCsid(device.csr, otp);
    } catch (apiErr: any) {
      await markRetrying(outboxId, apiErr.message, 0);
      return NextResponse.json({ success: false, error: `CSID request failed: ${apiErr.message}` }, { status: 502 });
    }

    // ── TX_2: Persist ONLY after provider confirmation ────────────────────────
    if (result.success && result.rawResponse?.binarySecurityToken) {
      await prisma.zatcaDevice.update({
        where: { id: device.id },
        data: {
          complianceCert: encryptValue(result.rawResponse.binarySecurityToken),
          status: 'ACTIVE',
        },
      });
    }

    const responsePayload = {
      success: result.success,
      status: result.status,
      errors: result.errors,
      message: result.success ? 'CSID obtained successfully' : 'CSID request failed',
    };

    await markDelivered(outboxId, JSON.stringify(responsePayload));

    await writeAuditLog({
      tenantId, userId,
      action: 'GOVERNMENT_OUTBOX_DELIVERED',
      tableName: 'zatca_devices',
      recordId: deviceId,
      details: JSON.stringify({ operation: 'ZATCA_CSID_REQUEST', success: result.success }),
    });

    return NextResponse.json(responsePayload);

  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/zatca/csid failed", error, 500);
  }
}
