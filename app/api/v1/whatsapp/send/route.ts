// app/api/v1/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendMockWhatsAppMessageAction } from '@/app/actions/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, message } = body;

    if (!chatId || !message) {
      return NextResponse.json({ success: false, error: 'chatId and message are required' }, { status: 400 });
    }

    const result = await sendMockWhatsAppMessageAction(chatId, message);
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        data: {
          clientMessage: result.clientMessage,
          agentMessage: result.agentMessage
        }
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
