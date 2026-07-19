import { createHash } from "node:crypto";
import { signCustomPaymentCallback } from "@/lib/payments/custom-payment-reconciliation";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runWithDatabaseSession } from "@/lib/api-auth-guard";
import { createNgeniusProvider } from "@/lib/payments/providers/ngenius";
import { createCustomPaymentProvider } from "@/lib/payments/providers/custom-payment";
import { getDefaultPaymentProviderRuntime } from "@/lib/revenue-integrity/trust-gates";
import {
  CONTRACT_STATUS,
  INSTALLMENT_STATUS,
  PAYMENT_STATUS,
} from "@/lib/domain/transaction-spine";

const PAYMENT_ALLOWED_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
] as const;

function idempotencyHash(
  tenantId: string,
  provider: string,
  installmentId: string,
  amountMinor: number,
) {
  return createHash("sha256")
    .update(
      `${tenantId}:${provider}:${installmentId}:${amountMinor}`,
    )
    .digest("hex");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(
    request,
    PAYMENT_ALLOWED_ROLES,
    async (session) => {
      try {
        const tenantId = session.tenantId;
        const userId = session.userId;
        const { id } = await params;

        let runtime: Awaited<
          ReturnType<typeof getDefaultPaymentProviderRuntime>
        >;
        try {
          runtime =
            await getDefaultPaymentProviderRuntime(tenantId);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "DEFAULT_PAYMENT_PROVIDER_NOT_CONFIGURED";
          return NextResponse.json(
            {
              success: false,
              error:
                message ===
                "DEFAULT_PAYMENT_PROVIDER_NOT_CONFIGURED"
                  ? "لا يوجد مزود دفع افتراضي متصل للشركة."
                  : message,
            },
            { status: 409 },
          );
        }

        const providerCode = runtime.provider;
        if (
          providerCode !== "NGENIUS" &&
          providerCode !== "CUSTOM_PAYMENT"
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "مزود الدفع الافتراضي غير مدعوم تشغيليًا.",
            },
            { status: 409 },
          );
        }

        const paymentProvider =
          providerCode === "NGENIUS"
            ? createNgeniusProvider({
                apiKey: String(
                  runtime.credentials.apiKey || "",
                ),
                outletRef: String(
                  runtime.credentials.outletId || "",
                ),
                baseUrl: runtime.baseUrl,
              })
            : createCustomPaymentProvider({
                baseUrl: runtime.baseUrl,
                credentials: runtime.credentials,
              });

        const installment =
          await prisma.installment.findFirst({
            where: { id, tenantId },
            include: {
              contract: {
                select: {
                  id: true,
                  status: true,
                  spineVersion: true,
                  legacyFinancial: true,
                },
              },
              invoice: {
                select: { id: true, status: true },
              },
              payments: {
                where: {
                  status: PAYMENT_STATUS.COMPLETED,
                },
                select: { netAmount: true },
              },
            },
          });

        if (!installment) {
          return NextResponse.json(
            { error: "القسط غير موجود." },
            { status: 404 },
          );
        }
        if (
          installment.contract.legacyFinancial ||
          installment.contract.spineVersion < 2
        ) {
          return NextResponse.json(
            {
              error:
                "العقد التاريخي للعرض فقط ولا يقبل دفعات جديدة.",
            },
            { status: 409 },
          );
        }
        if (
          installment.contract.status !==
          CONTRACT_STATUS.SIGNED
        ) {
          return NextResponse.json(
            {
              error:
                "لا يمكن تحصيل قسط قبل توقيع العقد.",
            },
            { status: 409 },
          );
        }
        if (
          !installment.invoiceId ||
          !installment.invoice
        ) {
          return NextResponse.json(
            {
              error:
                "القسط غير مرتبط بفاتورة بيع.",
            },
            { status: 409 },
          );
        }
        if (
          installment.paymentStatus ===
          INSTALLMENT_STATUS.PAID
        ) {
          return NextResponse.json(
            { error: "القسط مدفوع بالكامل." },
            { status: 409 },
          );
        }

        const paidAmount = installment.payments.reduce(
          (sum, payment) =>
            sum + Number(payment.netAmount),
          0,
        );
        const remainingAmount =
          Math.round(
            (Number(installment.amountSar) -
              paidAmount +
              Number.EPSILON) *
              100,
          ) / 100;
        const amountMinor =
          Math.round(remainingAmount * 100);

        if (amountMinor <= 0) {
          return NextResponse.json(
            {
              error:
                "لا يوجد رصيد متبقٍ لهذا القسط.",
            },
            { status: 409 },
          );
        }

        const active =
          await prisma.paymentTransaction.findFirst({
            where: {
              tenantId,
              installmentId: installment.id,
              provider: providerCode,
              status: {
                in: [
                  PAYMENT_STATUS.PENDING,
                  PAYMENT_STATUS.PROCESSING,
                ],
              },
            },
            orderBy: { createdAt: "desc" },
          });

        if (active?.paymentUrl) {
          return NextResponse.json({
            success: true,
            provider: providerCode,
            redirectUrl: active.paymentUrl,
            transactionId: active.id,
            idempotent: true,
          });
        }

        const key = idempotencyHash(
          tenantId,
          providerCode,
          installment.id,
          amountMinor,
        );

        let transaction =
          active ||
          (await prisma.paymentTransaction.findFirst({
            where: {
              tenantId,
              idempotencyKey: key,
            },
            orderBy: { createdAt: "desc" },
          }));

        if (!transaction) {
          try {
            transaction =
              await prisma.paymentTransaction.create({
                data: {
                  tenantId,
                  invoiceId: installment.invoiceId,
                  installmentId: installment.id,
                  amount: remainingAmount,
                  fee: 0,
                  netAmount: remainingAmount,
                  currency: "SAR",
                  method: providerCode.toLowerCase(),
                  status: PAYMENT_STATUS.PROCESSING,
                  provider: providerCode,
                  idempotencyKey: key,
                  planCode: `installment:${installment.id}`,
                  expectedAmountMinor: amountMinor,
                  expectedCurrency: "SAR",
                  paidAt: null,
                },
              });
          } catch (error) {
            if (
              error instanceof
                Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            ) {
              transaction =
                await prisma.paymentTransaction.findFirst({
                  where: {
                    tenantId,
                    idempotencyKey: key,
                  },
                });
            } else {
              throw error;
            }
          }
        }

        if (!transaction) {
          throw new Error(
            "تعذر إنشاء معاملة الدفع.",
          );
        }

        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: PAYMENT_STATUS.PROCESSING,
            lastError: null,
            failureReason: null,
            expectedAmountMinor: amountMinor,
            expectedCurrency: "SAR",
          },
        });

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          "https://orca.az-ez.pro";

        const returnUrl =
          `${appUrl}/operations/rental/sales/contracts/` +
          `${installment.contract.id}?payment=return&transactionId=` +
          encodeURIComponent(transaction.id);

        let callbackUrl = returnUrl;

        if (
          providerCode === "CUSTOM_PAYMENT" &&
          String(
            runtime.credentials.integrationMode || "",
          ).toUpperCase() === "API"
        ) {
          const callbackSignature =
            signCustomPaymentCallback(
              transaction.id,
              runtime.connectionId,
              String(runtime.credentials.webhookSecret || ""),
            );

          const callback = new URL(
            "/api/payments/custom/return",
            appUrl,
          );
          callback.searchParams.set("transactionId", transaction.id);
          callback.searchParams.set("connectionId", runtime.connectionId);
          callback.searchParams.set("signature", callbackSignature);
          callback.searchParams.set("returnTo", returnUrl);
          callbackUrl = callback.toString();
        }

        try {
          const order =
            await paymentProvider.createPayment({
              tenantId,
              planCode: `installment:${installment.id}`,
              amountMinorUnits: amountMinor,
              currency: "SAR",
              description: `ORCA installment ${installment.installmentNumber}`,
              callbackUrl,
              metadata: {
                internalTransactionId: transaction.id,
                installmentId: installment.id,
                invoiceId: installment.invoiceId,
              },
            });

          const updated =
            await prisma.paymentTransaction.update({
              where: { id: transaction.id },
              data: {
                status: PAYMENT_STATUS.PENDING,
                providerReference:
                  order.providerReference,
                providerTransactionId:
                  order.providerReference,
                paymentUrl: order.redirectUrl,
                gatewayStatus:
                  order.providerStatus,
                rawPayload: order.rawPayload as any,
                paidAt: null,
              },
            });

          await prisma.auditLog.create({
            data: {
              tenantId,
              userId,
              action:
                "CREATE_INSTALLMENT_PAYMENT",
              tableName:
                "payment_transactions",
              recordId: updated.id,
              details: JSON.stringify({
                provider: providerCode,
                providerConnectionId:
                  runtime.connectionId,
                installmentId:
                  installment.id,
                invoiceId:
                  installment.invoiceId,
                amountMinor,
                providerReference:
                  order.providerReference,
              }),
            },
          });

          return NextResponse.json({
            success: true,
            provider: providerCode,
            redirectUrl: order.redirectUrl,
            transactionId: updated.id,
            idempotent: false,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "PAYMENT_CREATION_FAILED";

          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              status: PAYMENT_STATUS.FAILED,
              paidAt: null,
              failureReason:
                message.slice(0, 2000),
              lastError:
                message.slice(0, 2000),
            },
          });
          throw error;
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "فشل إنشاء رابط الدفع.";
        return NextResponse.json(
          { success: false, error: message },
          { status: 503 },
        );
      }
    },
  );
}
