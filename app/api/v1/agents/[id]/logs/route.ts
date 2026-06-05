// app/api/v1/agents/[id]/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mockLogs = [
      {
        id: 'log-1',
        agentId: id,
        action: 'فحص التزام العقد ومراجعة هوية العميل عبر منصة إيجار',
        result: { status: 'SUCCESS', details: 'تأكيد صحة البيانات بنسبة 100%' },
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: 'log-2',
        agentId: id,
        action: 'أتمتة الفوترة الدورية للدفعة الثانية لمشروع فلل النرجس',
        result: { status: 'SUCCESS', invoiceId: 'inv-89213' },
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
      {
        id: 'log-3',
        agentId: id,
        action: 'الرد التلقائي على استفسار تمويل العميل أبو فهد عبر واتساب',
        result: { status: 'SUCCESS', leadId: 'lead-982' },
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      }
    ];

    return NextResponse.json({ success: true, agentId: id, data: mockLogs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 550 });
  }
}
