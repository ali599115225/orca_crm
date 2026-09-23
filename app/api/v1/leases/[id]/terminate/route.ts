import { NextResponse, type NextRequest } from "next/server";
import {
  FINANCE_WRITE_ROLES,
  runWithDatabaseSession,
} from "@/lib/api-auth-guard";
import {
  readRentalClosureJson,
  requiredRentalString,
  rentalClosureApiErrorResponse,
} from "@/lib/domain/rental/rental-closure-api";
import { terminateRentalLease } from "@/lib/domain/rental/rental-closure-service";

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
        const body = await readRentalClosureJson(request);
        const data = await terminateRentalLease({
          tenantId: session.tenantId,
          leaseId: id,
          effectiveDate: requiredRentalString(body, "effectiveDate"),
          reason: requiredRentalString(body, "reason"),
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
