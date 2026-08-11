import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { hashPhone } from "@/lib/privacy-mask";
import { assertTenantOwnership } from "./validate-tenant";
import { ensureDefaultPaymentPlanInTx } from "./payment-plan";
import {
  CONTRACT_STATUS,
  DEFAULT_RESERVATION_DAYS,
  UNIT_STATUS,
} from "./constants";
import type { IssueContractInput } from "./types";

const ORCA_CONTRACT_V1_TEMPLATE_KEY = "ORCA_CONTRACT_V1";
const ORCA_CONTRACT_V1_TEMPLATE_VERSION = 1;
const ORCA_CONTRACT_V1_TEMPLATE_SNAPSHOT = JSON.stringify({
  templateKey: ORCA_CONTRACT_V1_TEMPLATE_KEY,
  version: ORCA_CONTRACT_V1_TEMPLATE_VERSION,
  source: "TRANSACTION_SPINE",
  issuanceStatus: CONTRACT_STATUS.PENDING_SIGNATURE,
  spineVersion: 2,
  legacyFinancial: false,
  fields: [
    "contractId",
    "tenantId",
    "unitId",
    "leadId",
    "offerId",
    "buyerName",
    "buyerPhoneHash",
    "totalVolumeSar",
    "acceptedAt",
    "reservationExpiresAt",
    "status",
    "spineVersion",
    "legacyFinancial",
  ],
});
const ORCA_CONTRACT_V1_TEMPLATE_HASH = createHash("sha256")
  .update(ORCA_CONTRACT_V1_TEMPLATE_SNAPSHOT)
  .digest("hex");

