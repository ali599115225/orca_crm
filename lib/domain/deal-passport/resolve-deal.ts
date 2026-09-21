import type { ResolveDealInput, ResolveDealResult } from "./types";

function hasDealPassportModel(tx: any): boolean {
  return Boolean(tx?.dealPassport?.findMany && tx?.dealPassport?.create);
}

function buildResolveWhere(input: ResolveDealInput) {
  const anchors = [];
  if (input.opportunityId) anchors.push({ opportunityId: input.opportunityId });
  if (input.contractId) anchors.push({ contractId: input.contractId });
  return {
    tenantId: input.tenantId,
    OR: anchors,
  };
}

export async function resolveDealInTx(
  tx: any,
  input: ResolveDealInput,
): Promise<ResolveDealResult> {
  if (!input.opportunityId && !input.contractId) {
    throw new Error("Deal Passport requires an opportunity or contract anchor.");
  }

  if (!hasDealPassportModel(tx)) {
    return { passport: null, created: false, skipped: true };
  }

  const matches = await tx.dealPassport.findMany({
    where: buildResolveWhere(input),
    orderBy: { createdAt: "asc" },
  });

  const passportIds = new Set(matches.map((passport: any) => passport.id));
  if (passportIds.size > 1) {
    throw new Error("Deal Passport conflict: multiple passports match this deal.");
  }

  const existing = matches[0];
  if (existing) {
    const data: Record<string, string> = {};
    if (input.opportunityId && !existing.opportunityId) {
      data.opportunityId = input.opportunityId;
    }
    if (input.contractId && !existing.contractId) {
      data.contractId = input.contractId;
    }

    if (Object.keys(data).length === 0) {
      return { passport: existing, created: false, skipped: false };
    }

    const passport = await tx.dealPassport.update({
      where: { id: existing.id },
      data,
    });
    return { passport, created: false, skipped: false };
  }

  const passport = await tx.dealPassport.create({
    data: {
      tenantId: input.tenantId,
      opportunityId: input.opportunityId || null,
      contractId: input.contractId || null,
      status: "OPEN",
      version: 0,
      lastSequence: 0,
    },
  });

  return { passport, created: true, skipped: false };
}
