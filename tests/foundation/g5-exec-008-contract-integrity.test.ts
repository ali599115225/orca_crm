import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  ContractFinanceActorContext,
  ContractTemplateVersion,
  ContractVersion,
  IdempotencyRecord,
  ScopedResource,
} from "@/lib/contract-finance/contracts";
import type {
  ContractFinanceRepository,
  ContractFinanceTransaction,
} from "@/lib/contract-finance/repository";
import { ContractFinanceService } from "@/lib/contract-finance/service";

const tenantId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const contractId = "33333333-3333-4333-8333-333333333333";
const templateId = "44444444-4444-4444-8444-444444444444";

const scope: ScopedResource = {
  tenantId,
  resourceType: "CONTRACT",
  resourceId: contractId,
};

const actor: ContractFinanceActorContext = {
  tenantId,
  userId,
  assignments: [
    {
      id: "55555555-5555-4555-8555-555555555555",
      tenantId,
      userId,
      securityRole: "GENERAL_MANAGER",
      scopeType: "COMPANY",
      active: true,
    },
  ],
  now: new Date("2026-08-11T00:00:00.000Z"),
};

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function contractVersion(
  id: string,
  state: ContractVersion["state"],
  version = 1,
): ContractVersion {
  return {
    id,
    tenantId,
    contractId,
    version,
    previousVersionId: null,
    templateVersionId: templateId,
    templateContentHash: "template-hash-v7",
    contentHash: `hash-${version}`,
    contentSnapshot: `terms-${version}`,
    state,
    scope,
    issuedAt: actor.now ?? null,
    signedAt: state === "SIGNED" || state === "ACTIVATED" ? actor.now ?? null : null,
    acceptedAt: null,
    activatedAt: state === "ACTIVATED" ? actor.now ?? null : null,
  };
}

class ContractFixtureRepository implements ContractFinanceRepository {
  readonly idempotency = new Map<string, IdempotencyRecord>();
  readonly versions = new Map<string, ContractVersion>();
  template: ContractTemplateVersion = {
    id: templateId,
    tenantId,
    templateKey: "SALE",
    version: 7,
    contentHash: "template-hash-v7",
    contentSnapshot: "template-v7",
    issuedAt: new Date("2026-08-10T00:00:00.000Z"),
  };

  private current(): ContractVersion | null {
    return (
      [...this.versions.values()]
        .filter((entry) => entry.contractId === contractId)
        .sort((a, b) => b.version - a.version)[0] ?? null
    );
  }

  async transaction<T>(work: (tx: ContractFinanceTransaction) => Promise<T>): Promise<T> {
    const self = this;
    const tx = {
      async findIdempotency(t: string, operation: string, keyHash: string) {
        return self.idempotency.get(`${t}:${operation}:${keyHash}`) ?? null;
      },
      async insertIdempotency(record: IdempotencyRecord) {
        self.idempotency.set(`${record.tenantId}:${record.operation}:${record.keyHash}`, record);
      },
      async findTemplateVersion(t: string, id: string) {
        return t === tenantId && id === templateId ? self.template : null;
      },
      async findContractVersion(t: string, id: string) {
        const value = self.versions.get(id) ?? null;
        return value?.tenantId === t ? value : null;
      },
      async findCurrentContractVersion(t: string, id: string) {
        return t === tenantId && id === contractId ? self.current() : null;
      },
      async insertContractVersion(value: ContractVersion) {
        self.versions.set(value.id, value);
      },
      async markContractVersionSigned(input: {
        tenantId: string;
        contractVersionId: string;
        signedAt: Date;
      }) {
        const value = self.versions.get(input.contractVersionId);
        if (!value || value.tenantId !== input.tenantId) throw new Error("missing");
        const next = { ...value, state: "SIGNED" as const, signedAt: input.signedAt };
        self.versions.set(next.id, next);
        return next;
      },
      async markContractVersionActivated(input: {
        tenantId: string;
        contractVersionId: string;
        activatedAt: Date;
      }) {
        const value = self.versions.get(input.contractVersionId);
        if (!value || value.tenantId !== input.tenantId) throw new Error("missing");
        const next = { ...value, state: "ACTIVATED" as const, activatedAt: input.activatedAt };
        self.versions.set(next.id, next);
        return next;
      },
    } as unknown as ContractFinanceTransaction;
    return work(tx);
  }
}

