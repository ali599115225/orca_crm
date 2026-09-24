import { createHash } from "node:crypto";

export class CanonicalSerializationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "CanonicalSerializationError";
  }
}

/**
 * Deterministic serialization used for every contract-signing hash:
 * object keys are sorted, undefined members are omitted, Dates become ISO
 * strings and arrays keep their order. Unsupported values fail closed.
 */
export function canonicalSerialize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CanonicalSerializationError("CANONICAL_NON_FINITE_NUMBER");
    }
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new CanonicalSerializationError("CANONICAL_INVALID_DATE");
    }
    return JSON.stringify(value.toISOString());
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => (item === undefined ? "null" : canonicalSerialize(item)))
      .join(",")}]`;
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new CanonicalSerializationError("CANONICAL_UNSUPPORTED_OBJECT");
    }
    const record = value as Record<string, unknown>;
    const members = Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalSerialize(record[key])}`);
    return `{${members.join(",")}}`;
  }
  throw new CanonicalSerializationError("CANONICAL_UNSUPPORTED_VALUE");
}

export function canonicalSha256(value: unknown): string {
  return createHash("sha256").update(canonicalSerialize(value), "utf8").digest("hex");
}

export const SIGNED_OPERATIONAL_SNAPSHOT_TYPE = "SIGNED_OPERATIONAL";
export const SIGNED_SNAPSHOT_DIGEST_CONFLICT = "SIGNED_SNAPSHOT_DIGEST_CONFLICT";
export const SIGNED_SNAPSHOT_INCOMPLETE = "SIGNED_SNAPSHOT_INCOMPLETE";
export const SIGNED_SNAPSHOT_INTEGRITY_FAILED = "SIGNED_SNAPSHOT_INTEGRITY_FAILED";

export class SignedContractSnapshotError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "SignedContractSnapshotError";
  }
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function isoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new SignedContractSnapshotError(SIGNED_SNAPSHOT_INCOMPLETE);
  }
  return date.toISOString();
}

export interface SignedOperationalSnapshotSource {
  contract: {
    id: string;
    tenantId: string;
    unitId: string;
    leadId: string | null;
    offerId: string | null;
    buyerName: string;
    buyerPhone: string;
    totalVolumeSar: unknown;
    acceptedAt: Date;
    signedAt: Date | null;
    status: string;
    version: number;
    spineVersion: number;
    vatType: string;
    vatRate: unknown;
    unit?: {
      unitNumber?: unknown;
      type?: unknown;
      area?: unknown;
      city?: unknown;
      district?: unknown;
    } | null;
    tenant?: {
      companyName?: unknown;
      vatNumber?: unknown;
      commercialRegistry?: unknown;
      nationalAddress?: unknown;
    } | null;
  };
  paymentPlan: {
    id: string;
    template: string;
    status: string;
    totalAmount: unknown;
    scheduleJson: unknown;
    installmentCount: number;
    activatedAt: Date | null;
    version: number;
  } | null;
  installments: Array<{
    installmentNumber: number;
    amountSar: unknown;
    vatAmount?: unknown;
    dueDate: Date;
    paymentStatus: string;
  }>;
  invoice: {
    id: string;
    invoiceNumber?: unknown;
    invoicePrefix?: unknown;
    subtotal: unknown;
    vatRate?: unknown;
    vatAmount: unknown;
    totalAmount: unknown;
  } | null;
  signatureEvidenceHash: string;
  /**
   * Multi-sign only: the deterministic, sorted set of every required
   * ContractSignatory that was SIGNED at finalization. Absent/undefined for
   * the legacy single-sign path, which keeps its prior digest computation
   * unchanged. When present, signatureEvidenceHash above must be derived from
   * this set (never a single signer's hash) so the digest binds the complete
   * required-signature set rather than the last signer alone.
   */
  requiredSignatureSet?: RequiredSignatureSetEntry[] | null;
}

export interface RequiredSignatureSetEntry {
  signatoryId: string;
  role: string;
  required: boolean;
  signatureEvidenceHash: string | null;
  signedAt: string | null;
}

export interface SignedOperationalSnapshotRecord {
  tenantId: string;
  contractId: string;
  contractVersion: number;
  snapshotType: typeof SIGNED_OPERATIONAL_SNAPSHOT_TYPE;
  signedAt: Date;
  signatureEvidenceHash: string;
  structuredFacts: Record<string, unknown>;
  paymentPlanSnapshot: Record<string, unknown> | null;
  clauseSnapshot: unknown[];
  approvalSnapshot: Record<string, unknown>;
  renderedContent: string;
  digest: string;
}

