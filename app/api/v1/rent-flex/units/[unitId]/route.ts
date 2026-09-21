import { NextResponse, type NextRequest } from "next/server";
import {
  rf12ConfigureUnit,
  rf12GetUnitConfig,
} from "@/lib/domain/rental/rent-flex-12-application-facade";
import {
  beginRentFlex12ReadRequest,
  beginRentFlex12WriteRequest,
  optionalRentFlexEnum,
  readRentFlex12JsonObject,
  rentFlex12ApiErrorResponse,
  requiredRentFlexBoolean,
  requiredRentFlexUuidValue,
} from "@/lib/domain/rental/rent-flex-12-api-boundary";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ unitId: string }> },
) {
  const boundary = await beginRentFlex12ReadRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const { unitId } = await context.params;
    const data = await rf12GetUnitConfig(
      boundary.session,
      requiredRentFlexUuidValue(unitId),
    );
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return rentFlex12ApiErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ unitId: string }> },
) {
  const boundary = await beginRentFlex12WriteRequest(request);
  if (boundary instanceof NextResponse) return boundary;

  try {
    const { unitId } = await context.params;
    const body = await readRentFlex12JsonObject(request);
    const data = await rf12ConfigureUnit(
      boundary.session,
      requiredRentFlexUuidValue(unitId),
      {
        externalRnplEnabled: requiredRentFlexBoolean(
          body,
          "externalRnplEnabled",
        ),
        status: optionalRentFlexEnum(body, "status", ["ACTIVE", "DISABLED"]),
      },
    );
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return rentFlex12ApiErrorResponse(error);
  }
}
