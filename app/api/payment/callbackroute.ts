// app/api/payment/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || "sk_test_dummy_key_for_orca_crm_saudi";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("id");
  const status = searchParams.get("status");

  // رابط التوجيه الافتراضي لوصفحة الإعدادات بموقعك
  const fallbackUrl = new URL("/operations/settings", request.url);

  if (!invoiceId || status !== "paid") {
    fallbackUrl.searchParams.set("error", "فشلت عملية الدفع أو تم إلغاؤها من قبل المستخدم.");
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    // الاتصال الآمن والمباشر ببوابة ميسر للتحقق من صحة الفاتورة
    const response = await fetch(`https://api.moyasar.com/v1/invoices/${invoiceId}`, {
      headers: {
        "Authorization": `Basic ${btoa(MOYASAR_SECRET_KEY + ":")}`,
      }
    });

    if (!response.ok) {
      throw new Error("لم نتمكن من التحقق من صحة الفاتورة عبر بوابة ميسر.");
    }

    const invoice = await response.json();

    // في حال تأكيد الدفع الفعلي بنجاح
    if (invoice.status === "paid") {
      const tenantId = invoice.metadata.tenantId;
      const plan = invoice.metadata.plan;

      // تحديث خطة اشتراك العميل فوراً في قاعدة البيانات
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionPlan: plan,
          isActive: true,
        }
      });

      // توجيهه لصفحة الإعدادات مع إظهار رسالة النجاح
      const successUrl = new URL("/operations/settings", request.url);
      successUrl.searchParams.set("success", `تم ترقية خطة منشأتك العقارية بنجاح إلى الباقة (${plan})!`);
      return NextResponse.redirect(successUrl);
    }

  } catch (error: any) {
    console.error("خطأ تفعيل الفاتورة:", error);
  }

  fallbackUrl.searchParams.set("error", "حدث خطأ غير متوقع أثناء تفعيل وترقية الاشتراك.");
  return NextResponse.redirect(fallbackUrl);
}