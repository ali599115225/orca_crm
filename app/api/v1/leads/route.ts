// app/api/v1/leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");

    const leads = await prisma.lead.findMany({
      where: {
        tenantId,
        ...(stage ? { stage } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: leads });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, email, city, source, stage, score, projectId, unitId } = body;

    if (!firstName || !phone) {
      return NextResponse.json({ error: "الاسم الأول ورقم الهاتف مطلوبان." }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        firstName,
        lastName,
        phone,
        email,
        city: city || "الرياض",
        source: source || "مباشر",
        status: "NEW", // Default Enum value
        stage: stage || "New",
        score: score || 50,
        leadScore: score || 50,
        projectId: projectId || null,
        unitId: unitId || null,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
    });

    // --- AUTOMATION PLAYBOOK SIMULATION ---
    // 1. Log Telemetry Event
    await prisma.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "lead.created",
        eventDataJson: JSON.stringify({ leadId: lead.id, name: `${firstName} ${lastName || ""}`.trim() }),
        createdBy: userId || null,
      },
    });

    // 2. Add System/Audit Log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "CREATE_LEAD",
        tableName: "leads",
        recordId: lead.id,
        details: `Created new lead for ${firstName} ${lastName || ""}`,
      },
    });

    // 3. Schedule Followup Task Automatically
    await prisma.task.create({
      data: {
        tenantId,
        leadId: lead.id,
        assignedTo: userId || (await prisma.user.findFirst({ where: { tenantId } }))?.id || "",
        title: `تواصل ترحيبي مع العميل: ${firstName}`,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
        priority: "MEDIUM",
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
