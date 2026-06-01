// app/actions/growth.ts
"use server";

import { prisma, rawPrisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { encryptText, decryptText } from "@/lib/crypto";
import { authorizeAgentAccess } from "@/lib/licensing";

// تكلفت الحملات التسويقية الافتراضية لكل مصدر إعلاني (ثابتة لأغراض حساب الاستعاضة والاستحواذ)
const SOURCE_MARKETING_SPEND: Record<string, number> = {
  "Google Ads": 18500,
  "Meta Ads": 14200,
  "Snapchat Ads": 11500,
  "TikTok Ads": 9800,
  "X Ads": 7600,
  "LinkedIn Ads": 12500,
  "Organic": 0,
  "Direct": 0
};

/**
 * جلب بيانات إحصاءات النمو والعائد الإعلاني (Marketing ROI)
 */
export async function getGrowthMarketingStatsAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    // 1. جلب المشاريع السكنية مع العملاء المحتملين والعقود التابعة لها
    const projects = await prisma.project.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
        leads: true,
        units: {
          include: {
            contract: true
          }
        }
      }
    });

    // 2. تحليل مصادر العملاء والإنفاق العائد لكل منها
    const leads = await prisma.lead.findMany({
      where: { tenantId: tenant.id }
    });

    const totalLeads = leads.length;

    // حساب عقود المبيعات الكلية
    const closedLeads = leads.filter(l => l.status === "CONTRACT_SIGNED" || l.status === "WON");
    const closedSalesCount = closedLeads.length;

    // توزيع المصادر
    const sourcesCount: Record<string, number> = {};
    leads.forEach(l => {
      const src = l.source || "Organic";
      sourcesCount[src] = (sourcesCount[src] || 0) + 1;
    });

    const sourcesBreakdown = Object.entries(sourcesCount).map(([source, count]) => {
      const spend = SOURCE_MARKETING_SPEND[source] || 0;
      const closedCount = closedLeads.filter(l => (l.source || "Organic") === source).length;
      const cac = closedCount > 0 ? Math.round(spend / closedCount) : spend;
      return {
        source,
        count,
        spend,
        cac,
        conversionRate: count > 0 ? ((closedCount / count) * 100).toFixed(1) + "%" : "0.0%"
      };
    });

    // 3. حساب تكلفة الاستحواذ (CAC) وقيمة العقد (Contract Value) لكل مشروع
    const projectStats = projects.map(p => {
      const pLeads = p.leads.length;
      const pClosedLeads = p.leads.filter(l => l.status === "CONTRACT_SIGNED" || l.status === "WON").length;
      
      // حساب إجمالي قيمة العقود للمشروع
      let contractValue = 0;
      p.units.forEach(u => {
        if (u.contract) {
          contractValue += Number(u.contract.totalVolumeSar);
        }
      });

      // الإنفاق التسويقي التقريبي للمشروع بناءً على توزيع مصادر عملائه
      let estimatedMarketingSpend = 0;
      p.leads.forEach(l => {
        const src = l.source || "Organic";
        const baseCost = src === "Google Ads" ? 150 : src === "Meta Ads" ? 120 : src === "Snapchat Ads" ? 100 : src === "TikTok Ads" ? 90 : src === "X Ads" ? 80 : src === "LinkedIn Ads" ? 200 : 0;
        estimatedMarketingSpend += baseCost;
      });

      const cac = pClosedLeads > 0 ? Math.round(estimatedMarketingSpend / pClosedLeads) : 0;

      return {
        id: p.id,
        name: p.name,
        city: p.city,
        leadsCount: pLeads,
        closedDeals: pClosedLeads,
        marketingSpend: estimatedMarketingSpend,
        cac,
        contractValue
      };
    });

    // 4. حساب المؤشرات العامة الكلية للنمو
    const totalSpend = Object.values(SOURCE_MARKETING_SPEND).reduce((a, b) => a + b, 0);
    const totalContractValue = projectStats.reduce((acc, curr) => acc + curr.contractValue, 0);
    const avgCac = closedSalesCount > 0 ? Math.round(totalSpend / closedSalesCount) : 0;
    const marketingRoi = totalSpend > 0 ? Math.round(((totalContractValue - totalSpend) / totalSpend) * 100) : 0;

    return {
      success: true,
      data: {
        totalLeads,
        closedSalesCount,
        totalSpend,
        totalContractValue,
        avgCac,
        marketingRoi,
        sourcesBreakdown,
        projectStats
      }
    };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * جلب مسارات المتابعة الآلية للوكيل منصور
 */
