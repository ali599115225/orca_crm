import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tenant = await getActiveTenant();

    // Get recent email messages
    const emailMessages = await prisma.emailMessage.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        to: true,
        subject: true,
        status: true,
        leadId: true,
        providerMessageId: true,
        sentAt: true,
        createdAt: true,
        errorMessage: true,
      },
    });

    // Get recent lead activities of type EMAIL_SENT
    const emailActivities = await prisma.leadActivity.findMany({
      where: {
        tenantId: tenant.id,
        activityType: "EMAIL_SENT",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        leadId: true,
        activityType: true,
        description: true,
        createdAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get a sample lead with email for testing
    const sampleLead = await prisma.lead.findFirst({
      where: {
        tenantId: tenant.id,
        email: { not: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      emailMessages,
      emailActivities,
      sampleLead,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
