import { NextResponse, type NextRequest } from "next/server";
import { w1eRecordProviderOffer } from "@/lib/domain/contract-finance/application-facade";
import {
  optionalW1gNonNegativeDecimalInput,
  optionalW1gPositiveInteger,
  optionalW1gString,
  readW1gJsonObject,
  requiredW1gJson,
  requiredW1gString,
  requiredW1gUuidValue,
  W1gRequestError,
  w1gApiErrorResponse,
} from "@/lib/domain/contract-finance/api-boundary";
import {
  beginW1hFinanceCommandRequest,
  optionalW1hIsoDate,
  requiredW1hPositiveDecimalInput,
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
    const termMonths = optionalW1gPositiveInteger(body, "termMonths");
    if (termMonths === undefined || termMonths === null) {
      throw new W1gRequestError("W1G_INVALID_INPUT");
    }

    const result = await w1eRecordProviderOffer(
      boundary.session,
      requiredW1gUuidValue(id),
      {
        provider: requiredW1gString(body, "provider"),
        providerReference: requiredW1gString(body, "providerReference"),
        productName: optionalW1gString(body, "productName"),
        amount: requiredW1hPositiveDecimalInput(body, "amount"),
        downPayment: optionalW1gNonNegativeDecimalInput(body, "downPayment"),
        monthlyPayment: optionalW1gNonNegativeDecimalInput(body, "monthlyPayment"),
        fees: optionalW1gNonNegativeDecimalInput(body, "fees"),
        termMonths,
        annualRate: optionalW1gNonNegativeDecimalInput(body, "annualRate"),
        expiresAt: optionalW1hIsoDate(body, "expiresAt"),
        evidenceJson: requiredW1gJson(body, "evidenceJson"),
      },
    );

    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return w1gApiErrorResponse(error);
  }
}
