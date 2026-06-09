import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { generateEcdsaKeyPair, generateCsr, encryptPrivateKey } from '@/lib/zatca/device';

export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const devices = await prisma.zatcaDevice.findMany({
      where: { tenantId: session.tenantId as string },
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

export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { deviceName, deviceType } = body;

    if (!deviceName) {
      return NextResponse.json({ success: false, error: 'deviceName is required' }, { status: 400 });
    }

    const keyPair = generateEcdsaKeyPair();

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId as string },
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
        tenantId: session.tenantId as string,
        deviceName,
        deviceType: deviceType || 'COMPLIANCE',
        csr,
        privateKey: encryptedPrivateKey,
        publicKey: keyPair.publicKey,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      device: {
        id: device.id,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        csr: device.csr,
        publicKey: device.publicKey,
        status: device.status,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
