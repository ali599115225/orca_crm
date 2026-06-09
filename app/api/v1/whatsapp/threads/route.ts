import { NextRequest, NextResponse } from 'next/server';
import { getMockWhatsAppChatsAction } from '@/app/actions/whatsapp';
import { authenticateRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالوصول' }, { status: 401 });
    }

    const result = await getMockWhatsAppChatsAction();
    if (result.success) {
      return NextResponse.json({ success: true, data: result.chats });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
