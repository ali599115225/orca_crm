import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isProductionRuntime,
  requireSuperAdminInDev,
} from '@/lib/api-auth-guard';
import { ErrorCode, publicError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

function maskPhone(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 4) return null;
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  if (isProductionRuntime()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const guardResponse = await requireSuperAdminInDev(request);
  if (guardResponse) return guardResponse;

  try {
    const prismaAny = prisma as any;
    const contacts = await prismaAny.whatsAppContact.findMany({
      take: 10,
      orderBy: { lastMessageAt: 'desc' },
      select: {
        id: true,
        phone: true,
        name: true,
        lastMessageAt: true,
      },
    });

    const messagesCount = await prismaAny.whatsAppMessage.count();

    return NextResponse.json(
      {
        contactsCount: contacts.length,
        messagesCount,
        contacts: contacts.map((contact: any) => ({
          id: contact.id,
          phone: maskPhone(contact.phone),
          hasName: Boolean(contact.name),
          lastMessageAt: contact.lastMessageAt,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      publicError(
        ErrorCode.INTERNAL_ERROR,
        'whatsapp debug query failed',
        error
      ),
      { status: 500 }
    );
  }
}
