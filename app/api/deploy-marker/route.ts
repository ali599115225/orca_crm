import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    commit: "772b4e3",
    marker: `deploy-marker-${Date.now()}`,
    routes: {
      deploy_marker: "/api/deploy-marker",
      meta_webhook: "/api/whatsapp/meta",
      paylink_webhook: "/api/payments/paylink/webhook",
    }
  });
}
