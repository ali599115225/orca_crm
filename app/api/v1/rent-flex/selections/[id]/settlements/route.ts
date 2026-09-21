import { NextResponse, type NextRequest } from "next/server";
import { rf12RecordSettlement } from "@/lib/domain/rental/rent-flex-12-application-facade";
import {
  beginRentFlex12WriteRequest,
  optionalRentFlexJsonOrNull,
  optionalRentFlexNonEmptyString,
  optionalRentFlexNonNegativeMoney,
  readRentFlex12JsonObject,
  rentFlex12ApiErrorResponse,
  requiredRentFlexEnum,
  requiredRentFlexUuidValue,
} from "@/lib/domain/rental/rent-flex-12-api-boundary";

const SETTLEMENT_STATUSES = [
  "EXPECTED",
  "PARTIAL",
  "RECEIVED",
  "FAILED",
  "CANCELLED",
] as const;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const boundary = await beginRentFlex12WriteRequest(request);
  if (boundary instanceof NextResponse) return boundary;
  try {
    const { id } = await context.params;
    const body = await readRentFlex12JsonObject(request);
    const data = await rf12RecordSettlement(
      boundary.session,
      requiredRentFlexUuidValue(id),
      {
        status: requiredRentFlexEnum(
          body,
          "status",
          SETTLEMENT_STATUSES,
        ),
        receivedAmount: optionalRentFlexNonNegativeMoney(
          body,
          "receivedAmount",
        ),
        providerReference: optionalRentFlexNonEmptyString(
          body,
          "providerReference",
        ),
        evidenceJson: optionalRentFlexJsonOrNull(body, "evidenceJson"),
      },
    );
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return rentFlex12ApiErrorResponse(error);
  }
}
