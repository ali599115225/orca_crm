import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  contractDraftFindFirst: vi.fn(),
  contractFindFirst: vi.fn(),
  snapshotFindFirst: vi.fn(),
  snapshotCreate: vi.fn(),
  outerSnapshotFindFirst: vi.fn(),
  requireTenantContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: dbMocks.transaction,
    contractSnapshot: {
      findFirst: dbMocks.outerSnapshotFindFirst,
    },
  },
}));
vi.mock("@/lib/tenant-context", () => ({
  requireTenantContext: dbMocks.requireTenantContext,
}));

import { issueCanonicalApprovedContractSnapshot } from "@/lib/domain/contract-finance/contract-snapshot-issuance-service";
import { computeContractSnapshotDigest } from "@/lib/domain/contract-finance/contract-snapshot-service";

function approvedDraft() {
  return {
    id: "draft-a",
    tenantId: "tenant-a",
    templateId: "template-a",
    templateVersionId: "template-version-a",
    contractId: "contract-a",
    financeCaseId: null,
    title: "Approved sale contract",
    status: "APPROVED",
    contentJson: {
      schemaVersion: "W1J_CONTENT_V1",
      sections: [
        {
          id: "intro",
          overrideMode: "LOCKED",
          nodes: [
            { type: "TEXT", value: "المشتري: " },
            { type: "VARIABLE", key: "BUYER_NAME" },
            { type: "TEXT", value: "\nقيمة العقد: " },
            { type: "VARIABLE", key: "CONTRACT_TOTAL" },
          ],
        },
      ],
    },
    dataBindingsJson: {
      schemaVersion: "W1J_BINDINGS_V1",
      values: {},
    },
    clauseOverridesJson: {
      schemaVersion: "W1J_CLAUSE_OVERRIDES_V1",
      replacements: [],
    },
    createdAt: new Date("2026-09-10T20:00:00.000Z"),
    updatedAt: new Date("2026-09-10T21:00:00.000Z"),
    template: {
      id: "template-a",
      code: "SALE",
      name: "Sale contract",
      contractType: "SALE",
      status: "ACTIVE",
    },
    templateVersion: {
      id: "template-version-a",
      version: 1,
      status: "PUBLISHED",
      structureJson: {
        schemaVersion: "W1J_STRUCTURE_V1",
        sectionOrder: ["intro"],
      },
      variableSchemaJson: {
        schemaVersion: "W1J_VARIABLE_SCHEMA_V1",
        variables: [
          {
            key: "BUYER_NAME",
            source: "FACT",
            path: "contract.buyerName",
            valueType: "STRING",
            required: true,
          },
          {
            key: "CONTRACT_TOTAL",
            source: "FACT",
            path: "contract.totalVolumeSar",
            valueType: "DECIMAL",
            required: true,
          },
        ],
      },
      publishedAt: new Date("2026-09-10T19:00:00.000Z"),
    },
    approvals: [
      {
        id: "approval-a",
        riskTier: "LEGAL",
        status: "APPROVED",
        requestedBy: "user-requester",
        decidedBy: "user-approver",
        reason: null,
        evidenceJson: { source: "closure-test" },
        requestedAt: new Date("2026-09-10T21:10:00.000Z"),
        decidedAt: new Date("2026-09-10T21:20:00.000Z"),
      },
    ],
    financeCase: null,
  };
}

function linkedContract() {
  return {
    id: "contract-a",
    unitId: "unit-a",
    leadId: "lead-a",
    offerId: null,
    buyerName: "أحمد محمد",
    buyerPhone: "+966500000000",
    totalVolumeSar: "1250000.00",
    acceptedAt: new Date("2026-09-10T22:00:00.000Z"),
    reservationExpiresAt: null,
    signedAt: null,
    cancelledAt: null,
    cancelReason: null,
    endDate: null,
    status: "ACTIVE",
    version: 1,
    spineVersion: 1,
    legacyFinancial: false,
    legacyReason: null,
    vatType: "EXCLUSIVE",
    vatRate: "0.15",
    unit: {
      id: "unit-a",
      tenantId: "tenant-a",
      projectId: "project-a",
      unitNumber: "A-101",
      floorPosition: "1",
      priceSar: "1250000.00",
      type: "APARTMENT",
      area: 180,
      beds: 3,
      city: "Riyadh",
      district: "Al Malqa",
      status: "AVAILABLE",
    },
    paymentPlan: {
      id: "plan-a",
      tenantId: "tenant-a",
      contractId: "contract-a",
      template: "STANDARD",
      status: "ACTIVE",
      totalAmount: "1250000.00",
      scheduleJson: { installments: 2 },
      installmentCount: 2,
      activatedAt: new Date("2026-09-10T22:05:00.000Z"),
      completedAt: null,
      version: 1,
      lastAmendedAt: null,
    },
  };
}

let currentDraft: ReturnType<typeof approvedDraft>;
let currentContract: ReturnType<typeof linkedContract>;
let persistedSnapshot: Record<string, any> | null;

function snapshotMatches(where: Record<string, unknown>): boolean {
  return Boolean(
    persistedSnapshot &&
      persistedSnapshot.tenantId === where.tenantId &&
      persistedSnapshot.draftId === where.draftId &&
      persistedSnapshot.snapshotType === where.snapshotType,
  );
}