export async function getFollowupSequencesAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    let sequences = await prisma.followupSequence.findMany({
      where: { tenantId: tenant.id },
      orderBy: { delayDays: "asc" }
    });

    // إذا لم تكن هناك مسارات، نقوم بتهيئة مسارات افتراضية لضمان عمل اللوحة فوراً
    if (sequences.length === 0) {
      const defaults = [
        {
          status: "INTERESTED",
          delayDays: 1,
          message: "مرحباً بك يا فندم! رصدنا اهتمامك بمشاريعنا السكنية المميزة. هل تود حجز موعد زيارة للموقع غداً لمعاينة الفلل على الطبيعة؟ - منصور"
        },
        {
          status: "INTERESTED",
          delayDays: 3,
          message: "السلام عليكم أخي الكريم، أحببت تذكيرك بخصومات الدفع النقدي الحالية بنسبة 7% على فلل الياسمين. هل ترغب بحساب الحسبة التقريبية؟ - منصور"
        },
        {
          status: "STUDY",
          delayDays: 2,
          message: "مرحباً بك أخي العزيز. بخصوص العرض العقاري المقدم، هل لديك أي استفسارات أو ملاحظات تود تعديلها بخصوص المساحات أو نظام الدفعات؟ - منصور"
        },
        {
          status: "CLOSED",
          delayDays: 1,
          message: "تهانينا الحارة لك على توقيع عقد فيلتك الجديدة! نحن فخورون باختيارك لنا. تم إرسال جدول الدفعات والضمانات الفنية لحسابك. - منصور"
        }
      ];

      await Promise.all(
        defaults.map(def =>
          prisma.followupSequence.create({
            data: {
              tenantId: tenant.id,
              status: def.status,
              delayDays: def.delayDays,
              message: def.message,
              isActive: true
            }
          })
        )
      );

      sequences = await prisma.followupSequence.findMany({
        where: { tenantId: tenant.id },
        orderBy: { delayDays: "asc" }
      });
    }

    return { success: true, data: sequences };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * حفظ أو تعديل مسار متابعة آلي
 */
