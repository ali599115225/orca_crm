import "server-only";
import type {
  PaymentCreateInput,
  PaymentProviderAdapter,
  PaymentProviderResult,
  PaymentVerificationResult,
} from "../types";

export type NgeniusProviderConfig = {
  apiKey?: string;
  outletRef?: string;
  baseUrl?: string | null;
};

export function createNgeniusProvider(
  config: NgeniusProviderConfig = {},
): PaymentProviderAdapter {
  const apiKey = () => config.apiKey || process.env.NGENIUS_API_KEY || "";
  const outletRef = () =>
    config.outletRef || process.env.NGENIUS_OUTLET_REF || "";
  const baseUrl = () =>
    config.baseUrl ||
    process.env.NGENIUS_API_URL ||
    "https://api-gateway.sandbox.ngenius-payments.com";

  async function getAccessToken(): Promise<string> {
    const key = apiKey();
    if (!key) throw new Error("NGENIUS_API_KEY not configured");

    const response = await fetch(
      `${baseUrl()}/identity/auth/access-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.ni-identity.v1+json",
          Authorization: `Basic ${key}`,
        },
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      const body = (await response.text()).slice(0, 800);
      throw new Error(`N-Genius auth failed: ${response.status} ${body}`);
    }

    const payload = await response.json();
    const token = String(payload.access_token || "");
    if (!token) throw new Error("NGENIUS_ACCESS_TOKEN_MISSING");
    return token;
  }

  function authHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/vnd.ni-payment.v2+json",
    };
  }

  return {
    code: "NGENIUS",

    async createPayment(
      input: PaymentCreateInput,
    ): Promise<PaymentProviderResult> {
      const outlet = outletRef();
      if (!outlet) throw new Error("NGENIUS_OUTLET_REF not configured");

      const token = await getAccessToken();
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

      const response = await fetch(
        `${baseUrl()}/payment/v1/outlets/${encodeURIComponent(outlet)}/orders`,
        {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify(createBody),
          redirect: "error",
          signal: AbortSignal.timeout(20_000),
        },
      );

      if (!response.ok) {
        const body = (await response.text()).slice(0, 800);
        throw new Error(
          `N-Genius create order failed: ${response.status} ${body}`,
        );
      }

      const order = await response.json();
      const reference = String(order.id || "");
      const redirectUrl = String(
        order._links?.["payment-redirect"]?.href ||
          order._links?.["payment-redirect-url"]?.href ||
          "",
      );

      if (!reference || !redirectUrl) {
        throw new Error("NGENIUS_ORDER_RESPONSE_INCOMPLETE");
      }

      return {
        providerReference: reference,
        redirectUrl,
        providerStatus: String(order.status || "CREATED"),
        rawPayload: order,
      };
    },

    async verifyPayment(
      providerReference: string,
    ): Promise<PaymentVerificationResult> {
      const outlet = outletRef();
      if (!outlet) throw new Error("NGENIUS_OUTLET_REF not configured");

      const token = await getAccessToken();
      const response = await fetch(
        `${baseUrl()}/payment/v1/outlets/${encodeURIComponent(outlet)}/orders/${encodeURIComponent(providerReference)}`,
        {
          headers: authHeaders(token),
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        },
      );

      if (!response.ok) {
        throw new Error(`N-Genius verify failed: ${response.status}`);
      }

      const order = await response.json();
      const status = String(order.status || "UNKNOWN").toUpperCase();

      return {
        paid: ["PURCHASED", "CAPTURED", "AUTHORIZED"].includes(status),
        providerReference: String(order.id || providerReference),
        amountMinorUnits: Number(order.amount?.value || 0),
        currency: String(
          order.amount?.currencyCode || "SAR",
        ).toUpperCase(),
        providerStatus: status,
        rawPayload: order,
      };
    },
  };
}

export const ngeniusProvider = createNgeniusProvider();
