// app/api/v1/leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { hashPhone, hashEmail } from "@/lib/privacy-mask";
import { ErrorCode, publicError } from "@/lib/errors";

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
    return NextResponse.json({ error: publicError(ErrorCode.INTERNAL_ERROR, "GET /api/v1/leads failed", error).messageAr }, { status: 500 });
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

    const lead = await prisma.$transaction(async (tx) => {
      await assertPlanLimit({ tenantId, feature: "leads", tx });
      return tx.lead.create({
        data: {
          tenantId,
          firstName,
          lastName,
          phone,
          phoneHash: hashPhone(tenantId, phone),
          email,
          emailHash: email ? hashEmail(email, tenantId) : null,
          city: city || "الرياض",
          source: source || "مباشر",
          status: "NEW",
          stage: stage || "New",
          score: score || 50,
          leadScore: score || 50,
          projectId: projectId || null,
          unitId: unitId || null,
          createdBy: userId || null,
          updatedBy: userId || null,
        },
      });
    });

    // --- AUTOMATION PLAYBOOK SIMULATION (outside transaction — non-critical) ---
    await prisma.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "lead.created",
        eventDataJson: JSON.stringify({ leadId: lead.id, name: `${firstName} ${lastName || ""}`.trim() }),
        createdBy: userId || null,
      },
    });

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

    await prisma.task.create({
      data: {
        tenantId,
        leadId: lead.id,
        assignedTo: userId || (await prisma.user.findFirst({ where: { tenantId } }))?.id || "",
        title: `تواصل ترحيبي مع العميل: ${firstName}`,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: "MEDIUM",
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      await logPlanBlockedAttempt({ tenantId: error.message.includes("TENANT") ? "" : "", error }).catch(() => {});
      return NextResponse.json(error.toJSON(), { status: 403 });
    }
    return NextResponse.json({ error: publicError(ErrorCode.INTERNAL_ERROR, "POST /api/v1/leads failed", error).messageAr }, { status: 500 });
  }
}
