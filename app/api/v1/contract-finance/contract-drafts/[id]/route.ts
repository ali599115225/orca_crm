import { NextResponse, type NextRequest } from "next/server";
import { w1eGetContractDraft } from "@/lib/domain/contract-finance/application-facade";
import {
  beginW1gRequest,
  requiredW1gUuidValue,
  w1gApiErrorResponse,
} from "@/lib/domain/contract-finance/api-boundary";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const boundary = await beginW1gRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const { id } = await context.params;
    const draft = await w1eGetContractDraft(
      boundary.session,
      requiredW1gUuidValue(id),
    );
    if (!draft) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { data: draft },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}