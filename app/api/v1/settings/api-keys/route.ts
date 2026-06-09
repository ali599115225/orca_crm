// R1 FIXED: Authentication + RBAC + Masking + Encryption + Audit
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { encryptText } from '@/lib/crypto';
import { writeAuditLog } from '@/lib/audit';

function maskKey(key: string): string {
  if (key.length <= 8) return '********';
  return '*'.repeat(key.length - 4) + key.slice(-4);
}

function generateApiKey(): string {
  return 'orca_live_sk_' + crypto.randomBytes(24).toString('hex');
}

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'صلاحية ADMIN مطلوبة' }, { status: 403 });
    }

    const prismaAny = prisma as any;
    const keys = await prismaAny.apiKey.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const masked = (keys as any[]).map((k: any) => ({
      id: k.id,
      name: k.name,
      key: maskKey(k.key),
      createdAt: k.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: masked });
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
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'صلاحية ADMIN مطلوبة' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'اسم المفتاح مطلوب' }, { status: 400 });
    }

    const rawKey = generateApiKey();
    const encrypted = encryptText(rawKey);

    const prismaAny = prisma as any;
    const apiKey = await prismaAny.apiKey.create({
      data: {
        tenantId: session.tenantId,
        name: name.trim(),
        key: encrypted,
        createdByUserId: session.userId,
      },
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'API_KEY_CREATED',
      tableName: 'api_keys',
      recordId: apiKey.id,
      details: `Created API key: ${name.trim()}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey,
        createdAt: apiKey.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'صلاحية ADMIN مطلوبة' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const prismaAny = prisma as any;
    const existing = await prismaAny.apiKey.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'المفتاح غير موجود' }, { status: 404 });
    }

    await prismaAny.apiKey.delete({ where: { id } });

    await writeAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'API_KEY_DELETED',
      tableName: 'api_keys',
      recordId: id,
      details: `Deleted API key: ${existing.name}`,
    });

    return NextResponse.json({ success: true, message: 'تم حذف المفتاح' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
