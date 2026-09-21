import { NextResponse, type NextRequest } from "next/server";
import { w1eIssueApprovedContractSnapshot } from "@/lib/domain/contract-finance/application-facade";
import {
  requiredW1gUuidValue,
  w1gApiErrorResponse,
} from "@/lib/domain/contract-finance/api-boundary";
import {
  assertW1hEmptyCommandBody,
  beginW1hContractCommandRequest,
} from "@/lib/domain/contract-finance/contract-command-boundary";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const boundary = await beginW1hContractCommandRequest(request);
    if (boundary instanceof NextResponse) return boundary;

    await assertW1hEmptyCommandBody(request);
    const { id } = await context.params;
    const draftId = requiredW1gUuidValue(id);
    const snapshot = await w1eIssueApprovedContractSnapshot(boundary.session, { draftId });

    return NextResponse.json(
      { data: snapshot },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}
