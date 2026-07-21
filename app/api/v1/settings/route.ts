import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth-guard';
import { hasDatabaseRoleWithAudit } from '@/lib/authz/legacy-audit-guards';
import { writeAuditLog } from '@/lib/audit';
import { ErrorCode } from "@/lib/errors";

const SETTINGS_READER_ROLES = ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE"] as const;
const SETTINGS_WRITER_ROLES = ["ADMIN"] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session) return unauthorizedResponse(request);
    const allowed = await hasDatabaseRoleWithAudit(
      session,
      SETTINGS_READER_ROLES,
      {
        permissionKey: 'settings.read',
        source: 'GET:/api/v1/settings',
        requestId: request.headers.get('x-request-id'),
        resource: { tenantId: session.tenantId },
      },
    );
    if (!allowed) return forbiddenResponse(request);

    const dbTenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        id: true,
        companyName: true,
        subdomain: true,
        subscriptionPlan: true,
        commercialRegistry: true,
        vatNumber: true,
        nationalAddress: true,
        whatsappConnected: true,
        extraAgents: true,
      },
    });

    return NextResponse.json({ success: true, data: dbTenant });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/v1/settings failed", error, 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    if (!session) return unauthorizedResponse(request);
    // Settings mutations are ADMIN only. G3-06 observes RBAC in shadow mode;
    // this legacy database-backed decision remains authoritative.
    const allowed = await hasDatabaseRoleWithAudit(
      session,
      SETTINGS_WRITER_ROLES,
      {
        permissionKey: 'settings.manage',
        source: 'PUT:/api/v1/settings',
        requestId: request.headers.get('x-request-id'),
        resource: { tenantId: session.tenantId },
      },
    );
    if (!allowed) return forbiddenResponse(request);

    const body = await request.json();
    const { commercialRegistry, vatNumber, nationalAddress, companyName } = body;

    const updated = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        ...(commercialRegistry !== undefined && { commercialRegistry }),
        ...(vatNumber !== undefined && { vatNumber }),
        ...(nationalAddress !== undefined && { nationalAddress }),
        ...(companyName !== undefined && { companyName }),
      },
    });

    await writeAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'SETTINGS_UPDATED',
      tableName: 'tenants',
      recordId: session.tenantId,
      details: JSON.stringify({ commercialRegistry, vatNumber, nationalAddress, companyName }),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "PUT /api/v1/settings failed", error, 500);
  }
}
