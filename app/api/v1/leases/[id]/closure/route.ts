import { NextResponse, type NextRequest } from "next/server";
import {
  FINANCE_WRITE_ROLES,
  TENANT_ROLES,
  runWithDatabaseSession,
} from "@/lib/api-auth-guard";
import {
  closeRentalLease,
  getRentalClosureSnapshot,
} from "@/lib/domain/rental/rental-closure-service";
import { rentalClosureApiErrorResponse } from "@/lib/domain/rental/rental-closure-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const { id } = await params;
      const data = await getRentalClosureSnapshot({
        tenantId: session.tenantId,
        leaseId: id,
      });
      return NextResponse.json(
        { success: true, data },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      return rentalClosureApiErrorResponse(error);
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(
    request,
    FINANCE_WRITE_ROLES,
    async (session) => {
      try {
        const { id } = await params;
        const data = await closeRentalLease({
          tenantId: session.tenantId,
          leaseId: id,
          actorId: session.userId,
        });
        return NextResponse.json(
          { success: true, data },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (error) {
        return rentalClosureApiErrorResponse(error);
      }
    },
  );
}
