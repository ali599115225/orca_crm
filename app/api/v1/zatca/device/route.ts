import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, hasDatabaseRole, isProductionRuntime } from '@/lib/api-auth-guard';
import { generateEcdsaKeyPair, generateCsr, encryptPrivateKey } from '@/lib/zatca/device';
import { writeAuditLog } from '@/lib/audit';
import {
  evaluateZatcaGate,
  reserveZatcaSlot,
  markProcessing,
  markDelivered,
} from '@/lib/zatca/gate-adapter';

// ─── GET: List devices for tenant (read-only, any authenticated role) ─────────

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const devices = await prisma.zatcaDevice.findMany({
      where: { tenantId: session.tenantId },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, devices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST: Create ZATCA device (Hardened) ─────────────────────────────────────
//
// Authorization → Tenant FK → Saudi Trust Gate →
//   Idempotency (device_creation) → Key generation → DB write → Audit

export async function POST(request: NextRequest) {
  // ── Auth: DB-backed role ───────────────────────────────────────────────────
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasRole = await hasDatabaseRole(session, ['ADMIN']);
  if (!hasRole) return NextResponse.json({ error: 'Forbidden — ADMIN required' }, { status: 403 });

  const tenantId = session.tenantId;
  const userId = session.userId;

  try {
    const body = await request.json();
    const { deviceName, deviceType } = body;

    if (!deviceName) {
      return NextResponse.json({ success: false, error: 'deviceName is required' }, { status: 400 });
    }

    // ── Saudi Trust Gate ──────────────────────────────────────────────────────
    const gate = await evaluateZatcaGate({
      tenantId, userId,
      operation: 'ZATCA_CREATE_DEVICE',
      entityId: tenantId, // no entity yet — use tenantId as context
    });
    if (!gate.allowed) {
      return NextResponse.json(gate.errorResponse, { status: 403 });
    }

    // ── Idempotency: device_creation keyed on tenantId + deviceName ───────────
    const payloadSummary = JSON.stringify({ tenantId, deviceName, deviceType });
    const idem = await reserveZatcaSlot({
      tenantId,
      operation: 'ZATCA_CREATE_DEVICE',
      businessEntityType: 'device_creation',
      businessEntityId: tenantId, // device_creation uses tenantId as proxy
      payload: payloadSummary,
    });

    if (idem.action === 'RETURN_CACHED') {
      const cached = JSON.parse(idem.cachedResponse!);
      return NextResponse.json({ ...cached, idempotent: true }, { status: 200 });
    }
    if (idem.action === 'IN_PROGRESS' || idem.action === 'FAILED_FINAL') {
      return NextResponse.json(idem.errorResponse, { status: 202 });
    }

    const outboxId = idem.outboxId;
    await markProcessing(outboxId);

    // ── Key generation and device registration ────────────────────────────────
    const keyPair = generateEcdsaKeyPair();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { companyName: true },
    });

    const csr = generateCsr(
      keyPair.privateKey,
      keyPair.publicKey,
      deviceName,
      tenant?.companyName || 'ZATCA Device'
    );
    const encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey);

    const device = await prisma.zatcaDevice.create({
      data: {
        tenantId,
        deviceName,
        deviceType: deviceType || 'COMPLIANCE',
        csr,
        privateKey: encryptedPrivateKey,
        publicKey: keyPair.publicKey,
        status: 'ACTIVE',
      },
    });

    const responsePayload = {
      success: true,
      device: {
        id: device.id,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        csr: device.csr,
        publicKey: device.publicKey,
        status: device.status,
      },
    };

    await markDelivered(outboxId, JSON.stringify(responsePayload));

    await writeAuditLog({
      tenantId, userId,
      action: 'GOVERNMENT_OUTBOX_DELIVERED',
      tableName: 'zatca_devices',
      recordId: device.id,
      details: JSON.stringify({ operation: 'ZATCA_CREATE_DEVICE', outboxId }),
    });

    return NextResponse.json(responsePayload, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
