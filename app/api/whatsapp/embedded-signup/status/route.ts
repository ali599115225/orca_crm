import { NextResponse } from "next/server";
import {
  getEmbeddedSignupStatus,
  toEmbeddedSignupError,
} from "@/lib/whatsapp/embedded-signup-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status =
      await getEmbeddedSignupStatus();

    return NextResponse.json({
      success: true,
      ...status,
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