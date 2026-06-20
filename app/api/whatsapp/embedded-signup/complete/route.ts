import { NextRequest, NextResponse } from "next/server";
import {
  completeEmbeddedSignup,
  toEmbeddedSignupError,
} from "@/lib/whatsapp/embedded-signup-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await completeEmbeddedSignup({
      state: String(body?.state || ""),
      code: String(body?.code || ""),
      wabaId: String(body?.wabaId || ""),
      phoneNumberId: String(
        body?.phoneNumberId || "",
      ),
      businessId: body?.businessId
        ? String(body.businessId)
        : null,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const safe = toEmbeddedSignupError(error);

    return NextResponse.json(
      {
        success: false,
        code: safe.code,
      },
      {
        status: safe.status,
      },
    );
  }
}