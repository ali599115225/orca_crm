// app/api/v1/tours/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const tour = await prisma.tour.findFirst({
      where: { id, tenantId },
    });

    if (!tour) {
      return NextResponse.json({ error: "الجولة العقارية غير موجودة." }, { status: 404 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "الحالة المستهدفة (status) مطلوبة." }, { status: 400 });
    }

    const updatedTour = await prisma.tour.update({
      where: { id },
      data: {
        status,
        updatedBy: userId || null,
        auditLog: `${tour.auditLog || ""}\nUpdated status to ${status} at ${new Date().toISOString()}`.trim(),
      },
    });

    // Log telemetry
    await prisma.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "tour.statusChanged",
        eventDataJson: JSON.stringify({ tourId: tour.id, status }),
        createdBy: userId || null,
      },
    });

    // Automation playbook trigger: if Tour is COMPLETED, create a follow-up task automatically!
    if (status.toUpperCase() === "COMPLETED") {
      const task = await prisma.task.create({
        data: {
          tenantId,
          leadId: tour.leadId,
          assignedTo: tour.assignedTo,
          title: "متابعة العميل وإرسال عرض السعر بعد إتمام الجولة العقارية الميدانية",
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
          priority: "HIGH",
          status: "PENDING",
        },
      });

      // Update lead status to "VISITED" as well!
      await prisma.lead.updateMany({
        where: { id: tour.leadId, tenantId },
        data: {
          status: "VISITED",
          stage: "Negotiation",
        },
      });

      return NextResponse.json({ success: true, data: updatedTour, followUpCreated: true, taskId: task.id });
    }

    return NextResponse.json({ success: true, data: updatedTour });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
