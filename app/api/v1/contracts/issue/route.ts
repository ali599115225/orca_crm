import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CONTRACT_WRITE_ROLES,
  TENANT_ROLES,
  runWithDatabaseSession,
} from "@/lib/api-auth-guard";
import { issueContract } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const [leads, contacts, units] = await Promise.all([
        prisma.lead.findMany({
          where: { tenantId: session.tenantId },
          orderBy: { createdAt: "desc" },
          select: { id: true, firstName: true, lastName: true, phone: true },
        }),
        prisma.contact.findMany({
          where: { tenantId: session.tenantId },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, phone: true },
        }),
        prisma.unit.findMany({
          where: { tenantId: session.tenantId },
          include: { project: { select: { name: true } }, contract: true },
          orderBy: [{ project: { name: "asc" } }, { unitNumber: "asc" }],
        }),
      ]);

      return NextResponse.json({
        success: true,
        clients: [
          ...leads.map((lead) => ({
            id: lead.id,
            name: `${lead.firstName} ${lead.lastName || ""}`.trim(),
            phone: lead.phone,
            type: "lead",
          })),
          ...contacts.map((contact) => ({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            type: "contact",
          })),
        ],
        properties: units
          .filter((unit) => !unit.contract)
          .map((unit) => ({
            id: unit.id,
            unitNumber: unit.unitNumber,
            priceSar: Number(unit.priceSar),
            status: unit.status,
            projectName: unit.project.name,
          })),
      });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/contracts/issue failed",
        error,
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return runWithDatabaseSession(request, CONTRACT_WRITE_ROLES, async (session) => {
    try {
      const body = await request.json();
      const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
      const propertyId = typeof body.propertyId === "string" ? body.propertyId.trim() : "";
      const amount = Number(body.amount);

      if (!clientId || !propertyId || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, error: "العميل والوحدة وقيمة العقد الصحيحة مطلوبة." },
          { status: 400 },
        );
      }

      const contract = await issueContract({
        tenantId: session.tenantId,
        userId: session.userId,
        clientId,
        propertyId,
        amount,
      });

      return NextResponse.json(
        {
          success: true,
          contract: {
            id: contract.id,
            buyerName: contract.buyerName,
            buyerPhone: contract.buyerPhone,
            totalVolumeSar: Number(contract.totalVolumeSar),
            status: contract.status,
            acceptedAt: contract.acceptedAt.toISOString(),
            reservationExpiresAt:
              contract.reservationExpiresAt?.toISOString() || null,
            signedAt: contract.signedAt?.toISOString() || null,
          },
        },
        { status: 201 },
      );
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "POST /api/v1/contracts/issue failed",
        error,
      );
    }
  });
}
