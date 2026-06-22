import { loadEnvConfig } from "@next/env";
import { Prisma } from "@prisma/client";

const APPLY = process.argv.includes("--apply");

type EventDescriptor = {
  eventType: string;
  idempotencyKey: string;
  entityType: string;
  entityId: string;
  occurredAt: Date;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  payload?: Record<string, unknown>;
  projection?: Record<string, unknown>;
  preferredCauseKey?: string;
};

function dateOf(value: Date | string | null | undefined, fallback: Date): Date {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function priority(eventType: string): number {
  return [
    "deal.opened",
    "opportunity.created",
    "tour.scheduled",
    "tour.status_changed",
    "offer.created",
    "offer.accepted",
    "contract.issued",
    "contract.signed",
    "financials.activated",
    "payment.completed",
    "payment_plan.restructured",
  ].indexOf(eventType);
}

function currentStatus(input: {
  opportunity: any | null;
  tours: any[];
  offers: any[];
  contract: any | null;
  completedPayments: any[];
}): string {
  const { tours, offers, contract, completedPayments } = input;
  if (contract?.paymentPlan?.version > 1) return "PAYMENT_PLAN_RESTRUCTURED";
  if (completedPayments.length > 0) return "PAYMENT_COMPLETED";
  if (contract?.status === "SIGNED" && contract.invoices?.some((invoice: any) => invoice.type === "SALE")) {
    return "FINANCIALS_ACTIVE";
  }
  if (contract?.status === "SIGNED") return "CONTRACT_SIGNED";
  if (contract) return "CONTRACT_ISSUED";
  if (offers.some((offer) => offer.status === "ACCEPTED")) return "OFFER_ACCEPTED";
  if (offers.length > 0) return "OFFERED";
  const latestTour = [...tours].sort(
    (left, right) => dateOf(right.updatedAt, right.createdAt).getTime() - dateOf(left.updatedAt, left.createdAt).getTime(),
  )[0];
  if (latestTour?.status === "COMPLETED") return "TOUR_COMPLETED";
  if (latestTour?.status === "CANCELLED") return "TOUR_CANCELLED";
  if (latestTour?.status === "NO_SHOW") return "TOUR_NO_SHOW";
  if (latestTour?.status === "FOLLOW_UP") return "TOUR_FOLLOW_UP";
  if (latestTour) return "TOUR_SCHEDULED";
  return "OPEN";
}

function buildEvents(input: {
  opportunity: any | null;
  tours: any[];
  offers: any[];
  contract: any | null;
}): EventDescriptor[] {
  const { opportunity, tours, offers, contract } = input;
  const openedAt = opportunity?.createdAt || contract?.createdAt || contract?.acceptedAt || new Date();
  const events: EventDescriptor[] = [];
  const originType = opportunity ? "opportunity" : "contract";
  const originId = opportunity?.id || contract?.id;

  events.push({
    eventType: "deal.opened",
    idempotencyKey: `deal.opened:${originType}:${originId}`,
    entityType: originType,
    entityId: originId,
    occurredAt: dateOf(openedAt, new Date()),
    afterState: { status: "OPEN", opportunityId: opportunity?.id || null, contractId: contract?.id || null },
    projection: { opportunityId: opportunity?.id || null, contractId: contract?.id || null, status: "OPEN" },
  });

  if (opportunity) {
    events.push({
      eventType: "opportunity.created",
      idempotencyKey: `opportunity.created:${opportunity.id}`,
      entityType: "opportunity",
      entityId: opportunity.id,
      occurredAt: dateOf(opportunity.createdAt, new Date()),
      afterState: { status: opportunity.status, unitId: opportunity.unitId || null, probability: opportunity.probability },
      payload: { leadId: opportunity.leadId },
      projection: { opportunityId: opportunity.id, status: "OPEN" },
      preferredCauseKey: `deal.opened:opportunity:${opportunity.id}`,
    });
  }

  for (const tour of tours) {
    events.push({
      eventType: "tour.scheduled",
      idempotencyKey: `tour.scheduled:${tour.id}`,
      entityType: "tour",
      entityId: tour.id,
      occurredAt: dateOf(tour.createdAt, new Date()),
      afterState: {
        status: "SCHEDULED",
        startAt: dateOf(tour.startAt, new Date()).toISOString(),
        endAt: dateOf(tour.endAt, new Date()).toISOString(),
      },
      payload: {
        leadId: tour.leadId,
        opportunityId: tour.opportunityId || null,
        unitId: tour.unitId || null,
        offerId: tour.offerId || null,
      },
      projection: { opportunityId: opportunity?.id || null, currentOfferId: tour.offerId || null, status: "TOUR_SCHEDULED" },
    });
    if (tour.status !== "SCHEDULED") {
      events.push({
        eventType: "tour.status_changed",
        idempotencyKey: `tour.status:backfill:${tour.id}:${tour.status}`,
        entityType: "tour",
        entityId: tour.id,
        occurredAt: dateOf(tour.updatedAt, tour.createdAt),
        beforeState: { status: "SCHEDULED" },
        afterState: { status: tour.status },
        projection: { opportunityId: opportunity?.id || null, currentOfferId: tour.offerId || null },
        preferredCauseKey: `tour.scheduled:${tour.id}`,
      });
    }
  }

  for (const offer of offers) {
    events.push({
      eventType: "offer.created",
      idempotencyKey: `offer.created:${offer.id}`,
      entityType: "offer",
      entityId: offer.id,
      occurredAt: dateOf(offer.createdAt, new Date()),
      afterState: { status: "PENDING", opportunityId: offer.linkedOpportunityId, unitId: offer.unitId || null },
      payload: { opportunityId: offer.linkedOpportunityId, unitId: offer.unitId || null },
      projection: { opportunityId: opportunity?.id || offer.linkedOpportunityId, currentOfferId: offer.id, status: "OFFERED" },
    });
    if (offer.status === "ACCEPTED") {
      events.push({
        eventType: "offer.accepted",
        idempotencyKey: `offer.accepted:${offer.id}`,
        entityType: "offer",
        entityId: offer.id,
        occurredAt: dateOf(offer.updatedAt, offer.createdAt),
        beforeState: { status: "PENDING" },
        afterState: { status: "ACCEPTED" },
        payload: { opportunityId: offer.linkedOpportunityId, contractId: offer.contract?.id || null },
        projection: {
          opportunityId: opportunity?.id || offer.linkedOpportunityId,
          contractId: offer.contract?.id || null,
          currentOfferId: offer.id,
          status: "OFFER_ACCEPTED",
        },
        preferredCauseKey: `offer.created:${offer.id}`,
      });
    }
  }

  if (contract) {
    const acceptedOffer = offers.find((offer) => offer.id === contract.offerId) || null;
    events.push({
      eventType: "contract.issued",
      idempotencyKey: `contract.issued:${contract.id}`,
      entityType: "contract",
      entityId: contract.id,
      occurredAt: dateOf(contract.acceptedAt || contract.createdAt, new Date()),
      afterState: { status: "PENDING_SIGNATURE", contractId: contract.id },
      payload: { opportunityId: opportunity?.id || null, offerId: contract.offerId || null },
      projection: {
        opportunityId: opportunity?.id || null,
        contractId: contract.id,
        currentOfferId: contract.offerId || null,
        status: "CONTRACT_ISSUED",
      },
      preferredCauseKey: acceptedOffer ? `offer.accepted:${acceptedOffer.id}` : undefined,
    });

    const saleInvoice = contract.invoices?.find((invoice: any) => invoice.type === "SALE") || null;
    const contractIssuedAt = dateOf(contract.acceptedAt || contract.createdAt, new Date());
    const inferredSignedAtSource = contract.signedAt
      ? "contract.signedAt"
      : contract.paymentPlan?.activatedAt
        ? "paymentPlan.activatedAt"
        : saleInvoice?.issueDate
          ? "saleInvoice.issueDate"
          : contract.acceptedAt
            ? "contract.acceptedAt"
            : "contract.createdAt";
    const signedEvidenceAt = dateOf(
      contract.signedAt ||
        contract.paymentPlan?.activatedAt ||
        saleInvoice?.issueDate ||
        contract.acceptedAt ||
        contract.createdAt,
      contractIssuedAt,
    );
    const inferredSignedAt = signedEvidenceAt.getTime() < contractIssuedAt.getTime()
      ? contractIssuedAt
      : signedEvidenceAt;

    if (contract.status === "SIGNED") {
      events.push({
        eventType: "contract.signed",
        idempotencyKey: `contract.signed:${contract.id}`,
        entityType: "contract",
        entityId: contract.id,
        occurredAt: inferredSignedAt,
        beforeState: { status: "PENDING_SIGNATURE", signedAt: null },
        afterState: {
          status: "SIGNED",
          signedAt: contract.signedAt
            ? dateOf(contract.signedAt, inferredSignedAt).toISOString()
            : null,
          historicalInference: !contract.signedAt,
        },
        payload: {
          inferredSignedAt: !contract.signedAt,
          inferenceSource: inferredSignedAtSource,
        },
        projection: {
          opportunityId: opportunity?.id || null,
          contractId: contract.id,
          currentOfferId: contract.offerId || null,
          status: "CONTRACT_SIGNED",
        },
        preferredCauseKey: `contract.issued:${contract.id}`,
      });
    }
    if (contract.status === "SIGNED" && contract.paymentPlan && saleInvoice) {
      events.push({
        eventType: "financials.activated",
        idempotencyKey: `financials.activated:${contract.id}`,
        entityType: "contract",
        entityId: contract.id,
        occurredAt: dateOf(contract.paymentPlan.activatedAt || contract.signedAt, contract.acceptedAt),
        beforeState: { invoiceExists: false, installmentsExist: false, paymentPlanActive: false },
        afterState: { invoiceExists: true, installmentsExist: true, paymentPlanActive: contract.paymentPlan.status === "ACTIVE" || contract.paymentPlan.status === "COMPLETED" },
        payload: { invoiceId: saleInvoice.id, paymentPlanId: contract.paymentPlan.id, backfilled: true },
        projection: {
          opportunityId: opportunity?.id || null,
          contractId: contract.id,
          currentOfferId: contract.offerId || null,
          status: "FINANCIALS_ACTIVE",
        },
        preferredCauseKey: `contract.signed:${contract.id}`,
      });
    }

    for (const invoice of contract.invoices || []) {
      const completedTransactions = (invoice.paymentTransactions || []).filter(
        (payment: any) => payment.status === "COMPLETED",
      );
      for (const payment of completedTransactions) {
        events.push({
          eventType: "payment.completed",
          idempotencyKey: `payment.completed:${payment.id}`,
          entityType: "payment",
          entityId: payment.id,
          occurredAt: dateOf(payment.paidAt || payment.processedAt || payment.createdAt, new Date()),
          beforeState: { status: "PENDING" },
          afterState: { status: "COMPLETED", invoiceStatus: invoice.status },
          payload: { invoiceId: invoice.id, installmentId: payment.installmentId || null, backfilled: true },
          projection: { contractId: contract.id, status: "PAYMENT_COMPLETED" },
        });
      }

      if (completedTransactions.length === 0 && String(invoice.status).toLowerCase() === "paid") {
        for (const receipt of invoice.legacyReceipts || []) {
          if (receipt.status !== "COMPLETED") continue;
          events.push({
            eventType: "payment.completed",
            idempotencyKey: `payment.completed:legacy-receipt:${receipt.id}`,
            entityType: "payment",
            entityId: receipt.id,
            occurredAt: dateOf(receipt.receivedDate, invoice.updatedAt || invoice.createdAt),
            beforeState: { status: "LEGACY_RECORDED", invoiceStatus: "unpaid" },
            afterState: { status: "COMPLETED", invoiceStatus: invoice.status },
            payload: {
              invoiceId: invoice.id,
              receiptId: receipt.id,
              legacyReceipt: true,
              backfilled: true,
            },
            projection: { contractId: contract.id, status: "PAYMENT_COMPLETED" },
          });
        }
      }
    }

    if (contract.paymentPlan?.version > 1) {
      events.push({
        eventType: "payment_plan.restructured",
        idempotencyKey: `payment-plan:${contract.paymentPlan.id}:restructured:v${contract.paymentPlan.version}`,
        entityType: "payment_plan",
        entityId: contract.paymentPlan.id,
        occurredAt: dateOf(contract.paymentPlan.lastAmendedAt, contract.paymentPlan.updatedAt),
        afterState: { version: contract.paymentPlan.version, installmentCount: contract.paymentPlan.installmentCount },
        payload: { backfilled: true },
        projection: { contractId: contract.id, status: "PAYMENT_PLAN_RESTRUCTURED" },
      });
    }
  }

  return events.sort((left, right) => {
    const byTime = left.occurredAt.getTime() - right.occurredAt.getTime();
    if (byTime !== 0) return byTime;
    return priority(left.eventType) - priority(right.eventType);
  });
}

async function main() {
  loadEnvConfig(process.cwd());
  const { prisma } = await import("../lib/prisma");
  const { appendDealEventInTx, resolveDealInTx } = await import("../lib/domain/deal-passport");

  const opportunities = await prisma.opportunity.findMany({
    include: {
      tours: true,
      offers: {
        orderBy: { createdAt: "asc" },
        include: { contract: true },
      },
    },
    orderBy: [{ tenantId: "asc" }, { createdAt: "asc" }],
  });

  const contracts = await prisma.contract.findMany({
    include: {
      offer: { include: { opportunity: true } },
      paymentPlan: true,
      invoices: {
        include: {
          paymentTransactions: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ tenantId: "asc" }, { acceptedAt: "asc" }],
  });

  const legacyReceipts = await prisma.receipt.findMany({
    where: {
      paymentTransactionId: null,
      status: "COMPLETED",
    },
    orderBy: { receivedDate: "asc" },
  });
  const legacyReceiptsByInvoice = new Map<string, any[]>();
  for (const receipt of legacyReceipts) {
    const list = legacyReceiptsByInvoice.get(receipt.invoiceId) || [];
    list.push(receipt);
    legacyReceiptsByInvoice.set(receipt.invoiceId, list);
  }
  for (const contract of contracts) {
    for (const invoice of contract.invoices || []) {
      (invoice as any).legacyReceipts = legacyReceiptsByInvoice.get(invoice.id) || [];
    }
  }

  const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
  const processedContracts = new Set<string>();
  const work: Array<{ opportunity: any | null; tours: any[]; offers: any[]; contract: any | null }> = [];
  const unresolved: string[] = [];

  for (const opportunity of opportunities) {
    const linkedContractIds = [...new Set(
      opportunity.offers
        .map((offer: any) => offer.contract?.id)
        .filter(Boolean),
    )] as string[];
    if (linkedContractIds.length > 1) {
      unresolved.push(`opportunity=${opportunity.id} reason=multiple_contracts`);
      continue;
    }
    const contract = linkedContractIds[0] ? contractById.get(linkedContractIds[0]) || null : null;
    if (contract) processedContracts.add(contract.id);
    work.push({ opportunity, tours: opportunity.tours, offers: opportunity.offers, contract });
  }

  for (const contract of contracts) {
    if (processedContracts.has(contract.id)) continue;
    work.push({
      opportunity: contract.offer?.opportunity || null,
      tours: [],
      offers: contract.offer ? [contract.offer] : [],
      contract,
    });
  }

  console.log(`MODE=${APPLY ? "APPLY" : "DRY_RUN"} aggregates=${work.length}`);
  if (!APPLY) {
    const expectedEvents = work.reduce((sum, item) => sum + buildEvents(item).length, 0);
    console.log(`DRY_RUN opportunities=${opportunities.length} contracts=${contracts.length} expectedEvents=${expectedEvents} unresolved=${unresolved.length}`);
    await prisma.$disconnect();
    if (unresolved.length > 0) {
      unresolved.forEach((issue) => console.error(`UNRESOLVED ${issue}`));
      process.exitCode = 2;
    }
    return;
  }

  let passportsTouched = 0;
  let eventsCreated = 0;
  let eventsReplayed = 0;

  for (const item of work) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const opportunityId = item.opportunity?.id || item.contract?.offer?.opportunity?.id || null;
          const contractId = item.contract?.id || null;
          const deal = await resolveDealInTx(tx, {
            tenantId: item.opportunity?.tenantId || item.contract?.tenantId,
            opportunityId,
            contractId,
            actorType: "BACKFILL",
            correlationId: `backfill:${opportunityId || contractId}`,
          });
          if (!deal.passport) throw new Error("Deal Passport model unavailable.");

          const descriptors = buildEvents(item);
          const eventIds = new Map<string, string>();
          let previousEventId: string | null = deal.passport.lastEventId || null;
          for (const descriptor of descriptors) {
            const cause = descriptor.preferredCauseKey
              ? eventIds.get(descriptor.preferredCauseKey) || previousEventId
              : previousEventId;
            const result = await appendDealEventInTx(tx, {
              tenantId: deal.passport.tenantId,
              dealId: deal.passport.id,
              eventType: descriptor.eventType as never,
              idempotencyKey: descriptor.idempotencyKey,
              correlationId: `backfill:${deal.passport.id}`,
              causationId: cause,
              actorType: "BACKFILL",
              actorId: null,
              entityType: descriptor.entityType as never,
              entityId: descriptor.entityId,
              beforeState: descriptor.beforeState as never,
              afterState: descriptor.afterState as never,
              payload: { ...(descriptor.payload || {}), backfilled: true } as never,
              occurredAt: descriptor.occurredAt,
              projection: descriptor.projection as never,
            });
            if (result.event?.id) {
              eventIds.set(descriptor.idempotencyKey, result.event.id);
              previousEventId = result.event.id;
            }
            if (result.idempotent) eventsReplayed += 1;
            else if (result.event) eventsCreated += 1;
          }

          const completedPayments = (item.contract?.invoices || []).flatMap((invoice: any) => [
            ...(invoice.paymentTransactions || []).filter((payment: any) => payment.status === "COMPLETED"),
            ...((invoice.paymentTransactions || []).some((payment: any) => payment.status === "COMPLETED")
              ? []
              : invoice.legacyReceipts || []),
          ]);
          const currentOffer = [...item.offers]
            .sort((left: any, right: any) => dateOf(right.updatedAt, right.createdAt).getTime() - dateOf(left.updatedAt, left.createdAt).getTime())[0];
          const latestEvent = await tx.dealEvent.findFirst({
            where: { dealId: deal.passport.id },
            orderBy: { sequence: "desc" },
          });
          await tx.dealPassport.update({
            where: { id: deal.passport.id },
            data: {
              opportunityId,
              contractId,
              currentOfferId: currentOffer?.id || item.contract?.offerId || null,
              status: currentStatus({
                opportunity: item.opportunity,
                tours: item.tours,
                offers: item.offers,
                contract: item.contract,
                completedPayments,
              }),
              openedAt: dateOf(item.opportunity?.createdAt || item.contract?.acceptedAt, deal.passport.createdAt),
              lastEventId: latestEvent?.id || null,
              lastEventAt: latestEvent?.occurredAt || null,
            },
          });
          passportsTouched += 1;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 20_000,
          timeout: 120_000,
        },
      );
    } catch (error) {
      unresolved.push(
        `aggregate=${item.opportunity?.id || item.contract?.id} reason=${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  await prisma.$disconnect();
  console.log(`RESULT passportsTouched=${passportsTouched} eventsCreated=${eventsCreated} eventsReplayed=${eventsReplayed} unresolved=${unresolved.length}`);
  if (unresolved.length > 0) {
    unresolved.forEach((issue) => console.error(`UNRESOLVED ${issue}`));
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error("PHASE02_BACKFILL_FATAL", error);
  process.exitCode = 1;
});
