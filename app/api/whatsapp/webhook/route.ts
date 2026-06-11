// app/api/whatsapp/webhook/route.ts
// 📱 Webhook Handler — Green API + Meta Cloud API
// يستقبل رسائل واتساب من Green API (Instance: 7107636615) ومن Meta Cloud API
// ويُحوِّلها فوراً للوكيل ساهر للتأهيل والإسناد الذكي

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processSaherWhatsAppLeadAction } from "@/app/actions/saherAgent";

// ─── إعدادات Green API ───────────────────────────────────────────────────────
const GREEN_API_ID_INSTANCE =
  process.env.GREEN_API_ID_INSTANCE ||
  process.env.WHATSAPP_INSTANCE_ID ||
  "7107636615";

const GREEN_API_TOKEN_INSTANCE =
  process.env.GREEN_API_TOKEN_INSTANCE ||
  process.env.WHATSAPP_API_TOKEN ||
  "";

const GREEN_API_URL =
  process.env.GREEN_API_URL ||
  process.env.WHATSAPP_API_URL ||
  "https://7107.api.greenapi.com";

// ─── إعدادات Meta Cloud API ───────────────────────────────────────────────────
const META_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const META_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const META_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";
const META_API_VERSION = "v25.0";

let WEBHOOK_SECRET: string | undefined;
function ensureWebhookSecret() {
  if (!WEBHOOK_SECRET) {
    WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET;
  }
}

// ─── هيكل رسائل Green API ───────────────────────────────────────────────────

interface GreenAPIWebhookBody {
  typeWebhook: string;
  instanceData?: { idInstance: number; wid: string; typeInstance: string; };
  timestamp?: number;
  idMessage?: string;
  senderData?: { chatId: string; chatName: string; sender: string; senderName: string; senderContactName?: string; };
  messageData?: { typeMessage: string; textMessageData?: { textMessage: string; }; imageMessageData?: { caption?: string; }; };
}

// ═══════════════════════════════════════════════════════════════════
// GET: Webhook Verification (Meta + Green API)
// ═══════════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  ensureWebhookSecret();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token && WEBHOOK_SECRET && token === WEBHOOK_SECRET) {
    return NextResponse.json({ status: "Webhook active", instance: GREEN_API_ID_INSTANCE });
  }

  const mode = searchParams.get("hub.mode");
  const hubToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && hubToken && WEBHOOK_SECRET && hubToken === WEBHOOK_SECRET) {
    console.log("[WhatsApp Webhook] Meta verification SUCCESS");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: "OK" }, { status: 200 });
}

