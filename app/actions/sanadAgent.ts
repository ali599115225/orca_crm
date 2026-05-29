// app/actions/sanadAgent.ts
"use server";

import { prisma } from "../../lib/prisma";
import { sendWhatsAppNotification } from "../../lib/notifications";
import { revalidatePath } from "next/cache";

/**
 * 🤖 الوكيل الذكي (سند) - مراقبة وجدولة تحصيل الأقساط العقارية [1.1.2]
 * يقوم بفحص الأقساط التي يحين موعد استحقاقها قريباً وتوليد روابط سداد مشفرة وإرسالها عبر الواتساب.
 */
export async function runInstallmentAgentAction() {
  try {
    const now = new Date();
    
    // الأقساط المستحقة خلال الأيام الـ 3 القادمة أو المتأخرة
    const warningDate = new Date();
    warningDate.setDate(now.getDate() + 3);

    // 1. جلب الأقساط المستحقة والنشطة لجميع المنشآت العقارية
    const dueInstallments = await prisma.installment.findMany({
      where: {
        paymentStatus: "Pending",
        dueDate: {
          lte: warningDate,
        },
      },
      include: {
        contract: {
          include: {
            unit: {
              include: {
                project: {
                  include: {
                    tenant: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (dueInstallments.length === 0) {
      return {
        success: true,
        processedCount: 0,
        message: "لم يتم العثور على أي أقساط مستحقة للتحصيل اليوم.",
      };
    }

    let processedCount = 0;
    const errors: string[] = [];

    // 2. معالجة كل قسط وإصدار روابط الدفع والمتابعة الآلية
    for (const installment of dueInstallments) {
      try {
        const contract = installment.contract;
        const unit = contract.unit;
        const tenant = unit.project.tenant;

        if (!tenant || !tenant.isActive) {
          continue; // تخطي الشركات المعطلة مؤقتاً
        }

        // إنشاء رابط الدفع المشفر
        const paymentLink = `https://${tenant.subdomain}.orca-az-ez.pro/pay/${installment.securePaymentToken}`;

        // صياغة تفاصيل الرسالة
        const buyerName = contract.buyerName;
        const buyerPhone = contract.buyerPhone;
        const unitNumber = unit.unitNumber;
        const amountStr = parseFloat(installment.amountSar.toString()).toLocaleString("en-US");
        const dueDateStr = new Date(installment.dueDate).toLocaleDateString("ar-SA");

        // إرسال تنبيه واتساب التلقائي للعميل
        const templateName = "installment_reminder";
        const variables = [buyerName, unitNumber, amountStr, dueDateStr, paymentLink];

        await sendWhatsAppNotification(buyerPhone, templateName, variables);

        // 3. تدوين سجل تتبع الوكيل سند غير القابل للتعديل ليتدفق لحظياً إلى لوحة التحكم
        const logMessageAr = `«قام الوكيل سند بتوليد رابط دفع مشفر وإرساله عبر الواتساب الآمن للمشتري (${buyerName}) لتذكيره بالقسط المستحق للوحدة ${unitNumber} بقيمة ${amountStr} ر.س»`;
        
        await prisma.agentTelemetryLog.create({
          data: {
            tenantId: tenant.id,
            agentId: "Sanad",
            actionType: "Link_Dispatched",
            logMessageAr: logMessageAr,
            severity: "Info",
          },
        });

        processedCount++;
      } catch (err: any) {
        console.error(`خطأ معالجة القسط للعميل ${installment.contract.buyerName}:`, err.message);
        errors.push(`${installment.contract.buyerName}: ${err.message}`);
      }
    }

    try {
      revalidatePath("/operations/analytics");
    } catch (e) {
      // تجاهل خطأ غياب سياق Next.js عند التشغيل كسكريبت مستقل
    }
    return {
      success: true,
      processedCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 5),
      message: `تمت معالجة وإرسال عدد ${processedCount} مطالبات دفع أقساط بنجاح.`,
    };

  } catch (error: any) {
    console.error("خطأ تشغيل محرك تحصيل الوكيل سند:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
