import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("[WhatsApp Webhook] GET verification:", {
    mode,
    token_provided: !!token,
    token_match: token === WHATSAPP_VERIFY_TOKEN,
    challenge,
    timestamp: new Date().toISOString(),
  });

  if (!WHATSAPP_VERIFY_TOKEN) {
    console.error("[WhatsApp Webhook] WHATSAPP_VERIFY_TOKEN not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verification SUCCESS — returning challenge");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[WhatsApp Webhook] Verification FAILED — token mismatch");
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const timestamp = new Date().toISOString();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    console.log(
      `[WhatsApp Webhook] POST received at ${timestamp}:`,
      JSON.stringify({
        object: body.object,
        entry_count: body.entry?.length,
        messages: value?.messages?.length || 0,
        statuses: value?.statuses?.length || 0,
      })
    );

    if (value?.messages) {
      for (const msg of value.messages) {
        console.log(`[WhatsApp Webhook] Message from ${msg.from}: ${msg.text?.body?.substring(0, 100) || msg.type}`);
      }
    }

    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`[WhatsApp Webhook] Status: ${status.id} → ${status.status} (${status.timestamp})`);
      }
    }

    return NextResponse.json(
      {
        status: "received",
        timestamp,
        messages_count: value?.messages?.length || 0,
        statuses_count: value?.statuses?.length || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[WhatsApp Webhook] POST error:", error.message);
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }
}