/**
 * Captures the immutable facts of a contract at the moment of first signing.
 * Decimals become strings and dates ISO strings so the digest is stable.
 */
export function buildSignedOperationalSnapshot(
  source: SignedOperationalSnapshotSource,
): SignedOperationalSnapshotRecord {
  const { contract, paymentPlan, installments, invoice, signatureEvidenceHash, requiredSignatureSet } = source;
  if (!contract.signedAt || !SHA256_HEX.test(signatureEvidenceHash)) {
    throw new SignedContractSnapshotError(SIGNED_SNAPSHOT_INCOMPLETE);
  }
  if (!Number.isInteger(contract.version) || contract.version < 1) {
    throw new SignedContractSnapshotError(SIGNED_SNAPSHOT_INCOMPLETE);
  }

  const signedAt = contract.signedAt;
  const structuredFacts = {
    contract: {
      id: contract.id,
      tenantId: contract.tenantId,
      unitId: contract.unitId,
      leadId: contract.leadId,
      offerId: contract.offerId,
      buyerName: contract.buyerName,
      buyerPhone: contract.buyerPhone,
      totalVolumeSar: textOrNull(contract.totalVolumeSar),
      acceptedAt: isoOrNull(contract.acceptedAt),
      signedAt: signedAt.toISOString(),
      status: contract.status,
      version: contract.version,
      spineVersion: contract.spineVersion,
      vatType: contract.vatType,
      vatRate: textOrNull(contract.vatRate),
      signatureEvidenceHash,
      requiredSignatureSet: requiredSignatureSet ?? undefined,
    },
    unit: contract.unit
      ? {
          unitNumber: textOrNull(contract.unit.unitNumber),
          type: textOrNull(contract.unit.type),
          area: textOrNull(contract.unit.area),
          city: textOrNull(contract.unit.city),
          district: textOrNull(contract.unit.district),
        }
      : null,
    seller: contract.tenant
      ? {
          companyName: textOrNull(contract.tenant.companyName),
          vatNumber: textOrNull(contract.tenant.vatNumber),
          commercialRegistry: textOrNull(contract.tenant.commercialRegistry),
          nationalAddress: textOrNull(contract.tenant.nationalAddress),
        }
      : null,
    invoice: invoice
      ? {
          id: invoice.id,
          invoiceNumber: textOrNull(invoice.invoiceNumber),
          invoicePrefix: textOrNull(invoice.invoicePrefix),
          subtotal: textOrNull(invoice.subtotal),
          vatRate: textOrNull(invoice.vatRate),
          vatAmount: textOrNull(invoice.vatAmount),
          totalAmount: textOrNull(invoice.totalAmount),
        }
      : null,
  };

  const paymentPlanSnapshot = paymentPlan
    ? {
        id: paymentPlan.id,
        template: paymentPlan.template,
        status: paymentPlan.status,
        totalAmount: textOrNull(paymentPlan.totalAmount),
        installmentCount: paymentPlan.installmentCount,
        activatedAt: isoOrNull(paymentPlan.activatedAt),
        version: paymentPlan.version,
        schedule: JSON.parse(canonicalSerialize(paymentPlan.scheduleJson ?? [])),
        installments: [...installments]
          .sort((left, right) => left.installmentNumber - right.installmentNumber)
          .map((item) => ({
            installmentNumber: item.installmentNumber,
            amountSar: textOrNull(item.amountSar),
            vatAmount: textOrNull(item.vatAmount),
            dueDate: isoOrNull(item.dueDate),
            paymentStatus: item.paymentStatus,
          })),
      }
    : null;

  const identity = {
    tenantId: contract.tenantId,
    contractId: contract.id,
    contractVersion: contract.version,
    snapshotType: "SIGNED_OPERATIONAL" as const,
    signedAt,
    signatureEvidenceHash,
  };

  return {
    ...identity,
    structuredFacts,
    paymentPlanSnapshot,
    clauseSnapshot: [],
    approvalSnapshot: { signatureEvidenceHash },
    renderedContent: canonicalSerialize({ structuredFacts, paymentPlanSnapshot }),
    digest: computeSignedOperationalSnapshotDigest({
      ...identity,
      structuredFacts,
      paymentPlanSnapshot,
    }),
  };
}

