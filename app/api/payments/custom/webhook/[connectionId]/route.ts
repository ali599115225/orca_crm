import {
  createHash,
} from "node:crypto";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import { rawPrisma } from "@/lib/prisma";
import { reconcileCustomPayment } from "@/lib/payments/custom-payment-reconciliation";
import {
  getPaymentProviderRuntimeByConnectionId,
  verifyAndStoreProviderWebhook,
} from "@/lib/revenue-integrity/trust-gates";

const MAX_WEBHOOK_BYTES =
  256 * 1024;

function credentialValue(
  credentials: Record<string, unknown>,
  key: string,
): string {
  return String(
    credentials[key] ?? "",
  ).trim();
}

function getPath(
  payload: unknown,
  path: string,
): unknown {
  return path
    .split(".")
    .filter(Boolean)
    .reduce<unknown>(
      (current, key) => {
        if (
          current &&
          typeof current === "object" &&
          key in
            (current as Record<
              string,
              unknown
            >)
        ) {
          return (
            current as Record<
              string,
              unknown
            >
          )[key];
        }
        return undefined;
      },
      payload,
    );
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      connectionId: string;
    }>;
  },
) {
  try {
    const { connectionId } =
      await params;
    const runtime =
      await getPaymentProviderRuntimeByConnectionId(
        connectionId,
      );

    if (
      runtime.provider !==
      "CUSTOM_PAYMENT"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CUSTOM_PAYMENT_CONNECTION_REQUIRED",
        },
        { status: 400 },
      );
    }

    const rawBody =
      await request.text();

    if (
      Buffer.byteLength(
        rawBody,
        "utf8",
      ) > MAX_WEBHOOK_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WEBHOOK_BODY_TOO_LARGE",
        },
        { status: 413 },
      );
    }

    const signatureHeader =
      credentialValue(
        runtime.credentials,
        "webhookSignatureHeader",
      );

    const signature =
      request.headers.get(
        signatureHeader,
      ) || "";

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WEBHOOK_SIGNATURE_REQUIRED",
        },
        { status: 401 },
      );
    }

    let payload: unknown;
    try {
      payload =
        JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "WEBHOOK_JSON_INVALID",
        },
        { status: 400 },
      );
    }

    const referencePath =
      credentialValue(
        runtime.credentials,
        "webhookReferencePath",
      );

    const providerReference =
      String(
        getPath(
          payload,
          referencePath,
        ) || "",
      ).trim();

    if (!providerReference) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WEBHOOK_PROVIDER_REFERENCE_REQUIRED",
        },
        { status: 400 },
      );
    }

    const externalEventId =
      createHash("sha256")
        .update(
          `${connectionId}:${providerReference}:${rawBody}`,
        )
        .digest("hex");

    const stored =
      await verifyAndStoreProviderWebhook({
        connectionId,
        provider:
          "CUSTOM_PAYMENT",
        externalEventId,
        rawBody,
        signature,
        payload,
      });

    const payment =
      await rawPrisma.paymentTransaction.findFirst({
        where: {
          tenantId:
            runtime.tenantId,
          provider:
            "CUSTOM_PAYMENT",
          providerReference,
        },
      });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CUSTOM_PAYMENT_TRANSACTION_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const result =
      await reconcileCustomPayment({
        transactionId:
          payment.id,
        connectionId,
        source: "WEBHOOK",
      });

    return NextResponse.json({
      success: true,
      status: result.status,
      duplicate:
        stored.duplicate,
      transactionId:
        payment.id,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "CUSTOM_PAYMENT_WEBHOOK_FAILED";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status:
          message.includes(
            "SIGNATURE",
          )
            ? 401
            : 400,
      },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    provider: "CUSTOM_PAYMENT",
  });
}
