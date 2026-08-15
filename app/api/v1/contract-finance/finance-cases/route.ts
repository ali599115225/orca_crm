import { NextResponse, type NextRequest } from "next/server";
import {
  w1eCreateFinanceCase,
  w1eListFinanceCases,
} from "@/lib/domain/contract-finance/application-facade";
import {
  beginW1gRequest,
  optionalW1gJson,
  optionalW1gListLimit,
  optionalW1gNonNegativeDecimalInput,
  optionalW1gPositiveInteger,
  optionalW1gUuid,
  readW1gJsonObject,
  requiredW1gString,
  w1gApiErrorResponse,
} from "@/lib/domain/contract-finance/api-boundary";

export async function GET(request: NextRequest) {
  const boundary = await beginW1gRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const internalStatus = request.nextUrl.searchParams.get("internalStatus")?.trim() || undefined;
    const limit = optionalW1gListLimit(request);
    const financeCases = await w1eListFinanceCases(boundary.session, {
      internalStatus,
      limit,
    });

    return NextResponse.json(
      { data: financeCases },
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
    const financeCase = await w1eCreateFinanceCase(boundary.session, {
      caseNumber: requiredW1gString(body, "caseNumber"),
      leadId: optionalW1gUuid(body, "leadId"),
      unitId: optionalW1gUuid(body, "unitId"),
      contractId: optionalW1gUuid(body, "contractId"),
      purpose: requiredW1gString(body, "purpose"),
      propertySource: requiredW1gString(body, "propertySource"),
      requestedAmount: optionalW1gNonNegativeDecimalInput(body, "requestedAmount"),
      propertyValue: optionalW1gNonNegativeDecimalInput(body, "propertyValue"),
      downPayment: optionalW1gNonNegativeDecimalInput(body, "downPayment"),
      termMonths: optionalW1gPositiveInteger(body, "termMonths"),
      annualRate: optionalW1gNonNegativeDecimalInput(body, "annualRate"),
      monthlyIncome: optionalW1gNonNegativeDecimalInput(body, "monthlyIncome"),
      monthlyCommitments: optionalW1gNonNegativeDecimalInput(body, "monthlyCommitments"),
      advisoryDsrLimit: optionalW1gNonNegativeDecimalInput(body, "advisoryDsrLimit"),
      metadata: optionalW1gJson(body, "metadata"),
    });

    return NextResponse.json(
      { data: financeCase },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}