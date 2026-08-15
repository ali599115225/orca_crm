import { NextResponse, type NextRequest } from "next/server";
import { w1eSelectProviderOffer } from "@/lib/domain/contract-finance/application-facade";
import {
  requiredW1gUuidValue,
  w1gApiErrorResponse,
} from "@/lib/domain/contract-finance/api-boundary";
import { beginW1hFinanceCommandRequest } from "@/lib/domain/contract-finance/finance-command-boundary";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; offerId: string }> },
) {
  const boundary = await beginW1hFinanceCommandRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const { id, offerId } = await context.params;
    const result = await w1eSelectProviderOffer(
      boundary.session,
      requiredW1gUuidValue(id),
      requiredW1gUuidValue(offerId),
    );

    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}
