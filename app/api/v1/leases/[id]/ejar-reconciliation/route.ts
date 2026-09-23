import { NextResponse, type NextRequest } from "next/server";
import {
  FINANCE_WRITE_ROLES,
  runWithDatabaseSession,
} from "@/lib/api-auth-guard";
import {
  readRentalClosureJson,
  requiredRentalBoolean,
  requiredRentalNumber,
  requiredRentalString,
  optionalRentalObject,
  optionalRentalString,
  rentalClosureApiErrorResponse,
} from "@/lib/domain/rental/rental-closure-api";
import { reconcileRentalEjarPayment } from "@/lib/domain/rental/rental-closure-service";

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
        const data = await reconcileRentalEjarPayment({
          tenantId: session.tenantId,
          leaseId: id,
          invoiceId: requiredRentalString(body, "invoiceId"),
          providerReference: requiredRentalString(body, "providerReference"),
          amount: requiredRentalNumber(body, "amount"),
          applyPayment: requiredRentalBoolean(body, "applyPayment"),
          evidence: optionalRentalObject(body, "evidence"),
          settledAt: optionalRentalString(body, "settledAt"),
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
