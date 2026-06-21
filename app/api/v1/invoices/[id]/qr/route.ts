import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import QRCode from 'qrcode';

async function authenticateRequest() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload && payload.tenantId) return payload;
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await authenticateRequest();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId: session.tenantId as string },
      select: { qrCode: true, qrImage: true },
    });

    if (!invoice || !invoice.qrCode) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }

    if (invoice.qrImage) {
      const base64Data = invoice.qrImage.replace(/^data:image\/png;base64,/, '');
      const imgBuffer = Buffer.from(base64Data, 'base64');
      return new NextResponse(imgBuffer, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    const qrBuffer = await QRCode.toBuffer(invoice.qrCode, { width: 300, margin: 2 });
    const bytes = new Uint8Array(qrBuffer);
    return new NextResponse(bytes, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