export async function saveFollowupSequenceAction(data: {
  id?: string;
  status: string;
  delayDays: number;
  message: string;
  isActive?: boolean;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    if (data.id) {
      await prisma.followupSequence.update({
        where: { id: data.id, tenantId: tenant.id },
        data: {
          status: data.status,
          delayDays: data.delayDays,
          message: data.message,
          isActive: data.isActive !== undefined ? data.isActive : true
        }
      });
    } else {
      await prisma.followupSequence.create({
        data: {
          tenantId: tenant.id,
          status: data.status,
          delayDays: data.delayDays,
          message: data.message,
          isActive: true
        }
      });
    }

    revalidatePath("/operations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * حذف مسار متابعة آلي
 */
export async function deleteFollowupSequenceAction(id: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    await prisma.followupSequence.delete({
      where: { id, tenantId: tenant.id }
    });

    revalidatePath("/operations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * جلب محادثات الوكيل منصور المشفرة والمنتهية بقواعد البيانات
 */
export async function getMansourChatsAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    let chats = await prisma.mansourChat.findMany({
      where: { tenantId: tenant.id },
      orderBy: { updatedAt: "desc" }
    });

    // في حال عدم وجود محادثات، نقوم بتهيئة محادثات وهمية تمثل عمل منصور الفعلي مع leads حقيقيين
    if (chats.length === 0) {
      const dbLeads = await prisma.lead.findMany({
        where: { tenantId: tenant.id },
        take: 3
      });

      const sampleChats = [
        {
          contactName: dbLeads[0] ? `${dbLeads[0].firstName} ${dbLeads[0].lastName || ""}`.trim() : "عبدالرحمن السديري",
          contactPhone: dbLeads[0] ? dbLeads[0].phone : "+966505051122",
          leadId: dbLeads[0] ? dbLeads[0].id : null,
          lastMessage: "أريد كتالوج الأسعار لو سمحت",
          status: "INTERESTED",
          messages: [
            { sender: "client", text: "أهلاً، رأيت إعلان مشروع النخبة السكني", time: "11:20 ص" },
            { sender: "mansour", text: "مرحباً بك أخي الكريم! أنا منصور وكيل المبيعات الآلي المساعد لك بخصوص مشروع النخبة. كيف يمكنني إفادتك اليوم؟ - منصور", time: "11:21 ص" },
            { sender: "client", text: "أريد كتالوج الأسعار لو سمحت", time: "11:22 ص" }
          ]
        },
        {
          contactName: dbLeads[1] ? `${dbLeads[1].firstName} ${dbLeads[1].lastName || ""}`.trim() : "م. منيرة الفيصل",
          contactPhone: dbLeads[1] ? dbLeads[1].phone : "+966533112233",
          leadId: dbLeads[1] ? dbLeads[1].id : null,
          lastMessage: "هل العرض يشمل الإفراغ الفوري؟",
          status: "STUDY",
          messages: [
            { sender: "client", text: "السلام عليكم، بخصوص الفلل في الياسمين المتاحة بالمنصة", time: "أمس" },
            { sender: "mansour", text: "وعليكم السلام ورحمة الله وبركاته أختي الفاضلة. نعم، فلل الياسمين تمتاز بتشطيب نخبوي وضمانات تصل لـ ٢٠ سنة. كيف يمكنني خدمتك؟ - منصور", time: "أمس" },
            { sender: "client", text: "هل العرض يشمل الإفراغ الفوري؟", time: "أمس" }
          ]
        }
      ];

      await Promise.all(
        sampleChats.map(c => {
          const encryptedJson = encryptText(JSON.stringify(c.messages));
          return prisma.mansourChat.create({
            data: {
              tenantId: tenant.id,
              leadId: c.leadId,
              contactName: c.contactName,
              contactPhone: c.contactPhone,
              lastMessage: c.lastMessage,
              status: c.status,
              messagesJson: encryptedJson
            }
          });
        })
      );

      chats = await prisma.mansourChat.findMany({
        where: { tenantId: tenant.id },
        orderBy: { updatedAt: "desc" }
      });
    }

    // فك تشفير محادثات العميل لسلامة العرض في الواجهة
    return {
      success: true,
      data: chats.map(chat => {
        let messages = [];
        try {
          const decrypted = decryptText(chat.messagesJson);
          messages = decrypted ? JSON.parse(decrypted) : [];
        } catch (e) {
          console.error("خطأ فك تشفير محادثات منصور:", e);
        }
        return {
          ...chat,
          messages
        };
      })
    };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * إرسال رسالة في شات منصور ومحاكاة استجابة الوكيل الذكي المشفرة
 */
export async function sendMansourMessageAction(chatId: string, messageText: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    // 🔒 التحقق من الترخيص وصلاحيات الوكيل منصور
    const authCheck = await authorizeAgentAccess("MANSOUR");
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.message || "Access Denied", isRestricted: true };
    }

    // 1. جلب الشات الحالي
    const chat = await prisma.mansourChat.findUnique({
      where: { id: chatId, tenantId: tenant.id }
    });

    if (!chat) throw new Error("المحادثة غير موجودة.");

    // 2. فك تشفير الرسائل السابقة
    let messages = [];
    try {
      const decrypted = decryptText(chat.messagesJson);
      messages = decrypted ? JSON.parse(decrypted) : [];
    } catch (e) {
      console.error("فشل فك تشفير شات منصور للرسالة الجديدة:", e);
    }

    // 3. إضافة رسالة العميل
    const nowTime = new Date().toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' });
    messages.push({
      sender: "client",
      text: messageText,
      time: nowTime
    });

    // 4. محاكاة رد الوكيل منصور الذكي
    const cleanMsg = messageText.trim().toLowerCase();
    let replyText = "";

    if (cleanMsg.includes("بروشور") || cleanMsg.includes("برشور") || cleanMsg.includes("كتالوج") || cleanMsg.includes("تفاصيل")) {
      replyText = `🤖 أهلاً بك يا فندم. لقد قمت بإرسال الكتالوج التفصيلي والمخططات الهندسية لوحداتنا السكنية بنجاح عبر الواتساب. هل تفضل الاتفاق على موعد لزيارة المعرض أو فيلا العرض لمشاهدة جودة التشطيب على الطبيعة؟ - منصور`;
    } else if (cleanMsg.includes("دفعة") || cleanMsg.includes("اقساط") || cleanMsg.includes("أقساط") || cleanMsg.includes("قسط")) {
      replyText = `🤖 نظام الدفع المعتمد في مشاريعنا هو دفعة مقدمة حجز 10% ثم دفعات متوازية مع مراحل البناء العقاري أو التمويل عبر البنوك. يمكنني ربطك الآن بالقسم المالي لتهيئة حسبة تناسب راتبك الشهري. ما رأيك؟ - منصور`;
    } else if (cleanMsg.includes("موقع") || cleanMsg.includes("وين") || cleanMsg.includes("حي")) {
      replyText = `🤖 مشاريعنا تتركز في أرقى مناطق شمال وشرق الرياض بأسعار تنافسية. تتوفر لدينا فلل العرض للزيارة يومياً من 4 م إلى 9 م. هل تود حجز موعد زيارة اليوم وسأرسل لك الموقع؟ - منصور`;
    } else {
      replyText = `🤖 أهلاً بك يا فندم. لقد سجلت استفسارك بخصوص "${messageText}" وسأقوم بأتمتة المتابعة معك ومع القسم المختص لتجهيز الرد الأوفى. كيف يمكنني خدمتك أيضاً بخصوص مشاريعنا؟ - منصور`;
    }

    messages.push({
      sender: "mansour",
      text: replyText,
      time: nowTime
    });

    // 5. تشفير وحفظ الشات الجديد
    const encryptedJson = encryptText(JSON.stringify(messages));
    await prisma.mansourChat.update({
      where: { id: chatId },
      data: {
        lastMessage: replyText,
        messagesJson: encryptedJson,
        updatedAt: new Date()
      }
    });

    return { success: true, messages };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * تقارير الوكيل الاستشرافي بصير (Baseer AI Insight Forecast) حول أداء الإعلانات وقنوات النمو
 */
export async function getBaseerInsightAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    // 🔒 التحقق من الترخيص وصلاحيات الوكيل بصير
    const authCheck = await authorizeAgentAccess("BASEER");
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.message || "Access Denied", isRestricted: true };
    }

    const statsResult = await getGrowthMarketingStatsAction();
    if (!statsResult.success || !statsResult.data) {
      throw new Error("فشل جمع البيانات اللازمة لتحليلات الوكيل بصير.");
    }

    const { sourcesBreakdown, projectStats } = statsResult.data;

    // صياغة تحليل استشرافي ذكي بناءً على الأرقام الفعلية
    const bestSource = sourcesBreakdown.reduce((prev, current) => {
      const prevRate = parseFloat(prev.conversionRate);
      const currRate = parseFloat(current.conversionRate);
      return currRate > prevRate ? current : prev;
    }, sourcesBreakdown[0] || { source: "Organic", conversionRate: "0.0%" });

    const reportMarkdown = `
### 🔮 تقرير الوكيل الاستشرافي "بصير" - تحليل الحملات التسويقية وعوائد النمو لعام ٢٠٢٦م

أهلاً بك يا فندم. لقد قمت بتحليل تدفق العملاء المحتملين وتكاليف الاستحواذ (CAC) مقابل قيم العقود المغلقة في أنظمتنا. إليك التقرير الاستراتيجي:

#### 1. القناة الإعلانية الأفضل أداءً (Best Performed Campaign)
* **القناة المتصدرة**: **${bestSource.source}** بمعدل تحويل صفقات يصل إلى **${bestSource.conversionRate}**.
* **تحليل العائد**: تكلفة الاستحواذ (CAC) عبر هذه القناة تبلغ حوالي **${bestSource.cac.toLocaleString("ar-SA")} ر.س**، وهو ما يقع ضمن النطاق الآمن والمربح للمنشأة مقارنة بمتوسط حجم الصفقات البالغ **١.٢ مليون ر.س**.

#### 2. تقييم كفاءة مشاريع الاستثمار السكنية
${projectStats.map((p: any) => `
* **مشروع ${p.name}** (${p.city}):
  * إجمالي العملاء المحتملين: **${p.leadsCount} عميل**.
  * صفقات مغلقة مكتملة: **${p.closedDeals} صفقات**.
  * قيمة العقود النشطة: **${p.contractValue.toLocaleString("ar-SA")} ر.س**.
  * متوسط تكلفة الاستحواذ الفعلي للمشتري (CAC): **${p.cac.toLocaleString("ar-SA")} ر.س**.
`).join("")}

#### 3. التوصيات الاستراتيجية الفورية (Strategic Recommendations)
* 💡 **زيادة الميزانية الإعلانية**: نوصي بنقل **25%** من الميزانية المخصصة للقنوات ذات الأداء المنخفض إلى **${bestSource.source}** لتحسين وتأمين تدفق العملاء.
* 🤖 **تنشيط المتابعة للوكيل منصور**: تشير البيانات إلى أن العملاء من مصادر التواصل الاجتماعي يحتاجون إلى متابعة خلال أول **٢٤ ساعة**، نوصي بتفعيل مسار المتابعة التلقائي للرد الفوري لتقليل نسبة تسريب العملاء بنسبة تصل إلى **١٨٪**.
* 🎯 **الاستهداف الجغرافي**: تشير تحليلات المبيعات الجغرافية إلى زيادة الطلب في **شمال الرياض**، يفضل تركيز الحملات القادمة حول الفلل الفاخرة هناك.
`;

    return { success: true, insight: reportMarkdown };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * جلب جميع منصات الإعلانات وحالة الربط والتهيئات الخاصة بالمستأجر الحالي
 */
export async function getPlatformConnectionsAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    const dbConnections = await prisma.platformConnection.findMany({
      where: { tenantId: tenant.id }
    });

    const platforms = ["GOOGLE", "META", "TIKTOK", "SNAPCHAT", "TWITTER", "LINKEDIN"];
    
    const defaultWelcomeMsgs: Record<string, string> = {
      GOOGLE: "مرحباً بك! رصدنا اهتمامك بمشاريعنا السكنية عبر محرك البحث جوجل. كيف يمكن لمساعدك منصور مساعدتك اليوم؟ - منصور",
      META: "أهلاً بك! سعداء برؤية إعلاننا على فيسبوك/إنستغرام. هل تود استعراض الكتالوج والأسعار الحالية لفلل النخبة؟ - منصور",
      TIKTOK: "هلا والله! شفت مقطعنا على تيك توك؟ 😍 فلل الياسمين جاهزة للمعاينة الفورية. حابب نحجز لك موعد بكرة؟ - منصور",
      SNAPCHAT: "أهلاً بك! سعدنا باهتمامك بفللنا عبر سناب شات. تفضل كتيب المواصفات والضمانات. هل ترغب بزيارة الموقع؟ - منصور",
      TWITTER: "مرحباً بك يا فندم. بخصوص استفسارك من منصة إكس، تفضل التفاصيل والمساحات المتاحة في أرقى أحياء الرياض. - منصور",
      LINKEDIN: "مرحباً بك أستاذنا الفاضل. يسعدنا اهتمامك بفرص التطوير والاستثمار السكني عبر لينكد إن. تفضل الملف التعريفي والتحليلي للمشروع. - منصور"
    };

    const connections = platforms.map(p => {
      const existing = dbConnections.find(c => c.platform === p);
      return {
        platform: p,
        id: existing?.id || null,
        accountId: existing?.accountId || "",
        hasApiKey: !!existing?.encryptedApiKey,
        status: existing?.status || "DISCONNECTED",
        leadTone: existing?.leadTone || "PROFESSIONAL",
        autoWelcomeMsg: existing?.autoWelcomeMsg || defaultWelcomeMsgs[p] || ""
      };
    });

    return { success: true, data: connections };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * حفظ أو تعديل إعدادات الربط الإعلاني ومسار الوكيل منصور الخاص بالمنصة
 */
export async function savePlatformConnectionAction(data: {
  platform: string;
  accountId: string;
  apiKey?: string;
  leadTone: string;
  autoWelcomeMsg: string;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    // جلب الربط الحالي إن وجد للتحقق من المفتاح القديم
    const existing = await prisma.platformConnection.findUnique({
      where: {
        tenantId_platform: {
          tenantId: tenant.id,
          platform: data.platform
        }
      }
    });

    let encryptedKey = existing?.encryptedApiKey || null;
    if (data.apiKey) {
      encryptedKey = encryptText(data.apiKey);
    }

    await prisma.platformConnection.upsert({
      where: {
        tenantId_platform: {
          tenantId: tenant.id,
          platform: data.platform
        }
      },
      create: {
        tenantId: tenant.id,
        platform: data.platform,
        accountId: data.accountId,
        encryptedApiKey: encryptedKey,
        leadTone: data.leadTone,
        autoWelcomeMsg: data.autoWelcomeMsg,
        status: existing?.status || "DISCONNECTED"
      },
      update: {
        accountId: data.accountId,
        encryptedApiKey: encryptedKey,
        leadTone: data.leadTone,
        autoWelcomeMsg: data.autoWelcomeMsg
      }
    });

    // توثيق التعديل في سجل الحوكمة والامتثال
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: session.userId,
        action: "AD_PLATFORM_CONFIG_UPDATED",
        tableName: "platform_connections",
        recordId: data.platform,
        details: `تحديث إعدادات ربط منصة ${data.platform} وتغيير مسار الوكيل منصور بنجاح.`
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * محاكاة وفحص الاتصال بالمنصة الإعلانية (توليد حالة الربط اللحظية)
 */
export async function testPlatformConnectionAction(platform: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    const connection = await prisma.platformConnection.findUnique({
      where: {
        tenantId_platform: {
          tenantId: tenant.id,
          platform
        }
      }
    });

    if (!connection) {
      throw new Error("الرجاء حفظ إعدادات المنصة أولاً قبل فحص الاتصال.");
    }

    // تعيين الحالة إلى جاري المزامنة مؤقتاً
    await prisma.platformConnection.update({
      where: { id: connection.id },
      data: { status: "SYNCING" }
    });

    // محاكاة تأخير الفحص
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // تحديد النتيجة بناءً على صحة البيانات (محاكاة فشل في حال عدم وجود رمز ربط حقيقي أو رمز قصير جداً)
    let finalStatus = "CONNECTED";
    let decryptedKey = "";
    if (connection.encryptedApiKey) {
      try {
        decryptedKey = decryptText(connection.encryptedApiKey) || "";
      } catch (e) {
        finalStatus = "CONNECTION_ERROR";
      }
    }

    if (!connection.accountId || !connection.encryptedApiKey || decryptedKey.length < 5) {
      finalStatus = "CONNECTION_ERROR";
    }

    await prisma.platformConnection.update({
      where: { id: connection.id },
      data: { status: finalStatus }
    });

    // توثيق الفحص في سجل التدقيق
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: session.userId,
        action: "AD_PLATFORM_CONNECTION_TESTED",
        tableName: "platform_connections",
        recordId: connection.id,
        details: `فحص الاتصال بمنصة ${platform}، النتيجة: ${finalStatus}`
      }
    });

    return { success: true, status: finalStatus };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * جلب جميع عقود استئجار الوكلاء الفعالة للمنشأة الحالية
 */
export async function getAgentLeasesAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");
    const tenant = await getActiveTenant();

    const leases = await prisma.agentLease.findMany({
      where: { tenantId: tenant.id }
    });

    return {
      success: true,
      data: leases.map(l => ({
        id: l.id,
        agentId: l.agentId,
        startDate: l.startDate.toISOString(),
        endDate: l.endDate.toISOString(),
        leasePrice: Number(l.leasePrice),
        autoRenewal: l.autoRenewal,
        createdAt: l.createdAt.toISOString()
      }))
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * استئجار أو تجديد وكيل مغلق للمنشأة الحالية لمدة 30 يوماً
 */
export async function leaseAgentAction(data: {
  agentId: string;
  autoRenewal: boolean;
}) {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");
    const tenant = await getActiveTenant();

    const requestedAgent = data.agentId.toUpperCase();
    
    // فحص ما إذا كان هناك عقد استئجار سابق للوكيل
    const existing = await prisma.agentLease.findUnique({
      where: {
        tenantId_agentId: {
          tenantId: tenant.id,
          agentId: requestedAgent
        }
      }
    });

    const isRenewal = !!existing;
    const leasePrice = isRenewal ? 800.00 : 400.00;
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30);

    const lease = await prisma.agentLease.upsert({
      where: {
        tenantId_agentId: {
          tenantId: tenant.id,
          agentId: requestedAgent
        }
      },
      create: {
        tenantId: tenant.id,
        agentId: requestedAgent,
        startDate,
        endDate,
        leasePrice,
        autoRenewal: data.autoRenewal
      },
      update: {
        startDate,
        endDate,
        leasePrice,
        autoRenewal: data.autoRenewal
      }
    });

    // توثيق العملية في سجل التدقيق
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: session.userId,
        action: "AGENT_LEASED",
        tableName: "agent_leases",
        recordId: lease.id,
        details: `تم استئجار الوكيل ${requestedAgent} بنجاح بقيمة ${leasePrice} ريال سعودي لمدة 30 يوماً. التجديد التلقائي: ${data.autoRenewal ? "نعم" : "لا"}. نوع المعاملة: ${isRenewal ? "تجديد" : "استئجار أول"}`
      }
    });

    revalidatePath("/operations");
    return {
      success: true,
      data: {
        id: lease.id,
        agentId: lease.agentId,
        startDate: lease.startDate.toISOString(),
        endDate: lease.endDate.toISOString(),
        leasePrice: Number(lease.leasePrice),
        autoRenewal: lease.autoRenewal
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

