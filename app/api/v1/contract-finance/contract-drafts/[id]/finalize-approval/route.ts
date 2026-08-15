import { NextResponse, type NextRequest } from "next/server";
import { w1eFinalizeContractDraftApproval } from "@/lib/domain/contract-finance/application-facade";
import {
  requiredW1gUuidValue,
  w1gApiErrorResponse,
} from "@/lib/domain/contract-finance/api-boundary";
import { beginW1hContractCommandRequest } from "@/lib/domain/contract-finance/contract-command-boundary";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const boundary = await beginW1hContractCommandRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const { id } = await context.params;
    const draft = await w1eFinalizeContractDraftApproval(
      boundary.session,
      requiredW1gUuidValue(id),
    );

    return NextResponse.json(
      { data: draft },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}