type Exec008SqlClient = {
  $executeRaw(query: Prisma.Sql): Promise<number>;
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function hashSnapshot(snapshot: string): string {
  return createHash("sha256").update(snapshot).digest("hex");
}

async function bindIssuedContractToExec008TemplateInTx(
  tx: Exec008SqlClient,
  contract: {
    id: string;
    tenantId: string;
    unitId: string;
    leadId: string | null;
    offerId: string | null;
    buyerName: string;
    buyerPhoneHash: string | null;
    totalVolumeSar: unknown;
    acceptedAt: Date;
    reservationExpiresAt: Date;
    status: string;
    spineVersion: number;
    legacyFinancial: boolean;
  },
) {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO exec008_contract_template_versions (
      tenant_id, template_key, version, content_hash, content_snapshot, issued_at
    ) VALUES (
      ${contract.tenantId}::uuid,
      ${ORCA_CONTRACT_V1_TEMPLATE_KEY},
      ${ORCA_CONTRACT_V1_TEMPLATE_VERSION},
      ${ORCA_CONTRACT_V1_TEMPLATE_HASH},
      ${ORCA_CONTRACT_V1_TEMPLATE_SNAPSHOT},
      now()
    )
    ON CONFLICT (tenant_id, template_key, version) DO NOTHING
  `);

  const templateRows = await tx.$queryRaw<
    Array<{ id: string; content_hash: string; content_snapshot: string }>
  >(Prisma.sql`
    SELECT id, content_hash, content_snapshot
    FROM exec008_contract_template_versions
    WHERE tenant_id = ${contract.tenantId}::uuid
      AND template_key = ${ORCA_CONTRACT_V1_TEMPLATE_KEY}
      AND version = ${ORCA_CONTRACT_V1_TEMPLATE_VERSION}
    LIMIT 1
  `);
  const template = templateRows[0];
  if (
    !template ||
    template.content_hash !== ORCA_CONTRACT_V1_TEMPLATE_HASH ||
    template.content_snapshot !== ORCA_CONTRACT_V1_TEMPLATE_SNAPSHOT
  ) {
    throw new Error("ORCA_CONTRACT_V1 conflicts with persisted template truth.");
  }

  const contentSnapshot = JSON.stringify({
    contractId: contract.id,
    tenantId: contract.tenantId,
    unitId: contract.unitId,
    leadId: contract.leadId,
    offerId: contract.offerId,
    buyerName: contract.buyerName,
    buyerPhoneHash: contract.buyerPhoneHash,
    totalVolumeSar: Number(contract.totalVolumeSar),
    acceptedAt: contract.acceptedAt.toISOString(),
    reservationExpiresAt: contract.reservationExpiresAt.toISOString(),
    status: contract.status,
    spineVersion: contract.spineVersion,
    legacyFinancial: contract.legacyFinancial,
  });
  const contentHash = hashSnapshot(contentSnapshot);

  await tx.$executeRaw(Prisma.sql`
    INSERT INTO exec008_contract_versions (
      tenant_id, contract_id, version, previous_version_id, template_version_id,
      template_content_hash, content_hash, content_snapshot, state,
      resource_type, resource_id, issued_at
    ) VALUES (
      ${contract.tenantId}::uuid,
      ${contract.id}::uuid,
      1,
      NULL,
      ${template.id}::uuid,
      ${ORCA_CONTRACT_V1_TEMPLATE_HASH},
      ${contentHash},
      ${contentSnapshot},
      'ISSUED',
      'CONTRACT',
      ${contract.id},
      now()
    )
    ON CONFLICT (tenant_id, contract_id, version) DO NOTHING
  `);

  const versionRows = await tx.$queryRaw<
    Array<{
      template_version_id: string;
      template_content_hash: string;
      content_hash: string;
      content_snapshot: string;
      resource_type: string;
      resource_id: string;
    }>
  >(Prisma.sql`
    SELECT template_version_id, template_content_hash, content_hash,
           content_snapshot, resource_type, resource_id
    FROM exec008_contract_versions
    WHERE tenant_id = ${contract.tenantId}::uuid
      AND contract_id = ${contract.id}::uuid
      AND version = 1
    LIMIT 1
  `);
  const version = versionRows[0];
  if (
    !version ||
    version.template_version_id !== template.id ||
    version.template_content_hash !== ORCA_CONTRACT_V1_TEMPLATE_HASH ||
    version.content_hash !== contentHash ||
    version.content_snapshot !== contentSnapshot ||
    version.resource_type !== "CONTRACT" ||
    version.resource_id !== contract.id
  ) {
    throw new Error("EXEC-008 issued contract version conflicts with Transaction Spine truth.");
  }
}

export async function _createContractInTx(
  tx: any,
  data: {
    tenantId: string;
    userId: string | null;
    unitId: string;
    leadId: string | null;
    offerId?: string | null;
    buyerName: string;
    buyerPhone: string;
    totalVolumeSar: number;
    acceptedAt?: Date;
    reservationExpiresAt?: Date;
  },
) {
  const acceptedAt = data.acceptedAt || new Date();
  const reservationExpiresAt =
    data.reservationExpiresAt || addDays(acceptedAt, DEFAULT_RESERVATION_DAYS);
  const buyerPhoneHash = hashPhone(data.tenantId, data.buyerPhone);

  const contract = await tx.contract.create({
    data: {
      tenantId: data.tenantId,
      unitId: data.unitId,
      leadId: data.leadId,
      offerId: data.offerId || null,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      buyerPhoneHash,
      totalVolumeSar: data.totalVolumeSar,
      acceptedAt,
      reservationExpiresAt,
      signedAt: null,
      status: CONTRACT_STATUS.PENDING_SIGNATURE,
      spineVersion: 2,
      legacyFinancial: false,
      legacyReason: null,
    },
  });

  await tx.unit.update({
    where: { id: data.unitId },
    data: { status: UNIT_STATUS.RESERVED },
  });

  if (data.leadId) {
    await tx.lead.update({
      where: { id: data.leadId },
      data: { status: "RESERVED" },
    });
  }

  const paymentPlan = await ensureDefaultPaymentPlanInTx(tx, contract);

  await tx.auditLog.create({
    data: {
      tenantId: data.tenantId,
      userId: data.userId,
      action: data.offerId
        ? "ACCEPT_OFFER_CREATE_DRAFT_CONTRACT"
        : "CREATE_DRAFT_CONTRACT",
      tableName: "contracts",
      recordId: contract.id,
      details: JSON.stringify({
        contractId: contract.id,
        unitId: data.unitId,
        leadId: data.leadId,
        offerId: data.offerId || null,
        totalVolumeSar: data.totalVolumeSar,
        status: contract.status,
        reservationExpiresAt,
        paymentPlanId: paymentPlan.id,
      }),
    },
  });

  await tx.telemetryEvent
    .create({
      data: {
        tenantId: data.tenantId,
        eventType: data.offerId
          ? "offer.accepted.contract.draft_created"
          : "contract.draft_created",
        eventDataJson: JSON.stringify({
          contractId: contract.id,
          unitId: data.unitId,
          paymentPlanId: paymentPlan.id,
        }),
        createdBy: data.userId,
      },
    })
    .catch(() => {});

  return contract;
}

export async function issueContract(input: IssueContractInput) {
  const {
    tenantId,
    userId,
    clientId,
    propertyId,
    amount,
    actorId,
    correlationId: requestedCorrelationId,
  } = input;
  const eventActorId = actorId || userId;
  const correlationId = ensureDealCorrelationId(
    requestedCorrelationId,
    "deal",
  );

  if (!clientId) throw new Error("Client ID is required.");
  if (!propertyId) throw new Error("Property ID is required.");
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error("Amount must be positive.");
  }

  await assertTenantOwnership(
    tenantId,
    "unit",
    propertyId,
    "Unit not found in this tenant.",
  );

  let buyerName = "";
  let buyerPhone = "";
  let leadId: string | null = null;

  const lead = await prisma.lead.findFirst({
    where: { id: clientId, tenantId },
  });

  if (lead) {
    buyerName = `${lead.firstName} ${lead.lastName || ""}`.trim();
    buyerPhone = lead.phone;
    leadId = lead.id;
  } else {
    const contact = await prisma.contact.findFirst({
      where: { id: clientId, tenantId },
    });
    if (!contact) throw new Error("Client not found in this tenant.");
    buyerName = contact.name;
    buyerPhone = contact.phone;
  }

  return prisma.$transaction(async (tx) => {
    const unit = await tx.unit.findFirst({
      where: { id: propertyId, tenantId },
      include: { contract: true },
    });
    if (!unit) throw new Error("Unit not found.");
    if (unit.contract) throw new Error("Unit already has an active contract.");

    const contract = await _createContractInTx(tx, {
      tenantId,
      userId,
      unitId: propertyId,
      leadId,
      buyerName,
      buyerPhone,
      totalVolumeSar: Number(amount),
    });

    await bindIssuedContractToExec008TemplateInTx(tx, contract);

    const deal = await resolveDealInTx(tx, {
      tenantId,
      contractId: contract.id,
      actorId: eventActorId,
      correlationId,
    });

    let dealOpenedEventId: string | null = null;
    if (deal.created && deal.passport) {
      const dealOpened = await appendDealEventInTx(tx, {
        tenantId,
        dealId: deal.passport.id,
        eventType: "deal.opened",
        idempotencyKey: `deal.opened:contract:${contract.id}`,
        actorId: eventActorId,
        correlationId,
        entityType: "contract",
        entityId: contract.id,
        afterState: {
          status: "OPEN",
          contractId: contract.id,
        },
        projection: {
          contractId: contract.id,
          status: "OPEN",
        },
      });
      dealOpenedEventId = dealOpened.event?.id || null;
    }

    if (deal.passport) {
      await appendDealEventInTx(tx, {
        tenantId,
        dealId: deal.passport.id,
        eventType: "contract.issued",
        idempotencyKey: `contract.issued:${contract.id}`,
        causationId: dealOpenedEventId || deal.passport.lastEventId || null,
        actorId: eventActorId,
        correlationId,
        entityType: "contract",
        entityId: contract.id,
        afterState: {
          status: CONTRACT_STATUS.PENDING_SIGNATURE,
          contractId: contract.id,
        },
        projection: {
          contractId: contract.id,
          status: "CONTRACT_ISSUED",
        },
      });
    }

    return contract;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
