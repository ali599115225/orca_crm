import { NextResponse, type NextRequest } from "next/server";
import { rf12AttachOfferTerms } from "@/lib/domain/rental/rent-flex-12-application-facade";
import {
  beginRentFlex12WriteRequest,
  readRentFlex12JsonObject,
  rentFlex12ApiErrorResponse,
  requiredRentFlexDateOnly,
  requiredRentFlexPositiveMoney,
  requiredRentFlexUuid,
  requiredRentFlexUuidValue,
} from "@/lib/domain/rental/rent-flex-12-api-boundary";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const boundary = await beginRentFlex12WriteRequest(request);
  if (boundary instanceof NextResponse) return boundary;
  try {
    const { id } = await context.params;
    const body = await readRentFlex12JsonObject(request);
    const data = await rf12AttachOfferTerms(
      boundary.session,
      requiredRentFlexUuidValue(id),
      {
        financeProviderOfferId: requiredRentFlexUuid(
          body,
          "financeProviderOfferId",
        ),
        ownerSettlementAmount: requiredRentFlexPositiveMoney(
          body,
          "ownerSettlementAmount",
        ),
        totalTenantPayable: requiredRentFlexPositiveMoney(
          body,
          "totalTenantPayable",
        ),
        firstDueDate: requiredRentFlexDateOnly(body, "firstDueDate"),
      },
    );
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return rentFlex12ApiErrorResponse(error);
  }
}
