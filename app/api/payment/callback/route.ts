// app/api/payment/callback/route.ts
// Provider-neutral payment callback — verifies payment via adapter, processes atomically.
import { NextRequest, NextResponse } from "next/server";
import { processPaymentCallback } from "@/lib/payments/service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerRef = searchParams.get("ref") || searchParams.get("id") || "";
  const provider = (searchParams.get("provider") || "").toUpperCase();
  const status = searchParams.get("status");

  const fallbackUrl = new URL("/operations", request.url);
  fallbackUrl.searchParams.set("tab", "settings");

  if (status && status !== "paid" && status !== "success") {
    fallbackUrl.searchParams.set("error", "فشلت عملية الدفع أو تم إلغاؤها.");
    return NextResponse.redirect(fallbackUrl);
  }

  if (!provider) {
    fallbackUrl.searchParams.set("error", "مزود الدفع غير محدد.");
    return NextResponse.redirect(fallbackUrl);
  }

  if (!providerRef) {
    fallbackUrl.searchParams.set("error", "مرجع الدفع غير محدد.");
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    const result = await processPaymentCallback({
      provider,
      providerReference: providerRef,
    });

    if (result.ok) {
      const successUrl = new URL("/operations", request.url);
      successUrl.searchParams.set("tab", "settings");
      successUrl.searchParams.set(
        "success",
        result.status === 'ALREADY_COMPLETED'
          ? "تم تفعيل الاشتراك مسبقًا."
          : "تم ترقية الخطة بنجاح!"
      );
      return NextResponse.redirect(successUrl);
    }

    const errorMessage = result.status === 'PROCESSING'
      ? "يتم معالجة الدفع حالياً."
      : result.error;
    fallbackUrl.searchParams.set("error", errorMessage);
    return NextResponse.redirect(fallbackUrl);
  } catch (error: any) {
    console.error("[Payment Callback] Error:", error.message);
    fallbackUrl.searchParams.set("error", "حدث خطأ أثناء معالجة الدفع.");
    return NextResponse.redirect(fallbackUrl);
  }
}
