// app/api/v1/dashboard/telemetry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 🛡️ استخراج معرف المنشأة الممرر آلياً من خلال Middleware الخاص بالـ JWT
    const companyId = request.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json(
        { error: "غير مصرح بالوصول: معرف المنشأة العقارية (x-company-id) مفقود." },
        { status: 400 }
      );
    }

    // جلب آخر 20 سجل تتبع تفاعلي للوكلاء لهذه المنشأة
    const telemetryLogs = await prisma.agentTelemetryLog.findMany({
      where: { tenantId: companyId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: telemetryLogs.map((log) => ({
        id: log.id,
        agentId: log.agentId,
        actionType: log.actionType,
        logMessageAr: log.logMessageAr,
        severity: log.severity,
        createdAt: log.createdAt,
      })),
    });

  } catch (error: any) {
    console.error("Failed to fetch tenant isolated agent telemetry logs:", error.message);
    return NextResponse.json(
      { error: "حدث خطأ داخلي أثناء جلب سجلات بث الوكلاء الذاتيين." },
      { status: 500 }
    );
  }
}