describe("Contract Snapshot Closure — executable W1I -> W1J -> W1K acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentDraft = approvedDraft();
    currentContract = linkedContract();
    persistedSnapshot = null;

    dbMocks.requireTenantContext.mockReturnValue({ tenantId: "tenant-a", userId: "user-a" });
    dbMocks.contractDraftFindFirst.mockImplementation(async ({ where }) =>
      where.id === currentDraft.id && where.tenantId === currentDraft.tenantId
        ? currentDraft
        : null,
    );
    dbMocks.contractFindFirst.mockImplementation(async ({ where }) =>
      where.id === currentContract.id && where.tenantId === currentContract.unit.tenantId
        ? currentContract
        : null,
    );
    dbMocks.snapshotFindFirst.mockImplementation(async ({ where }) =>
      snapshotMatches(where) ? persistedSnapshot : null,
    );
    dbMocks.outerSnapshotFindFirst.mockImplementation(async ({ where }) =>
      snapshotMatches(where) ? persistedSnapshot : null,
    );
    dbMocks.snapshotCreate.mockImplementation(async ({ data }) => {
      persistedSnapshot = {
        id: "snapshot-a",
        ...data,
        createdAt: new Date("2026-09-10T22:30:00.000Z"),
      };
      return persistedSnapshot;
    });
    dbMocks.transaction.mockImplementation(async (operation) =>
      operation({
        contractDraft: { findFirst: dbMocks.contractDraftFindFirst },
        contract: { findFirst: dbMocks.contractFindFirst },
        contractSnapshot: {
          findFirst: dbMocks.snapshotFindFirst,
          create: dbMocks.snapshotCreate,
        },
      }),
    );
  });

  it("issues one immutable snapshot, verifies its digest, and replays identical facts idempotently", async () => {
    const first = await issueCanonicalApprovedContractSnapshot({
      tenantId: "tenant-a",
      draftId: "draft-a",
      createdBy: "user-a",
    });

    expect(first.id).toBe("snapshot-a");
    expect(first.renderedContent).toBe("المشتري: أحمد محمد\nقيمة العقد: 1250000.00");
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(dbMocks.snapshotCreate).toHaveBeenCalledTimes(1);

    const createData = dbMocks.snapshotCreate.mock.calls[0][0].data;
    expect(createData.digest).toBe(
      computeContractSnapshotDigest({
        tenantId: createData.tenantId,
        draftId: createData.draftId,
        templateVersionId: createData.templateVersionId,
        contractId: createData.contractId,
        snapshotType: createData.snapshotType,
        renderedContent: createData.renderedContent,
        structuredFacts: createData.structuredFacts,
        clauseSnapshot: createData.clauseSnapshot,
        paymentPlanSnapshot: createData.paymentPlanSnapshot,
        approvalSnapshot: createData.approvalSnapshot,
        signedAt: createData.signedAt,
      }),
    );

    const replay = await issueCanonicalApprovedContractSnapshot({
      tenantId: "tenant-a",
      draftId: "draft-a",
      createdBy: "user-a",
    });

    expect(replay.id).toBe(first.id);
    expect(replay.digest).toBe(first.digest);
    expect(dbMocks.snapshotCreate).toHaveBeenCalledTimes(1);
    expect(dbMocks.transaction).toHaveBeenCalledTimes(2);
  });

  it("rejects changed authoritative facts after issuance and never overwrites the issued snapshot", async () => {
    const first = await issueCanonicalApprovedContractSnapshot({
      tenantId: "tenant-a",
      draftId: "draft-a",
      createdBy: "user-a",
    });
    const originalDigest = first.digest;
    const originalRenderedContent = first.renderedContent;

    currentContract.totalVolumeSar = "1300000.00";

    await expect(
      issueCanonicalApprovedContractSnapshot({
        tenantId: "tenant-a",
        draftId: "draft-a",
        createdBy: "user-a",
      }),
    ).rejects.toMatchObject({
      code: "W1_SNAPSHOT_ALREADY_ISSUED_DIFFERENT_DIGEST",
    });

    expect(dbMocks.snapshotCreate).toHaveBeenCalledTimes(1);
    expect(persistedSnapshot?.digest).toBe(originalDigest);
    expect(persistedSnapshot?.renderedContent).toBe(originalRenderedContent);
  });

  it("fails closed on tenant mismatch before canonical DB reads or persistence", async () => {
    dbMocks.requireTenantContext.mockReturnValue({ tenantId: "tenant-a", userId: "user-a" });

    await expect(
      issueCanonicalApprovedContractSnapshot({
        tenantId: "tenant-b",
        draftId: "draft-a",
        createdBy: "user-b",
      }),
    ).rejects.toMatchObject({
      code: "W1_CANONICAL_SNAPSHOT_TENANT_CONTEXT_MISMATCH",
    });

    expect(dbMocks.contractDraftFindFirst).not.toHaveBeenCalled();
    expect(dbMocks.contractFindFirst).not.toHaveBeenCalled();
    expect(dbMocks.snapshotCreate).not.toHaveBeenCalled();
    expect(persistedSnapshot).toBeNull();
  });

  it("persists nothing when rendering fails and permits a clean retry after valid facts are restored", async () => {
    currentContract.buyerName = null as unknown as string;

    await expect(
      issueCanonicalApprovedContractSnapshot({
        tenantId: "tenant-a",
        draftId: "draft-a",
        createdBy: "user-a",
      }),
    ).rejects.toMatchObject({
      code: "W1_RENDER_REQUIRED_VARIABLE_MISSING",
    });

    expect(dbMocks.snapshotFindFirst).not.toHaveBeenCalled();
    expect(dbMocks.snapshotCreate).not.toHaveBeenCalled();
    expect(persistedSnapshot).toBeNull();

    currentContract.buyerName = "أحمد محمد";
    const retry = await issueCanonicalApprovedContractSnapshot({
      tenantId: "tenant-a",
      draftId: "draft-a",
      createdBy: "user-a",
    });

    expect(retry.id).toBe("snapshot-a");
    expect(dbMocks.snapshotCreate).toHaveBeenCalledTimes(1);
  });
});
