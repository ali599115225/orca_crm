import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runWithTenantContext } from "@/lib/tenant-context";

const state = vi.hoisted(() => ({
  contracts: [] as any[], snapshots: [] as any[], documents: [] as any[], deliveries: [] as any[],
  failCreate: false, failUpdate: false, failDocument: false, conflict: false, allow: true,
}));
const db = vi.hoisted(() => {
  const matches = (row: any, where: any) => Object.entries(where).every(([key, value]) => row[key] === value);
  const db: any = {
    contract: { findFirst: vi.fn(async ({ where }: any) => state.contracts.find(row => matches(row, where)) ?? null) },
    contractSnapshot: { findFirst: vi.fn(async ({ where }: any) => state.snapshots.filter(row => matches(row, where)).sort((a, b) => b.contractVersion - a.contractVersion)[0] ?? null) },
    document: { create: vi.fn(async ({ data }: any) => {
      if (state.failDocument) throw new Error("document persistence unavailable");
      const row = { ...data, id: `document-${state.documents.length + 1}`, createdAt: new Date(), updatedAt: new Date() };
      state.documents.push(row); return row;
    }) },
    contractDelivery: {
      create: vi.fn(async ({ data }: any) => {
        if (state.failCreate) throw new Error("delivery persistence unavailable");
        const row = { ...data, id: `delivery-${state.deliveries.length + 1}` };
        state.deliveries.push(row); return row;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (state.failUpdate) throw new Error("outcome persistence unavailable");
        if (state.conflict) return { count: 0 };
        const rows = state.deliveries.filter(row => matches(row, where));
        rows.forEach(row => Object.assign(row, data)); return { count: rows.length };
      }),
    },
  };
  db.$transaction = vi.fn(async (operation: any) => {
    const documents = state.documents.slice(), deliveries = state.deliveries.slice();
    try { return await operation(db); } catch (error) {
      state.documents = documents; state.deliveries = deliveries; throw error;
    }
  });
  return db;
});
const email = vi.hoisted(() => vi.fn());
const guard = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/email", () => ({ sendEmail: email }));
vi.mock("@/lib/auth/exec-003-shared-guard", () => ({ runWithExec003CookiePermission: guard }));
vi.mock("@/lib/documents/access", () => ({
  DOCUMENT_READ_ROLES: [], DOCUMENT_UPLOAD_ROLES: [], DOCUMENT_DELETE_ROLES: [],
  DocumentAccessError: class extends Error {},
  runWithDocumentAccess: async (_roles: any, operation: any) => operation({ tenantId: "tenant-1", userId: "user-1", name: "Owner" }),
}));

import { buildSignedOperationalSnapshot } from "@/lib/domain/transaction-spine/signed-contract-snapshot";
import { sendContractDocument } from "@/lib/domain/transaction-spine/send-contract-document";
import { POST as sendRoute } from "@/app/api/v1/contracts/[id]/send/route";
import { POST as uploadRoute } from "@/app/api/v1/documents/route";

