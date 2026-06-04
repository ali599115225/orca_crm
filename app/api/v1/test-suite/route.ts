// app/api/v1/test-suite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { runLeadsTestSuite } from "@/scripts/test-leads";
import { getTenantAndUser } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId || !userId) {
      return NextResponse.json({
        success: false,
        error: "معرف المنشأة أو معرف المستخدم مفقود. يرجى تسجيل الدخول أولاً.",
      }, { status: 401 });
    }

    const testResults = await runLeadsTestSuite(tenantId, userId);
    const hasFailures = testResults.some(r => !r.success);

    return NextResponse.json({
      success: !hasFailures,
      summary: hasFailures ? "باقة الاختبارات تحتوي على إخفاقات" : "جميع الاختبارات نجحت بنسبة ١٠٠٪",
      results: testResults,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
