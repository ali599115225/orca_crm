import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';

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

    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'التذكرة غير موجودة' }, { status: 404 });
    }

    const prismaAny = prisma as any;
    const replies = await prismaAny.ticketReply.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: replies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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
    const body = await request.json();
    const { message, sender } = body;

    if (!message || !sender) {
      return NextResponse.json({ success: false, error: 'Message and sender are required' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'التذكرة غير موجودة' }, { status: 404 });
    }

    const prismaAny = prisma as any;
    const reply = await prismaAny.ticketReply.create({
      data: {
        ticketId: id,
        message,
        sender,
        createdByUserId: session.userId,
      },
    });

    return NextResponse.json({ success: true, data: reply });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
