import { NextResponse, type NextRequest } from "next/server";
import { w1eIssueApprovedContractSnapshot } from "@/lib/domain/contract-finance/application-facade";
import {
  optionalW1gJson,
  readW1gJsonObject,
  requiredW1gJson,
  requiredW1gString,
  requiredW1gUuid,
  requiredW1gUuidValue,
  w1gApiErrorResponse,
} from "@/lib/domain/contract-finance/api-boundary";
import {
  beginW1hContractCommandRequest,
  rejectW1hContractCallerSystemFields,
} from "@/lib/domain/contract-finance/contract-command-boundary";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const boundary = await beginW1hContractCommandRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const { id } = await context.params;
    const body = await readW1gJsonObject(request);
    rejectW1hContractCallerSystemFields(body);

    const snapshot = await w1eIssueApprovedContractSnapshot(boundary.session, {
      draftId: requiredW1gUuidValue(id),
      templateVersionId: requiredW1gUuid(body, "templateVersionId"),
      renderedContent: requiredW1gString(body, "renderedContent"),
      structuredFacts: requiredW1gJson(body, "structuredFacts"),
      clauseSnapshot: requiredW1gJson(body, "clauseSnapshot"),
      paymentPlanSnapshot: optionalW1gJson(body, "paymentPlanSnapshot"),
    });

    return NextResponse.json(
      { data: snapshot },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}
