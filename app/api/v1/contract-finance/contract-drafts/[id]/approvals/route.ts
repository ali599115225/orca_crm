import { NextResponse, type NextRequest } from "next/server";
import { w1eRequestContractApproval } from "@/lib/domain/contract-finance/application-facade";
import {
  optionalW1gJson,
  optionalW1gString,
  readW1gJsonObject,
  requiredW1gString,
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

    const approval = await w1eRequestContractApproval(
      boundary.session,
      requiredW1gUuidValue(id),
      {
        riskTier: requiredW1gString(body, "riskTier"),
        reason: optionalW1gString(body, "reason"),
        evidenceJson: optionalW1gJson(body, "evidenceJson"),
      },
    );

    return NextResponse.json(
      { data: approval },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}
