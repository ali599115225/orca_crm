// app/api/whatsapp/webhook/route.ts
// 📱 Green API Webhook Handler — Orca CRM
// يستقبل رسائل واتساب من Green API (Instance: 7107636615)
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

let WEBHOOK_SECRET: string | undefined;
function ensureWebhookSecret() {
  if (!WEBHOOK_SECRET) {
    WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET;
  }
}

// ─── هيكل رسائل Green API ───────────────────────────────────────────────────

interface GreenAPIWebhookBody {
  typeWebhook: string;           // "incomingMessageReceived" | "outgoingMessageReceived" | ...
  instanceData?: {
    idInstance: number;
    wid: string;
    typeInstance: string;
  };
  timestamp?: number;
  idMessage?: string;
  senderData?: {
    chatId: string;             // "966501234567@c.us"
    chatName: string;           // اسم المحادثة
    sender: string;             // "966501234567@c.us"
    senderName: string;         // اسم المُرسِل
    senderContactName?: string;
  };
  messageData?: {
    typeMessage: string;        // "textMessage" | "imageMessage" | ...
    textMessageData?: {
      textMessage: string;      // نص الرسالة
    };
    imageMessageData?: {
      caption?: string;
    };
  };
}

// ═══════════════════════════════════════════════════════════════════
// GET: التحقق من Webhook (لا تستخدمه Green API — لكن نُبقيه للتوافقية)
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
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: "OK" }, { status: 200 });
}

// ═══════════════════════════════════════════════════════════════════
// POST: استقبال رسائل Green API الواردة → ساهر
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

    const body: GreenAPIWebhookBody = await request.json();

    // تجاهل الرسائل الصادرة والتحديثات غير الجوهرية
    if (body.typeWebhook !== "incomingMessageReceived") {
      return NextResponse.json({ status: "ignored", type: body.typeWebhook });
    }

    // التأكد من أن الرسالة نصية
    const messageType = body.messageData?.typeMessage;
    const textMessage =
      body.messageData?.textMessageData?.textMessage ||
      body.messageData?.imageMessageData?.caption ||
      "";

    if (!textMessage || !body.senderData) {
      return NextResponse.json({ status: "no_text" });
    }

    // استخراج رقم الهاتف (إزالة "@c.us" من نهاية المعرف)
    const rawPhone = body.senderData.sender || body.senderData.chatId;
    const senderPhone = "+" + rawPhone.replace("@c.us", "").replace("@g.us", "");
    const senderName = body.senderData.senderName || body.senderData.chatName || "";
    const chatId = body.senderData.chatId;

    console.log(
      `[WhatsApp→Saher] رسالة واردة | من: مشفر | ${textMessage.substring(0, 50)}...`
    );

    // ─── تسليم الرسالة للوكيل ساهر للتأهيل الفوري ──────────────────
    const saherResult = await processSaherWhatsAppLeadAction({
      senderPhone,
      senderName,
      messageText: textMessage,
      timestamp: new Date(
        (body.timestamp || Date.now() / 1000) * 1000
      ).toISOString(),
      chatId,
    });

    // ─── إرسال رد الوكيل ساهر عبر Green API ──────────────────────────
    if (saherResult.responseToClient) {
      await sendGreenAPIReply(chatId, saherResult.responseToClient);
    }

    return NextResponse.json({
      status: "processed",
      leadId: saherResult.leadId,
      assignedTo: saherResult.assignedTo,
      saherAction: saherResult.saherOutput?.action,
    });

  } catch (error: any) {
    console.error("[WhatsApp Webhook] خطأ:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════
// إرسال رد عبر Green API
// ═══════════════════════════════════════════════════════════════════
async function sendGreenAPIReply(chatId: string, message: string): Promise<void> {
  if (!GREEN_API_TOKEN_INSTANCE || GREEN_API_TOKEN_INSTANCE.startsWith("ضع_هنا")) {
    console.log("[Green API - Mock] الرد:", message);
    return;
  }

  try {
    const endpoint = `${GREEN_API_URL}/waInstance${GREEN_API_ID_INSTANCE}/sendMessage/${GREEN_API_TOKEN_INSTANCE}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        message,
        linkPreview: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Green API] فشل الإرسال (${response.status}):`, errText);
    } else {
      console.log(`[Green API] تم إرسال رد ساهر بنجاح`);
    }
  } catch (error: any) {
    console.error("[Green API] خطأ في الإرسال:", error.message);
  }
}
