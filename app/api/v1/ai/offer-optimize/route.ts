// app/api/v1/ai/offer-optimize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTenantAndUser } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { basePrice, probability } = body;

    if (!basePrice) {
      return NextResponse.json({ error: "السعر الأساسي مطلوب." }, { status: 400 });
    }

    // AI Pricing Model suggestions:
    // If probability is high (>= 80), offer standard 2% discount.
    // If probability is low (< 50), offer 7% discount to capture interest.
    const probNum = Number(probability || 50);
    const discountRate = probNum >= 80 ? 0.02 : probNum <= 40 ? 0.07 : 0.05;
    const suggestedPrice = Math.round(Number(basePrice) * (1 - discountRate));
    const suggestedValidityDays = probNum >= 80 ? 10 : 20;

    return NextResponse.json({
      success: true,
      suggestedPrice,
      discountPercentage: Math.round(discountRate * 100),
      suggestedValidityDays,
      rationaleAr: `تم اقتراح خصم بنسبة ${Math.round(discountRate * 100)}٪ بناءً على احتمالية إغلاق الصفقة المقدرة بـ ${probNum}٪ لتسريع عملية التوقيع.`,
      rationaleEn: `Suggested a ${Math.round(discountRate * 100)}% discount to accelerate signing based on close probability of ${probNum}%.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
