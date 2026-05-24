// lib/notifications.ts

const SMS_API_KEY = process.env.SMS_API_KEY || "mock_sms_key_for_testing";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "mock_whatsapp_token_for_testing";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "mock_id";

/**
 * إرسال رسالة SMS نصية (متوافقة مع موفري الخدمات مثل MSegat أو Unifonic)
 */
export async function sendSMSNotification(to: string, message: string) {
  try {
    // وضع التجربة والمحاكاة الفورية في سجلات السيرفر (Vercel / Local Logs)
    if (SMS_API_KEY.startsWith("mock_")) {
      console.log(`📱 [سجل الإشعارات السحابي - SMS] ➔ تم الإرسال لجوال: ${to} | نص الرسالة: "${message}"`);
      return { success: true, mock: true };
    }

    // الاتصال الفعلي ببوابة الـ SMS (مثال: بوابة ميسجات السعودية MSegat API)
    const response = await fetch("https://api.msegat.com/gw/sendsms.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userName: process.env.MSEGAT_USERNAME,
        apiKey: SMS_API_KEY,
        userSender: process.env.MSEGAT_SENDER_NAME || "ORCA-CRM",
        numbers: to.replace("+", ""), // إزالة علامة الزائد للأرقام الدولية
        msg: message,
      }),
    });

    return { success: response.ok };
  } catch (error) {
    console.error("فشل إرسال رسالة الـ SMS السحابية:", error);
    return { success: false, error };
  }
}

/**
 * إرسال رسالة WhatsApp ذكية (متوافقة مع Meta Cloud API أو Twilio)
 */
export async function sendWhatsAppNotification(to: string, templateName: string, parameters: string[]) {
  try {
    // وضع التجربة والمحاكاة الفورية في سجلات السيرفر (Vercel / Local Logs)
    if (WHATSAPP_TOKEN.startsWith("mock_")) {
      console.log(`💬 [سجل الإشعارات السحابي - WhatsApp] ➔ تم إرسال قالب (${templateName}) لجوال: ${to} | المتغيرات: [${parameters.join(", ")}]`);
      return { success: true, mock: true };
    }

    // الاتصال الفعلي ببوابة واتساب للأعمال الرسمية (Meta Cloud API)
    const response = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace("+", ""),
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "ar",
          },
          components: [
            {
              type: "body",
              parameters: parameters.map(param => ({
                type: "text",
                text: param,
              })),
            },
          ],
        },
      }),
    });

    return { success: response.ok };
  } catch (error) {
    console.error("فشل إرسال رسالة الواتساب السحابية:", error);
    return { success: false, error };
  }
}