export function computeSignedOperationalSnapshotDigest(input: {
  tenantId: string;
  contractId: string;
  contractVersion: number;
  snapshotType: string;
  signedAt: Date | string;
  signatureEvidenceHash: string;
  structuredFacts: unknown;
  paymentPlanSnapshot: unknown;
}): string {
  return canonicalSha256({
    tenantId: input.tenantId,
    contractId: input.contractId,
    contractVersion: input.contractVersion,
    snapshotType: input.snapshotType,
    signedAt: isoOrNull(input.signedAt),
    signatureEvidenceHash: input.signatureEvidenceHash,
    structuredFacts: input.structuredFacts,
    paymentPlanSnapshot: input.paymentPlanSnapshot ?? null,
  });
}

type SignedSnapshotTx = {
  contractSnapshot: {
    findFirst: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
};

/**
 * Persists the SIGNED_OPERATIONAL ContractSnapshot inside the signing
 * transaction. Same identity + same digest is idempotent; same identity with a
 * different digest fails closed.
 */
export async function persistSignedOperationalSnapshotInTx(
  tx: SignedSnapshotTx,
  source: SignedOperationalSnapshotSource,
  createdBy: string | null,
) {
  const record = buildSignedOperationalSnapshot(source);
  const existing = await tx.contractSnapshot.findFirst({
    where: {
      tenantId: record.tenantId,
      contractId: record.contractId,
      snapshotType: SIGNED_OPERATIONAL_SNAPSHOT_TYPE,
      contractVersion: record.contractVersion,
    },
  });
  if (existing) {
    if (existing.digest !== record.digest) {
      throw new SignedContractSnapshotError(SIGNED_SNAPSHOT_DIGEST_CONFLICT);
    }
    return { snapshot: existing, created: false };
  }

  const snapshot = await tx.contractSnapshot.create({
    data: {
      tenantId: record.tenantId,
      draftId: null,
      templateVersionId: null,
      contractId: record.contractId,
      contractVersion: record.contractVersion,
      snapshotType: SIGNED_OPERATIONAL_SNAPSHOT_TYPE,
      signatureEvidenceHash: record.signatureEvidenceHash,
      renderedContent: record.renderedContent,
      structuredFacts: record.structuredFacts,
      clauseSnapshot: record.clauseSnapshot,
      paymentPlanSnapshot: record.paymentPlanSnapshot ?? undefined,
      approvalSnapshot: record.approvalSnapshot,
      digest: record.digest,
      createdBy,
      signedAt: record.signedAt,
    },
  });
  return { snapshot, created: true };
}

export interface SignedContractIdentity {
  contractId: string;
  contractVersion: number;
  signedAt: string;
  signatureEvidenceHash: string;
}

/**
 * Read-side verification of a stored SIGNED_OPERATIONAL snapshot: identity
 * columns must be complete and the stored digest must match the recomputed one.
 */
export function verifySignedOperationalSnapshot(snapshot: {
  tenantId: string;
  contractId: string | null;
  contractVersion: number | null;
  snapshotType: string;
  signedAt: Date | null;
  signatureEvidenceHash: string | null;
  structuredFacts: unknown;
  paymentPlanSnapshot: unknown;
  digest: string;
}): SignedContractIdentity {
  if (
    snapshot.snapshotType !== SIGNED_OPERATIONAL_SNAPSHOT_TYPE ||
    !snapshot.contractId ||
    snapshot.contractVersion === null ||
    !snapshot.signedAt ||
    !snapshot.signatureEvidenceHash ||
    !SHA256_HEX.test(snapshot.signatureEvidenceHash)
  ) {
    throw new SignedContractSnapshotError(SIGNED_SNAPSHOT_INCOMPLETE);
  }
  let expected: string;
  try {
    expected = computeSignedOperationalSnapshotDigest({
      tenantId: snapshot.tenantId,
      contractId: snapshot.contractId,
      contractVersion: snapshot.contractVersion,
      snapshotType: snapshot.snapshotType,
      signedAt: snapshot.signedAt,
      signatureEvidenceHash: snapshot.signatureEvidenceHash,
      structuredFacts: snapshot.structuredFacts,
      paymentPlanSnapshot: snapshot.paymentPlanSnapshot,
    });
  } catch {
    throw new SignedContractSnapshotError(SIGNED_SNAPSHOT_INTEGRITY_FAILED);
  }
  if (expected !== snapshot.digest) {
    throw new SignedContractSnapshotError(SIGNED_SNAPSHOT_INTEGRITY_FAILED);
  }
  return {
    contractId: snapshot.contractId,
    contractVersion: snapshot.contractVersion,
    signedAt: snapshot.signedAt.toISOString(),
    signatureEvidenceHash: snapshot.signatureEvidenceHash,
  };
}
