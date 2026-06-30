import { httpErrorResponse } from "@/lib/http-error-response";
﻿import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { ErrorCode } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: [] });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/leads failed", error, 500);
  }
}
