// app/api/whatsapp/webhook/route.ts
// 📱 WhatsApp Cloud API - Meta Webhook Handler
// يستقبل رسائل واتساب الحقيقية من Meta Business API ويحولها لعملاء في النظام

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "orca_whatsapp_verify_2026";
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || "";
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "";

// ===================================================
// GET: التحقق من Webhook (Meta Verification)
// ===================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ WhatsApp Webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// ===================================================
// POST: استقبال رسائل WhatsApp الواردة
// ===================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // التحقق من صحة البيانات القادمة من Meta
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const messages = value?.messages || [];
        const contacts = value?.contacts || [];

        for (const message of messages) {
          if (message.type === "text") {
            await processIncomingWhatsAppMessage({
              from: message.from,
              messageId: message.id,
              text: message.text?.body || "",
              timestamp: message.timestamp,
              contact: contacts[0] || null,
              phoneNumberId: value.metadata?.phone_number_id,
            });
          }
        }
      }
    }

    return NextResponse.json({ status: "OK" }, { status: 200 });
  } catch (error: any) {
    console.error("WhatsApp Webhook Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// ===================================================
// معالجة رسالة واتساب واردة وتحويلها لعميل
// ===================================================
async function processIncomingWhatsAppMessage(data: {
  from: string;
  messageId: string;
  text: string;
  timestamp: string;
  contact: any;
  phoneNumberId: string;
}) {
  try {
    // 1. إيجاد الشركة (Tenant) التي تملك هذا الرقم
    const tenant = await prisma.tenant.findFirst({
      where: { whatsappConnected: true, isActive: true },
    });

    if (!tenant) {
      console.warn("No active tenant found for WhatsApp phone ID:", data.phoneNumberId);
      return;
    }

    // 2. البحث إذا كان العميل موجوداً مسبقاً
    const existingLead = await prisma.lead.findFirst({
      where: {
        tenantId: tenant.id,
        phone: data.from,
      },
    });

    const contactName = data.contact?.profile?.name || `عميل واتساب ${data.from}`;
    const nameParts = contactName.split(" ");
    const firstName = nameParts[0] || "عميل";
    const lastName = nameParts.slice(1).join(" ") || "واتساب";

    if (existingLead) {
      // 3a. إضافة نشاط جديد للعميل الموجود
      await prisma.leadActivity.create({
        data: {
          tenantId: tenant.id,
          leadId: existingLead.id,
          activityType: "WHATSAPP_MESSAGE",
          description: `📱 رسالة واتساب واردة: "${data.text}"`,
        },
      });
    } else {
      // 3b. إنشاء عميل جديد من رسالة واتساب (Round-Robin يُشغَّل عبر DB Trigger)
      const newLead = await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          firstName,
          lastName,
          phone: data.from,
          city: "غير محدد",
          source: "WhatsApp",
          status: "NEW",
          leadScore: 60,
          // assigned_to سيُعيَّن تلقائياً بواسطة trigger_leads_round_robin
        },
      });

      // سجّل الرسالة الأولى كنشاط
      await prisma.leadActivity.create({
        data: {
          tenantId: tenant.id,
          leadId: newLead.id,
          activityType: "WHATSAPP_MESSAGE",
          description: `📱 أول رسالة واتساب من عميل جديد: "${data.text}"`,
        },
      });
    }

    // 4. الرد التلقائي الفوري من الوكيل الذكي
    const aiReply = generateAIReply(data.text, tenant.companyName);
    await sendWhatsAppReply(data.from, aiReply);

  } catch (error: any) {
    console.error("Error processing WhatsApp message:", error);
  }
}

// ===================================================
// توليد ردود الوكيل الذكي
// ===================================================
function generateAIReply(messageText: string, companyName: string): string {
  const msg = messageText.trim().toLowerCase();

  if (msg.includes("سعر") || msg.includes("بكم") || msg.includes("تكلف") || msg.includes("اسعار")) {
    return `مرحباً! 🏠 تبدأ أسعار ${companyName} من 450,000 ر.س للشقق السكنية، و1,200,000 ر.س للفلل المستقلة. هل تود معرفة المزيد أو حجز زيارة؟`;
  }
  if (msg.includes("موقع") || msg.includes("وين") || msg.includes("حي") || msg.includes("مكان")) {
    return `📍 مشاريعنا في أرقى أحياء الرياض وجدة! اتصل بنا أو راسلنا لأرسل لك الموقع التفصيلي والخريطة.`;
  }
  if (msg.includes("تمويل") || msg.includes("قسط") || msg.includes("بنك") || msg.includes("سكني")) {
    return `💰 نعم! جميع مشاريع ${companyName} متوافقة مع برامج التمويل العقاري وبرنامج سكني. سنتواصل معك لشرح خيارات الدفع المناسبة.`;
  }
  if (msg.includes("زيارة") || msg.includes("معاينة") || msg.includes("موعد")) {
    return `🗓️ يسعدنا استقبالك! معارضنا مفتوحة يومياً من 4-9م. ما هو الموعد المناسب لك؟`;
  }

  return `أهلاً بك في ${companyName}! 🌟 شكراً لتواصلك. سيتواصل معك أحد مستشارينا العقاريين خلال دقائق. كيف يمكننا مساعدتك؟`;
}

// ===================================================
// إرسال رد واتساب عبر Meta Cloud API
// ===================================================
async function sendWhatsAppReply(to: string, message: string): Promise<void> {
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log("[Mock WhatsApp Reply] To:", to, "Message:", message);
    return;
  }

  try {
    await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });
  } catch (error) {
    console.error("Failed to send WhatsApp reply:", error);
  }
}
