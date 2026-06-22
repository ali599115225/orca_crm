import { NextRequest, NextResponse } from "next/server";
import { getTenantAndUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { ngeniusProvider } from "@/lib/payments/providers/ngenius";
import { isProviderEnabled } from "@/lib/payments/registry";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: installmentId } = await params;
    const { tenantId, userId } = await getTenantAndUser(request);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID missing." }, { status: 400 });
    }

    if (!isProviderEnabled("NGENIUS")) {
      return NextResponse.json(
        { error: "N-Genius payment provider is not enabled" },
        { status: 400 },
      );
    }

    const installment = await prisma.installment.findFirst({
      where: { id: installmentId, tenantId },
      include: { contract: true },
    });

    if (!installment) {
      return NextResponse.json(
        { error: "Installment not found in this tenant." },
        { status: 404 },
      );
    }

    if (installment.paymentStatus === "Paid") {
      return NextResponse.json(
        { error: "Installment is already fully paid." },
        { status: 400 },
      );
    }

    if (userId) {
      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { role: true },
      });
      if (!user || !["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE"].includes(user.role)) {
        return NextResponse.json(
          { error: "Insufficient permissions." },
          { status: 403 },
        );
      }
    }

    const amountSar = Number(installment.amountSar);
    const amountMinor = Math.round(amountSar * 100);
    const currency = "SAR";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://orca.az-ez.pro";

    const callbackUrl = `${appUrl}/api/payments/ngenius/webhook`;

    const payment = await prisma.paymentTransaction.create({
      data: {
        tenantId,
        installmentId,
        amount: amountSar,
        fee: 0,
        netAmount: amountSar,
        currency,
        method: "NGENIUS",
        status: "PENDING",
        provider: "NGENIUS",
        expectedAmountMinor: amountMinor,
        expectedCurrency: currency,
      },
    });

    const result = await ngeniusProvider.createPayment({
      tenantId,
      planCode: `installment-${installmentId}`,
      amountMinorUnits: amountMinor,
      currency,
      description: `Installment ${installment.installmentNumber} - Contract ${installment.contractId}`,
      callbackUrl,
      metadata: {
        installmentId,
        contractId: installment.contractId,
      },
    });

    await prisma.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        providerReference: result.providerReference,
        paymentUrl: result.redirectUrl,
        providerTransactionId: result.providerReference,
        gatewayStatus: result.providerStatus,
        rawPayload: result.rawPayload as never,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "NGENIUS_PAYMENT_INITIATED",
        tableName: "payment_transactions",
        recordId: payment.id,
        details: JSON.stringify({
          installmentId,
          amount: amountSar,
          providerReference: result.providerReference,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      redirectUrl: result.redirectUrl,
      providerReference: result.providerReference,
    });
  } catch (error: any) {
    const status = error.message?.includes("not found")
      ? 404
      : error.message?.includes("Insufficient")
        ? 403
        : error.message?.includes("not configured")
          ? 503
          : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
