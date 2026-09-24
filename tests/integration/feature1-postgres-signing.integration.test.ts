/**
 * Real PostgreSQL integration proof for Feature 1 (multi-signatory contract
 * signing). Uses the actual Prisma Client against a real database — no
 * mocks, no unit-test transaction pass-through. This is intentionally
 * skipped unless DATABASE_URL points explicitly at the disposable
 * `orca_feature1_test` database, so it never runs against an unproven or
 * shared target and never runs as part of the normal mocked test suite.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runWithTenantContext } from "@/lib/tenant-context";

const DB_URL = process.env.DATABASE_URL || "";
const RUN = DB_URL.includes("orca_feature1_test");
const testUserId = randomUUID();

describe.skipIf(!RUN)("Feature 1 — real PostgreSQL integration", () => {
  let prisma: any;
  let domain: typeof import("@/lib/domain/transaction-spine/sign-contract");
  let issueContractModule: typeof import("@/lib/domain/transaction-spine/issue-contract");
  let accounting: typeof import("@/lib/accounting/chart-of-accounts");
  let tenantId: string;
  let projectId: string;

  // The real Prisma client enforces tenant isolation via AsyncLocalStorage
  // (lib/tenant-prisma-enforcement.ts): every tenant-scoped query must run
  // inside runWithTenantContext, exactly like production route handlers do.
  // Each it() body below runs its whole continuation through this wrapper.
  function withTenant<T>(fn: () => Promise<T>): () => Promise<T> {
    return () => runWithTenantContext({ tenantId, userId: testUserId }, fn);
  }

  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    prisma = prismaModule.prisma;
    domain = await import("@/lib/domain/transaction-spine/sign-contract");
    issueContractModule = await import("@/lib/domain/transaction-spine/issue-contract");
    accounting = await import("@/lib/accounting/chart-of-accounts");

    const tenant = await prisma.tenant.create({
      data: {
        companyName: "Feature1 Integration Tenant",
        subdomain: `f1-it-${randomUUID().slice(0, 8)}`,
      },
    });
    tenantId = tenant.id;

    await runWithTenantContext({ tenantId, userId: testUserId }, async () => {
      const project = await prisma.project.create({
        data: {
          tenantId,
          name: "F1 Test Project",
          city: "Riyadh",
          status: "PLANNING",
        },
      });
      projectId = project.id;

      await accounting.seedChartOfAccounts(tenantId);
    });
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  let unitSeq = 0;
  async function createUnit() {
    unitSeq += 1;
    return prisma.unit.create({
      data: {
        tenantId,
        projectId,
        unitNumber: `F1-${unitSeq}`,
        floorPosition: 1,
        priceSar: 1000,
      },
    });
  }

  async function createTestContract() {
    const unit = await createUnit();
    const contract = await issueContractModule._createContractInTx(prisma, {
      tenantId,
      userId: null,
      unitId: unit.id,
      leadId: null,
      buyerName: "Integration Buyer",
      buyerPhone: `05${String(Date.now()).slice(-8)}`,
      totalVolumeSar: 1000,
    });
    return contract;
  }

  /** Establishes the approval boundary (approved draft + issued snapshot) for a contract. */
  async function approveContract(contractId: string) {
    const template = await prisma.contractTemplate.create({
      data: { tenantId, code: `T-${randomUUID().slice(0, 8)}`, name: "Test Template", contractType: "SALE" },
    });
    const templateVersion = await prisma.contractTemplateVersion.create({
      data: { tenantId, templateId: template.id, version: 1, structureJson: {} },
    });
    const draft = await prisma.contractDraft.create({
      data: {
        tenantId,
        templateId: template.id,
        templateVersionId: templateVersion.id,
        contractId,
        title: "Integration Draft",
        status: "APPROVED",
        contentJson: {},
        dataBindingsJson: {},
      },
    });
    await prisma.contractApproval.create({
      data: { tenantId, draftId: draft.id, riskTier: "LOW", status: "APPROVED" },
    });
    await prisma.contractSnapshot.create({
      data: {
        tenantId,
        draftId: draft.id,
        templateVersionId: templateVersion.id,
        snapshotType: "ISSUED",
        renderedContent: "integration-test-content",
        structuredFacts: {},
        clauseSnapshot: [],
        approvalSnapshot: {},
        digest: randomUUID().replace(/-/g, "").padEnd(64, "0"),
      },
    });
    return draft;
  }

  function evidenceFor(name: string) {
    return { method: "IN_PERSON_WET_INK", signerName: name, capturedAt: new Date().toISOString() };
  }

  it("1. SCHEMA PERSISTENCE — ContractSignatory rows persist with a real tenant-scoped FK to Contract", withTenant(async () => {
    const contract = await createTestContract();
    const rows = await prisma.contractSignatory.findMany({ where: { tenantId, contractId: contract.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].role).toBe("BUYER");
    expect(rows[0].required).toBe(true);

    // Real FK proof: referencing a non-existent contractId must fail closed at the DB level.
    await expect(
      prisma.contractSignatory.create({
        data: { tenantId, contractId: randomUUID(), role: "WITNESS", required: false },
      }),
    ).rejects.toThrow();
  }));

  it("2. CONTRACTDRAFT UNIQUE LINK — a second draft bound to the same (tenantId, contractId) fails at the DB", withTenant(async () => {
    const contract = await createTestContract();
    const template = await prisma.contractTemplate.create({
      data: { tenantId, code: `T2-${randomUUID().slice(0, 8)}`, name: "Test Template 2", contractType: "SALE" },
    });
    const templateVersion = await prisma.contractTemplateVersion.create({
      data: { tenantId, templateId: template.id, version: 1, structureJson: {} },
    });
    const commonData = {
      tenantId,
      templateId: template.id,
      templateVersionId: templateVersion.id,
      contractId: contract.id,
      title: "Draft",
      contentJson: {},
      dataBindingsJson: {},
    };
    await prisma.contractDraft.create({ data: commonData });
    await expect(prisma.contractDraft.create({ data: commonData })).rejects.toThrow(/uq_contract_drafts_tenant_contract|Unique constraint/i);
  }));

  it("3/7. PARTIAL SIGNING + APPROVAL BEFORE PARTIAL SIGNATURE", withTenant(async () => {
    const contract = await createTestContract();
    await domain.configureContractSignatories({
      tenantId,
      userId: testUserId,
      contractId: contract.id,
      signatories: [
        { role: "BUYER", required: true },
        { role: "SELLER", required: true },
      ],
    });
    const [sigA, sigB] = await prisma.contractSignatory.findMany({
      where: { tenantId, contractId: contract.id },
      orderBy: { role: "asc" },
    });

    // 7. No approval boundary established yet -> first signer's write must not happen at all.
    await expect(
      domain.signContractSignatory({
        tenantId,
        userId: testUserId,
        contractId: contract.id,
        signatoryId: sigA.id,
        signatureEvidence: evidenceFor("Buyer One"),
      }),
    ).rejects.toThrow();
    const afterRejected = await prisma.contractSignatory.findUnique({ where: { id: sigA.id } });
    expect(afterRejected.status).toBe("PENDING");
    expect(afterRejected.signatureEvidenceHash).toBeNull();
    expect(afterRejected.signedAt).toBeNull();

    // Now establish the approval boundary and retry the partial signature.
    await approveContract(contract.id);
    const result = await domain.signContractSignatory({
      tenantId,
      userId: testUserId,
      contractId: contract.id,
      signatoryId: sigA.id,
      signatureEvidence: evidenceFor("Buyer One"),
    });
    expect(result.finalized).toBe(false);

    const committedA = await prisma.contractSignatory.findUnique({ where: { id: sigA.id } });
    const committedB = await prisma.contractSignatory.findUnique({ where: { id: sigB.id } });
    const committedContract = await prisma.contract.findUnique({ where: { id: contract.id } });
    expect(committedA.status).toBe("SIGNED");
    expect(committedB.status).toBe("PENDING");
    expect(committedContract.status).toBe("PENDING_SIGNATURE");

    const invoiceCount = await prisma.invoice.count({ where: { contractId: contract.id } });
    const snapshotCount = await prisma.contractSnapshot.count({
      where: { tenantId, contractId: contract.id, snapshotType: "SIGNED_OPERATIONAL" },
    });
    expect(invoiceCount).toBe(0);
    expect(snapshotCount).toBe(0);
  }));

  it("4/6. FINAL REQUIRED SIGNER finalizes exactly once; replay after finalization writes nothing new", withTenant(async () => {
    const contract = await createTestContract();
    await domain.configureContractSignatories({
      tenantId,
      userId: testUserId,
      contractId: contract.id,
      signatories: [
        { role: "BUYER", required: true },
        { role: "SELLER", required: true },
      ],
    });
    await approveContract(contract.id);
    const [sigA, sigB] = await prisma.contractSignatory.findMany({
      where: { tenantId, contractId: contract.id },
      orderBy: { role: "asc" },
    });
    await domain.signContractSignatory({
      tenantId, userId: testUserId, contractId: contract.id, signatoryId: sigA.id,
      signatureEvidence: evidenceFor("Buyer One"),
    });
    const sellerEvidence = evidenceFor("Seller One");
    const finalResult = await domain.signContractSignatory({
      tenantId, userId: testUserId, contractId: contract.id, signatoryId: sigB.id,
      signatureEvidence: sellerEvidence,
    });
    expect(finalResult.finalized).toBe(true);

    const committedContract = await prisma.contract.findUnique({ where: { id: contract.id } });
    expect(committedContract.status).toBe("SIGNED");

    const invoicesAfterFinal = await prisma.invoice.count({ where: { contractId: contract.id } });
    const snapshotsAfterFinal = await prisma.contractSnapshot.count({
      where: { tenantId, contractId: contract.id, snapshotType: "SIGNED_OPERATIONAL" },
    });
    expect(invoicesAfterFinal).toBe(1);
    expect(snapshotsAfterFinal).toBe(1);

    // 6. Replay the already-completed final signer's call with the SAME evidence.
    const replay = await domain.signContractSignatory({
      tenantId, userId: testUserId, contractId: contract.id, signatoryId: sigB.id,
      signatureEvidence: sellerEvidence,
    });
    expect(replay.finalized).toBe(true);
    if (replay.finalized) expect(replay.idempotent).toBe(true);

    expect(await prisma.invoice.count({ where: { contractId: contract.id } })).toBe(1);
    expect(
      await prisma.contractSnapshot.count({
        where: { tenantId, contractId: contract.id, snapshotType: "SIGNED_OPERATIONAL" },
      }),
    ).toBe(1);
  }));

  it("5. REAL CONCURRENT FINALIZATION — two overlapping final-sign attempts against real PostgreSQL transactions", withTenant(async () => {
    const contract = await createTestContract();
    await domain.configureContractSignatories({
      tenantId,
      userId: testUserId,
      contractId: contract.id,
      signatories: [
        { role: "BUYER", required: true },
        { role: "SELLER", required: true },
      ],
    });
    await approveContract(contract.id);
    const [sigA, sigB] = await prisma.contractSignatory.findMany({
      where: { tenantId, contractId: contract.id },
      orderBy: { role: "asc" },
    });
    // sigA already SIGNED so that both concurrent calls below race to be the
    // completing (finalizing) signature for sigB with the SAME evidence.
    await domain.signContractSignatory({
      tenantId, userId: testUserId, contractId: contract.id, signatoryId: sigA.id,
      signatureEvidence: evidenceFor("Buyer One"),
    });

    const evidence = evidenceFor("Seller One");
    const outcomes = await Promise.allSettled([
      domain.signContractSignatory({
        tenantId, userId: testUserId, contractId: contract.id, signatoryId: sigB.id,
        signatureEvidence: evidence,
      }),
      domain.signContractSignatory({
        tenantId, userId: testUserId, contractId: contract.id, signatoryId: sigB.id,
        signatureEvidence: evidence,
      }),
    ]);

    const call1 = outcomes[0].status === "fulfilled" ? "SUCCESS" : `REJECTED:${(outcomes[0] as any).reason?.message || (outcomes[0] as any).reason?.code || String((outcomes[0] as any).reason)}`;
    const call2 = outcomes[1].status === "fulfilled" ? "SUCCESS" : `REJECTED:${(outcomes[1] as any).reason?.message || (outcomes[1] as any).reason?.code || String((outcomes[1] as any).reason)}`;
    // eslint-disable-next-line no-console
    console.log("CONCURRENT_CALL_1_RESULT:", call1);
    // eslint-disable-next-line no-console
    console.log("CONCURRENT_CALL_2_RESULT:", call2);

    const succeeded = outcomes.filter((o) => o.status === "fulfilled");
    expect(succeeded.length).toBeGreaterThanOrEqual(1);

    const committedContract = await prisma.contract.findUnique({ where: { id: contract.id } });
    expect(committedContract.status).toBe("SIGNED");

    const invoices = await prisma.invoice.findMany({ where: { contractId: contract.id, type: "SALE" } });
    const installments = await prisma.installment.findMany({ where: { contractId: contract.id } });
    const snapshots = await prisma.contractSnapshot.findMany({
      where: { tenantId, contractId: contract.id, snapshotType: "SIGNED_OPERATIONAL" },
    });

    expect(invoices).toHaveLength(1);
    expect(installments.length).toBeGreaterThan(0);
    expect(snapshots).toHaveLength(1);

    // eslint-disable-next-line no-console
    console.log("FINAL_SALE_INVOICES:", invoices.length, "FINAL_SIGNED_SNAPSHOTS:", snapshots.length);
  }));

  it("8. ZERO_REQUIRED_DEFENSE — corrupted zero-required-row state fails closed at signing time", withTenant(async () => {
    const contract = await createTestContract();
    // Delete the auto-provisioned default BUYER signatory and hand-insert a
    // single OPTIONAL row only, simulating corrupted/pre-existing data that
    // bypassed configureContractSignatories' own required-row guard.
    await prisma.contractSignatory.deleteMany({ where: { tenantId, contractId: contract.id } });
    const optional = await prisma.contractSignatory.create({
      data: { tenantId, contractId: contract.id, role: "WITNESS", required: false },
    });
    await approveContract(contract.id);

    await expect(
      domain.signContractSignatory({
        tenantId, userId: testUserId, contractId: contract.id, signatoryId: optional.id,
        signatureEvidence: evidenceFor("Witness One"),
      }),
    ).rejects.toThrow();

    const committedContract = await prisma.contract.findUnique({ where: { id: contract.id } });
    expect(committedContract.status).toBe("PENDING_SIGNATURE");
  }));

  it("9. LEGACY HISTORY — SIGNED contract with zero ContractSignatory rows remains valid, no backfill", withTenant(async () => {
    const contract = await createTestContract();
    await prisma.contractSignatory.deleteMany({ where: { tenantId, contractId: contract.id } });
    await approveContract(contract.id);
    await prisma.contract.update({
      where: { id: contract.id },
      data: { status: "SIGNED", signedAt: new Date() },
    });

    const result = await domain.signContract({ tenantId, userId: testUserId, contractId: contract.id });
    expect(result.idempotent).toBe(true);

    const rowsAfter = await prisma.contractSignatory.count({ where: { tenantId, contractId: contract.id } });
    expect(rowsAfter).toBe(0);
  }));
});
