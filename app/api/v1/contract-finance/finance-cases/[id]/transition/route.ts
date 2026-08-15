import { NextResponse, type NextRequest } from "next/server";
import { w1eTransitionFinanceCase } from "@/lib/domain/contract-finance/application-facade";
import {
  readW1gJsonObject,
  requiredW1gUuidValue,
  w1gApiErrorResponse,
} from "@/lib/domain/contract-finance/api-boundary";
import {
  beginW1hFinanceCommandRequest,
  requiredW1hFinanceStatus,
} from "@/lib/domain/contract-finance/finance-command-boundary";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const boundary = await beginW1hFinanceCommandRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const { id } = await context.params;
    const body = await readW1gJsonObject(request);
    const result = await w1eTransitionFinanceCase(
      boundary.session,
      requiredW1gUuidValue(id),
      requiredW1hFinanceStatus(body),
    );

    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}
