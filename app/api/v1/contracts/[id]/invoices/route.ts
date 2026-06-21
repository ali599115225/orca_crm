import { NextRequest, NextResponse } from "next/server";
import { getTenantAndUser } from "@/lib/api-helpers";
import { createInvoice } from "@/lib/domain/transaction-spine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID missing." }, { status: 400 });
    }

    const body = await request.json();
    const { subtotal, vatRate, vatType, dueDate, installments } = body;

    if (!subtotal || subtotal <= 0) {
      return NextResponse.json({ error: "Invalid subtotal." }, { status: 400 });
    }
    if (!dueDate) {
      return NextResponse.json({ error: "Due date is required." }, { status: 400 });
    }

    const invoice = await createInvoice({
      tenantId,
      userId: userId || "",
      type: "SALE",
      contractId,
      subtotal: Number(subtotal),
      vatRate: vatRate ? Number(vatRate) : 15,
      vatType: vatType || "STANDARD",
      dueDate: new Date(dueDate),
    });

    if (installments && typeof installments === "object" && installments.count) {
      const { createInstallments } = await import("@/lib/domain/transaction-spine");
      await createInstallments({
        tenantId,
        userId: userId || "",
        invoiceId: invoice.id,
        count: Number(installments.count),
        startDate: new Date(installments.startDate || dueDate),
        intervalDays: installments.intervalDays || 30,
      });
    }

    return NextResponse.json({ success: true, data: invoice }, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
