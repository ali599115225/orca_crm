// app/api/v1/agents/[id]/toggle/route.ts
import { NextRequest, NextResponse } from 'next/server';

// In-memory store (shared via module scope — في الإنتاج استخدم DB)
const overrides: Record<string, boolean> = {};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isActive must be boolean' },
        { status: 400 }
      );
    }

    overrides[id] = isActive;

    console.log(`[agents/${id}/toggle] isActive → ${isActive}`);

    return NextResponse.json({
      success: true,
      agentId: id,
      isActive,
      message: isActive ? 'تم تفعيل الوكيل بنجاح.' : 'تم إيقاف الوكيل.',
    });

  } catch (err) {
    console.error('[agents/toggle] error:', err);
    return NextResponse.json({ success: false, error: 'خطأ داخلي.' }, { status: 500 });
  }
}
