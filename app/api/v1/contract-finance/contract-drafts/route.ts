import { NextResponse, type NextRequest } from "next/server";
import {
  w1eCreateContractDraft,
  w1eListContractDrafts,
} from "@/lib/domain/contract-finance/application-facade";
import {
  beginW1gRequest,
  optionalW1gJson,
  optionalW1gListLimit,
  optionalW1gUuid,
  readW1gJsonObject,
  requiredW1gJson,
  requiredW1gString,
  requiredW1gUuid,
  w1gApiErrorResponse,
} from "@/lib/domain/contract-finance/api-boundary";

export async function GET(request: NextRequest) {
  const boundary = await beginW1gRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const status = request.nextUrl.searchParams.get("status")?.trim() || undefined;
    const financeCaseId = request.nextUrl.searchParams.get("financeCaseId")?.trim() || undefined;
    const contractId = request.nextUrl.searchParams.get("contractId")?.trim() || undefined;
    const limit = optionalW1gListLimit(request);

    const drafts = await w1eListContractDrafts(boundary.session, {
      status,
      financeCaseId: financeCaseId ? requiredW1gUuidValue(financeCaseId) : undefined,
      contractId: contractId ? requiredW1gUuidValue(contractId) : undefined,
      limit,
    });

    return NextResponse.json(
      { data: drafts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const boundary = await beginW1gRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const body = await readW1gJsonObject(request);
    const draft = await w1eCreateContractDraft(boundary.session, {
      templateId: requiredW1gUuid(body, "templateId"),
      templateVersionId: requiredW1gUuid(body, "templateVersionId"),
      contractId: optionalW1gUuid(body, "contractId"),
      financeCaseId: optionalW1gUuid(body, "financeCaseId"),
      title: requiredW1gString(body, "title"),
      contentJson: requiredW1gJson(body, "contentJson"),
      dataBindingsJson: requiredW1gJson(body, "dataBindingsJson"),
      clauseOverridesJson: optionalW1gJson(body, "clauseOverridesJson"),
    });

    return NextResponse.json(
      { data: draft },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}