// app/api/v1/dashboard/units/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      console.warn(`[UNAUTHORIZED] /api/v1/dashboard/units - IP: ${request.headers.get("x-forwarded-for") || "unknown"}`);
      return NextResponse.json(
        { error: "غير مصرح بالوصول: يرجى تسجيل الدخول أولاً." },
        { status: 401 }
      );
    }
    const companyId = session.tenantId as string;

    const project = await prisma.project.findFirst({
      where: { tenantId: companyId },
    });

    if (!project) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const units = await prisma.unit.findMany({
      where: { projectId: project.id },
      orderBy: [
        { floorPosition: "asc" },
        { unitNumber: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      data: units.map((u) => ({
        id: u.id,
        unitNumber: u.unitNumber,
        floorPosition: u.floorPosition,
        priceSar: Number(u.priceSar),
        status: u.status,
        area: u.area,
      })),
    });

  } catch (error: any) {
    console.error("Failed to query or seed inventory units:", error.message);
    return NextResponse.json(
      { error: "حدث خطأ داخلي أثناء استرجاع مصفوفة المخزون العقاري." },
      { status: 500 }
    );
  }
}