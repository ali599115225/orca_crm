import { NextResponse, type NextRequest } from "next/server";
import { rf12ActivateDirectInvoices } from "@/lib/domain/rental/rent-flex-12-accounting-facade";
import {
  beginRentFlex12DirectInvoicingRequest,
  rentFlex12ApiErrorResponse,
  requiredRentFlexUuidValue,
} from "@/lib/domain/rental/rent-flex-12-api-boundary";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const boundary = await beginRentFlex12DirectInvoicingRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const { id } = await context.params;
    const data = await rf12ActivateDirectInvoices(
      boundary.session,
      requiredRentFlexUuidValue(id),
    );
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return rentFlex12ApiErrorResponse(error);
  }
}
