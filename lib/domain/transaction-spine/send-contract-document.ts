import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, type SendEmailResult } from "@/lib/email";
import { requireTenantContext } from "@/lib/tenant-context";
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
        checksumSha256: createHash("sha256").update(content).digest("hex"),
      },
      select: { id: true, content: true },
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
    return { deliveryId: delivery.id, documentId: document.id, snapshotId: snapshot.id,
      html: Buffer.from(document.content).toString("utf8"), label };
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
  const status = result.success ? "SENT" : "FAILED";
  const now = new Date();
  // SENT means provider acceptance, never a claim of recipient delivery.
  // Keep this outside the provider catch: persistence failure after acceptance
  // must not overwrite the attempt as FAILED or cause another provider call.
  const updated = await prisma.contractDelivery.updateMany({
    where: { id: prepared.deliveryId, tenantId: input.tenantId,
      contractId: input.contractId, status: "PENDING" },
    data: {
      status,
      provider: result.provider ?? null,
      providerReference: result.providerMessageId ?? null,
      errorMessage: result.success ? null : (result.code ?? "CONTRACT_EMAIL_SEND_FAILED"),
      sentAt: result.success ? now : null,
      failedAt: result.success ? null : now,
    },
  });
  if (updated.count !== 1) {
    throw new ContractDeliveryError("CONTRACT_DELIVERY_STATE_CONFLICT");
  }
  return { id: prepared.deliveryId, documentId: prepared.documentId,
    snapshotId: prepared.snapshotId, status };
}
