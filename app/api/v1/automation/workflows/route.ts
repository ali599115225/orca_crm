// app/api/v1/automation/workflows/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { ErrorCode, publicError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const workflows = await prisma.automationWorkflow.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: workflows });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(ErrorCode.INTERNAL_ERROR, "GET /api/v1/automation/workflows failed", error).messageAr }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { name, triggerEvent, actionsJson, isActive } = body;

    if (!name || !triggerEvent || !actionsJson) {
      return NextResponse.json({ error: "الاسم والحدث المشغل والإجراءات مطلوبة." }, { status: 400 });
    }

    const workflow = await prisma.automationWorkflow.create({
      data: {
        tenantId,
        name,
        triggerEvent,
        actionsJson: typeof actionsJson === "string" ? actionsJson : JSON.stringify(actionsJson),
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
    });

    return NextResponse.json({ success: true, data: workflow }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(ErrorCode.INTERNAL_ERROR, "POST /api/v1/automation/workflows failed", error).messageAr }, { status: 500 });
  }
}
