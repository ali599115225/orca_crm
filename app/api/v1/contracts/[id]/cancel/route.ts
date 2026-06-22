import { NextRequest, NextResponse } from "next/server";
import { getTenantAndUser } from "@/lib/api-helpers";
import { cancelDraftContract } from "@/lib/domain/transaction-spine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId || !userId) return NextResponse.json({ error: "غير مصرح بالوصول." }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const result = await cancelDraftContract({
      tenantId,
      userId,
      contractId: id,
      reason: String(body.reason || ""),
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر إلغاء العقد.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
