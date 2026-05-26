// app/api/payment/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleSuccessfulPaymentAction } from "@/app/actions/billingAgent"; // 1. استدعاء الوكيل سند! [1.1]
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
    // 1. تفعيل وضع المحاكاة المحلي واستدعاء الوكيل سند لتوليد الباسورد المشفر وإرسال الـ SMS [1.1, 1.2.1, 1.2.2]
    if (MOYASAR_SECRET_KEY.startsWith("sk_test_dummy") && invoiceId.startsWith("mock_invoice_")) {
      const mockType = searchParams.get("mock_type");
      const tenantId = searchParams.get("mock_tenant_id");

      if (mockType === "addon") {
        const agentCount = searchParams.get("mock_agent_count");
        if (tenantId && agentCount) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              extraAgents: {
                increment: parseInt(agentCount, 10),
              }
            }
          });
          const successUrl = new URL("/operations/settings", request.url);
          successUrl.searchParams.set("success", `[وضع تجريبي] تم شراء عدد ${agentCount} وكلاء إضافيين بنجاح وتحديث السعة!`);
          return NextResponse.redirect(successUrl);
        }
      } else {
        const plan = searchParams.get("mock_plan");
        if (tenantId && plan) {
          // تفويض تفعيل الحساب وحساب المدة وإصدار الأكواد بالكامل للوكيل سند [1.1, 1.2.1]
          await handleSuccessfulPaymentAction(tenantId, plan, "MONTHLY");

          const successUrl = new URL("/operations/settings", request.url);
          successUrl.searchParams.set("success", `[وضع تجريبي] تم ترقية خطة منشأتك العقارية بنجاح وتكليف الوكيل سند!`);
          return NextResponse.redirect(successUrl);
        }
      }
    }

    // 2. التحقق الحقيقي من خوادم ميسر للإنتاج الفعلي وتفويض الوكيل سند [1.1, 1.2.1]
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
      const type = invoice.metadata.type;

      if (type === "addon") {
        const agentCount = invoice.metadata.agentCount;
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            extraAgents: {
              increment: parseInt(agentCount, 10),
            }
          }
        });

        const successUrl = new URL("/operations/settings", request.url);
        successUrl.searchParams.set("success", `تم شراء عدد ${agentCount} وكلاء إضافيين بنجاح وتحديث سعة النظام!`);
        return NextResponse.redirect(successUrl);
      } else {
        const plan = invoice.metadata.plan;
        // تفويض تفعيل الحساب وحساب المدة وإصدار الأكواد بالكامل للوكيل سند [1.1, 1.2.1]
        await handleSuccessfulPaymentAction(tenantId, plan, "MONTHLY");

        const successUrl = new URL("/operations/settings", request.url);
        successUrl.searchParams.set("success", `تم ترقية خطة منشأتك العقارية بنجاح وتفعيل الوكيل سند!`);
        return NextResponse.redirect(successUrl);
      }
    }

  } catch (error: any) {
    console.error("خطأ تفعيل الفاتورة والتنبيهات للوكيل سند:", error);
  }

  fallbackUrl.searchParams.set("error", "حدث خطأ غير متوقع أثناء تفعيل الاشتراك.");
  return NextResponse.redirect(fallbackUrl);
}