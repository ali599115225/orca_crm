import { loadEnvConfig } from "@next/env";
import { calculateVat } from "../lib/vat/engine";

async function main() {
  loadEnvConfig(process.cwd());

  const { prisma } = await import("../lib/prisma");
  const {
    acceptOfferAndCreateContract,
    ensureDefaultPaymentPlan,
    signContract,
    CONTRACT_STATUS,
  } = await import("../lib/domain/transaction-spine");

  const actorByTenant = new Map<string, string>();
  async function actorFor(tenantId: string, preferred?: string | null) {
    if (preferred) {
      const preferredUser = await prisma.user.findFirst({
        where: { id: preferred, tenantId, isActive: true },
        select: { id: true },
      });
      if (preferredUser) return preferredUser.id;
    }
    const cached = actorByTenant.get(tenantId);
    if (cached) return cached;
    const user = await prisma.user.findFirst({
      where: { tenantId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!user) throw new Error(`No active user for tenant ${tenantId}`);
    actorByTenant.set(tenantId, user.id);
    return user.id;
  }

  let acceptedCreated = 0;
  let plansCreated = 0;
  let signedActivated = 0;
  let unchanged = 0;
  const unresolved: string[] = [];

  const acceptedOffers = await prisma.offer.findMany({
    where: { status: "ACCEPTED" },
    select: {
      id: true,
      tenantId: true,
      createdBy: true,
      updatedBy: true,
      unitId: true,
      price: true,
      linkedOpportunityId: true,
      opportunity: { select: { leadId: true } },
      contract: { select: { id: true } },
      unit: {
        select: {
          contract: {
            select: {
              id: true,
              tenantId: true,
              leadId: true,
              offerId: true,
              totalVolumeSar: true,
            },
          },
        },
      },
    },
    orderBy: [{ tenantId: "asc" }, { createdAt: "asc" }],
  });

  for (const offer of acceptedOffers) {
    if (!offer.unitId) {
      unresolved.push(`offer=${offer.id} reason=accepted_without_unit`);
      continue;
    }
    if (offer.contract) continue;
    try {
      const userId = await actorFor(offer.tenantId, offer.updatedBy || offer.createdBy);
      const unitContract = offer.unit?.contract || null;
      if (unitContract) {
        const safelyLinkable =
          unitContract.tenantId === offer.tenantId &&
          unitContract.offerId === null &&
          unitContract.leadId === offer.opportunity.leadId &&
          Math.abs(Number(unitContract.totalVolumeSar) - Number(offer.price)) <= 0.01;

        if (!safelyLinkable) {
          throw new Error("unit_contract_cannot_be_linked_safely");
        }

        await prisma.$transaction(async (tx) => {
          await tx.contract.update({
            where: { id: unitContract.id },
            data: { offerId: offer.id },
          });
          await tx.auditLog.create({
            data: {
              tenantId: offer.tenantId,
              userId,
              action: "BACKFILL_LINK_ACCEPTED_OFFER_CONTRACT",
              tableName: "contracts",
              recordId: unitContract.id,
              details: JSON.stringify({ offerId: offer.id, contractId: unitContract.id }),
            },
          });
        });
        acceptedCreated += 1;
      } else {
        await acceptOfferAndCreateContract({
          tenantId: offer.tenantId,
          userId,
          offerId: offer.id,
        });
        acceptedCreated += 1;
      }
    } catch (error) {
      unresolved.push(
        `offer=${offer.id} reason=${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const contracts = await prisma.contract.findMany({
    include: {
      paymentPlan: true,
      invoices: {
        where: { type: "SALE" },
        include: { installments: true },
      },
    },
    orderBy: [{ tenantId: "asc" }, { createdAt: "asc" }],
  });

  for (const contract of contracts) {
    try {
      const userId = await actorFor(contract.tenantId);
      let paymentPlan = contract.paymentPlan;
      if (!paymentPlan) {
        paymentPlan = await ensureDefaultPaymentPlan({
          tenantId: contract.tenantId,
          contractId: contract.id,
          userId,
        });
        plansCreated += 1;
      }

      if (contract.status === CONTRACT_STATUS.SIGNED && contract.signedAt) {
        const result = await signContract({
          tenantId: contract.tenantId,
          userId,
          contractId: contract.id,
          signedAt: contract.signedAt,
        });
        if (!result.idempotent || contract.invoices.length === 0) signedActivated += 1;
        else unchanged += 1;
      } else {
        if (contract.invoices.length > 0) {
          unresolved.push(`contract=${contract.id} reason=unsigned_contract_has_sale_invoice`);
        } else {
          unchanged += 1;
        }
      }
    } catch (error) {
      unresolved.push(
        `contract=${contract.id} reason=${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const signedContracts = await prisma.contract.findMany({
    where: { status: CONTRACT_STATUS.SIGNED },
    include: {
      paymentPlan: true,
      invoices: {
        where: { type: "SALE" },
        include: { installments: true },
      },
    },
  });

  let completeSigned = 0;
  for (const contract of signedContracts) {
    const invoice = contract.invoices[0] || null;
    const installmentTotal = (invoice?.installments || []).reduce(
      (sum, item) => sum + Number(item.amountSar),
      0,
    );
    const expected = calculateVat(
      Number(contract.totalVolumeSar),
      contract.vatType === "ZERO_RATED" || contract.vatType === "EXEMPT"
        ? contract.vatType
        : "STANDARD",
    ).totalAmount;

    const complete =
      Boolean(contract.signedAt) &&
      Boolean(contract.paymentPlan) &&
      contract.invoices.length === 1 &&
      Boolean(invoice) &&
      invoice!.installments.length > 0 &&
      Math.abs(installmentTotal - expected) <= 0.01;

    if (complete) completeSigned += 1;
    else unresolved.push(`contract=${contract.id} reason=signed_spine_incomplete`);
  }

  const acceptedAfter = await prisma.offer.count({
    where: { status: "ACCEPTED", contract: null },
  });
  if (acceptedAfter > 0) {
    unresolved.push(`accepted_offers_without_contract=${acceptedAfter}`);
  }

  const uniqueUnresolved = [...new Set(unresolved)];
  for (const issue of uniqueUnresolved) console.error(`UNRESOLVED ${issue}`);

  console.log(
    `RESULT acceptedCreated=${acceptedCreated} plansCreated=${plansCreated} signedActivated=${signedActivated} unchanged=${unchanged} signedComplete=${completeSigned}/${signedContracts.length} unresolved=${uniqueUnresolved.length}`,
  );

  await prisma.$disconnect();
  if (uniqueUnresolved.length > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error("BACKFILL_FATAL", error);
  process.exitCode = 1;
});
