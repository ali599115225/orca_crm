import { createCipheriv, createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const revenueMocks = vi.hoisted(() => ({
  connectionFindFirst: vi.fn(),
  webhookFindFirst: vi.fn(),
  webhookCreate: vi.fn(),
  appendRevenueEvent: vi.fn(),
}));

const leadMocks = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  leadFindFirst: vi.fn(),
  leadCreate: vi.fn(),
  leadGroupBy: vi.fn(),
  userFindMany: vi.fn(),
  telemetryCreate: vi.fn(),
  transaction: vi.fn(),
  rateLimit: vi.fn(),
  decryptSecret: vi.fn(),
  assertPlanLimit: vi.fn(),
  logPlanBlockedAttempt: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  rawPrisma: {
    revenueProviderConnection: { findFirst: revenueMocks.connectionFindFirst },
    revenueProviderWebhook: {
      findFirst: revenueMocks.webhookFindFirst,
      create: revenueMocks.webhookCreate,
    },
  },
  prisma: {
    tenant: { findUnique: leadMocks.tenantFindUnique },
    lead: {
      findFirst: leadMocks.leadFindFirst,
      groupBy: leadMocks.leadGroupBy,
    },
    user: { findMany: leadMocks.userFindMany },
    agentTelemetryLog: { create: leadMocks.telemetryCreate },
    $transaction: leadMocks.transaction,
  },
}));

vi.mock("@/lib/revenue-integrity/events", () => ({
  appendRevenueEvent: revenueMocks.appendRevenueEvent,
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: leadMocks.rateLimit }));
vi.mock("@/lib/secret-encryption", () => ({ decryptSecret: leadMocks.decryptSecret }));
vi.mock("@/lib/plan-guard", () => {
  class PlanLimitError extends Error {}
  return {
    PlanLimitError,
    assertPlanLimit: leadMocks.assertPlanLimit,
    logPlanBlockedAttempt: leadMocks.logPlanBlockedAttempt,
  };
});
vi.mock("@/lib/privacy-mask", () => ({
  hashEmail: vi.fn(() => "email-hash"),
  hashPhone: vi.fn(() => "phone-hash"),
}));
vi.mock("@/lib/errors", () => ({
  ErrorCode: {
    BAD_REQUEST: "BAD_REQUEST",
    RATE_LIMITED: "RATE_LIMITED",
    WEBHOOK_INVALID: "WEBHOOK_INVALID",
    SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
    CONFLICT: "CONFLICT",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    PLAN_LIMIT: "PLAN_LIMIT",
    INTERNAL_ERROR: "INTERNAL_ERROR",
  },
  classifyError: vi.fn(() => "INTERNAL_ERROR"),
  publicError: vi.fn((code: string, context: string) => ({ code, context })),
  statusForErrorCode: vi.fn((code: string) => ({
    BAD_REQUEST: 400,
    RATE_LIMITED: 429,
    WEBHOOK_INVALID: 401,
    SERVICE_UNAVAILABLE: 503,
    CONFLICT: 409,
    VALIDATION_ERROR: 400,
    PLAN_LIMIT: 402,
    INTERNAL_ERROR: 500,
  })[code] ?? 500),
}));

import { POST as revenueWebhook } from "@/app/api/revenue-integrity/webhook/[provider]/route";
import { POST as leadsWebhook } from "@/app/api/v1/leads/webhook/route";

const MASTER_KEY_HEX = "11".repeat(32);
const PROVIDER_SECRET = "provider-webhook-secret-123456";
const LEADS_SECRET = "leads-webhook-secret-1234567890";

