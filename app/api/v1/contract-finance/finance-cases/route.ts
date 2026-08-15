import { NextResponse, type NextRequest } from "next/server";
import {
  w1eCreateFinanceCase,
  w1eListFinanceCases,
} from "@/lib/domain/contract-finance/application-facade";
import {
  beginW1gRequest,
  optionalW1gDecimalInput,
  optionalW1gInteger,
  optionalW1gJson,
  optionalW1gListLimit,
  optionalW1gString,
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
      leadId: optionalW1gString(body, "leadId"),
      unitId: optionalW1gString(body, "unitId"),
      contractId: optionalW1gString(body, "contractId"),
      purpose: requiredW1gString(body, "purpose"),
      propertySource: requiredW1gString(body, "propertySource"),
      requestedAmount: optionalW1gDecimalInput(body, "requestedAmount"),
      propertyValue: optionalW1gDecimalInput(body, "propertyValue"),
      downPayment: optionalW1gDecimalInput(body, "downPayment"),
      termMonths: optionalW1gInteger(body, "termMonths"),
      annualRate: optionalW1gDecimalInput(body, "annualRate"),
      monthlyIncome: optionalW1gDecimalInput(body, "monthlyIncome"),
      monthlyCommitments: optionalW1gDecimalInput(body, "monthlyCommitments"),
      advisoryDsrLimit: optionalW1gDecimalInput(body, "advisoryDsrLimit"),
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
