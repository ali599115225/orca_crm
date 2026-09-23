import { NextResponse, type NextRequest } from "next/server";
import {
  FINANCE_WRITE_ROLES,
  runWithDatabaseSession,
} from "@/lib/api-auth-guard";
import {
  readRentalClosureJson,
  requiredRentalString,
  optionalRentalNumber,
  rentalClosureApiErrorResponse,
} from "@/lib/domain/rental/rental-closure-api";
import { renewRentalLease } from "@/lib/domain/rental/rental-closure-service";

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
        const data = await renewRentalLease({
          tenantId: session.tenantId,
          leaseId: id,
          newStartDate: requiredRentalString(body, "newStartDate"),
          newEndDate: requiredRentalString(body, "newEndDate"),
          newRentAmount: optionalRentalNumber(body, "newRentAmount"),
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
