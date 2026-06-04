// app/api/v1/ai/summarize-conversation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTenantAndUser } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { chatLog } = body;

    if (!chatLog) {
      return NextResponse.json({ error: "سجل المحادثة (chatLog) مطلوب." }, { status: 400 });
    }

    // AI summarize logic simulation
    const summaryAr = `العميل مهتم بشراء وحدة سكنية مكونة من ٣ غرف وصالة في شمال الرياض، وجدولة زيارة للموقع في عطلة نهاية الأسبوع.`;
    const summaryEn = `Client is interested in buying a 3-bedroom apartment in North Riyadh and scheduling a site tour during the weekend.`;

    return NextResponse.json({
      success: true,
      summaryAr,
      summaryEn,
      extractedDetails: {
        interest: "Apartment / Unit",
        locationPreference: "North Riyadh",
        budgetMentioned: "Medium-High",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
