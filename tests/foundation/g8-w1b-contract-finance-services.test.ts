import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertW1LegacyReferenceIntegrity,
  W1ReferenceIntegrityError,
  type W1LegacyReferenceLookup,
} from "@/lib/domain/contract-finance/legacy-reference-guard";
import {
  computeContractSnapshotDigest,
  type ContractSnapshotIssueInput,
} from "@/lib/domain/contract-finance/contract-snapshot-service";

function makeLookup(overrides: Partial<W1LegacyReferenceLookup> = {}): W1LegacyReferenceLookup {
  return {
    async findLead(_tenantId, id) {
      return { id };
    },
    async findUnit(_tenantId, id) {
      return { id };
    },
    async findContract(_tenantId, id) {
      return { id, unitId: "unit-1", leadId: "lead-1" };
    },
    ...overrides,
  };
}

function snapshotInput(structuredFacts: ContractSnapshotIssueInput["structuredFacts"]): ContractSnapshotIssueInput {
  return {
    tenantId: "tenant-1",
    draftId: "draft-1",
    templateVersionId: "template-version-1",
    contractId: "contract-1",
    snapshotType: "ISSUED",
    renderedContent: "عقد نهائي",
    structuredFacts,
    clauseSnapshot: [{ code: "SALE-001", version: 2 }],
    paymentPlanSnapshot: { total: 800000, currency: "SAR" },
    approvalSnapshot: [{ status: "APPROVED", riskTier: "COMMERCIAL" }],
  };
}

describe("W1B contract / finance service integrity gate", () => {
  it("accepts tenant-owned legacy references that are mutually consistent", async () => {
    await expect(
      assertW1LegacyReferenceIntegrity(
        {
          tenantId: "tenant-1",
          leadId: "lead-1",
          unitId: "unit-1",
          contractId: "contract-1",
        },
        makeLookup(),
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects a missing or cross-tenant legacy lead reference", async () => {
    await expect(
      assertW1LegacyReferenceIntegrity(
        { tenantId: "tenant-1", leadId: "lead-x" },
        makeLookup({
          async findLead() {
            return null;
          },
        }),
      ),
    ).rejects.toMatchObject<W1ReferenceIntegrityError>({
      code: "W1_LEAD_NOT_FOUND_FOR_TENANT",
    });
  });

  it("rejects Contract / Unit mismatch", async () => {
    await expect(
      assertW1LegacyReferenceIntegrity(
        { tenantId: "tenant-1", unitId: "unit-2", contractId: "contract-1" },
        makeLookup(),
      ),
    ).rejects.toMatchObject<W1ReferenceIntegrityError>({
      code: "W1_CONTRACT_UNIT_MISMATCH",
    });
  });

  it("rejects Contract / Lead mismatch when the Contract already owns a Lead", async () => {
    await expect(
      assertW1LegacyReferenceIntegrity(
        { tenantId: "tenant-1", leadId: "lead-2", contractId: "contract-1" },
        makeLookup(),
      ),
    ).rejects.toMatchObject<W1ReferenceIntegrityError>({
      code: "W1_CONTRACT_LEAD_MISMATCH",
    });
  });

  it("computes deterministic snapshot digests independent of object key order", () => {
    const left = computeContractSnapshotDigest(snapshotInput({ a: 1, b: { x: 2, y: 3 } }));
    const right = computeContractSnapshotDigest(snapshotInput({ b: { y: 3, x: 2 }, a: 1 }));

    expect(left).toMatch(/^[0-9a-f]{64}$/);
    expect(right).toBe(left);
  });

  it("changes the digest when immutable snapshot content changes", () => {
    const left = computeContractSnapshotDigest(snapshotInput({ salePrice: 800000 }));
    const right = computeContractSnapshotDigest(snapshotInput({ salePrice: 810000 }));
    expect(right).not.toBe(left);
  });

  it("keeps the snapshot service append-oriented with no update/delete capability", () => {
    const source = readFileSync(
      join(process.cwd(), "lib", "domain", "contract-finance", "contract-snapshot-service.ts"),
      "utf8",
    );

    expect(source).toContain("prisma.contractSnapshot.create");
    expect(source).toContain("prisma.contractSnapshot.findFirst");
    expect(source).not.toMatch(/contractSnapshot\.(?:update|updateMany|delete|deleteMany|upsert)\s*\(/);
    expect(source).not.toMatch(/export\s+(?:async\s+)?function\s+(?:update|delete|mutate)ContractSnapshot/i);
  });

  it("uses tenant-aware Prisma and explicit tenant predicates for legacy lookups", () => {
    const source = readFileSync(
      join(process.cwd(), "lib", "domain", "contract-finance", "legacy-reference-guard.ts"),
      "utf8",
    );

    expect(source).toContain('import { prisma } from "@/lib/prisma"');
    expect(source).not.toContain("rawPrisma");
    expect(source.match(/where: \{ id, tenantId \}/g) ?? []).toHaveLength(3);
  });
});
