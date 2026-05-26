// app/api/payment/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMSNotification } from "@/lib/notifications"; // استدعاء إشعارات الجوال
import { sendAdminEmailAlert } from "@/lib/email"; // استدعاء إشعارات البريد

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
        const tenant = await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            subscriptionPlan: plan,
            isActive: true,
          }
        });

        // 💰 🚀 إشعار فوري للجوال بنجاح دفع وترقية الباقة [1.2.1, 1.2.2]
        const myMobile = process.env.ADMIN_ALERT_MOBILE || "+966557516311";
        const alertSMS = `💰 تنبيه إيرادات: قامت شركة (${tenant.companyName}) بدفع الاشتراك وترقية الباقة إلى الباقة (${plan}) بنجاح!`;
        await sendSMSNotification(myMobile, alertSMS);

        // 💰 🚀 إشعار فوري للبريد بنجاح دفع وترقية الباقة [1.1.2, 1.2.1, 1.2.2]
        const emailSubject = `💰 دفع ناجح وترقية باقة: ${tenant.companyName}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px;">
            <h2 style="color: #10b981;">💰 تنبيه أرباح ORCA CRM</h2>
            <p>تم استلام عملية دفع اشتراك وترقية باقة بنجاح عبر بوابة ميسر:</p>
            <ul>
              <li><strong>اسم الشركة:</strong> ${tenant.companyName}</li>
              <li><strong>الباقة المفعلة:</strong> ${plan}</li>
              <li><strong>معرّف الفاتورة التجريبية:</strong> ${invoiceId}</li>
            </ul>
            <p style="color: #f59e0b; font-weight: bold;">تم تحديث صلاحيات وسعة المطور في قاعدة البيانات آلياً!</p>
          </div>
        `;
        await sendAdminEmailAlert(emailSubject, emailHtml);

        const successUrl = new URL("/operations/settings", request.url);
        successUrl.searchParams.set("success", `[وضع تجريبي] تم ترقية خطة منشأتك العقارية بنجاح إلى الباقة (${plan})!`);
        return NextResponse.redirect(successUrl);
      }
    }

    // 2. التحقق الحقيقي من خوادم ميسر للإنتاج الفعلي
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

      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionPlan: plan,
          isActive: true,
        }
      });

      // 💰 🚀 إشعار فوري للجوال بنجاح الدفع الحقيقي [1.2.1]
      const myMobile = process.env.ADMIN_ALERT_MOBILE || "+966557516311";
      const alertSMS = `💰 تنبيه إيرادات حقيقية: قامت شركة (${tenant.companyName}) بدفع الاشتراك وترقية الباقة إلى (${plan}) بنجاح!`;
      await sendSMSNotification(myMobile, alertSMS);

      // 💰 🚀 إشعار فوري للبريد بنجاح الدفع الحقيقي [1.1.2, 1.2.1]
      const emailSubject = `💰 دفع حقيقي ناجح: ${tenant.companyName}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px;">
          <h2 style="color: #10b981;">💰 تنبيه أرباح حقيقية ORCA CRM</h2>
          <p>تم استلام عملية دفع اشتراك وترقية باقة حقيقية بنجاح عبر بوابة ميسر:</p>
          <ul>
            <li><strong>اسم الشركة:</strong> ${tenant.companyName}</li>
            <li><strong>الباقة المفعلة:</strong> ${plan}</li>
            <li><strong>رقم الفاتورة الرسمية بـ ميسر:</strong> ${invoiceId}</li>
            <li><strong>المبلغ المستلم:</strong> ${invoice.amount / 100} ر.س</li>
          </ul>
        </div>
      `;
      await sendAdminEmailAlert(emailSubject, emailHtml);

      const successUrl = new URL("/operations/settings", request.url);
      successUrl.searchParams.set("success", `تم ترقية خطة منشأتك العقارية بنجاح إلى الباقة (${plan})!`);
      return NextResponse.redirect(successUrl);
    }

  } catch (error: any) {
    console.error("خطأ تفعيل الفاتورة والتنبيهات:", error);
  }

  fallbackUrl.searchParams.set("error", "حدث خطأ غير متوقع أثناء تفعيل الاشتراك.");
  return NextResponse.redirect(fallbackUrl);
}