function encryptedCredentials(credentials: Record<string, unknown>): string {
  const key = Buffer.from(MASTER_KEY_HEX, "hex");
  const iv = Buffer.alloc(12, 7);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${body.toString("base64url")}`;
}

function revenueRequest(rawBody: string, signature: string): NextRequest {
  return new NextRequest(
    "http://localhost/api/revenue-integrity/webhook/PAYLINK?connectionId=connection-1",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-event-id": "event-1",
        "x-orca-signature": signature,
      },
      body: rawBody,
    },
  );
}

function leadsRequest(rawBody: string, signature: string, timestamp: string): NextRequest {
  return new NextRequest("http://localhost/api/v1/leads/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-key-id": "a".repeat(32),
      "x-webhook-timestamp": timestamp,
      "x-webhook-signature": signature,
      "x-forwarded-for": "127.0.0.1",
    },
    body: rawBody,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ORCA_REVENUE_MASTER_KEY = MASTER_KEY_HEX;

  revenueMocks.connectionFindFirst.mockResolvedValue({
    id: "connection-1",
    tenantId: "tenant-1",
    provider: "PAYLINK",
    status: "CONNECTED",
    encryptedCredentials: encryptedCredentials({ webhookSecret: PROVIDER_SECRET }),
  });
  revenueMocks.webhookFindFirst.mockResolvedValue(null);
  revenueMocks.webhookCreate.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: "webhook-1",
      tenantId: data.tenantId,
      verified: data.verified,
    }),
  );
  revenueMocks.appendRevenueEvent.mockResolvedValue(undefined);

  leadMocks.rateLimit.mockResolvedValue({ allowed: true });
  leadMocks.tenantFindUnique.mockResolvedValue({
    id: "tenant-1",
    isActive: true,
    encryptedLeadsWebhookSecret: "encrypted-leads-secret",
  });
  leadMocks.decryptSecret.mockReturnValue(LEADS_SECRET);
  leadMocks.leadFindFirst.mockResolvedValue(null);
  leadMocks.userFindMany.mockResolvedValue([]);
  leadMocks.leadGroupBy.mockResolvedValue([]);
  leadMocks.leadCreate.mockResolvedValue({ id: "lead-1" });
  leadMocks.assertPlanLimit.mockResolvedValue(undefined);
  leadMocks.transaction.mockImplementation(
    async (operation: (tx: unknown) => unknown) =>
      await operation({ lead: { create: leadMocks.leadCreate } }),
  );
  leadMocks.telemetryCreate.mockResolvedValue({});
});

describe("EXEC-003 signed boundaries", () => {
  it("DIRECT_BEHAVIORAL EXEC-003-C02-O01 rejects an invalid provider HMAC through the real signed boundary", async () => {
    const rawBody = JSON.stringify({ event: "payment" });
    const response = await revenueWebhook(
      revenueRequest(rawBody, "00".repeat(32)),
      { params: Promise.resolve({ provider: "PAYLINK" }) },
    );

    expect(response.status).toBe(400);
    expect(revenueMocks.webhookCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ verified: false, status: "REJECTED" }),
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C02-O01 accepts a valid provider HMAC without a user-session boundary", async () => {
    const rawBody = JSON.stringify({ event: "payment" });
    const signature = createHmac("sha256", PROVIDER_SECRET)
      .update(rawBody)
      .digest("hex");
    const response = await revenueWebhook(
      revenueRequest(rawBody, signature),
      { params: Promise.resolve({ provider: "PAYLINK" }) },
    );

    expect(response.status).toBe(202);
    expect(revenueMocks.webhookCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ verified: true, status: "VERIFIED" }),
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C09-O01 rejects an invalid leads HMAC before lead creation", async () => {
    const rawBody = JSON.stringify({ fullName: "Test Lead", phone: "0500000000" });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const response = await leadsWebhook(
      leadsRequest(rawBody, "00".repeat(32), timestamp),
    );

    expect(response.status).toBe(401);
    expect(leadMocks.leadCreate).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C09-O01 accepts the real timestamped HMAC and reaches tenant-scoped lead creation", async () => {
    const rawBody = JSON.stringify({
      fullName: "Test Lead",
      phone: "0500000000",
      email: "lead@example.com",
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", LEADS_SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await leadsWebhook(
      leadsRequest(rawBody, signature, timestamp),
    );

    expect(response.status).toBe(201);
    expect(leadMocks.assertPlanLimit).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1", feature: "leads" }),
    );
    expect(leadMocks.leadCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: "tenant-1", phone: "0500000000" }),
      }),
    );
  });
});
