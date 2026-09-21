import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { ErrorCode } from "@/lib/errors";
import { runWithTenantContext } from "@/lib/tenant-context";

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const tenantId = session.tenantId as string;

    const chats = await runWithTenantContext(
      { tenantId },
      async () => {
        const contacts = await (prisma as any).whatsAppContact.findMany({
          where: { tenantId },
          orderBy: { lastMessageAt: "desc" },
          take: 50,
        });

        return Promise.all(
          contacts.map(async (contact: any) => {
            const messages = await (prisma as any).whatsAppMessage.findMany({
              where: { tenantId, phone: contact.phone },
              orderBy: { createdAt: "asc" },
              take: 50,
            });
            const lastMessage = messages[messages.length - 1];

            return {
              id: contact.id,
              contactName: contact.name || contact.phone,
              contactPhone: contact.phone,
              lastMessage:
                lastMessage?.messageText?.substring(0, 100) || "",
              time:
                lastMessage?.createdAt?.toISOString() ||
                contact.lastMessageAt?.toISOString() ||
                "",
              unread: false,
              messages: messages.map((storedMessage: any) => ({
                sender:
                  storedMessage.direction === "inbound"
                    ? "client"
                    : "agent",
                text: storedMessage.messageText || "",
                time: storedMessage.createdAt?.toISOString() || "",
              })),
            };
          }),
        );
      },
    );

    return NextResponse.json({ success: true, data: chats });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/v1/whatsapp/threads failed", error, 500);
  }
}
