import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { ErrorCode, publicError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const tenantId = session.tenantId as string;

    const contacts = await (prisma as any).whatsAppContact.findMany({
      where: { tenantId },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });

    const chats = await Promise.all(
      contacts.map(async (c: any) => {
        const messages = await (prisma as any).whatsAppMessage.findMany({
          where: { tenantId, phone: c.phone },
          orderBy: { createdAt: 'asc' },
          take: 50,
        });
        const lastMsg = messages[messages.length - 1];
        return {
          id: c.id,
          contactName: c.name || c.phone,
          contactPhone: c.phone,
          lastMessage: lastMsg?.messageText?.substring(0, 100) || '',
          time: lastMsg?.createdAt?.toISOString() || c.lastMessageAt?.toISOString() || '',
          unread: false,
          messages: messages.map((m: any) => ({
            sender: m.direction === 'inbound' ? 'client' : 'agent',
            text: m.messageText || '',
            time: m.createdAt?.toISOString() || '',
          })),
        };
      })
    );

    return NextResponse.json({ success: true, data: chats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "GET /api/v1/whatsapp/threads failed", error).messageAr }, { status: 500 });
  }
}
