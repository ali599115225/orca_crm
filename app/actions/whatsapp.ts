// app/actions/whatsapp.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

/**
 * تحديث حالة الاتصال بالواتساب للمنشأة الحالية
 */
export async function toggleWhatsAppConnectionAction(connected: boolean) {
  try {
    const tenant = await getActiveTenant();

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        whatsappConnected: connected,
      }
    });

    revalidatePath("/operations/settings");
    revalidatePath("/operations/whatsapp");
    return { success: true };
  } catch (error: any) {
    console.error("خطأ تحديث اتصال الواتساب:", error);
    return { success: false, error: error.message };
  }
}

/**
 * استرجاع قائمة المحادثات — وضع Sandbox للتطوير والاختبار
 */
export async function getMockWhatsAppChatsAction() {
  try {
    const tenant = await getActiveTenant();

    const isSandbox = process.env.WHATSAPP_API_TOKEN ? false : true;

    const mockChats = [
      {
        id: "chat_1",
        contactName: "أبو فهد - الرياض",
        contactPhone: "+966501234567",
        lastMessage: "هل متوفر فلل للبيع في شمال الرياض؟",
        time: "10:30 ص",
        unread: true,
        messages: [
          { sender: "client", text: "السلام عليكم ورحمة الله وبركاته", time: "10:28 ص" },
          { sender: "agent", text: "وعليكم السلام ورحمة الله وبركاته يا أبا فهد. مرحباً بك في شركة العلي العقارية. أنا وكيل المبيعات الآلي المساعد لك اليوم. كيف يمكنني خدمتك بخصوص مشاريعنا السكنية؟", time: "10:29 ص" },
          { sender: "client", text: "أبحث عن فيلا مستقلة في شمال الرياض، هل متوفر لديكم مشاريع حالية؟", time: "10:30 ص" }
        ]
      },
      {
        id: "chat_2",
        contactName: "أميرة العتيبي",
        contactPhone: "+966551122334",
        lastMessage: "كم القسط الشهري المتوقع لباقة التمويل؟",
        time: "أمس",
        unread: false,
        messages: [
          { sender: "client", text: "مرحبا، شفت إعلانكم عن شقق حي الملقا", time: "أمس 4:15 م" },
          { sender: "agent", text: "أهلاً بك أستاذة أميرة. نعم، شقق حي الملقا متوفرة بمساحات ممتازة وتصاميم حديثة. هل ترغبين بالتعرف على الأسعار أم شروط الدفع؟", time: "أمس 4:16 م" },
          { sender: "client", text: "كم القسط الشهري المتوقع لباقة التمويل؟", time: "أمس 4:17 م" }
        ]
      },
      {
        id: "chat_3",
        contactName: "المهندس خالد",
        contactPhone: "+966547788990",
        lastMessage: "تم حجز موعد زيارة للموقع بنجاح",
        time: "25 مايو",
        unread: false,
        messages: [
          { sender: "client", text: "أريد زيارة مشروع الياسمين لمعاينة الشقق على الطبيعة", time: "25 مايو 1:02 م" },
          { sender: "agent", text: "يسعدنا ذلك جداً م. خالد. يتوفر حجز مواعيد زيارة يومياً من 4 م إلى 9 م. ما هو الموعد الأنسب لك؟", time: "25 مايو 1:05 م" },
          { sender: "client", text: "يناسبني غداً الثلاثاء الساعة 5 مساءً", time: "25 مايو 1:08 م" },
          { sender: "agent", text: "تم تأكيد الموعد وإرسال لوكيشن المعرض لجوالك. بانتظار تشريفك لنا!", time: "25 مايو 1:10 م" }
        ]
      }
    ];

    return {
      success: true,
      chats: mockChats,
      tenant,
      source: isSandbox ? "SANDBOX" : "GREENAPI",
      sandbox: isSandbox,
      warning: isSandbox ? "هذه محادثات وهمية للتطوير والاختبار فقط. فعل WHATSAPP_API_TOKEN للانتقال إلى الوضع الحقيقي." : null,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * إرسال رسالة ومحاكاة رد الوكيل — وضع Sandbox للتطوير
 */
export async function sendMockWhatsAppMessageAction(chatId: string, messageText: string) {
  try {
    const tenant = await getActiveTenant();
    const isSandbox = process.env.WHATSAPP_API_TOKEN ? false : true;
    const cleanMsg = messageText.trim().toLowerCase();

    let aiReplyText = "";

    if (cleanMsg.includes("سعر") || cleanMsg.includes("بكم") || cleanMsg.includes("اسعار") || cleanMsg.includes("تكلفتها")) {
      aiReplyText = `🤖 بخصوص الأسعار في مشاريعنا بـ (${tenant.companyName})، تبدأ أسعار الشقق السكنية الفاخرة من 450,000 ريال، والفلل المستقلة تبدأ من 1,200,000 ريال مع توفر خيارات الدفع النقدية أو التمويل الميسر. هل ترغب في إرسال بروشور الأسعار التفصيلي عبر الواتساب؟`;
    } else if (cleanMsg.includes("موقع") || cleanMsg.includes("وين") || cleanMsg.includes("مكان") || cleanMsg.includes("حي")) {
      aiReplyText = `🤖 مشاريعنا العقارية الحالية تقع في أرقى أحياء شمال الرياض (الملقا، النرجس، الياسمين) وفي جدة (حي أبحر الشمالية). تتميز المواقع بالقرب من الخدمات الرئيسية والطرق الحيوية. أي المواقع يثير اهتمامك أكثر؟`;
    } else if (cleanMsg.includes("تمويل") || cleanMsg.includes("قسط") || cleanMsg.includes("بنك") || cleanMsg.includes("بنوك") || cleanMsg.includes("سكني")) {
      aiReplyText = `🤖 نعم يا فندم، جميع مشاريعنا بـ (${tenant.companyName}) متوافقة مع شروط التمويل العقاري لدى البنوك السعودية ومؤسسة النقد (SAMA)، وندعم دعم الإسكان التنموي وسكني. يمكننا ربطك بمستشار تمويلي لحساب الحسبة التقريبية لقسطك الآن. هل تفضل ذلك؟`;
    } else if (cleanMsg.includes("زيارة") || cleanMsg.includes("معاينة") || cleanMsg.includes("موعد") || cleanMsg.includes("اشوف")) {
      aiReplyText = `🤖 يسعدنا تشريفك لمعاينة مشاريعنا على الطبيعة! يتوفر لدينا معرض للمبيعات وفيلا العرض مفتوحة للزيارات يومياً من الساعة 4 عصراً وحتى 9 مساءً. يرجى تزويدي بالموعد الأنسب لك وسأقوم بتأكيد الحجز فوراً وإرسال الموقع الجغرافي لجوالك.`;
    } else {
      aiReplyText = `🤖 أهلاً بك يا فندم، أنا وكيل المبيعات الآلي لـ (${tenant.companyName}). لقد رصدت استفسارك حول "${messageText}". جاري تجهيز الرد الفني الشامل أو تحويلك لأقرب مستشار مبيعات عقاري لخدمتك بشكل أسرع. هل تفضل الاتصال الهاتفي المباشر؟`;
    }

    return {
      success: true,
      source: isSandbox ? "SANDBOX" : "GREENAPI",
      sandbox: isSandbox,
      warning: isSandbox ? "هذه استجابة وهمية مبنية على كلمات مفتاحية. للتجربة الحقيقية، فعل WHATSAPP_API_TOKEN." : null,
      clientMessage: { sender: "client", text: messageText, time: "الآن" },
      agentMessage: { sender: "agent", text: aiReplyText, time: "الآن" }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
