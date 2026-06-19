import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

vi.mock("server-only", () => ({}));

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const mocks = vi.hoisted(() => {
  const prisma = {
    whatsAppPhoneNumber: {
      findFirst: vi.fn(),
    },
    whatsAppMessage: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    lead: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    whatsAppContact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    prisma,
    classifyWhatsAppLeadInternal: vi.fn(),
    tenantContextRun: vi.fn(async (_context: unknown, callback: () => Promise<unknown>) => callback()),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/server/internal", () => ({
  classifyWhatsAppLeadInternal: mocks.classifyWhatsAppLeadInternal,
}));
vi.mock("@/lib/tenant-context", () => ({
  tenantContext: { run: mocks.tenantContextRun },
}));

async function importRoute() {
  return import("@/app/api/whatsapp/webhook/route");
}

function sign(rawBody: string, secret = "app-secret") {
  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
}

function postRequest(rawBody: string, options: { signature?: string | null; contentType?: string } = {}) {
  const headers = new Headers();
  headers.set("content-type", options.contentType ?? "application/json");
  if (options.signature !== undefined && options.signature !== null) {
    headers.set("x-hub-signature-256", options.signature);
  }

  return new Request("https://orca.test/api/whatsapp/webhook", {
    method: "POST",
    headers,
    body: rawBody,
  }) as any;
}

function getRequest(query: string) {
  return new Request(`https://orca.test/api/whatsapp/webhook${query}`) as any;
}

function messagePayload(overrides: Record<string, unknown> = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "phone-1" },
              messages: [
                {
                  id: "wamid-1",
                  from: "966500000001",
                  type: "text",
                  text: { body: "hello" },
                  timestamp: "1780000000",
                },
              ],
              ...overrides,
            },
          },
        ],
      },
    ],
  };
}

function statusPayload(status: Record<string, unknown> = {}) {
  return messagePayload({
    messages: undefined,
    statuses: [{ id: "wamid-1", status: "delivered", timestamp: "1780000001", ...status }],
  });
}

async function signedPost(payload: unknown) {
  const rawBody = JSON.stringify(payload);
  const { POST } = await importRoute();
  return POST(postRequest(rawBody, { signature: sign(rawBody) }));
}

function resetPrismaMocks() {
  mocks.prisma.whatsAppPhoneNumber.findFirst.mockResolvedValue({ tenantId: "tenant-1" });
  mocks.prisma.whatsAppMessage.create.mockResolvedValue({ id: "stored-message" });
  mocks.prisma.whatsAppMessage.findFirst.mockResolvedValue({
    status: "received",
    deliveredAt: null,
    readAt: null,
    failedAt: null,
  });
  mocks.prisma.whatsAppMessage.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.lead.findFirst.mockResolvedValue(null);
  mocks.prisma.lead.create.mockResolvedValue({ id: "lead-1" });
  mocks.prisma.lead.update.mockResolvedValue({ id: "lead-1" });
  mocks.prisma.whatsAppContact.findFirst.mockResolvedValue(null);
  mocks.prisma.whatsAppContact.create.mockResolvedValue({ id: "contact-1" });
  mocks.prisma.whatsAppContact.update.mockResolvedValue({ id: "contact-1" });
  mocks.classifyWhatsAppLeadInternal.mockResolvedValue({ success: true });
}

function allDbMocks() {
  return [
    mocks.prisma.whatsAppPhoneNumber.findFirst,
    mocks.prisma.whatsAppMessage.create,
    mocks.prisma.whatsAppMessage.findFirst,
    mocks.prisma.whatsAppMessage.updateMany,
    mocks.prisma.lead.findFirst,
    mocks.prisma.lead.create,
    mocks.prisma.lead.update,
    mocks.prisma.whatsAppContact.findFirst,
    mocks.prisma.whatsAppContact.create,
    mocks.prisma.whatsAppContact.update,
  ];
}

function p2002() {
  return Object.assign(new Error("unique"), { code: "P2002", meta: { target: ["metaMessageId"] } });
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (["node_modules", ".git", ".next", "docs"].includes(entry)) return [];
    if (statSync(fullPath).isDirectory()) return sourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

describe("WhatsApp webhook GET verification", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetPrismaMocks();
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-token";
    process.env.WHATSAPP_APP_SECRET = "app-secret";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    delete process.env.WHATSAPP_APP_SECRET;
  });

  it("returns 503 when the Verify Token is missing", async () => {
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    const { GET } = await importRoute();

    const response = await GET(getRequest("?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=abc"));

    expect(response.status).toBe(503);
  });

  it("rejects wrong mode, missing token, and wrong token", async () => {
    const { GET } = await importRoute();

    await expect(GET(getRequest("?hub.mode=ping&hub.verify_token=verify-token&hub.challenge=abc"))).resolves.toHaveProperty("status", 403);
    await expect(GET(getRequest("?hub.mode=subscribe&hub.challenge=abc"))).resolves.toHaveProperty("status", 403);
    await expect(GET(getRequest("?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc"))).resolves.toHaveProperty("status", 403);
  });

  it("accepts the correct token and returns only the challenge text", async () => {
    const { GET } = await importRoute();

    const response = await GET(getRequest("?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=challenge-123"));

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("challenge-123");
  });
});