describe("EXEC-008 — contract integrity", () => {
  it("binds issuance to the exact issued template snapshot and replays one semantic result", async () => {
    const repository = new ContractFixtureRepository();
    const service = new ContractFinanceService(repository);
    const command = {
      actor,
      contractId,
      templateVersionId: templateId,
      contentSnapshot: "signed commercial terms v7",
      scope,
      idempotencyKey: "issue-1",
    };

    const first = await service.issueContractVersion(command);
    const replay = await service.issueContractVersion(command);

    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.value.id).toBe(first.value.id);
    expect(repository.versions.size).toBe(1);
    expect(first.value).toMatchObject({
      contractId,
      version: 1,
      templateVersionId: templateId,
      templateContentHash: "template-hash-v7",
      contentSnapshot: "signed commercial terms v7",
      state: "ISSUED",
    });
  });

  it("rejects conflicting reuse of an issuance idempotency key", async () => {
    const repository = new ContractFixtureRepository();
    const service = new ContractFinanceService(repository);
    const base = {
      actor,
      contractId,
      templateVersionId: templateId,
      scope,
      idempotencyKey: "issue-conflict",
    };

    await service.issueContractVersion({ ...base, contentSnapshot: "terms-A" });
    await expect(
      service.issueContractVersion({ ...base, contentSnapshot: "terms-B" }),
    ).rejects.toThrow(/conflicting payload/i);
    expect(repository.versions.size).toBe(1);
  });

  it("creates a linked amendment version after the prior version is finalized", async () => {
    const repository = new ContractFixtureRepository();
    const service = new ContractFinanceService(repository);

    const first = await service.issueContractVersion({
      actor,
      contractId,
      templateVersionId: templateId,
      contentSnapshot: "terms-v1",
      scope,
      idempotencyKey: "issue-v1",
    });
    repository.versions.set(first.value.id, {
      ...first.value,
      state: "ACTIVATED",
      activatedAt: actor.now ?? new Date(),
    });

    const second = await service.issueContractVersion({
      actor,
      contractId,
      templateVersionId: templateId,
      contentSnapshot: "terms-v2",
      scope,
      idempotencyKey: "issue-v2",
    });

    expect(second.value.version).toBe(2);
    expect(second.value.previousVersionId).toBe(first.value.id);
    expect(second.value.contentSnapshot).toBe("terms-v2");
    expect(repository.versions.size).toBe(2);
  });

  it("denies signing a stale version and signs only the exact current issued version", async () => {
    const repository = new ContractFixtureRepository();
    const service = new ContractFinanceService(repository);
    const stale = contractVersion("66666666-6666-4666-8666-666666666666", "ISSUED", 1);
    const current: ContractVersion = {
      ...contractVersion("77777777-7777-4777-8777-777777777777", "ISSUED", 2),
      previousVersionId: stale.id,
    };
    repository.versions.set(stale.id, stale);
    repository.versions.set(current.id, current);

    await expect(
      service.signContractVersion({
        actor,
        contractVersionId: stale.id,
        scope,
        idempotencyKey: "sign-stale",
      }),
    ).rejects.toThrow(/stale contract version/i);

    const signed = await service.signContractVersion({
      actor,
      contractVersionId: current.id,
      scope,
      idempotencyKey: "sign-current",
    });
    expect(signed.value.state).toBe("SIGNED");
    expect(signed.value.signedAt).toEqual(actor.now);
  });

  it("activates one eligible current version and replays the same activation result", async () => {
    const repository = new ContractFixtureRepository();
    const service = new ContractFinanceService(repository);
    const version = contractVersion("88888888-8888-4888-8888-888888888888", "SIGNED");
    repository.versions.set(version.id, version);
    const command = {
      actor,
      contractVersionId: version.id,
      scope,
      idempotencyKey: "activate-1",
    };

    const first = await service.activateContractVersion(command);
    const replay = await service.activateContractVersion(command);

    expect(first.value.state).toBe("ACTIVATED");
    expect(replay.replayed).toBe(true);
    expect(replay.value.id).toBe(first.value.id);
    expect(repository.versions.size).toBe(1);
  });

  it("rejects ineligible activation state before any activation mutation", async () => {
    const repository = new ContractFixtureRepository();
    const service = new ContractFinanceService(repository);
    const version = contractVersion("89898989-8989-4898-8989-898989898989", "ISSUED");
    repository.versions.set(version.id, version);

    await expect(
      service.activateContractVersion({
        actor,
        contractVersionId: version.id,
        scope,
        idempotencyKey: "activate-ineligible",
      }),
    ).rejects.toThrow(/not eligible for activation/i);
    expect(repository.versions.get(version.id)?.state).toBe("ISSUED");
    expect(repository.idempotency.size).toBe(0);
  });

  it("rejects conflicting activation idempotency payload without creating a second semantic result", async () => {
    const repository = new ContractFixtureRepository();
    const service = new ContractFinanceService(repository);
    const version = contractVersion("99999999-9999-4999-8999-999999999999", "SIGNED");
    repository.versions.set(version.id, version);

    await service.activateContractVersion({
      actor,
      contractVersionId: version.id,
      scope,
      idempotencyKey: "activate-conflict",
    });

    await expect(
      service.activateContractVersion({
        actor,
        contractVersionId: version.id,
        scope: { ...scope, resourceId: "different-contract" },
        idempotencyKey: "activate-conflict",
      }),
    ).rejects.toThrow(/conflicting payload/i);

    expect(repository.versions.size).toBe(1);
    expect(repository.versions.get(version.id)?.state).toBe("ACTIVATED");
  });

  it("binds the runtime signing entry point to persisted EXEC-004 assignments and the EXEC-008 service", () => {
    const signSource = source("lib/domain/transaction-spine/sign-contract.ts");

    expect(signSource).toContain("user_scope_assignments");
    expect(signSource).toContain("SqlContractFinanceRepository");
    expect(signSource).toContain("ContractFinanceService");
    expect(signSource).toContain("signContractVersion");
    expect(signSource).toContain("activateContractVersion");
    expect(signSource).toContain("SqlContractFinanceRepository(tx)");
    expect(signSource).not.toMatch(/securityRole:\s*["'](?:PLATFORM_OWNER|SYSTEM_ADMINISTRATOR)["']/);
  });

  it("preserves immutable EXEC-008 evidence across cancel, restructure, and early-settlement boundaries", () => {
    const migration = source(
      "prisma/migrations/20260811030000_exec_008_contract_financial_integrity/migration.sql",
    );
    const cancelRoute = source("app/api/v1/contracts/[id]/cancel/route.ts");
    const restructureRoute = source("app/api/v1/contracts/[id]/restructure/route.ts");
    const settlementRoute = source("app/api/v1/contracts/[id]/early-settlement/route.ts");
    const settlement = source("lib/domain/transaction-spine/early-settlement.ts");

    expect(migration).toContain("exec008_contract_version_immutable_fields");
    expect(migration).toContain("EXEC008_CONTRACT_VERSION_IMMUTABLE");
    for (const lifecycleSource of [cancelRoute, restructureRoute, settlementRoute, settlement]) {
      expect(lifecycleSource).not.toMatch(/UPDATE\s+exec008_contract_versions|DELETE\s+FROM\s+exec008_contract_versions/i);
    }
  });

  it("keeps EXEC-005 identity, EXEC-006 reservation, and EXEC-007 accepted-offer truth upstream", () => {
    const issueSource = source("lib/domain/transaction-spine/issue-contract.ts");
    const signSource = source("lib/domain/transaction-spine/sign-contract.ts");
    const acceptOfferSource = source("lib/domain/transaction-spine/accept-offer.ts");

    expect(issueSource).toContain("buyerPhoneHash");
    expect(issueSource).toContain("hashPhone");
    expect(issueSource).not.toContain("tx.contact.update");
    expect(issueSource).not.toContain("prisma.contact.update");

    expect(issueSource).toContain("reservationExpiresAt");
    expect(signSource).toContain("Contract reservation has expired.");

    const acceptedEvent = acceptOfferSource.indexOf('eventType: "offer.accepted"');
    const issuedEvent = acceptOfferSource.indexOf('eventType: "contract.issued"');
    expect(acceptedEvent).toBeGreaterThanOrEqual(0);
    expect(issuedEvent).toBeGreaterThan(acceptedEvent);
    expect(acceptOfferSource).toContain("offerId: offer.id");
    expect(acceptOfferSource).toContain("status: OFFER_STATUS.ACCEPTED");
  });
});
