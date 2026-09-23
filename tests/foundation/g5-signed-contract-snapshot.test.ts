import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfState = vi.hoisted(() => ({
  contract: null as any,
  snapshot: null as any,
}));

const writeSpy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contract: {
      findFirst: vi.fn(async () => pdfState.contract),
      update: writeSpy,
    },
    contractSnapshot: {
      findFirst: vi.fn(async () => pdfState.snapshot),
      create: writeSpy,
    },
    document: { create: writeSpy, update: writeSpy },
    contractDelivery: { create: writeSpy },
  },
}));
vi.mock("@/lib/auth/exec-003-shared-guard", () => ({
  runWithExec003CookiePermission: async (_r: any, _roles: any, _p: any, handler: any) =>
    handler({ tenantId: "tenant-1", userId: "user-1" }),
}));
vi.mock("@/lib/auth/exec-003-permission-assignments", () => ({ EXEC_003_DATABASE_ROLES: [] }));
vi.mock("@/lib/http-error-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    httpErrorResponse: (_r: any, _c: any, _m: any, error: unknown, status = 500) =>
      NextResponse.json({ error: String((error as Error)?.message || error) }, { status }),
  };
});

import {
  SIGNED_OPERATIONAL_SNAPSHOT_TYPE,
  SIGNED_SNAPSHOT_DIGEST_CONFLICT,
  buildSignedOperationalSnapshot,
  persistSignedOperationalSnapshotInTx,
  verifySignedOperationalSnapshot,
  type SignedOperationalSnapshotSource,
} from "@/lib/domain/transaction-spine/signed-contract-snapshot";
import { GET as pdfRoute } from "@/app/api/v1/contracts/[id]/pdf/route";

const HASH = "a".repeat(64);
const SIGNED_AT = new Date("2026-09-21T09:30:00.000Z");

function source(overrides: Partial<SignedOperationalSnapshotSource> = {}): SignedOperationalSnapshotSource {
  return {
    contract: {
      id: "contract-1",
      tenantId: "tenant-1",
      unitId: "unit-1",
      leadId: "lead-1",
      offerId: "offer-1",
      buyerName: "Buyer One",
      buyerPhone: "0500000000",
      totalVolumeSar: "1000.00",
      acceptedAt: new Date("2026-09-01T00:00:00.000Z"),
      signedAt: SIGNED_AT,
      status: "SIGNED",
      version: 2,
      spineVersion: 2,
      vatType: "STANDARD",
      vatRate: "15.00",
      unit: { unitNumber: "A-1", type: "APARTMENT", area: 120, city: "Riyadh", district: "Olaya" },
      tenant: { companyName: "ORCA Dev", vatNumber: "300", commercialRegistry: "101", nationalAddress: "Riyadh" },
    },
    paymentPlan: {
      id: "plan-1",
      template: "SINGLE_PAYMENT",
      status: "ACTIVE",
      totalAmount: "1150.00",
      scheduleJson: [{ amountSar: 1150, dueDate: "2026-10-01T00:00:00.000Z" }],
      installmentCount: 1,
      activatedAt: SIGNED_AT,
      version: 1,
    },
    installments: [
      {
        installmentNumber: 1,
        amountSar: "1150.00",
        vatAmount: null,
        dueDate: new Date("2026-10-01T00:00:00.000Z"),
        paymentStatus: "Pending",
      },
    ],
    invoice: {
      id: "invoice-1",
      invoiceNumber: 1,
      invoicePrefix: "INV",
      subtotal: "1000.00",
      vatRate: "15.00",
      vatAmount: "150.00",
      totalAmount: "1150.00",
    },
    signatureEvidenceHash: HASH,
    ...overrides,
  };
}

