import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prismaAny = prisma as any;

    let contacts: any[] = [];
    let messagesCount = 0;
    let error: string | null = null;

    try {
      contacts = await prismaAny.whatsAppContact.findMany({
        take: 20,
        orderBy: { lastMessageAt: "desc" },
      });
    } catch (e: any) {
      error = e.message?.substring(0, 200) || "Unknown DB error";
    }

    try {
      const result = await prismaAny.whatsAppMessage.count();
      messagesCount = result;
    } catch {}

    const withCounts = await Promise.all(
      contacts.slice(0, 10).map(async (c: any) => {
        const count = await prismaAny.whatsAppMessage.count({ where: { phone: c.phone } });
        const last = await prismaAny.whatsAppMessage.findFirst({
          where: { phone: c.phone },
          orderBy: { createdAt: "desc" },
          select: { messageText: true, direction: true, createdAt: true },
        });
        return {
          id: c.id,
          tenantId: c.tenantId,
          phone: c.phone,
          name: c.name,
          messagesCount: count,
          lastMessage: last?.messageText?.substring(0, 60) || null,
          lastDirection: last?.direction || null,
        };
      })
    );

    return NextResponse.json({
      error,
      contactsCount: contacts.length,
      messagesCount,
      contacts: withCounts,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