describe("WhatsApp webhook POST signature gate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetPrismaMocks();
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-token";
    process.env.WHATSAPP_APP_SECRET = "app-secret";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    delete process.env.WHATSAPP_APP_SECRET;
  });

  it("returns 503 when the App Secret is missing", async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const { POST } = await importRoute();
    const rawBody = JSON.stringify(messagePayload());

    const response = await POST(postRequest(rawBody, { signature: sign(rawBody) }));

    expect(response.status).toBe(503);
  });

  it("rejects wrong content type before signature processing", async () => {
    const { POST } = await importRoute();
    const rawBody = JSON.stringify(messagePayload());

    const response = await POST(postRequest(rawBody, { signature: sign(rawBody), contentType: "text/plain" }));

    expect(response.status).toBe(415);
  });

  it("rejects bodies larger than 1 MiB", async () => {
    const { POST } = await importRoute();

    const response = await POST(postRequest("x".repeat(1024 * 1024 + 1), { signature: null }));

    expect(response.status).toBe(413);
  });

  it("rejects missing, malformed, wrong, and modified signatures before any DB call", async () => {
    const { POST } = await importRoute();
    const rawBody = JSON.stringify(messagePayload());

    await expect(POST(postRequest(rawBody, { signature: null }))).resolves.toHaveProperty("status", 401);
    await expect(POST(postRequest(rawBody, { signature: "sha256=not-hex" }))).resolves.toHaveProperty("status", 401);
    await expect(POST(postRequest(rawBody, { signature: sign(rawBody, "wrong-secret") }))).resolves.toHaveProperty("status", 401);
    await expect(POST(postRequest(JSON.stringify(messagePayload({ messages: [] })), { signature: sign(rawBody) }))).resolves.toHaveProperty("status", 401);

    for (const mock of allDbMocks()) {
      expect(mock).not.toHaveBeenCalled();
    }
    expect(mocks.classifyWhatsAppLeadInternal).not.toHaveBeenCalled();
  });

  it("parses only after a valid signature and rejects invalid signed JSON as 400", async () => {
    const { POST } = await importRoute();
    const invalidJson = "{not-json";

    const response = await POST(postRequest(invalidJson, { signature: sign(invalidJson) }));

    expect(response.status).toBe(400);
    for (const mock of allDbMocks()) {
      expect(mock).not.toHaveBeenCalled();
    }
  });

  it("rejects structurally invalid signed payloads", async () => {
    const response = await signedPost({ object: "whatsapp_business_account", entry: [{ changes: [{}] }] });

    expect(response.status).toBe(400);
    expect(mocks.prisma.whatsAppPhoneNumber.findFirst).not.toHaveBeenCalled();
  });

  it("ignores signed unsupported events without returning the payload", async () => {
    const response = await signedPost({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ value: { metadata: { phone_number_id: "phone-1" } } }] }],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, status: "ignored" });
    expect(mocks.prisma.whatsAppPhoneNumber.findFirst).not.toHaveBeenCalled();
  });

  it("accepts a valid signed message and performs tenant-scoped processing", async () => {
    const response = await signedPost(messagePayload());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, status: "accepted" });
    expect(mocks.prisma.whatsAppPhoneNumber.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ phoneNumberId: "phone-1", isActive: true }),
    }));
    expect(mocks.prisma.whatsAppMessage.create.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.classifyWhatsAppLeadInternal.mock.invocationCallOrder[0],
    );
  });
});

describe("WhatsApp webhook tenant isolation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetPrismaMocks();
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-token";
    process.env.WHATSAPP_APP_SECRET = "app-secret";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    delete process.env.WHATSAPP_APP_SECRET;
  });

  it("uses the active phone number mapping and applies tenant context before tenant writes", async () => {
    await signedPost(messagePayload({ tenantId: "payload-tenant", subdomain: "payload-subdomain" }));

    expect(mocks.tenantContextRun).toHaveBeenCalledWith({ tenantId: "tenant-1" }, expect.any(Function));
    const messageCreate = mocks.prisma.whatsAppMessage.create.mock.calls[0][0];
    expect(messageCreate.data.tenantId).toBe("tenant-1");
    expect(messageCreate.data.tenantId).not.toBe("payload-tenant");
  });

  it("ignores unknown, inactive mapping, and inactive tenant lookup results", async () => {
    mocks.prisma.whatsAppPhoneNumber.findFirst.mockResolvedValue(null);

    const response = await signedPost(messagePayload());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, status: "ignored" });
    expect(mocks.prisma.whatsAppMessage.create).not.toHaveBeenCalled();
    expect(mocks.classifyWhatsAppLeadInternal).not.toHaveBeenCalled();
  });

  it("ignores payload tenantId and subdomain when deriving tenant", async () => {
    await signedPost(messagePayload({ tenantId: "evil-tenant", subdomain: "evil" }));

    expect(mocks.prisma.whatsAppPhoneNumber.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ phoneNumberId: "phone-1" }),
    }));
    expect(mocks.prisma.lead.create.mock.calls[0][0].data.tenantId).toBe("tenant-1");
  });
});