// ═══════════════════════════════════════════════════════════════════
// POST: استقبال رسائل واردة (Green API + Meta Cloud API)
// ═══════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  ensureWebhookSecret();
  try {
    const signature = request.headers.get("x-greenapi-signature") || request.headers.get("x-hub-signature") || "";
    const authHeader = request.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const queryToken = new URL(request.url).searchParams.get("token") || "";

    const tokenOk = WEBHOOK_SECRET && (
      signature === WEBHOOK_SECRET ||
      bearerToken === WEBHOOK_SECRET ||
      queryToken === WEBHOOK_SECRET
    );

    if (!tokenOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // ─── Meta Cloud API Payload ──────────────────────────────────────
    if (body.object === "whatsapp_business_account") {
      return handleMetaInbound(body);
    }

    // ─── Green API Payload ───────────────────────────────────────────
    return handleGreenAPIInbound(body);

  } catch (error: any) {
    console.error("[WhatsApp Webhook] خطأ:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// ─── معالجة رسائل Meta Cloud API الواردة ─────────────────────────────

async function handleMetaInbound(body: any) {
  const entry = body.entry?.[0];
  if (!entry) return NextResponse.json({ status: "no_entry" });

  const changes = entry.changes?.[0];
  const value = changes?.value;
  if (!value) return NextResponse.json({ status: "no_value" });

  const messages = value.messages;
  const statuses = value.statuses;

  // معالجة الرسائل الواردة
  if (messages && Array.isArray(messages)) {
    for (const msg of messages) {
      const senderPhone = msg.from;
      const messageText = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.id || "";
      const msgType = msg.type;

      console.log(`[Meta WhatsApp] Inbound from ${senderPhone}: ${messageText?.substring(0, 100)}`);

      if (messageText) {
        await processSaherWhatsAppLeadAction({
          senderPhone,
          senderName: value.contacts?.[0]?.profile?.name || senderPhone,
          messageText,
          timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
          chatId: senderPhone,
        });
      }
    }
  }

  // معالجة تحديثات الحالة
  if (statuses && Array.isArray(statuses)) {
    for (const status of statuses) {
      console.log(`[Meta WhatsApp] Status: ${status.id} → ${status.status} (${status.timestamp})`);
    }
  }

  return NextResponse.json({
    status: "processed",
    provider: "meta",
    messages_count: messages?.length || 0,
    statuses_count: statuses?.length || 0,
  });
}

// ─── معالجة رسائل Green API الواردة ──────────────────────────────────

async function handleGreenAPIInbound(body: GreenAPIWebhookBody) {
  if (body.typeWebhook !== "incomingMessageReceived") {
    return NextResponse.json({ status: "ignored", type: body.typeWebhook });
  }

  const textMessage =
    body.messageData?.textMessageData?.textMessage ||
    body.messageData?.imageMessageData?.caption ||
    "";

  if (!textMessage || !body.senderData) {
    return NextResponse.json({ status: "no_text" });
  }

  const rawPhone = body.senderData.sender || body.senderData.chatId;
  const senderPhone = "+" + rawPhone.replace("@c.us", "").replace("@g.us", "");
  const senderName = body.senderData.senderName || body.senderData.chatName || "";
  const chatId = body.senderData.chatId;

  console.log(`[Green API→Saher] رسالة واردة | ${textMessage.substring(0, 50)}...`);

  const saherResult = await processSaherWhatsAppLeadAction({
    senderPhone,
    senderName,
    messageText: textMessage,
    timestamp: new Date((body.timestamp || Date.now() / 1000) * 1000).toISOString(),
    chatId,
  });

  if (saherResult.responseToClient) {
    await sendWhatsAppReply(chatId, saherResult.responseToClient);
  }

  return NextResponse.json({
    status: "processed",
    provider: "greenapi",
    leadId: saherResult.leadId,
    assignedTo: saherResult.assignedTo,
    saherAction: saherResult.saherOutput?.action,
  });
}

// ═══════════════════════════════════════════════════════════════════
// إرسال رسائل صادرة (Meta Cloud API + Green API fallback)
// ═══════════════════════════════════════════════════════════════════

async function sendWhatsAppReply(to: string, message: string): Promise<void> {
  // Try Meta Cloud API first
  if (META_ACCESS_TOKEN && META_PHONE_NUMBER_ID) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${META_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { preview_url: false, body: message },
          }),
        }
      );

      if (response.ok) {
        console.log(`[Meta WhatsApp] Reply sent to ${to}`);
        return;
      }
      const errData = await response.json();
      console.error(`[Meta WhatsApp] Send error: ${JSON.stringify(errData)}`);
    } catch (err: any) {
      console.error("[Meta WhatsApp] Send exception:", err.message);
    }
  }

  // Fallback to Green API
  if (GREEN_API_TOKEN_INSTANCE && !GREEN_API_TOKEN_INSTANCE.startsWith("ضع_هنا")) {
    try {
      const endpoint = `${GREEN_API_URL}/waInstance${GREEN_API_ID_INSTANCE}/sendMessage/${GREEN_API_TOKEN_INSTANCE}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: `${to}@c.us`, message, linkPreview: false }),
      });
      if (response.ok) {
        console.log(`[Green API] Reply sent to ${to}`);
        return;
      }
    } catch (err: any) {
      console.error("[Green API] Send exception:", err.message);
    }
  }

  console.log(`[WhatsApp Mock] Reply to ${to}: ${message.substring(0, 100)}`);
}
