import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { submitCsid } from '@/lib/zatca/api';
import { encryptValue } from '@/lib/zatca/encrypt';

export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { deviceId, otp } = body;

    if (!deviceId || !otp) {
      return NextResponse.json({ success: false, error: 'deviceId and otp are required' }, { status: 400 });
    }

    const device = await prisma.zatcaDevice.findFirst({
      where: { id: deviceId, tenantId: session.tenantId as string },
    });

    if (!device || !device.csr) {
      return NextResponse.json({ success: false, error: 'Device not found or CSR not generated' }, { status: 404 });
    }

    const result = await submitCsid(device.csr, otp);

    if (result.success && result.rawResponse?.binarySecurityToken) {
      await prisma.zatcaDevice.update({
        where: { id: device.id },
        data: {
          complianceCert: encryptValue(result.rawResponse.binarySecurityToken),
          status: 'ACTIVE',
        },
      });
    }

    return NextResponse.json({
      success: result.success,
      status: result.status,
      errors: result.errors,
      message: result.success ? 'CSID obtained successfully' : 'CSID request failed',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
