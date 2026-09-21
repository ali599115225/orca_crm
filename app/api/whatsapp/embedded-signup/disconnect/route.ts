import { NextResponse } from "next/server";
import {
  disconnectEmbeddedSignup,
  toEmbeddedSignupError,
} from "@/lib/whatsapp/embedded-signup-service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result =
      await disconnectEmbeddedSignup();

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