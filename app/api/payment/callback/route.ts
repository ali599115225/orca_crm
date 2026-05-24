// app/api/payment/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || "sk_test_dummy_key_for_orca_crm_saudi";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("id");
  const status = searchParams.get("status");

  const fallbackUrl = new URL("/operations/settings", request.url);

  if (!invoiceId || status !== "paid") {
    fallbackUrl.searchParams.set("error", "فشلت عملية الدفع أو تم إلغاؤها من قبل المستخدم.");
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    // 1. تفعيل وضع المحاكاة المحلي لتجاوز التحقق من خوادم ميسر لتسهيل التجربة
    if (MOYASAR_SECRET_KEY.startsWith("sk_test_dummy") && invoiceId.startsWith("mock_invoice_")) {
      const tenantId = searchParams.get("mock_tenant_id");
      const plan = searchParams.get("mock_plan");

      if (tenantId && plan) {
        // تحديث خطة اشتراك العميل فوراً في قاعدة البيانات المحلية
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            subscriptionPlan: plan,
            isActive: true,
          }
        });

        const successUrl = new URL("/operations/settings", request.url);
        successUrl.searchParams.set("success", `[وضع تجريبي] تم ترقية خطة منشأتك العقارية بنجاح إلى الباقة (${plan})!`);
        return NextResponse.redirect(successUrl);
      }
    }

    // 2. التحقق الحقيقي من خوادم ميسر
    const response = await fetch(`https://api.moyasar.com/v1/invoices/${invoiceId}`, {
      headers: {
        "Authorization": `Basic ${btoa(MOYASAR_SECRET_KEY + ":")}`,
      }
    });

    if (!response.ok) {
      throw new Error("لم نتمكن من التحقق من صحة الفاتورة عبر بوابة ميسر.");
    }

    const invoice = await response.json();

    if (invoice.status === "paid") {
      const tenantId = invoice.metadata.tenantId;
      const plan = invoice.metadata.plan;

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionPlan: plan,
          isActive: true,
        }
      });

      const successUrl = new URL("/operations/settings", request.url);
      successUrl.searchParams.set("success", `تم ترقية خطة منشأتك العقارية بنجاح إلى الباقة (${plan})!`);
      return NextResponse.redirect(successUrl);
    }

  } catch (error: any) {
    console.error("خطأ تفعيل الفاتورة:", error);
  }

  fallbackUrl.searchParams.set("error", "حدث خطأ غير متوقع أثناء تفعيل الاشتراك.");
  return NextResponse.redirect(fallbackUrl);
}