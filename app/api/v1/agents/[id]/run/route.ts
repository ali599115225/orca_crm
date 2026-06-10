import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';

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

    const slot = await prisma.agentSlot.findFirst({
      where: { id, tenantId: session.tenantId as string },
    });

    if (!slot) {
      return NextResponse.json({
        success: false,
        status: "PARTIAL",
        agentId: id,
        message: "فشل تشغيل الوكيل — لم يتم العثور عليه أو ليس ضمن نطاق المنشأة.",
      }, { status: 404 });
    }

    if (!slot.isActive) {
      return NextResponse.json({
        success: false,
        status: "PARTIAL",
        agentId: id,
        message: "الوكيل غير مفعل — يرجى تفعيله أولاً قبل محاولة التشغيل.",
      });
    }

    const agentTypeHandlers: Record<string, () => Promise<{ executed: boolean; details: string }>> = {
      SAHER: async () => {
        const { runSaherTelemetryScanAction } = await import('@/app/actions/saherAgent');
        await runSaherTelemetryScanAction();
        return { executed: true, details: "تم تشغيل فحص ساهر لتحليل البيانات." };
      },
      SENTINEL: async () => {
        const { runSystemDiagnosticsAction } = await import('@/app/actions/sentinel');
        await runSystemDiagnosticsAction();
        return { executed: true, details: "تم تشغيل فحص Sentinel لطبقات النظام." };
      },
    };

    const handler = agentTypeHandlers[slot.agentType];
    if (handler) {
      const result = await handler();
      return NextResponse.json({
        success: true,
        status: "READY",
        agentId: id,
        agentType: slot.agentType,
        message: `تم تشغيل الوكيل ${slot.agentType} بنجاح: ${result.details}`,
        executedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: false,
      status: "PARTIAL",
      agentId: id,
      agentType: slot.agentType,
      message: `نوع الوكيل ${slot.agentType} لا يدعم التشغيل اليدوي المباشر حالياً. الوكيل يعمل تلقائياً عبر النظام.`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      status: "PARTIAL",
      message: error.message || "خطأ في تشغيل الوكيل",
    }, { status: 500 });
  }
}