describe("WhatsApp webhook replay protection", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetPrismaMocks();
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-token";
    process.env.WHATSAPP_APP_SECRET = "app-secret";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    delete process.env.WHATSAPP_APP_SECRET;
  });

  it("processes a new message once", async () => {
    await signedPost(messagePayload());

    expect(mocks.prisma.whatsAppMessage.create).toHaveBeenCalledTimes(1);
    expect(mocks.classifyWhatsAppLeadInternal).toHaveBeenCalledTimes(1);
  });

  it("handles sequential P2002 duplicates without classifier side effects", async () => {
    mocks.prisma.whatsAppMessage.create.mockResolvedValueOnce({ id: "stored-message" }).mockRejectedValueOnce(p2002());

    const first = await signedPost(messagePayload());
    const second = await signedPost(messagePayload());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toEqual({ ok: true, status: "duplicate" });
    expect(mocks.classifyWhatsAppLeadInternal).toHaveBeenCalledTimes(1);
  });

  it("handles concurrent duplicate delivery with one classifier call", async () => {
    mocks.prisma.whatsAppMessage.create.mockResolvedValueOnce({ id: "stored-message" }).mockRejectedValueOnce(p2002());

    const [first, second] = await Promise.all([signedPost(messagePayload()), signedPost(messagePayload())]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([200, 200]);
    expect(mocks.classifyWhatsAppLeadInternal).toHaveBeenCalledTimes(1);
  });

  it("does not create messages from status events and ignores duplicate statuses", async () => {
    const deliveredAt = new Date(1780000001 * 1000);
    mocks.prisma.whatsAppMessage.findFirst.mockResolvedValue({
      status: "delivered",
      deliveredAt,
      readAt: null,
      failedAt: null,
    });

    const response = await signedPost(statusPayload());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, status: "ignored" });
    expect(mocks.prisma.whatsAppMessage.create).not.toHaveBeenCalled();
    expect(mocks.prisma.whatsAppMessage.updateMany).not.toHaveBeenCalled();
  });

  it("updates known statuses only and ignores unknown status IDs", async () => {
    mocks.prisma.whatsAppMessage.findFirst.mockResolvedValueOnce(null);
    const ignored = await signedPost(statusPayload({ id: "unknown" }));
    expect(await ignored.json()).toEqual({ ok: true, status: "ignored" });

    resetPrismaMocks();
    const accepted = await signedPost(statusPayload());
    expect(await accepted.json()).toEqual({ ok: true, status: "accepted" });
    expect(mocks.prisma.whatsAppMessage.updateMany).toHaveBeenCalledTimes(1);
  });

  it("does not use in-memory replay dedupe", () => {
    const routeSource = readFileSync(path.join(repoRoot, "app/api/whatsapp/webhook/route.ts"), "utf8");

    expect(routeSource).not.toMatch(/\bnew\s+(Set|Map)\b|\bglobalThis\b|\bmemory cache\b/i);
    expect(routeSource).toContain("metaMessageId");
  });
});

describe("WhatsApp webhook exposure controls", () => {
  it("keeps the internal classifier server-only with the webhook route as the sole trusted caller", () => {
    const internalSource = readFileSync(path.join(repoRoot, "lib/server/internal.ts"), "utf8");
    expect(internalSource).toContain('import "server-only";');
    expect(internalSource).not.toContain('"use server"');
    expect(internalSource).not.toContain("'use server'");

    const callers = sourceFiles(repoRoot)
      .filter((file) => !file.endsWith(path.join("lib", "server", "internal.ts")))
      .filter((file) => !file.endsWith(path.join("tests", "whatsapp-webhook-security.test.ts")))
      .filter((file) => readFileSync(file, "utf8").includes("classifyWhatsAppLeadInternal"))
      .map((file) => path.relative(repoRoot, file).replaceAll("\\", "/"));

    expect(callers).toEqual(["app/api/whatsapp/webhook/route.ts"]);
  });

  it("has no Server Action wrapper or client exposure for the internal classifier", () => {
    const actionFiles = sourceFiles(path.join(repoRoot, "app/actions"));
    const actionImports = actionFiles.filter((file) => readFileSync(file, "utf8").includes("classifyWhatsAppLeadInternal"));
    expect(actionImports).toEqual([]);

    const clientFiles = sourceFiles(path.join(repoRoot, "app"))
      .filter((file) => readFileSync(file, "utf8").includes("use client"))
      .filter((file) => readFileSync(file, "utf8").includes("classifyWhatsAppLeadInternal"));
    expect(clientFiles).toEqual([]);
  });

  it("keeps classifier names out of the built Server Action manifest when present", () => {
    const manifestPath = path.join(repoRoot, ".next/server/server-reference-manifest.json");
    if (!existsSync(manifestPath)) return;

    const manifest = readFileSync(manifestPath, "utf8");
    expect(manifest).not.toContain("classifyWhatsAppLeadInternal");
    expect(manifest).not.toContain("classifyWhatsAppLead");
  });
});
