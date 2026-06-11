import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const META_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const META_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";

    if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
      return NextResponse.json({
        success: false,
        error: "WhatsApp Cloud API not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Vercel.",
        env: {
          access_token_set: !!META_ACCESS_TOKEN,
          phone_number_id_set: !!META_PHONE_NUMBER_ID,
        }
      }, { status: 500 });
    }

    const body = await request.json();
    const { to, message, type } = body;

    if (!to) {
      return NextResponse.json({ success: false, error: "Missing 'to' phone number" }, { status: 400 });
    }

    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
    };

    if (type === "template") {
      payload.type = "template";
      payload.template = {
        name: body.template_name || "hello_world",
        language: { code: body.language || "en_US" },
      };
    } else {
      payload.type = "text";
      payload.text = {
        preview_url: false,
        body: message || "Test message from ORCA CRM",
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${META_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${META_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      result,
      request: {
        to,
        type: payload.type,
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
