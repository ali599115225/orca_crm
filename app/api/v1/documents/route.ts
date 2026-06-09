import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const linkedTo = searchParams.get('linkedTo');
    const linkedType = searchParams.get('linkedType');

    const where: any = { tenantId: session.tenantId };
    if (linkedTo) where.linkedTo = linkedTo;
    if (linkedType) where.linkedType = linkedType;

    const prismaAny = prisma as any;
    const documents = await prismaAny.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string || (file ? file.name : 'document.pdf');
    const type = formData.get('type') as string || 'OTHER';
    const linkedTo = formData.get('linkedTo') as string || null;
    const linkedType = formData.get('linkedType') as string || null;
    const url = formData.get('url') as string || null;

    if (!file && !url) {
      return NextResponse.json({ success: false, error: 'الملف أو الرابط مطلوب' }, { status: 400 });
    }

    const prismaAny = prisma as any;
    const document = await prismaAny.document.create({
      data: {
        tenantId: session.tenantId,
        name,
        url: url || `/mock-documents/doc-${Date.now()}-${name}`,
        type,
        linkedTo,
        linkedType,
        size: file ? file.size : 0,
      },
    });

    return NextResponse.json({ success: true, data: document });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