const signedAt = new Date("2026-09-21T09:30:00.000Z");
const input = { tenantId: "tenant-1", userId: "user-1", ownerName: "Owner", contractId: "contract-1", recipient: "buyer@example.test" };
function execute(overrides = {}) {
  return runWithTenantContext({ tenantId: "tenant-1", userId: "user-1" }, () => sendContractDocument({ ...input, ...overrides }));
}
function request(body: any) {
  return new NextRequest("http://localhost/api/v1/contracts/contract-1/send", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
beforeEach(() => {
  state.documents = []; state.deliveries = []; state.failCreate = false;
  state.failUpdate = false; state.failDocument = false; state.conflict = false; state.allow = true;
  state.contracts = [{ id: "contract-1", tenantId: "tenant-1", status: "SIGNED", signedAt, buyerName: "LIVE MUTATED NAME" }];
  state.snapshots = [{ id: "snapshot-1", ...buildSignedOperationalSnapshot({
    contract: { id: "contract-1", tenantId: "tenant-1", unitId: "unit-1", leadId: null, offerId: null,
      buyerName: "Signed Buyer <One>", buyerPhone: "0500000000", totalVolumeSar: "1000.00",
      acceptedAt: signedAt, signedAt, status: "SIGNED", version: 2, spineVersion: 2,
      vatType: "STANDARD", vatRate: "15.00", tenant: { companyName: "Seller" } },
    paymentPlan: null, installments: [], invoice: null, signatureEvidenceHash: "a".repeat(64),
  }) }];
  email.mockImplementation(async () => {
    expect(state.deliveries[0].status).toBe("PENDING");
    expect(state.documents).toHaveLength(1);
    return { success: true, provider: "RESEND", providerMessageId: "provider-1" };
  });
  guard.mockImplementation(async (_r, _roles, _permission, operation) => state.allow
    ? runWithTenantContext({ tenantId: "tenant-1", userId: "user-1" }, () => operation({ tenantId: "tenant-1", userId: "user-1", name: "Owner" }))
    : NextResponse.json({ success: false }, { status: 403 }));
});

describe("Contract Batch 4 runtime through the send entry point", () => {
  it("persists the exact signed document and PENDING -> SENT provider evidence", async () => {
    const response = await sendRoute(request({ confirm: true, recipient: input.recipient,
      tenantId: "foreign", documentId: "draft-upload", snapshotId: "foreign-snapshot" }), { params: Promise.resolve({ id: "contract-1" }) });
    expect(response.status).toBe(200);
    expect(guard.mock.calls[0].slice(1, 3)).toEqual([["ADMIN", "SALES_MANAGER"], "contracts.pdf.read"]);
    const document = state.documents[0], delivery = state.deliveries[0];
    expect(document).toMatchObject({ tenantId: "tenant-1", contractId: "contract-1", type: "CONTRACT", mimeType: "text/html" });
    const html = Buffer.from(document.content).toString("utf8");
    expect(html).toContain("Signed Buyer &lt;One&gt;");
    expect(html).not.toContain("LIVE MUTATED NAME");
    expect(html).toContain("a".repeat(64));
    expect(document.checksumSha256).toBe(createHash("sha256").update(document.content).digest("hex"));
    expect(email).toHaveBeenCalledExactlyOnceWith({ tenantId: "tenant-1", to: input.recipient, subject: "CONTRACT-CONTRACT", htmlBody: html });
    expect(delivery).toMatchObject({ tenantId: "tenant-1", contractId: "contract-1", documentId: document.id,
      snapshotId: "snapshot-1", status: "SENT", channel: "EMAIL", recipient: input.recipient,
      provider: "RESEND", providerReference: "provider-1", errorMessage: null, failedAt: null });
    expect(delivery.sentAt).toBeInstanceOf(Date);
    expect(db.contractDelivery.updateMany.mock.calls[0][0].where).toMatchObject({ tenantId: "tenant-1", contractId: "contract-1", status: "PENDING" });
  });
  it("records provider rejection as FAILED with a safe error and failure time", async () => {
    email.mockResolvedValue({ success: false, provider: "SMTP", error: "private provider details" });
    const result = await execute();
    expect(result.status).toBe("FAILED");
    expect(state.deliveries[0]).toMatchObject({ status: "FAILED", provider: "SMTP", sentAt: null, errorMessage: "CONTRACT_EMAIL_SEND_FAILED" });
    expect(state.deliveries[0].failedAt).toBeInstanceOf(Date);
  });
  it("records missing provider configuration as a failed attempt", async () => {
    email.mockResolvedValue({ success: false, code: "EMAIL_PROVIDER_NOT_CONFIGURED" });
    await execute();
    expect(state.deliveries[0]).toMatchObject({ status: "FAILED", provider: null, errorMessage: "EMAIL_PROVIDER_NOT_CONFIGURED" });
  });
  it.each(["unsigned", "missing", "hash", "digest", "foreign-contract", "foreign-snapshot", "wrong-contract", "signed-date"])("rejects %s before document persistence or provider IO", async (variant) => {
    if (variant === "unsigned") state.contracts[0].status = "PENDING_SIGNATURE";
    if (variant === "missing") state.snapshots = [];
    if (variant === "hash") state.snapshots[0].signatureEvidenceHash = null;
    if (variant === "digest") state.snapshots[0].structuredFacts.contract.buyerName = "tampered";
    if (variant === "foreign-contract") state.contracts[0].tenantId = "tenant-2";
    if (variant === "foreign-snapshot") state.snapshots[0].tenantId = "tenant-2";
    if (variant === "wrong-contract") state.snapshots[0].contractId = "other-contract";
    if (variant === "signed-date") state.contracts[0].signedAt = new Date("2026-09-22T00:00:00Z");
    await expect(execute()).rejects.toThrow();
    expect(state.documents).toHaveLength(0); expect(state.deliveries).toHaveLength(0); expect(email).not.toHaveBeenCalled();
  });
  it("rejects caller/context tenant and user mismatches", async () => {
    await expect(execute({ tenantId: "tenant-2" })).rejects.toThrow("CONTRACT_DELIVERY_TENANT_MISMATCH");
    await expect(execute({ userId: "user-2" })).rejects.toThrow("CONTRACT_DELIVERY_TENANT_MISMATCH");
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each(["bad", "a@example.test,b@example.test", "a@example.test\r\nBcc: b@example.test"])("rejects recipient %s", async recipient => {
    await expect(execute({ recipient })).rejects.toThrow("CONTRACT_RECIPIENT_INVALID");
    expect(email).not.toHaveBeenCalled();
  });
  it.each(["failCreate", "failDocument"] as const)("does not send when %s occurs", async flag => {
    state[flag] = true;
    await expect(execute()).rejects.toThrow();
    expect(state.documents).toHaveLength(0); expect(state.deliveries).toHaveLength(0); expect(email).not.toHaveBeenCalled();
  });
  it("does not relabel provider acceptance as failure when outcome persistence fails", async () => {
    state.failUpdate = true;
    await expect(execute()).rejects.toThrow("outcome persistence unavailable");
    expect(state.deliveries[0].status).toBe("PENDING");
    expect(email).toHaveBeenCalledTimes(1); expect(db.contractDelivery.updateMany).toHaveBeenCalledTimes(1);
  });
  it("does not retry or assert failure for an unknown provider outcome", async () => {
    email.mockRejectedValue(new Error("transport interrupted"));
    await expect(execute()).rejects.toThrow("CONTRACT_DELIVERY_OUTCOME_UNKNOWN");
    expect(state.deliveries[0].status).toBe("PENDING"); expect(email).toHaveBeenCalledTimes(1);
    expect(db.contractDelivery.updateMany).not.toHaveBeenCalled();
  });
  it("fails closed when the PENDING transition did not update exactly one row", async () => {
    state.conflict = true;
    await expect(execute()).rejects.toThrow("CONTRACT_DELIVERY_STATE_CONFLICT");
    expect(email).toHaveBeenCalledTimes(1);
  });
  it("requires confirmation and honors access denial before any writes", async () => {
    const params = { params: Promise.resolve({ id: "contract-1" }) };
    expect((await sendRoute(request({ recipient: input.recipient }), params)).status).toBe(400);
    state.allow = false;
    expect((await sendRoute(request({ confirm: true, recipient: input.recipient }), params)).status).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled(); expect(email).not.toHaveBeenCalled();
  });
});

describe("Document upload contract association", () => {
  async function upload(contractId?: string, type = "CONTRACT") {
    const body = new FormData(); body.set("type", type);
    body.set("file", new File(["%PDF-1.4\nfixture"], "contract.pdf", { type: "application/pdf" }));
    if (contractId) body.set("contractId", contractId);
    return uploadRoute(new NextRequest("http://localhost/api/v1/documents", { method: "POST", body }));
  }
  it("writes the real contract FK with the authenticated tenant", async () => {
    expect((await upload("contract-1")).status).toBe(201);
    expect(state.documents[0]).toMatchObject({ tenantId: "tenant-1", contractId: "contract-1" });
    expect(db.contract.findFirst).toHaveBeenCalledWith({ where: { id: "contract-1", tenantId: "tenant-1" }, select: { id: true } });
  });
  it("rejects cross-tenant contract association", async () => {
    state.contracts[0].tenantId = "tenant-2";
    expect((await upload("contract-1")).status).toBe(404); expect(state.documents).toHaveLength(0);
  });
  it("requires a contract for contract uploads and preserves unrelated uploads", async () => {
    expect((await upload()).status).toBe(400);
    expect((await upload("contract-1", "OTHER")).status).toBe(400);
    expect((await upload(undefined, "OTHER")).status).toBe(201);
    expect(state.documents[0].contractId).toBeNull();
  });
});

it("has zero forbidden delivery-ledger substitutes in Batch 4 runtime", () => {
  const text = ["lib/domain/transaction-spine/send-contract-document.ts", "app/api/v1/contracts/[id]/send/route.ts"]
    .map(file => readFileSync(file, "utf8")).join("\n");
  expect(text.match(/governmentOutbox|auditLog|writeAuditLog|rawPayload|emailMessage|whatsAppMessage/gi) ?? []).toHaveLength(0);
});
