import "server-only";

import { prisma } from "@/lib/prisma";

export type W1LegacyReferences = {
  tenantId: string;
  leadId?: string | null;
  unitId?: string | null;
  contractId?: string | null;
};

type ContractReference = {
  id: string;
  unitId: string;
  leadId: string | null;
};

export type W1LegacyReferenceLookup = {
  findLead(tenantId: string, id: string): Promise<{ id: string } | null>;
  findUnit(tenantId: string, id: string): Promise<{ id: string } | null>;
  findContract(tenantId: string, id: string): Promise<ContractReference | null>;
};

const prismaReferenceLookup: W1LegacyReferenceLookup = {
  async findLead(tenantId, id) {
    return await prisma.lead.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
  },
  async findUnit(tenantId, id) {
    return await prisma.unit.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
  },
  async findContract(tenantId, id) {
    return await prisma.contract.findFirst({
      where: { id, tenantId },
      select: { id: true, unitId: true, leadId: true },
    });
  },
};

export class W1ReferenceIntegrityError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "W1ReferenceIntegrityError";
  }
}

export async function assertW1LegacyReferenceIntegrity(
  references: W1LegacyReferences,
  lookup: W1LegacyReferenceLookup = prismaReferenceLookup,
): Promise<void> {
  const { tenantId, leadId = null, unitId = null, contractId = null } = references;

  if (!tenantId) {
    throw new W1ReferenceIntegrityError("W1_TENANT_REQUIRED");
  }

  const [lead, unit, contract] = await Promise.all([
    leadId ? lookup.findLead(tenantId, leadId) : Promise.resolve(null),
    unitId ? lookup.findUnit(tenantId, unitId) : Promise.resolve(null),
    contractId ? lookup.findContract(tenantId, contractId) : Promise.resolve(null),
  ]);

  if (leadId && !lead) {
    throw new W1ReferenceIntegrityError("W1_LEAD_NOT_FOUND_FOR_TENANT");
  }
  if (unitId && !unit) {
    throw new W1ReferenceIntegrityError("W1_UNIT_NOT_FOUND_FOR_TENANT");
  }
  if (contractId && !contract) {
    throw new W1ReferenceIntegrityError("W1_CONTRACT_NOT_FOUND_FOR_TENANT");
  }

  if (contract && unitId && contract.unitId !== unitId) {
    throw new W1ReferenceIntegrityError("W1_CONTRACT_UNIT_MISMATCH");
  }

  if (contract && leadId && contract.leadId && contract.leadId !== leadId) {
    throw new W1ReferenceIntegrityError("W1_CONTRACT_LEAD_MISMATCH");
  }
}
