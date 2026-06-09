import { NextRequest, NextResponse } from 'next/server';
import { rawPrisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.userId!;

    const existing = await rawPrisma.userFavorite.findUnique({
      where: { userId_propertyId: { userId, propertyId: id } },
    });

    if (existing) {
      await rawPrisma.userFavorite.delete({ where: { id: existing.id } });
      return NextResponse.json({
        success: true,
        propertyId: id,
        isFavorite: false,
        message: 'تمت الإزالة من المفضلة.',
      });
    } else {
      await rawPrisma.userFavorite.create({
        data: { tenantId: session.tenantId, userId, propertyId: id },
      });
      return NextResponse.json({
        success: true,
        propertyId: id,
        isFavorite: true,
        message: 'تمت الإضافة إلى المفضلة.',
      });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: 'خطأ داخلي.' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await rawPrisma.userFavorite.findUnique({
      where: { userId_propertyId: { userId: session.userId!, propertyId: id } },
    });

    return NextResponse.json({ propertyId: id, isFavorite: !!existing });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'خطأ داخلي.' }, { status: 500 });
  }
}
