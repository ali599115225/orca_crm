import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAndStoreProviderWebhook } from "@/lib/revenue-integrity/trust-gates";
import { REVENUE_PROVIDERS } from "@/lib/revenue-integrity/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 1024 * 1024;

function externalEventId(request: NextRequest, rawBody: string) {
  return (
    request.headers.get("x-event-id") ||
    request.headers.get("idempotency-key") ||
    request.headers.get("x-request-id") ||
    createHash("sha256").update(rawBody).digest("hex")
  );
}

function signature(request: NextRequest) {
  return (
    request.headers.get("x-orca-signature") ||
    request.headers.get("x-signature") ||
    request.headers.get("x-webhook-signature") ||
    request.headers.get("x-hub-signature-256") ||
    ""
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await context.params;
  const provider = String(providerParam || "").toUpperCase();

  if (!REVENUE_PROVIDERS.includes(provider as any)) {
    return NextResponse.json({ ok: false, error: "UNSUPPORTED_PROVIDER" }, { status: 404 });
  }

  const connectionId =
    request.nextUrl.searchParams.get("connectionId") ||
    request.headers.get("x-orca-connection-id");

  if (!connectionId) {
    return NextResponse.json({ ok: false, error: "CONNECTION_ID_REQUIRED" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false, error: "JSON_REQUIRED" }, { status: 415 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  try {
    const stored = await verifyAndStoreProviderWebhook({
      connectionId,
      provider,
      externalEventId: externalEventId(request, rawBody),
      rawBody,
      signature: signature(request),
      payload,
    });

    if (!stored.verified) {
      return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
    }

    return NextResponse.json(
      {
        ok: true,
        duplicate: stored.duplicate,
        webhookId: stored.id,
      },
      { status: stored.duplicate ? 200 : 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "WEBHOOK_PROCESSING_FAILED";
    const status =
      message === "ACTIVE_PROVIDER_CONNECTION_REQUIRED"
        ? 409
        : message === "WEBHOOK_SECRET_NOT_CONFIGURED"
          ? 503
          : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