function memoryTx(rows: any[] = []) {
  return {
    rows,
    contractSnapshot: {
      findFirst: vi.fn(async ({ where }: any) =>
        rows.find(
          (row) =>
            row.tenantId === where.tenantId &&
            row.contractId === where.contractId &&
            row.snapshotType === where.snapshotType &&
            row.contractVersion === where.contractVersion,
        ) || null,
      ),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `snapshot-${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      }),
    },
  };
}

describe("Batch 05B — immutable SIGNED_OPERATIONAL ContractSnapshot", () => {
  beforeEach(() => {
    pdfState.contract = null;
    pdfState.snapshot = null;
  });

  it("uses the existing ContractSnapshot model with snapshotType SIGNED_OPERATIONAL", async () => {
    const tx = memoryTx();
    const { created, snapshot } = await persistSignedOperationalSnapshotInTx(tx, source(), "user-1");
    expect(created).toBe(true);
    expect(tx.contractSnapshot.create).toHaveBeenCalledTimes(1);
    expect(snapshot.snapshotType).toBe(SIGNED_OPERATIONAL_SNAPSHOT_TYPE);
  });

  it("carries signatureEvidenceHash and signed identity without draft/template", async () => {
    const tx = memoryTx();
    const { snapshot } = await persistSignedOperationalSnapshotInTx(tx, source(), "user-1");
    expect(snapshot.signatureEvidenceHash).toBe(HASH);
    expect(snapshot.contractId).toBe("contract-1");
    expect(snapshot.contractVersion).toBe(2);
    expect(snapshot.signedAt).toEqual(SIGNED_AT);
    expect(snapshot.draftId).toBeNull();
    expect(snapshot.templateVersionId).toBeNull();
    expect(snapshot.structuredFacts.contract.signatureEvidenceHash).toBe(HASH);
  });

  it("produces the same digest for the same first-sign state", () => {
    const first = buildSignedOperationalSnapshot(source());
    const second = buildSignedOperationalSnapshot(source());
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(second.digest).toBe(first.digest);
  });

  it("treats a duplicate with the same digest as idempotent", async () => {
    const tx = memoryTx();
    await persistSignedOperationalSnapshotInTx(tx, source(), "user-1");
    const again = await persistSignedOperationalSnapshotInTx(tx, source(), "user-1");
    expect(again.created).toBe(false);
    expect(tx.rows).toHaveLength(1);
    expect(tx.contractSnapshot.create).toHaveBeenCalledTimes(1);
  });

  it("fails closed on the same identity with a conflicting digest", async () => {
    const tx = memoryTx();
    await persistSignedOperationalSnapshotInTx(tx, source(), "user-1");
    const conflicting = source();
    conflicting.contract = { ...conflicting.contract, buyerName: "Someone Else" };
    await expect(
      persistSignedOperationalSnapshotInTx(tx, conflicting, "user-1"),
    ).rejects.toThrow(SIGNED_SNAPSHOT_DIGEST_CONFLICT);
    expect(tx.rows).toHaveLength(1);
  });

  it("rejects a stored snapshot whose digest no longer matches its facts", () => {
    const record = buildSignedOperationalSnapshot(source());
    const tampered = {
      ...record,
      structuredFacts: { ...record.structuredFacts, contract: { tampered: true } },
    };
    expect(() => verifySignedOperationalSnapshot(tampered)).toThrow("SIGNED_SNAPSHOT_INTEGRITY_FAILED");
    expect(verifySignedOperationalSnapshot(record)).toEqual({
      contractId: "contract-1",
      contractVersion: 2,
      signedAt: SIGNED_AT.toISOString(),
      signatureEvidenceHash: HASH,
    });
  });
});

describe("PDF final cutover — reads the immutable signed snapshot only", () => {
  function request() {
    return new NextRequest("http://localhost/api/v1/contracts/contract-1/pdf");
  }
  const params = { params: Promise.resolve({ id: "contract-1" }) };

  beforeEach(() => {
    pdfState.contract = { id: "contract-1", status: "SIGNED", signedAt: SIGNED_AT };
    pdfState.snapshot = null;
  });

  it("fails closed for an unsigned contract", async () => {
    pdfState.contract = { id: "contract-1", status: "PENDING_SIGNATURE", signedAt: null };
    const response = await pdfRoute(request(), { params: Promise.resolve({ id: "contract-1" }) });
    expect(response.status).toBe(409);
  });

  it("fails closed for a signed contract without a SIGNED_OPERATIONAL snapshot", async () => {
    const response = await pdfRoute(request(), params);
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("SIGNED_SNAPSHOT_MISSING");
  });

  it("renders snapshot facts, not live mutable contract state, and writes nothing", async () => {
    const record = buildSignedOperationalSnapshot(source());
    pdfState.snapshot = { id: "snapshot-1", draftId: null, templateVersionId: null, ...record };
    pdfState.contract = {
      id: "contract-1",
      status: "SIGNED",
      signedAt: SIGNED_AT,
      buyerName: "LIVE MUTATED NAME",
    };
    const response = await pdfRoute(request(), { params: Promise.resolve({ id: "contract-1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Contract-Id")).toBe("contract-1");
    expect(response.headers.get("X-Contract-Version")).toBe("2");
    expect(response.headers.get("X-Contract-Signed-At")).toBe(SIGNED_AT.toISOString());
    expect(response.headers.get("X-Signature-Evidence-Hash")).toBe(HASH);
    const html = await response.text();
    expect(html).toContain("Buyer One");
    expect(html).not.toContain("LIVE MUTATED NAME");
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("fails closed when the stored snapshot fails integrity verification", async () => {
    const record = buildSignedOperationalSnapshot(source());
    pdfState.snapshot = { ...record, digest: "b".repeat(64) };
    const response = await pdfRoute(request(), { params: Promise.resolve({ id: "contract-1" }) });
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("SIGNED_SNAPSHOT_INTEGRITY_FAILED");
  });
});
