import "server-only";
import type {
  PaymentCreateInput,
  PaymentProviderAdapter,
  PaymentProviderResult,
  PaymentVerificationResult,
} from "../types";

function getNgeniusApiKey(): string {
  return process.env.NGENIUS_API_KEY || "";
}

function getNgeniusOutletRef(): string {
  return process.env.NGENIUS_OUTLET_REF || "";
}

function getNgeniusBaseUrl(): string {
  return (
    process.env.NGENIUS_API_URL ||
    "https://api-gateway.sandbox.ngenius-payments.com"
  );
}

async function getAccessToken(): Promise<string> {
  const apiKey = getNgeniusApiKey();
  if (!apiKey) throw new Error("NGENIUS_API_KEY not configured");

  const res = await fetch(`${getNgeniusBaseUrl()}/identity/auth/access-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.ni-identity.v1+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      action: "MERCHANT_ACCESS_TOKEN",
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`N-Genius auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const accessToken = data.access_token || "";
  if (!accessToken) throw new Error("N-Genius auth response missing access token");
  return accessToken;
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/vnd.ni-payment.v2+json",
  };
}

export const ngeniusProvider: PaymentProviderAdapter = {
  code: "NGENIUS",

  async createPayment(input: PaymentCreateInput): Promise<PaymentProviderResult> {
    const outletRef = getNgeniusOutletRef();
    if (!outletRef) throw new Error("NGENIUS_OUTLET_REF not configured");

    const accessToken = await getAccessToken();
    const currencyCode = (input.currency || "SAR").toUpperCase();

    const createBody = {
      action: "SALE",
      amount: {
        currencyCode,
        value: input.amountMinorUnits,
      },
      merchantAttributes: {
        redirectUrl: input.callbackUrl,
        cancelUrl: input.callbackUrl,
        merchantDefinedFields: {
          tenantId: input.tenantId,
          planCode: input.planCode,
          ...(input.metadata || {}),
        },
      },
    };

    const createRes = await fetch(
      `${getNgeniusBaseUrl()}/payment/v1/outlets/${encodeURIComponent(outletRef)}/orders`,
      {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify(createBody),
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!createRes.ok) {
      const text = await createRes.text();
      throw new Error(`N-Genius create order failed: ${createRes.status} ${text}`);
    }

    const order = await createRes.json();
    const orderId: string = order.id || "";
    const redirectUrl: string =
      order._links?.["payment-redirect"]?.href ||
      order._links?.["payment-redirect-url"]?.href ||
      "";

    if (!orderId || !redirectUrl) {
      throw new Error("N-Genius response missing order id or redirect URL");
    }

    return {
      providerReference: orderId,
      redirectUrl,
      providerStatus: order.status || "CREATED",
      rawPayload: order,
    };
  },

  async verifyPayment(providerReference: string): Promise<PaymentVerificationResult> {
    const outletRef = getNgeniusOutletRef();
    if (!outletRef) throw new Error("NGENIUS_OUTLET_REF not configured");

    const accessToken = await getAccessToken();

    const res = await fetch(
      `${getNgeniusBaseUrl()}/payment/v1/outlets/${encodeURIComponent(outletRef)}/orders/${encodeURIComponent(providerReference)}`,
      {
        headers: authHeaders(accessToken),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!res.ok) {
      throw new Error(`N-Genius verify failed: ${res.status}`);
    }

    const order = await res.json();
    const status: string = (order.status || "UNKNOWN").toUpperCase();
    const paid = ["PURCHASED", "CAPTURED", "AUTHORIZED"].includes(status);

    return {
      paid,
      providerReference: order.id || providerReference,
      amountMinorUnits: order.amount?.value ?? 0,
      currency: (order.amount?.currencyCode || "SAR").toUpperCase(),
      providerStatus: status,
      rawPayload: order,
    };
  },
};
