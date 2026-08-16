import { NextResponse, type NextRequest } from "next/server";
import { rf12AttachFinanceCase } from "@/lib/domain/rental/rent-flex-12-application-facade";
import {
  beginRentFlex12WriteRequest,
  readRentFlex12JsonObject,
  rentFlex12ApiErrorResponse,
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
    const data = await rf12AttachFinanceCase(
      boundary.session,
      requiredRentFlexUuidValue(id),
      requiredRentFlexUuid(body, "financeCaseId"),
    );
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return rentFlex12ApiErrorResponse(error);
  }
}
