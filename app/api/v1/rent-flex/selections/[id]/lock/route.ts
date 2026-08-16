import { NextResponse, type NextRequest } from "next/server";
import { rf12LockSelection } from "@/lib/domain/rental/rent-flex-12-application-facade";
import {
  beginRentFlex12WriteRequest,
  rentFlex12ApiErrorResponse,
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
    const data = await rf12LockSelection(
      boundary.session,
      requiredRentFlexUuidValue(id),
    );
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return rentFlex12ApiErrorResponse(error);
  }
}
