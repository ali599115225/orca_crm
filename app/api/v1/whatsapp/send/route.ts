import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { hashPhone, redactPiiFromPayload } from '@/lib/privacy-mask';

export async function POST(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const body = await request.json();
    const { chatId, message } = body;

    if (!chatId || !message) {
      return NextResponse.json({ success: false, error: 'chatId and message are required' }, { status: 400 });
    }

    const tenantId = session.tenantId as string;

    // Try Meta Cloud API
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({
        success: false,
        error: "WhatsApp Cloud API not configured.",
        env: { access_token_set: !!accessToken, phone_number_id_set: !!phoneNumberId }
      }, { status: 500 });
    }

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: chatId,
          type: "text",
          text: { preview_url: false, body: message },
        }),
      }
    );

    const result = await response.json();

    // Store outbound message
    try {
      await prisma.whatsAppContact.upsert({
        where: { tenantId_phoneHash: { tenantId, phoneHash: hashPhone(tenantId, chatId) } },
        create: { tenantId, phone: chatId, phoneHash: hashPhone(tenantId, chatId), provider: "meta", lastMessageAt: new Date() },
        update: { lastMessageAt: new Date() },
      });
      await prisma.whatsAppMessage.create({
        data: {
          tenantId,
          phone: chatId,
          phoneHash: hashPhone(tenantId, chatId),
          direction: "outbound",
          provider: "meta",
          messageText: message,
          messageType: "text",
          metaMessageId: result.messages?.[0]?.id || null,
          rawPayload: redactPiiFromPayload(result) as any,
          status: response.ok ? "sent" : "failed",
        },
      });
    } catch (dbErr) {
      console.error("[WhatsApp Send] DB error:", dbErr);
    }

    return NextResponse.json({
      success: response.ok,
      provider: "meta",
      metaResponse: result,
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
