import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicError, ErrorCode, createRequestId } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = createRequestId(request.headers.get("x-request-id"));

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "x-request-id": requestId,
        },
      },
    );
  } catch (error) {
    console.error(
      `[HEALTH] readiness check failed | requestId=${requestId}`,
      error,
    );

    const payload = publicError(
      ErrorCode.SERVICE_UNAVAILABLE,
      "readiness check failed",
      undefined,
      requestId,
    );

    return NextResponse.json(payload, {
      status: 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "x-request-id": requestId,
      },
    });
  }
}
