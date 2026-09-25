import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, type SendEmailResult } from "@/lib/email";
import { requireTenantContext } from "@/lib/tenant-context";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { CONTRACT_STATUS } from "./constants";
import { SIGNED_OPERATIONAL_SNAPSHOT_TYPE } from "./signed-contract-snapshot";
import { renderSignedContractDocument } from "./signed-contract-document";

export class ContractDeliveryError extends Error {
  constructor(public readonly code: string, public readonly status = 409) {
    super(code);
  }
}

// Each invocation is a new attempt. There is no execution/idempotency key in
// the existing delivery model or email provider interface; never auto-retry.
export async function sendContractDocument(input: {
  tenantId: string;
  userId: string;
  ownerName: string;
  contractId: string;
  recipient: string;
}) {
  const context = requireTenantContext();
  if (context.tenantId !== input.tenantId || context.userId !== input.userId) {
    throw new ContractDeliveryError("CONTRACT_DELIVERY_TENANT_MISMATCH", 403);
  }
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(input.recipient)) {
    throw new ContractDeliveryError("CONTRACT_RECIPIENT_INVALID", 400);
  }

  const correlationId =
    ensureDealCorrelationId(undefined, "contract-document");

  // The document and its PENDING delivery commit together before provider IO.
  const prepared = await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: { tenantId: input.tenantId, id: input.contractId },
      select: { id: true, tenantId: true, status: true, signedAt: true },
    });
    if (!contract || contract.tenantId !== input.tenantId) {
      throw new ContractDeliveryError("CONTRACT_NOT_FOUND", 404);
    }
    if (contract.status !== CONTRACT_STATUS.SIGNED || !contract.signedAt) {
      throw new ContractDeliveryError("CONTRACT_NOT_SIGNED");
    }
    const snapshot = await tx.contractSnapshot.findFirst({
      where: {
        tenantId: input.tenantId,
        contractId: contract.id,
        snapshotType: SIGNED_OPERATIONAL_SNAPSHOT_TYPE,
      },
      orderBy: { contractVersion: "desc" },
    });
    if (!snapshot) throw new ContractDeliveryError("SIGNED_SNAPSHOT_MISSING");
    const { html, identity, label } = renderSignedContractDocument(snapshot);
    if (snapshot.tenantId !== input.tenantId || identity.contractId !== contract.id ||
        identity.signedAt !== contract.signedAt.toISOString()) {
      throw new ContractDeliveryError("SIGNED_SNAPSHOT_IDENTITY_MISMATCH");
    }
    const content = Buffer.from(html, "utf8");
    const checksumSha256 = createHash("sha256").update(content).digest("hex");
    const document = await tx.document.create({
      data: {
        tenantId: input.tenantId,
        contractId: contract.id,
        ownerId: input.userId,
        ownerName: input.ownerName,
        name: `${label}.html`,
        type: "CONTRACT",
        status: "READY",
        mimeType: "text/html",
        extension: "html",
        size: content.length,
        content: Uint8Array.from(content),
        checksumSha256,
      },
      select: { id: true, content: true, checksumSha256: true },
    });
    const delivery = await tx.contractDelivery.create({
      data: {
        tenantId: input.tenantId,
        contractId: contract.id,
        documentId: document.id,
        snapshotId: snapshot.id,
        recipient: input.recipient,
        channel: "EMAIL",
        status: "PENDING",
      },
      select: { id: true },
    });

    let generatedEventId: string | null = null;
    const deal = await resolveDealInTx(tx, {
      tenantId: input.tenantId,
      contractId: contract.id,
      actorId: input.userId,
      correlationId,
    });

    if (deal.passport) {
      const generatedEvent = await appendDealEventInTx(tx, {
        tenantId: input.tenantId,
        dealId: deal.passport.id,
        eventType: "contract.document.generated",
        idempotencyKey: `contract.document.generated:${document.id}`,
        correlationId,
        causationId: deal.passport.lastEventId || null,
        entityType: "document",
        entityId: document.id,
        actorId: input.userId,
        beforeState: null,
        afterState: {
          documentStatus: "READY",
          deliveryStatus: "PENDING",
        },
        payload: {
          contractId: contract.id,
          documentId: document.id,
          deliveryId: delivery.id,
          snapshotId: snapshot.id,
          checksumSha256: document.checksumSha256,
          channel: "EMAIL",
        },
        projection: {
          contractId: contract.id,
        },
      });
      generatedEventId = generatedEvent.event?.id ?? null;
    }

    return {
      deliveryId: delivery.id,
      documentId: document.id,
      snapshotId: snapshot.id,
      html: Buffer.from(document.content).toString("utf8"),
      label,
      generatedEventId,
    };
  });

  let result: SendEmailResult;
  try {
    result = await sendEmail({
      tenantId: input.tenantId,
      to: input.recipient,
      subject: prepared.label,
      htmlBody: prepared.html,
    });
  } catch {
    // A thrown transport error cannot prove non-delivery. Preserve PENDING
    // for reconciliation instead of retrying or claiming the attempt failed.
    throw new ContractDeliveryError("CONTRACT_DELIVERY_OUTCOME_UNKNOWN", 502);
  }

  if (!result.success) {
    const failedAt = new Date();
    const updated = await prisma.contractDelivery.updateMany({
      where: {
        id: prepared.deliveryId,
        tenantId: input.tenantId,
        contractId: input.contractId,
        status: "PENDING",
      },
      data: {
        status: "FAILED",
        provider: result.provider ?? null,
        providerReference: result.providerMessageId ?? null,
        errorMessage: result.code ?? "CONTRACT_EMAIL_SEND_FAILED",
        sentAt: null,
        failedAt,
      },
    });
    if (updated.count !== 1) {
      throw new ContractDeliveryError("CONTRACT_DELIVERY_STATE_CONFLICT");
    }
    return {
      id: prepared.deliveryId,
      documentId: prepared.documentId,
      snapshotId: prepared.snapshotId,
      status: "FAILED",
    };
  }

  const sentAt = new Date();
  await prisma.$transaction(async (tx) => {
    const updated = await tx.contractDelivery.updateMany({
      where: {
        id: prepared.deliveryId,
        tenantId: input.tenantId,
        contractId: input.contractId,
        status: "PENDING",
      },
      data: {
        status: "SENT",
        provider: result.provider ?? null,
        providerReference: result.providerMessageId ?? null,
        errorMessage: null,
        sentAt,
        failedAt: null,
      },
    });
    if (updated.count !== 1) {
      throw new ContractDeliveryError("CONTRACT_DELIVERY_STATE_CONFLICT");
    }

    const deal = await resolveDealInTx(tx, {
      tenantId: input.tenantId,
      contractId: input.contractId,
      actorId: input.userId,
      correlationId,
    });

    if (deal.passport) {
      await appendDealEventInTx(tx, {
        tenantId: input.tenantId,
        dealId: deal.passport.id,
        eventType: "contract.document.sent",
        idempotencyKey: `contract.document.sent:${prepared.deliveryId}`,
        correlationId,
        causationId: prepared.generatedEventId,
        entityType: "document",
        entityId: prepared.documentId,
        actorId: input.userId,
        beforeState: {
          deliveryStatus: "PENDING",
        },
        afterState: {
          deliveryStatus: "SENT",
          provider: result.provider ?? null,
          providerReference: result.providerMessageId ?? null,
        },
        payload: {
          contractId: input.contractId,
          documentId: prepared.documentId,
          deliveryId: prepared.deliveryId,
          snapshotId: prepared.snapshotId,
          channel: "EMAIL",
          provider: result.provider ?? null,
          providerReference: result.providerMessageId ?? null,
          providerAccepted: true,
        },
        projection: {
          contractId: input.contractId,
        },
      });
    }
  });

  return {
    id: prepared.deliveryId,
    documentId: prepared.documentId,
    snapshotId: prepared.snapshotId,
    status: "SENT",
  };
}
