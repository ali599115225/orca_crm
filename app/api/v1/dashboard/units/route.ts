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

    let project = await prisma.project.findFirst({
      where: { tenantId: companyId },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          tenantId: companyId,
          name: "برج النخبة السكني",
          city: "الرياض",
          status: "UNDER_CONSTRUCTION",
        },
      });
    }

    let units = await prisma.unit.findMany({
      where: { projectId: project.id },
      orderBy: [
        { floorPosition: "asc" },
        { unitNumber: "asc" },
      ],
    });

    if (units.length === 0) {
      const unitsData = [];
      for (let i = 0; i < 64; i++) {
        const floor = Math.floor(i / 8) + 1;
        const unitNum = `${floor}${((i % 8) + 1).toString().padStart(2, "0")}`;
        
        let status = "Available";
        if (i % 3 === 0) status = "Sold";
        else if (i % 7 === 0) status = "Reserved";

        const price = 2200000 + (i % 6) * 450000;

        unitsData.push({
          projectId: project.id,
          unitNumber: unitNum,
          floorPosition: floor,
          priceSar: price,
          status: status,
        });
      }

      await prisma.unit.createMany({
        data: unitsData.map(u => ({ ...u, tenantId: companyId })),
      });

      units = await prisma.unit.findMany({
        where: { projectId: project.id },
        orderBy: [
          { floorPosition: "asc" },
          { unitNumber: "asc" },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      data: units.map((u) => ({
        id: u.id,
        unitNumber: u.unitNumber,
        floorPosition: u.floorPosition,
        priceSar: Number(u.priceSar),
        status: u.status,
        area: 160 + (Number(u.unitNumber) % 5) * 35,
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
