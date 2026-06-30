import { NextRequest, NextResponse } from "next/server";
import { publicError, statusForErrorCode } from "@/lib/errors";

type PublicCode = Parameters<typeof publicError>[0];

export function httpErrorResponse(
  request: NextRequest | undefined,
  code: PublicCode,
  internalContext?: string,
  rawError?: unknown,
  status = statusForErrorCode(code),
): NextResponse {
  const payload = publicError(
    code,
    internalContext,
    rawError,
    request?.headers.get("x-request-id"),
  );

  return NextResponse.json(payload, {
    status,
    headers: {
      "x-request-id": payload.requestId,
    },
  });
}