import { NextRequest, NextResponse } from "next/server";
import { getTenantAndUser } from "@/lib/api-helpers";
import { acceptOfferAndCreateContract } from "@/lib/domain/transaction-spine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const result = await acceptOfferAndCreateContract({
      tenantId,
      userId: userId || "",
      offerId: id,
    });

    return NextResponse.json({
      success: true,
      data: result.offer,
      contract: result.contract,
      invoice: result.invoice,
      installments: result.installments,
      contractCreated: result.contractCreated,
    });
  } catch (error: any) {
    const status = error.message?.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
