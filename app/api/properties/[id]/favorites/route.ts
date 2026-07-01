import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  notFoundResponse,
  requireDatabaseSession,
  TENANT_ROLES,
} from "@/lib/api-auth-guard";
import { runWithTenantContext } from "@/lib/tenant-context";

async function ensureTenantUnit(
  propertyId: string,
  tenantId: string,
) {
  return prisma.unit.findFirst({
    where: {
      id: propertyId,
      project: { tenantId },
    },
    select: { id: true },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const session = auth.session;

    return await runWithTenantContext(
      { tenantId: session.tenantId, userId: session.userId },
      async () => {
        const unit = await ensureTenantUnit(id, session.tenantId);
        if (!unit) {
          return notFoundResponse(request);
        }

        const existing = await prisma.userFavorite.findFirst({
          where: {
            tenantId: session.tenantId,
            userId: session.userId,
            propertyId: id,
          },
          select: { id: true },
        });

        if (existing) {
          await prisma.userFavorite.deleteMany({
            where: {
              id: existing.id,
              tenantId: session.tenantId,
              userId: session.userId,
              propertyId: id,
            },
          });

          return NextResponse.json({
            success: true,
            propertyId: id,
            isFavorite: false,
            message: "تمت الإزالة من المفضلة.",
          });
        }

        await prisma.userFavorite.create({
          data: {
            tenantId: session.tenantId,
            userId: session.userId,
            propertyId: id,
          },
        });

        return NextResponse.json({
          success: true,
          propertyId: id,
          isFavorite: true,
          message: "تمت الإضافة إلى المفضلة.",
        });
      },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "خطأ داخلي." },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const session = auth.session;

    return await runWithTenantContext(
      { tenantId: session.tenantId, userId: session.userId },
      async () => {
        const unit = await ensureTenantUnit(id, session.tenantId);
        if (!unit) {
          return notFoundResponse(request);
        }

        const existing = await prisma.userFavorite.findFirst({
          where: {
            tenantId: session.tenantId,
            userId: session.userId,
            propertyId: id,
          },
          select: { id: true },
        });

        return NextResponse.json({ propertyId: id, isFavorite: Boolean(existing) });
      },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "خطأ داخلي." },
      { status: 500 },
    );
  }
}
