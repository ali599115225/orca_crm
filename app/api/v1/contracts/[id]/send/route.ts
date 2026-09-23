import { NextRequest, NextResponse } from "next/server";
import { CONTRACT_WRITER_ROLES } from "@/lib/auth/contract-access-policy";
import { runWithExec003CookiePermission } from "@/lib/auth/exec-003-shared-guard";
import { ContractDeliveryError, sendContractDocument } from "@/lib/domain/transaction-spine/send-contract-document";
import { SignedContractSnapshotError } from "@/lib/domain/transaction-spine/signed-contract-snapshot";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Use the existing final-document permission narrowed to contract writers.
  return runWithExec003CookiePermission(request, CONTRACT_WRITER_ROLES, "contracts.pdf.read", async (session) => {
    const body = await request.json().catch(() => null);
    if (!body || body.confirm !== true || typeof body.recipient !== "string") {
      return NextResponse.json({ success: false, code: "CONTRACT_SEND_INPUT_INVALID" }, { status: 400 });
    }
    try {
      const { id } = await params;
      const data = await sendContractDocument({ tenantId: session.tenantId,
        userId: session.userId, ownerName: session.name || session.userId,
        contractId: id, recipient: body.recipient.trim() });
      return NextResponse.json({ success: data.status === "SENT", data },
        { status: data.status === "SENT" ? 200 : 502 });
    } catch (error) {
      if (error instanceof ContractDeliveryError || error instanceof SignedContractSnapshotError) {
        return NextResponse.json({ success: false, code: error.code },
          { status: error instanceof ContractDeliveryError ? error.status : 409 });
      }
      return NextResponse.json({ success: false, code: "CONTRACT_DELIVERY_PERSISTENCE_FAILED" }, { status: 500 });
    }
  });
}
