import { NextResponse, type NextRequest } from "next/server";
import { w1eDecideContractApproval } from "@/lib/domain/contract-finance/application-facade";
import {
  optionalW1gJson,
  optionalW1gString,
  readW1gJsonObject,
  requiredW1gUuidValue,
  w1gApiErrorResponse,
} from "@/lib/domain/contract-finance/api-boundary";
import {
  beginW1hContractCommandRequest,
  rejectW1hContractCallerSystemFields,
  requiredW1hApprovalDecision,
} from "@/lib/domain/contract-finance/contract-command-boundary";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ approvalId: string }> },
) {
  const boundary = await beginW1hContractCommandRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const { approvalId } = await context.params;
    const body = await readW1gJsonObject(request);
    rejectW1hContractCallerSystemFields(body);

    const approval = await w1eDecideContractApproval(
      boundary.session,
      requiredW1gUuidValue(approvalId),
      {
        decision: requiredW1hApprovalDecision(body),
        reason: optionalW1gString(body, "reason"),
        evidenceJson: optionalW1gJson(body, "evidenceJson"),
      },
    );

    return NextResponse.json(
      { data: approval },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}
