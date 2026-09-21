import { httpErrorResponse } from "@/lib/http-error-response";
// app/api/v1/whatsapp/send/route.ts
// WhatsApp send adapter — delegates to centralized send-service
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send-service";
import { ErrorCode } from "@/lib/errors";
import { runWithTenantContext } from "@/lib/tenant-context";

export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to, message } = body;
    if (!to || !message) {
      return NextResponse.json({ success: false, error: "Missing to or message" }, { status: 400 });
    }

    const result = await runWithTenantContext(
      { tenantId: session.tenantId },
      () => sendWhatsAppMessage(session.tenantId, to, message),
    );

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      metaMessageId: result.metaMessageId,
      error: result.error,
      errorCode: result.errorCode,
    });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/whatsapp/send failed", error, 500);
  }
}
