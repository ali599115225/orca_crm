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
    return [...this.versions.values()]
      .filter((entry) => entry.contractId === contractId)
      .sort((a, b) => b.version - a.version)[0] ?? null;
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
      async insertContractVersion(version: ContractVersion) {
        self.versions.set(version.id, version);
      },
      async markContractVersionSigned(input: { tenantId: string; contractVersionId: string; signedAt: Date }) {
        const value = self.versions.get(input.contractVersionId);
        if (!value || value.tenantId !== input.tenantId) throw new Error("missing");
        const next = { ...value, state: "SIGNED" as const, signedAt: input.signedAt };
        self.versions.set(next.id, next);
        return next;
      },
      async markContractVersionActivated(input: { tenantId: string; contractVersionId: string; activatedAt: Date }) {
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

    const stale: ContractVersion = {
      id: "66666666-6666-4666-8666-666666666666",
      tenantId,
      contractId,
      version: 1,
      previousVersionId: null,
      templateVersionId: templateId,
      templateContentHash: "template-hash-v7",
      contentHash: "hash-1",
      contentSnapshot: "old",
      state: "ISSUED",
      scope,
      issuedAt: actor.now ?? null,
      signedAt: null,
      acceptedAt: null,
      activatedAt: null,
    };
    const current: ContractVersion = {
      ...stale,
      id: "77777777-7777-4777-8777-777777777777",
      version: 2,
      previousVersionId: stale.id,
      contentHash: "hash-2",
      contentSnapshot: "current",
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
    const version: ContractVersion = {
      id: "88888888-8888-4888-8888-888888888888",
      tenantId,
      contractId,
      version: 1,
      previousVersionId: null,
      templateVersionId: templateId,
      templateContentHash: "template-hash-v7",
      contentHash: "signed-hash",
      contentSnapshot: "signed",
      state: "SIGNED",
      scope,
      issuedAt: actor.now ?? null,
      signedAt: actor.now ?? null,
      acceptedAt: null,
      activatedAt: null,
    };
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
});
