import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ngeniusProvider } from "@/lib/payments/providers/ngenius";

const createInput = {
  tenantId: "tenant-1",
  planCode: "installment-abc",
  amountMinorUnits: 500_00,
  currency: "SAR",
  description: "Installment payment",
  callbackUrl: "https://orca.test/api/payments/ngenius/webhook",
};

function mockFetchSequence(responses: Array<{ ok: boolean; status?: number; json?: any; text?: string }>) {
  let callIndex = 0;
  return vi.fn().mockImplementation(async () => {
    const response = responses[callIndex] || responses[responses.length - 1];
    callIndex++;
    return {
      ok: response.ok,
      status: response.status || (response.ok ? 200 : 400),
      json: async () => response.json || {},
      text: async () => response.text || "",
    };
  });
}

describe("N-Genius provider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("authenticates via /identity/auth/access-token then creates order", async () => {
    vi.stubEnv("NGENIUS_API_KEY", "ngenius-sandbox-key");
    vi.stubEnv("NGENIUS_OUTLET_REF", "outlet-123");

    const fetchMock = mockFetchSequence([
      {
        ok: true,
        json: { access_token: "sandbox-access-token-xyz" },
      },
      {
        ok: true,
        json: {
          id: "ngenius-order-1",
          status: "CREATED",
          _links: {
            "payment-redirect": {
              href: "https://pay.sandbox.ngenius.com/ngenius-order-1",
            },
          },
        },
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await ngeniusProvider.createPayment(createInput);

    expect(result).toMatchObject({
      providerReference: "ngenius-order-1",
      redirectUrl: "https://pay.sandbox.ngenius.com/ngenius-order-1",
      providerStatus: "CREATED",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const authCall = fetchMock.mock.calls[0];
    expect(authCall[0]).toContain("/identity/auth/access-token");
    expect(authCall[1].headers.Authorization).toBe("Basic ngenius-sandbox-key");
    expect(authCall[1]).not.toHaveProperty("body");
    expect(authCall[1].headers["Content-Type"]).toBe("application/vnd.ni-identity.v1+json");

    const orderCall = fetchMock.mock.calls[1];
    expect(orderCall[0]).toContain("/payment/v1/outlets/outlet-123/orders");
    expect(orderCall[1].headers.Authorization).toBe("Bearer sandbox-access-token-xyz");
    expect(orderCall[1].headers["Content-Type"]).toBe("application/vnd.ni-payment.v2+json");

    const body = JSON.parse(orderCall[1].body);
    expect(body).toMatchObject({
      action: "SALE",
      amount: {
        currencyCode: "SAR",
        value: 500_00,
      },
    });
    expect(body.merchantAttributes).not.toHaveProperty("outletReference");
  });

  it("authenticates then verifies an authorized order", async () => {
    vi.stubEnv("NGENIUS_API_KEY", "ngenius-sandbox-key");
    vi.stubEnv("NGENIUS_OUTLET_REF", "outlet-123");

    const fetchMock = mockFetchSequence([
      {
        ok: true,
        json: { access_token: "sandbox-access-token-xyz" },
      },
      {
        ok: true,
        json: {
          id: "ngenius-order-1",
          status: "AUTHORIZED",
          amount: {
            value: 500_00,
            currencyCode: "SAR",
          },
        },
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(ngeniusProvider.verifyPayment("ngenius-order-1")).resolves.toMatchObject({
      paid: true,
      providerReference: "ngenius-order-1",
      amountMinorUnits: 500_00,
      currency: "SAR",
      providerStatus: "AUTHORIZED",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const verifyCall = fetchMock.mock.calls[1];
    expect(verifyCall[0]).toContain("/payment/v1/outlets/outlet-123/orders/ngenius-order-1");
  });

  it("verifies a captured order as paid", async () => {
    vi.stubEnv("NGENIUS_API_KEY", "ngenius-sandbox-key");
    vi.stubEnv("NGENIUS_OUTLET_REF", "outlet-123");

    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        { ok: true, json: { access_token: "token" } },
        {
          ok: true,
          json: {
            id: "ngenius-order-1",
            status: "CAPTURED",
            amount: { value: 500_00, currencyCode: "SAR" },
          },
        },
      ]),
    );

    await expect(ngeniusProvider.verifyPayment("ngenius-order-1")).resolves.toMatchObject({
      paid: true,
      providerStatus: "CAPTURED",
    });
  });


  it("verifies a purchased SALE order as paid", async () => {
    vi.stubEnv("NGENIUS_API_KEY", "ngenius-sandbox-key");
    vi.stubEnv("NGENIUS_OUTLET_REF", "outlet-123");

    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        { ok: true, json: { access_token: "token" } },
        {
          ok: true,
          json: {
            id: "ngenius-order-1",
            status: "PURCHASED",
            amount: { value: 500_00, currencyCode: "SAR" },
          },
        },
      ]),
    );

    await expect(ngeniusProvider.verifyPayment("ngenius-order-1")).resolves.toMatchObject({
      paid: true,
      providerStatus: "PURCHASED",
    });
  });

  it("returns paid=false for non-terminal statuses", async () => {
    vi.stubEnv("NGENIUS_API_KEY", "ngenius-sandbox-key");
    vi.stubEnv("NGENIUS_OUTLET_REF", "outlet-123");

    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        { ok: true, json: { access_token: "token" } },
        {
          ok: true,
          json: {
            id: "ngenius-order-1",
            status: "PENDING",
            amount: { value: 500_00, currencyCode: "SAR" },
          },
        },
      ]),
    );

    await expect(ngeniusProvider.verifyPayment("ngenius-order-1")).resolves.toMatchObject({
      paid: false,
      providerStatus: "PENDING",
    });
  });

  it("fails closed when NGENIUS_API_KEY is missing", async () => {
    vi.stubEnv("NGENIUS_API_KEY", "");
    vi.stubEnv("NGENIUS_OUTLET_REF", "outlet-123");
    await expect(ngeniusProvider.createPayment(createInput)).rejects.toThrow(
      "NGENIUS_API_KEY not configured",
    );
    await expect(ngeniusProvider.verifyPayment("missing")).rejects.toThrow(
      "NGENIUS_API_KEY not configured",
    );
  });

  it("fails closed when NGENIUS_OUTLET_REF is missing", async () => {
    vi.stubEnv("NGENIUS_API_KEY", "ngenius-sandbox-key");
    vi.stubEnv("NGENIUS_OUTLET_REF", "");
    await expect(ngeniusProvider.createPayment(createInput)).rejects.toThrow(
      "NGENIUS_OUTLET_REF not configured",
    );
  });

  it("throws on auth endpoint failure", async () => {
    vi.stubEnv("NGENIUS_API_KEY", "ngenius-sandbox-key");
    vi.stubEnv("NGENIUS_OUTLET_REF", "outlet-123");

    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        { ok: false, status: 401, text: "Unauthorized" },
      ]),
    );

    await expect(ngeniusProvider.createPayment(createInput)).rejects.toThrow(
      "N-Genius auth failed",
    );
  });

  it("throws on order creation failure after successful auth", async () => {
    vi.stubEnv("NGENIUS_API_KEY", "ngenius-sandbox-key");
    vi.stubEnv("NGENIUS_OUTLET_REF", "outlet-123");

    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        { ok: true, json: { access_token: "token" } },
        { ok: false, status: 400, text: "Bad Request" },
      ]),
    );

    await expect(ngeniusProvider.createPayment(createInput)).rejects.toThrow(
      "N-Genius create order failed",
    );
  });

  it("throws on verify failure after successful auth", async () => {
    vi.stubEnv("NGENIUS_API_KEY", "ngenius-sandbox-key");
    vi.stubEnv("NGENIUS_OUTLET_REF", "outlet-123");

    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        { ok: true, json: { access_token: "token" } },
        { ok: false, status: 404 },
      ]),
    );

    await expect(ngeniusProvider.verifyPayment("missing")).rejects.toThrow(
      "N-Genius verify failed",
    );
  });
});
