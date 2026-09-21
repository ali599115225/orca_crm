import { NextResponse, type NextRequest } from "next/server";
import {
  rf12CreateSelection,
  rf12ListSelections,
} from "@/lib/domain/rental/rent-flex-12-application-facade";
import {
  beginRentFlex12ReadRequest,
  beginRentFlex12WriteRequest,
  optionalRentFlexListLimit,
  optionalRentFlexQueryEnum,
  optionalRentFlexQueryUuid,
  optionalRentFlexUuid,
  readRentFlex12JsonObject,
  rentFlex12ApiErrorResponse,
  requiredRentFlexDateOnly,
  requiredRentFlexEnum,
  requiredRentFlexPositiveMoney,
  requiredRentFlexUuid,
} from "@/lib/domain/rental/rent-flex-12-api-boundary";

const MODES = ["DIRECT_MONTHLY_EJAR", "EXTERNAL_RNPL_12"] as const;
const STATUSES = ["DRAFT", "SELECTED", "LOCKED", "CANCELLED"] as const;

export async function GET(request: NextRequest) {
  const boundary = await beginRentFlex12ReadRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const data = await rf12ListSelections(boundary.session, {
      mode: optionalRentFlexQueryEnum(request, "mode", MODES),
      status: optionalRentFlexQueryEnum(request, "status", STATUSES),
      unitId: optionalRentFlexQueryUuid(request, "unitId"),
      rentalLeaseId: optionalRentFlexQueryUuid(request, "rentalLeaseId"),
      limit: optionalRentFlexListLimit(request),
    });
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return rentFlex12ApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const boundary = await beginRentFlex12WriteRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const body = await readRentFlex12JsonObject(request);
    const data = await rf12CreateSelection(boundary.session, {
      mode: requiredRentFlexEnum(body, "mode", MODES),
      unitId: requiredRentFlexUuid(body, "unitId"),
      leadId: optionalRentFlexUuid(body, "leadId"),
      annualRentAmount: requiredRentFlexPositiveMoney(body, "annualRentAmount"),
      firstDueDate: requiredRentFlexDateOnly(body, "firstDueDate"),
    });
    return NextResponse.json(
      { data },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return rentFlex12ApiErrorResponse(error);
  }
}
