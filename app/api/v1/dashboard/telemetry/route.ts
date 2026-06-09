// app/api/v1/dashboard/telemetry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      console.warn(`[UNAUTHORIZED] /api/v1/dashboard/telemetry - IP: ${request.headers.get("x-forwarded-for") || "unknown"}`);
      return NextResponse.json(
        { error: "غير مصرح بالوصول: يرجى تسجيل الدخول أولاً." },
        { status: 401 }
      );
    }
    const companyId = session.tenantId as string;

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
