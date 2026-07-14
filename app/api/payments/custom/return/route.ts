import {
  NextRequest,
  NextResponse,
} from "next/server";
import { rawPrisma } from "@/lib/prisma";
import {
  reconcileCustomPayment,
  verifyCustomPaymentCallbackSignature,
} from "@/lib/payments/custom-payment-reconciliation";
import { getPaymentProviderRuntimeByConnectionId } from "@/lib/revenue-integrity/trust-gates";

function safeReturnUrl(
  request: NextRequest,
  value: string | null,
): URL {
  const origin = new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin,
  ).origin;

  try {
    const target = new URL(value || "/", origin);
    return target.origin === origin
      ? target
      : new URL("/", origin);
  } catch {
    return new URL("/", origin);
  }
}

export async function GET(
  request: NextRequest,
) {
  const transactionId =
    request.nextUrl.searchParams.get(
      "transactionId",
    ) || "";
  const connectionId =
    request.nextUrl.searchParams.get(
      "connectionId",
    ) || "";
  const signature =
    request.nextUrl.searchParams.get(
      "signature",
    ) || "";
  const target = safeReturnUrl(
    request,
    request.nextUrl.searchParams.get(
      "returnTo",
    ),
  );

  try {
    if (
      !transactionId ||
      !connectionId ||
      !signature
    ) {
      throw new Error(
        "CUSTOM_PAYMENT_RETURN_FIELDS_REQUIRED",
      );
    }

    const payment =
      await rawPrisma.paymentTransaction.findFirst({
        where: {
          id: transactionId,
          provider: "CUSTOM_PAYMENT",
        },
      });

    if (!payment) {
      throw new Error(
        "CUSTOM_PAYMENT_TRANSACTION_NOT_FOUND",
      );
    }

    const runtime =
      await getPaymentProviderRuntimeByConnectionId(
        connectionId,
      );

    if (
      runtime.provider !== "CUSTOM_PAYMENT" ||
      runtime.tenantId !== payment.tenantId
    ) {
      throw new Error(
        "CUSTOM_PAYMENT_TENANT_OR_CONNECTION_MISMATCH",
      );
    }

    const secret = String(
      runtime.credentials.webhookSecret || "",
    );

    if (
      !verifyCustomPaymentCallbackSignature(
        transactionId,
        connectionId,
        secret,
        signature,
      )
    ) {
      throw new Error(
        "CUSTOM_PAYMENT_RETURN_SIGNATURE_INVALID",
      );
    }

    const result =
      await reconcileCustomPayment({
        transactionId,
        connectionId,
        source: "RETURN",
      });

    target.searchParams.set(
      "payment",
      result.status,
    );
    target.searchParams.set(
      "transactionId",
      transactionId,
    );

    return NextResponse.redirect(target);
  } catch {
    target.searchParams.set(
      "payment",
      "failed",
    );
    if (transactionId) {
      target.searchParams.set(
        "transactionId",
        transactionId,
      );
    }
    return NextResponse.redirect(target);
  }
}
