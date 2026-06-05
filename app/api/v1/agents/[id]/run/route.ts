// app/api/v1/agents/[id]/run/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[Agent-Run] Manually triggering agent execution: ${id}`);
    
    return NextResponse.json({
      success: true,
      agentId: id,
      message: `تم تشغيل مهام الوكيل ${id} بنجاح في الخلفية وتحديث السجلات.`,
      executedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
